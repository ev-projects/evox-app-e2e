<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Mockery;
use Carbon\Carbon;
use Illuminate\Console\OutputStyle;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\NullOutput;
use App\Console\Commands\syncBhrUsers;
use App\Console\Commands\syncBhrLeaves;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use App\Modules\Schedule\Repositories\ScheduleRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;

/**
 * THE TWO HEAVIEST NIGHTLY JOBS, BRANCH BY BRANCH.
 *
 * syncBhrUsers  (app/Console/Commands/syncBhrUsers.php)  — pulls people from BambooHR into EVOX
 * syncBhrLeaves (app/Console/Commands/syncBhrLeaves.php) — pulls approved leaves onto the DTR
 *
 * These run unattended at night. When a branch here misbehaves nobody sees a stack trace; people
 * just find themselves missing from EVOX, or their approved leave never lands on their timesheet.
 *
 * Read as a page lifecycle:
 *   PHASE 1 MOUNT   — the command decides WHICH window to sync (last sync log vs default yesterday)
 *                     and WHICH population to sync ('all' vs only-changed), before any user is touched
 *   PHASE 2 DATA    — the fetched BambooHR record arrives and is translated into SP parameters
 *                     (0000-00-00 -> null, "Active" -> 1/0, null supervisor passthrough)
 *   PHASE 3 ACTIONS — per-item decisions inside the loop: valid user syncs, invalid user is skipped,
 *                     a previously-FAILED bhr number is merged back in and retried
 *   PHASE 4 SUBMIT  — the stored-procedure write itself, the per-user catch that BREAKS the loop,
 *                     and the outer catch that turns any blow-up into a 400 error response
 *
 * Every phase is driven on BOTH outcomes. Every assertion checks the SP PARAMETERS, not merely that
 * an SP ran — a cron that calls the right procedure with the wrong window is the actual failure mode.
 *
 * COMPLEMENTS (does not repeat) ConsoleSyncCommandsSpFakeTest and CronRemindersCompleteTest:
 * those cover the IN arm, the PH-with-cutoff-id arm, the BU-unknown-id arm, the plain changed-user
 * happy path and the all-arm-with-no-valid-users path. Everything below is a branch they leave cold.
 *
 * SAFETY: every collaborator is an IoC interface -> Mockery; every call_sp() made from
 * App\Console\Commands is intercepted by the CallSpFake seam. No BambooHR HTTP, no live stored
 * procedure, no DDL, no writes. The exit() arm of syncBhrLeaves (null cut-off dates) is NEVER
 * routed to — exit() would kill the phpunit process — so every cut-off stub returns real dates.
 *
 * NO DatabaseTransactions trait ON PURPOSE: this file never reads or writes a table — every
 * boundary is mocked or seam-faked — so opening a transaction would only add a live connection
 * to the staging LIVE-BACKUP dump for no benefit. Adding the trait would also make these branch
 * assertions unrunnable whenever the DB is unreachable.
 */
class CronBusinessLogicBranchTest extends TestCase
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

    /**
     * Container-build the command and reflection-bind input/output so handle() runs DIRECTLY.
     * Laravel's Command::execute() casts the handler result to int; these handlers return a
     * JsonResponse, so the cast would both blow up and hide the response we need to assert on.
     */
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

    /** Bind every collaborator syncBhrUsers asks the container for, and hand back the BHR one. */
    private function bindUserSyncDeps()
    {
        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $this->mockDep(UserRepositoryInterface::class);
        $this->mockDep(ScheduleRepositoryInterface::class);
        $this->mockDep(DtrRepositoryInterface::class);
        $this->mockDep(EmailRepositoryInterface::class);
        return $bhr;
    }

    /** A BambooHR person record, with per-test overrides for the fields the branches key on. */
    private function bhrPerson($number, array $overrides = [])
    {
        return (object) array_merge([
            'bhr_num'                 => $number,
            'bestEmail'               => "person{$number}@evox.test",
            'employeeNumber'          => $number,
            'id'                      => (int) $number,
            'firstName'               => 'Sync',
            'middleName'              => null,
            'lastName'                => 'Fixture',
            'nickname'                => null,
            'employmentHistoryStatus' => 'Regular',
            'hireDate'                => '0000-00-00',
            'status'                  => 'Active',
            'jobTitle'                => 'QA',
            'country'                 => 'Philippines',
            'dateOfBirth'             => '1990-01-01',
            'terminationDate'         => '0000-00-00',
            'department'              => 'IT',
            'mobilePhone'             => null,
            'supervisorEId'           => null,
            'division'                => null,
            'lastChanged'             => '2026-07-02 10:00:00',
        ], $overrides);
    }

    // =====================================================================================
    // syncBhrUsers — PHASE 1: which window do we sync? (the since-date decision)
    // =====================================================================================

    /** @test */
    public function the_user_sync_asks_bamboo_for_everyone_changed_since_the_last_recorded_sync_date()
    {
        CallSpFake::fake('EH_SP_Bhr_To_Evox_Sync_Logs',
            [[(object) ['UDV_Sync_Date' => '2026-06-20 08:30:00']]]);
        CallSpFake::fake('EH_SP_User_Logs', [[]]);

        $expected = Carbon::createFromFormat('Y-m-d H:i:s', '2026-06-20 08:30:00')->toAtomString();

        $bhr = $this->bindUserSyncDeps();
        $bhr->shouldReceive('get_changed_users')->once()->with($expected)->andReturn([]);

        $res = $this->makeCommand(syncBhrUsers::class)->handle();

        $this->assertSame(201, $res->getStatusCode());
        // the read of the sync log must be the "give me the last date" mode, not a write
        $read = CallSpFake::callsFor('EH_SP_Bhr_To_Evox_Sync_Logs');
        $this->assertCount(1, $read);
        $this->assertSame([null, null, null, 2], $read[0]['params']);
    }

    /** @test */
    public function the_user_sync_falls_back_to_yesterday_when_the_sync_log_has_no_rows_at_all()
    {
        CallSpFake::fake('EH_SP_Bhr_To_Evox_Sync_Logs', []);   // outer result set completely empty
        CallSpFake::fake('EH_SP_User_Logs', [[]]);

        $yesterday = Carbon::today()->subDays(1)->toAtomString();

        $bhr = $this->bindUserSyncDeps();
        $bhr->shouldReceive('get_changed_users')->once()->with($yesterday)->andReturn([]);

        $res = $this->makeCommand(syncBhrUsers::class)->handle();

        $this->assertSame(201, $res->getStatusCode());
    }

    /** @test */
    public function the_user_sync_falls_back_to_yesterday_when_the_sync_log_row_has_a_blank_date()
    {
        // a row exists, but the date column is empty — the command must NOT try to parse it
        CallSpFake::fake('EH_SP_Bhr_To_Evox_Sync_Logs', [[(object) ['UDV_Sync_Date' => '']]]);
        CallSpFake::fake('EH_SP_User_Logs', [[]]);

        $yesterday = Carbon::today()->subDays(1)->toAtomString();

        $bhr = $this->bindUserSyncDeps();
        $bhr->shouldReceive('get_changed_users')->once()->with($yesterday)->andReturn([]);

        $res = $this->makeCommand(syncBhrUsers::class)->handle();

        $this->assertSame(201, $res->getStatusCode());
    }

    // =====================================================================================
    // syncBhrUsers — PHASE 1: which population? ('all' vs changed) + the failed-number merge
    // =====================================================================================

    /** @test */
    public function running_the_user_sync_with_all_syncs_bamboo_people_evox_people_and_past_failures_together()
    {
        CallSpFake::fake('EH_SP_Bhr_To_Evox_Sync_Logs', [[]]);
        // one bhr number failed on a previous night and must be retried
        CallSpFake::fake('EH_SP_User_Logs', [[(object) ['bhr_num' => '3003']]]);
        CallSpFake::fake('EH_SP_User_sync', [[]]);

        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_all_bhr_user_numbers')->once()->andReturn(['2002']);
        $bhr->shouldNotReceive('get_changed_users');            // the 'all' arm must not ask for a window
        $bhr->shouldReceive('get_user')->times(3)
            ->andReturnUsing(function ($number) { return $this->bhrPerson($number); });

        $user = $this->mockDep(UserRepositoryInterface::class);
        $user->shouldReceive('get_all_bhr_synced_users')->once()->andReturn(['2003']);
        $this->mockDep(ScheduleRepositoryInterface::class);
        $this->mockDep(DtrRepositoryInterface::class);
        $this->mockDep(EmailRepositoryInterface::class);

        $res = $this->makeCommand(syncBhrUsers::class, ['all' => 'all'])->handle();

        $this->assertSame(201, $res->getStatusCode());
        $synced = array_map(function ($c) { return $c['params'][1]; },
            CallSpFake::callsFor('EH_SP_User_sync'));
        sort($synced);
        // BambooHR list + EVOX-side list + the retried failure, all three
        $this->assertSame(['2002', '2003', '3003'], $synced);
    }

    /** @test */
    public function a_bhr_number_that_failed_last_night_is_retried_even_when_bamboo_reports_no_changes()
    {
        CallSpFake::fake('EH_SP_Bhr_To_Evox_Sync_Logs', [[]]);
        CallSpFake::fake('EH_SP_User_Logs', [[(object) ['bhr_num' => '4004']]]);
        CallSpFake::fake('EH_SP_User_sync', [[]]);

        $bhr = $this->bindUserSyncDeps();
        $bhr->shouldReceive('get_changed_users')->once()->andReturn([]);   // nothing changed
        $bhr->shouldReceive('get_user')->once()->with('4004', true)
            ->andReturn($this->bhrPerson('4004'));

        $res = $this->makeCommand(syncBhrUsers::class)->handle();

        $this->assertSame(201, $res->getStatusCode());
        $sync = CallSpFake::callsFor('EH_SP_User_sync');
        $this->assertCount(1, $sync);
        $this->assertSame('4004', $sync[0]['params'][1]);
        // the failed-number lookup asks for status 0 (= failed) across all users
        $this->assertSame([0, null], CallSpFake::callsFor('EH_SP_User_Logs')[0]['params']);
    }

    // =====================================================================================
    // syncBhrUsers — PHASE 2: the BambooHR record is translated into SP parameters
    // =====================================================================================

    /** @test */
    public function real_bamboo_dates_are_passed_through_untouched_and_a_left_employee_is_marked_inactive()
    {
        CallSpFake::fake('EH_SP_Bhr_To_Evox_Sync_Logs', [[]]);
        CallSpFake::fake('EH_SP_User_Logs', [[]]);
        CallSpFake::fake('EH_SP_User_sync', [[]]);

        $bhr = $this->bindUserSyncDeps();
        $bhr->shouldReceive('get_changed_users')->once()->andReturn(['5005']);
        $bhr->shouldReceive('get_user')->once()->with('5005', true)->andReturn(
            $this->bhrPerson('5005', [
                'hireDate'        => '2019-03-04',      // real date -> passthrough arm
                'terminationDate' => '2026-05-31',      // real date -> passthrough arm
                'dateOfBirth'     => '0000-00-00',      // placeholder -> null arm
                'status'          => 'Inactive',        // -> 0 arm
                'supervisorEId'   => '777',             // non-null -> passthrough arm
                'firstName'       => 'Sync',
                'lastName'        => 'Fixture',
            ])
        );

        $res = $this->makeCommand(syncBhrUsers::class)->handle();

        $this->assertSame(201, $res->getStatusCode());
        $p = CallSpFake::callsFor('EH_SP_User_sync')[0]['params'];
        $this->assertSame('sfixture5005', $p[3]);     // username generated from first initial + surname + number
        $this->assertSame('2019-03-04', $p[10]);      // hire date kept
        $this->assertSame(0, $p[11]);                 // Inactive -> 0
        $this->assertNull($p[14]);                    // 0000-00-00 birthday -> null
        $this->assertSame('2026-05-31', $p[15]);      // termination date kept
        $this->assertSame('777', $p[18]);             // supervisor kept
        $this->assertSame('2026-07-02 10:00:00', $p[20]);
    }

    /** @test */
    public function every_placeholder_zero_date_from_bamboo_is_stored_as_empty_rather_than_a_fake_date()
    {
        CallSpFake::fake('EH_SP_Bhr_To_Evox_Sync_Logs', [[]]);
        CallSpFake::fake('EH_SP_User_Logs', [[]]);
        CallSpFake::fake('EH_SP_User_sync', [[]]);

        $bhr = $this->bindUserSyncDeps();
        $bhr->shouldReceive('get_changed_users')->once()->andReturn(['6006']);
        $bhr->shouldReceive('get_user')->once()->andReturn(
            $this->bhrPerson('6006', [
                'hireDate'        => '0000-00-00',
                'terminationDate' => '0000-00-00',
                'dateOfBirth'     => '0000-00-00',
                'supervisorEId'   => null,
            ])
        );

        $this->makeCommand(syncBhrUsers::class)->handle();

        $p = CallSpFake::callsFor('EH_SP_User_sync')[0]['params'];
        $this->assertNull($p[10]);     // hire date
        $this->assertNull($p[14]);     // date of birth
        $this->assertNull($p[15]);     // termination date
        $this->assertNull($p[18]);     // supervisor
        $this->assertSame(1, $p[11]);  // Active -> 1
    }

    /** @test */
    public function a_successful_person_sync_writes_that_persons_own_last_changed_date_to_the_sync_log()
    {
        CallSpFake::fake('EH_SP_Bhr_To_Evox_Sync_Logs', [[]]);
        CallSpFake::fake('EH_SP_User_Logs', [[]]);
        CallSpFake::fake('EH_SP_User_sync', [[]]);

        $bhr = $this->bindUserSyncDeps();
        $bhr->shouldReceive('get_changed_users')->once()->andReturn(['7007']);
        $bhr->shouldReceive('get_user')->once()
            ->andReturn($this->bhrPerson('7007', ['lastChanged' => '2026-07-09 23:15:44']));

        $this->makeCommand(syncBhrUsers::class)->handle();

        $logs = CallSpFake::callsFor('EH_SP_Bhr_To_Evox_Sync_Logs');
        $this->assertCount(2, $logs);                                     // one read, one write
        $this->assertSame(['7007', '2026-07-09 23:15:44', 1, 1], $logs[1]['params']);
    }

    // =====================================================================================
    // syncBhrUsers — PHASE 3: per-person guards inside the loop
    // =====================================================================================

    /** @test */
    public function a_person_bamboo_cannot_return_is_skipped_while_the_rest_of_the_batch_still_syncs()
    {
        CallSpFake::fake('EH_SP_Bhr_To_Evox_Sync_Logs', [[]]);
        CallSpFake::fake('EH_SP_User_Logs', [[]]);
        CallSpFake::fake('EH_SP_User_sync', [[]]);

        $bhr = $this->bindUserSyncDeps();
        $bhr->shouldReceive('get_changed_users')->once()->andReturn(['8001', '8002']);
        $bhr->shouldReceive('get_user')->twice()->andReturnUsing(function ($number) {
            return $number === '8001' ? null : $this->bhrPerson($number);   // first is unknown to BHR
        });

        $res = $this->makeCommand(syncBhrUsers::class)->handle();

        $this->assertSame(201, $res->getStatusCode());
        $sync = CallSpFake::callsFor('EH_SP_User_sync');
        $this->assertCount(1, $sync);                 // only the second person reached the SP
        $this->assertSame('8002', $sync[0]['params'][1]);
    }

    // =====================================================================================
    // syncBhrUsers — PHASE 4: failure handling
    // =====================================================================================

    /** @test */
    public function one_person_failing_stops_the_whole_nightly_batch_and_nobody_after_them_is_synced()
    {
        CallSpFake::fake('EH_SP_Bhr_To_Evox_Sync_Logs', [[]]);
        CallSpFake::fake('EH_SP_User_Logs', [[]]);
        CallSpFake::fake('EH_SP_User_sync', [[]]);

        $bhr = $this->bindUserSyncDeps();
        $bhr->shouldReceive('get_changed_users')->once()->andReturn(['9001', '9002', '9003']);
        // exactly ONE call is allowed: proving the loop breaks instead of continuing
        $bhr->shouldReceive('get_user')->once()->andThrow(new \Exception('BambooHR timed out'));

        $res = $this->makeCommand(syncBhrUsers::class)->handle();

        // the command still reports success to the scheduler even though 2 people were never synced
        $this->assertSame(201, $res->getStatusCode());
        $this->assertSame([], CallSpFake::callsFor('EH_SP_User_sync'));
    }

    /** @test */
    public function the_user_sync_reports_an_error_instead_of_crashing_when_bamboo_is_unreachable()
    {
        CallSpFake::fake('EH_SP_Bhr_To_Evox_Sync_Logs', [[]]);
        CallSpFake::fake('EH_SP_User_Logs', [[]]);

        $bhr = $this->bindUserSyncDeps();
        $bhr->shouldReceive('get_changed_users')->once()
            ->andThrow(new \Exception('BambooHR API unreachable'));

        $res = $this->makeCommand(syncBhrUsers::class)->handle();

        $this->assertSame(400, $res->getStatusCode());
        $this->assertSame('BambooHR API unreachable', $res->getData(true)['error']['content']);
        $this->assertSame([], CallSpFake::callsFor('EH_SP_User_sync'));
    }

    // =====================================================================================
    // syncBhrLeaves — PHASE 1: which country, which cut-off window
    // =====================================================================================

    /** A cut-off object as the repository returns it. */
    private function cutoffRow($start = '2026-07-01', $end = '2026-07-15')
    {
        return (object) ['start_date' => $start, 'end_date' => $end];
    }

    /** Bind leaves deps; returns [bhr, dtr, cutoff]. */
    private function bindLeaveDeps()
    {
        return [
            $this->mockDep(BhrRepositoryInterface::class),
            $this->mockDep(DtrRepositoryInterface::class),
            $this->mockDep(PayrollCutoffRepositoryInterface::class),
        ];
    }

    /** @test */
    public function malaysia_leaves_read_their_cut_off_from_the_stored_procedure_and_bind_to_country_four()
    {
        CallSpFake::fake('SP_Payroll_Cutoff_IND',
            [[(object) ['Start_Date' => '2026-06-01', 'End_Date' => '2026-06-15']]]);

        list($bhr, $dtr, $cutoff) = $this->bindLeaveDeps();
        $bhr->shouldReceive('get_leaves')->once()->with('2026-06-01', '2026-06-15')->andReturn([]);
        $dtr->shouldReceive('bind_leaves_to_dtr')->once()
            ->with([], 4, '2026-06-01', '2026-06-15')->andReturn([]);
        $cutoff->shouldNotReceive('find');

        $res = $this->makeCommand(syncBhrLeaves::class,
            ['country_code' => 'MA', '--cutoff-id' => '12'])->handle();

        $this->assertSame(201, $res->getStatusCode());
        $sp = CallSpFake::callsFor('SP_Payroll_Cutoff_IND');
        $this->assertCount(1, $sp);
        $this->assertSame(['12'], $sp[0]['params']);
    }

    /** @test */
    public function malaysia_leaves_stop_with_an_error_when_the_requested_cut_off_does_not_exist()
    {
        CallSpFake::fake('SP_Payroll_Cutoff_IND', [[]]);      // no such cut-off

        list($bhr, $dtr, $cutoff) = $this->bindLeaveDeps();
        $bhr->shouldNotReceive('get_leaves');
        $dtr->shouldNotReceive('bind_leaves_to_dtr');

        $res = $this->makeCommand(syncBhrLeaves::class,
            ['country_code' => 'MA', '--cutoff-id' => '999'])->handle();

        $this->assertSame(400, $res->getStatusCode());
    }

    /** @test */
    public function belgium_leaves_use_the_named_cut_off_when_one_is_given_and_bind_to_country_five()
    {
        list($bhr, $dtr, $cutoff) = $this->bindLeaveDeps();
        $cutoff->shouldReceive('find')->once()->with(21)->andReturn($this->cutoffRow());
        $cutoff->shouldNotReceive('get_payroll_cutoff');
        $bhr->shouldReceive('get_leaves')->once()->with('2026-07-01', '2026-07-15')->andReturn([]);
        $dtr->shouldReceive('bind_leaves_to_dtr')->once()
            ->with([], 5, '2026-07-01', '2026-07-15')->andReturn([]);

        $res = $this->makeCommand(syncBhrLeaves::class,
            ['country_code' => 'BE', '--cutoff-id' => '21'])->handle();

        $this->assertSame(201, $res->getStatusCode());
        $this->assertSame([], CallSpFake::calls());     // the BE arm never touches a stored procedure
    }

    /** @test */
    public function belgium_leaves_fall_back_to_the_current_cut_off_when_none_is_named()
    {
        list($bhr, $dtr, $cutoff) = $this->bindLeaveDeps();
        $cutoff->shouldReceive('get_payroll_cutoff')->once()
            ->andReturn($this->cutoffRow('2026-08-01', '2026-08-15'));
        $cutoff->shouldNotReceive('find');
        $bhr->shouldReceive('get_leaves')->once()->with('2026-08-01', '2026-08-15')->andReturn([]);
        $dtr->shouldReceive('bind_leaves_to_dtr')->once()
            ->with([], 5, '2026-08-01', '2026-08-15')->andReturn([]);

        $res = $this->makeCommand(syncBhrLeaves::class, ['country_code' => 'BE'])->handle();

        $this->assertSame(201, $res->getStatusCode());
    }

    /** @test */
    public function belgium_leaves_stop_with_an_error_when_the_named_cut_off_does_not_exist()
    {
        list($bhr, $dtr, $cutoff) = $this->bindLeaveDeps();
        $cutoff->shouldReceive('find')->once()->with(888)->andReturn(null);
        $bhr->shouldNotReceive('get_leaves');

        $res = $this->makeCommand(syncBhrLeaves::class,
            ['country_code' => 'BE', '--cutoff-id' => '888'])->handle();

        $this->assertSame(400, $res->getStatusCode());
    }

    /** @test */
    public function burgundy_leaves_fall_back_to_the_current_cut_off_when_none_is_named_and_bind_to_country_three()
    {
        list($bhr, $dtr, $cutoff) = $this->bindLeaveDeps();
        $cutoff->shouldReceive('get_payroll_cutoff')->once()->andReturn($this->cutoffRow());
        $cutoff->shouldNotReceive('find');
        $bhr->shouldReceive('get_leaves')->once()->with('2026-07-01', '2026-07-15')->andReturn([]);
        $dtr->shouldReceive('bind_leaves_to_dtr')->once()
            ->with([], 3, '2026-07-01', '2026-07-15')->andReturn([]);

        $res = $this->makeCommand(syncBhrLeaves::class, ['country_code' => 'BU'])->handle();

        $this->assertSame(201, $res->getStatusCode());
    }

    /** @test */
    public function burgundy_leaves_use_the_named_cut_off_when_it_exists()
    {
        list($bhr, $dtr, $cutoff) = $this->bindLeaveDeps();
        $cutoff->shouldReceive('find')->once()->with(33)
            ->andReturn($this->cutoffRow('2026-09-01', '2026-09-15'));
        $bhr->shouldReceive('get_leaves')->once()->with('2026-09-01', '2026-09-15')->andReturn([]);
        $dtr->shouldReceive('bind_leaves_to_dtr')->once()
            ->with([], 3, '2026-09-01', '2026-09-15')->andReturn([]);

        $res = $this->makeCommand(syncBhrLeaves::class,
            ['country_code' => 'BU', '--cutoff-id' => '33'])->handle();

        $this->assertSame(201, $res->getStatusCode());
    }

    /** @test */
    public function philippine_leaves_fall_back_to_the_current_cut_off_when_none_is_named()
    {
        list($bhr, $dtr, $cutoff) = $this->bindLeaveDeps();
        $cutoff->shouldReceive('get_payroll_cutoff')->once()
            ->andReturn($this->cutoffRow('2026-07-16', '2026-07-31'));
        $cutoff->shouldNotReceive('find');
        $bhr->shouldReceive('get_leaves')->once()->with('2026-07-16', '2026-07-31')->andReturn([]);
        $dtr->shouldReceive('bind_leaves_to_dtr')->once()
            ->with([], 2, '2026-07-16', '2026-07-31')->andReturn([]);

        $res = $this->makeCommand(syncBhrLeaves::class, ['country_code' => 'PH'])->handle();

        $this->assertSame(201, $res->getStatusCode());
    }

    /** @test */
    public function philippine_leaves_stop_with_an_error_when_the_named_cut_off_does_not_exist()
    {
        list($bhr, $dtr, $cutoff) = $this->bindLeaveDeps();
        $cutoff->shouldReceive('find')->once()->with(555)->andReturn(null);
        $bhr->shouldNotReceive('get_leaves');

        $res = $this->makeCommand(syncBhrLeaves::class,
            ['country_code' => 'PH', '--cutoff-id' => '555'])->handle();

        $this->assertSame(400, $res->getStatusCode());
    }

    // =====================================================================================
    // syncBhrLeaves — PHASE 2/3: the leaves arrive, are ordered, then bound to the DTR
    // =====================================================================================

    /** @test */
    public function leaves_are_applied_oldest_change_first_so_a_later_edit_always_wins()
    {
        list($bhr, $dtr, $cutoff) = $this->bindLeaveDeps();
        $cutoff->shouldReceive('get_payroll_cutoff')->once()->andReturn($this->cutoffRow());

        $leaf = function ($id, $changed) {
            return (object) ['id' => $id, 'status' => (object) ['lastChanged' => $changed]];
        };
        $bhr->shouldReceive('get_leaves')->once()->andReturn([
            $leaf(40, '2026-07-05'), $leaf(10, '2026-07-03'), $leaf(30, '2026-07-05'), $leaf(20, '2026-07-01'),
        ]);

        $dtr->shouldReceive('bind_leaves_to_dtr')->once()
            ->with(Mockery::on(function ($sorted) {
                return array_map(function ($l) { return $l->id; }, $sorted) === [20, 10, 30, 40];
            }), 2, '2026-07-01', '2026-07-15')
            ->andReturn(['bound' => 4]);

        $res = $this->makeCommand(syncBhrLeaves::class, ['country_code' => 'PH'])->handle();

        $this->assertSame(201, $res->getStatusCode());
        $this->assertSame(['bound' => 4], $res->getData(true)['content']);
    }

    // =====================================================================================
    // syncBhrLeaves — PHASE 4: failure handling
    // =====================================================================================

    /** @test */
    public function a_bamboo_outage_during_the_leave_sync_is_reported_and_nothing_is_written_to_the_dtr()
    {
        list($bhr, $dtr, $cutoff) = $this->bindLeaveDeps();
        $cutoff->shouldReceive('get_payroll_cutoff')->once()->andReturn($this->cutoffRow());
        $bhr->shouldReceive('get_leaves')->once()->andThrow(new \Exception('BambooHR leaves endpoint down'));
        $dtr->shouldNotReceive('bind_leaves_to_dtr');

        $res = $this->makeCommand(syncBhrLeaves::class, ['country_code' => 'PH'])->handle();

        $this->assertSame(400, $res->getStatusCode());
        $this->assertSame('BambooHR leaves endpoint down', $res->getData(true)['error']['content']);
    }

    /** @test */
    public function a_dtr_write_failure_during_the_leave_sync_is_reported_rather_than_crashing_the_cron()
    {
        list($bhr, $dtr, $cutoff) = $this->bindLeaveDeps();
        $cutoff->shouldReceive('get_payroll_cutoff')->once()->andReturn($this->cutoffRow());
        $bhr->shouldReceive('get_leaves')->once()->andReturn([]);
        $dtr->shouldReceive('bind_leaves_to_dtr')->once()
            ->andThrow(new \Exception('DTR rows locked'));

        $res = $this->makeCommand(syncBhrLeaves::class, ['country_code' => 'PH'])->handle();

        $this->assertSame(400, $res->getStatusCode());
        $this->assertSame('DTR rows locked', $res->getData(true)['error']['content']);
    }
}
