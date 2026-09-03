<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';
require_once __DIR__ . '/../../Support/BhrApiFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Tests\Support\BhrApiFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Database\ConnectionResolverInterface;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Eloquent\Model as EloquentModel;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Fluent;
use App\Modules\Bhr\Repositories\BhrRepository;
use App\Modules\Department\Models\Announcement;
use App\Modules\Department\Models\EvoxDepartment;
use App\Modules\Department\Models\EvoxSubDepartment;
use App\Modules\Department\Repositories\AnnouncementRepository;
use App\Modules\Department\Repositories\DepartmentRepository;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepository;

/**
 * WAVE-2 TAILS — the *unfinished* arms of four repositories + one controller. Every method below
 * already had its happy path partly covered by a sibling suite; what was missing in all of them is
 * the SAME thing: the `catch (Exception $e)` arm. Those arms are unreachable through the SP seam
 * (these methods run plain Eloquent, no call_sp), so the failure driver here is a **connection
 * resolver seam**: Eloquent's static resolver is swapped for one that throws the moment a model
 * asks for a connection, and restored in a `finally`. No query is ever sent, no row is touched,
 * and the LIVE dump stays untouched — the model simply cannot reach the database for the duration
 * of one closure.
 *
 *   Menu -> Page -> Action mapping
 *   Admin      -> User Management        -> list active users / supervisors / BHR-synced users
 *                                           (UserRepository::get_all_active_users,
 *                                            get_all_supervisors, get_all_bhr_synced_users)
 *   Dashboard  -> Department Announcements -> index / handled lists
 *                                           (AnnouncementRepository::index,
 *                                            handle_announcements_index,
 *                                            all_department_handled_Announcements,
 *                                            all_hr_handled_Announcements)
 *   Admin      -> Departments            -> department dropdown / announcement department picker
 *                                           (DepartmentRepository::all, all_with_announcements)
 *   Dashboard  -> Team Birthdays         -> GET /api/report/team_birthday_anniversary
 *   Reports    -> Morocco Payroll        -> GET /api/report/get_morocco_payroll_params
 *   (cron)     -> BambooHR user sync     -> BhrRepository::get_all_bhr_user_numbers
 *
 * DEAD CODE (documented, deliberately NOT tested): BhrRepository::test() — a `protected` stub that
 * opens a transaction, sets `$result = null`, commits and returns null. No caller anywhere in the
 * app; it is leftover debug scaffolding and testing it would only inflate coverage.
 *
 * Writes: store()/log_activity() rows only, all inside DatabaseTransactions. Unbounded getters
 * (get_all_active_users / get_all_supervisors) are asserted by COUNT against control queries — the
 * result set is never iterated row-by-row.
 */
class RepositoryTailsWave2Test extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::where('is_active', 1)->whereNotNull('LevelId')
            ->orderBy('id', 'desc')->first()
            ?: User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$this->user) $this->markTestSkipped('no active user in test DB');
        $this->be($this->user);
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        BhrApiFake::reset();
        parent::tearDown();
    }

    /**
     * Run $fn with Eloquent's connection resolver replaced by one that throws on first use.
     * Restores the real resolver unconditionally. NOTE: the auth user must already be resolved
     * (setUp does `be()`), so the loggers inside the catch arms never need the database.
     */
    private function withDeadConnection(callable $fn)
    {
        $original = EloquentModel::getConnectionResolver();
        EloquentModel::setConnectionResolver(new class implements ConnectionResolverInterface {
            public function connection($name = null)
            {
                throw new \RuntimeException('DEAD-CONNECTION (test seam)');
            }
            public function getDefaultConnection() { return 'mysql'; }
            public function setDefaultConnection($name) { }
        });

        try {
            return $fn();
        } finally {
            EloquentModel::setConnectionResolver($original);
        }
    }

    /** Assert $fn rethrows the seam failure, and return the caught exception. */
    private function assertRethrowsDeadConnection(callable $fn)
    {
        $caught = null;
        try {
            $this->withDeadConnection($fn);
        } catch (\Exception $e) {
            $caught = $e;
        }
        $this->assertNotNull($caught, 'method swallowed the failure instead of rethrowing it');

        $chain = [];
        for ($e = $caught; $e !== null; $e = $e->getPrevious()) {
            $chain[] = $e->getMessage();
        }
        $this->assertStringContainsString('DEAD-CONNECTION (test seam)', implode(' | ', $chain));

        return $caught;
    }

    private function announcementPayload(array $overrides = [])
    {
        return new Fluent(array_merge([
            'title'               => 'Wave2 Tail Announcement',
            'category'            => 'Department',
            'content'             => '<p>tail body</p>',
            'headline'            => 'tail headline',
            'release_date'        => '2026-08-01',
            'expiry_date'         => '2026-12-31',
            'on_link'             => 0,
            'link'                => null,
            'status'              => 1,
            'country_id'          => null,
            'set_all'             => 1,
            'set_exclude'         => 0,
            'set_country_all'     => 1,
            'selectedDepartments' => null,
            'thumbnail'           => null,      // never touch the filesystem
        ], $overrides));
    }

    /** An active user that sits in a sub-department whose parent department row exists. */
    private function subDepartmentUser()
    {
        $subIds = EvoxSubDepartment::whereNotNull('DepartmentId')->pluck('Id');
        if ($subIds->isEmpty()) return null;

        return User::where('is_active', 1)->whereIn('SubDepartmentID', $subIds)
            ->orderBy('id', 'desc')->first();
    }

    // ══════════════════════════════════════════════════ UserRepository — list getters
    /** @test */
    public function get_all_active_users_returns_every_active_non_client_user()
    {
        $repo  = new UserRepository();
        $users = $repo->get_all_active_users();

        $this->assertInstanceOf(EloquentCollection::class, $users);

        // business rule: active AND not a Client (LevelId 7) — asserted by count, never iterated
        $expected = User::where('is_active', 1)->where('LevelId', '!=', 7)->count();
        $this->assertSame($expected, $users->count());

        // a real Client user must not appear in the list
        $client = User::where('is_active', 1)->where('LevelId', 7)->orderBy('id', 'desc')->first();
        if ($client) {
            $this->assertNull($users->firstWhere('id', $client->id),
                'Client (LevelId 7) leaked into the active-user list');
        }
        // an inactive user must not appear either
        $inactive = User::where('is_active', 0)->orderBy('id', 'desc')->first();
        if ($inactive) {
            $this->assertNull($users->firstWhere('id', $inactive->id));
        }
    }

    /**
     * FINDING USR-NULL-LEVEL-1 — both getters compare LevelId with `!=` / `NOT IN`. In MySQL a NULL
     * LevelId satisfies NEITHER, so active users who have never been assigned a level are silently
     * dropped from "all active users" and from the supervisor list. Characterised, not fixed.
     *
     * @test
     */
    public function active_and_supervisor_lists_silently_drop_null_level_users_FINDING_USR_NULL_LEVEL_1()
    {
        $nullLevel = User::where('is_active', 1)->whereNull('LevelId')->count();
        if ($nullLevel === 0) {
            $this->markTestSkipped('no active user with NULL LevelId in test DB — finding not observable here');
        }

        $repo   = new UserRepository();
        $active = $repo->get_all_active_users();

        $activeTotal = User::where('is_active', 1)->count();
        $clients     = User::where('is_active', 1)->where('LevelId', 7)->count();

        // today's behaviour: NULL-level users are missing on top of the intended Client exclusion
        $this->assertSame($activeTotal - $clients - $nullLevel, $active->count());

        $nullUser = User::where('is_active', 1)->whereNull('LevelId')->orderBy('id', 'desc')->first();
        $this->assertNull($active->firstWhere('id', $nullUser->id));
        $this->assertNull($repo->get_all_supervisors()->firstWhere('id', $nullUser->id));
    }

    /** @test */
    public function get_all_supervisors_excludes_employees_admins_and_clients()
    {
        $repo  = new UserRepository();
        $users = $repo->get_all_supervisors();

        $this->assertInstanceOf(EloquentCollection::class, $users);
        $this->assertSame(
            User::where('is_active', 1)->whereNotIn('LevelId', [0, 4, 7])->count(),
            $users->count()
        );

        foreach ([0, 4, 7] as $excludedLevel) {
            $probe = User::where('is_active', 1)->where('LevelId', $excludedLevel)
                ->orderBy('id', 'desc')->first();
            if ($probe) {
                $this->assertNull($users->firstWhere('id', $probe->id),
                    "LevelId {$excludedLevel} leaked into the supervisor list");
            }
        }
    }

    /** @test */
    public function get_all_bhr_synced_users_returns_only_the_bhr_numbers_of_synced_users()
    {
        $probe = User::whereNotNull('bhr_num')->orderBy('id', 'desc')->first();
        if (!$probe) $this->markTestSkipped('no BHR-synced user in test DB');

        $numbers = (new UserRepository())->get_all_bhr_synced_users();

        $this->assertInstanceOf(SupportCollection::class, $numbers);
        // plucked column is bhr_num (not the user id) and only synced users are counted
        $this->assertSame(User::whereNotNull('bhr_num')->count(), $numbers->count());
        $this->assertTrue($numbers->contains($probe->bhr_num));
        $this->assertTrue($numbers->filter(function ($n) { return $n === null; })->isEmpty(),
            'whereNotNull must keep NULL bhr_num out of the sync list');
    }

    /** @test */
    public function user_repository_list_getters_rethrow_when_the_connection_fails()
    {
        $repo = new UserRepository();

        foreach (['get_all_active_users', 'get_all_bhr_synced_users', 'get_all_supervisors'] as $method) {
            $e = $this->assertRethrowsDeadConnection(function () use ($repo, $method) {
                return $repo->{$method}();
            });
            // the repository must not translate or swallow the failure — the caller sees the original
            $this->assertInstanceOf(\RuntimeException::class, $e);
            $this->assertSame('DEAD-CONNECTION (test seam)', $e->getMessage());
        }
    }

    // ═════════════════════════════════════════ AnnouncementRepository — handled lists
    /** @test */
    public function handle_announcements_index_returns_only_department_rows_of_the_direct_department()
    {
        $subUser = $this->subDepartmentUser();
        if (!$subUser) $this->markTestSkipped('no active user inside a sub-department in test DB');
        $this->be($subUser);

        $repo  = new AnnouncementRepository();
        $depId = $subUser->direct_department_id();

        // store() stamps dep_id = direct_department_id and category from the payload
        $root = $repo->store($this->announcementPayload());
        $this->assertEquals($depId, $root->dep_id);

        $list = $repo->handle_announcements_index();

        $this->assertInstanceOf(EloquentCollection::class, $list);
        $this->assertSame($root->id, $list->first()->id, 'latest() must put the newest row first');
        $this->assertSame(
            Announcement::where('dep_id', $depId)->where('category', 'Department')->count(),
            $list->count(),
            'the handled list must be exactly the department-owned Department announcements'
        );
        $this->assertSame(0, $list->where('category', '!=', 'Department')->count());
        $this->assertSame(0, $list->filter(function ($a) use ($depId) {
            return (int) $a->dep_id !== (int) $depId;
        })->count(), 'rows from another department leaked into the handled list');
    }

    /** @test */
    public function all_department_handled_announcements_scopes_the_builder_to_the_users_dep_id()
    {
        $builder  = (new AnnouncementRepository())->all_department_handled_Announcements();
        $expected = Auth::user()->dep_id;

        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Builder::class, $builder);
        $this->assertStringContainsString('`announcements`', $builder->toSql());
        $this->assertStringContainsString('dep_id', $builder->toSql());

        // executed bounded (never a full scan) — every row must carry the caller's dep_id
        foreach ($builder->orderBy('id', 'desc')->limit(5)->get() as $row) {
            if ($expected === null) {
                $this->assertNull($row->dep_id);
            } else {
                $this->assertEquals($expected, $row->dep_id);
            }
        }
    }

    /**
     * FINDING ANN-DEPID-1 — the handled-list scope reads `Auth::user()->dep_id`, but `dep_id` is a
     * column of `announcements`, NOT of `users`. The attribute is always null, so the builder
     * degenerates to `dep_id is null` and every caller gets the global (department-less)
     * announcements instead of the ones their department owns. Characterised, not fixed.
     *
     * @test
     */
    public function all_department_handled_announcements_degenerates_to_dep_id_is_null_FINDING_ANN_DEPID_1()
    {
        if (Schema::hasColumn('users', 'dep_id')) {
            $this->markTestSkipped('users.dep_id exists — finding no longer applicable');
        }

        $this->assertNull(Auth::user()->dep_id);

        $builder = (new AnnouncementRepository())->all_department_handled_Announcements();

        $this->assertStringContainsString('is null', strtolower($builder->toSql()));
        $this->assertSame([], $builder->getBindings());
    }

    /** @test */
    public function all_hr_handled_announcements_returns_only_hr_category_rows()
    {
        $repo = new AnnouncementRepository();
        $hr   = $repo->store($this->announcementPayload(['category' => 'HR', 'title' => 'Wave2 HR Tail']));

        $list = $repo->all_hr_handled_Announcements();

        $this->assertInstanceOf(EloquentCollection::class, $list);
        $this->assertTrue($list->contains('id', $hr->id), 'freshly stored HR announcement is missing');
        $this->assertSame(0, $list->where('category', '!=', 'HR')->count());
        // a Department announcement must NOT show up in the HR list
        $dept = $repo->store($this->announcementPayload(['title' => 'Wave2 Dept Tail']));
        $this->assertFalse($repo->all_hr_handled_Announcements()->contains('id', $dept->id));
    }

    /** @test */
    public function announcement_list_methods_rethrow_when_the_connection_fails()
    {
        $repo = new AnnouncementRepository();

        foreach (['handle_announcements_index', 'all_hr_handled_Announcements'] as $method) {
            $e = $this->assertRethrowsDeadConnection(function () use ($repo, $method) {
                return $repo->{$method}();
            });
            $this->assertSame('DEAD-CONNECTION (test seam)', $e->getMessage());
        }

        // all_department_handled_Announcements fails on log_activity()'s write before it can build
        // the query — it still surfaces the failure to the caller instead of returning a builder.
        $this->assertRethrowsDeadConnection(function () use ($repo) {
            return $repo->all_department_handled_Announcements();
        });
    }

    // ══════════════════════════════════════════════ AnnouncementRepository — index()
    /** @test */
    public function index_overrides_the_requested_department_with_the_users_direct_department()
    {
        $subUser = $this->subDepartmentUser();
        if (!$subUser) $this->markTestSkipped('no active user inside a sub-department in test DB');
        $this->be($subUser);

        $repo  = new AnnouncementRepository();
        $depId = $subUser->direct_department_id();

        $stored   = $repo->store($this->announcementPayload([
            'set_all'             => 0,
            'selectedDepartments' => [$depId],
        ]));
        $expectIds = array_values(array_filter([$stored->id, $stored->announcement_id]));

        // an impossible department is requested: only the SubDepartmentID override can match these rows
        request()->merge(['department_id' => -1]);
        $page = $repo->index();

        $ids = collect($page->items())->pluck('id')->all();
        foreach ($expectIds as $id) {
            $this->assertContains($id, $ids,
                'index() used the requested department_id instead of the direct department');
        }
    }

    /** @test */
    public function index_rethrows_when_the_connection_fails()
    {
        $repo = new AnnouncementRepository();

        $e = $this->assertRethrowsDeadConnection(function () use ($repo) {
            return $repo->index();
        });
        $this->assertSame('DEAD-CONNECTION (test seam)', $e->getMessage());
    }

    // ═══════════════════════════════════════════════════════ DepartmentRepository
    /** @test */
    public function all_returns_every_department_sorted_by_name_with_aliased_columns()
    {
        if (EvoxDepartment::count() === 0) $this->markTestSkipped('no departments in test DB');

        $collection = (new DepartmentRepository())->all();

        $this->assertInstanceOf(EloquentCollection::class, $collection);
        // no isActive filter — the picker lists disabled departments too
        $this->assertSame(EvoxDepartment::count(), $collection->count());

        $this->assertEqualsCanonicalizing(
            ['id', 'department_name', 'HeadId', 'isActive', 'created_at', 'updated_at', 'CreatedBy', 'LevelId'],
            array_keys($collection->first()->getAttributes())
        );
        $this->assertSame(
            EvoxDepartment::orderBy('Name', 'asc')->value('Name'),
            $collection->first()->department_name
        );
        $this->assertSame(
            EvoxDepartment::orderBy('Name', 'desc')->value('Name'),
            $collection->last()->department_name
        );
    }

    /**
     * FINDING DEPT-DUP-1 — all_with_announcements() is a character-for-character duplicate of all():
     * same select, same order, no announcements relation loaded and no announcement join. Callers
     * that expect announcement data get plain department rows. Characterised, not fixed.
     *
     * @test
     */
    public function all_with_announcements_is_a_duplicate_of_all_FINDING_DEPT_DUP_1()
    {
        if (EvoxDepartment::count() === 0) $this->markTestSkipped('no departments in test DB');

        $repo = new DepartmentRepository();
        $with = $repo->all_with_announcements();

        $this->assertSame($repo->all()->pluck('id')->all(), $with->pluck('id')->all());
        $this->assertSame([], $with->first()->getRelations(), 'no announcements are eager loaded');
        $this->assertFalse(array_key_exists('announcements', $with->first()->getAttributes()));
    }

    /** @test */
    public function department_list_getters_rethrow_when_the_connection_fails()
    {
        $repo = new DepartmentRepository();

        foreach (['all', 'all_with_announcements'] as $method) {
            $e = $this->assertRethrowsDeadConnection(function () use ($repo, $method) {
                return $repo->{$method}();
            });
            $this->assertSame('DEAD-CONNECTION (test seam)', $e->getMessage());
        }
    }

    // ═══════════════════════════════════════════════════════════ ReportController
    /** @test */
    public function team_birthday_anniversary_passes_the_level_and_user_id_to_the_dashboard_sp()
    {
        CallSpFake::activate();
        $this->withoutMiddleware();
        CallSpFake::fake('EH_SP_Dashboard', [[
            (object) ['Employee_Name' => 'Birthday Bob', 'Type' => 'Birthday'],
            (object) ['Employee_Name' => 'Anniv Ann',    'Type' => 'Anniversary'],
        ]]);

        $res = $this->actingAs($this->user)->getJson('/api/report/team_birthday_anniversary');

        $res->assertStatus(200);
        $content = $res->json('content');
        $this->assertCount(2, $content);
        $this->assertSame('Birthday Bob', $content[0]['Employee_Name']);

        // only the FIRST result set is published, and the SP is scoped to the caller
        $params = CallSpFake::callsFor('EH_SP_Dashboard')[0]['params'];
        $this->assertCount(5, $params);
        $this->assertEquals($this->user->LevelId, $params[0]);
        $this->assertEquals($this->user->id, $params[1]);
        $this->assertNull($params[2]);
        $this->assertNull($params[3]);
        $this->assertSame(2, $params[4]);              // mode 2 = birthday/anniversary block
    }

    /** @test */
    public function team_birthday_anniversary_returns_an_error_response_when_the_sp_fails()
    {
        CallSpFake::activate();          // EH_SP_Dashboard deliberately NOT faked -> throws
        $this->withoutMiddleware();

        $res = $this->actingAs($this->user)->getJson('/api/report/team_birthday_anniversary');

        $res->assertStatus(400);
        $this->assertNull($res->json('content'));
        $this->assertNotNull($res->json('error.message'));
        $this->assertStringContainsString('EH_SP_Dashboard', $res->json('error.content'));
        $this->assertCount(1, CallSpFake::callsFor('EH_SP_Dashboard'));
    }

    /** @test */
    public function morocco_payroll_params_returns_an_error_response_when_the_sp_fails()
    {
        CallSpFake::activate();          // EH_SP_Morocco_DTR_Summary_Report NOT faked -> throws
        $this->withoutMiddleware();

        $res = $this->actingAs($this->user)->getJson('/api/report/get_morocco_payroll_params');

        $res->assertStatus(400);
        // the success shape (month/year/department) must be entirely absent on the failure arm
        $this->assertNull($res->json('month'));
        $this->assertNull($res->json('year'));
        $this->assertNull($res->json('department'));
        $this->assertNotNull($res->json('error.message'));
        $this->assertSame(
            [null, null, null, 1],
            CallSpFake::callsFor('EH_SP_Morocco_DTR_Summary_Report')[0]['params']
        );
    }

    // ══════════════════════════════════════════════════════════════ BhrRepository
    /** @test */
    public function get_all_bhr_user_numbers_rethrows_when_the_directory_endpoint_fails()
    {
        BhrApiFake::activate();          // 'employees/directory' deliberately NOT faked -> throws

        $caught = null;
        try {
            (new BhrRepository())->get_all_bhr_user_numbers();
        } catch (\Exception $e) {
            $caught = $e;
        }

        $this->assertInstanceOf(\RuntimeException::class, $caught);
        $this->assertStringContainsString('unfaked BHR endpoint', $caught->getMessage());
        // the sync must fail loudly: no partial collection is returned to the caller
        $calls = BhrApiFake::callsFor('employees/directory');
        $this->assertCount(1, $calls);
        $this->assertSame('GET', $calls[0]['method']);
    }
}
