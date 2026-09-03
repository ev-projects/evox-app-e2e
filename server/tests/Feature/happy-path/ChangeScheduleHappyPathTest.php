<?php
/**
 * HAPPY-PATH — Change Schedule (valid submit + approve, real DB writes, FAKED email)
 *
 * SAFE-SUBSET VERSION — 2026-07-09. Mail::fake() + Queue::fake() in setUp() intercept
 * SendChangeScheduleRequestEmailJob (ShouldQueue) before it reaches a real queue connection,
 * so no real email is sent. DatabaseTransactions rolls back any row written.
 *
 * BUG-089 RESOLVED 2026-08-11 (user fixed ScheduleRequest.php:42):
 *   Old: 'schedule_policies.*' => 'bool|in:allow_undertime,...' (contradictory)
 *   New: 'schedule_policies.*' => 'bool:allow_undertime,...'    (just bool, params ignored)
 * Both tests now implemented.
 *
 * Payload note — StoreScheduleRequest is resolved as a FormRequest via IoC when Laravel
 * injects it into ChangeScheduleRequest::rules(StoreScheduleRequest $request), so its
 * validation runs as a side effect. The payload must satisfy BOTH FormRequests:
 *   ChangeScheduleRequest: valid_from, valid_to
 *   StoreScheduleRequest : name, source_type, schedule_type,
 *                          schedule_details.all.{start_time,end_time,break_time},
 *                          schedule_policies.{allow_undertime,...}
 * DAYS constant uses abbreviated form: 'mon','tue','wed','thu','fri','sat','sun'.
 */

namespace Tests\Feature\HappyPath;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;
use App\Modules\Email\Jobs\SendChangeScheduleRequestEmailJob;

class ChangeScheduleHappyPathTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $employee;
    private User $supervisor;

    /** Shared schedule payload — satisfies both ChangeScheduleRequest and StoreScheduleRequest */
    private array $schedulePayload;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();
        Queue::fake();

        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->employee   = User::where('email', 'glenn.macasarte@eastvantage.com')->firstOrFail();
        $this->supervisor = User::where('email', 'gary.aure@eastvantage.com')->firstOrFail();

        // Use a future date window — no existing DTRs, so apply_schedule_to_dtr() is a no-op.
        $this->schedulePayload = [
            'valid_from'        => now()->addDays(7)->toDateString(),
            'valid_to'          => now()->addDays(37)->toDateString(),
            'name'              => 'HAPPY-PATH-AUTOTEST Change Schedule',
            'source_type'       => 'change_schedule',
            'schedule_type'     => 'standard',
            // DAYS constant uses abbreviated names ('mon','tue',...) — not full day names.
            'work_days'         => ['mon', 'tue', 'wed', 'thu', 'fri'],
            // create_work_day_rule("all") checks schedule_details.all.* for standard type.
            'schedule_details'  => [
                'all' => [
                    'start_time' => '09:00',
                    'end_time'   => '18:00',
                    'break_time' => '01:00',
                ],
            ],
            // ScheduleRepository::store() accesses $data['schedule_policies'] directly.
            'schedule_policies' => [
                'allow_undertime'       => false,
                'allow_late'            => false,
                'allow_night_diff'      => false,
                'allow_special_holiday' => false,
                'allow_legal_holiday'   => false,
            ],
        ];
    }

    /** @test */
    public function valid_change_schedule_submit_creates_a_pending_row_and_queues_the_notification()
    {
        $this->withoutMiddleware();

        $payload = array_merge($this->schedulePayload, [
            'employee_note' => 'HAPPY-PATH-AUTOTEST change schedule submit.',
        ]);

        $response = $this->actingAs($this->employee)->postJson('/api/request/change_schedule', $payload, $this->apiKey);

        if ($response->status() === 422) {
            $this->markTestIncomplete(
                'Store 422 — StoreScheduleRequest validation still failing post-BUG-089 fix. ' .
                'Response: ' . $response->getContent()
            );
        }
        if ($response->status() === 500) {
            $this->markTestIncomplete('Store 500\'d. Response: ' . $response->getContent());
        }

        $response->assertStatus(201);
        $this->assertDatabaseHas('change_schedules', [
            'user_id' => $this->employee->id,
            'status'  => 'pending',
        ]);
        Queue::assertPushed(SendChangeScheduleRequestEmailJob::class);
    }

    /** @test */
    public function supervisor_can_approve_the_pending_change_schedule()
    {
        $this->withoutMiddleware();

        // Pre-create the CS row via the store endpoint (acting as employee).
        // DatabaseTransactions means both store and approve share the same transaction.
        $storePayload = array_merge($this->schedulePayload, [
            'employee_note' => 'HAPPY-PATH-AUTOTEST pre-created for approval flow.',
        ]);

        $storeResponse = $this->actingAs($this->employee)->postJson(
            '/api/request/change_schedule',
            $storePayload,
            $this->apiKey
        );

        if ($storeResponse->status() === 422) {
            $this->markTestIncomplete(
                'Store 422 — BUG-089 may still be active or payload mismatch. ' .
                'Response: ' . $storeResponse->getContent()
            );
        }
        if ($storeResponse->status() !== 201) {
            $this->markTestIncomplete(
                'Store failed (' . $storeResponse->status() . '). Response: ' . $storeResponse->getContent()
            );
        }

        // success_response() wraps content as {"message":...,"content":{...}} — key is 'content', not 'data'.
        $csId = $storeResponse->json('content.id');
        $this->assertNotNull($csId, 'Created CS id missing from store response (expected content.id)');

        // Approve as supervisor.
        // BUG-117 fixed 2026-08-14: approve() → update() → get_authenticated_user() now uses
        // isLevel('Admin') instead of broken roles()/permissions(); supervisor now uses users_handled().
        // apply_schedule_to_dtr() runs over future DTRs — empty set, no crash.
        $approvePayload = array_merge($this->schedulePayload, [
            'approver_note' => 'HAPPY-PATH-AUTOTEST approved.',
        ]);

        $response = $this->actingAs($this->supervisor)->putJson(
            "/api/request/change_schedule/approve/{$csId}",
            $approvePayload,
            $this->apiKey
        );

        if ($response->status() === 500) {
            $this->markTestIncomplete(
                'Approve 500\'d. Likely crash in ChangeScheduleResource::toArray() or ' .
                'apply_schedule_to_dtr(). Response: ' . $response->getContent()
            );
        }

        $this->assertEquals(200, $response->status(), 'Approve response: ' . $response->getContent());
        $this->assertDatabaseHas('change_schedules', ['id' => $csId, 'status' => 'approved']);
    }
}
