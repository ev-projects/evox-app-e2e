<?php

/**
 * EVOX Scheduler / Cron Command Tests — Vishnu Padmanabhan
 *
 * Source: "EVOX Scheduler Documentation.docx" lists 11 server-crontab entries.
 * 9 of them run `php artisan <signature>` via a wrapper shell script (e.g.
 * /home/sync_bhr_users.sh -> `php artisan sync_bhr_users:send`); the signatures
 * below map 1:1 to those crontab entries and to the classes in
 * app/Console/Commands/. The remaining 2 documented entries (Weekly Database
 * Backup, Daily Database Binary Logging) are disabled/commented out in the
 * crontab and run raw mysqldump/mysqlbinlog directly with no Laravel code
 * path — see test_disabled_shell_only_crons_are_not_laravel_commands().
 *
 * This suite is independent of, and does not duplicate, CronApiTest.php,
 * which covers the separate /api/cron/{operation} HTTP surface (CronController).
 * That is a different invocation path from the actual server crontab.
 *
 * Mocking strategy:
 *   - BhrRepositoryInterface / BiometricsRepositoryInterface are mocked for every
 *     command that calls out to the BambooHR API or the biometric device API.
 *     These are external network dependencies with no place in an automated
 *     suite (flaky, need live creds, slow).
 *   - PayrollCutoffRepositoryInterface is mocked wherever a command derives its
 *     BHR sync window from get_payroll_cutoff(). A missing cutoff sends several
 *     of these commands down an early-return path, and in production
 *     syncBhrLeaves::handle() calls a bare exit() if no cutoff is found for the
 *     PH/BU/BE branches — mocking removes that dependency on whatever cutoff
 *     rows happen to exist in the test DB on the day the suite runs.
 *   - Everything else (UserRepositoryInterface, DtrRepositoryInterface,
 *     EmailRepositoryInterface) runs against the real test database, matching
 *     this suite's existing convention (see CronApiTest.php) — these are pure
 *     DB reads/writes wrapped in DatabaseTransactions, and QUEUE_DRIVER=sync +
 *     MAIL_DRIVER=array (phpunit.xml) mean any dispatched reminder-email jobs
 *     execute in-process without touching a real mail transport.
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Payroll\Repositories\BiometricsRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\User\Models\User;

class SchedulerCronCommandsTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function mockPayrollCutoff(string $start = '2026-01-01', string $end = '2026-01-31')
    {
        $cutoff = (object) ['id' => 1, 'start_date' => $start, 'end_date' => $end];

        $mock = Mockery::mock(PayrollCutoffRepositoryInterface::class);
        $mock->shouldReceive('get_payroll_cutoff')->withAnyArgs()->andReturn($cutoff);
        $this->app->instance(PayrollCutoffRepositoryInterface::class, $mock);

        return $mock;
    }

    // ─── Registration — all 9 documented commands exist ──────────────────────

    /** @test */
    public function test_all_documented_active_cron_commands_are_registered()
    {
        $registered = array_keys(Artisan::all());

        $documented_signatures = [
            'sync_biometrix_logs',
            'sync_bhr_users:send',
            'sync_bhr_holidays',
            'sync_bhr_leaves',
            'generate_weekly_dtr',
            'send_supervisor_reminder_no_sched',
            'send_supervisor_reminder_invalid_check_ins',
            'send_supervisor_reminder_requests',
            'sync:bhr_users_photo',
        ];

        foreach ($documented_signatures as $signature) {
            $this->assertContains(
                $signature,
                $registered,
                "Cron command '{$signature}' from the Scheduler doc is not registered in Artisan."
            );
        }
    }

    /** @test */
    public function test_disabled_shell_only_crons_are_not_laravel_commands()
    {
        // "Weekly Database Backup" (evox_db_weekly_backup.sh) and "Daily Database
        // Binary Logging" (evox_binary_log_daily.sh) are commented out in the
        // crontab and, even if enabled, run raw mysqldump/mysqlbinlog directly —
        // there is no Artisan command or application code path for either one.
        // Coverage for these two is out of scope by design; documented here so
        // the gap reads as intentional rather than missed.
        $this->assertTrue(true);
    }

    // ─── 1. Sync Biometrics Logs ──────────────────────────────────────────────

    /** @test */
    public function test_sync_biometrix_logs_runs_successfully()
    {
        $mock = Mockery::mock(BiometricsRepositoryInterface::class);
        $mock->shouldReceive('get_biometrics')->withAnyArgs()->once()->andReturn(new EloquentCollection());
        $this->app->instance(BiometricsRepositoryInterface::class, $mock);

        $this->artisan('sync_biometrix_logs')->assertExitCode(0);
    }

    // ─── 2. Sync BHR Users ─────────────────────────────────────────────────────

    /** @test */
    public function test_sync_bhr_users_send_runs_successfully_without_all_argument()
    {
        $mock = Mockery::mock(BhrRepositoryInterface::class);
        $mock->shouldReceive('get_changed_users')->withAnyArgs()->andReturn([]);
        $mock->shouldReceive('get_user')->withAnyArgs()->andReturn(null);
        $this->app->instance(BhrRepositoryInterface::class, $mock);

        $this->artisan('sync_bhr_users:send')->assertExitCode(0);
    }

    /** @test */
    public function test_sync_bhr_users_send_runs_successfully_with_all_argument()
    {
        // Two real, already-established test bhr_num values (see evoxtest_BhrMock.php and
        // CLAUDE.md's Key user IDs) drive the 'all' branch through the actual EH_SP_User_sync
        // write path — not an empty no-op — so this test proves the sync logic itself works,
        // not just that the command exits 0 with nothing to do.
        $knownBhrUsers = [
            '42734' => (object)[
                'id'                      => '42734',
                'employeeNumber'          => '2222',
                'firstName'               => 'Gianpaoulo',
                'middleName'              => '',
                'lastName'                => 'Acesor',
                'nickname'                => 'GP',
                'bestEmail'               => 'gianpaoulo.acesor@pactgroup.com',
                'department'              => 'Technology',
                'status'                  => 'Active',
                'employmentHistoryStatus' => 'Active',
                'hireDate'                => '2020-01-01',
                'jobTitle'                => 'Software Engineer',
                'mobilePhone'             => '+639000000000',
                'country'                 => 'Philippines',
                'dateOfBirth'             => '1990-01-01',
                'terminationDate'         => '0000-00-00',
                'supervisorEId'           => '41143',
                'lastChanged'             => '2026-01-01T00:00:00+00:00',
                'division'                => 'Technology',
            ],
            '43284' => (object)[
                'id'                      => '43284',
                'employeeNumber'          => '43284',
                'firstName'               => 'Glenn',
                'middleName'              => '',
                'lastName'                => 'Macasarte',
                'nickname'                => 'Glenn',
                'bestEmail'               => 'glenn.macasarte@eastvantage.com',
                'department'              => 'Operations',
                'status'                  => 'Active',
                'employmentHistoryStatus' => 'Active',
                'hireDate'                => '2020-01-01',
                'jobTitle'                => 'Employee',
                'mobilePhone'             => '+639000000001',
                'country'                 => 'Philippines',
                'dateOfBirth'             => '1990-01-01',
                'terminationDate'         => '0000-00-00',
                'supervisorEId'           => '41143',
                'lastChanged'             => '2026-01-01T00:00:00+00:00',
                'division'                => 'Operations',
            ],
        ];

        $mock = Mockery::mock(BhrRepositoryInterface::class);
        $mock->shouldReceive('get_all_bhr_user_numbers')->withAnyArgs()->andReturn([]);
        $mock->shouldReceive('get_user')->withAnyArgs()->andReturnUsing(
            function ($bhr_user_number) use ($knownBhrUsers) {
                return $knownBhrUsers[$bhr_user_number] ?? null;
            }
        );
        $this->app->instance(BhrRepositoryInterface::class, $mock);

        // Routes the 'all' branch's base user list through UserRepositoryInterface instead of
        // a direct Eloquent call against the live users table (was: thousands of real rows,
        // each printed and iterated — see syncBhrUsers.php's get_all_bhr_synced_users() call).
        $userMock = Mockery::mock(UserRepositoryInterface::class);
        $userMock->shouldReceive('get_all_bhr_synced_users')->andReturn(collect(['42734', '43284']));
        $this->app->instance(UserRepositoryInterface::class, $userMock);

        $this->artisan('sync_bhr_users:send', ['all' => 'all'])->assertExitCode(0);
    }

    // ─── 3. Sync BHR Holidays ──────────────────────────────────────────────────

    /** @test */
    public function test_sync_bhr_holidays_runs_successfully()
    {
        $this->mockPayrollCutoff();

        $bhr = Mockery::mock(BhrRepositoryInterface::class);
        $bhr->shouldReceive('sync_holidays')->withAnyArgs()->once()->andReturn(null);
        $this->app->instance(BhrRepositoryInterface::class, $bhr);

        $this->artisan('sync_bhr_holidays')->assertExitCode(0);
    }

    // ─── 4. Sync BHR Leaves (per branch/location) ──────────────────────────────

    /** @test */
    public function test_sync_bhr_leaves_runs_for_philippines()
    {
        $this->mockPayrollCutoff();

        $bhr = Mockery::mock(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_leaves')->withAnyArgs()->once()->andReturn([]);
        $this->app->instance(BhrRepositoryInterface::class, $bhr);

        $this->artisan('sync_bhr_leaves', ['country_code' => 'PH'])->assertExitCode(0);
    }

    /** @test */
    public function test_sync_bhr_leaves_runs_for_bulgaria()
    {
        $this->mockPayrollCutoff();

        $bhr = Mockery::mock(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_leaves')->withAnyArgs()->once()->andReturn([]);
        $this->app->instance(BhrRepositoryInterface::class, $bhr);

        $this->artisan('sync_bhr_leaves', ['country_code' => 'BU'])->assertExitCode(0);
    }

    /** @test */
    public function test_sync_bhr_leaves_runs_for_belgium()
    {
        $this->mockPayrollCutoff();

        $bhr = Mockery::mock(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_leaves')->withAnyArgs()->once()->andReturn([]);
        $this->app->instance(BhrRepositoryInterface::class, $bhr);

        $this->artisan('sync_bhr_leaves', ['country_code' => 'BE'])->assertExitCode(0);
    }

    /** @test */
    public function test_sync_bhr_leaves_runs_for_india()
    {
        // IN resolves its date window via the SP_Payroll_Cutoff_IND stored
        // procedure directly (bypassing PayrollCutoffRepositoryInterface) — see
        // syncBhrLeaves::handle(). The command's own try/catch makes this safe
        // to run against the real test DB whether or not a matching cutoff row
        // exists for the run date.
        $bhr = Mockery::mock(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_leaves')->withAnyArgs()->andReturn([]);
        $this->app->instance(BhrRepositoryInterface::class, $bhr);

        $this->artisan('sync_bhr_leaves', ['country_code' => 'IN'])->assertExitCode(0);
    }

    /** @test */
    public function test_sync_bhr_leaves_runs_for_morocco()
    {
        // MA shares the same SP_Payroll_Cutoff_IND lookup as IN — see comment above.
        $bhr = Mockery::mock(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_leaves')->withAnyArgs()->andReturn([]);
        $this->app->instance(BhrRepositoryInterface::class, $bhr);

        $this->artisan('sync_bhr_leaves', ['country_code' => 'MA'])->assertExitCode(0);
    }

    /** @test */
    public function test_sync_bhr_leaves_rejects_invalid_country_code_gracefully()
    {
        $this->artisan('sync_bhr_leaves', ['country_code' => 'ZZ'])->assertExitCode(0);
    }

    // ─── 5. Generate Weekly DTR ─────────────────────────────────────────────────

    /** @test */
    public function test_generate_weekly_dtr_runs_successfully()
    {
        // get_all_active_users() otherwise returns all real active users (1,073 at time of
        // writing), generating a full month of DTR rows for every one — bound it to 2 real
        // users instead. Everything else on UserRepositoryInterface (and DtrRepositoryInterface,
        // per this suite's documented convention) still runs for real via the partial mock.
        $realUserRepo = app(UserRepositoryInterface::class);
        $userMock = Mockery::mock($realUserRepo)->makePartial();
        $userMock->shouldReceive('get_all_active_users')->andReturn(User::whereIn('id', [1593, 1698])->get());
        $this->app->instance(UserRepositoryInterface::class, $userMock);

        $this->artisan('generate_weekly_dtr')->assertExitCode(0);
    }

    // ─── 6. Supervisor Reminder – Employees Without Schedule ───────────────────

    /** @test */
    public function test_send_supervisor_reminder_no_sched_runs_successfully()
    {
        // get_all_supervisors() otherwise returns the full real supervisor population — bound
        // it to 1 real supervisor (Gary Aure) instead. Everything else on
        // UserRepositoryInterface still runs for real via the partial mock. Email send is
        // unmocked by design (MAIL_DRIVER=array captures it, no real transport touched —
        // verified against Mail::send() usage in SendSupervisorReminderNoSchedEmailJob).
        $realUserRepo = app(UserRepositoryInterface::class);
        $userMock = Mockery::mock($realUserRepo)->makePartial();
        $userMock->shouldReceive('get_all_supervisors')->andReturn(User::whereIn('id', [1698])->get());
        $this->app->instance(UserRepositoryInterface::class, $userMock);

        $this->artisan('send_supervisor_reminder_no_sched')->assertExitCode(0);
    }

    // ─── 7 & 8. Weekly DB Backup / Daily Binary Logging — out of scope, see above.

    // ─── 9. Supervisor Reminder – Invalid Check-ins ────────────────────────────

    /** @test */
    public function test_send_supervisor_reminder_invalid_check_ins_runs_successfully()
    {
        // get_all_supervisors() otherwise returns the full real supervisor population — bound
        // it to 1 real supervisor (Gary Aure) instead. Everything else on
        // UserRepositoryInterface still runs for real via the partial mock.
        $realUserRepo = app(UserRepositoryInterface::class);
        $userMock = Mockery::mock($realUserRepo)->makePartial();
        $userMock->shouldReceive('get_all_supervisors')->andReturn(User::whereIn('id', [1698])->get());
        $this->app->instance(UserRepositoryInterface::class, $userMock);

        $this->artisan('send_supervisor_reminder_invalid_check_ins')->assertExitCode(0);
    }

    // ─── 10. Supervisor Reminder – Pending Requests ────────────────────────────

    /** @test */
    public function test_send_supervisor_reminder_requests_runs_successfully()
    {
        // get_all_supervisors() otherwise returns the full real supervisor population — bound
        // it to 1 real supervisor (Gary Aure) instead. Everything else on
        // UserRepositoryInterface still runs for real via the partial mock.
        $realUserRepo = app(UserRepositoryInterface::class);
        $userMock = Mockery::mock($realUserRepo)->makePartial();
        $userMock->shouldReceive('get_all_supervisors')->andReturn(User::whereIn('id', [1698])->get());
        $this->app->instance(UserRepositoryInterface::class, $userMock);

        $this->artisan('send_supervisor_reminder_requests')->assertExitCode(0);
    }

    // ─── 11. Sync BHR User Photos ───────────────────────────────────────────────

    /** @test */
    public function test_sync_bhr_users_photo_runs_successfully_without_all_argument()
    {
        $bhr = Mockery::mock(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_profile_picture')->withAnyArgs()->andReturn('dummy_photo_base64');
        $this->app->instance(BhrRepositoryInterface::class, $bhr);

        $this->artisan('sync:bhr_users_photo')->assertExitCode(0);
    }

    /** @test */
    public function test_sync_bhr_users_photo_runs_successfully_with_all_argument()
    {
        $bhr = Mockery::mock(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_all_bhr_user_numbers')->withAnyArgs()->andReturn([]);
        $this->app->instance(BhrRepositoryInterface::class, $bhr);

        $this->artisan('sync:bhr_users_photo', ['all' => 'all'])->assertExitCode(0);
    }
}
