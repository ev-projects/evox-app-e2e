<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Email/Repositories/EmailRepository.php — the catch(Exception) arm of every live
 *   sender: sendRegisteredUserEmail, sendForgotPasswordRequestEmail, sendOvertimeRequestEmail,
 *   sendOvertimeDisputeEmail, sendRestDayWorkRequestEmail, sendRestDayWorkDisputeEmail,
 *   sendAlterLogRequestEmail, sendAlterLogDisputeEmail, sendChangeScheduleRequestEmail,
 *   sendSupervisorReminderNoSchedEmail, sendSupervisorReminderRequestsEmail,
 *   sendFailedBHRUserSyncNotice (all queued) and sendSupervisorReminderInvalidCheckInsEmail
 *   (the one sender that runs its job synchronously).
 *
 * MENU PATH   No page of its own — this is the notification layer behind Requests -> Overtime /
 *             Rest Day Work / Alter Log / Change Schedule, Profile -> Register & Forgot Password,
 *             and Admin -> Cron (the supervisor reminder + failed-BHR-sync jobs).
 *
 * COMPLEMENTS BranchTests/Unit/Repositories/EmailRepositoryQueueFakeTest.php, which already asserts
 * the success arm of every one of these methods (the right job is queued, the dead husks return
 * null). Only the failure arm was left uncovered — roughly 42% of the file — and it is the arm that
 * decides whether a caller's transaction gets rolled back or silently committed with no email sent.
 *
 * HOW THE FAILURE IS INJECTED: the container's queue factory is replaced with one that hands back
 * something that is not a Queue, so Illuminate\Bus\Dispatcher::dispatchToQueue() throws. That is the
 * production shape of "the queue backend is unusable" (misconfigured connection, Redis/DB down).
 * Nothing can reach a real queue or a real mail server: the stub is bound for the whole class and
 * Mail is faked. The one dispatchNow() sender is failed at the mail layer instead, since it never
 * touches the queue.
 *
 * The contract being pinned: NONE of these senders may swallow the failure. Each returns true (or
 * void) on success, so a swallowed exception would tell the caller the notification is on its way
 * when it never will be — and would let the surrounding request/approval transaction commit.
 *
 * SAFETY: DatabaseTransactions; no row is written or read by these paths — the model arguments are
 * in-memory instances, because Dispatcher throws before the job is ever serialized. No SP, no DDL,
 * no external I/O.
 *
 * DEAD CODE, deliberately not tested here (empty try bodies, already documented by
 * EmailRepositoryQueueFakeTest): sendOvertimeRequestChangeStatusEmail,
 * sendRestDayWorkRequestChangeStatusEmail, sendAlterLogRequestChangeStatusEmail,
 * sendChangeScheduleRequestChangeStatusEmail, sendSupervisorReminderofNewUser.
 *
 * FINDINGS: none. The catch arms are reachable and behave correctly (log + re-throw); the earlier
 * suspicion that a missing `use Exception` made them dead does not apply — EmailRepository.php:6
 * imports Exception, and the arms fire as written.
 */

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Exception;
use RuntimeException;
use Mockery;
use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\Email\Repositories\EmailRepository;
use App\Modules\Email\Mail\SupervisorReminderInvalidCheckInsEmail;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\User\Models\User;

class EmailRepositoryFailureArmsTest extends TestCase
{
    use DatabaseTransactions;

    /** @var EmailRepository */
    private $repo;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();

        // Every queued dispatch from here on hits a factory that cannot produce a Queue.
        $this->app->instance('queue', new UnavailableQueueFactory());
        Queue::clearResolvedInstances();

        $this->repo = new EmailRepository();

        // In-memory only: Dispatcher throws before the job is serialized, so no row is needed and
        // the suite cannot be knocked out by an empty request table in the dump.
        $this->user = new User();
        $this->user->id = 999999999;
        $this->user->first_name = 'Queue';
        $this->user->last_name = 'Outage';
        $this->be($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** @test */
    public function no_email_helper_reports_success_when_the_queue_backend_is_unusable()
    {
        $senders = [
            'registered user'            => function () {
                return $this->repo->sendRegisteredUserEmail($this->user, 'temp-pass');
            },
            'forgot password'            => function () {
                return $this->repo->sendForgotPasswordRequestEmail($this->user, 'temp-pass');
            },
            'overtime request'           => function () {
                return $this->repo->sendOvertimeRequestEmail(new Overtime());
            },
            'overtime dispute'           => function () {
                return $this->repo->sendOvertimeDisputeEmail(['overtime' => []]);
            },
            'rest day work request'      => function () {
                return $this->repo->sendRestDayWorkRequestEmail(new RestDayWork());
            },
            'rest day work dispute'      => function () {
                return $this->repo->sendRestDayWorkDisputeEmail(['rest_day_work' => []]);
            },
            'alter log request'          => function () {
                return $this->repo->sendAlterLogRequestEmail(new AlterLog());
            },
            'alter log dispute'          => function () {
                return $this->repo->sendAlterLogDisputeEmail(['alter_log' => []]);
            },
            'change schedule request'    => function () {
                return $this->repo->sendChangeScheduleRequestEmail(new ChangeSchedule());
            },
            'supervisor no-schedule'     => function () {
                return $this->repo->sendSupervisorReminderNoSchedEmail([$this->user, []]);
            },
            'supervisor open requests'   => function () {
                return $this->repo->sendSupervisorReminderRequestsEmail([$this->user, []]);
            },
            'failed BHR sync notice'     => function () {
                return $this->repo->sendFailedBHRUserSyncNotice($this->user);
            },
        ];

        foreach ($senders as $label => $sender) {
            $caught = null;
            try {
                $sender();
            } catch (Exception $e) {
                $caught = $e;
            }

            $this->assertNotNull($caught,
                "the '$label' email reported success even though the queue could not accept the job");
            $this->assertInstanceOf(RuntimeException::class, $caught,
                "the '$label' email must surface the queue failure unchanged");
        }
    }

    /** @test */
    public function the_invalid_check_in_reminder_surfaces_a_mail_server_failure_to_its_cron_job()
    {
        // This is the only sender that runs its job in-process (dispatchNow), so the failure that
        // matters is the mail transport refusing the message, not the queue.
        Mail::shouldReceive('send')
            ->once()
            ->with(Mockery::type(SupervisorReminderInvalidCheckInsEmail::class))
            ->andThrow(new Exception('SMTP unreachable'));

        $caught = null;
        try {
            $this->repo->sendSupervisorReminderInvalidCheckInsEmail([$this->user, []]);
        } catch (Exception $e) {
            $caught = $e;
        }

        $this->assertNotNull($caught, 'a bounced reminder must fail the cron run, not pass silently');
        $this->assertSame('SMTP unreachable', $caught->getMessage());
    }
}

/**
 * Stands in for the queue factory when the backend is unusable. connection() answers something that
 * is not an Illuminate Queue, which is exactly what Illuminate\Bus\Dispatcher::dispatchToQueue()
 * rejects with a RuntimeException — the same failure a misconfigured queue connection produces.
 */
class UnavailableQueueFactory implements \Illuminate\Contracts\Queue\Factory
{
    public function connection($name = null)
    {
        return new \stdClass();
    }
}
