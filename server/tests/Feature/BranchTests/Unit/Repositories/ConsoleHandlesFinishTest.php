<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Mockery;
use Illuminate\Console\OutputStyle;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\NullOutput;
use App\Console\Commands\syncBhrUsers;
use App\Console\Commands\syncBhrLeaves;
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
 * COMPLETES the four nightly cron handlers whose HAPPY paths are already covered by
 * ConsoleSyncCommandsSpFakeTest: syncBhrUsers::handle (89.86%), generateWeeklyDtr::handle (72.73%),
 * syncBiotmetrixLogs::handle (70%), syncBhrLeaves::handle (65.79%). This suite deliberately adds
 * NOTHING that the sibling suite already exercises — it drives ONLY the remaining failure arms and
 * the country arms that had never been entered.
 *
 * WHY A USER CARES: these four commands are the entire nightly HR pipeline. If BambooHR is down,
 * the payroll cut-off row is missing, or the biometrics device feed times out, the employee sees a
 * blank DTR the next morning and the payroll team sees a silently "green" cron. These tests pin the
 * contract that every one of those failures ends in a 400 error_response written to the cron_errors /
 * dtr_leaves log — never a crash, never a false success.
 *
 * ARMS COVERED HERE
 *  - syncBhrUsers::handle    -> outer catch via repository throw; outer catch via stored-procedure
 *                               failure; per-user INNER catch (bhr->get_user throws) proving the
 *                               loop `break`s and the command still returns 201; inactive/terminated
 *                               user mapping (status 0, real hire + termination dates, supervisor id).
 *  - generateWeeklyDtr::handle -> catch via user repository throw AND via dtr->generate_dtr throw.
 *  - syncBiotmetrixLogs::handle -> catch via biometrics feed throw AND via dtr sync throw.
 *  - syncBhrLeaves::handle   -> MA arm (SP cut-off, success + empty rowset throw), BE arm
 *                               (current cut-off + unknown-id throw), BU and PH arms with NO
 *                               --cutoff-id (the `get_payroll_cutoff()` branch, never entered before),
 *                               and the BHr leave-fetch failure arm.
 *
 * SAFETY: every collaborator is an IoC interface -> Mockery mock; every call_sp() made from
 * App\Console\Commands is intercepted by CallSpFake (an UNFAKED SP throws, it never reaches the DB);
 * no BambooHR HTTP. The suite is PURE IN-MEMORY and therefore carries NO DatabaseTransactions trait:
 * it opens no connection at all, verified by running it green with the database unreachable — which
 * is a stronger guarantee than rolling a transaction back. handle() is invoked DIRECTLY on a
 * container-built command with
 * reflection-bound input/output because Laravel's Command::execute() casts the returned JsonResponse
 * to int, which would both notice-blow and hide the response we assert on.
 *
 * NEVER ROUTED TO: syncBhrLeaves lines 130-133 call exit() when the resolved cut-off dates are null.
 * exit() would kill the phpunit process, so no test drives it — see FINDING CMD-EXIT-1.
 */
class ConsoleHandlesFinishTest extends TestCase
{
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

    /** Mock every collaborator syncBhrUsers asks the container for. */
    private function mockAllSyncBhrUsersDeps()
    {
        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $this->mockDep(UserRepositoryInterface::class);
        $this->mockDep(ScheduleRepositoryInterface::class);
        $this->mockDep(DtrRepositoryInterface::class);
        $this->mockDep(EmailRepositoryInterface::class);
        return $bhr;
    }

    // ================================================================ syncBhrUsers :: error arms

    /**
     * BambooHR is unreachable when the nightly user sync asks which employees changed.
     * The command must log to cron_errors and hand back a 400 payload carrying the reason,
     * instead of aborting the scheduler run.
     */
    /** @test */
    public function user_sync_returns_error_response_when_bhr_changed_users_lookup_fails()
    {
        CallSpFake::fake('EH_SP_Bhr_To_Evox_Sync_Logs', [[(object) ['UDV_Sync_Date' => '2026-07-01 00:00:00']]]);

        $bhr = $this->mockAllSyncBhrUsersDeps();
        $bhr->shouldReceive('get_changed_users')->once()
            ->andThrow(new \Exception('BambooHR employees endpoint unreachable'));
        $bhr->shouldNotReceive('get_user');

        $res = $this->makeCommand(syncBhrUsers::class)->handle();

        $this->assertSame(400, $res->getStatusCode());
        $this->assertSame('BambooHR employees endpoint unreachable', $res->getData(true)['error']['content']);
        // the sync-log read happened, the per-user sync never did
        $this->assertCount(1, CallSpFake::callsFor('EH_SP_Bhr_To_Evox_Sync_Logs'));
        $this->assertSame([], CallSpFake::callsFor('EH_SP_User_sync'));
    }

    /**
     * The failed-retry stored procedure (EH_SP_User_Logs) blows up mid-run. The outer catch must
     * swallow it into a 400 so the scheduler keeps going; no user rows are pushed.
     */
    /** @test */
    public function user_sync_returns_error_response_when_failed_retry_stored_procedure_fails()
    {
        CallSpFake::fake('EH_SP_Bhr_To_Evox_Sync_Logs', [[]]);   // default "yesterday" arm
        // EH_SP_User_Logs deliberately NOT faked -> the seam throws, standing in for a DB/SP failure

        $bhr = $this->mockAllSyncBhrUsersDeps();
        $bhr->shouldReceive('get_changed_users')->once()->andReturn(['5001']);
        $bhr->shouldNotReceive('get_user');

        $res = $this->makeCommand(syncBhrUsers::class)->handle();

        $this->assertSame(400, $res->getStatusCode());
        $this->assertArrayHasKey('error', $res->getData(true));
        $this->assertCount(1, CallSpFake::callsFor('EH_SP_User_Logs'));
        $this->assertSame([0, null], CallSpFake::callsFor('EH_SP_User_Logs')[0]['params']);
        $this->assertSame([], CallSpFake::callsFor('EH_SP_User_sync'));
    }

    /**
     * INNER per-user catch: one employee's BambooHR profile fetch fails. Current behaviour is to log
     * the failure and BREAK out of the whole loop — every remaining employee in the batch is skipped
     * — yet the command still reports 201 Created to the scheduler.
     */
    /** @test */
    public function user_sync_breaks_the_batch_but_still_reports_success_when_one_profile_fetch_fails()
    {
        CallSpFake::fake('EH_SP_Bhr_To_Evox_Sync_Logs', [[]]);
        CallSpFake::fake('EH_SP_User_Logs', [[]]);

        $bhr = $this->mockAllSyncBhrUsersDeps();
        $bhr->shouldReceive('get_changed_users')->once()->andReturn(['4001', '4002', '4003']);
        // ->once() is the assertion that the loop broke after the first failure
        $bhr->shouldReceive('get_user')->once()->with('4001', true)
            ->andThrow(new \Exception('BHR profile 4001 timed out'));

        $res = $this->makeCommand(syncBhrUsers::class)->handle();

        $this->assertSame(201, $res->getStatusCode());
        $this->assertArrayHasKey('message', $res->getData(true));
        $this->assertSame([], CallSpFake::callsFor('EH_SP_User_sync'));       // nothing was written
        $this->assertCount(1, CallSpFake::callsFor('EH_SP_Bhr_To_Evox_Sync_Logs')); // no per-user log
    }

    /**
     * A terminated employee coming back from BambooHR: the other side of every date/status ternary.
     * Real hire and termination dates must pass through untouched, "Inactive" must map to 0, and the
     * supervisor id must be forwarded so the reporting line survives the sync.
     */
    /** @test */
    public function user_sync_maps_a_terminated_employee_with_real_dates_and_a_supervisor()
    {
        CallSpFake::fake('EH_SP_Bhr_To_Evox_Sync_Logs', [[(object) ['UDV_Sync_Date' => '2026-07-01 00:00:00']]]);
        CallSpFake::fake('EH_SP_User_Logs', [[]]);
        CallSpFake::fake('EH_SP_User_sync', [[]]);

        $bhr = $this->mockAllSyncBhrUsersDeps();
        $bhr->shouldReceive('get_changed_users')->once()->andReturn(['6006']);
        $bhr->shouldReceive('get_user')->once()->with('6006', true)->andReturn((object) [
            'bhr_num' => '6006', 'bestEmail' => 'leaver@evox.test',
            'employeeNumber' => '6006', 'id' => 6006,
            'firstName' => 'Terminated', 'middleName' => 'X', 'lastName' => 'Leaver',
            'nickname' => 'T', 'employmentHistoryStatus' => 'Terminated',
            'hireDate' => '2020-01-05',                 // real date -> passes through
            'status' => 'Inactive',                     // -> 0 arm
            'jobTitle' => 'Analyst', 'country' => 'India',
            'dateOfBirth' => '1988-03-11',
            'terminationDate' => '2026-06-30',          // real date -> passes through
            'department' => 'Finance', 'mobilePhone' => '+639170000000',
            'supervisorEId' => 4242,                    // non-null supervisor arm
            'division' => 'Shared Services',
            'lastChanged' => '2026-07-03 08:30:00',
        ]);

        $res = $this->makeCommand(syncBhrUsers::class)->handle();

        $this->assertSame(201, $res->getStatusCode());
        $p = CallSpFake::callsFor('EH_SP_User_sync')[0]['params'];
        $this->assertSame('2020-01-05', $p[10]);       // hire date kept
        $this->assertSame(0, $p[11]);                  // Inactive -> 0
        $this->assertSame('2026-06-30', $p[15]);       // termination date kept
        $this->assertSame(4242, $p[18]);               // supervisor forwarded
        $this->assertSame('2026-07-03 08:30:00', $p[20]);
    }

    // =========================================================== generateWeeklyDtr :: error arms

    /**
     * The monthly DTR pre-generation cannot read the active-employee list. Users would otherwise
     * open next month to an empty timesheet with no trace of why; the command must record the reason
     * in cron_errors and return 400.
     */
    /** @test */
    public function weekly_dtr_returns_error_response_when_active_user_lookup_fails()
    {
        $user = $this->mockDep(UserRepositoryInterface::class);
        $user->shouldReceive('get_all_active_users')->once()
            ->andThrow(new \Exception('active user lookup failed'));

        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldNotReceive('generate_dtr');

        $res = $this->makeCommand(generateWeeklyDtr::class)->handle();

        $this->assertSame(400, $res->getStatusCode());
        $this->assertSame('active user lookup failed', $res->getData(true)['error']['content']);
    }

    /**
     * The employee list is fine but the DTR writer itself fails half-way. The failure must surface as
     * a 400 rather than a partially generated month reported as success.
     */
    /** @test */
    public function weekly_dtr_returns_error_response_when_dtr_generation_fails()
    {
        $user = $this->mockDep(UserRepositoryInterface::class);
        $user->shouldReceive('get_all_active_users')->once()
            ->andReturn(new \Illuminate\Database\Eloquent\Collection([]));

        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldReceive('generate_dtr')->once()
            ->andThrow(new \Exception('dtr insert deadlock'));

        $res = $this->makeCommand(generateWeeklyDtr::class)->handle();

        $this->assertSame(400, $res->getStatusCode());
        $this->assertSame('dtr insert deadlock', $res->getData(true)['error']['content']);
    }

    // ========================================================= syncBiotmetrixLogs :: error arms

    /**
     * The biometric device feed is unavailable for the rolling 7-hour window. Employees' punches are
     * simply not there yet; the command must log to cron_errors and return 400 so the next run retries.
     */
    /** @test */
    public function biometrix_returns_error_response_when_the_device_feed_is_unavailable()
    {
        $bio = $this->mockDep(BiometricsRepositoryInterface::class);
        $bio->shouldReceive('get_biometrics')->once()
            ->andThrow(new \Exception('biometrics device feed unavailable'));

        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldNotReceive('sync_biometrics_to_dtr');

        $res = $this->makeCommand(syncBiotmetrixLogs::class)->handle();

        $this->assertSame(400, $res->getStatusCode());
        $this->assertSame('biometrics device feed unavailable', $res->getData(true)['error']['content']);
    }

    /**
     * Punches were fetched but writing them onto the DTR fails. The half-applied run must be reported
     * as an error, not swallowed into a 200 that hides missing time entries.
     */
    /** @test */
    public function biometrix_returns_error_response_when_writing_punches_to_dtr_fails()
    {
        $bio = $this->mockDep(BiometricsRepositoryInterface::class);
        $bio->shouldReceive('get_biometrics')->once()
            ->andReturn(new \Illuminate\Database\Eloquent\Collection([]));

        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldReceive('sync_biometrics_to_dtr')->once()
            ->andThrow(new \Exception('dtr punch write failed'));

        $res = $this->makeCommand(syncBiotmetrixLogs::class)->handle();

        $this->assertSame(400, $res->getStatusCode());
        $this->assertSame('dtr punch write failed', $res->getData(true)['error']['content']);
    }

    // ============================================ syncBhrLeaves :: untouched country + error arms

    /**
     * Malaysia payroll reads its cut-off from the same stored procedure as India but must stamp
     * country_id 4 on the bound leaves, otherwise Malaysian leave days land on the wrong payroll.
     */
    /** @test */
    public function leaves_malaysia_arm_uses_the_india_cutoff_procedure_but_stamps_country_four()
    {
        CallSpFake::fake('SP_Payroll_Cutoff_IND',
            [[(object) ['Start_Date' => '2026-08-01', 'End_Date' => '2026-08-15']]]);

        $leaves = [$this->bhrLeaf(7, '2026-02-02'), $this->bhrLeaf(3, '2026-02-01')];
        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_leaves')->once()->with('2026-08-01', '2026-08-15')->andReturn($leaves);

        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldReceive('bind_leaves_to_dtr')->once()
            ->with(Mockery::on(function ($sorted) {
                return array_map(function ($l) { return $l->id; }, $sorted) === [3, 7];
            }), 4, '2026-08-01', '2026-08-15')
            ->andReturn([]);
        $this->mockDep(PayrollCutoffRepositoryInterface::class);

        $res = $this->makeCommand(syncBhrLeaves::class,
            ['country_code' => 'MA', '--cutoff-id' => '11'])->handle();

        $this->assertSame(201, $res->getStatusCode());
        $sp = CallSpFake::callsFor('SP_Payroll_Cutoff_IND');
        $this->assertCount(1, $sp);
        $this->assertSame(['11'], $sp[0]['params']);
    }

    /**
     * A Malaysian cut-off id that does not exist must stop the run with a 400 rather than binding
     * leaves against null dates.
     */
    /** @test */
    public function leaves_malaysia_unknown_cutoff_id_returns_error_response()
    {
        CallSpFake::fake('SP_Payroll_Cutoff_IND', [[]]);

        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldNotReceive('get_leaves');
        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldNotReceive('bind_leaves_to_dtr');
        $this->mockDep(PayrollCutoffRepositoryInterface::class);

        $res = $this->makeCommand(syncBhrLeaves::class,
            ['country_code' => 'MA', '--cutoff-id' => '999'])->handle();

        $this->assertSame(400, $res->getStatusCode());
        $this->assertStringContainsString('Could not find Payroll Cut-off for MA',
            $res->getData(true)['error']['content']);
    }

    /**
     * Belgium run with an explicit cut-off id resolved through the cut-off repository; leaves must be
     * stamped country_id 5.
     */
    /** @test */
    public function leaves_belgium_arm_with_explicit_cutoff_id_stamps_country_five()
    {
        $cutoff = $this->mockDep(PayrollCutoffRepositoryInterface::class);
        $cutoff->shouldReceive('find')->once()->with(21)
            ->andReturn((object) ['start_date' => '2026-08-01', 'end_date' => '2026-08-31']);

        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_leaves')->once()->with('2026-08-01', '2026-08-31')->andReturn([]);
        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldReceive('bind_leaves_to_dtr')->once()
            ->with([], 5, '2026-08-01', '2026-08-31')->andReturn([]);

        $res = $this->makeCommand(syncBhrLeaves::class,
            ['country_code' => 'BE', '--cutoff-id' => '21'])->handle();

        $this->assertSame(201, $res->getStatusCode());
        $this->assertSame([], CallSpFake::calls());   // BE arm never touches a stored procedure
    }

    /** Belgium with a cut-off id that does not resolve must error out, not bind against null dates. */
    /** @test */
    public function leaves_belgium_unknown_cutoff_id_returns_error_response()
    {
        $cutoff = $this->mockDep(PayrollCutoffRepositoryInterface::class);
        $cutoff->shouldReceive('find')->once()->with(888)->andReturn(null);   // is_valid fails

        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldNotReceive('get_leaves');
        $this->mockDep(DtrRepositoryInterface::class);

        $res = $this->makeCommand(syncBhrLeaves::class,
            ['country_code' => 'BE', '--cutoff-id' => '888'])->handle();

        $this->assertSame(400, $res->getStatusCode());
        $this->assertStringContainsString('Could not find Payroll Cut-off for BE with ID 888',
            $res->getData(true)['error']['content']);
    }

    /**
     * FINDING CMD-ASSIGN-1 (characterization). Line 62 of syncBhrLeaves reads
     * `$cutoff_id == null;` — a comparison whose result is discarded, not the assignment the author
     * meant. It is harmless only because `$cutoff_id` is already null on this path. This test pins
     * the observed behaviour: with no --cutoff-id the Brunei run falls into the "current cut-off"
     * branch and stamps country_id 3.
     */
    /** @test */
    public function leaves_brunei_without_cutoff_id_uses_current_payroll_cutoff_FINDING_CMD_ASSIGN_1()
    {
        $cutoff = $this->mockDep(PayrollCutoffRepositoryInterface::class);
        $cutoff->shouldReceive('get_payroll_cutoff')->once()
            ->andReturn((object) ['start_date' => '2026-08-01', 'end_date' => '2026-08-15']);
        $cutoff->shouldNotReceive('find');

        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_leaves')->once()->with('2026-08-01', '2026-08-15')
            ->andReturn([$this->bhrLeaf(2, '2026-03-02'), $this->bhrLeaf(1, '2026-03-01')]);

        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldReceive('bind_leaves_to_dtr')->once()
            ->with(Mockery::type('array'), 3, '2026-08-01', '2026-08-15')->andReturn([]);

        $res = $this->makeCommand(syncBhrLeaves::class, ['country_code' => 'BU'])->handle();

        $this->assertSame(201, $res->getStatusCode());
        $this->assertSame([], CallSpFake::calls());
    }

    /**
     * The scheduled Philippine run passes no cut-off id at all — the everyday production case. It
     * must resolve the currently open cut-off and stamp country_id 2.
     */
    /** @test */
    public function leaves_philippines_without_cutoff_id_uses_current_payroll_cutoff()
    {
        $cutoff = $this->mockDep(PayrollCutoffRepositoryInterface::class);
        $cutoff->shouldReceive('get_payroll_cutoff')->once()
            ->andReturn((object) ['start_date' => '2026-08-01', 'end_date' => '2026-08-15']);
        $cutoff->shouldNotReceive('find');

        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_leaves')->once()->with('2026-08-01', '2026-08-15')->andReturn([]);

        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldReceive('bind_leaves_to_dtr')->once()
            ->with([], 2, '2026-08-01', '2026-08-15')->andReturn([]);

        $res = $this->makeCommand(syncBhrLeaves::class, ['country_code' => 'PH'])->handle();

        $this->assertSame(201, $res->getStatusCode());
        $this->assertSame([], CallSpFake::calls());
    }

    /**
     * BambooHR refuses the leave export for a valid cut-off. Approved leave would silently never
     * reach the DTR, so the command must land in its catch and return 400 with the reason.
     */
    /** @test */
    public function leaves_returns_error_response_when_bhr_leave_export_fails()
    {
        $cutoff = $this->mockDep(PayrollCutoffRepositoryInterface::class);
        $cutoff->shouldReceive('get_payroll_cutoff')->once()
            ->andReturn((object) ['start_date' => '2026-08-01', 'end_date' => '2026-08-15']);

        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_leaves')->once()
            ->andThrow(new \Exception('BHR time-off export rejected'));

        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldNotReceive('bind_leaves_to_dtr');

        $res = $this->makeCommand(syncBhrLeaves::class, ['country_code' => 'PH'])->handle();

        $this->assertSame(400, $res->getStatusCode());
        $this->assertSame('BHR time-off export rejected', $res->getData(true)['error']['content']);
    }
}
