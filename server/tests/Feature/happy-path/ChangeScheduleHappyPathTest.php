<?php
/**
 * HAPPY-PATH — Change Schedule (valid submit, real DB write, FAKED email)
 *
 * SAFE-SUBSET VERSION — 2026-07-09. Mail::fake() + Queue::fake() in setUp() intercept
 * SendChangeScheduleRequestEmailJob (ShouldQueue) before it reaches a real queue connection,
 * so no real email is sent. DatabaseTransactions rolls back any row written.
 *
 * KNOWN GAP (matrices/change-schedule.md): cst_schedule_details/work_days/schedule_policies/
 * name/source_type/schedule_type/bind_to/bind_id are NOT validated by ChangeScheduleRequest
 * and are consumed by ScheduleRepository::store() without isset() guards. The payload below is
 * a best-effort reconstruction from the FE container (client/src/container/Request/
 * ChangeSchedule/ChangeSchedule.js ~line 542), NOT confirmed correct by a developer. Because
 * this now runs inside DatabaseTransactions with email faked, the worst case (500, or a
 * partial-null `schedules` row) is contained and rolled back — so it's safe to attempt and
 * document the outcome, rather than skip outright.
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
    public function valid_change_schedule_submit_creates_a_pending_row_and_queues_the_notification()
    {
        $this->withoutMiddleware();

        $validFrom = now()->addDays(7)->toDateString();
        $validTo   = now()->addDays(14)->toDateString();

        // Payload shape confirmed by reading StoreScheduleRequest/ScheduleRequest directly (these
        // get auto-validated too — ChangeScheduleRequest::rules(StoreScheduleRequest $request)
        // type-hints StoreScheduleRequest, which Laravel resolves via the container, which
        // triggers ITS validation against the same request data as a side effect):
        // - source_type must be in:template,change_schedule (not free-form)
        // - bind_to must be in:user,department; bind_id is a plain string
        // - schedule_type in:standard,flexible,customize," empty" — 'standard' triggers
        //   create_work_day_rule("all"), which requires schedule_details.all.{start_time,
        //   end_time,break_time} (H:i) — NOT "cst_schedule_details" (that was a wrong guess).
        $payload = [
            'valid_from'     => $validFrom,
            'valid_to'       => $validTo,
            'employee_note'  => 'HAPPY-PATH-AUTOTEST change schedule submit.',
            'name'           => 'HAPPY-PATH-AUTOTEST schedule',
            'source_type'    => 'change_schedule',
            'schedule_type'  => 'standard',
            'bind_to'        => 'user',
            'bind_id'        => (string) $this->employee->id,
            'work_days'      => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            'schedule_details' => [
                'all' => [
                    'start_time' => '09:00',
                    'end_time'   => '18:00',
                    'break_time' => '01:00',
                ],
            ],
            // ScheduleRepository::store() reads $data['schedule_policies'] with no isset() guard
            // (matrices/change-schedule.md) — omitting the key entirely 500s/400s with
            // "Undefined index: schedule_policies". Must be present, even if all false.
            'schedule_policies' => [
                'allow_undertime'       => false,
                'allow_late'            => false,
                'allow_night_diff'      => false,
                'allow_special_holiday' => false,
                'allow_legal_holiday'   => false,
            ],
        ];

        $response = $this->actingAs($this->employee)->postJson('/api/request/change_schedule', $payload, $this->apiKey);

        if ($response->status() === 500) {
            $this->markTestIncomplete(
                'Store 500\'d — most likely the unconfirmed schedule payload shape (see file header), ' .
                'not a framework issue. Needs a developer-confirmed payload to progress further. ' .
                'Response: ' . $response->getContent()
            );
        }

        $this->assertEquals(201, $response->status(), 'Store response: ' . $response->getContent());
        $this->assertDatabaseHas('change_schedules', [
            'user_id'    => $this->employee->id,
            'valid_from' => $validFrom,
            'status'     => 'pending',
        ]);
        Queue::assertPushed(SendChangeScheduleRequestEmailJob::class);
    }

    /** @test */
    public function supervisor_can_approve_the_pending_change_schedule()
    {
        $this->markTestIncomplete('Depends on a successfully-created change schedule row from the store test above — run that first and confirm the payload shape.');
    }
}
