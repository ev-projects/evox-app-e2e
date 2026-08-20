<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use App\Modules\User\Models\User;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;
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

/**
 * Covers __construct() + build() on all 13 previously-uncovered Mail classes
 * (plus RegisteredUserEmail which had one covered method remaining).
 *
 * $markdown is protected in Laravel 5.7's Mailable — not assertable from outside.
 * assertSame($mail, $built) is sufficient: proves __construct completed and build()
 * ran + returned $this. $subject is public and is also asserted.
 *
 * No emails are actually sent — Mail::fake() intercepts delivery.
 */
class evoxtest_MailableTest extends TestCase
{
    use DatabaseTransactions;

    /** Gary Aure — supervisor PH (users.id = 1698) */
    private User $supervisor;

    /** Glenn Macasarte — employee PH (users.id = 1593) */
    private User $employee;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();

        $this->supervisor = User::findOrFail(1698);
        $this->employee   = User::findOrFail(1593);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Request emails — need (User $recepient, Model $request)
    // ────────────────────────────────────────────────────────────────────────

    public function test_overtime_request_email_constructs_and_builds()
    {
        $overtime = Overtime::whereHas('user', fn ($q) => $q->whereNotNull('SubDepartmentID'))
            ->latest('id')->first();

        if (!$overtime) {
            $this->markTestSkipped('No overtime row with a user that has SubDepartmentID.');
        }

        $mail  = new OvertimeRequestEmail($this->supervisor, $overtime);
        $built = $mail->build();

        $this->assertSame($mail, $built);
        $this->assertStringContainsStringIgnoringCase('request', $built->subject);
    }

    public function test_alter_log_request_email_constructs_and_builds()
    {
        $alterLog = AlterLog::whereHas('user', fn ($q) => $q->whereNotNull('SubDepartmentID'))
            ->latest('id')->first();

        if (!$alterLog) {
            $this->markTestSkipped('No alter_log row with a user that has SubDepartmentID.');
        }

        $mail  = new AlterLogRequestEmail($this->supervisor, $alterLog);
        $built = $mail->build();

        $this->assertSame($mail, $built);
        $this->assertStringContainsStringIgnoringCase('request', $built->subject);
    }

    public function test_change_schedule_request_email_constructs_and_builds()
    {
        // Must have: valid user (SubDepartmentID), a schedule, and schedule_details rows
        $changeSchedule = ChangeSchedule::whereHas('user', fn ($q) => $q->whereNotNull('SubDepartmentID'))
            ->whereHas('schedule.schedule_details')
            ->latest('id')->first();

        if (!$changeSchedule) {
            $this->markTestSkipped('No change_schedule with valid user + schedule + details found.');
        }

        $mail  = new ChangeScheduleRequestEmail($this->supervisor, $changeSchedule);
        $built = $mail->build();

        $this->assertSame($mail, $built);
        $this->assertStringContainsStringIgnoringCase('request', $built->subject);
    }

    public function test_rest_day_work_request_email_constructs_and_builds()
    {
        $rdw = RestDayWork::whereHas('user', fn ($q) => $q->whereNotNull('SubDepartmentID'))
            ->latest('id')->first();

        if (!$rdw) {
            $this->markTestSkipped('No rest_day_work row with a user that has SubDepartmentID.');
        }

        $mail  = new RestDayWorkRequestEmail($this->supervisor, $rdw);
        $built = $mail->build();

        $this->assertSame($mail, $built);
        $this->assertStringContainsStringIgnoringCase('request', $built->subject);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Dispute emails — need (User $recepient, array $request)
    // ────────────────────────────────────────────────────────────────────────

    public function test_alter_log_dispute_email_constructs_and_builds()
    {
        $mail  = new AlterLogDisputeEmail($this->supervisor, [
            'user_id' => $this->employee->id,
        ]);
        $built = $mail->build();

        $this->assertSame($mail, $built);
        $this->assertStringContainsStringIgnoringCase('dispute', $built->subject);
    }

    public function test_overtime_dispute_email_constructs_and_builds()
    {
        $mail  = new OvertimeDisputeEmail($this->supervisor, [
            'user_id' => $this->employee->id,
            'type'    => 'overtime',
        ]);
        $built = $mail->build();

        $this->assertSame($mail, $built);
        $this->assertStringContainsStringIgnoringCase('dispute', $built->subject);
    }

    public function test_rest_day_work_dispute_email_constructs_and_builds()
    {
        $mail  = new RestDayWorkDisputeEmail($this->supervisor, [
            'user_id' => $this->employee->id,
        ]);
        $built = $mail->build();

        $this->assertSame($mail, $built);
        $this->assertStringContainsStringIgnoringCase('dispute', $built->subject);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Supervisor reminder emails — need ($reminder = [User, collection])
    // ────────────────────────────────────────────────────────────────────────

    public function test_supervisor_reminder_requests_email_constructs_and_builds()
    {
        $mail  = new SupervisorReminderRequestsEmail([
            $this->supervisor,
            collect([['type' => 'overtime', 'status' => 'pending', 'id' => 1]]),
        ]);
        $built = $mail->build();

        $this->assertSame($mail, $built);
        $this->assertStringContainsStringIgnoringCase('pending', $built->subject);
    }

    public function test_supervisor_reminder_invalid_check_ins_email_constructs_and_builds()
    {
        $mail  = new SupervisorReminderInvalidCheckInsEmail([
            $this->supervisor,
            collect([['employee' => $this->employee->name, 'date' => '2026-08-01']]),
        ]);
        $built = $mail->build();

        $this->assertSame($mail, $built);
        $this->assertStringContainsStringIgnoringCase('invalid', $built->subject);
    }

    public function test_supervisor_reminder_no_sched_email_constructs_and_builds()
    {
        $mail  = new SupervisorReminderNoSchedEmail([
            $this->supervisor,
            collect([$this->employee]),
        ]);
        $built = $mail->build();

        $this->assertSame($mail, $built);
        $this->assertStringContainsStringIgnoringCase('schedule', $built->subject);
    }

    public function test_supervisor_reminder_of_new_user_email_constructs_and_builds()
    {
        $mail  = new SupervisorReminderOfNewUserEmail([
            $this->supervisor,
            collect([$this->employee]),
        ]);
        $built = $mail->build();

        $this->assertSame($mail, $built);
        $this->assertStringContainsStringIgnoringCase('new', $built->subject);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Simple emails
    // ────────────────────────────────────────────────────────────────────────

    public function test_failed_bhr_sync_notice_email_constructs_and_builds()
    {
        $mail  = new FailedBHRSyncNoticeEmail((object) ['bhr_num' => '42734', 'name' => 'Test User']);
        $built = $mail->build();

        $this->assertSame($mail, $built);
        $this->assertStringContainsStringIgnoringCase('bhr', $built->subject);
    }

    public function test_forgot_password_request_email_constructs_and_builds()
    {
        $mail  = new ForgotPasswordRequestEmail($this->employee, 'TempP@ss123!');
        $built = $mail->build();

        $this->assertSame($mail, $built);
        $this->assertStringContainsStringIgnoringCase('forgot', $built->subject);
    }

    public function test_registered_user_email_constructs_and_builds()
    {
        $mail  = new RegisteredUserEmail($this->employee, 'TempP@ss123!');
        $built = $mail->build();

        $this->assertSame($mail, $built);
        $this->assertStringContainsStringIgnoringCase('welcome', $built->subject);
    }
}
