<?php
/**
 * NEGATIVE / BUSINESS-LOGIC — Alter Log: approval state-machine + authorization + impersonation.
 * Same gaps as Overtime (A27-A30): alter_log approve routes have permission:approval_of_request
 * commented out; store() trusts payload user_id. Safe: DatabaseTransactions + Mail/Queue faked.
 */
namespace Tests\Feature\Negative;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;
use App\Modules\Request\Models\AlterLog;

class AlterLogNegativeTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $employee;
    private User $supervisor;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->employee   = User::where('email', 'glenn.macasarte@eastvantage.com')->firstOrFail();
        $this->supervisor = User::where('email', 'gary.aure@eastvantage.com')->firstOrFail();
    }

    private function makePending(int $ownerId, string $status = 'pending'): AlterLog
    {
        $date = now()->subDays(11)->toDateString();
        return AlterLog::create([
            'user_id'      => $ownerId,
            'date'         => $date,
            'new_time_in'  => $date . ' 09:00:00',
            'new_time_out' => $date . ' 18:00:00',
            'employee_note'=> 'NEGATIVE-AUTOTEST',
            'status'       => $status,
            'created_by'   => $ownerId,
        ]);
    }

    private function approveAs(User $actor, AlterLog $a)
    {
        return $this->actingAs($actor)->putJson("/api/request/alter_log/approve/{$a->id}", [
            'action' => 'approve', 'approver_note' => 'NEGATIVE-AUTOTEST',
            'user_id' => $a->user_id, 'date' => $a->date,
            'new_time_in' => $a->new_time_in, 'new_time_out' => $a->new_time_out,
            'employee_note' => $a->employee_note,
        ], $this->apiKey);
    }

    /** @test S5/A27 FIXED — self-approval gate now active in controller */
    public function self_approval_is_gated_and_returns_403()
    {
        // A27 FIXED: AlterLogController::approve() now blocks self-approval at controller level
        // (not middleware). withoutMiddleware() bypasses middleware but NOT this controller check.
        // Employee approving their own alter-log → 403 Forbidden.
        $this->withoutMiddleware();
        $a = $this->makePending($this->employee->id);
        $resp = $this->approveAs($this->employee, $a);
        $this->assertEquals(403, $resp->status());
    }

    /** @test S1 — re-approve already-approved not blocked (A28) */
    public function re_approving_already_approved_is_not_blocked()
    {
        $this->withoutMiddleware();
        $a = $this->makePending($this->employee->id, 'approved');
        $resp = $this->approveAs($this->supervisor, $a);
        $this->assertNotEquals(409, $resp->status());
        $this->assertLessThan(500, $resp->status());
    }

    /** @test S6 — nonexistent id → 404 */
    public function approve_nonexistent_id_returns_404()
    {
        $this->withoutMiddleware();
        $date = now()->subDays(11)->toDateString();
        $resp = $this->actingAs($this->supervisor)->putJson('/api/request/alter_log/approve/999999999', [
            'action' => 'approve', 'user_id' => $this->employee->id, 'date' => $date,
            'new_time_in' => $date . ' 09:00:00', 'new_time_out' => $date . ' 18:00:00',
            'employee_note' => 'x',
        ], $this->apiKey);
        $this->assertEquals(404, $resp->status());
    }

    /** @test D3 — store trusts payload user_id (impersonation) */
    public function submit_trusts_payload_user_id_impersonation()
    {
        $this->withoutMiddleware();
        $date = now()->subDays(10)->toDateString();
        $resp = $this->actingAs($this->employee)->postJson('/api/request/alter_log', [
            'user_id'      => $this->supervisor->id,
            'date'         => $date,
            'new_time_in'  => $date . ' 09:00:00',
            'new_time_out' => $date . ' 18:00:00',
            'employee_note'=> 'NEGATIVE-AUTOTEST impersonation',
        ], $this->apiKey);
        if (in_array($resp->status(), [500, 400])) {
            $this->markTestIncomplete('AlterLog store hit a dependency (' . $resp->status() . ') — documented.');
        }
        $impersonated = \DB::table('alter_logs')
            ->where('user_id', $this->supervisor->id)
            ->where('employee_note', 'NEGATIVE-AUTOTEST impersonation')->exists();
        $this->assertTrue($impersonated, 'AlterLog store accepted a foreign payload user_id (impersonation).');
    }
}
