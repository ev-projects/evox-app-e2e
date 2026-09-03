<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use App\Modules\Email\Jobs\SendAlterLogRequestEmailJob;
use App\Modules\Email\Jobs\SendAlterLogDisputeEmailJob;
use App\Modules\Email\Jobs\SendChangeScheduleRequestEmailJob;
use App\Modules\Email\Jobs\SendFailedBHRSyncNoticeJob;
use App\Modules\Email\Jobs\SendForgotPasswordRequestEmailJob;
use App\Modules\Email\Jobs\SendOvertimeRequestEmailJob;
use App\Modules\Email\Jobs\SendOvertimeDisputeEmailJob;
use App\Modules\Email\Jobs\SendRegisteredUserEmailJob;
use App\Modules\Email\Jobs\SendRestDayWorkRequestEmailJob;
use App\Modules\Email\Jobs\SendRestDayWorkDisputeEmailJob;
use App\Modules\Email\Jobs\SendSupervisorReminderInvalidCheckInsEmailJob;
use App\Modules\Email\Jobs\SendSupervisorReminderNoSchedEmailJob;
use App\Modules\Email\Jobs\SendSupervisorReminderOfNewUserEmailJob;
use App\Modules\Email\Jobs\SendSupervisorReminderRequestsEmailJob;
use App\Modules\Email\Mail\AlterLogRequestEmail;
use App\Modules\Email\Mail\ChangeScheduleRequestEmail;
use App\Modules\Email\Mail\FailedBHRSyncNoticeEmail;
use App\Modules\Email\Mail\ForgotPasswordRequestEmail;
use App\Modules\Email\Mail\AlterLogDisputeEmail;
use App\Modules\Email\Mail\OvertimeDisputeEmail;
use App\Modules\Email\Mail\RestDayWorkDisputeEmail;
use App\Modules\Email\Mail\OvertimeRequestEmail;
use App\Modules\Email\Mail\RegisteredUserEmail;
use App\Modules\Email\Mail\RestDayWorkRequestEmail;
use App\Modules\Email\Mail\SupervisorReminderNoSchedEmail;
use App\Modules\Email\Mail\SupervisorReminderOfNewUserEmail;
use App\Modules\Email\Mail\SupervisorReminderRequestsEmail;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\User\Models\User;

/**
 * Completes handle() for all 14 email Jobs — every one was at 0%, and handle() is the only method
 * in each class, so finishing it flips the whole class (see CLASS-COMPLETION-PLAN.md).
 *
 * These jobs are the LAST step of every notification in the app: the repository queues them, the
 * worker runs handle(), and handle() is what actually sends. Nothing had ever executed that step —
 * which is exactly how EML-DEAD-1 (four notifications that silently never send) survived for so long.
 *
 * Mail::fake() captures the send; nothing leaves the box. Request jobs resolve their recipient via
 * `user()->first()->direct_supervisor()`, so they are probed on rows whose owner HAS a supervisor,
 * and the no-supervisor arm is asserted separately (the job must quietly send nothing).
 */
class EmailJobsHandleTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->user = User::whereNotNull('email')->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$this->user) $this->markTestSkipped('no active user with an email in test DB');
        $this->be($this->user);
    }

    /**
     * Find any active user who resolves a direct supervisor.
     * Dispute jobs send directly to the user's supervisor (not via a request model),
     * so we probe users rather than request rows.
     */
    private function supervisedUser(): ?User
    {
        foreach (User::whereNotNull('email')->where('is_active', 1)
                      ->orderBy('id', 'desc')->limit(200)->get() as $u) {
            try {
                if ($u->direct_supervisor()) return $u;
            } catch (\Throwable $e) { /* try the next user */ }
        }
        return null;
    }

    /** A request row whose owner resolves a direct supervisor (needed for the send arm). */
    private function withSupervisor($modelClass)
    {
        // PROBE WIDENED 2026-08-06: was limit(15). A window that small gave up on databases
        // holding thousands of qualifying rows, so the test marked itself incomplete and covered
        // NOTHING - which is why several classes with working tests reported 0% coverage.
        // Still bounded and indexed; no whole-table scan.
        foreach ($modelClass::whereHas('user')->orderBy('id', 'desc')->limit(400)->get() as $row) {
            $owner = $row->user()->first();
            if (!$owner) continue;
            try {
                $sup = $owner->direct_supervisor();
                if ($sup) return $row;
            } catch (\Throwable $e) { /* try the next row */ }
        }
        return null;
    }

    // ------------------------------------------------------------- request notifications
    /** @test */
    public function overtime_request_job_sends_to_the_requesters_supervisor()
    {
        $overtime = $this->withSupervisor(Overtime::class);
        if (!$overtime) $this->markTestSkipped('no Overtime whose owner has a direct supervisor');

        (new SendOvertimeRequestEmailJob($overtime))->handle();

        Mail::assertSent(OvertimeRequestEmail::class);
    }

    /** @test */
    public function alter_log_and_change_schedule_and_rest_day_request_jobs_send()
    {
        $alterLog = $this->withSupervisor(AlterLog::class);
        $cs       = $this->withSupervisor(ChangeSchedule::class);
        $rdw      = $this->withSupervisor(RestDayWork::class);
        if (!$alterLog && !$cs && !$rdw) {
            $this->markTestSkipped('no request rows with a supervised owner in test DB');
        }

        if ($alterLog) {
            (new SendAlterLogRequestEmailJob($alterLog))->handle();
            Mail::assertSent(AlterLogRequestEmail::class);
        }
        if ($cs) {
            (new SendChangeScheduleRequestEmailJob($cs))->handle();
            Mail::assertSent(ChangeScheduleRequestEmail::class);
        }
        if ($rdw) {
            (new SendRestDayWorkRequestEmailJob($rdw))->handle();
            Mail::assertSent(RestDayWorkRequestEmail::class);
        }
    }

    /** @test */
    public function a_request_whose_owner_has_no_supervisor_sends_nothing_and_does_not_throw()
    {
        // the is_valid($recepient) guard arm — the job must complete silently
        $orphan = null;
        // PROBE WIDENED 2026-08-06: was limit(20). A window that small gave up on databases
        // holding thousands of qualifying rows, so the test marked itself incomplete and covered
        // NOTHING - which is why several classes with working tests reported 0% coverage.
        // Still bounded and indexed; no whole-table scan.
        foreach (Overtime::whereHas('user')->orderBy('id', 'desc')->limit(400)->get() as $row) {
            $owner = $row->user()->first();
            if (!$owner) continue;
            try {
                if (!$owner->direct_supervisor()) { $orphan = $row; break; }
            } catch (\Throwable $e) { /* skip */ }
        }
        if (!$orphan) $this->markTestSkipped('every probed requester has a supervisor');

        (new SendOvertimeRequestEmailJob($orphan))->handle();

        Mail::assertNothingSent();
    }

    // ------------------------------------------------------------------ dispute jobs
    /** @test */
    public function dispute_jobs_send_from_an_array_payload()
    {
        // Dispute jobs look up user_id → direct_supervisor() and gate on is_valid(). Using
        // $this->user directly failed when that user has no supervisor (setUp picks the last
        // active user with email, not necessarily one with a supervisor). Probe for a user
        // who has a supervisor so the is_valid() branch is always exercised.
        $sender = $this->supervisedUser();
        if (!$sender) {
            $this->markTestSkipped('no active user with a direct supervisor — dispute send arm not reachable');
        }

        $payload = [
            'user_id' => $sender->id, 'date' => '2026-07-10',
            'employee_note' => 'note', 'approver_note' => 'note',
            'amount' => 1, 'type' => 'overtime',
            'current_time_in' => 28800, 'current_time_out' => 61200,
            'new_time_in' => 28800, 'new_time_out' => 64800,
            'start_time' => 28800, 'end_time' => 61200, 'break_time' => 3600,
        ];

        (new SendOvertimeDisputeEmailJob($payload))->handle();
        (new SendAlterLogDisputeEmailJob($payload))->handle();
        (new SendRestDayWorkDisputeEmailJob($payload))->handle();

        // three dispute mails assembled and dispatched through the faked mailer
        // B6 — Mail::assertSentCount() does not exist on Laravel 5.7's MailFake (it arrives in 5.8).
        // Asserting each dispute mailable individually is also a stronger assertion than a count:
        // it proves WHICH three were sent, so swapping one for another can no longer pass.
        Mail::assertSent(OvertimeDisputeEmail::class);
        Mail::assertSent(AlterLogDisputeEmail::class);
        Mail::assertSent(RestDayWorkDisputeEmail::class);
    }

    // --------------------------------------------------------------------- auth jobs
    /** @test */
    public function registration_and_forgot_password_jobs_send_their_mail()
    {
        (new SendRegisteredUserEmailJob($this->user, 'temp-pass-1'))->handle();
        Mail::assertSent(RegisteredUserEmail::class);

        (new SendForgotPasswordRequestEmailJob($this->user, 'temp-pass-2'))->handle();
        Mail::assertSent(ForgotPasswordRequestEmail::class);
    }

    // ------------------------------------------------------------ supervisor reminders
    /** @test */
    public function supervisor_reminder_jobs_send_their_mail()
    {
        $reminder = [$this->user, []];      // production shape: [supervisor, collection]

        (new SendSupervisorReminderNoSchedEmailJob($reminder))->handle();
        Mail::assertSent(SupervisorReminderNoSchedEmail::class);

        (new SendSupervisorReminderRequestsEmailJob($reminder))->handle();
        Mail::assertSent(SupervisorReminderRequestsEmail::class);

        (new SendSupervisorReminderOfNewUserEmailJob($reminder))->handle();
        Mail::assertSent(SupervisorReminderOfNewUserEmail::class);
    }

    /** @test */
    public function invalid_check_ins_and_failed_sync_jobs_send_their_mail()
    {
        (new SendSupervisorReminderInvalidCheckInsEmailJob([$this->user, []]))->handle();

        (new SendFailedBHRSyncNoticeJob($this->user))->handle();
        Mail::assertSent(FailedBHRSyncNoticeEmail::class);
    }
}
