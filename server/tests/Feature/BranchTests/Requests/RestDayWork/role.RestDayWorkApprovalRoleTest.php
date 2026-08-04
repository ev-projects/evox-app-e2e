<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. ROLE-MATRIX branch tests for
 * RestDayWorkController::approve/decline/pending/cancel authorization arms. Menu=Requests Page=RestDayWork.
 *
 * WHAT THIS FILE PROVES (A27 authorization finding):
 *   RestDayWorkController::{approve,decline,pending,cancel} perform NO role-based authorization. No
 *   self-approval gate, no is_under_supervisee check, no admin gate. RestDayWorkRequest::authorize() returns
 *   true, and the route-level `permission:approval_of_request` middleware is COMMENTED OUT
 *   (app/Modules/Request/Routes/api.php lines 187-196). Requester (glenn), correct supervisor (gary),
 *   unrelated supervisor (nidhi) and admin (dummyman) all reach business logic identically.
 *
 * NOTE on the supervisor link: gary→glenn is a DATA-level link (users_supervisors pivot / SP
 *   EH_SP_Direct_Supervisor) that cannot be confirmed from code. These tests do NOT assert that link —
 *   the endpoint consults NO supervisor relation at all (that absence IS the finding); role labels are nominal.
 *
 * HOW WE ASSERT IT (SP-safe, no DTR/no external):
 *   ALL arms (approve/decline/pending/cancel): mocked repo throws a sentinel -> catch ->
 *     error_response(HTTP_NOT_FOUND) => 404, proving the request reached the repository past the (absent)
 *     gate (status !== 403). approve()'s request_validity_checker() short-circuits SP-free on the ancient
 *     date 2015-06-15.
 *
 * SKIPPED arms:
 *   // SKIPPED-SP approve() request_validity == 2 -> insertToRestDayWorkDispute() -> call_sp('EV_SP_PD_Autoamtion_RestDay').
 *   // SKIPPED-SP success-200 render (all four actions): RestDayWorkResource serializes
 *      'is_under_supervisee' => is_under_supervisee($user_id, false), which for a NON-admin viewer (glenn/gary)
 *      fires call_sp('EH_SP_Direct_Supervisor') via User::direct_supervisor_temp(). Sentinel-throw stays SP-free.
 *
 * // FINDING A27: self-approval NOT blocked; non-supervisee approver NOT blocked (see per-test comments).
 *
 * Routes (module prefix request/rest_day_work under /api):
 *   PUT /api/request/rest_day_work/approve|decline|pending|cancel/{id}
 */

namespace Tests\Feature\BranchTests\Requests\RestDayWork;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;

class RestDayWorkApprovalRoleTest extends TestCase
{
    use DatabaseTransactions;

    const REQUESTER = 'glenn.macasarte@eastvantage.com';
    const OWN_SUP   = 'gary.aure@eastvantage.com';
    const NON_SUP   = 'nidhi.shrivastava@unq.eastvantage.com';
    const ADMIN     = 'dummyman@ops.eastvantage.com';

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function mockDep(string $iface): \Mockery\MockInterface
    {
        $m = Mockery::mock($iface);
        $this->app->instance($iface, $m);
        return $m;
    }

    private function loginAs(string $email): User
    {
        $u = User::where('email', $email)->first();
        if (!$u) $this->markTestIncomplete("role account absent: $email");
        $this->actingAs($u);
        return $u;
    }

    private function requesterId()
    {
        $u = User::where('email', self::REQUESTER)->first();
        if (!$u) $this->markTestIncomplete('requester (ph_employee/glenn) absent');
        return $u->id;
    }

    private function payload(): array
    {
        return [
            'user_id'       => $this->requesterId(),
            'date'          => '2015-06-15',   // >30d old -> request_validity_checker() SP-free, != 2
            'start_time'    => '09:00',
            'end_time'      => '18:00',
            'break_time'    => '00:30',
            'employee_note' => 'role-matrix branch test',
        ];
    }

    private function approveAs(string $email)
    {
        $this->loginAs($email);
        $repo = $this->mockDep(RestDayWorkRepositoryInterface::class);
        $repo->shouldReceive('approve')->andThrow(new Exception('SENTINEL_REACHED_REPO'));
        return $this->putJson('/api/request/rest_day_work/approve/1', $this->payload());
    }

    private function declineAs(string $email)
    {
        $this->loginAs($email);
        $repo = $this->mockDep(RestDayWorkRepositoryInterface::class);
        $repo->shouldReceive('decline')->andThrow(new Exception('SENTINEL_REACHED_REPO'));
        return $this->putJson('/api/request/rest_day_work/decline/1', $this->payload());
    }

    // ============================================================ approve() ROLE MATRIX
    /** @test */
    public function approve__role__self__gate_returns_403()
    {
        // FIXED A27: self-approval gate is now active in RestDayWorkController::approve() at controller level.
        // Glenn approving Glenn's own rest-day-work → 403 (Forbidden).
        $res = $this->approveAs(self::REQUESTER);
        $res->assertStatus(403);
    }

    /** @test */
    public function approve__role__own_supervisor__allow_reaches_biz_404()
    {
        $res = $this->approveAs(self::OWN_SUP);
        $this->assertNotEquals(403, $res->getStatusCode());
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function approve__role__non_supervisee__no_gate_reaches_biz_404()
    {
        // FINDING A27: nidhi (not over glenn) approves glenn's request -> no is_under_supervisee gate -> 404 not 403.
        $res = $this->approveAs(self::NON_SUP);
        $this->assertNotEquals(403, $res->getStatusCode(), 'non-supervisee approval must NOT be blocked (gate missing)');
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function approve__role__admin__allow_reaches_biz_404()
    {
        $res = $this->approveAs(self::ADMIN);
        $this->assertNotEquals(403, $res->getStatusCode());
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ============================================================ decline() ROLE MATRIX
    /** @test */
    public function decline__role__self__no_gate_reaches_biz_404()
    {
        $res = $this->declineAs(self::REQUESTER);
        $this->assertNotEquals(403, $res->getStatusCode(), 'self-decline must NOT be blocked (gate missing)');
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function decline__role__own_supervisor__allow_reaches_biz_404()
    {
        $res = $this->declineAs(self::OWN_SUP);
        $this->assertNotEquals(403, $res->getStatusCode());
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function decline__role__non_supervisee__no_gate_reaches_biz_404()
    {
        $res = $this->declineAs(self::NON_SUP);
        $this->assertNotEquals(403, $res->getStatusCode(), 'non-supervisee decline must NOT be blocked (gate missing)');
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function decline__role__admin__allow_reaches_biz_404()
    {
        $res = $this->declineAs(self::ADMIN);
        $this->assertNotEquals(403, $res->getStatusCode());
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ============================================================ pending() ROLE MATRIX
    // SKIPPED-SP success-200 render: RestDayWorkResource fires call_sp('EH_SP_Direct_Supervisor') for
    // non-admin viewers (is_under_supervisee). Sentinel-throw -> 404 proves the no-gate reach SP-free.
    /** @test */
    public function pending__role__self__no_gate_reaches_biz_404()
    {
        // FINDING A27: glenn reverts his OWN request to pending -> no gate -> reaches repo (404, not 403).
        $this->loginAs(self::REQUESTER);
        $repo = $this->mockDep(RestDayWorkRepositoryInterface::class);
        $repo->shouldReceive('pending')->andThrow(new Exception('SENTINEL_REACHED_REPO'));
        $res = $this->putJson('/api/request/rest_day_work/pending/1');
        $this->assertNotEquals(403, $res->getStatusCode(), 'self pending must NOT be blocked (gate missing)');
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function pending__role__own_supervisor__allow_reaches_biz_404()
    {
        $this->loginAs(self::OWN_SUP);
        $repo = $this->mockDep(RestDayWorkRepositoryInterface::class);
        $repo->shouldReceive('pending')->andThrow(new Exception('SENTINEL_REACHED_REPO'));
        $res = $this->putJson('/api/request/rest_day_work/pending/1');
        $this->assertNotEquals(403, $res->getStatusCode());
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ============================================================ cancel() ROLE MATRIX
    /** @test */
    public function cancel__role__self__no_gate_reaches_biz_404()
    {
        // FINDING A27: glenn cancels his OWN request -> no gate -> reaches repo (404, not 403).
        $this->loginAs(self::REQUESTER);
        $repo = $this->mockDep(RestDayWorkRepositoryInterface::class);
        $repo->shouldReceive('cancel')->andThrow(new Exception('SENTINEL_REACHED_REPO'));
        $res = $this->putJson('/api/request/rest_day_work/cancel/1');
        $this->assertNotEquals(403, $res->getStatusCode(), 'self cancel must NOT be blocked (gate missing)');
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function cancel__role__own_supervisor__allow_reaches_biz_404()
    {
        $this->loginAs(self::OWN_SUP);
        $repo = $this->mockDep(RestDayWorkRepositoryInterface::class);
        $repo->shouldReceive('cancel')->andThrow(new Exception('SENTINEL_REACHED_REPO'));
        $res = $this->putJson('/api/request/rest_day_work/cancel/1');
        $this->assertNotEquals(403, $res->getStatusCode());
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
