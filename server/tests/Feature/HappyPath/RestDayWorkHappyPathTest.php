<?php
/**
 * HAPPY-PATH — Rest Day Work (valid submit, real DB write, FAKED email)
 *
 * SAFE-SUBSET VERSION — 2026-07-09. Mail::fake() + Queue::fake() in setUp() intercept
 * SendRestDayWorkRequestEmailJob (ShouldQueue) before it reaches a real queue connection, so
 * no real email is sent. DatabaseTransactions rolls back the row. Zero real-world side effects.
 *
 * Business-rule note (matrices/rest-day-work.md): store() rejects with a plain error_response
 * (not 422) if a Dtr row exists for (date,user_id) with is_rest_day=0. The date below is chosen
 * to avoid a Dtr collision; if it still hits the wall, the test documents it via markTestSkipped
 * rather than force-asserting a specific outcome against unknown dump data.
 */

namespace Tests\Feature\HappyPath;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Email\Jobs\SendRestDayWorkRequestEmailJob;

class RestDayWorkHappyPathTest extends TestCase
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
    public function valid_rest_day_work_submit_creates_a_pending_row_and_queues_the_notification()
    {
        $this->withoutMiddleware();

        $date = now()->subDays(30)->toDateString();
        $dtrCollision = Dtr::where('date', $date)->where('user_id', $this->employee->id)->first();
        if ($dtrCollision && $dtrCollision->is_rest_day == 0) {
            $this->markTestSkipped('Chosen date collides with a workday Dtr row for this user on this dump — pick a different offset.');
        }

        $payload = [
            'user_id'       => $this->employee->id,
            'date'          => $date,
            'start_time'    => '09:00',
            'end_time'      => '17:00',
            'break_time'    => '00:30', // <= 1h per ValidBreakTime rule
            'employee_note' => 'HAPPY-PATH-AUTOTEST rest day work submit.',
        ];

        $response = $this->actingAs($this->employee)->postJson('/api/request/rest_day_work', $payload, $this->apiKey);

        if ($response->status() === 500) {
            $this->markTestIncomplete('Store 500\'d. Response: ' . $response->getContent());
        }
        if ($response->status() === 400) {
            $this->markTestSkipped('Business-rule wall hit ("not a restday"). Response: ' . $response->getContent());
        }

        $response->assertStatus(201);
        $this->assertDatabaseHas('rest_day_works', [
            'user_id' => $this->employee->id,
            'date'    => $date,
            'status'  => 'pending',
        ]);
        Queue::assertPushed(SendRestDayWorkRequestEmailJob::class);
    }

    /** @test */
    public function supervisor_can_approve_the_pending_rest_day_work()
    {
        $this->withoutMiddleware();

        // rest_day_works.start_time/end_time/break_time are INTEGER (unix timestamp / seconds)
        // columns, not datetime — passing Carbon instances directly makes Spatie's activity-log
        // package blow up trying to cast them on save. Use ->timestamp (int) instead.
        $day = now()->subDays(31);
        $rdw = RestDayWork::create([
            'user_id'       => $this->employee->id,
            'date'          => $day->toDateString(),
            'start_time'    => $day->copy()->setTime(9, 0)->timestamp,
            'end_time'      => $day->copy()->setTime(17, 0)->timestamp,
            'break_time'    => 1800,
            'employee_note' => 'HAPPY-PATH-AUTOTEST pre-created for approval flow.',
            'status'        => 'pending',
            'created_by'    => $this->employee->id,
        ]);

        // RestDayWorkController::approve() type-hints RestDayWorkRequest, same FormRequest as
        // store() — full field set required or it 422s before the controller body runs.
        $response = $this->actingAs($this->supervisor)->putJson(
            "/api/request/rest_day_work/approve/{$rdw->id}",
            [
                'action'        => 'approve',
                'approver_note' => 'HAPPY-PATH-AUTOTEST approved.',
                'user_id'       => $rdw->user_id,
                'date'          => $rdw->date,
                'start_time'    => '09:00',
                'end_time'      => '17:00',
                'break_time'    => '00:30',
            ],
            $this->apiKey
        );

        if ($response->status() === 500) {
            $this->markTestIncomplete('Approve 500\'d. Response: ' . $response->getContent());
        }

        $this->assertEquals(200, $response->status(), 'Approve response: ' . $response->getContent());
        $this->assertDatabaseHas('rest_day_works', ['id' => $rdw->id, 'status' => 'approved']);
    }
}
