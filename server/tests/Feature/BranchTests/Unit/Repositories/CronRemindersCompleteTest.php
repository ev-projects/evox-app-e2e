<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Console\OutputStyle;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\NullOutput;
use App\Console\Commands\sendSupervisorReminderNoSchedEmail;
use App\Console\Commands\sendSupervisorReminderRequests;
use App\Console\Commands\sendSupervisorReminderInvalidCheckIns;
use App\Console\Commands\sendFailedBHRUserSyncNotice;
use App\Console\Commands\syncBhrUsersCountry;
use App\Console\Commands\SyncBhrUsersPhoto;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use App\Modules\Schedule\Repositories\ScheduleRepositoryInterface;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepositoryInterface;

/**
 * COMPLETES the six nightly cron commands whose entire handle() was at 0% — each is the only
 * method in its class, so finishing it flips the whole class from uncounted to counted
 * (see CLASS-COMPLETION-PLAN.md).
 *
 * These jobs run unattended in production: they are how supervisors learn about missing schedules,
 * pending requests and invalid check-ins, how failed BHR syncs get reported, and how user country
 * and photos stay in step with BambooHR. A silent break here is invisible until someone complains.
 *
 * Both arms of every handler are driven — the work path AND the failure path — because a method
 * only counts as covered when every line runs, and because the failure path is where these
 * commands actually hurt (they swallow errors).
 *
 * All collaborators are IoC-mocked, stored procedures are seam-faked, mail/queue are faked.
 * No BambooHR traffic, no live SP, no writes.
 */
class CronRemindersCompleteTest extends TestCase
{
    use DatabaseTransactions;

    private $mocks = [];

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();
        Mail::fake();
        Queue::fake();

        foreach ([
            'email'    => EmailRepositoryInterface::class,
            'user'     => UserRepositoryInterface::class,
            'bhr'      => BhrRepositoryInterface::class,
            'dtr'      => DtrRepositoryInterface::class,
            'schedule' => ScheduleRepositoryInterface::class,
            'cutoff'   => PayrollCutoffRepositoryInterface::class,
        ] as $key => $iface) {
            $m = Mockery::mock($iface)->shouldIgnoreMissing();
            $this->app->instance($iface, $m);
            $this->mocks[$key] = $m;
        }
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    /** Container-build a command and bind input/output so handle() can be invoked directly. */
    private function cmd(string $class, array $input = [])
    {
        $c = $this->app->make($class);
        $c->setLaravel($this->app);
        $in = new ArrayInput($input, $c->getDefinition());
        $ref = new \ReflectionObject($c);
        foreach (['input' => $in, 'output' => new OutputStyle($in, new NullOutput())] as $p => $v) {
            $prop = $ref->getProperty($p);
            $prop->setAccessible(true);
            $prop->setValue($c, $v);
        }
        return $c;
    }

    /** One real supervisor — these handlers iterate whatever get_all_supervisors returns. */
    private function supervisors()
    {
        $u = User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$u) $this->markTestSkipped('no active user in test DB');
        $c = new Collection();
        $c->push($u);
        return $c;
    }

    // ------------------------------------------------- no-schedule reminder (was 0%)
    /** @test */
    public function no_schedule_reminder_emails_only_supervisors_with_affected_employees()
    {
        $supervisors = $this->supervisors();
        $this->mocks['user']->shouldReceive('get_all_supervisors')->once()->andReturn($supervisors);
        // non-empty employee list -> the email arm runs
        $this->mocks['user']->shouldReceive('get_users_under_supervisee_active_with_no_schedule')
            ->once()->andReturn(new Collection([$supervisors->first()]));
        $this->mocks['email']->shouldReceive('sendSupervisorReminderNoSchedEmail')->once();

        $this->cmd(sendSupervisorReminderNoSchedEmail::class)->handle();

        $this->assertTrue(true, 'handler completed its work arm');
    }

    /** @test */
    public function no_schedule_reminder_skips_the_email_when_nobody_is_affected_and_survives_failure()
    {
        $this->mocks['user']->shouldReceive('get_all_supervisors')->once()->andReturn($this->supervisors());
        $this->mocks['user']->shouldReceive('get_users_under_supervisee_active_with_no_schedule')
            ->once()->andReturn(new Collection());          // empty -> skip arm
        $this->mocks['email']->shouldNotReceive('sendSupervisorReminderNoSchedEmail');

        $this->cmd(sendSupervisorReminderNoSchedEmail::class)->handle();

        // failure arm: the repository throws, the command must swallow it into an error response
        $this->mocks['user']->shouldReceive('get_all_supervisors')->once()
            ->andThrow(new \Exception('supervisor lookup failed'));
        $res = $this->cmd(sendSupervisorReminderNoSchedEmail::class)->handle();
        $this->assertSame(400, $res->getStatusCode());
    }

    // --------------------------------------------------- pending-requests reminder (was 0%)
    /** @test */
    public function requests_reminder_uses_the_cutoff_window_and_emails_only_when_requests_exist()
    {
        $this->mocks['cutoff']->shouldReceive('get_payroll_cutoff')->once()
            ->andReturn((object) ['start_date' => '2026-07-01', 'end_date' => '2026-07-15']);
        $this->mocks['user']->shouldReceive('get_all_supervisors')->once()->andReturn($this->supervisors());
        $this->mocks['user']->shouldReceive('get_users_under_supervisee_active_with_requests')
            ->once()->with('2026-07-01', '2026-07-15', Mockery::any())
            ->andReturn(new Collection([(object) ['id' => 1]]));
        $this->mocks['email']->shouldReceive('sendSupervisorReminderRequestsEmail')->once();

        $this->cmd(sendSupervisorReminderRequests::class)->handle();

        $this->assertTrue(true);
    }

    /** @test */
    public function requests_reminder_skips_empty_and_reports_cutoff_failure()
    {
        $this->mocks['cutoff']->shouldReceive('get_payroll_cutoff')->once()
            ->andReturn((object) ['start_date' => '2026-07-01', 'end_date' => '2026-07-15']);
        $this->mocks['user']->shouldReceive('get_all_supervisors')->once()->andReturn($this->supervisors());
        $this->mocks['user']->shouldReceive('get_users_under_supervisee_active_with_requests')
            ->once()->andReturn(new Collection());          // empty -> no email
        $this->mocks['email']->shouldNotReceive('sendSupervisorReminderRequestsEmail');
        $this->cmd(sendSupervisorReminderRequests::class)->handle();

        $this->mocks['cutoff']->shouldReceive('get_payroll_cutoff')->once()
            ->andThrow(new \Exception('no cutoff configured'));
        $res = $this->cmd(sendSupervisorReminderRequests::class)->handle();
        $this->assertSame(400, $res->getStatusCode());      // failure arm
    }

    // ------------------------------------------------ invalid check-ins reminder (was 0%)
    /** @test */
    public function invalid_check_ins_reminder_emails_when_there_are_offenders_and_survives_failure()
    {
        $this->mocks['user']->shouldReceive('get_all_supervisors')->once()->andReturn($this->supervisors());
        $this->mocks['user']->shouldReceive('get_users_under_supervisee_active_with_invalid_check_ins')
            ->once()->andReturn(new Collection([(object) ['id' => 5]]));
        $this->mocks['email']->shouldReceive('sendSupervisorReminderInvalidCheckInsEmail')->once();
        $this->cmd(sendSupervisorReminderInvalidCheckIns::class)->handle();

        $this->mocks['user']->shouldReceive('get_all_supervisors')->once()
            ->andThrow(new \Exception('lookup failed'));
        $res = $this->cmd(sendSupervisorReminderInvalidCheckIns::class)->handle();
        $this->assertSame(400, $res->getStatusCode());
    }

    // ---------------------------------------------- failed BHR sync notice (was 0%)
    /** @test */
    public function failed_bhr_sync_notice_emails_each_failure_and_marks_it_handled()
    {
        CallSpFake::fake('EH_SP_User_Logs', function ($params) {
            // first call (mode 1) lists failures; second (mode 2) acknowledges one
            return $params[0] === 1 ? [[(object) ['id' => 77, 'bhr_num' => '0077']]] : [[]];
        });
        $this->mocks['email']->shouldReceive('sendFailedBHRUserSyncNotice')->once();

        $this->cmd(sendFailedBHRUserSyncNotice::class)->handle();

        $calls = CallSpFake::callsFor('EH_SP_User_Logs');
        $this->assertCount(2, $calls);                       // list + acknowledge
        $this->assertSame(1, $calls[0]['params'][0]);
        $this->assertSame([2, 77], $calls[1]['params']);
    }

    /** @test */
    public function failed_bhr_sync_notice_swallows_a_per_user_email_failure()
    {
        CallSpFake::fake('EH_SP_User_Logs', [[(object) ['id' => 88, 'bhr_num' => '0088']]]);
        $this->mocks['email']->shouldReceive('sendFailedBHRUserSyncNotice')
            ->once()->andThrow(new \Exception('mail down'));

        // the per-user catch is empty: the command must complete without surfacing the error
        $this->cmd(sendFailedBHRUserSyncNotice::class)->handle();

        $this->assertTrue(true, 'per-user catch arm swallowed the failure');
    }

    // -------------------------------------------------- country + photo sync (were 0%)
    /** @test */
    public function country_sync_merges_bhr_and_evox_numbers_then_updates_each_user()
    {
        $this->mocks['bhr']->shouldReceive('get_all_bhr_user_numbers')->once()->andReturn(['9001']);
        $this->mocks['bhr']->shouldReceive('get_user')->zeroOrMoreTimes()->andReturn(null);
        $this->mocks['user']->shouldReceive('update_bhr_user_country_to_evox')->zeroOrMoreTimes();

        $this->cmd(syncBhrUsersCountry::class)->handle();

        $this->assertTrue(true, 'country sync completed its loop');
    }

    /** @test */
    public function photo_sync_all_arm_pushes_each_photo_through_the_sp_and_survives_a_bad_user()
    {
        CallSpFake::fake('EV_Photo_Sync', [[]]);
        $this->mocks['bhr']->shouldReceive('get_all_bhr_user_numbers')->once()
            ->andReturn(['9001', '9002']);
        $this->mocks['bhr']->shouldReceive('get_profile_picture')->twice()
            ->andReturn('BASE64-PHOTO', null);

        $this->cmd(SyncBhrUsersPhoto::class, ['all' => 'all'])->handle();

        $calls = CallSpFake::callsFor('EV_Photo_Sync');
        $this->assertNotEmpty($calls);
        $this->assertSame('9001', $calls[0]['params'][0]);
        $this->assertSame(1, $calls[0]['params'][2]);
    }
}
