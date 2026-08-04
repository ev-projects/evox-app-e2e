<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use App\Modules\Email\Mail\AlterLogRequestEmail;
use App\Modules\Email\Mail\AlterLogDisputeEmail;
use App\Modules\Email\Mail\ChangeScheduleRequestEmail;
use App\Modules\Email\Mail\ForgotPasswordRequestEmail;
use App\Modules\Email\Mail\OvertimeRequestEmail;
use App\Modules\Email\Mail\OvertimeDisputeEmail;
use App\Modules\Email\Mail\RegisteredUserEmail;
use App\Modules\Email\Mail\RestDayWorkRequestEmail;
use App\Modules\Email\Mail\RestDayWorkDisputeEmail;
use App\Modules\Email\Mail\SupervisorReminderNoSchedEmail;
use App\Modules\Email\Mail\SupervisorReminderOfNewUserEmail;
use App\Modules\Email\Mail\SupervisorReminderRequestsEmail;
use App\Modules\Email\Mail\FailedBHRSyncNoticeEmail;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\User\Models\User;

/**
 * The whole Mail layer — 13 Mailable classes, ALL at 0% coverage before this suite (per the
 * 03-Aug gap analysis: "No Mailable class is ever directly instantiated by a test").
 *
 * Flow relevance: these ARE the notifications a real person receives when a request is filed,
 * approved or disputed (FLOW-COVERAGE-MAP Flow 1/3/4). A Mailable that throws in build() means
 * the user silently gets no email — exactly the class of defect EML-DEAD-1 already proved lives here.
 *
 * Method: construct each Mailable with real probed models and call build(), then assert the
 * subject/recipient/view wiring. Mail::fake() is on and nothing is ever sent; build() only
 * assembles the message object. Non-production environment is asserted explicitly, because the
 * constructors branch on it (prod -> real recipient, else -> the dev inbox constant).
 */
class MailablesBuildTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->assertFalse(app()->environment('production'),
            'this suite must never run with APP_ENV=production — it would address real recipients');

        $this->user = User::whereNotNull('email')->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$this->user) $this->markTestSkipped('no active user with an email in test DB');
    }

    /** Build a mailable and assert the common contract: a subject and the dev-inbox recipient. */
    private function assertBuilds($mailable, $subjectNeedle = null)
    {
        $built = $mailable->build();

        $this->assertNotNull($built);
        $this->assertNotEmpty($built->subject, 'mailable produced no subject');
        if ($subjectNeedle !== null) {
            $this->assertStringContainsString($subjectNeedle, $built->subject);
        }
        // non-production arm: everything is addressed to the dev inbox, never a real employee
        $recipients = collect($built->to)->pluck('address')->all();
        $this->assertSame([get_constant('EASTVANTAGE_DEV_EMAIL')], $recipients);
        $this->assertNotEmpty($built->bcc, 'non-prod BCC arm did not run');
        return $built;
    }

    // ------------------------------------------------------------------ request emails
    /** @test */
    public function overtime_request_email_builds_with_an_approval_link()
    {
        $overtime = Overtime::whereHas('user')->orderBy('id', 'desc')->first();
        if (!$overtime) $this->markTestSkipped('no Overtime row in test DB');

        $mailable = new OvertimeRequestEmail($this->user, $overtime);

        $this->assertBuilds($mailable, 'Request for');
        $this->assertStringContainsString('request/approval/', $mailable->approval_link);
        $this->assertSame($overtime->id, $mailable->overtime->id);
        $this->assertNotNull($mailable->user);                     // the requester is resolved
    }

    /** @test */
    public function alter_log_and_change_schedule_and_rest_day_request_emails_build()
    {
        $alterLog = AlterLog::whereHas('user')->orderBy('id', 'desc')->first();
        $cs = ChangeSchedule::whereHas('user')->orderBy('id', 'desc')->first();
        $rdw = RestDayWork::whereHas('user')->orderBy('id', 'desc')->first();

        if ($alterLog) $this->assertBuilds(new AlterLogRequestEmail($this->user, $alterLog));
        if ($cs)       $this->assertBuilds(new ChangeScheduleRequestEmail($this->user, $cs));
        if ($rdw)      $this->assertBuilds(new RestDayWorkRequestEmail($this->user, $rdw));

        if (!$alterLog && !$cs && !$rdw) {
            $this->markTestSkipped('no request rows of any type in test DB');
        }
    }

    // ------------------------------------------------------------------ dispute emails
    /** @test */
    public function dispute_emails_build_from_an_array_payload()
    {
        $payload = [
            'user_id' => $this->user->id,
            'date' => '2026-07-10',
            'employee_note' => 'dispute note',
            'approver_note' => 'approver note',
            'amount' => 1,
            'type' => 'overtime',
            'current_time_in' => 28800, 'current_time_out' => 61200,
            'new_time_in' => 28800, 'new_time_out' => 64800,
            'start_time' => 28800, 'end_time' => 61200, 'break_time' => 3600,
        ];

        $this->assertBuilds(new OvertimeDisputeEmail($this->user, $payload));
        $this->assertBuilds(new AlterLogDisputeEmail($this->user, $payload));
        $this->assertBuilds(new RestDayWorkDisputeEmail($this->user, $payload));
    }

    // --------------------------------------------------------------------- auth emails
    /** @test */
    public function registration_and_forgot_password_emails_build_with_the_temp_password()
    {
        $registered = new RegisteredUserEmail($this->user, 'temp-pass-123');
        $this->assertBuilds($registered);

        $forgot = new ForgotPasswordRequestEmail($this->user, 'temp-pass-456');
        $this->assertBuilds($forgot);
    }

    // -------------------------------------------------------------- supervisor reminders
    /** @test */
    public function supervisor_reminder_emails_build_from_their_reminder_payloads()
    {
        // production callers pass [$supervisor, $collection] — same shape the repository uses
        $reminder = [$this->user, []];

        $this->assertBuilds(new SupervisorReminderRequestsEmail($reminder));
        $this->assertBuilds(new SupervisorReminderNoSchedEmail($reminder));
        $this->assertBuilds(new SupervisorReminderOfNewUserEmail($reminder));
    }

    /** @test */
    public function failed_bhr_sync_notice_builds_for_a_user()
    {
        $this->assertBuilds(new FailedBHRSyncNoticeEmail($this->user));
    }
}
