<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
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
use App\Modules\Email\Jobs\SendFailedBHRSyncNoticeJob;
use App\Modules\Email\Mail\SupervisorReminderInvalidCheckInsEmail;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\User\Models\User;

/**
 * REAL EmailRepository (all mail entry points across Requests/Auth/Cron reminders).
 * File was 32.1% covered (133 uncovered lines): every method is a queued-Job dispatcher, and no
 * test ever called them. Queue::fake() captures every dispatch (nothing leaves the box); the ONE
 * dispatchNow() method (sendSupervisorReminderInvalidCheckInsEmail) runs its job synchronously,
 * whose handle() only does Mail::send — captured by Mail::fake().
 *
 * DEAD CODE (for the dev list): sendOvertimeRequestChangeStatusEmail,
 * sendRestDayWorkRequestChangeStatusEmail, sendAlterLogRequestChangeStatusEmail,
 * sendChangeScheduleRequestChangeStatusEmail have EMPTY try bodies — the status-change email
 * logic was removed, only the husks remain. Calling them documents the no-op behavior.
 */
class EmailRepositoryQueueFakeTest extends TestCase
{
    use DatabaseTransactions;

    /** @var EmailRepository */
    private $repo;
    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
        Mail::fake();
        $this->repo = new EmailRepository();

        $this->user = User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$this->user) $this->markTestSkipped('no active user in test DB');
        $this->be($this->user);
    }

    // -------------------------------------------------------------- auth emails
    /** @test */
    public function registered_and_forgot_password_emails_queue_their_jobs()
    {
        $this->assertTrue($this->repo->sendRegisteredUserEmail($this->user, 'temp-pass-1'));
        Queue::assertPushed(SendRegisteredUserEmailJob::class);

        $this->assertTrue($this->repo->sendForgotPasswordRequestEmail($this->user, 'temp-pass-2'));
        Queue::assertPushed(SendForgotPasswordRequestEmailJob::class);
    }

    // ----------------------------------------------------------- request emails
    /** @test */
    public function overtime_request_and_dispute_emails_queue_their_jobs()
    {
        $overtime = Overtime::orderBy('id', 'desc')->first();
        if (!$overtime) $this->markTestSkipped('no Overtime row in test DB');

        $this->assertTrue($this->repo->sendOvertimeRequestEmail($overtime));
        Queue::assertPushed(SendOvertimeRequestEmailJob::class);

        $this->assertTrue($this->repo->sendOvertimeDisputeEmail(['overtime' => $overtime->toArray()]));
        Queue::assertPushed(SendOvertimeDisputeEmailJob::class);

        // dead husk: empty try body, returns null, queues nothing
        $this->assertNull($this->repo->sendOvertimeRequestChangeStatusEmail($overtime));
    }

    /** @test */
    public function rest_day_work_request_and_dispute_emails_queue_their_jobs()
    {
        $rdw = RestDayWork::orderBy('id', 'desc')->first();
        if (!$rdw) $this->markTestSkipped('no RestDayWork row in test DB');

        $this->assertTrue($this->repo->sendRestDayWorkRequestEmail($rdw));
        Queue::assertPushed(SendRestDayWorkRequestEmailJob::class);

        $this->assertTrue($this->repo->sendRestDayWorkDisputeEmail(['rest_day_work' => $rdw->toArray()]));
        Queue::assertPushed(SendRestDayWorkDisputeEmailJob::class);

        $this->assertNull($this->repo->sendRestDayWorkRequestChangeStatusEmail($rdw));   // dead husk
    }

    /** @test */
    public function alter_log_request_and_dispute_emails_queue_their_jobs()
    {
        $alterLog = AlterLog::orderBy('id', 'desc')->first();
        if (!$alterLog) $this->markTestSkipped('no AlterLog row in test DB');

        $this->assertTrue($this->repo->sendAlterLogRequestEmail($alterLog));
        Queue::assertPushed(SendAlterLogRequestEmailJob::class);

        $this->assertTrue($this->repo->sendAlterLogDisputeEmail(['alter_log' => $alterLog->toArray()]));
        Queue::assertPushed(SendAlterLogDisputeEmailJob::class);

        $this->assertNull($this->repo->sendAlterLogRequestChangeStatusEmail($alterLog)); // dead husk
    }

    /** @test */
    public function change_schedule_request_email_queues_its_job()
    {
        $cs = ChangeSchedule::orderBy('id', 'desc')->first();
        if (!$cs) $this->markTestSkipped('no ChangeSchedule row in test DB');

        $this->assertTrue($this->repo->sendChangeScheduleRequestEmail($cs));
        Queue::assertPushed(SendChangeScheduleRequestEmailJob::class);

        $this->assertNull($this->repo->sendChangeScheduleRequestChangeStatusEmail($cs)); // dead husk
    }

    // -------------------------------------------------------- supervisor reminders
    /** @test */
    public function supervisor_reminders_queue_their_jobs()
    {
        $this->repo->sendSupervisorReminderNoSchedEmail(['supervisor' => $this->user->toArray()]);
        Queue::assertPushed(SendSupervisorReminderNoSchedEmailJob::class);

        $this->repo->sendSupervisorReminderRequestsEmail(['supervisor' => $this->user->toArray()]);
        Queue::assertPushed(SendSupervisorReminderRequestsEmailJob::class);

        $this->repo->sendFailedBHRUserSyncNotice($this->user);
        Queue::assertPushed(SendFailedBHRSyncNoticeJob::class);
    }

    /** @test */
    public function new_user_reminder_dispatches_per_known_supervisor_and_skips_unknown()
    {
        $supervisor = User::whereNotNull('bhr_num')->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$supervisor) $this->markTestSkipped('no bhr-numbered user in test DB');

        $this->repo->sendSupervisorReminderofNewUser([
            $supervisor->bhr_num       => [['name' => 'New Hire A']],   // found arm -> dispatch
            'ZZ-NO-SUCH-BHR-99999999'  => [['name' => 'New Hire B']],   // miss arm  -> skipped
        ]);

        Queue::assertPushed(SendSupervisorReminderOfNewUserEmailJob::class, 1);
    }

    /** @test */
    public function invalid_check_ins_reminder_sends_mail_synchronously()
    {
        // Production caller: [$supervisorUser, $checkInsCollection] (sendSupervisorReminderInvalidCheckIns.php:59)
        // Mail class reads [0] = supervisor, [1] = check-ins list.
        $this->repo->sendSupervisorReminderInvalidCheckInsEmail([$this->user, []]);

        Mail::assertSent(SupervisorReminderInvalidCheckInsEmail::class);
    }
}
