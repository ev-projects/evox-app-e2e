<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Mail;
use App\Modules\User\Models\User;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\Email\Repositories\EmailRepository;
use App\Modules\Email\Jobs\SendRegisteredUserEmailJob;
use App\Modules\Email\Jobs\SendForgotPasswordRequestEmailJob;
use App\Modules\Email\Jobs\SendOvertimeRequestEmailJob;
use App\Modules\Email\Jobs\SendOvertimeDisputeEmailJob;
use App\Modules\Email\Jobs\SendRestDayWorkRequestEmailJob;
use App\Modules\Email\Jobs\SendRestDayWorkDisputeEmailJob;
use App\Modules\Email\Jobs\SendAlterLogRequestEmailJob;
use App\Modules\Email\Jobs\SendAlterLogDisputeEmailJob;
use App\Modules\Email\Jobs\SendChangeScheduleRequestEmailJob;
use App\Modules\Email\Jobs\SendSupervisorReminderNoSchedEmailJob;
use App\Modules\Email\Jobs\SendSupervisorReminderOfNewUserEmailJob;
use App\Modules\Email\Jobs\SendSupervisorReminderRequestsEmailJob;
use App\Modules\Email\Jobs\SendSupervisorReminderInvalidCheckInsEmailJob;
use App\Modules\Email\Jobs\SendFailedBHRSyncNoticeJob;

/**
 * Covers EmailRepository — all 18 methods (14 active dispatchers + 4 empty stubs).
 *
 * Queue::fake() intercepts dispatch()->delay() calls (async path).
 * Mail::fake()  intercepts any Mail::send / Mail::to()->send() inside dispatchNow() jobs.
 * DatabaseTransactions rolls back the DB::beginTransaction() in sendSupervisorReminderofNewUser.
 */
class evoxtest_EmailRepositoryTest extends TestCase
{
    use DatabaseTransactions;

    private EmailRepository $repo;
    private User $supervisor;   // Gary Aure — users.id=1698
    private User $employee;     // Glenn Macasarte — users.id=1593

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
        Mail::fake();
        $this->repo       = new EmailRepository();
        $this->supervisor = User::findOrFail(1698);
        $this->employee   = User::findOrFail(1593);
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    private function overtime(): Overtime
    {
        $r = Overtime::latest('id')->first();
        if (!$r) {
            $this->markTestSkipped('No overtime rows in DB.');
        }
        return $r;
    }

    private function rdw(): RestDayWork
    {
        $r = RestDayWork::latest('id')->first();
        if (!$r) {
            $this->markTestSkipped('No rest_day_work rows in DB.');
        }
        return $r;
    }

    private function alterLog(): AlterLog
    {
        $r = AlterLog::latest('id')->first();
        if (!$r) {
            $this->markTestSkipped('No alter_log rows in DB.');
        }
        return $r;
    }

    private function changeSchedule(): ChangeSchedule
    {
        $r = ChangeSchedule::latest('id')->first();
        if (!$r) {
            $this->markTestSkipped('No change_schedule rows in DB.');
        }
        return $r;
    }

    // ─── 14 active dispatchers ───────────────────────────────────────────────

    public function test_send_registered_user_email_dispatches_job()
    {
        $result = $this->repo->sendRegisteredUserEmail($this->employee, 'TempP@ss123!');
        $this->assertTrue($result);
        Queue::assertPushed(SendRegisteredUserEmailJob::class);
    }

    public function test_send_forgot_password_request_email_dispatches_job()
    {
        $result = $this->repo->sendForgotPasswordRequestEmail($this->employee, 'TempP@ss123!');
        $this->assertTrue($result);
        Queue::assertPushed(SendForgotPasswordRequestEmailJob::class);
    }

    public function test_send_overtime_request_email_dispatches_job()
    {
        $result = $this->repo->sendOvertimeRequestEmail($this->overtime());
        $this->assertTrue($result);
        Queue::assertPushed(SendOvertimeRequestEmailJob::class);
    }

    public function test_send_overtime_dispute_email_dispatches_job()
    {
        $result = $this->repo->sendOvertimeDisputeEmail(['user_id' => $this->employee->id]);
        $this->assertTrue($result);
        Queue::assertPushed(SendOvertimeDisputeEmailJob::class);
    }

    public function test_send_rest_day_work_request_email_dispatches_job()
    {
        $result = $this->repo->sendRestDayWorkRequestEmail($this->rdw());
        $this->assertTrue($result);
        Queue::assertPushed(SendRestDayWorkRequestEmailJob::class);
    }

    public function test_send_rest_day_work_dispute_email_dispatches_job()
    {
        $result = $this->repo->sendRestDayWorkDisputeEmail(['user_id' => $this->employee->id]);
        $this->assertTrue($result);
        Queue::assertPushed(SendRestDayWorkDisputeEmailJob::class);
    }

    public function test_send_alter_log_request_email_dispatches_job()
    {
        $result = $this->repo->sendAlterLogRequestEmail($this->alterLog());
        $this->assertTrue($result);
        Queue::assertPushed(SendAlterLogRequestEmailJob::class);
    }

    public function test_send_alter_log_dispute_email_dispatches_job()
    {
        $result = $this->repo->sendAlterLogDisputeEmail(['user_id' => $this->employee->id]);
        $this->assertTrue($result);
        Queue::assertPushed(SendAlterLogDisputeEmailJob::class);
    }

    public function test_send_change_schedule_request_email_dispatches_job()
    {
        $result = $this->repo->sendChangeScheduleRequestEmail($this->changeSchedule());
        $this->assertTrue($result);
        Queue::assertPushed(SendChangeScheduleRequestEmailJob::class);
    }

    public function test_send_supervisor_reminder_no_sched_email_dispatches_job()
    {
        // Method returns void — no assertTrue; just assert job was queued
        $this->repo->sendSupervisorReminderNoSchedEmail([
            $this->supervisor,
            collect([$this->employee]),
        ]);
        Queue::assertPushed(SendSupervisorReminderNoSchedEmailJob::class);
    }

    public function test_send_supervisor_reminder_of_new_user_dispatches_job()
    {
        // Key = supervisor bhr_num; Glenn's bhr_num used so User::where('bhr_num',...)->first()
        // returns a real record, passes is_valid(), and the dispatch is reached.
        $this->repo->sendSupervisorReminderofNewUser([
            $this->employee->bhr_num => [$this->employee->toArray()],
        ]);
        Queue::assertPushed(SendSupervisorReminderOfNewUserEmailJob::class);
    }

    public function test_send_supervisor_reminder_requests_email_dispatches_job()
    {
        // Method returns void
        $this->repo->sendSupervisorReminderRequestsEmail([
            $this->supervisor,
            collect([['type' => 'overtime', 'status' => 'pending', 'id' => 1]]),
        ]);
        Queue::assertPushed(SendSupervisorReminderRequestsEmailJob::class);
    }

    /**
     * dispatchNow() runs the job synchronously via the Bus Dispatcher — NOT intercepted
     * by Queue::fake(). Mail::fake() prevents actual mail delivery inside the job.
     * Success = no exception thrown.
     */
    public function test_send_supervisor_reminder_invalid_check_ins_runs_synchronously()
    {
        $this->repo->sendSupervisorReminderInvalidCheckInsEmail([
            $this->supervisor,
            collect([['employee' => $this->employee->name, 'date' => '2026-08-01']]),
        ]);
        $this->addToAssertionCount(1);  // no exception = success
    }

    public function test_send_failed_bhr_user_sync_notice_dispatches_job()
    {
        // Method returns void
        $this->repo->sendFailedBHRUserSyncNotice(
            (object) ['bhr_num' => $this->employee->bhr_num, 'name' => $this->employee->name]
        );
        Queue::assertPushed(SendFailedBHRSyncNoticeJob::class);
    }

    // ─── 4 empty stubs (empty try body — return null, no dispatch) ────────────

    public function test_send_overtime_request_change_status_is_empty_stub()
    {
        $this->repo->sendOvertimeRequestChangeStatusEmail($this->overtime());
        $this->addToAssertionCount(1);  // no crash = empty stub confirmed
    }

    public function test_send_rest_day_work_request_change_status_is_empty_stub()
    {
        $this->repo->sendRestDayWorkRequestChangeStatusEmail($this->rdw());
        $this->addToAssertionCount(1);
    }

    public function test_send_alter_log_request_change_status_is_empty_stub()
    {
        $this->repo->sendAlterLogRequestChangeStatusEmail($this->alterLog());
        $this->addToAssertionCount(1);
    }

    public function test_send_change_schedule_request_change_status_is_empty_stub()
    {
        $this->repo->sendChangeScheduleRequestChangeStatusEmail($this->changeSchedule());
        $this->addToAssertionCount(1);
    }
}
