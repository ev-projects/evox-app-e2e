<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for CronController::{initial_sync_of_users,sync_users,
 * generate_weekly_dtr,sync_realtime_biometrics,sync_holidays,sync_leaves} arms. Menu=Admin Page=Cron.
 *
 * SAFETY: Every constructor-injected repo is IoC-mocked via $this->app->instance(...). The BHR repo
 * (get_all_bhr_user_numbers / get_changed_users / get_user / get_biometrics / get_leaves / sync_holidays)
 * and the user/dtr/schedule/biometrics repos are ALL mocked, so NO real BHR call and NO real user/DTR
 * write ever fires. Mocked BHR methods return SMALL fixtures (0-1 items). No test iterates the users
 * table through real BHR calls or writes.
 *
 * SKIPPED arms:
 *  // SKIPPED-DESTRUCTIVE  sync_users() "new user" (insert) branch — the else of show_via_bhr_number()==null
 *     reaches (a) $user->department()->first() as a REAL Eloquent read on the freshly-inserted model and
 *     (b) $admin->supervisee()->syncWithoutDetaching($user), a REAL pivot WRITE against every admin row
 *     returned by Role::findByName('admin')->users()->get() — neither is mockable here. All sync_users
 *     tests therefore drive the UPDATE path only (show_via_bhr_number returns a valid user), which is
 *     fully mocked. The insert branch (and its inner department/schedule/DTR/admin arms) is skipped.
 *
 * NOTES (real reads that are bounded / reference-only, unavoidable controller behavior — not our queries):
 *  // NOTE  UtcTimelog::all() (initial_sync_of_users, sync_users) reads a tiny timezone reference table.
 *  // NOTE  Role::findByName('admin')->users()->get() (sync_users) reads the small admin-user set; every
 *          sync_users test assumes the 'admin' role exists in the seeded/dump DB (else it 400s).
 *  // NOTE  generate_weekly_dtr with ?id= uses User::where('id',<bogus>)->get() — SCOPED to one id (bounded).
 *
 * FINDINGS:
 *  // FINDING: sync_leaves() catches \Throwable (not Exception like the other five). error_response() only
 *             unwraps ->getMessage() when the content `instanceof Exception`; a raw \Error would be passed
 *             through as content. Not exercised here (we throw \Exception, which is a \Throwable) — noted only.
 */

namespace Tests\Feature\BranchTests\Admin\Cron;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Request\Repositories\OvertimeRepositoryInterface;
use App\Modules\Schedule\Repositories\ScheduleRepositoryInterface;
use App\Modules\Payroll\Repositories\BiometricsRepositoryInterface;
use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;
use App\Modules\Request\Repositories\ChangeScheduleRepositoryInterface;
use App\Modules\Request\Repositories\AlterLogRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;

class CronSubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var \Mockery\MockInterface */
    protected $bhr;
    /** @var \Mockery\MockInterface */
    protected $payrollCutoff;
    /** @var \Mockery\MockInterface */
    protected $userRepo;
    /** @var \Mockery\MockInterface */
    protected $dtr;
    /** @var \Mockery\MockInterface */
    protected $schedule;
    /** @var \Mockery\MockInterface */
    protected $biometrics;
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();

        // IoC-mock EVERY constructor-injected dependency so the container never resolves a real repo,
        // guaranteeing no real BHR call / DB write can fire from any branch under test.
        $this->bhr           = Mockery::mock(BhrRepositoryInterface::class)->shouldIgnoreMissing();
        $this->payrollCutoff = Mockery::mock(PayrollCutoffRepositoryInterface::class)->shouldIgnoreMissing();
        $this->userRepo      = Mockery::mock(UserRepositoryInterface::class)->shouldIgnoreMissing();
        $this->dtr           = Mockery::mock(DtrRepositoryInterface::class)->shouldIgnoreMissing();
        $this->schedule      = Mockery::mock(ScheduleRepositoryInterface::class)->shouldIgnoreMissing();
        $this->biometrics    = Mockery::mock(BiometricsRepositoryInterface::class)->shouldIgnoreMissing();

        $this->app->instance(BhrRepositoryInterface::class, $this->bhr);
        $this->app->instance(PayrollCutoffRepositoryInterface::class, $this->payrollCutoff);
        $this->app->instance(UserRepositoryInterface::class, $this->userRepo);
        $this->app->instance(DtrRepositoryInterface::class, $this->dtr);
        $this->app->instance(ScheduleRepositoryInterface::class, $this->schedule);
        $this->app->instance(BiometricsRepositoryInterface::class, $this->biometrics);
        // Remaining constructor deps — all shouldIgnoreMissing so unexpected calls don't throw.
        $this->app->instance(OvertimeRepositoryInterface::class, Mockery::mock(OvertimeRepositoryInterface::class)->shouldIgnoreMissing());
        $this->app->instance(RestDayWorkRepositoryInterface::class, Mockery::mock(RestDayWorkRepositoryInterface::class)->shouldIgnoreMissing());
        $this->app->instance(ChangeScheduleRepositoryInterface::class, Mockery::mock(ChangeScheduleRepositoryInterface::class)->shouldIgnoreMissing());
        $this->app->instance(AlterLogRepositoryInterface::class, Mockery::mock(AlterLogRepositoryInterface::class)->shouldIgnoreMissing());
        $this->app->instance(EmailRepositoryInterface::class, Mockery::mock(EmailRepositoryInterface::class)->shouldIgnoreMissing());

        $this->user = User::where('is_active', 1)->first();
        if ($this->user) {
            $this->actingAs($this->user);
        }
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** Small fixture doubles — never real records. */
    private function fakeBhrUser()
    {
        return (object) ['supervisorEId' => 'SUP-1'];
    }
    private function fakeEvoxUser()
    {
        $u = new User();
        $u->id = 1;
        $u->emp_num = 'E0001';
        $u->first_name = 'Fix';
        $u->last_name = 'Ture';
        return $u;
    }

    // ============================================================ initial_sync_of_users()
    // GET /api/cron/initial_sync_of_users  -> success_response(..., HTTP_CREATED = 201)

    public function test_initialSyncOfUsers__submit__empty_bhr_list__created_201()
    {
        // try arm: BHR returns 0 numbers -> foreach body never entered -> apply_user_supervisor_pivot([]).
        $this->bhr->shouldReceive('get_all_bhr_user_numbers')->once()->andReturn([]);
        $this->userRepo->shouldReceive('apply_user_supervisor_pivot')->once()->andReturn([]);

        $response = $this->getJson('/api/cron/initial_sync_of_users');

        $response->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    public function test_initialSyncOfUsers__submit__valid_user__created_201()
    {
        // try arm: is_valid($bhr_user) TRUE + is_valid($user) TRUE -> pivot populated (all via mocks, no write).
        $this->bhr->shouldReceive('get_all_bhr_user_numbers')->once()->andReturn([101]);
        $this->bhr->shouldReceive('get_user')->with(101, true)->once()->andReturn($this->fakeBhrUser());
        $this->userRepo->shouldReceive('insert_bhr_user_to_evox')->once()->andReturn($this->fakeEvoxUser());
        $this->userRepo->shouldReceive('apply_user_supervisor_pivot')->once()->andReturn([]);

        $response = $this->getJson('/api/cron/initial_sync_of_users');

        $response->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    public function test_initialSyncOfUsers__submit__invalid_bhr_user__created_201()
    {
        // try arm: is_valid($bhr_user) FALSE (get_user null) -> insert skipped for that number.
        $this->bhr->shouldReceive('get_all_bhr_user_numbers')->once()->andReturn([101]);
        $this->bhr->shouldReceive('get_user')->with(101, true)->once()->andReturnNull();
        $this->userRepo->shouldReceive('apply_user_supervisor_pivot')->once()->andReturn([]);

        $response = $this->getJson('/api/cron/initial_sync_of_users');

        $response->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    public function test_initialSyncOfUsers__submit__insert_returns_invalid__created_201()
    {
        // try arm: is_valid($bhr_user) TRUE but insert returns null -> is_valid($user) FALSE -> no pivot entry.
        $this->bhr->shouldReceive('get_all_bhr_user_numbers')->once()->andReturn([101]);
        $this->bhr->shouldReceive('get_user')->with(101, true)->once()->andReturn($this->fakeBhrUser());
        $this->userRepo->shouldReceive('insert_bhr_user_to_evox')->once()->andReturnNull();
        $this->userRepo->shouldReceive('apply_user_supervisor_pivot')->once()->andReturn([]);

        $response = $this->getJson('/api/cron/initial_sync_of_users');

        $response->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    public function test_initialSyncOfUsers__submit__exception__error_400()
    {
        // catch(Exception) arm: BHR fetch throws -> error_response(default 400).
        $this->bhr->shouldReceive('get_all_bhr_user_numbers')->once()->andThrow(new \Exception('boom'));

        $response = $this->getJson('/api/cron/initial_sync_of_users');

        $response->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ============================================================ sync_users()
    // GET /api/cron/sync_users  and  /sync_users/{since_date_to_sync}  -> HTTP_CREATED = 201
    // Only the UPDATE path is exercised (insert branch SKIPPED-DESTRUCTIVE — see header).

    public function test_syncUsers__submit__sync_type_all__created_201()
    {
        // CAT1 fixture-guard: sync_users() opens with Role::findByName('admin')->users()->get() (line ~138,
        // inside try). If the 'admin' role row is absent, findByName() returns null and null->users() raises
        // a PHP \Error (NOT \Exception) that the catch(Exception) does NOT trap -> unhandled -> 500. Skip
        // gracefully when the fixture is missing, matching the suite's other fixture-guards.
        // Guard mirrors the controller's ACTUAL lookup: sync_users() calls Role::findByName('admin').
        // findByName() resolves by the model's default guard; where('name','admin')->exists() ignores guard,
        // so it returned true while findByName() returned null -> null->users() -> \Error -> 500. Use the
        // same lookup the controller uses so we skip cleanly when it can't resolve (absent OR guard mismatch).
        $adminRole = null;
        try { $adminRole = \Spatie\Permission\Models\Role::findByName('admin'); } catch (\Throwable $e) { $adminRole = null; }
        if (is_null($adminRole)) {
            $this->markTestIncomplete('CAT1: Role::findByName(\'admin\') did not resolve (absent or guard mismatch)');
        }

        // Branch: request('sync_type')=='all' TRUE. BHR list mocked empty; the real
        // User::whereNotNull('bhr_num')->pluck() drives the merge, but EVERY per-user call below is
        // mocked (show/get_user/update) so NO real BHR call and NO real write fires. Update path only.
        $this->bhr->shouldReceive('get_all_bhr_user_numbers')->andReturn([]);
        $this->bhr->shouldReceive('get_user')->andReturn($this->fakeBhrUser());
        $this->bhr->shouldIgnoreMissing();
        $this->userRepo->shouldReceive('show_via_bhr_number')->andReturn($this->fakeEvoxUser());
        $this->userRepo->shouldReceive('update_bhr_user_to_evox')->andReturn($this->fakeEvoxUser());
        $this->userRepo->shouldReceive('apply_user_supervisor_pivot')->once()->andReturn([]);
        $this->userRepo->shouldIgnoreMissing();

        $response = $this->getJson('/api/cron/sync_users?sync_type=all');

        $response->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    public function test_syncUsers__submit__since_param_scoped__created_201()
    {
        // CAT1 fixture-guard (see sync_type_all): admin role row required by line ~138 or null->users() -> 500.
        // Guard mirrors the controller's ACTUAL lookup: sync_users() calls Role::findByName('admin').
        // findByName() resolves by the model's default guard; where('name','admin')->exists() ignores guard,
        // so it returned true while findByName() returned null -> null->users() -> \Error -> 500. Use the
        // same lookup the controller uses so we skip cleanly when it can't resolve (absent OR guard mismatch).
        $adminRole = null;
        try { $adminRole = \Spatie\Permission\Models\Role::findByName('admin'); } catch (\Throwable $e) { $adminRole = null; }
        if (is_null($adminRole)) {
            $this->markTestIncomplete('CAT1: Role::findByName(\'admin\') did not resolve (absent or guard mismatch)');
        }

        // Branches: is_valid($since_date_to_sync) TRUE (route param) + sync_type ELSE (get_changed_users).
        // Update path: show_via_bhr_number returns an existing user -> update_bhr_user_to_evox.
        $this->bhr->shouldReceive('get_changed_users')->once()->andReturn([101]);
        $this->bhr->shouldReceive('get_user')->andReturn($this->fakeBhrUser());
        $this->bhr->shouldIgnoreMissing();
        $this->userRepo->shouldReceive('show_via_bhr_number')->with(101)->once()->andReturn($this->fakeEvoxUser());
        $this->userRepo->shouldReceive('update_bhr_user_to_evox')->once()->andReturn($this->fakeEvoxUser());
        $this->userRepo->shouldReceive('apply_user_supervisor_pivot')->once()->andReturn([]);
        $this->userRepo->shouldIgnoreMissing();

        $response = $this->getJson('/api/cron/sync_users/2020-01-01');

        $response->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    public function test_syncUsers__submit__default_since_scoped__created_201()
    {
        // CAT1 fixture-guard (see sync_type_all): admin role row required by line ~138 or null->users() -> 500.
        // Guard mirrors the controller's ACTUAL lookup: sync_users() calls Role::findByName('admin').
        // findByName() resolves by the model's default guard; where('name','admin')->exists() ignores guard,
        // so it returned true while findByName() returned null -> null->users() -> \Error -> 500. Use the
        // same lookup the controller uses so we skip cleanly when it can't resolve (absent OR guard mismatch).
        $adminRole = null;
        try { $adminRole = \Spatie\Permission\Models\Role::findByName('admin'); } catch (\Throwable $e) { $adminRole = null; }
        if (is_null($adminRole)) {
            $this->markTestIncomplete('CAT1: Role::findByName(\'admin\') did not resolve (absent or guard mismatch)');
        }

        // Branch: is_valid($since_date_to_sync) FALSE (no param) -> Carbon::today()->subDays(7) arm,
        // sync_type ELSE (get_changed_users), single mocked user, update path.
        $this->bhr->shouldReceive('get_changed_users')->once()->andReturn([101]);
        $this->bhr->shouldReceive('get_user')->andReturn($this->fakeBhrUser());
        $this->bhr->shouldIgnoreMissing();
        $this->userRepo->shouldReceive('show_via_bhr_number')->with(101)->once()->andReturn($this->fakeEvoxUser());
        $this->userRepo->shouldReceive('update_bhr_user_to_evox')->once()->andReturn($this->fakeEvoxUser());
        $this->userRepo->shouldReceive('apply_user_supervisor_pivot')->once()->andReturn([]);
        $this->userRepo->shouldIgnoreMissing();

        $response = $this->getJson('/api/cron/sync_users');

        $response->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    public function test_syncUsers__submit__exception__error_400()
    {
        // catch(Exception) arm: BHR get_changed_users throws -> error_response(default 400).
        $this->bhr->shouldReceive('get_changed_users')->once()->andThrow(new \Exception('boom'));

        $response = $this->getJson('/api/cron/sync_users');

        $response->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ============================================================ generate_weekly_dtr()
    // GET /api/cron/generate_weekly_dtr  and  /generate_weekly_dtr/{start}/{end}  -> HTTP_CREATED = 201

    public function test_generateWeeklyDtr__submit__default_dates_no_id__created_201()
    {
        // Branches: (!is_valid(start) && !is_valid(end)) TRUE -> default start=tomorrow,end=7.
        //           is_valid(request('id')) FALSE -> get_all_active_users() (mocked tiny collection).
        $this->userRepo->shouldReceive('get_all_active_users')->once()->andReturn(new EloquentCollection([]));
        $this->dtr->shouldReceive('generate_dtr')->once()->andReturn([]);

        $response = $this->getJson('/api/cron/generate_weekly_dtr');

        $response->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    public function test_generateWeeklyDtr__submit__with_id__created_201()
    {
        // Branch: is_valid(request('id')) TRUE -> User::where('id',<bogus>)->get() SCOPED to one id (empty).
        $this->dtr->shouldReceive('generate_dtr')->once()->andReturn([]);

        $response = $this->getJson('/api/cron/generate_weekly_dtr?id=99999999');

        $response->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    public function test_generateWeeklyDtr__submit__explicit_dates__created_201()
    {
        // Branch: (!is_valid(start) && !is_valid(end)) FALSE -> route supplies both dates; default skipped.
        $this->userRepo->shouldReceive('get_all_active_users')->once()->andReturn(new EloquentCollection([]));
        $this->dtr->shouldReceive('generate_dtr')->once()->andReturn([]);

        $response = $this->getJson('/api/cron/generate_weekly_dtr/2020-01-01/2020-01-07');

        $response->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    public function test_generateWeeklyDtr__submit__exception__error_400()
    {
        // catch(Exception) arm: get_all_active_users throws -> error_response(default 400).
        $this->userRepo->shouldReceive('get_all_active_users')->once()->andThrow(new \Exception('boom'));

        $response = $this->getJson('/api/cron/generate_weekly_dtr');

        $response->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ============================================================ sync_realtime_biometrics()
    // GET /api/cron/sync_realtime_biometrics  and  /{start}/{end}  -> success_response default = 200

    public function test_syncRealtimeBiometrics__submit__default_window__ok_200()
    {
        // Branch: (!is_valid(start) && !is_valid(end)) TRUE -> default 30-min window. All repo calls mocked.
        $this->biometrics->shouldReceive('get_biometrics')->once()->andReturn(new EloquentCollection([]));
        $this->dtr->shouldReceive('sync_biometrics_to_dtr')->once()->andReturn(new EloquentCollection([]));

        $response = $this->getJson('/api/cron/sync_realtime_biometrics');

        $response->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    public function test_syncRealtimeBiometrics__submit__explicit_window__ok_200()
    {
        // Branch: (!is_valid(start) && !is_valid(end)) FALSE -> route supplies both datetimes.
        $this->biometrics->shouldReceive('get_biometrics')->once()->andReturn(new EloquentCollection([]));
        $this->dtr->shouldReceive('sync_biometrics_to_dtr')->once()->andReturn(new EloquentCollection([]));

        $response = $this->getJson('/api/cron/sync_realtime_biometrics/2020-01-01 00:00:00/2020-01-01 00:30:00');

        $response->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    public function test_syncRealtimeBiometrics__submit__exception__error_400()
    {
        // catch(Exception) arm: get_biometrics throws -> error_response(default 400).
        $this->biometrics->shouldReceive('get_biometrics')->once()->andThrow(new \Exception('boom'));

        $response = $this->getJson('/api/cron/sync_realtime_biometrics');

        $response->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ============================================================ sync_holidays()
    // GET /api/cron/sync_holidays  and  /{start}/{end}  -> HTTP_CREATED = 201

    public function test_syncHolidays__submit__default_cutoff__created_201()
    {
        // Branch: (!is_valid(start) && !is_valid(end)) TRUE -> get_payroll_cutoff() (mocked object).
        // bhr->sync_holidays mocked (NO real BHR). bind_holidays_to_dtr mocked empty.
        $this->payrollCutoff->shouldReceive('get_payroll_cutoff')->once()
            ->andReturn((object) ['start_date' => '2020-01-01', 'end_date' => '2020-01-07']);
        $this->bhr->shouldReceive('sync_holidays')->once()->andReturnNull();
        $this->dtr->shouldReceive('bind_holidays_to_dtr')->once()->andReturn(new EloquentCollection([]));

        $response = $this->getJson('/api/cron/sync_holidays');

        $response->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    public function test_syncHolidays__submit__explicit_dates__created_201()
    {
        // Branch: (!is_valid(start) && !is_valid(end)) FALSE -> route supplies dates; cutoff lookup skipped.
        $this->bhr->shouldReceive('sync_holidays')->once()->andReturnNull();
        $this->dtr->shouldReceive('bind_holidays_to_dtr')->once()->andReturn(new EloquentCollection([]));

        $response = $this->getJson('/api/cron/sync_holidays/2020-01-01/2020-01-07');

        $response->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    public function test_syncHolidays__submit__exception__error_400()
    {
        // catch(Exception) arm: get_payroll_cutoff throws -> error_response(default 400).
        $this->payrollCutoff->shouldReceive('get_payroll_cutoff')->once()->andThrow(new \Exception('boom'));

        $response = $this->getJson('/api/cron/sync_holidays');

        $response->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ============================================================ sync_leaves()
    // GET /api/cron/sync_leaves  and  /{start}/{end}  -> HTTP_CREATED = 201 ; catch(\Throwable)

    public function test_syncLeaves__submit__default_cutoff__created_201()
    {
        // Branch: (!is_valid(start) && !is_valid(end)) TRUE -> get_payroll_cutoff() (mocked object).
        // bhr->get_leaves mocked (NO real BHR). bind_* mocked.
        $this->payrollCutoff->shouldReceive('get_payroll_cutoff')->once()
            ->andReturn((object) ['start_date' => '2020-01-01', 'end_date' => '2020-01-07']);
        $this->bhr->shouldReceive('get_leaves')->once()->andReturn([]);
        $this->dtr->shouldReceive('bind_superceded_leaves_to_dtr')->once()->andReturnNull();
        $this->dtr->shouldReceive('bind_leaves_to_dtr')->once()->andReturn([]);

        $response = $this->getJson('/api/cron/sync_leaves');

        $response->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    public function test_syncLeaves__submit__explicit_dates__created_201()
    {
        // Branch: (!is_valid(start) && !is_valid(end)) FALSE -> route supplies dates; cutoff lookup skipped.
        $this->bhr->shouldReceive('get_leaves')->once()->andReturn([]);
        $this->dtr->shouldReceive('bind_superceded_leaves_to_dtr')->once()->andReturnNull();
        $this->dtr->shouldReceive('bind_leaves_to_dtr')->once()->andReturn([]);

        $response = $this->getJson('/api/cron/sync_leaves/2020-01-01/2020-01-07');

        $response->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    public function test_syncLeaves__submit__exception__error_400()
    {
        // catch(\Throwable) arm: get_leaves throws -> error_response(default 400).
        $this->payrollCutoff->shouldReceive('get_payroll_cutoff')->once()
            ->andReturn((object) ['start_date' => '2020-01-01', 'end_date' => '2020-01-07']);
        $this->bhr->shouldReceive('get_leaves')->once()->andThrow(new \Exception('boom'));

        $response = $this->getJson('/api/cron/sync_leaves');

        $response->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
