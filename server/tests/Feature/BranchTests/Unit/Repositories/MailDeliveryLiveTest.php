<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use App\Modules\Email\Mail\RegisteredUserEmail;
use App\Modules\Email\Mail\OvertimeRequestEmail;
use App\Modules\Email\Mail\SupervisorReminderRequestsEmail;
use App\Modules\Request\Models\Overtime;
use App\Modules\User\Models\User;

/**
 * REAL MAIL DELIVERY — the one thing a fake cannot prove.
 *
 * Every other email test in this suite fakes the mailer: it proves the app ASSEMBLED the message
 * and asked to send it. It cannot prove the message actually leaves the server, that SMTP
 * credentials work, that the template renders without a missing-variable error, or that anything
 * arrives in an inbox. Those failures are invisible to a faked test and very visible to a user.
 *
 * This suite therefore performs a REAL send — but only when explicitly switched on, because a test
 * run must never surprise anyone with mail.
 *
 * ── HOW TO RUN ────────────────────────────────────────────────────────────────
 *   Default (CI, normal runs): SKIPPED. Nothing is sent.
 *   To actually send:
 *       MAIL_LIVE_TEST=1 vendor/bin/phpunit --filter MailDeliveryLiveTest
 *   Optional override of the recipient (defaults to evox@eastvantage.com):
 *       MAIL_LIVE_TEST=1 MAIL_LIVE_TEST_TO=someone@eastvantage.com vendor/bin/phpunit --filter MailDeliveryLiveTest
 *
 * ── SAFETY ────────────────────────────────────────────────────────────────────
 *  - Recipient is FORCED to the test address. The real employee address on the model is never used,
 *    so no live person can be mailed by this suite even by accident.
 *  - Refuses to run at all if APP_ENV=production.
 *  - Sends a small, fixed number of messages (3), each subject-tagged [EVOX TEST] so the inbox is
 *    unambiguous.
 *  - Everything else about email behaviour (who gets notified, guard arms, queue dispatch) stays in
 *    the faked suites — EmailRepositoryQueueFakeTest, EmailJobsHandleTest, MailablesBuildTest.
 *    This suite answers exactly one question: does mail actually arrive?
 *
 * ── WHAT TO CHECK AFTER RUNNING ───────────────────────────────────────────────
 *  Open the inbox of the test address. You should see 3 messages tagged [EVOX TEST]:
 *    1. Registered-user email (welcome + temporary password path)
 *    2. Overtime request notification (the approval-link template — CHECK THE LINK RENDERS)
 *    3. Supervisor pending-requests reminder (a list template)
 *  If a template variable is missing, the send throws and the test fails with the template error —
 *  which is precisely the class of bug the faked tests cannot see.
 */
class MailDeliveryLiveTest extends TestCase
{
    use DatabaseTransactions;

    /** Where test mail goes. Never a real employee address. */
    private const DEFAULT_TO = 'evox@eastvantage.com';

    /** @var string */
    private $to;
    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();

        if (getenv('MAIL_LIVE_TEST') !== '1' && env('MAIL_LIVE_TEST') !== '1') {
            $this->markTestSkipped(
                'live mail delivery is opt-in — run with MAIL_LIVE_TEST=1 to actually send'
            );
        }
        if (app()->environment('production')) {
            $this->markTestSkipped('refusing to send test mail from a production environment');
        }

        $this->to = getenv('MAIL_LIVE_TEST_TO') ?: (env('MAIL_LIVE_TEST_TO') ?: self::DEFAULT_TO);

        $this->user = User::whereNotNull('email')->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$this->user) $this->markTestSkipped('no active user to build a message from');
        $this->be($this->user);
    }

    /**
     * Force every recipient to the test address and tag the subject, then send for real.
     * Returns the mailable so the caller can assert on what was built.
     */
    private function sendTagged($mailable, string $what)
    {
        $built = $mailable->build();

        // wipe whatever the constructor addressed and point it at the test inbox only
        $built->to = [];
        $built->cc = [];
        $built->bcc = [];
        $built->to($this->to);
        $built->subject('[EVOX TEST] ' . $what . ' — ' . $built->subject);

        Mail::send($built);

        return $built;
    }

    /** @test */
    public function registered_user_email_actually_sends_to_the_test_inbox()
    {
        $built = $this->sendTagged(
            new RegisteredUserEmail($this->user, 'live-mail-test-password'),
            'registered user'
        );

        $this->assertSame([$this->to], collect($built->to)->pluck('address')->all());
        $this->assertStringStartsWith('[EVOX TEST]', $built->subject);
        // reaching here means SMTP accepted the message and the template rendered
        $this->assertTrue(true, 'sent — now confirm arrival in the test inbox');
    }

    /** @test */
    public function overtime_request_email_actually_sends_and_renders_its_approval_link()
    {
        $overtime = Overtime::whereHas('user')->orderBy('id', 'desc')->first();
        if (!$overtime) $this->markTestSkipped('no Overtime row to build a notification from');

        $mailable = new OvertimeRequestEmail($this->user, $overtime);

        // the approval link is built in the constructor — assert it before sending
        $this->assertStringContainsString('request/approval/', $mailable->approval_link);

        $built = $this->sendTagged($mailable, 'overtime request');

        $this->assertSame([$this->to], collect($built->to)->pluck('address')->all());
    }

    /** @test */
    public function supervisor_reminder_email_actually_sends_with_a_list_payload()
    {
        $built = $this->sendTagged(
            new SupervisorReminderRequestsEmail([$this->user, []]),
            'supervisor reminder'
        );

        $this->assertSame([$this->to], collect($built->to)->pluck('address')->all());
    }
}
