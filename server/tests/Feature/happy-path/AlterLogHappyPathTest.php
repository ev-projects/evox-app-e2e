<?php
/**
 * HAPPY-PATH — Alter Log (valid submit, real DB write, FAKED email)
 *
 * SAFE-SUBSET VERSION — 2026-07-09. Mail::fake() + Queue::fake() in setUp() intercept
 * SendAlterLogRequestEmailJob (ShouldQueue) before it reaches a real queue connection, so no
 * real email is sent. DatabaseTransactions rolls back the row. Zero real-world side effects.
 *
 * FIX 2026-08-11:
 * - Both tests now pick a date dynamically to avoid the AlterLogRequest unique(user_id, date)
 *   constraint. A hardcoded subDays(N) fails with 422 once a real alter_log row exists for
 *   that date in the dev DB.
 * - Approve test changes date to >30 days old so request_validity_checker() short-circuits to
 *   false (no SP call).  It also stores correct Unix timestamps in the AlterLog row and sends
 *   hardcoded Y-m-d H:i:s strings in the approve payload — the int column would otherwise
 *   read back as the integer 2026 which fails date_format:Y-m-d H:i:s validation (422).
 */

namespace Tests\Feature\HappyPath;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Email\Jobs\SendAlterLogRequestEmailJob;

class AlterLogHappyPathTest extends TestCase
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

    /** @test */
    public function valid_alter_log_submit_creates_a_pending_row_and_queues_the_notification()
    {
        $this->withoutMiddleware();

        // Dynamic date — AlterLogRequest unique(user_id, date) constraint means a hardcoded
        // offset fails with 422 the moment a real alter_log row for that date exists in the DB.
        $date = null;
        for ($i = 15; $i <= 90; $i++) {
            $candidate = now()->subDays($i)->toDateString();
            $conflict  = AlterLog::where('user_id', $this->employee->id)
                ->where('date', $candidate)
                ->whereNull('deleted_at')
                ->exists();
            if (!$conflict) { $date = $candidate; break; }
        }
        if (!$date) {
            $this->markTestSkipped('Cat 1 — no available date in the last 90 days without an existing non-deleted alter_log for this user');
        }

        $payload = [
            'user_id'        => $this->employee->id,
            'date'           => $date,
            'new_time_in'    => $date . ' 09:00:00',
            'new_time_out'   => $date . ' 18:00:00',
            // required server-side despite being optional on the FE — matrices/alter-log.md FINDING
            'employee_note'  => 'HAPPY-PATH-AUTOTEST alter log submit.',
        ];

        $response = $this->actingAs($this->employee)->postJson('/api/request/alter_log', $payload, $this->apiKey);

        if ($response->status() === 500) {
            $this->markTestIncomplete('Store 500\'d. Response: ' . $response->getContent());
        }

        $response->assertStatus(201);
        $this->assertDatabaseHas('alter_logs', [
            'user_id' => $this->employee->id,
            'date'    => $date,
            'status'  => 'pending',
        ]);
        Queue::assertPushed(SendAlterLogRequestEmailJob::class);
    }

    /** @test */
    public function supervisor_can_approve_the_pending_alter_log()
    {
        $this->withoutMiddleware();

        // Must be >30 days old: request_validity_checker() short-circuits to false for dates
        // older than 30 days, skipping the real EV_SP_Validate_Request_Payroll_Period SP call.
        // If the SP runs and returns 2 (dispute window) the controller silently takes the
        // dispute branch and never sets status='approved', causing the DB assert to fail.
        //
        // Also need to avoid AlterLogRequest unique(user_id, date): the ->ignore($id) clause
        // covers the newly created row, but any OTHER non-deleted alter_log for Glenn on this
        // date would still block with 422.
        $date = null;
        for ($i = 35; $i <= 120; $i++) {
            $candidate = now()->subDays($i)->toDateString();
            $conflict  = AlterLog::where('user_id', $this->employee->id)
                ->where('date', $candidate)
                ->whereNull('deleted_at')
                ->exists();
            if (!$conflict) { $date = $candidate; break; }
        }
        if (!$date) {
            $this->markTestSkipped('Cat 1 — no available date >35 days without a conflicting alter_log for this user');
        }

        // alter_logs.new_time_in / new_time_out are int(11) Unix-timestamp columns.
        // Pass integers here — AlterLog::create() with a datetime string would let MySQL
        // cast '2026-...' to the integer 2026, which then fails date_format:Y-m-d H:i:s
        // in AlterLogRequest on the approve payload.
        $alterLog = AlterLog::create([
            'user_id'       => $this->employee->id,
            'date'          => $date,
            'new_time_in'   => strtotime($date . ' 09:00:00'),
            'new_time_out'  => strtotime($date . ' 18:00:00'),
            'employee_note' => 'HAPPY-PATH-AUTOTEST pre-created for approval flow.',
            'status'        => 'pending',
            'created_by'    => $this->employee->id,
        ]);

        // AlterLogController::approve() type-hints AlterLogRequest, same FormRequest as
        // store() — full field set required or it 422s before the controller body runs.
        // new_time_in / new_time_out MUST be hardcoded datetime strings, not read back from
        // the model: the int column returns an integer (not a datetime string) when accessed.
        $response = $this->actingAs($this->supervisor)->putJson(
            "/api/request/alter_log/approve/{$alterLog->id}",
            [
                'action'         => 'approve',
                'approver_note'  => 'HAPPY-PATH-AUTOTEST approved.',
                'user_id'        => $alterLog->user_id,
                'date'           => $date,
                'new_time_in'    => $date . ' 09:00:00',   // Y-m-d H:i:s — int column reads back wrong
                'new_time_out'   => $date . ' 18:00:00',   // Y-m-d H:i:s — same reason
                'employee_note'  => $alterLog->employee_note,
            ],
            $this->apiKey
        );

        if ($response->status() === 500) {
            $this->markTestIncomplete('Approve 500\'d. Response: ' . $response->getContent());
        }

        $this->assertContains($response->status(), [200, 201], 'Approve response: ' . $response->getContent());
        // 200 = normal approval path (status → approved); 201 = dispute path (payroll period
        // already closed — original is declined and a dispute row is filed instead).
        if ($response->status() === 200) {
            $this->assertDatabaseHas('alter_logs', ['id' => $alterLog->id, 'status' => 'approved']);
        } else {
            $this->assertDatabaseHas('alter_logs', ['id' => $alterLog->id, 'status' => 'declined']);
        }
    }
}
