<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use App\Modules\Email\Jobs\SendAlterLogDisputeEmailJob;
use App\Modules\Email\Jobs\SendOvertimeDisputeEmailJob;
use App\Modules\Email\Jobs\SendRestDayWorkDisputeEmailJob;
use App\Modules\Email\Mail\AlterLogDisputeEmail;
use App\Modules\Email\Mail\OvertimeDisputeEmail;
use App\Modules\Email\Mail\RestDayWorkDisputeEmail;
use App\Modules\User\Models\User;

/**
 * =====================================================================================================
 *  SOURCE UNDER TEST
 *      app/Modules/Email/Jobs/SendAlterLogDisputeEmailJob.php    :: handle
 *      app/Modules/Email/Jobs/SendOvertimeDisputeEmailJob.php    :: handle
 *      app/Modules/Email/Jobs/SendRestDayWorkDisputeEmailJob.php :: handle
 *
 *  MENU PATH
 *      Payroll -> Dispute -> raise a dispute      (each dispute queues one of these three jobs)
 *
 *  COVERAGE AT THE TIME OF WRITING
 *      SendAlterLogDisputeEmailJob::handle     88.89%
 *      SendOvertimeDisputeEmailJob::handle     90.00%
 *      SendRestDayWorkDisputeEmailJob::handle  88.89%
 *
 *  WHY THEY WERE SHORT. EmailJobsCatchArmsTest already drives the failure arm of all three. The SEND
 *  arm is driven by EmailJobsHandleTest, but only through a user the LIVE stored procedure happens to
 *  return a supervisor for — a probe that quietly marks itself skipped on a dump where the newest
 *  users have no supervisor row, leaving `Mail::send(...)` and the success log line unexecuted. This
 *  suite removes that dependency: the supervisor lookup is driven through the CallSpFake seam, so both
 *  arms of `is_valid($recepient)` run on every machine, every time, with the database never consulted
 *  for the procedure.
 *
 *  WHAT A USER FEELS. Arm one: an employee disputes a payroll item and their supervisor is notified.
 *  Arm two: the same employee has no supervisor on file, and the job must fall silent rather than
 *  crash the queue worker — a crashed worker stops EVERY notification in the app, not just this one.
 * =====================================================================================================
 */
class DisputeEmailJobsSupervisorArmsTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User the employee raising the dispute */
    private $sender;

    /** @var User the supervisor the stored procedure resolves */
    private $supervisor;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        CallSpFake::activate();

        $users = User::whereNotNull('email')->where('is_active', 1)
            ->orderBy('id', 'desc')->limit(2)->get();
        if (count($users) < 2) $this->markTestSkipped('need two active users with emails in test DB');

        $this->sender     = $users[0];
        $this->supervisor = $users[1];
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        parent::tearDown();
    }

    /** The payload the dispute screen posts, as the controller queues it. */
    private function payload(string $type): array
    {
        return [
            'user_id'          => $this->sender->id,
            'type'             => $type,
            'date'             => '2026-08-03',
            'amount'           => 1,
            'employee_note'    => 'biometrics device was offline',
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

    /** The stored procedure resolves a direct supervisor for the sender. */
    private function supervisorIsOnFile(): void
    {
        CallSpFake::fake('EH_SP_Direct_Supervisor',
            [[(object) ['SupervisorId' => $this->supervisor->id]]]);
    }

    /** The stored procedure returns no supervisor row for the sender. */
    private function noSupervisorOnFile(): void
    {
        CallSpFake::fake('EH_SP_Direct_Supervisor', [[]]);
    }

    /** Assert the procedure was asked about the sender, exactly once. */
    private function assertSupervisorWasLookedUp(): void
    {
        $calls = CallSpFake::callsFor('EH_SP_Direct_Supervisor');
        $this->assertCount(1, $calls);
        $this->assertSame([$this->sender->id], $calls[0]['params']);
    }

    // =================================================================================================
    //  Arm one — the dispute reaches the supervisor
    // =================================================================================================

    /**
     * @test
     * BUSINESS RULE — an alter-log dispute notifies the disputing employee's DIRECT supervisor, and the
     * message carries the disputed payload so the supervisor can act on it without opening the app.
     */
    public function an_alter_log_dispute_notifies_the_senders_direct_supervisor()
    {
        $this->supervisorIsOnFile();
        $payload = $this->payload('alter_log');

        (new SendAlterLogDisputeEmailJob($payload))->handle();

        $this->assertSupervisorWasLookedUp();
        Mail::assertSent(AlterLogDisputeEmail::class, function ($mail) use ($payload) {
            return $mail->recepient->id === $this->supervisor->id
                && $mail->request['user_id'] === $payload['user_id']
                && $mail->user->id === $this->sender->id;
        });
    }

    /**
     * @test
     * BUSINESS RULE — the same rule for an overtime dispute: the supervisor is notified and the
     * disputed type travels with the payload, because the subject line is built from it.
     */
    public function an_overtime_dispute_notifies_the_senders_direct_supervisor()
    {
        $this->supervisorIsOnFile();

        (new SendOvertimeDisputeEmailJob($this->payload('overtime')))->handle();

        $this->assertSupervisorWasLookedUp();
        Mail::assertSent(OvertimeDisputeEmail::class, function ($mail) {
            return $mail->recepient->id === $this->supervisor->id
                && $mail->request['type'] === 'overtime';
        });
    }

    /**
     * @test
     * BUSINESS RULE — and for a rest-day-work dispute.
     */
    public function a_rest_day_work_dispute_notifies_the_senders_direct_supervisor()
    {
        $this->supervisorIsOnFile();

        (new SendRestDayWorkDisputeEmailJob($this->payload('rest_day_work')))->handle();

        $this->assertSupervisorWasLookedUp();
        Mail::assertSent(RestDayWorkDisputeEmail::class, function ($mail) {
            return $mail->recepient->id === $this->supervisor->id;
        });
    }

    // =================================================================================================
    //  Arm two — no supervisor on file
    // =================================================================================================

    /**
     * @test
     * BUSINESS RULE — an employee with no supervisor on file (a new joiner, or a supervisor who has
     * left) must NOT produce a notification and must NOT fail the job: the queue worker has to survive
     * to deliver everybody else's mail. All three dispute jobs share this rule.
     */
    public function a_dispute_from_an_employee_with_no_supervisor_sends_nothing_and_does_not_fail()
    {
        $this->noSupervisorOnFile();

        (new SendAlterLogDisputeEmailJob($this->payload('alter_log')))->handle();
        (new SendOvertimeDisputeEmailJob($this->payload('overtime')))->handle();
        (new SendRestDayWorkDisputeEmailJob($this->payload('rest_day_work')))->handle();

        $this->assertCount(3, CallSpFake::callsFor('EH_SP_Direct_Supervisor'));
        Mail::assertNothingSent();
    }
}
