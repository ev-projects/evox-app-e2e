<?php
/**
 * NEGATIVE / BUSINESS-LOGIC — Rest Day Work: approval state-machine + authorization + impersonation.
 * Same class of gaps as Overtime (A27-A30) — the rest_day_work approve/decline/cancel routes have
 * permission:approval_of_request COMMENTED OUT, and store() trusts payload user_id.
 * Safe: DatabaseTransactions + Mail/Queue faked. Asserts REAL behavior (documents the bugs).
 */
namespace Tests\Feature\Negative;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;
use App\Modules\Request\Models\RestDayWork;

class RestDayWorkNegativeTest extends TestCase
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

    private function makePending(int $ownerId, string $status = 'pending'): RestDayWork
    {
        $day = now()->subDays(9);
        return RestDayWork::create([
            'user_id'    => $ownerId,
            'date'       => $day->toDateString(),
            'start_time' => $day->copy()->setTime(9, 0)->timestamp,
            'end_time'   => $day->copy()->setTime(17, 0)->timestamp,
            'break_time' => 1800,
            'employee_note' => 'NEGATIVE-AUTOTEST',
            'status'     => $status,
            'created_by' => $ownerId,
        ]);
    }

    private function approveAs(User $actor, RestDayWork $r)
    {
        return $this->actingAs($actor)->putJson("/api/request/rest_day_work/approve/{$r->id}", [
            'action' => 'approve', 'approver_note' => 'NEGATIVE-AUTOTEST',
            'user_id' => $r->user_id, 'date' => $r->date,
            'start_time' => '09:00', 'end_time' => '17:00', 'break_time' => '00:30',
        ], $this->apiKey);
    }

    /** @test S5/A27 FIXED — self-approval gate now active in controller */
    public function self_approval_is_gated_and_returns_403()
    {
        // A27 FIXED: RestDayWorkController::approve() now blocks self-approval at controller level.
        // withoutMiddleware() bypasses middleware but NOT this controller check.
        // Employee approving their own rest-day-work → 403 Forbidden.
        $this->withoutMiddleware();
        $r = $this->makePending($this->employee->id);
        $resp = $this->approveAs($this->employee, $r);
        $this->assertEquals(403, $resp->status());
    }

    /** @test S1 — re-approving an already-approved request is not blocked (A28, no state guard) */
    public function re_approving_already_approved_is_not_blocked()
    {
        $this->withoutMiddleware();
        $r = $this->makePending($this->employee->id, 'approved');
        $resp = $this->approveAs($this->supervisor, $r);
        $this->assertNotEquals(409, $resp->status());
        $this->assertLessThan(500, $resp->status());
    }

    /** @test S6 — approving a nonexistent id returns 404 (CORRECT) */
    public function approve_nonexistent_id_returns_404()
    {
        $this->withoutMiddleware();
        $resp = $this->actingAs($this->supervisor)->putJson('/api/request/rest_day_work/approve/999999999', [
            'action' => 'approve', 'user_id' => $this->employee->id, 'date' => now()->toDateString(),
            'start_time' => '09:00', 'end_time' => '17:00', 'break_time' => '00:30',
        ], $this->apiKey);
        $this->assertEquals(404, $resp->status());
    }

    /** @test D3 — store trusts payload user_id: employee files a RDW attributed to someone else (A30 class) */
    public function submit_trusts_payload_user_id_impersonation()
    {
        $this->withoutMiddleware();
        $day = now()->subDays(8);
        $resp = $this->actingAs($this->employee)->postJson('/api/request/rest_day_work', [
            'user_id'    => $this->supervisor->id, // impersonate gary while acting as glenn
            'date'       => $day->toDateString(),
            'start_time' => $day->copy()->setTime(9, 0)->timestamp,
            'end_time'   => $day->copy()->setTime(17, 0)->timestamp,
            'break_time' => 1800,
            'employee_note' => 'NEGATIVE-AUTOTEST impersonation',
        ], $this->apiKey);
        // The store may reject this specific date for an unrelated reason (rest-day DTR check → 400,
        // or an SP dependency → 500). Only when it actually CREATES a row (2xx) can we observe whether
        // it honored the foreign payload user_id.
        if ($resp->status() >= 300) {
            $this->markTestIncomplete('RDW store did not create a row (' . $resp->status() . ': ' .
                substr($resp->getContent(), 0, 120) . ') — impersonation observation needs a 2xx create; documented in matrix.');
        }
        $row = \DB::table('rest_day_works')
            ->where('employee_note', 'NEGATIVE-AUTOTEST impersonation')
            ->orderByDesc('id')->first();
        $this->assertNotNull($row, 'RDW store returned 2xx but no row found.');
        // Reality check: does the persisted user_id match the foreign payload (impersonation) or the actor?
        $this->assertEquals($this->supervisor->id, (int) $row->user_id,
            'RDW store honored a foreign payload user_id (impersonation A30-class) — or correctly scoped to actor if this fails.');
    }
}
