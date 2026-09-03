<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use App\Modules\Email\Mail\AlterLogDisputeEmail;
use App\Modules\Email\Mail\AlterLogRequestEmail;
use App\Modules\Email\Mail\ChangeScheduleRequestEmail;
use App\Modules\Email\Mail\FailedBHRSyncNoticeEmail;
use App\Modules\Email\Mail\ForgotPasswordRequestEmail;
use App\Modules\Email\Mail\OvertimeDisputeEmail;
use App\Modules\Email\Mail\OvertimeRequestEmail;
use App\Modules\Email\Mail\RegisteredUserEmail;
use App\Modules\Email\Mail\RestDayWorkDisputeEmail;
use App\Modules\Email\Mail\RestDayWorkRequestEmail;
use App\Modules\Email\Mail\SupervisorReminderInvalidCheckInsEmail;
use App\Modules\Email\Mail\SupervisorReminderNoSchedEmail;
use App\Modules\Email\Mail\SupervisorReminderOfNewUserEmail;
use App\Modules\Email\Mail\SupervisorReminderRequestsEmail;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\User\Models\User;

/**
 * =====================================================================================================
 *  SOURCE UNDER TEST — the PRODUCTION arm of all 14 Mailables
 *      app/Modules/Email/Mail/AlterLogRequestEmail.php                  :: __construct + build
 *      app/Modules/Email/Mail/AlterLogDisputeEmail.php                  :: __construct + build
 *      app/Modules/Email/Mail/OvertimeRequestEmail.php                  :: __construct + build
 *      app/Modules/Email/Mail/OvertimeDisputeEmail.php                  :: __construct + build
 *      app/Modules/Email/Mail/RestDayWorkRequestEmail.php               :: __construct + build
 *      app/Modules/Email/Mail/RestDayWorkDisputeEmail.php               :: __construct + build
 *      app/Modules/Email/Mail/ChangeScheduleRequestEmail.php            :: __construct + build
 *      app/Modules/Email/Mail/RegisteredUserEmail.php                   :: build
 *      app/Modules/Email/Mail/ForgotPasswordRequestEmail.php            :: __construct + build
 *      app/Modules/Email/Mail/FailedBHRSyncNoticeEmail.php              :: __construct + build
 *      app/Modules/Email/Mail/SupervisorReminderInvalidCheckInsEmail.php:: __construct + build
 *      app/Modules/Email/Mail/SupervisorReminderNoSchedEmail.php        :: __construct + build
 *      app/Modules/Email/Mail/SupervisorReminderOfNewUserEmail.php      :: __construct + build
 *      app/Modules/Email/Mail/SupervisorReminderRequestsEmail.php       :: __construct + build
 *
 *  MENU PATH
 *      Requests -> Overtime / Alter Log / Rest Day Work / Change Schedule  (filing and approving)
 *      Payroll  -> Dispute                                                 (the three dispute mails)
 *      Admin    -> Users                                                   (welcome + forgot password)
 *      Cron     -> nightly supervisor reminders and the BHR sync notice
 *
 *  COVERAGE AT THE TIME OF WRITING — every one of these classes sat at 83-92% with the SAME two lines
 *  missing, and SupervisorReminderInvalidCheckInsEmail::build + ForgotPasswordRequestEmail::build sat
 *  at 0%. MailablesBuildTest drives the non-production arms; nothing had ever driven:
 *      __construct  `$this->to( $recepient->email )`          — the real employee inbox
 *      build        `$this->bcc( get_constant('BCC_EMAIL_ADDRESS') )` — the production BCC archive
 *
 *  WHY IT MATTERS. These two lines are the whole difference between "staging mails the dev inbox" and
 *  "production mails a real person and archives a copy". They are the only lines in the mail layer
 *  that behave differently on the live server than on every machine a developer or a test runs on,
 *  which is exactly why they were the last uncovered ones — and exactly why they are worth pinning.
 *
 *  FINDINGS RAISED HERE
 *      EML-BHR-SAMEARM-1  FailedBHRSyncNoticeEmail's `if (App::environment('production'))` block and
 *                         its else block are IDENTICAL — both address EASTVANTAGE_DEV_EMAIL. The
 *                         branch is decoration; the BHR failure notice goes to the dev inbox on the
 *                         live server too, and it can never be routed to whoever owns the sync.
 * =====================================================================================================
 *
 *  SAFETY. Mail::fake() is installed for the whole suite and nothing is ever sent: the tests only
 *  ASSEMBLE messages. The environment flip is per-construction, wrapped in try/finally, and the
 *  restoration is asserted. Request models are built in memory (never saved) with a real user id so
 *  the constructors' relation lookups resolve; the only probes are bounded and indexed.
 */
class MailableProductionArmsTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->assertFalse(app()->environment('production'),
            'this suite must never RUN in production — it only simulates the production branch');

        $this->user = User::whereNotNull('email')->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$this->user) $this->markTestSkipped('no active user with an email in test DB');
    }

    /** Run one closure with the container reporting the production environment, then restore it. */
    private function inProduction(callable $work)
    {
        $original = $this->app['env'];
        try {
            $this->app['env'] = 'production';
            return $work();
        } finally {
            $this->app['env'] = $original;
        }
    }

    /** The view name a Mailable was built with ($markdown is protected on Mailable). */
    private function markdownOf($mailable)
    {
        $property = new \ReflectionProperty(get_class($mailable), 'markdown');
        $property->setAccessible(true);

        return $property->getValue($mailable);
    }

    /**
     * The whole production contract for one Mailable, asserted in one place:
     *  - constructed in production it addresses the REAL recipient, never the dev inbox;
     *  - built in production it BCCs the production archive, never the non-prod one;
     *  - the subject and the markdown view are the ones the recipient is meant to receive;
     *  - the environment is left exactly as it was found.
     */
    private function assertProductionContract(callable $make, string $recipientEmail,
                                              string $subject, string $view)
    {
        $before = $this->app['env'];

        $mailable = $this->inProduction($make);
        // the To line is pinned exactly: one recipient, the one the production arm chose
        $this->assertSame([$recipientEmail], array_column($mailable->to, 'address'));

        $built = $this->inProduction(function () use ($mailable) { return $mailable->build(); });

        $this->assertSame(get_constant('BCC_EMAIL_ADDRESS'), array_column($built->bcc, 'address'));
        $this->assertNotContains(get_constant('BCC_EMAIL_ADDRESS_FOR_NON_PROD')[0],
            array_column($built->bcc, 'address'));
        $this->assertSame($subject, $built->subject);
        $this->assertSame($view, $this->markdownOf($built));

        $this->assertSame($before, $this->app['env'], 'the environment flip was not undone');

        return $built;
    }

    /** An unsaved request row owned by the probed user — enough for every constructor's lookups. */
    private function requestModel($class, array $attributes)
    {
        $model = new $class();
        $model->setRawAttributes(array_merge([
            'id'      => 424242,
            'user_id' => $this->user->id,
        ], $attributes));

        return $model;
    }

    /** The payload shape the payroll dispute screen posts. */
    private function disputePayload(string $type)
    {
        return [
            'user_id'          => $this->user->id,
            'type'             => $type,
            'date'             => '2026-08-03',
            'amount'           => 1,
            'employee_note'    => 'system clock was wrong',
            'approver_note'    => null,
            'status'           => 'pending',
            'current_time_in'  => 1785747600,
            'current_time_out' => 1785780000,
            'new_time_in'      => 1785744000,
            'new_time_out'     => 1785780000,
            'start_time'       => 1785747600,
            'end_time'         => 1785780000,
            'break_time'       => 3600,
        ];
    }

    // =================================================================================================
    //  Request notifications — Requests -> (type) -> file a request
    // =================================================================================================

    /**
     * @test
     * BUSINESS RULE — on the live server an alter-log request notification goes to the approver's own
     * mailbox and a copy is archived to the production BCC address, under the subject that names the
     * request type.
     */
    public function an_alter_log_request_notification_reaches_the_approver_and_the_production_archive()
    {
        $alterLog = $this->requestModel(AlterLog::class, [
            'date'          => '2026-08-03',
            'status'        => 'pending',
            'employee_note' => 'forgot to tap out',
        ]);

        $built = $this->assertProductionContract(
            function () use ($alterLog) { return new AlterLogRequestEmail($this->user, $alterLog); },
            $this->user->email,
            'Request for Alter Log',
            'emails.alter-log-request'
        );

        $this->assertStringContainsString('request/approval/', $built->approval_link);
        $this->assertSame($this->user->id, $built->user->id);
    }

    /**
     * @test
     * BUSINESS RULE — an overtime notification names the overtime TYPE in its subject, so an approver
     * scanning a full inbox can tell rest-day overtime from regular overtime without opening it.
     */
    public function an_overtime_request_notification_names_its_type_in_the_subject()
    {
        $overtime = $this->requestModel(Overtime::class, [
            'type'   => 'overtime',
            'date'   => '2026-08-03',
            'status' => 'pending',
        ]);

        $this->assertProductionContract(
            function () use ($overtime) { return new OvertimeRequestEmail($this->user, $overtime); },
            $this->user->email,
            'Request for Overtime',
            'emails.overtime-request'
        );
    }

    /**
     * @test
     * BUSINESS RULE — the rest-day-work notification carries its own subject and template, and on the
     * live server addresses the approver directly.
     */
    public function a_rest_day_work_request_notification_reaches_the_approver_in_production()
    {
        $restDayWork = $this->requestModel(RestDayWork::class, [
            'date'   => '2026-08-08',
            'status' => 'pending',
        ]);

        $this->assertProductionContract(
            function () use ($restDayWork) { return new RestDayWorkRequestEmail($this->user, $restDayWork); },
            $this->user->email,
            'Request for Rest Day Work',
            'emails.rest-day-work-request'
        );
    }

    /**
     * @test
     * BUSINESS RULE — the change-schedule notification is the one that renders the proposed week, so
     * it is built from a real schedule; in production it still goes to the approver with the
     * production archive BCC'd.
     */
    public function a_change_schedule_request_notification_reaches_the_approver_in_production()
    {
        $changeSchedule = ChangeSchedule::whereHas('user')->whereNotNull('schedule_id')
            ->orderBy('id', 'desc')->limit(50)->get()
            ->first(function ($row) { return $row->schedule()->first() !== null; });
        if (!$changeSchedule) $this->markTestSkipped('no change schedule row with a bound schedule');

        $this->assertProductionContract(
            function () use ($changeSchedule) {
                return new ChangeScheduleRequestEmail($this->user, $changeSchedule);
            },
            $this->user->email,
            'Request for Change Schedule',
            'emails.change-schedule-request'
        );
    }

    // =================================================================================================
    //  Payroll disputes — Payroll -> Dispute
    // =================================================================================================

    /**
     * @test
     * BUSINESS RULE — all three payroll dispute notifications go to the supervisor's real mailbox in
     * production, are archived to the production BCC address, and link to the dispute view. The
     * subject names which kind of dispute it is.
     */
    public function the_three_payroll_dispute_notifications_reach_the_supervisor_in_production()
    {
        $alterLog = $this->assertProductionContract(
            function () { return new AlterLogDisputeEmail($this->user, $this->disputePayload('alter_log')); },
            $this->user->email,
            'Payroll Dispute for Alter Log',
            'emails.alter-log-dispute'
        );
        $this->assertStringContainsString('app/payrolldisputeview/', $alterLog->approval_link);

        $this->assertProductionContract(
            function () { return new OvertimeDisputeEmail($this->user, $this->disputePayload('overtime')); },
            $this->user->email,
            'Payroll Dispute for Overtime',
            'emails.overtime-dispute'
        );

        $this->assertProductionContract(
            function () { return new RestDayWorkDisputeEmail($this->user, $this->disputePayload('rest_day_work')); },
            $this->user->email,
            'Payroll Dispute for Rest Day Work',
            'emails.rest-day-work-dispute'
        );
    }

    // =================================================================================================
    //  Account mail — Admin -> Users, and the login screen's forgot-password flow
    // =================================================================================================

    /**
     * @test
     * BUSINESS RULE — the welcome mail carries the temporary password, so in production it must reach
     * the new employee and nobody else on the To line; the production archive gets the BCC.
     */
    public function the_welcome_mail_bccs_the_production_archive_when_it_is_sent_for_real()
    {
        $newHire = new User();
        $newHire->email      = 'new.hire@example.com';
        $newHire->first_name = 'New';
        $newHire->last_name  = 'Hire';

        $built = $this->assertProductionContract(
            function () use ($newHire) { return new RegisteredUserEmail($newHire, 'TempPass123!'); },
            'new.hire@example.com',
            'Welcome to Eastvantage!',
            'emails.registered-user'
        );

        $this->assertSame('TempPass123!', $built->temporary_password);
        $this->assertSame(env('FRONT_END_URL'), $built->site_link);
    }

    /**
     * @test
     * BUSINESS RULE — a password reset must reach the account owner in production. Sending it to the
     * shared dev inbox instead would hand one person's temporary password to the dev team, which is
     * exactly what the non-production arm does on staging by design.
     */
    public function the_forgot_password_mail_reaches_the_account_owner_in_production()
    {
        $owner = new User();
        $owner->email      = 'locked.out@example.com';
        $owner->first_name = 'Locked';
        $owner->last_name  = 'Out';

        $built = $this->assertProductionContract(
            function () use ($owner) { return new ForgotPasswordRequestEmail($owner, 'ResetPass456!'); },
            'locked.out@example.com',
            'Forgot Password',
            'emails.forgot-password-request'
        );

        $this->assertSame('ResetPass456!', $built->temporary_password);
        $this->assertSame($owner->email, $built->user->email);
    }

    // =================================================================================================
    //  Nightly supervisor reminders — Cron
    // =================================================================================================

    /**
     * @test
     * BUSINESS RULE — each nightly reminder is addressed to the SUPERVISOR who has to act on it, and
     * carries that supervisor's own list (invalid check-ins / no schedule / new joiners / pending
     * requests). In production each one reaches that supervisor and is archived.
     */
    public function each_nightly_supervisor_reminder_reaches_its_own_supervisor_in_production()
    {
        $supervisor = new User();
        $supervisor->email      = 'team.lead@example.com';
        $supervisor->first_name = 'Team';
        $supervisor->last_name  = 'Lead';

        $employees = [
            (object) ['first_name' => 'Ana', 'last_name' => 'Cruz', 'emp_num' => '10101'],
            (object) ['first_name' => 'Ben', 'last_name' => 'Reyes', 'emp_num' => '10102'],
        ];

        $invalid = $this->assertProductionContract(
            function () use ($supervisor, $employees) {
                return new SupervisorReminderInvalidCheckInsEmail([$supervisor, $employees]);
            },
            'team.lead@example.com',
            'Reminder for Employees with Invalid Check-ins',
            'emails.reminders.invalid-check-ins-reminder'
        );
        $this->assertSame($employees, $invalid->invalid_check_ins);
        $this->assertSame($supervisor->email, $invalid->recepient->email);

        $noSchedule = $this->assertProductionContract(
            function () use ($supervisor, $employees) {
                return new SupervisorReminderNoSchedEmail([$supervisor, $employees]);
            },
            'team.lead@example.com',
            'Reminder for Employees without Schedules',
            'emails.reminders.no-schedule-reminder'
        );
        $this->assertSame($employees, $noSchedule->list_employees);

        $newUsers = $this->assertProductionContract(
            function () use ($supervisor, $employees) {
                return new SupervisorReminderOfNewUserEmail([$supervisor, $employees]);
            },
            'team.lead@example.com',
            'Notfication: New Employees',
            'emails.reminders.new-users-to-supervisor-reminder'
        );
        $this->assertSame($employees, $newUsers->list_employees);

        $pending = $this->assertProductionContract(
            function () use ($supervisor, $employees) {
                return new SupervisorReminderRequestsEmail([$supervisor, $employees]);
            },
            'team.lead@example.com',
            'Reminder for Employees with Pending Requests',
            'emails.reminders.requests-reminder'
        );
        $this->assertSame($employees, $pending->pending_requests);
    }

    /**
     * @test
     * FINDING EML-BHR-SAMEARM-1 (characterisation).
     *
     * The BHR "incomplete user data" notice branches on the environment and then does the SAME thing
     * in both arms: `$this->to( get_constant('EASTVANTAGE_DEV_EMAIL') )`. On the live server the
     * notice therefore lands in the dev inbox exactly as it does on staging, and there is no way to
     * route it to whoever owns the BambooHR sync. Only the BCC actually differs between environments.
     * Assert today's behaviour; flip the To assertion when the production arm is given a real owner.
     */
    public function the_bhr_sync_failure_notice_goes_to_the_dev_inbox_even_in_production_FINDING_EML_BHR_SAMEARM_1()
    {
        $incomplete = (object) ['emp_num' => '10199', 'first_name' => 'Missing', 'last_name' => 'Fields'];

        $built = $this->assertProductionContract(
            function () use ($incomplete) { return new FailedBHRSyncNoticeEmail($incomplete); },
            get_constant('EASTVANTAGE_DEV_EMAIL'),          // the production arm, not a real owner
            'BHR: Incomplete user data',
            'emails.reminders.failed-bhr-user-sync'
        );

        $this->assertSame($incomplete, $built->user);

        // and outside production the SAME address is used — the branch changes nothing on the To line
        $staging = new FailedBHRSyncNoticeEmail($incomplete);
        $this->assertSame(
            array_column($built->to, 'address'),
            array_column($staging->to, 'address')
        );
        // the BCC is the one thing the environment really changes
        $stagingBuilt = $staging->build();
        $this->assertSame(get_constant('BCC_EMAIL_ADDRESS_FOR_NON_PROD'),
            array_column($stagingBuilt->bcc, 'address'));
    }
}
