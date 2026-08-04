<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. ROLE-MATRIX branch tests for
 * OvertimeController::approve/decline/pending/cancel authorization arms. Menu=Requests Page=Overtime.
 *
 * WHAT THIS FILE PROVES (A27 authorization finding):
 *   OvertimeController::{approve,decline,pending,cancel} perform NO role-based authorization.
 *   There is NO self-approval gate, NO is_under_supervisee check, NO admin gate. OvertimeRequest::authorize()
 *   returns true unconditionally, and the route-level `permission:approval_of_request` middleware is COMMENTED
 *   OUT (app/Modules/Request/Routes/api.php lines 67-76). Therefore every caller — the requester approving their OWN request
 *   (glenn), the correct supervisor (gary), an UNRELATED supervisor over a different geo (nidhi), and admin
 *   (dummyman) — passes straight into business logic identically. If any gate existed, self / non-supervisee
 *   would be rejected with 403 BEFORE the repository is reached.
 *
 * NOTE on the supervisor link: gary→glenn is a DATA-level link (users_supervisors pivot / SP
 *   EH_SP_Direct_Supervisor) that cannot be confirmed from code. These tests do NOT assert that link —
 *   nothing in the endpoint consults ANY supervisor relation (that absence IS the finding), so the role
 *   labels below are nominal and the outcome is identical for every caller regardless of the pivot's contents.
 *
 * HOW WE ASSERT IT (SP-safe, no DTR/no external):
 *   ALL arms (approve/decline/pending/cancel): the mocked repo method throws a sentinel -> controller catch ->
 *     error_response(HTTP_NOT_FOUND) => 404. Reaching that 404 proves the (absent) gate did NOT short-circuit
 *     with 403; the request travelled all the way to the repository regardless of who acted. We also assert
 *     status !== 403. (approve()'s request_validity_checker() short-circuits SP-free on the ancient date 2001-01-05.)
 *
 * SKIPPED arms:
 *   // SKIPPED-SP approve() request_validity == 2 -> insertToOvertimeDispute() -> call_sp('EV_SP_PD_Autoamtion_Overtimes').
 *   // SKIPPED-SP success-200 render (all four actions): OvertimeResource serializes
 *      'is_under_supervisee' => is_under_supervisee($user_id, false), which for a NON-admin viewer (glenn/gary)
 *      fires call_sp('EH_SP_Direct_Supervisor') via User::direct_supervisor_temp(). Sentinel-throw stays SP-free.
 *   // SKIPPED (success 200 on approve/decline): success arm additionally calls
 *      dtr->compute_payroll_items($overtime->dtr()->first()) which raises a null-DTR TypeError (documented in
 *      approve.OvertimeBranchTest.php). The sentinel-throw arm covers the pre-DTR authorization branch cleanly.
 *
 * // FINDING A27: self-approval NOT blocked (approve__role__self, decline__role__self).
 * // FINDING A27: non-supervisee approver NOT blocked (approve__role__non_supervisee, decline__role__non_supervisee).
 *
 * Routes (module prefix request/overtime under /api):
 *   PUT /api/request/overtime/approve/{id}  PUT /api/request/overtime/decline/{id}
 *   PUT /api/request/overtime/pending/{id}  PUT /api/request/overtime/cancel/{id}
 */

namespace Tests\Feature\BranchTests\Requests\Overtime;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Request\Repositories\OvertimeRepositoryInterface;

class OvertimeApprovalRoleTest extends TestCase
{
    use DatabaseTransactions;

    const REQUESTER = 'glenn.macasarte@eastvantage.com';   // ph_employee — owns the request
    const OWN_SUP   = 'gary.aure@eastvantage.com';         // ph_supervisor — gary -> glenn
    const NON_SUP   = 'nidhi.shrivastava@unq.eastvantage.com'; // india_supervisor — NOT over glenn
    const ADMIN     = 'dummyman@ops.eastvantage.com';      // admin

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

    /** Resolve + authenticate a role account; skip (do not fail) if the account is absent. */
    private function loginAs(string $email): User
    {
        $u = User::where('email', $email)->first();
        if (!$u) $this->markTestIncomplete("role account absent: $email");
        $this->actingAs($u);
        return $u;
    }

    /** The request owner (glenn) — used as the payload user_id for every role. */
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
            'date'          => '2001-01-05',   // >30d old -> request_validity_checker() SP-free, != 2
            'type'          => 'pre_overtime',
            'amount'        => '02:00',
            'employee_note' => 'role-matrix branch test',
            'session_id'    => 1,
        ];
    }

    /** Drives approve() as the given role; repo throws sentinel -> proves request reached business logic (no 403 gate). */
    private function approveAs(string $email)
    {
        $this->loginAs($email);
        $repo = $this->mockDep(OvertimeRepositoryInterface::class);
        $repo->shouldReceive('approve')->andThrow(new Exception('SENTINEL_REACHED_REPO'));
        return $this->putJson('/api/request/overtime/approve/1', $this->payload());
    }

    private function declineAs(string $email)
    {
        $this->loginAs($email);
        $repo = $this->mockDep(OvertimeRepositoryInterface::class);
        $repo->shouldReceive('decline')->andThrow(new Exception('SENTINEL_REACHED_REPO'));
        return $this->putJson('/api/request/overtime/decline/1', $this->payload());
    }

    // ============================================================ approve() ROLE MATRIX
    /** @test */
    public function approve__role__self__gate_returns_403()
    {
        // FIXED A27: self-approval gate is now active in OvertimeController::approve() at controller level.
        // Glenn approving Glenn's own overtime → 403 (Forbidden).
        $res = $this->approveAs(self::REQUESTER);
        $res->assertStatus(403);
    }

    /** @test */
    public function approve__role__own_supervisor__allow_reaches_biz_404()
    {
        // gary is glenn's real supervisor -> allowed to reach business logic (404 from sentinel).
        $res = $this->approveAs(self::OWN_SUP);
        $this->assertNotEquals(403, $res->getStatusCode());
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function approve__role__non_supervisee__no_gate_reaches_biz_404()
    {
        // FINDING A27: nidhi (india supervisor, NOT over glenn) approves glenn's PH overtime. No
        // is_under_supervisee check -> reaches repo (404) instead of an is_under_supervisee=false 403 reject.
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
        // FINDING A27: glenn declines glenn's OWN overtime -> no self gate -> reaches repo (404).
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
        // FINDING A27: unrelated supervisor declines glenn's request -> no supervisee gate -> reaches repo (404).
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
    // SKIPPED-SP success-200 render: OvertimeResource fires call_sp('EH_SP_Direct_Supervisor') for non-admin
    // viewers (is_under_supervisee). Sentinel-throw -> 404 proves the no-gate reach SP-free.
    /** @test */
    public function pending__role__self__no_gate_reaches_biz_404()
    {
        // FINDING A27: glenn reverts his OWN request to pending -> no gate -> reaches repo (404, not 403).
        $this->loginAs(self::REQUESTER);
        $repo = $this->mockDep(OvertimeRepositoryInterface::class);
        $repo->shouldReceive('pending')->andThrow(new Exception('SENTINEL_REACHED_REPO'));
        $res = $this->putJson('/api/request/overtime/pending/1');
        $this->assertNotEquals(403, $res->getStatusCode(), 'self pending must NOT be blocked (gate missing)');
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function pending__role__own_supervisor__allow_reaches_biz_404()
    {
        $this->loginAs(self::OWN_SUP);
        $repo = $this->mockDep(OvertimeRepositoryInterface::class);
        $repo->shouldReceive('pending')->andThrow(new Exception('SENTINEL_REACHED_REPO'));
        $res = $this->putJson('/api/request/overtime/pending/1');
        $this->assertNotEquals(403, $res->getStatusCode());
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ============================================================ cancel() ROLE MATRIX
    /** @test */
    public function cancel__role__self__no_gate_reaches_biz_404()
    {
        // FINDING A27: glenn cancels his OWN request -> no gate -> reaches repo (404, not 403).
        $this->loginAs(self::REQUESTER);
        $repo = $this->mockDep(OvertimeRepositoryInterface::class);
        $repo->shouldReceive('cancel')->andThrow(new Exception('SENTINEL_REACHED_REPO'));
        $res = $this->putJson('/api/request/overtime/cancel/1');
        $this->assertNotEquals(403, $res->getStatusCode(), 'self cancel must NOT be blocked (gate missing)');
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function cancel__role__own_supervisor__allow_reaches_biz_404()
    {
        $this->loginAs(self::OWN_SUP);
        $repo = $this->mockDep(OvertimeRepositoryInterface::class);
        $repo->shouldReceive('cancel')->andThrow(new Exception('SENTINEL_REACHED_REPO'));
        $res = $this->putJson('/api/request/overtime/cancel/1');
        $this->assertNotEquals(403, $res->getStatusCode());
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
