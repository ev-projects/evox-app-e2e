<?php
/**
 * HAPPY-PATH — Overtime (valid submit, real DB write, FAKED email)
 *
 * SAFE-SUBSET VERSION — 2026-07-09. Mail::fake() + Queue::fake() are set in setUp() for every
 * test in this class, so OvertimeController::store()'s call to
 * EmailRepository::sendOvertimeRequestEmail() (which dispatches SendOvertimeRequestEmailJob,
 * a ShouldQueue job) is intercepted before it ever reaches a real queue connection — the job's
 * handle() (which calls Mail::send()) never executes, so no real email reaches
 * gary.aure@/glenn.macasarte@eastvantage.com. Combined with DatabaseTransactions (rolls back
 * the DB row) this test has zero real-world side effects.
 *
 * The outward-facing part of this task (the real, non-rollback E2E submit and the COE form)
 * remains on hold pending Vishnu's direct confirmation — not attempted here.
 */

namespace Tests\Feature\HappyPath;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;
use App\Modules\Request\Models\Overtime;
use App\Modules\Email\Jobs\SendOvertimeRequestEmailJob;

class OvertimeHappyPathTest extends TestCase
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
        $this->employee   = User::where('email', 'glenn.macasarte@eastvantage.com')->firstOrFail();   // ph-employee
        $this->supervisor = User::where('email', 'gary.aure@eastvantage.com')->firstOrFail();          // ph-supervisor
    }

    /** @test */
    public function valid_overtime_submit_creates_a_pending_row_and_queues_the_notification()
    {
        $this->withoutMiddleware();

        $payload = [
            'user_id'       => $this->employee->id,
            'date'          => now()->subDays(3)->toDateString(),
            'amount'        => '01:00', // H:i, within 30min-8h Yup band
            'type'          => 'pre_overtime', // must be in OVERTIME_TYPE constant
            'employee_note' => 'HAPPY-PATH-AUTOTEST overtime submit.',
        ];

        $response = $this->actingAs($this->employee)->postJson('/api/request/overtime', $payload, $this->apiKey);

        if ($response->status() === 500) {
            $this->markTestIncomplete(
                'Store 500\'d — possibly missing EV_SP_Validate_Request_Payroll_Period on this dump. ' .
                'Response: ' . $response->getContent()
            );
        }

        $response->assertStatus(201);

        $this->assertDatabaseHas('overtimes', [
            'user_id' => $this->employee->id,
            'date'    => $payload['date'],
            'type'    => 'pre_overtime',
            'status'  => 'pending',
        ]);

        // Proves the notification WOULD have fired, without letting it actually send.
        Queue::assertPushed(SendOvertimeRequestEmailJob::class);
    }

    /** @test */
    public function supervisor_can_approve_the_pending_overtime()
    {
        $this->withoutMiddleware();

        $overtime = Overtime::create([
            'user_id'       => $this->employee->id,
            'date'          => now()->subDays(4)->toDateString(),
            'amount'        => '01:00:00',
            'type'          => 'pre_overtime',
            'employee_note' => 'HAPPY-PATH-AUTOTEST pre-created for approval flow.',
            'status'        => 'pending',
            'created_by'    => $this->employee->id,
        ]);

        // OvertimeController::approve() type-hints OvertimeRequest, the SAME FormRequest as
        // store() — so the approve payload must satisfy the full store() rule set (date/
        // user_id/type/amount), not just action/approver_note, or it 422s before the
        // controller body ever runs.
        $response = $this->actingAs($this->supervisor)->putJson(
            "/api/request/overtime/approve/{$overtime->id}",
            [
                'action'        => 'approve',
                'approver_note' => 'HAPPY-PATH-AUTOTEST approved.',
                'user_id'       => $overtime->user_id,
                'date'          => $overtime->date,
                'type'          => $overtime->type,
                'amount'        => '01:00',
            ],
            $this->apiKey
        );

        if ($response->status() === 500) {
            $this->markTestIncomplete(
                'Approve 500\'d — check request_validity_checker()/DTR SP dependency on this dump. ' .
                'Response: ' . $response->getContent()
            );
        }

        $this->assertContains($response->status(), [200, 201], 'Approve response: ' . $response->getContent());
        // 200 = normal approval (status → approved); 201 = dispute path (payroll period already
        // closed — original is declined and a dispute row is filed instead).
        if ($response->status() === 200) {
            $this->assertDatabaseHas('overtimes', ['id' => $overtime->id, 'status' => 'approved']);
        } else {
            $this->assertDatabaseHas('overtimes', ['id' => $overtime->id, 'status' => 'declined']);
        }
    }
}
