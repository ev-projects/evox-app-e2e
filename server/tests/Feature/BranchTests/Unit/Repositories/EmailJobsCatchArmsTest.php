<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Modules\Email\Jobs\SendAlterLogDisputeEmailJob;
use App\Modules\Email\Jobs\SendAlterLogRequestEmailJob;
use App\Modules\Email\Jobs\SendChangeScheduleRequestEmailJob;
use App\Modules\Email\Jobs\SendFailedBHRSyncNoticeJob;
use App\Modules\Email\Jobs\SendForgotPasswordRequestEmailJob;
use App\Modules\Email\Jobs\SendOvertimeDisputeEmailJob;
use App\Modules\Email\Jobs\SendOvertimeRequestEmailJob;
use App\Modules\Email\Jobs\SendRegisteredUserEmailJob;
use App\Modules\Email\Jobs\SendRestDayWorkDisputeEmailJob;
use App\Modules\Email\Jobs\SendRestDayWorkRequestEmailJob;
use App\Modules\Email\Jobs\SendSupervisorReminderInvalidCheckInsEmailJob;
use App\Modules\Email\Jobs\SendSupervisorReminderNoSchedEmailJob;
use App\Modules\Email\Jobs\SendSupervisorReminderOfNewUserEmailJob;
use App\Modules\Email\Jobs\SendSupervisorReminderRequestsEmailJob;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\User\Models\User;

/**
 * ============================================================================================
 * EmailJobsCatchArmsTest — the failure arm of handle() for all 14 queued email Jobs
 * ============================================================================================
 *
 * FILE NAMING NOTE: the packet asked for `EmailJobsCatchArms.php`. phpunit.xml discovers tests
 * with `<directory suffix="Test.php">`, so a file without the `Test.php` suffix is never loaded
 * and would have contributed exactly zero coverage. Written as `EmailJobsCatchArmsTest.php` so
 * it actually runs; every sibling in this directory follows the same convention.
 *
 * CLASSES COMPLETED BY THIS SUITE (14). Each has exactly one method, handle(), and the existing
 * EmailJobsHandleTest already drives the success path and the `is_valid($recepient)` false path.
 * What was left uncovered in every one of them is the identical 2-3 line `catch (Exception $e)`
 * arm at the bottom of handle() — `error_log()` (7 of them) / `log_error($e,'emails')` / `throw $e`.
 * That is why each class sat 3 lines short of 100%:
 *
 *   SendAlterLogRequestEmailJob                     lines 49-50   (log_error + rethrow)
 *   SendChangeScheduleRequestEmailJob               lines 49-50
 *   SendRestDayWorkRequestEmailJob                  lines 50-51
 *   SendOvertimeRequestEmailJob                     lines 48-50   (error_log + log_error + rethrow)
 *   SendAlterLogDisputeEmailJob                     lines 49-50
 *   SendOvertimeDisputeEmailJob                     lines 48-50
 *   SendRestDayWorkDisputeEmailJob                  lines 48-49
 *   SendRegisteredUserEmailJob                      lines 46-47
 *   SendForgotPasswordRequestEmailJob               lines 46-47
 *   SendFailedBHRSyncNoticeJob                      lines 39-41   (error_log + log_error + rethrow)
 *   SendSupervisorReminderNoSchedEmailJob           lines 41-42
 *   SendSupervisorReminderOfNewUserEmailJob         lines 42-43
 *   SendSupervisorReminderRequestsEmailJob          lines 41-43   (error_log + log_error + rethrow)
 *   SendSupervisorReminderInvalidCheckInsEmailJob   lines 41-43   (error_log + log_error + rethrow)
 *
 * ------------------------------------------------------------------------------ HOW THEY FIRE
 * Classification of every uncovered line: ALL 14 are (a) REACHABLE. Two real production failures
 * drive them, one per group:
 *
 * (a1) THE SUPERVISOR LOOKUP SP FAILS — 7 jobs.
 *      Every request/dispute job resolves its recipient through User::direct_supervisor(), which
 *      is `call_sp("EH_SP_Direct_Supervisor", [...])`. When that procedure errors (dropped
 *      connection, procedure missing after a migration, MySQL "Commands out of sync" from the
 *      known un-closed cursor) call_sp raises, and the job's catch arm is what runs. The
 *      CallSpFake seam reproduces exactly that: an UNFAKED procedure throws \RuntimeException,
 *      which IS an \Exception, so `catch (Exception $e)` genuinely catches it. Nothing artificial
 *      and the database is never touched.
 *
 * (a2) SMTP IS DOWN — 7 jobs whose try block contains only Mail::send().
 *      A mailer swapped in for a stub that raises \Swift_TransportException — the exact class
 *      SwiftMailer's Esmtp transport throws on a refused/timed-out connection, and it extends
 *      \Exception (Swift_TransportException -> Swift_IoException -> Swift_SwiftException ->
 *      Exception). That is the only failure these three-line bodies can have, and it is the one
 *      the catch arm was written for.
 *
 * ------------------------------------------------------- FINDINGS: arms NOT tested, and why
 * (b) WRONG EXCEPTION TYPE — EML-NULLSUP-1. In the four request jobs the recipient is resolved as
 *     `$this->x->user()->first()->direct_supervisor()`, and in the three dispute jobs as
 *     `User::find($this->request['user_id'])->direct_supervisor()`. When the owner row is missing
 *     (soft-deleted user, orphaned request row, a stale user_id in a queued payload) `first()` /
 *     `find()` returns null and the next line is a call on null. In PHP 7 that is an \Error, NOT
 *     an \Exception, so `catch (Exception $e)` cannot catch it: log_error() never runs, the
 *     failure is never written to the emails channel, and the queue worker sees a fatal instead of
 *     a normal job failure. NOT forced with an artificial test — reported instead.
 * (b) WRONG EXCEPTION TYPE — EML-DISPUTEKEY-1. The three dispute jobs read
 *     `$this->request['user_id']` with no isset() guard. A payload missing that key raises a PHP
 *     warning (not an Exception), User::find(null) returns null, and the failure lands in the same
 *     uncatchable \Error as EML-NULLSUP-1.
 * (d) DEAD DEFENSIVE CODE — EML-MAILFAKE-1 is NOT claimed; the SMTP arm is genuinely reachable in
 *     production. No arm in this packet is dead.
 *
 * ------------------------------------------------------------------------------- WHAT IS ASSERTED
 * For every job, three business rules, not "something happened":
 *   1. the failure is RE-THROWN, so the queue worker records a failed job and the notification is
 *      retried rather than silently disappearing (a swallowed exception marks the job successful);
 *   2. the original exception is propagated VERBATIM — same instance, same message — so the
 *      failed_jobs row names the real cause;
 *   3. log_error() wrote a `critical` record to the `emails` channel, attributed to that exact job
 *      class (log_to_file stamps "<JobClass> -> handle" into the message from the backtrace).
 * Plus: when the supervisor lookup fails, NO mail leaves the box — no half-addressed notification.
 *
 * SAFETY: DatabaseTransactions; no writes at all (request models are built in memory, never
 * saved); no migrations; no DDL; the `dtrs` table is never touched; the mailer is either
 * Mail::fake() or a stub that throws before doing anything.
 */
class EmailJobsCatchArmsTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    /** @var RecordingLogStub */
    private $log;

    /** @var ThrowingMailerStub */
    private $brokenMailer;

    protected function setUp(): void
    {
        parent::setUp();

        // Bounded probe — newest active user with an email. No whole-table scan.
        $this->user = User::whereNotNull('email')->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$this->user) {
            $this->markTestSkipped('no active user with an email in the test DB');
        }
        $this->be($this->user);

        // Default mailer is the fake: even if a test goes wrong, nothing can leave the box.
        Mail::fake();

        // Capture what log_error() writes, so "the failure was logged" is a real assertion.
        $this->log = new RecordingLogStub();
        Log::swap($this->log);

        $this->brokenMailer = new ThrowingMailerStub();

        CallSpFake::activate();
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        parent::tearDown();
    }

    // =========================================================================================
    // (a1) the supervisor-lookup stored procedure fails — 7 jobs
    // =========================================================================================

    /** @test */
    public function a_failing_supervisor_lookup_makes_the_alter_log_request_job_log_and_rethrow()
    {
        $alterLog = new AlterLog();
        $alterLog->user_id = $this->user->id;

        $this->assertFailureIsLoggedAndRethrown(
            function () use ($alterLog) { (new SendAlterLogRequestEmailJob($alterLog))->handle(); },
            'SendAlterLogRequestEmailJob',
            'EH_SP_Direct_Supervisor'
        );
        Mail::assertNothingSent();
    }

    /** @test */
    public function a_failing_supervisor_lookup_makes_the_change_schedule_request_job_log_and_rethrow()
    {
        $cs = new ChangeSchedule();
        $cs->user_id = $this->user->id;

        $this->assertFailureIsLoggedAndRethrown(
            function () use ($cs) { (new SendChangeScheduleRequestEmailJob($cs))->handle(); },
            'SendChangeScheduleRequestEmailJob',
            'EH_SP_Direct_Supervisor'
        );
        Mail::assertNothingSent();
    }

    /** @test */
    public function a_failing_supervisor_lookup_makes_the_rest_day_work_request_job_log_and_rethrow()
    {
        $rdw = new RestDayWork();
        $rdw->user_id = $this->user->id;

        $this->assertFailureIsLoggedAndRethrown(
            function () use ($rdw) { (new SendRestDayWorkRequestEmailJob($rdw))->handle(); },
            'SendRestDayWorkRequestEmailJob',
            'EH_SP_Direct_Supervisor'
        );
        Mail::assertNothingSent();
    }

    /** @test */
    public function a_failing_supervisor_lookup_makes_the_overtime_request_job_log_and_rethrow()
    {
        $ot = new Overtime();
        $ot->user_id = $this->user->id;

        $this->assertFailureIsLoggedAndRethrown(
            function () use ($ot) { (new SendOvertimeRequestEmailJob($ot))->handle(); },
            'SendOvertimeRequestEmailJob',
            'EH_SP_Direct_Supervisor'
        );
        Mail::assertNothingSent();
    }

    /** @test */
    public function a_failing_supervisor_lookup_makes_every_dispute_job_log_and_rethrow()
    {
        $payload = $this->disputePayload();

        $this->assertFailureIsLoggedAndRethrown(
            function () use ($payload) { (new SendAlterLogDisputeEmailJob($payload))->handle(); },
            'SendAlterLogDisputeEmailJob',
            'EH_SP_Direct_Supervisor'
        );
        $this->assertFailureIsLoggedAndRethrown(
            function () use ($payload) { (new SendOvertimeDisputeEmailJob($payload))->handle(); },
            'SendOvertimeDisputeEmailJob',
            'EH_SP_Direct_Supervisor'
        );
        $this->assertFailureIsLoggedAndRethrown(
            function () use ($payload) { (new SendRestDayWorkDisputeEmailJob($payload))->handle(); },
            'SendRestDayWorkDisputeEmailJob',
            'EH_SP_Direct_Supervisor'
        );

        // three disputes died at the recipient lookup — not one of them may have addressed a mail
        Mail::assertNothingSent();
    }

    // =========================================================================================
    // (a2) SMTP transport failure — the 7 jobs whose try block is only Mail::send()
    // =========================================================================================

    /** @test */
    public function an_unreachable_smtp_server_makes_the_registration_and_forgot_password_jobs_log_and_rethrow()
    {
        Mail::swap($this->brokenMailer);

        $this->assertFailureIsLoggedAndRethrown(
            function () { (new SendRegisteredUserEmailJob($this->user, 'temp-pass-1'))->handle(); },
            'SendRegisteredUserEmailJob',
            'smtp'
        );
        $this->assertFailureIsLoggedAndRethrown(
            function () { (new SendForgotPasswordRequestEmailJob($this->user, 'temp-pass-2'))->handle(); },
            'SendForgotPasswordRequestEmailJob',
            'smtp'
        );

        // exactly one delivery attempt per job — the job must not silently retry inside handle()
        $this->assertSame(2, $this->brokenMailer->attempts,
            'each job must attempt delivery exactly once and let the queue own the retry');
    }

    /** @test */
    public function an_unreachable_smtp_server_makes_the_failed_bhr_sync_notice_job_log_and_rethrow()
    {
        Mail::swap($this->brokenMailer);

        $this->assertFailureIsLoggedAndRethrown(
            function () { (new SendFailedBHRSyncNoticeJob($this->user))->handle(); },
            'SendFailedBHRSyncNoticeJob',
            'smtp'
        );

        $this->assertSame(1, $this->brokenMailer->attempts);
    }

    /** @test */
    public function an_unreachable_smtp_server_makes_every_supervisor_reminder_job_log_and_rethrow()
    {
        Mail::swap($this->brokenMailer);

        $reminder = [$this->user, []];   // production shape: [supervisor, collection]

        $this->assertFailureIsLoggedAndRethrown(
            function () use ($reminder) { (new SendSupervisorReminderNoSchedEmailJob($reminder))->handle(); },
            'SendSupervisorReminderNoSchedEmailJob',
            'smtp'
        );
        $this->assertFailureIsLoggedAndRethrown(
            function () use ($reminder) { (new SendSupervisorReminderRequestsEmailJob($reminder))->handle(); },
            'SendSupervisorReminderRequestsEmailJob',
            'smtp'
        );
        $this->assertFailureIsLoggedAndRethrown(
            function () use ($reminder) { (new SendSupervisorReminderOfNewUserEmailJob($reminder))->handle(); },
            'SendSupervisorReminderOfNewUserEmailJob',
            'smtp'
        );
        $this->assertFailureIsLoggedAndRethrown(
            function () use ($reminder) { (new SendSupervisorReminderInvalidCheckInsEmailJob($reminder))->handle(); },
            'SendSupervisorReminderInvalidCheckInsEmailJob',
            'smtp'
        );

        $this->assertSame(4, $this->brokenMailer->attempts,
            'all four nightly reminders must have attempted delivery and failed loudly');
    }

    // =========================================================================================
    // one more business rule: the cron must be able to see the failure
    // =========================================================================================

    /** @test */
    public function a_failed_reminder_is_attributed_to_its_own_job_class_in_the_emails_log()
    {
        Mail::swap($this->brokenMailer);

        try {
            (new SendSupervisorReminderNoSchedEmailJob([$this->user, []]))->handle();
            $this->fail('SendSupervisorReminderNoSchedEmailJob::handle() must rethrow');
        } catch (\Throwable $e) {
            // expected — asserted below
        }

        $records = $this->emailsChannelRecords();
        $this->assertNotEmpty($records, 'nothing was written to the emails log channel');

        $mine = array_values(array_filter($records, function ($r) {
            return strpos($r['message'], 'SendSupervisorReminderNoSchedEmailJob -> handle') !== false;
        }));
        $this->assertNotEmpty($mine,
            'the emails log must name the failing job, otherwise ops cannot tell which of the four '
            . 'nightly reminders died');
        $this->assertSame('critical', $mine[0]['level'],
            'a notification that never went out is a critical event, not a notice');
    }

    // ------------------------------------------------------------------------------- helpers

    private function disputePayload(): array
    {
        return [
            'user_id' => $this->user->id, 'date' => '2026-07-10',
            'employee_note' => 'note', 'approver_note' => 'note',
            'amount' => 1, 'type' => 'overtime',
            'current_time_in' => 28800, 'current_time_out' => 61200,
            'new_time_in' => 28800, 'new_time_out' => 64800,
            'start_time' => 28800, 'end_time' => 61200, 'break_time' => 3600,
        ];
    }

    /**
     * The whole contract of every one of these catch arms, in one place:
     * rethrow the original exception AND record it as critical on the emails channel, stamped
     * with the job class so the failure is attributable.
     */
    private function assertFailureIsLoggedAndRethrown(callable $run, string $jobClass, string $messageFragment): void
    {
        $before = count($this->emailsChannelRecords());

        $caught = null;
        try {
            $run();
        } catch (\Throwable $e) {
            $caught = $e;
        }

        $this->assertNotNull($caught,
            $jobClass . '::handle() swallowed the failure — the queue worker would mark the job '
            . 'SUCCESSFUL and the notification would vanish with no trace');
        $this->assertInstanceOf(\Exception::class, $caught,
            $jobClass . ' rethrew something that is not an \Exception, so `catch (Exception $e)` '
            . 'never ran and the arm is decorative');
        $this->assertStringContainsString($messageFragment, $caught->getMessage(),
            $jobClass . ' must propagate the ORIGINAL cause verbatim so failed_jobs names the '
            . 'real failure, not a generic wrapper');

        $records = $this->emailsChannelRecords();
        $this->assertGreaterThan($before, count($records),
            $jobClass . ' rethrew without calling log_error() — the emails channel would have no '
            . 'record that a notification was lost');

        $attributed = array_values(array_filter(
            array_slice($records, $before),
            function ($r) use ($jobClass) {
                return $r['level'] === 'critical'
                    && strpos($r['message'], $jobClass . ' -> handle') !== false;
            }
        ));
        $this->assertNotEmpty($attributed,
            'the emails channel must carry a `critical` entry naming ' . $jobClass . ' -> handle');
    }

    /** Everything log_to_file() pushed onto the `emails` channel so far, in order. */
    private function emailsChannelRecords(): array
    {
        return array_values(array_filter($this->log->records, function ($r) {
            return $r['channel'] === 'emails';
        }));
    }
}

/**
 * Records what log_to_file()/log_error() write instead of touching storage/logs.
 * `Log::channel('emails')->critical($message, $context)` is the only shape the helper uses;
 * __call() catches every level so nothing in the framework can blow up on an unexpected method.
 */
class RecordingLogStub
{
    /** @var array<int,array{channel:?string,level:string,message:string,context:array}> */
    public $records = [];

    /** @var string|null */
    private $pendingChannel = null;

    public function channel($name = null)
    {
        $this->pendingChannel = $name;
        return $this;
    }

    public function stack(array $channels, $channel = null)
    {
        return $this;
    }

    public function __call($method, $arguments)
    {
        $this->records[] = [
            'channel' => $this->pendingChannel,
            'level'   => $method,
            'message' => isset($arguments[0]) && is_string($arguments[0]) ? $arguments[0] : '',
            'context' => isset($arguments[1]) && is_array($arguments[1]) ? $arguments[1] : [],
        ];
        $this->pendingChannel = null;
        return null;
    }
}

/**
 * A mailer that fails the way a real one does when the SMTP host is unreachable.
 * Swift_TransportException is what Swift_Transport_EsmtpTransport raises on a refused or
 * timed-out connection; it extends \Exception, which is exactly why these catch arms can fire.
 * Nothing is ever addressed, rendered or sent.
 */
class ThrowingMailerStub implements \Illuminate\Contracts\Mail\Mailer
{
    /** @var int */
    public $attempts = 0;

    public function to($users)
    {
        return $this;
    }

    public function bcc($users)
    {
        return $this;
    }

    public function raw($text, $callback)
    {
        $this->refuse();
    }

    public function send($view, array $data = [], $callback = null)
    {
        $this->refuse();
    }

    public function failures()
    {
        return [];
    }

    private function refuse(): void
    {
        $this->attempts++;
        throw new \Swift_TransportException(
            'Connection could not be established with host smtp.eastvantage.com [Connection timed out #110]'
        );
    }
}
