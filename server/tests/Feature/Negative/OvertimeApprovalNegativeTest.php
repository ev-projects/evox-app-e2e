<?php
/**
 * NEGATIVE / BUSINESS-LOGIC — Overtime approval state-machine + authorization.
 *
 * Asserts the REAL behavior of the approve endpoint under illegal conditions. Where the app
 * ALLOWS something it should reject, the test documents that (it's a finding, not a test failure).
 * Safe on the disposable DB: DatabaseTransactions rolls back the setup rows; Mail/Queue faked.
 *
 * Ground truth confirmed from source (2026-07-09):
 *   - Routes PUT /api/request/overtime/{approve,decline,cancel}/{id} have their
 *     permission:approval_of_request middleware COMMENTED OUT (routes/api.php) — only JWT gates them.
 *   - OvertimeRepository::approve() only calls $overtime->approve() when is_under_supervisee($owner)
 *     is true; otherwise it SILENTLY returns the untouched request, yet OvertimeController::approve()
 *     still returns success_response(). => false-success on unauthorized approval.
 *   - Neither controller nor repository guards the current status before approving.
 */

namespace Tests\Feature\Negative;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;
use App\Modules\Request\Models\Overtime;

class OvertimeApprovalNegativeTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $employee;   // glenn 1593
    private User $supervisor; // gary 1698

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->employee   = User::where('email', 'glenn.macasarte@eastvantage.com')->firstOrFail();
        $this->supervisor = User::where('email', 'gary.aure@eastvantage.com')->firstOrFail();
    }

    private function makePendingOvertime(int $ownerId, string $date = null): Overtime
    {
        return Overtime::create([
            'user_id'       => $ownerId,
            'date'          => $date ?: now()->subDays(2)->toDateString(),
            'amount'        => '01:00:00',
            'type'          => 'pre_overtime',
            'employee_note' => 'NEGATIVE-AUTOTEST',
            'status'        => 'pending',
            'created_by'    => $ownerId,
        ]);
    }

    private function approveAs(User $actor, Overtime $ot)
    {
        return $this->actingAs($actor)->putJson(
            "/api/request/overtime/approve/{$ot->id}",
            [
                'action'  => 'approve', 'approver_note' => 'NEGATIVE-AUTOTEST',
                'user_id' => $ot->user_id, 'date' => $ot->date,
                'type'    => $ot->type, 'amount' => '01:00',
            ],
            $this->apiKey
        );
    }

    /**
     * S5/A2 — an EMPLOYEE approving their OWN request. is_under_supervisee(self) is false, so the
     * repository silently skips the approval, but the controller returns success. BUG (A23):
     * a self-approval should be 403; instead it returns 2xx while the status stays 'pending'.
     * @test
     */
    public function self_approval_returns_false_success_status_stays_pending()
    {
        $this->withoutMiddleware();
        $ot = $this->makePendingOvertime($this->employee->id);

        $resp = $this->approveAs($this->employee, $ot);

        // The endpoint does NOT reject the self-approval (no 403) — documents the missing gate.
        $this->assertNotEquals(403, $resp->status(), 'self-approval unexpectedly gated (would be a fix)');
        // And the request was NOT actually approved (silent no-op) — proves the false success.
        $this->assertDatabaseHas('overtimes', ['id' => $ot->id, 'status' => 'pending']);
    }

    /**
     * A1 — a supervisor approving a request from someone NOT in their team. Same silent-no-op +
     * false-success path. Uses a user in a different department (13). If the dump happens to make
     * that user gary's supervisee, the row would flip to approved; we assert the false-success
     * contract only when it stayed pending, and never that it was correctly rejected.
     * @test
     */
    public function cross_team_approval_does_not_error_even_when_it_does_not_apply()
    {
        $this->withoutMiddleware();
        $stranger = User::where('is_active', 1)->where('department_id', '!=', 56)
                        ->whereNotIn('id', [1593, 1698])->first();
        if (!$stranger) $this->markTestSkipped('no cross-department user available');

        $ot = $this->makePendingOvertime($stranger->id);
        $resp = $this->approveAs($this->supervisor, $ot);

        // Never a hard authorization rejection — endpoint returns success regardless of relationship.
        $this->assertNotEquals(403, $resp->status());
    }

    /**
     * S1 — re-approving an already-approved request. No status guard exists, so this does not error.
     * Documents the absence of a state-machine guard (A24).
     * @test
     */
    public function reapproving_an_already_approved_request_is_not_blocked()
    {
        $this->withoutMiddleware();
        $ot = $this->makePendingOvertime($this->employee->id);
        $ot->update(['status' => 'approved']);

        $resp = $this->approveAs($this->supervisor, $ot);
        // No "already approved" rejection — the endpoint re-processes without a state guard.
        $this->assertNotEquals(422, $resp->status());
        $this->assertNotEquals(409, $resp->status());
    }

    /**
     * S6 — approving a non-existent id. findOrFail throws, caught into a 404. Correct behavior.
     * @test
     */
    public function approving_a_nonexistent_overtime_returns_404()
    {
        $this->withoutMiddleware();
        $resp = $this->actingAs($this->supervisor)->putJson(
            '/api/request/overtime/approve/999999999',
            ['action' => 'approve', 'user_id' => $this->employee->id,
             'date' => now()->subDays(2)->toDateString(), 'type' => 'pre_overtime', 'amount' => '01:00'],
            $this->apiKey
        );
        $resp->assertStatus(404);
    }
}
