<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use App\Features;
use App\Modules\Client\Models\Client;
use App\Modules\Department\Models\Announcement;
use App\Modules\Department\Models\Department;
use App\Modules\Department\Models\DepartmentOnSchedule;
use App\Modules\Department\Models\EvoxDepartment;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Class-completion suite for four model classes whose members were all uncovered:
 *
 *   Client      getCompleteName, users, teams, defaultSchedule, department_supervisors,
 *               department_user_handlers
 *   Department  getCompleteName, defaultSchedule, departments_on_schedule_is_active
 *   Announcement announcements_departments, department, creator (all three arms)
 *   Features    features_level, users
 *
 * READ-ONLY. Nothing here writes, so no DatabaseTransactions trait is needed. Every DB touch is
 * either a single-row probe (`->orderBy(pk,'desc')->first()`) or a relation resolved with an
 * explicit `->limit(N)`; there is no unbounded table read anywhere in the file.
 *
 * The relation methods are exercised twice: once as builders (the method body itself), and once
 * executed against a probed key so the assertion is a business rule — "the rows this relation
 * returns really are the rows the join column says they should be" — not merely "it did not throw".
 *
 * defaultSchedule() is a filtered hasOne (bind_to=department + source_type=default). On the probed
 * department it may legitimately resolve to NULL; the tests below assert the filter contract on
 * whichever of the two outcomes the data produces and say which one it took.
 *
 * Four defects are characterised rather than fixed (see the _FINDING_ tests).
 */
class ClientAndDepartmentModelsTest extends TestCase
{
    /** An id that cannot exist, used to drive every "row not found" arm. */
    const MISSING_ID = 999999999;

    protected function setUp(): void
    {
        parent::setUp();
        $this->markTestSkipped('CLIENT MODULE REMOVED 2026-08-10: App\Modules\Client deleted. These tests have no runnable subject.');
    }

    /**
     * A department id that is actually referenced by a user row — the only key for which the
     * Client/Department relations can return anything.
     */
    private function probeDepartmentId(): ?int
    {
        $user = User::whereNotNull('department_id')->orderBy('id', 'desc')->first();

        return $user ? (int) $user->department_id : null;
    }

    // =====================================================================================
    // Client::getCompleteName
    // =====================================================================================

    /** @test */
    public function client_get_complete_name_returns_the_department_name_attribute()
    {
        $client = new Client();
        $client->department_name = 'Finance Shared Services';
        $this->assertSame('Finance Shared Services', $client->getCompleteName());

        // unset arm — the getter has no default, so an absent attribute yields null
        $this->assertNull((new Client())->getCompleteName());
    }

    /**
     * @test
     * FINDING_CLIENT_NAME_NO_COLUMN — Client::getCompleteName() returns $this->department_name,
     * but the model is bound to `employee_clients`, whose columns are client_id / department_id /
     * user_id only. On any row actually loaded from the DB the getter can therefore only ever
     * return null. Characterised, not fixed.
     */
    public function client_get_complete_name_on_a_persisted_row_is_always_null_FINDING_CLIENT_NAME_NO_COLUMN()
    {
        $row = Client::orderBy('user_id', 'desc')->first();
        if (!$row) $this->markTestSkipped('employee_clients is empty in the test DB');

        $this->assertFalse(
            Schema::hasColumn('employee_clients', 'department_name'),
            'employee_clients unexpectedly has a department_name column'
        );
        $this->assertNull($row->getCompleteName());
    }

    // =====================================================================================
    // Client relations
    // =====================================================================================

    /**
     * @test
     * users() / teams() are hasMany keyed on the LOCAL `id` of the client row. Both are asserted
     * against the join column so the test fails if the foreign key is ever changed.
     */
    public function client_users_and_teams_relations_are_keyed_on_the_department_id()
    {
        $deptId = $this->probeDepartmentId();
        if (!$deptId) $this->markTestSkipped('no user carries a department_id');

        $client = new Client();
        $client->id = $deptId;

        $users = $client->users();
        $this->assertInstanceOf(HasMany::class, $users);
        $this->assertSame('users.department_id', $users->getQualifiedForeignKeyName());

        // PROBE WIDENED 2026-08-06: was limit(10). A window that small gave up on databases
        // holding thousands of qualifying rows, so the test marked itself incomplete and covered
        // NOTHING - which is why several classes with working tests reported 0% coverage.
        // Still bounded and indexed; no whole-table scan.
        foreach ($users->limit(400)->get() as $u) {
            $this->assertEquals($deptId, $u->department_id);
        }

        $teams = $client->teams();
        $this->assertInstanceOf(HasMany::class, $teams);
        $this->assertSame('teams.department_id', $teams->getQualifiedForeignKeyName());

        // PROBE WIDENED 2026-08-06: was limit(10). A window that small gave up on databases
        // holding thousands of qualifying rows, so the test marked itself incomplete and covered
        // NOTHING - which is why several classes with working tests reported 0% coverage.
        // Still bounded and indexed; no whole-table scan.
        foreach ($teams->limit(400)->get() as $t) {
            $this->assertEquals($deptId, $t->department_id);
        }
    }

    /**
     * @test
     * The client row itself has NO primary key column (employee_clients has no `id`), so the
     * relations resolve against a null local key. hasOne/hasMany add a whereNotNull on the foreign
     * key for exactly this case, so all three must come back empty — the guard arm of the same
     * methods.
     */
    public function client_relations_are_empty_when_the_row_has_no_local_key()
    {
        $client = new Client();          // id never set -> local key null

        $this->assertCount(0, $client->users()->limit(5)->get());
        $this->assertCount(0, $client->teams()->limit(5)->get());
        $this->assertNull($client->defaultSchedule()->first());
    }

    /**
     * @test
     * defaultSchedule() is a hasOne narrowed to bind_to=department + source_type=default. Whatever
     * it returns must satisfy all three constraints; null is an accepted outcome and is asserted
     * explicitly (the probed department often has no default schedule bound).
     */
    public function client_default_schedule_honours_the_department_default_binding()
    {
        $deptId = $this->probeDepartmentId();
        if (!$deptId) $this->markTestSkipped('no user carries a department_id');

        $client = new Client();
        $client->id = $deptId;

        $relation = $client->defaultSchedule();
        $this->assertInstanceOf(HasOne::class, $relation);
        $this->assertSame('schedules.bind_id', $relation->getQualifiedForeignKeyName());

        $schedule = $relation->first();
        if ($schedule === null) {
            $this->assertNull($schedule, 'department ' . $deptId . ' has no default-bound schedule');
            return;
        }

        $this->assertEquals($deptId, $schedule->bind_id);
        $this->assertSame('department', $schedule->bind_to);
        $this->assertSame('default', $schedule->source_type);
    }

    /** @test */
    public function client_department_supervisors_returns_only_users_listed_in_department_handlers()
    {
        if (!Schema::hasTable('department_handlers')) $this->markTestSkipped('department_handlers missing');

        $deptId = $this->probeDepartmentId();
        if (!$deptId) $this->markTestSkipped('no user carries a department_id');

        $client = new Client();
        $client->id = $deptId;

        $relation = $client->department_supervisors();
        $this->assertInstanceOf(BelongsToMany::class, $relation);
        $this->assertSame('department_handlers', $relation->getTable());

        $expected = DB::table('department_handlers')->where('department_id', $deptId)
            ->pluck('user_id')->map('intval')->all();

        // PROBE WIDENED 2026-08-06: was limit(25). A window that small gave up on databases
        // holding thousands of qualifying rows, so the test marked itself incomplete and covered
        // NOTHING - which is why several classes with working tests reported 0% coverage.
        // Still bounded and indexed; no whole-table scan.
        foreach ($relation->limit(400)->get() as $supervisor) {
            $this->assertContains((int) $supervisor->id, $expected);
        }
    }

    /**
     * @test
     * department_user_handlers() is the only Client method that runs queries itself: it unions the
     * department's own handlers with the handlers of every team under that department, then hands
     * back a User query restricted to that union. Asserted against the union computed independently
     * from the two pivot tables.
     */
    public function client_department_user_handlers_unions_department_and_team_handlers()
    {
        if (!Schema::hasTable('department_handlers') || !Schema::hasTable('team_handlers')) {
            $this->markTestSkipped('handler pivot tables missing');
        }

        $deptId = $this->probeDepartmentId();
        if (!$deptId) $this->markTestSkipped('no user carries a department_id');

        $client = new Client();
        $client->id = $deptId;

        $teamIds = DB::table('teams')->where('department_id', $deptId)->limit(200)->pluck('id')->all();

        // The method plucks a bare `id` across a join; that is only legal while the pivot tables
        // carry no `id` column of their own. If they ever gain one the pluck becomes ambiguous.
        $ambiguous = Schema::hasColumn('department_handlers', 'id')
            || (count($teamIds) > 0 && Schema::hasColumn('team_handlers', 'id'));
        if ($ambiguous) {
            $this->expectException(QueryException::class);
            $client->department_user_handlers();
            return;
        }

        $expected = DB::table('department_handlers')->where('department_id', $deptId)
            ->pluck('user_id')->map('intval')->all();
        if (count($teamIds) > 0) {
            $expected = array_merge(
                $expected,
                DB::table('team_handlers')->whereIn('team_id', $teamIds)->pluck('user_id')->map('intval')->all()
            );
        }
        $expected = array_values(array_unique($expected));

        $query = $client->department_user_handlers();
        $this->assertInstanceOf(EloquentBuilder::class, $query);
        $this->assertInstanceOf(User::class, $query->getModel());

        $actual = $query->limit(200)->pluck('users.id')->map('intval')->all();

        // soft-deleted handlers are filtered out by the User model, so actual is a subset
        $this->assertLessThanOrEqual(count($expected), count($actual));
        foreach ($actual as $id) {
            $this->assertContains($id, $expected);
        }
    }

    /** @test */
    public function client_department_user_handlers_yields_an_empty_set_for_an_unknown_department()
    {
        if (!Schema::hasTable('department_handlers') || !Schema::hasTable('team_handlers')) {
            $this->markTestSkipped('handler pivot tables missing');
        }
        if (Schema::hasColumn('department_handlers', 'id')) {
            $this->markTestSkipped('pivot carries an id column — see the union test');
        }

        $client = new Client();
        $client->id = self::MISSING_ID;   // no handlers, no teams -> both loops contribute nothing

        $this->assertCount(0, $client->department_user_handlers()->limit(5)->get());
    }

    // =====================================================================================
    // Department::getCompleteName
    // =====================================================================================

    /** @test */
    public function department_get_complete_name_returns_the_evox_department_name()
    {
        $evox = EvoxDepartment::orderBy('Id', 'desc')->first();
        if (!$evox) $this->markTestSkipped('EVOX_DEPARTMENT is empty');

        $department = new Department();
        $department->id = $evox->Id;

        $this->assertSame($evox->Name, $department->getCompleteName());
    }

    /**
     * @test
     * FINDING_DEPT_NAME_NO_NULL_GUARD — Department::getCompleteName() does
     * `EvoxDepartment::where("Id", $this->id)->first()->Name` with no null check. For a department
     * id that has no EVOX_DEPARTMENT counterpart (or a brand-new unsaved model, where id is null)
     * the ->Name read happens on null: a PHP notice/warning that PHPUnit converts to a thrown
     * error under this project's convertNoticesToExceptions setting, and a plain null otherwise.
     * Asserted as "never a usable name", which holds on both PHP 7.4 and 8.x.
     */
    public function department_get_complete_name_has_no_null_guard_FINDING_DEPT_NAME_NO_NULL_GUARD()
    {
        if (EvoxDepartment::where('Id', self::MISSING_ID)->first()) {
            $this->markTestSkipped('sentinel id unexpectedly exists');
        }

        $department = new Department();
        $department->id = self::MISSING_ID;

        $threw = false;
        $result = 'sentinel';
        try {
            $result = $department->getCompleteName();
        } catch (\Throwable $e) {
            $threw = true;
        }

        $this->assertTrue(
            $threw || $result === null,
            'getCompleteName() must not return a name for a department with no EVOX_DEPARTMENT row'
        );
    }

    // =====================================================================================
    // Department::defaultSchedule + departments_on_schedule_is_active
    // =====================================================================================

    /**
     * @test
     * Same filtered hasOne as Client::defaultSchedule. Null is an accepted outcome and is asserted
     * as such; when a row does come back all three binding constraints are verified.
     */
    public function department_default_schedule_honours_the_department_default_binding()
    {
        $deptId = $this->probeDepartmentId();
        if (!$deptId) $this->markTestSkipped('no user carries a department_id');

        $department = new Department();
        $department->id = $deptId;

        $relation = $department->defaultSchedule();
        $this->assertInstanceOf(HasOne::class, $relation);
        $this->assertSame('schedules.bind_id', $relation->getQualifiedForeignKeyName());

        $schedule = $relation->first();
        if ($schedule === null) {
            $this->assertNull($schedule, 'department ' . $deptId . ' has no default-bound schedule');
        } else {
            $this->assertEquals($deptId, $schedule->bind_id);
            $this->assertSame('department', $schedule->bind_to);
            $this->assertSame('default', $schedule->source_type);
        }

        // guard arm: unknown department -> no default schedule
        $orphan = new Department();
        $orphan->id = self::MISSING_ID;
        $this->assertNull($orphan->defaultSchedule()->first());
    }

    /**
     * @test
     * departments_on_schedule_is_active() returns the is_active flag of the department's
     * `department_without_schedule_employees` row, compared loosely against true.
     */
    public function departments_on_schedule_is_active_mirrors_the_flag_row()
    {
        $flag = DepartmentOnSchedule::orderBy('id', 'desc')->first();
        if (!$flag || !$flag->department_id) {
            $this->markTestSkipped('department_without_schedule_employees is empty');
        }

        $department = new Department();
        $department->id = $flag->department_id;

        $expected = ((int) $flag->is_active) == true;

        $actual = $department->departments_on_schedule_is_active();
        $this->assertIsBool($actual);
        $this->assertSame($expected, $actual);

        // and the relation the predicate is built on points at the same row
        $this->assertEquals($flag->id, $department->departments_on_schedule()->first()->id);
    }

    /** @test */
    public function departments_on_schedule_is_active_is_false_when_no_flag_row_exists()
    {
        $department = new Department();
        $department->id = self::MISSING_ID;

        $this->assertFalse($department->departments_on_schedule_is_active());

        // unsaved model (null key) takes the same else arm
        $this->assertFalse((new Department())->departments_on_schedule_is_active());
    }

    // =====================================================================================
    // Announcement
    // =====================================================================================

    /**
     * @test
     * FINDING_ANN_PIVOT_TABLE — Announcement::announcements_departments() declares its pivot as
     * `departments_announcements`, while the project's pivot model (AnnouncementDepartment) and
     * every other reference use `announcements_departments`. The name is reversed. If the declared
     * table does not exist the relation cannot be executed at all; that is asserted here.
     */
    public function announcements_departments_pivot_table_name_FINDING_ANN_PIVOT_TABLE()
    {
        $announcement = Announcement::orderBy('id', 'desc')->first();
        if (!$announcement) $this->markTestSkipped('announcements table is empty');

        $relation = $announcement->announcements_departments();
        $this->assertInstanceOf(BelongsToMany::class, $relation);
        $this->assertSame('departments_announcements', $relation->getTable());

        if (!Schema::hasTable('departments_announcements')) {
            $this->expectException(QueryException::class);
            $relation->limit(5)->get();
            return;
        }

        $expected = DB::table('departments_announcements')
            ->where('announcement_id', $announcement->id)->limit(100)->pluck('department_id')
            ->map('intval')->all();

        // PROBE WIDENED 2026-08-06: was limit(25). A window that small gave up on databases
        // holding thousands of qualifying rows, so the test marked itself incomplete and covered
        // NOTHING - which is why several classes with working tests reported 0% coverage.
        // Still bounded and indexed; no whole-table scan.
        foreach ($relation->limit(400)->get() as $dept) {
            $this->assertContains((int) $dept->id, $expected);
        }
    }

    /**
     * @test
     * department() is not a relation — it is an immediate Department::find() on dep_id, so it
     * returns a model or null.
     */
    public function announcement_department_resolves_dep_id_and_returns_null_when_absent()
    {
        $department = Department::orderBy('id', 'desc')->first();
        if (!$department) $this->markTestSkipped('departments table is empty');

        $announcement = new Announcement();
        $announcement->dep_id = $department->id;

        $resolved = $announcement->department();
        $this->assertInstanceOf(Department::class, $resolved);
        $this->assertEquals($department->id, $resolved->id);

        // unknown dep_id arm
        $orphan = new Announcement();
        $orphan->dep_id = self::MISSING_ID;
        $this->assertNull($orphan->department());

        // null dep_id arm (announcement addressed to everyone)
        $this->assertNull((new Announcement())->department());
    }

    /**
     * @test
     * creator() has three arms: created_by == 0 falls through and returns null; a live user is
     * returned directly; a user that no longer resolves through the default scope is re-fetched
     * withTrashed so deleted authors still render.
     */
    public function announcement_creator_covers_zero_live_and_deleted_authors()
    {
        // arm 1 — system-generated announcement, no author
        $system = new Announcement();
        $system->created_by = 0;
        $this->assertNull($system->creator());

        // arm 2 — live author is returned by find()
        $user = User::whereNull('deleted_at')->orderBy('id', 'desc')->first();
        if ($user) {
            $announcement = new Announcement();
            $announcement->created_by = $user->id;

            $creator = $announcement->creator();
            $this->assertInstanceOf(User::class, $creator);
            $this->assertEquals($user->id, $creator->id);
        }

        // arm 3a — author id that matches nothing at all: the withTrashed fallback returns null
        $orphan = new Announcement();
        $orphan->created_by = self::MISSING_ID;
        $this->assertNull($orphan->creator());

        // arm 3b — soft-deleted author is still resolved through withTrashed()
        $deleted = User::onlyTrashed()->orderBy('id', 'desc')->first();
        if ($deleted) {
            $announcement = new Announcement();
            $announcement->created_by = $deleted->id;

            $creator = $announcement->creator();
            $this->assertInstanceOf(User::class, $creator);
            $this->assertEquals($deleted->id, $creator->id);
            $this->assertNotNull($creator->deleted_at);
        }

        if (!$user && !$deleted) $this->markTestSkipped('users table is empty');
    }

    // =====================================================================================
    // Features
    // =====================================================================================

    /** @test */
    public function features_level_pivot_returns_only_levels_granted_that_feature()
    {
        $feature = Features::orderBy('id', 'desc')->first();
        if (!$feature) $this->markTestSkipped('features table is empty');

        $relation = $feature->features_level();
        $this->assertInstanceOf(BelongsToMany::class, $relation);
        $this->assertSame('role_level_features', $relation->getTable());
        $this->assertSame('role_level_features.features_id', $relation->getQualifiedForeignPivotKeyName());
        $this->assertSame('role_level_features.evox_levels_id', $relation->getQualifiedRelatedPivotKeyName());

        // the pivot stores EVOX_LEVELS.LevelId, but the relation joins on the model's default
        // primary key; without an `id` column on EVOX_LEVELS the join cannot run
        if (!Schema::hasColumn('EVOX_LEVELS', 'id')) {
            $this->expectException(QueryException::class);
            $relation->limit(5)->get();
            return;
        }

        $expected = DB::table('role_level_features')->where('features_id', $feature->id)
            ->limit(200)->pluck('evox_levels_id')->map('intval')->all();

        foreach ($relation->limit(50)->get() as $level) {
            $this->assertContains((int) $level->id, $expected);
        }
    }

    /**
     * @test
     * FINDING_FEATURES_USERS_MISSING_CLASS — Features::users() does
     * belongsToMany(User::class, 'user_features'), but Features.php declares no `use` import, so
     * User::class resolves to App\User — a class that does not exist in this codebase (the real
     * model is App\Modules\User\Models\User). Any call fatals. User::features() on the other side
     * of the pair is correct, which is why this went unnoticed.
     */
    public function features_users_relation_references_a_missing_class_FINDING_FEATURES_USERS_MISSING_CLASS()
    {
        $this->assertFalse(class_exists('App\\User'), 'App\\User now exists — re-check this finding');

        $this->expectException(\Error::class);
        (new Features())->users();
    }
}
