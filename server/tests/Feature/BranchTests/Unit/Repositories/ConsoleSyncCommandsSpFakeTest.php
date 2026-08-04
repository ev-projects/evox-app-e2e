<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Console\OutputStyle;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\NullOutput;
use App\Console\Commands\syncBhrLeaves;
use App\Console\Commands\syncBhrHolidays;
use App\Console\Commands\syncBhrUsers;
use App\Console\Commands\syncBiotmetrixLogs;
use App\Console\Commands\generateWeeklyDtr;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Payroll\Repositories\BiometricsRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use App\Modules\Schedule\Repositories\ScheduleRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;

/**
 * REAL Console cron commands (0-16% covered, 286 uncovered lines in Console/) — first tests EVER
 * to invoke them. Every collaborator is an IoC interface -> Mockery-mocked; every call_sp made
 * FROM App\Console\Commands is intercepted by the seam. NO BambooHR HTTP, NO live SP, NO DB writes.
 *
 * handle() is invoked DIRECTLY on a container-built command with reflection-bound input/output:
 * Laravel's Command::execute() does `(int) $handle_result`, and these handlers return
 * JsonResponse — the cast would notice-blow AND hide the response. Direct invocation returns the
 * actual JsonResponse for assertion. exit()-guarded arms (null cutoff dates in syncBhrLeaves) are
 * NEVER routed to — exit() would kill the phpunit process.
 *
 * FINDING CMD-VAR-1: syncBhrLeaves error messages interpolate undefined $cutoff (should be
 * $cutoff_id) in all 4 "Could not find Payroll Cut-off" throws.
 * FINDING CMD-STR-1: syncBhrUsers per-user catch logs 'SYNC ERROR' . [array] — array-to-string
 * concat, the log line can itself error. Both registered; neither arm is force-executed.
 */
class ConsoleSyncCommandsSpFakeTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    /** Bind a loose Mockery mock for an interface and return it. */
    private function mockDep(string $iface)
    {
        $m = Mockery::mock($iface)->shouldIgnoreMissing();
        $this->app->instance($iface, $m);
        return $m;
    }

    /** Container-build a command and reflection-bind its input/output so handle() runs directly. */
    private function makeCommand(string $class, array $input = [])
    {
        $cmd = $this->app->make($class);
        $cmd->setLaravel($this->app);
        $in = new ArrayInput($input, $cmd->getDefinition());
        $ref = new \ReflectionObject($cmd);
        foreach (['input' => $in, 'output' => new OutputStyle($in, new NullOutput())] as $prop => $val) {
            $p = $ref->getProperty($prop);
            $p->setAccessible(true);
            $p->setValue($cmd, $val);
        }
        return $cmd;
    }

    private function bhrLeaf($id, $lastChanged)
    {
        return (object) ['id' => $id, 'status' => (object) ['lastChanged' => $lastChanged]];
    }

    // ------------------------------------------------------------------ syncBhrLeaves
    /** @test */
    public function leaves_invalid_country_code_returns_error_response()
    {
        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $this->mockDep(DtrRepositoryInterface::class);
        $this->mockDep(PayrollCutoffRepositoryInterface::class);
        $bhr->shouldNotReceive('get_leaves');

        $res = $this->makeCommand(syncBhrLeaves::class, ['country_code' => 'XX'])->handle();

        $this->assertSame(400, $res->getStatusCode());
        $this->assertArrayHasKey('error', $res->getData(true));
        $this->assertSame([], CallSpFake::calls());
    }

    /** @test */
    public function leaves_india_arm_faked_sp_cutoff_sorts_and_binds()
    {
        CallSpFake::fake('SP_Payroll_Cutoff_IND',
            [[(object) ['Start_Date' => '2026-07-01', 'End_Date' => '2026-07-15']]]);

        // unsorted: ties on lastChanged break by id ascending
        $leaves = [$this->bhrLeaf(2, '2026-01-02'), $this->bhrLeaf(9, '2026-01-01'), $this->bhrLeaf(1, '2026-01-02')];
        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_leaves')->once()->with('2026-07-01', '2026-07-15')->andReturn($leaves);

        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldReceive('bind_leaves_to_dtr')->once()
            ->with(Mockery::on(function ($sorted) {
                return array_map(function ($l) { return $l->id; }, $sorted) === [9, 1, 2];
            }), 1, '2026-07-01', '2026-07-15')
            ->andReturn([]);
        $this->mockDep(PayrollCutoffRepositoryInterface::class);

        $res = $this->makeCommand(syncBhrLeaves::class,
            ['country_code' => 'IN', '--cutoff-id' => '5'])->handle();

        $this->assertSame(201, $res->getStatusCode());
        $sp = CallSpFake::callsFor('SP_Payroll_Cutoff_IND');
        $this->assertCount(1, $sp);
        $this->assertSame(['5'], $sp[0]['params']);
    }

    /** @test */
    public function leaves_india_empty_cutoff_rowset_returns_error_response()
    {
        CallSpFake::fake('SP_Payroll_Cutoff_IND', [[]]);
        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldNotReceive('get_leaves');
        $this->mockDep(DtrRepositoryInterface::class);
        $this->mockDep(PayrollCutoffRepositoryInterface::class);

        $res = $this->makeCommand(syncBhrLeaves::class,
            ['country_code' => 'IN', '--cutoff-id' => '5'])->handle();

        $this->assertSame(400, $res->getStatusCode());
    }

    /** @test */
    public function leaves_ph_default_arm_uses_cutoff_repository_find()
    {
        $cutoff = $this->mockDep(PayrollCutoffRepositoryInterface::class);
        $cutoff->shouldReceive('find')->once()->with(7)
            ->andReturn((object) ['start_date' => '2026-07-01', 'end_date' => '2026-07-15']);

        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_leaves')->once()->with('2026-07-01', '2026-07-15')->andReturn([]);
        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldReceive('bind_leaves_to_dtr')->once()
            ->with([], 2, '2026-07-01', '2026-07-15')->andReturn([]);

        $res = $this->makeCommand(syncBhrLeaves::class,
            ['country_code' => 'PH', '--cutoff-id' => '7'])->handle();

        $this->assertSame(201, $res->getStatusCode());
        $this->assertSame([], CallSpFake::calls());   // PH arm never touches an SP
    }

    /** @test */
    public function leaves_bu_arm_with_unknown_cutoff_id_errors()
    {
        $cutoff = $this->mockDep(PayrollCutoffRepositoryInterface::class);
        $cutoff->shouldReceive('find')->once()->with(999)->andReturn(null);   // is_valid fails
        $this->mockDep(BhrRepositoryInterface::class);
        $this->mockDep(DtrRepositoryInterface::class);

        $res = $this->makeCommand(syncBhrLeaves::class,
            ['country_code' => 'BU', '--cutoff-id' => '999'])->handle();

        $this->assertSame(400, $res->getStatusCode());
    }

    // ---------------------------------------------------------------- syncBhrHolidays
    /** @test */
    public function holidays_happy_path_syncs_and_binds()
    {
        $cutoff = $this->mockDep(PayrollCutoffRepositoryInterface::class);
        $cutoff->shouldReceive('get_payroll_cutoff')->once()
            ->andReturn((object) ['start_date' => '2026-07-01']);

        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('sync_holidays')->once()->with('2026-07-01', Mockery::type('string'));
        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldReceive('bind_holidays_to_dtr')->once()->andReturn(collect([]));

        $res = $this->makeCommand(syncBhrHolidays::class)->handle();

        $this->assertSame(201, $res->getStatusCode());
    }

    /** @test */
    public function holidays_cutoff_failure_returns_error_response()
    {
        $cutoff = $this->mockDep(PayrollCutoffRepositoryInterface::class);
        $cutoff->shouldReceive('get_payroll_cutoff')->once()
            ->andThrow(new \Exception('cutoff unavailable'));
        $this->mockDep(BhrRepositoryInterface::class);
        $this->mockDep(DtrRepositoryInterface::class);

        $res = $this->makeCommand(syncBhrHolidays::class)->handle();

        $this->assertSame(400, $res->getStatusCode());
        $this->assertSame('cutoff unavailable', $res->getData(true)['error']['content']);
    }

    // -------------------------------------------------------------- syncBiotmetrixLogs
    /** @test */
    public function biometrix_happy_path_syncs_window_to_dtr()
    {
        $bio = $this->mockDep(BiometricsRepositoryInterface::class);
        $bio->shouldReceive('get_biometrics')->once()
            ->with(Mockery::type('string'), Mockery::type('string'))->andReturn(new \Illuminate\Database\Eloquent\Collection([]));
        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldReceive('sync_biometrics_to_dtr')->once()->andReturn(collect([]));

        $res = $this->makeCommand(syncBiotmetrixLogs::class)->handle();

        $this->assertSame(200, $res->getStatusCode());
        $this->assertArrayHasKey('message', $res->getData(true));
    }

    // --------------------------------------------------------------- generateWeeklyDtr
    /** @test */
    public function weekly_dtr_generates_next_month_date_array_for_active_users()
    {
        $user = $this->mockDep(UserRepositoryInterface::class);
        $user->shouldReceive('get_all_active_users')->once()->andReturn(new \Illuminate\Database\Eloquent\Collection([]));

        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldReceive('generate_dtr')->once()
            ->with(Mockery::any(), Mockery::on(function ($dates) {
                return is_array($dates) && count($dates) >= 28 && count($dates) <= 32;
            }))
            ->andReturn([]);

        $res = $this->makeCommand(generateWeeklyDtr::class)->handle();

        $this->assertSame(201, $res->getStatusCode());
    }

    // ------------------------------------------------------------------- syncBhrUsers
    private function bhrUserObject($number)
    {
        return (object) [
            'bhr_num' => $number, 'bestEmail' => "sync{$number}@evox.test",
            'employeeNumber' => $number, 'id' => (int) $number,
            'firstName' => 'Sync', 'middleName' => null, 'lastName' => 'Fixture',
            'nickname' => null, 'employmentHistoryStatus' => 'Regular',
            'hireDate' => '0000-00-00',                    // -> null arm
            'status' => 'Active',                          // -> 1 arm
            'jobTitle' => 'QA', 'country' => 'Philippines',
            'dateOfBirth' => '1990-01-01',
            'terminationDate' => '0000-00-00',             // -> null arm
            'department' => 'IT', 'mobilePhone' => null,
            'supervisorEId' => null, 'division' => null,
            'lastChanged' => '2026-07-02 10:00:00',
        ];
    }

    /** @test */
    public function users_changed_arm_syncs_one_user_through_the_sp()
    {
        CallSpFake::fake('EH_SP_Bhr_To_Evox_Sync_Logs',
            [[(object) ['UDV_Sync_Date' => '2026-07-01 00:00:00']]]);   // last-synced-date arm
        CallSpFake::fake('EH_SP_User_Logs', [[]]);                      // no failed retries
        CallSpFake::fake('EH_SP_User_sync', [[]]);

        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_changed_users')->once()
            ->with(Mockery::type('string'))->andReturn(['1001']);
        $bhr->shouldReceive('get_user')->once()->with('1001', true)
            ->andReturn($this->bhrUserObject('1001'));
        $this->mockDep(UserRepositoryInterface::class);
        $this->mockDep(ScheduleRepositoryInterface::class);
        $this->mockDep(DtrRepositoryInterface::class);
        $this->mockDep(EmailRepositoryInterface::class);

        $res = $this->makeCommand(syncBhrUsers::class)->handle();

        $this->assertSame(201, $res->getStatusCode());
        $sync = CallSpFake::callsFor('EH_SP_User_sync');
        $this->assertCount(1, $sync);
        $p = $sync[0]['params'];
        $this->assertSame('sync1001@evox.test', $p[0]);
        $this->assertNull($p[10]);                         // 0000-00-00 hire date -> null
        $this->assertSame(1, $p[11]);                      // Active -> 1
        $this->assertNull($p[15]);                         // 0000-00-00 termination -> null
        // per-user sync log written with the user's lastChanged date
        $logs = CallSpFake::callsFor('EH_SP_Bhr_To_Evox_Sync_Logs');
        $this->assertCount(2, $logs);                      // read + write
        $this->assertSame('1001', $logs[1]['params'][0]);
    }

    /** @test */
    public function users_all_arm_merges_bhr_and_evox_lists_and_skips_unknowns()
    {
        CallSpFake::fake('EH_SP_Bhr_To_Evox_Sync_Logs', [[]]);          // default-yesterday arm
        CallSpFake::fake('EH_SP_User_Logs', [[(object) ['bhr_num' => '3003']]]);   // failed-retry merge

        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_all_bhr_user_numbers')->once()->andReturn(['2002']);
        $bhr->shouldReceive('get_user')->times(3)->andReturn(null);     // is_valid fails -> skip arm
        $bhr->shouldNotReceive('get_changed_users');

        $user = $this->mockDep(UserRepositoryInterface::class);
        $user->shouldReceive('get_all_bhr_synced_users')->once()->andReturn(['2003']);
        $this->mockDep(ScheduleRepositoryInterface::class);
        $this->mockDep(DtrRepositoryInterface::class);
        $this->mockDep(EmailRepositoryInterface::class);

        $res = $this->makeCommand(syncBhrUsers::class, ['all' => 'all'])->handle();

        $this->assertSame(201, $res->getStatusCode());
        $this->assertSame([], CallSpFake::callsFor('EH_SP_User_sync'));  // nothing valid to sync
    }
}
