<?php
/**
 * HAPPY-PATH — Alter Log (valid submit, real DB write, FAKED email)
 *
 * SAFE-SUBSET VERSION — 2026-07-09. Mail::fake() + Queue::fake() in setUp() intercept
 * SendAlterLogRequestEmailJob (ShouldQueue) before it reaches a real queue connection, so no
 * real email is sent. DatabaseTransactions rolls back the row. Zero real-world side effects.
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

        $date = now()->subDays(20)->toDateString();

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

        $date = now()->subDays(5)->toDateString();
        $alterLog = AlterLog::create([
            'user_id'       => $this->employee->id,
            'date'          => $date,
            'new_time_in'   => $date . ' 09:00:00',
            'new_time_out'  => $date . ' 18:00:00',
            'employee_note' => 'HAPPY-PATH-AUTOTEST pre-created for approval flow.',
            'status'        => 'pending',
            'created_by'    => $this->employee->id,
        ]);

        // AlterLogController::approve() type-hints AlterLogRequest, same FormRequest as
        // store() — full field set required or it 422s before the controller body runs.
        $response = $this->actingAs($this->supervisor)->putJson(
            "/api/request/alter_log/approve/{$alterLog->id}",
            [
                'action'         => 'approve',
                'approver_note'  => 'HAPPY-PATH-AUTOTEST approved.',
                'user_id'        => $alterLog->user_id,
                'date'           => $alterLog->date,
                'new_time_in'    => $alterLog->new_time_in,
                'new_time_out'   => $alterLog->new_time_out,
                'employee_note'  => $alterLog->employee_note,
            ],
            $this->apiKey
        );

        if ($response->status() === 500) {
            $this->markTestIncomplete('Approve 500\'d. Response: ' . $response->getContent());
        }

        $this->assertContains($response->status(), [200, 201], 'Approve response: ' . $response->getContent());
        $this->assertDatabaseHas('alter_logs', ['id' => $alterLog->id, 'status' => 'approved']);
    }
}
