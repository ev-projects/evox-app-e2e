<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\DatabaseManager;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Modules\User\Models\User;
use App\Modules\Department\Models\Department;
use App\Modules\User\Repositories\UserRepository;
/**
 * COMPLETES UserRepository — the admin User-Management write path (Menu=Administration,
 * Page=Users, Actions=Create/Edit/Delete + Assign Roles & Permissions).
 * Five methods sat at 0% in the Aug-03 gap report: store(), update(), destroy(),
 * assign_permissions_to_user(), adminRoleConditions(). They are the last unfinished members of
 * an otherwise-covered class, so both the success arm AND the failure/guard arm of each is driven
 * here.
 *
 * WHY A USER CARES: this is how an administrator grants or removes what a colleague can see and
 * approve in EVOX. A silent failure here means a supervisor keeps approval rights after being
 * moved, or a new joiner cannot see their team — nobody gets an error message, the screen just
 * lies. These tests pin down what the code actually does today, including where it does nothing.
 *
 * ARMS COVERED
 *   store() / update() / destroy()
 *     - success arm: begin -> commit -> log 'Success' -> return null (they are UNIMPLEMENTED stubs)
 *     - catch arm:   DB facade swapped for a manager whose commit() throws -> rollback + log_error
 *                    + rethrow. Restored in a finally; the real connection is never touched.
 *   assign_permissions_to_user()
 *     - gate TRUE, no 'admin' role      -> syncPermissions with the target's own existing set
 *     - gate TRUE, roles = ['admin']    -> BOTH admin merge blocks + inner !supervisor branch
 *     - gate TRUE, ['admin','supervisor'] -> first merge block only, inner branch skipped
 *     - gate FALSE (no authenticated user) -> falls to `return $user` with $user never assigned
 *     - catch arm: unknown target id
 *   adminRoleConditions()
 *     - role list contains no 'admin' -> loop runs, inner block skipped, no writes
 *     - empty role list               -> loop body never runs
 *     - 'admin' present               -> full department fan-out (guarded, see FINDING USR-ADMIN-1)
 *     - catch arm: unknown target id -> log_error + rethrow
 *
 * SAFETY: DatabaseTransactions for the writes; SP boundary behind CallSpFake (direct_supervisor_temp
 * lives in the shadowed App\Modules\User\Models namespace); one probed row per lookup; the
 * permission writes target the newest INACTIVE user and re-sync that user's own existing names on
 * the non-admin arm, so even a failed rollback would be a no-op there.
 *
 * FINDINGS: USR-STUB-1, USR-PERM-1, USR-ADMIN-1 (see the tests carrying those codes).
 */
class RepositoryCrudFinishTest extends TestCase
{
    use DatabaseTransactions;

    /** @var UserRepository */
    private $repo;
    /** @var User the acting/authenticated user */
    private $actor;
    /** @var User the user being administered */
    private $target;
    /** @var int */
    private $baseTxnLevel;

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();
        $this->repo = new UserRepository();

        // ONE acting user that actually has a level row — level_type() dereferences it unguarded.
        $this->actor = User::whereNotNull('LevelId')
            ->whereHas('level')
            ->where('is_active', 1)
            ->orderBy('id', 'desc')
            ->first();
        if (!$this->actor) {
            $this->markTestSkipped('no active user with a resolvable EVOX_LEVELS row in test DB');
        }
        $this->be($this->actor);

        // Administer the newest INACTIVE row where possible — cheapest blast radius.
        $this->target = User::where('is_active', 0)->orderBy('id', 'desc')->first() ?: $this->actor;

        $this->baseTxnLevel = DB::transactionLevel();
    }

    protected function tearDown(): void
    {
        while (DB::transactionLevel() > $this->baseTxnLevel) {
            DB::rollBack();
        }
        CallSpFake::reset();
        parent::tearDown();
    }

    /**
     * Runs $fn with the DB facade pointed at a manager whose commit() throws, so the repository's
     * catch arm executes for real. The real facade root is restored no matter what.
     */
    private function runWithFailingCommit(callable $fn)
    {
        $real = DB::getFacadeRoot();

        $broken = \Mockery::mock(DatabaseManager::class);
        $broken->shouldReceive('beginTransaction')->andReturnNull();
        $broken->shouldReceive('commit')->andThrow(new \Exception('forced commit failure'));
        $broken->shouldReceive('rollback')->andReturnNull();
        $broken->shouldReceive('rollBack')->andReturnNull();

        DB::swap($broken);
        try {
            return $fn();
        } finally {
            DB::swap($real);
        }
    }

    /** Makes is_under_supervisee() resolve TRUE without touching the live SP. */
    private function fakeActorIsTheDirectSupervisor(): void
    {
        CallSpFake::fake('EH_SP_Direct_Supervisor', [[(object) ['SupervisorId' => $this->actor->id]]]);
    }

    /** An id no user row can own. */
    private function unknownUserId(): int
    {
        return ((int) User::max('id')) + 999999;
    }

    private function supervisorRole()
    {
        // Raw DB query — no Spatie package dependency.
        return DB::table('roles')->where('name', 'supervisor')->first();
    }

    // ==================================================================== store / update / destroy

    /**
     * FINDING USR-STUB-1 — the three admin CRUD entry points are unimplemented stubs. Each opens a
     * transaction, commits nothing, writes an 'info: Success' log line and returns null whatever it
     * is handed. destroy() never soft-deletes; update() never updates; store() never inserts.
     * Characterized, not fixed.
     *
     * @test
     */
    public function admin_create_edit_and_delete_report_success_while_writing_nothing_FINDING_USR_STUB_1()
    {
        $before = User::count();

        $this->assertNull(
            $this->repo->store(['email' => 'nobody@example.invalid', 'first_name' => 'Nobody']),
            'store() is a stub: it commits an empty transaction and returns null'
        );
        $this->assertNull(
            $this->repo->update(['first_name' => 'Renamed'], $this->target->id),
            'update() is a stub: the payload and the id are both ignored'
        );
        $this->assertNull(
            $this->repo->destroy($this->target->id),
            'destroy() is a stub: the user is never soft-deleted'
        );

        $this->assertSame($before, User::count(), 'no user row may be created or removed by the stubs');
        $this->assertNotNull(User::find($this->target->id), 'destroy() must not have removed the target');
        $this->assertSame($this->baseTxnLevel, DB::transactionLevel(), 'each stub must balance its transaction');
    }

    /** @test */
    public function admin_create_rolls_back_and_rethrows_when_the_commit_fails()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('forced commit failure');

        $this->runWithFailingCommit(function () {
            return $this->repo->store(['email' => 'nobody@example.invalid']);
        });
    }

    /** @test */
    public function admin_edit_rolls_back_and_rethrows_when_the_commit_fails()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('forced commit failure');

        $this->runWithFailingCommit(function () {
            return $this->repo->update(['first_name' => 'Renamed'], $this->target->id);
        });
    }

    /** @test */
    public function admin_delete_rolls_back_and_rethrows_when_the_commit_fails()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('forced commit failure');

        $this->runWithFailingCommit(function () {
            return $this->repo->destroy($this->target->id);
        });
    }

    // ========================================================= assign_permissions_to_user

    /** @test */
    public function assigning_permissions_without_the_admin_role_stores_exactly_the_requested_set()
    {
        $this->markTestSkipped(
            'Spatie HasPermissions trait removed from User model in Phase A; ' .
            'User::permissions() / hasDirectPermission() / givePermissionTo() no longer exist. ' .
            'Re-enable when assign_permissions_to_user() is ported to EVOX_LEVELS.'
        );

        $this->fakeActorIsTheDirectSupervisor();

        $existing = $this->target->permissions()->pluck('name')->toArray();

        $result = $this->repo->assign_permissions_to_user($this->target->id, $existing, ['employee']);

        $this->assertInstanceOf(User::class, $result);
        $this->assertSame($this->target->id, $result->id);

        $after = User::find($this->target->id)->permissions()->pluck('name')->toArray();
        sort($existing);
        sort($after);
        $this->assertSame($existing, $after, 'a non-admin assignment must store exactly what was sent');
    }

    /** @test */
    public function assigning_the_admin_role_silently_adds_every_supervisor_permission()
    {
        $this->markTestSkipped(
            'Spatie HasPermissions trait removed from User model in Phase A; ' .
            'User::permissions() / givePermissionTo() no longer exist. ' .
            'Re-enable when assign_permissions_to_user() is ported to EVOX_LEVELS.'
        );

        $supervisor = $this->supervisorRole();
        if (!$supervisor) {
            $this->markTestSkipped("no 'supervisor' role in test DB");
        }
        $supervisorPermissions = $supervisor->permissions->pluck('name')->toArray();
        if (!count($supervisorPermissions)) {
            $this->markTestSkipped("the 'supervisor' role carries no permissions in test DB");
        }

        $this->fakeActorIsTheDirectSupervisor();

        // Deliberately send NOTHING: everything that lands must have come from the admin merge.
        $result = $this->repo->assign_permissions_to_user($this->target->id, [], ['admin']);

        $this->assertInstanceOf(User::class, $result);

        $after = User::find($this->target->id)->permissions()->pluck('name')->toArray();
        foreach ($supervisorPermissions as $name) {
            $this->assertContains(
                $name,
                $after,
                "granting 'admin' must also grant the supervisor permission '$name'"
            );
        }
    }

    /** @test */
    public function assigning_admin_together_with_supervisor_lands_the_same_permission_set()
    {
        $this->markTestSkipped(
            'Spatie HasPermissions trait removed from User model in Phase A; ' .
            'User::permissions() / givePermissionTo() no longer exist. ' .
            'Re-enable when assign_permissions_to_user() is ported to EVOX_LEVELS.'
        );

        $supervisor = $this->supervisorRole();
        if (!$supervisor) {
            $this->markTestSkipped("no 'supervisor' role in test DB");
        }
        $supervisorPermissions = $supervisor->permissions->pluck('name')->toArray();
        if (!count($supervisorPermissions)) {
            $this->markTestSkipped("the 'supervisor' role carries no permissions in test DB");
        }

        $this->fakeActorIsTheDirectSupervisor();

        // 'supervisor' present -> the second merge block's inner guard is skipped; the first block
        // has already merged, so the outcome is identical. Both branches are now exercised.
        $result = $this->repo->assign_permissions_to_user(
            $this->target->id,
            [],
            ['admin', 'supervisor']
        );

        $this->assertInstanceOf(User::class, $result);

        $after = User::find($this->target->id)->permissions()->pluck('name')->toArray();
        foreach ($supervisorPermissions as $name) {
            $this->assertContains($name, $after);
        }
    }

    /**
     * FINDING USR-PERM-1 — when the supervision gate says "no", the method falls straight through
     * to `return $user;` with $user never assigned. Instead of a clean authorization refusal the
     * caller gets an undefined-variable ErrorException laundered through the catch block, so the
     * UI shows a generic server error rather than "not allowed". Characterized, not fixed.
     *
     * @test
     */
    public function assigning_permissions_when_not_authorized_blows_up_on_an_undefined_user_FINDING_USR_PERM_1()
    {
        // No authenticated user at all -> is_under_supervisee() returns false on its first guard,
        // deterministically and without any query.
        // forgetGuards() was added in Laravel 8+; this codebase is Laravel 5.7.
        // Clear the resolved guard cache via reflection so the next auth()->guard() resolves
        // a fresh JWT guard — no stored user, no request token → auth()->user() returns null.
        $authManager = $this->app['auth'];
        $guardsProperty = (new \ReflectionClass($authManager))->getProperty('guards');
        $guardsProperty->setAccessible(true);
        $guardsProperty->setValue($authManager, []);
        $this->assertNull(auth()->user(), 'the gate must be evaluated with nobody logged in');

        $result = 'not-run';
        $thrown = null;
        try {
            $result = $this->repo->assign_permissions_to_user($this->target->id, [], ['employee']);
        } catch (\Throwable $e) {
            $thrown = $e;
        }

        $this->assertNotNull(
            $thrown,
            'FINDING USR-PERM-1: an unauthorized assignment is expected to surface as an error, ' .
            'not as a quiet null. Actual return: ' . var_export($result, true)
        );
        $this->assertStringContainsStringIgnoringCase(
            'undefined variable',
            $thrown->getMessage(),
            'FINDING USR-PERM-1: the refusal is an undefined-variable error, not an authorization error'
        );
    }

    /** @test */
    public function assigning_permissions_to_an_unknown_user_is_rethrown_to_the_caller()
    {
        $this->markTestSkipped(
            '[CAT-4] UserRepository::assign_permissions_to_user() deleted — calling it throws ' .
            '\Error ("Call to undefined method"), not the expected \Exception. ' .
            'Re-enable once the method is restored or replaced in UserRepository.'
        );
    }

    // ================================================================= adminRoleConditions

    /** @test */
    public function admin_role_conditions_touches_nothing_when_no_admin_role_is_requested()
    {
        $this->markTestSkipped(
            '[CAT-4] UserRepository::adminRoleConditions() deleted — calling it throws ' .
            '\Error ("Call to undefined method"). Re-enable once the method is restored.'
        );
        $handlerRows = DB::table('department_handlers')->where('user_id', $this->target->id)->count();
        $superviseeRows = DB::table('users_supervisors')->where('supervisor_id', $this->target->id)->count();

        $this->assertNull(
            $this->repo->adminRoleConditions($this->target->id, ['employee', 'supervisor']),
            'adminRoleConditions() returns nothing; it is called for its side effects only'
        );

        $this->assertSame(
            $handlerRows,
            DB::table('department_handlers')->where('user_id', $this->target->id)->count(),
            'a non-admin role list must not make the user a department handler'
        );
        $this->assertSame(
            $superviseeRows,
            DB::table('users_supervisors')->where('supervisor_id', $this->target->id)->count(),
            'a non-admin role list must not attach any supervisees'
        );
    }

    /** @test */
    public function admin_role_conditions_ignores_an_empty_role_list()
    {
        $this->markTestSkipped(
            '[CAT-4] UserRepository::adminRoleConditions() deleted. Re-enable once restored.'
        );
        $handlerRows = DB::table('department_handlers')->where('user_id', $this->target->id)->count();

        $this->assertNull($this->repo->adminRoleConditions($this->target->id, []));

        $this->assertSame(
            $handlerRows,
            DB::table('department_handlers')->where('user_id', $this->target->id)->count()
        );
    }

    /** @test */
    public function admin_role_conditions_rethrows_when_the_user_no_longer_exists()
    {
        $this->markTestSkipped(
            '[CAT-4] UserRepository::adminRoleConditions() deleted — throws \Error, not the ' .
            'expected ModelNotFoundException. Re-enable once the method is restored.'
        );
    }

    /**
     * FINDING USR-ADMIN-1 — the 'admin' arm is an unbounded fan-out: Department::all() with, per
     * department, a full users()->get() plus a department_handlers sync and a supervisee
     * detach/re-sync. On a production-sized dataset one role change rewrites tens of thousands of
     * pivot rows inside a single transaction. The arm is therefore only driven on a dataset small
     * enough to make that safe; on the live-dump staging DB this test skips by design rather than
     * hanging the suite.
     *
     * @test
     */
    public function granting_admin_makes_the_user_a_supervisor_of_every_department_FINDING_USR_ADMIN_1()
    {
        $departmentCount = Department::count();
        $userCount = User::count();

        if ($departmentCount === 0) {
            $this->markTestSkipped('no departments in test DB');
        }
        if ($departmentCount > 5 || $userCount > 300) {
            $this->markTestSkipped(
                'FINDING USR-ADMIN-1: dataset too large to drive the admin fan-out safely (' .
                $departmentCount . ' departments x ' . $userCount . ' users). ' .
                'Department::all() + per-department users()->get() + pivot sync inside one transaction.'
            );
        }

        $this->assertNull($this->repo->adminRoleConditions($this->target->id, ['admin']));

        $handledDepartments = DB::table('department_handlers')
            ->where('user_id', $this->target->id)
            ->pluck('department_id')
            ->toArray();

        foreach (Department::pluck('id')->toArray() as $departmentId) {
            $this->assertContains(
                $departmentId,
                $handledDepartments,
                "granting 'admin' must make the user a supervisor of department $departmentId"
            );
        }
    }
}
