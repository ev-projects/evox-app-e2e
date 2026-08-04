<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. ROLE-MATRIX branch tests for
 * AlterLogPunchController::approve/decline/pending/cancel authorization arms. Menu=Requests Page=AlterLogPunch.
 *
 * WHAT THIS FILE PROVES (A27 authorization finding):
 *   AlterLogPunchController::{approve,decline,pending,cancel} perform NO role-based authorization. No
 *   self-approval gate, no is_under_supervisee check, no admin gate. The alter_log_punch routes carry NO
 *   permission middleware at all (app/Modules/Request/Routes/api.php lines 154-163 — only the group-level
 *   jwtauth + auth.apikey). Requester (glenn), correct supervisor (gary), unrelated supervisor (nidhi) and
 *   admin (dummyman) all reach business logic identically.
 *
 * // FINDING A27: no authorization gate — self-approval NOT blocked, non-supervisee approver NOT blocked,
 *    every authenticated caller reaches the repository (see per-test comments).
 * // FINDING: approve()/decline() (and store/update) take plain Illuminate\Http\Request — there is NO
 *    FormRequest on this controller (AlterLogRequest is imported but never type-hinted), so unlike the sibling
 *    AlterLogController NOT EVEN input validation runs before the repository is reached.
 *
 * NOTE on the supervisor link: gary→glenn is a DATA-level link (users_supervisors pivot / SP
 *   EH_SP_Direct_Supervisor) that cannot be confirmed from code. These tests do NOT assert that link —
 *   the endpoint consults NO supervisor relation at all (that absence IS the finding); role labels are nominal.
 *
 * HOW WE ASSERT IT (SP-safe, no DTR/no external):
 *   approve(): mocked repo->on_conflict returns '' (no-conflict arm), then mocked repo->approve throws a
 *     sentinel -> catch -> error_response(trans, $e, HTTP_NOT_FOUND) => 404. Reaching 404 proves the (absent)
 *     gate did NOT short-circuit with 403 for ANY role; we also assert status !== 403. The DTR side-effect
 *     (dtr->apply_alter_to_punch) sits AFTER the throw and is never reached.
 *   decline()/pending()/cancel(): mocked repo method throws the same sentinel -> catch -> 404.
 *   All three constructor deps (AlterLogPunchRepositoryInterface, DtrRepositoryInterface,
 *   EmailRepositoryInterface) are IoC-mocked, so no real repo/DTR/email code can run.
 *
 * SKIPPED arms:
 *   // SKIPPED-SP success-200 render (all four actions): AlterLogPunchResource serializes
 *      'is_under_supervisee' => is_under_supervisee($user_id, false), which for a NON-admin viewer (glenn/gary)
 *      fires call_sp('EH_SP_Direct_Supervisor') via User::direct_supervisor_temp(). Sentinel-throw stays SP-free.
 *   // SKIPPED (approve conflict arm as role test): on_conflict != '' -> error_response($conflict) => 400 is a
 *      business branch, not an authorization branch; covered conceptually by approve.AlterLogPunchBranchTest.
 *
 * Routes (module prefix request/alter_log_punch under /api):
 *   PUT /api/request/alter_log_punch/approve|decline|pending|cancel/{id}
 */

namespace Tests\Feature\BranchTests\Requests\AlterLogPunch;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Request\Repositories\AlterLogPunchRepositoryInterface;

class AlterLogPunchApprovalRoleTest extends TestCase
{
    use DatabaseTransactions;

    const REQUESTER = 'glenn.macasarte@eastvantage.com';       // ph_employee — owns the request
    const OWN_SUP   = 'gary.aure@eastvantage.com';             // ph_supervisor — nominally over glenn
    const NON_SUP   = 'nidhi.shrivastava@unq.eastvantage.com'; // india_supervisor — NOT over glenn
    const ADMIN     = 'dummyman@ops.eastvantage.com';          // admin

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

    /** No FormRequest on this controller -> payload is free-form; kept minimal and realistic. */
    private function payload(): array
    {
        return [
            'user_id'       => $this->requesterId(),
            'date'          => '1900-01-01',
            'employee_note' => 'role-matrix branch test',
        ];
    }

    /** Mocks all 3 constructor deps; on_conflict passes, approve throws sentinel -> proves repo reach (no 403 gate). */
    private function approveAs(string $email)
    {
        $this->loginAs($email);
        $repo = $this->mockDep(AlterLogPunchRepositoryInterface::class);
        $repo->shouldReceive('on_conflict')->andReturn('');
        $repo->shouldReceive('approve')->andThrow(new Exception('SENTINEL_REACHED_REPO'));
        $this->mockDep(DtrRepositoryInterface::class);   // never reached (repo throws first)
        $this->mockDep(EmailRepositoryInterface::class); // never reached
        return $this->putJson('/api/request/alter_log_punch/approve/1', $this->payload());
    }

    private function declineAs(string $email)
    {
        $this->loginAs($email);
        $repo = $this->mockDep(AlterLogPunchRepositoryInterface::class);
        $repo->shouldReceive('decline')->andThrow(new Exception('SENTINEL_REACHED_REPO'));
        $this->mockDep(DtrRepositoryInterface::class);
        $this->mockDep(EmailRepositoryInterface::class);
        return $this->putJson('/api/request/alter_log_punch/decline/1', $this->payload());
    }

    private function pendingAs(string $email)
    {
        $this->loginAs($email);
        $repo = $this->mockDep(AlterLogPunchRepositoryInterface::class);
        $repo->shouldReceive('pending')->andThrow(new Exception('SENTINEL_REACHED_REPO'));
        $this->mockDep(DtrRepositoryInterface::class);
        $this->mockDep(EmailRepositoryInterface::class);
        return $this->putJson('/api/request/alter_log_punch/pending/1');
    }

    private function cancelAs(string $email)
    {
        $this->loginAs($email);
        $repo = $this->mockDep(AlterLogPunchRepositoryInterface::class);
        $repo->shouldReceive('cancel')->andThrow(new Exception('SENTINEL_REACHED_REPO'));
        $this->mockDep(DtrRepositoryInterface::class);
        $this->mockDep(EmailRepositoryInterface::class);
        return $this->putJson('/api/request/alter_log_punch/cancel/1');
    }

    private function assertNoGate404($res, string $why)
    {
        $this->assertNotEquals(403, $res->getStatusCode(), $why);
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ============================================================ approve() ROLE MATRIX
    /** @test */
    public function approve__role__self__no_gate_reaches_biz_404()
    {
        // FINDING A27: glenn approves glenn's OWN alter-log-punch -> no self-approval gate -> reaches repo (404).
        $this->assertNoGate404($this->approveAs(self::REQUESTER), 'self-approval must NOT be blocked (gate missing)');
    }

    /** @test */
    public function approve__role__own_supervisor__allow_reaches_biz_404()
    {
        $this->assertNoGate404($this->approveAs(self::OWN_SUP), 'supervisor approval reaches repo');
    }

    /** @test */
    public function approve__role__non_supervisee__no_gate_reaches_biz_404()
    {
        // FINDING A27: nidhi (not over glenn) approves glenn's request -> no is_under_supervisee gate -> 404 not 403.
        $this->assertNoGate404($this->approveAs(self::NON_SUP), 'non-supervisee approval must NOT be blocked (gate missing)');
    }

    /** @test */
    public function approve__role__admin__allow_reaches_biz_404()
    {
        $this->assertNoGate404($this->approveAs(self::ADMIN), 'admin approval reaches repo');
    }

    // ============================================================ decline() ROLE MATRIX
    /** @test */
    public function decline__role__self__no_gate_reaches_biz_404()
    {
        // FINDING A27: glenn declines glenn's OWN alter-log-punch -> no self gate -> reaches repo (404).
        $this->assertNoGate404($this->declineAs(self::REQUESTER), 'self-decline must NOT be blocked (gate missing)');
    }

    /** @test */
    public function decline__role__own_supervisor__allow_reaches_biz_404()
    {
        $this->assertNoGate404($this->declineAs(self::OWN_SUP), 'supervisor decline reaches repo');
    }

    /** @test */
    public function decline__role__non_supervisee__no_gate_reaches_biz_404()
    {
        // FINDING A27: unrelated supervisor declines glenn's request -> no supervisee gate -> reaches repo (404).
        $this->assertNoGate404($this->declineAs(self::NON_SUP), 'non-supervisee decline must NOT be blocked (gate missing)');
    }

    /** @test */
    public function decline__role__admin__allow_reaches_biz_404()
    {
        $this->assertNoGate404($this->declineAs(self::ADMIN), 'admin decline reaches repo');
    }

    // ============================================================ pending() ROLE MATRIX
    // SKIPPED-SP success-200 render: AlterLogPunchResource fires call_sp('EH_SP_Direct_Supervisor') for
    // non-admin viewers (is_under_supervisee). Sentinel-throw -> 404 proves the no-gate reach SP-free.
    /** @test */
    public function pending__role__self__no_gate_reaches_biz_404()
    {
        // FINDING A27: glenn reverts his OWN request to pending -> no gate -> reaches repo (404, not 403).
        $this->assertNoGate404($this->pendingAs(self::REQUESTER), 'self pending must NOT be blocked (gate missing)');
    }

    /** @test */
    public function pending__role__own_supervisor__allow_reaches_biz_404()
    {
        $this->assertNoGate404($this->pendingAs(self::OWN_SUP), 'supervisor pending reaches repo');
    }

    /** @test */
    public function pending__role__non_supervisee__no_gate_reaches_biz_404()
    {
        // FINDING A27: unrelated supervisor reverts glenn's request -> no gate -> reaches repo (404).
        $this->assertNoGate404($this->pendingAs(self::NON_SUP), 'non-supervisee pending must NOT be blocked (gate missing)');
    }

    /** @test */
    public function pending__role__admin__allow_reaches_biz_404()
    {
        $this->assertNoGate404($this->pendingAs(self::ADMIN), 'admin pending reaches repo');
    }

    // ============================================================ cancel() ROLE MATRIX
    /** @test */
    public function cancel__role__self__no_gate_reaches_biz_404()
    {
        // FINDING A27: glenn cancels his OWN request -> no gate -> reaches repo (404, not 403).
        $this->assertNoGate404($this->cancelAs(self::REQUESTER), 'self cancel must NOT be blocked (gate missing)');
    }

    /** @test */
    public function cancel__role__own_supervisor__allow_reaches_biz_404()
    {
        $this->assertNoGate404($this->cancelAs(self::OWN_SUP), 'supervisor cancel reaches repo');
    }

    /** @test */
    public function cancel__role__non_supervisee__no_gate_reaches_biz_404()
    {
        // FINDING A27: unrelated supervisor cancels glenn's request -> no gate -> reaches repo (404).
        $this->assertNoGate404($this->cancelAs(self::NON_SUP), 'non-supervisee cancel must NOT be blocked (gate missing)');
    }

    /** @test */
    public function cancel__role__admin__allow_reaches_biz_404()
    {
        $this->assertNoGate404($this->cancelAs(self::ADMIN), 'admin cancel reaches repo');
    }
}
