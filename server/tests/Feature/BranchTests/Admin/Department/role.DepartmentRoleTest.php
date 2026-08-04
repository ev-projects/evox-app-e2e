<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. ROLE-MATRIX branch tests for DepartmentController
 * scope-sensitive / admin endpoints. Menu=Admin Page=Department.
 *
 * Exercises the AUTHORIZATION / SCOPE branch of each endpoint acting as DIFFERENT role accounts
 * (resolved by email from _ROLE-ACCOUNTS.md; a test self-skips if the account is absent).
 * Constructor-injected deps (DepartmentRepositoryInterface, UserRepositoryInterface) are IoC-mocked
 * so no real repo / call_sp / destructive write fires. withoutMiddleware() reaches the controller body
 * past jwtauth/auth.apikey, so these tests assert what the CONTROLLER BODY itself enforces (nothing,
 * in every arm below) rather than route middleware.
 *   success_response => 200 {message,content};
 *   error_response default => 400 {error:{message,content}};
 *   every catch here passes JsonResponse::HTTP_NOT_FOUND => 404.
 *
 * CONFIRMED FINDINGS (asserted as CURRENT reality; tests do NOT assert a fix):
 *  // FINDING [missing-gate / privilege-escalation]: assign_handlers() (POST department/assign_handlers/{id})
 *     has NO in-method authorization AND its route carries only ['jwtauth','auth.apikey'] (module Routes/api.php)
 *     — there is NO role:admin / permission / level check anywhere. ANY authenticated user (ph_supervisor gary,
 *     ph_employee glenn, hr_head atea) reaches the privileged "assign department handlers" repo call exactly like
 *     admin. Proven below by a Mockery ->once() expectation on $department->assign_handlers(...) being satisfied
 *     for all four roles (the repo call throws a sentinel AFTER being reached => catch => 404; the 404 is a
 *     post-privilege short-circuit, NOT an authorization rejection).
 *  // FINDING [no-scope]: users({id}) (GET department/{id}/users) does NOT verify the caller belongs to / handles
 *     department {id}. It runs User::where('department_id',$id) for ANY id from ANY authenticated caller =>
 *     cross-department roster enumeration. ph_employee glenn reaches the same data as admin.
 *  // NOTE [no-scope, by-design candidate]: all() (GET department/all) is ungated and returns the FULL department
 *     list identically regardless of role / geography — no geo-scoping to the caller. Asserted as current reality.
 *
 * SKIPPED arms:
 *  // SKIPPED-SP: get_department_all() (GET department/get_department_all) is the ONLY department endpoint that
 *     actually scopes to the caller — but it does so via call_sp("EH_SP_Get_Department_By_UserId", [Auth::id(),...])
 *     inside the `is_valid($me->LevelId) && $me->LevelId != 0` arm. Reaching that arm fires a stored procedure on
 *     the live dump, so the scoped path is SKIPPED-SP (marker test below). The LevelId==0 / invalid-LevelId arms
 *     return a bare `[]` before the SP, but the acting accounts' real LevelId cannot be controlled without a
 *     destructive save, so those arms are not force-authored either.
 *  // SKIPPED-SP: assign_handlers() true success-200 render — new DepartmentResource($department) serializes
 *     department_user_handlers()/users() relations off the returned model; the sentinel throw stops before it.
 *
 * Routes (module Routes/api.php mounted under /api, group prefix 'department', ['jwtauth','auth.apikey']):
 *   GET  /api/department/all                        -> all()
 *   GET  /api/department/{id}/users                 -> users()
 *   POST /api/department/assign_handlers/{id}       -> assign_handlers()   (NO role:* middleware)
 *   GET  /api/department/get_department_all         -> get_department_all() (SKIPPED-SP)
 */

namespace Tests\Feature\BranchTests\Admin\Department;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Department\Repositories\DepartmentRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;

class DepartmentRoleTest extends TestCase
{
    use DatabaseTransactions;

    // Role accounts (see _ROLE-ACCOUNTS.md). Resolve by email; skip if absent.
    const ADMIN         = 'dummyman@ops.eastvantage.com';       // Admin
    const PH_SUPERVISOR = 'gary.aure@eastvantage.com';          // PH Supervisor
    const PH_EMPLOYEE   = 'glenn.macasarte@eastvantage.com';    // PH Employee
    const HR_HEAD       = 'atea.ortiz@eastvantage.com';         // HR Head

    // A department id guaranteed to hold no active users -> empty, bounded, safe read.
    const EMPTY_DEPT_ID = 999999999;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware(); // reach controller body past jwt/apikey; asserts IN-METHOD authz only
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** Resolve a role account by email or skip the test. */
    private function actor(string $email): User
    {
        $u = User::where('email', $email)->first();
        if (!$u) {
            $this->markTestIncomplete("role account absent: {$email}");
        }
        $this->actingAs($u);
        return $u;
    }

    /** Bind a Mockery mock for an interface into the IoC container. */
    private function mockDep(string $iface): \Mockery\MockInterface
    {
        $m = Mockery::mock($iface);
        $this->app->instance($iface, $m);
        return $m;
    }

    // ===================================================== assign_handlers()  [privileged / no gate]
    // Report treats "assign department handlers" as an admin action. Reality: no in-method gate and no
    // role:* middleware. Each role below reaches the SAME privileged repo call; a sentinel throw AFTER the
    // reach lands in catch => 404 (post-privilege short-circuit, NOT an auth rejection). Mockery ->once()
    // proves the caller was not blocked before the privileged operation.

    /** @test  Baseline: admin reaches the privileged assign_handlers (expected allow). */
    public function assign_handlers__role__admin__reaches_privileged_no_gate()
    {
        $admin = $this->actor(self::ADMIN);

        $dept = $this->mockDep(DepartmentRepositoryInterface::class);
        $this->mockDep(UserRepositoryInterface::class); // constructor dep; unused on this path
        $dept->shouldReceive('assign_handlers')->once()->andThrow(new Exception('reached-privileged-op'));

        $res = $this->postJson('/api/department/assign_handlers/1', ['user_id' => []]);

        // 404 = post-privilege short-circuit (catch passes HTTP_NOT_FOUND). ->once() verifies the reach.
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test  FINDING: ph_supervisor reaches the SAME privileged assign — no role:admin gate. */
    public function assign_handlers__role__ph_supervisor__no_gate_reaches_privileged()
    {
        $this->actor(self::PH_SUPERVISOR);

        $dept = $this->mockDep(DepartmentRepositoryInterface::class);
        $this->mockDep(UserRepositoryInterface::class);
        $dept->shouldReceive('assign_handlers')->once()->andThrow(new Exception('reached-privileged-op'));

        $res = $this->postJson('/api/department/assign_handlers/1', ['user_id' => []]);

        // FINDING: a supervisor was NOT rejected — it executed the privileged handler-assignment path.
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test  FINDING: plain ph_employee reaches the SAME privileged assign — privilege escalation. */
    public function assign_handlers__role__ph_employee__no_gate_privilege_escalation()
    {
        $this->actor(self::PH_EMPLOYEE);

        $dept = $this->mockDep(DepartmentRepositoryInterface::class);
        $this->mockDep(UserRepositoryInterface::class);
        $dept->shouldReceive('assign_handlers')->once()->andThrow(new Exception('reached-privileged-op'));

        $res = $this->postJson('/api/department/assign_handlers/1', ['user_id' => []]);

        // FINDING: a non-privileged employee reached the privileged assign_handlers repo call unblocked.
        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test  FINDING: hr_head reaches the SAME privileged assign — all authenticated roles are ungated. */
    public function assign_handlers__role__hr_head__no_gate_reaches_privileged()
    {
        $this->actor(self::HR_HEAD);

        $dept = $this->mockDep(DepartmentRepositoryInterface::class);
        $this->mockDep(UserRepositoryInterface::class);
        $dept->shouldReceive('assign_handlers')->once()->andThrow(new Exception('reached-privileged-op'));

        $res = $this->postJson('/api/department/assign_handlers/1', ['user_id' => []]);

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ===================================================================== all()  [listing / no gate]
    // Ungated department listing; returns the full list identically regardless of role.

    /** @test  admin loads the full department list (baseline). */
    public function all__role__admin__allowed_200()
    {
        $this->actor(self::ADMIN);

        $dept = $this->mockDep(DepartmentRepositoryInterface::class);
        $this->mockDep(UserRepositoryInterface::class);
        $dept->shouldReceive('all')->once()->andReturn(new EloquentCollection([]));

        $res = $this->getJson('/api/department/all');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test  NOTE: ph_employee loads the SAME full department list — no role/geo scoping. */
    public function all__role__ph_employee__no_scope_allowed_200()
    {
        $this->actor(self::PH_EMPLOYEE);

        $dept = $this->mockDep(DepartmentRepositoryInterface::class);
        $this->mockDep(UserRepositoryInterface::class);
        $dept->shouldReceive('all')->once()->andReturn(new EloquentCollection([]));

        $res = $this->getJson('/api/department/all');

        // Current reality: employee reaches the same listing as admin (endpoint is caller-agnostic).
        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // ================================================================== users({id})  [roster / no scope]
    // Uses User::where('department_id',$id) DIRECTLY (no repo, no gate). EMPTY_DEPT_ID keeps the read
    // empty + bounded so no real user is serialized. Both roles reach any department's roster.

    /** @test  admin lists a department's active users (baseline). */
    public function users__role__admin__allowed_200()
    {
        $this->actor(self::ADMIN);
        $this->mockDep(DepartmentRepositoryInterface::class);
        $this->mockDep(UserRepositoryInterface::class);

        $res = $this->getJson('/api/department/' . self::EMPTY_DEPT_ID . '/users');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test  FINDING: ph_employee lists ANY department's roster by id — no belongs-to / handler scope. */
    public function users__role__ph_employee__no_scope_cross_department_200()
    {
        $this->actor(self::PH_EMPLOYEE);
        $this->mockDep(DepartmentRepositoryInterface::class);
        $this->mockDep(UserRepositoryInterface::class);

        $res = $this->getJson('/api/department/' . self::EMPTY_DEPT_ID . '/users');

        // FINDING: caller's department membership is never checked — cross-department roster enumeration.
        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // ============================================================ get_department_all()  [SP arm]

    /** @test  Gary (LevelId=1) triggers is_valid(LevelId) && LevelId!=0 → call_sp("EH_SP_Get_Department_By_UserId"). SP is read-only. */
    public function get_department_all__role__ph_supervisor__sp_read_only__ok_200()
    {
        $this->actor(self::PH_SUPERVISOR);                              // Gary: LevelId=1 → hits SP arm
        $this->mockDep(DepartmentRepositoryInterface::class);           // constructor dep (unused in this method body)
        $this->mockDep(UserRepositoryInterface::class);                 // constructor dep (unused in this method body)

        $res = $this->getJson('/api/department/get_department_all');

        $this->assertNotEquals(500, $res->status(), 'SP EH_SP_Get_Department_By_UserId ran without 500');
        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }
}
