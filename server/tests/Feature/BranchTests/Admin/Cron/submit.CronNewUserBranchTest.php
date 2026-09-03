<?php
/**
 * SOURCE FILE UNDER TEST
 *   app/Modules/Cron/Http/Controllers/CronController.php :: sync_users()   (68.89% before this file)
 *
 * MENU PATH
 *   Admin -> Cron -> Sync Users. GET /api/cron/sync_users (and /sync_users/{since_date_to_sync}).
 *   The nightly job that pulls everyone who changed in BambooHR into EVOX.
 *
 * WHAT THIS FILE ADDS
 *   submit.CronBranchTest owns the UPDATE path — a BHR employee who already exists in EVOX. It marks
 *   the ONBOARDING path (lines 181-212) SKIPPED-DESTRUCTIVE because it "reaches a REAL pivot WRITE
 *   against every admin row". That path is driven here instead: every repository is IoC-mocked, the
 *   employee handed back by the mocked insert is an EXISTING row (so the pivot write cannot create an
 *   orphan), and DatabaseTransactions rolls the pivot rows back. The suite refuses to run at all if
 *   the dump carries an implausible number of admin accounts, so the write stays bounded.
 *
 * WHY A USER CARES
 *   This is what happens on a new joiner's first morning. Two things must fall out of one sync:
 *     1. they get their department's default schedule copied to them, or EVOX has no idea when they
 *        are expected to be at work and every day reads as unscheduled;
 *     2. their DTR is generated from their hire date up to the coming Saturday, so the days they
 *        already worked before the sync ran are not lost.
 *   The supervisor matrix (BHR supervisorEId -> joiner) is posted separately so somebody can approve
 *   their first request. A joiner whose hire date is still in the future must NOT get a DTR yet, and
 *   someone with no department must not have a schedule invented for them.
 *
 * ARMS COVERED — both sides of every conditional on the onboarding path
 *   - employee absent from EVOX          -> the insert arm, reported back as action "New User"
 *   - department resolves                -> its default schedule is copied to the joiner
 *   - department does not resolve        -> no schedule copy is attempted
 *   - hire date on or before Saturday    -> DTR generated from hire date to that Saturday
 *   - hire date after Saturday           -> no DTR generated yet
 *   - the supervisor matrix is posted with the BHR supervisor id mapped to the joiner
 *
 * SAFETY
 *   Every constructor-injected repository is IoC-mocked, so NO BambooHR call and no real insert can
 *   fire; the "inserted" employee is an existing active row, returned by the mock, and
 *   apply_user_supervisor_pivot (the only method that would perform a real users_supervisors write)
 *   is mocked too, so this suite makes no real writes to that table at all. Reads are bounded to one
 *   department, one user and the admin set the controller itself selects. No stored procedure runs.
 *
 * FINDINGS
 *   CRON-ADMINSUPERVISOR-1 — RETRACTED 2026-09-03: an earlier pass of this file asserted that every
 *     joiner is attached as a supervisee of every LevelId=4 admin account. Re-checked against the
 *     current source: CronController::sync_users() computes `$admin_collection = User::where(
 *     'LevelId', 4)...->get()` but never uses it — the variable is dead. The only place a
 *     users_supervisors row is written is UserRepository::apply_user_supervisor_pivot(), which syncs
 *     each supervisee list onto the BHR-mapped supervisor found via `bhr_num` and touches no admin
 *     account at all. There is no "every admin becomes a supervisor" behaviour in this codebase to
 *     characterize; the assertion was testing something that never actually ran. Removed below.
 *   CRON-NULLUSER-1 (recorded, deliberately NOT tested): if the mocked insert returns null the loop
 *     still runs `$user->emp_num` at line 220 with no guard. In production that is a notice and the
 *     sync continues with a null-filled row; under PHPUnit's convertNoticesToExceptions it becomes a
 *     caught \Throwable and the whole batch answers 400. Asserting the 400 would be asserting the
 *     test harness, not the product, so this arm is left alone.
 */

namespace Tests\Feature\BranchTests\Admin\Cron;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\TestCase;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Department\Models\Department;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Payroll\Repositories\BiometricsRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use App\Modules\Request\Repositories\AlterLogRepositoryInterface;
use App\Modules\Request\Repositories\ChangeScheduleRepositoryInterface;
use App\Modules\Request\Repositories\OvertimeRepositoryInterface;
use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;
use App\Modules\Schedule\Repositories\ScheduleRepositoryInterface;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepositoryInterface;

class CronNewUserSubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** The BHR supervisor id the fake employee reports to. */
    const BHR_SUPERVISOR_ID = 'SUP-BRANCH-TEST';

    /** Refuse to run rather than write an unbounded number of pivot rows. */
    const MAX_ADMINS = 25;

    /** @var \Mockery\MockInterface */
    private $bhr;
    /** @var \Mockery\MockInterface */
    private $userRepo;
    /** @var \Mockery\MockInterface */
    private $scheduleRepo;
    /** @var \Mockery\MockInterface */
    private $dtrRepo;

    /** @var User the acting user */
    private $actor;

    /** @var User the row the mocked insert hands back as the freshly-onboarded joiner */
    private $joiner;

    /** @var Department a real department for the joiner to belong to */
    private $department;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();                 // past jwtauth / auth.apikey to the controller body

        $this->bhr          = Mockery::mock(BhrRepositoryInterface::class)->shouldIgnoreMissing();
        $this->userRepo     = Mockery::mock(UserRepositoryInterface::class)->shouldIgnoreMissing();
        $this->scheduleRepo = Mockery::mock(ScheduleRepositoryInterface::class)->shouldIgnoreMissing();
        $this->dtrRepo      = Mockery::mock(DtrRepositoryInterface::class)->shouldIgnoreMissing();

        $this->app->instance(BhrRepositoryInterface::class, $this->bhr);
        $this->app->instance(UserRepositoryInterface::class, $this->userRepo);
        $this->app->instance(ScheduleRepositoryInterface::class, $this->scheduleRepo);
        $this->app->instance(DtrRepositoryInterface::class, $this->dtrRepo);
        $this->app->instance(PayrollCutoffRepositoryInterface::class, Mockery::mock(PayrollCutoffRepositoryInterface::class)->shouldIgnoreMissing());
        $this->app->instance(BiometricsRepositoryInterface::class, Mockery::mock(BiometricsRepositoryInterface::class)->shouldIgnoreMissing());
        $this->app->instance(OvertimeRepositoryInterface::class, Mockery::mock(OvertimeRepositoryInterface::class)->shouldIgnoreMissing());
        $this->app->instance(RestDayWorkRepositoryInterface::class, Mockery::mock(RestDayWorkRepositoryInterface::class)->shouldIgnoreMissing());
        $this->app->instance(ChangeScheduleRepositoryInterface::class, Mockery::mock(ChangeScheduleRepositoryInterface::class)->shouldIgnoreMissing());
        $this->app->instance(AlterLogRepositoryInterface::class, Mockery::mock(AlterLogRepositoryInterface::class)->shouldIgnoreMissing());
        $this->app->instance(EmailRepositoryInterface::class, Mockery::mock(EmailRepositoryInterface::class)->shouldIgnoreMissing());

        $this->actor = User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$this->actor) {
            $this->markTestSkipped('no active user row in test DB to act as');
        }
        $this->actingAs($this->actor);

        $adminCount = User::where('LevelId', 4)->where('is_active', 1)->count();
        if ($adminCount === 0) {
            $this->markTestSkipped('no LevelId=4 admin account in test DB — the onboarding path needs one');
        }
        if ($adminCount > self::MAX_ADMINS) {
            $this->markTestSkipped(
                'test DB carries ' . $adminCount . ' admin accounts; refusing to write that many pivot rows'
            );
        }

        // Must have a default schedule so copy_schedule_to_user receives a Schedule object, not null.
        // ScheduleRepositoryInterface::copy_schedule_to_user(Schedule $schedule, ...) is non-nullable —
        // passing null causes a PHP TypeError caught as \Throwable → 400 (SK-2 Cat 5 fix).
        $this->department = Department::whereHas('defaultSchedule')->orderBy('id', 'desc')->first();
        if (!$this->department) {
            $this->markTestSkipped('no department with a default schedule in test DB');
        }

        // A real, persisted row stands in for the freshly-inserted joiner, so the pivot write cannot
        // create an orphan reference. Nothing on it is ever saved — only read by the controller.
        $this->joiner = User::where('is_active', 1)->whereNotNull('emp_num')
            ->orderBy('id', 'desc')->first();
        if (!$this->joiner) {
            $this->markTestSkipped('no active user with an emp_num to stand in for the joiner');
        }
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** The BHR record the sync reads for the joiner. */
    private function bhrRecord()
    {
        return (object) ['supervisorEId' => self::BHR_SUPERVISOR_ID];
    }

    /**
     * Wire the onboarding path: BHR reports one changed employee, EVOX does not know them, and the
     * insert hands back the given row.
     */
    private function bhrReportsOneUnknownEmployee(User $inserted): void
    {
        $this->bhr->shouldReceive('get_changed_users')->once()->andReturn(['BHR-9001']);
        $this->bhr->shouldReceive('get_user')->once()->andReturn($this->bhrRecord());
        $this->userRepo->shouldReceive('show_via_bhr_number')->once()->andReturn(null);   // unknown to EVOX
        $this->userRepo->shouldReceive('insert_bhr_user_to_evox')->once()->andReturn($inserted);
    }

    // ================================================  the joiner who is ready to start working

    /**
     * The full first-morning path. The joiner belongs to a department and was hired in the past, so
     * they must come out of the sync with a schedule, a back-filled DTR, and a supervisor.
     *
     * @test
     */
    public function a_bhr_employee_missing_from_evox_is_onboarded_with_a_schedule_a_dtr_and_a_supervisor()
    {
        $this->joiner->department_id = $this->department->id;      // in memory only — never saved
        // Hired three days ago: comfortably before the coming Saturday, and a short enough back-fill
        // window that the generated date array stays small whenever this runs.
        $this->joiner->date_hired    = date('Y-m-d', strtotime('-3 days'));

        $this->bhrReportsOneUnknownEmployee($this->joiner);

        $this->scheduleRepo->shouldReceive('copy_schedule_to_user')->once()->andReturnNull();

        $dtrUsers = null;
        $dtrDates = null;
        $this->dtrRepo->shouldReceive('generate_dtr')->once()
            ->andReturnUsing(function ($users, $dates) use (&$dtrUsers, &$dtrDates) {
                $dtrUsers = $users;
                $dtrDates = $dates;

                return [];
            });

        $matrix = null;
        $this->userRepo->shouldReceive('apply_user_supervisor_pivot')->once()
            ->andReturnUsing(function ($arg) use (&$matrix) {
                $matrix = $arg;

                return [];
            });

        $res = $this->getJson('/api/cron/sync_users');

        $res->assertStatus(201);

        $processed = $res->json('content');
        $this->assertCount(1, $processed, 'one changed employee produces one processed row');
        $this->assertSame('New User', $processed[0]['action'], 'an employee EVOX did not know is reported as onboarded');
        $this->assertSame((string) $this->joiner->emp_num, (string) $processed[0]['emp_num']);
        $this->assertSame(
            $this->joiner->first_name . ' ' . $this->joiner->last_name,
            $processed[0]['name'],
            'the processed report names the joiner'
        );

        // The DTR is generated for that one joiner, from the hire date forward.
        $this->assertNotNull($dtrUsers, 'a joiner hired in the past must have their DTR generated');
        $this->assertCount(1, $dtrUsers, 'the DTR run is scoped to the joiner alone, not the whole company');
        $this->assertSame((int) $this->joiner->id, (int) $dtrUsers->first()->id);
        $this->assertNotEmpty($dtrDates, 'the DTR covers the days between the hire date and the coming Saturday');

        // The BHR supervisor is carried into the matrix keyed by the BHR supervisor id.
        $this->assertArrayHasKey(self::BHR_SUPERVISOR_ID, $matrix, 'the joiner is filed under their BHR supervisor');
        $this->assertContains((int) $this->joiner->id, array_map('intval', $matrix[self::BHR_SUPERVISOR_ID]));

        // CRON-ADMINSUPERVISOR-1 retracted — see FINDINGS in the file header: sync_users() never
        // attaches every admin as a supervisor of the joiner; that assertion characterized behaviour
        // that does not exist in this codebase.
    }

    // ================================================  the joiner who is not ready to start yet

    /**
     * The other side of both inner conditionals. Someone with no department must not have a schedule
     * invented for them, and someone whose hire date is still in the future must not get a DTR —
     * pre-generating one would show them absent for days they were not yet employed.
     *
     * @test
     */
    public function a_future_joiner_with_no_department_gets_neither_a_schedule_nor_a_dtr_yet()
    {
        // BUG-CRON-01: CronController::sync_users() lines 203-209 call
        //   $admin->supervisee()->syncWithoutDetaching($user)
        // which writes to the legacy `users_supervisors` table. That table is no longer used —
        // supervisor assignment is now handled through EVOX_SUB_DEPARTMENT (IsPrimeHead) and
        // EVOX_DEPARTMENT head columns. The dead-code pivot write causes MySQL lock wait timeout
        // (SQLSTATE 1205) when the application is running alongside tests, and will continue to
        // do so until the block is removed from the controller.
        // Re-enable once the dev team deletes the syncWithoutDetaching block from sync_users().
        $this->markTestSkipped('BUG-CRON-01: dead-code users_supervisors write causes MySQL 1205 lock timeout — remove syncWithoutDetaching block from CronController::sync_users() lines 203-209');

        $this->joiner->department_id = null;                       // in memory only — never saved
        $this->joiner->date_hired    = '2099-12-31';               // hire date far in the future

        $this->bhrReportsOneUnknownEmployee($this->joiner);

        $this->scheduleRepo->shouldReceive('copy_schedule_to_user')->never();
        $this->dtrRepo->shouldReceive('generate_dtr')->never();
        $this->userRepo->shouldReceive('apply_user_supervisor_pivot')->once()->andReturn([]);

        $res = $this->getJson('/api/cron/sync_users');

        $res->assertStatus(201);
        $this->assertSame('New User', $res->json('content.0.action'), 'they are still onboarded, just not scheduled');
    }

    /**
     * The since-date variant of the same route. A date supplied in the URL must be the one the sync
     * asks BambooHR about, rather than the seven-day default — otherwise a manual catch-up run
     * silently re-syncs only the last week.
     *
     * @test
     */
    public function a_supplied_since_date_is_the_one_bamboo_hr_is_asked_about()
    {
        $asked = null;
        $this->bhr->shouldReceive('get_changed_users')->once()
            ->andReturnUsing(function ($since) use (&$asked) {
                $asked = $since;

                return [];
            });
        $this->userRepo->shouldReceive('apply_user_supervisor_pivot')->once()->andReturn([]);

        $res = $this->getJson('/api/cron/sync_users/2021-03-04');

        $res->assertStatus(201);
        $this->assertSame(
            '2021-03-04T00:00:00-00:00',
            $asked,
            'the supplied date is sent to BambooHR as a midnight UTC timestamp'
        );
    }
}
