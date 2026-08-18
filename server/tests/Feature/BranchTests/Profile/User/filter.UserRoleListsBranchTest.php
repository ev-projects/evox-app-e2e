<?php
/**
 * COVERAGE WAVE 2026-08-18 — the three "list users by X" endpoints, two of which were completely
 * untested, plus the UserRepository::list_via_department arms behind them.
 *
 * Source under test:
 *   server/app/Modules/User/Http/Controllers/UserController.php   list_via_role, list_via_department,
 *                                                                list_via_team
 *   server/app/Modules/User/Repositories/UserRepository.php       list_via_department
 * Menu -> Page:  Profile -> User (role / department / team pickers)
 * Routes (app/Modules/User/Routes/api.php, mounted under /api):
 *   GET /api/role/{role}/users              -> list_via_role
 *   GET /api/department/{department_id}/users -> list_via_department
 *   GET /api/team/{team_id}/users           -> list_via_team
 *
 * Coverage before this file: list_via_role 0%, list_via_department (controller) 0%,
 *   list_via_team 77.78%, UserRepository::list_via_department 20%.
 *
 * SEAMS: Support/CallSpFake.php (EH_SP_Employee_List for the role branch, and
 * EH_SP_Get_Department_By_UserId which UserListResource triggers once per listed row while the
 * response serialises) and Support/UserModuleHelperFake.php (log_activity, the only statement
 * inside the try{} of these actions that can fail before their real work starts, so it is what
 * reaches their catch arms).
 *
 * FINDINGS raised here:
 *   F-USR-TEAMUSERS-1  list_via_team() calls $this->user->list_via_department($team_id)
 *                      (UserController.php:782) — the team endpoint queries the DEPARTMENT table
 *                      with the team id. GET /api/team/{n}/users and GET /api/department/{n}/users
 *                      return byte-identical payloads; the team picker has never listed teams.
 */

namespace Tests\Feature\BranchTests\Profile\User;

require_once __DIR__ . '/../../Support/CallSpFake.php';
require_once __DIR__ . '/../../Support/UserModuleHelperFake.php';

use Exception;
use Mockery;
use Tests\TestCase;
use Tests\Support\CallSpFake;
use Tests\Support\UserModuleHelperFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\EvoxLevels;
use App\Modules\Department\Models\Department;
use App\Modules\User\Models\User;

class UserRoleListsFilterBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();

        CallSpFake::activate();
        // UserListResource asks this per listed row; harmless empty answer keeps the seam quiet.
        CallSpFake::fake('EH_SP_Get_Department_By_UserId', [[]]);

        UserModuleHelperFake::activate();

        $level = EvoxLevels::where('Name', 'Admin')->first();
        $this->admin = $level
            ? User::where('LevelId', $level->LevelId)->where('is_active', 1)
                  ->orderBy('id', 'desc')->first()
            : null;

        if (!$this->admin) {
            $this->markTestSkipped('no active Admin-level user in test DB');
        }
        $this->actingAs($this->admin, 'api');
    }

    protected function tearDown(): void
    {
        UserModuleHelperFake::reset();
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    /** A department that currently has at least one active user, or null. */
    private function populatedDepartment()
    {
        $departmentId = DB::table('users')
            ->whereNull('deleted_at')
            ->where('is_active', 1)
            ->whereNotNull('department_id')
            ->orderBy('department_id', 'desc')
            ->value('department_id');

        return $departmentId ? Department::find($departmentId) : null;
    }

    // ================================================================= list_via_role()

    /**
     * The "supervisor" keyword is answered straight from EVOX levels: everyone on a supervisory
     * level (1-8) who is still active, and nobody on the plain employee level.
     */
    /** @test */
    public function list_via_role__filter__supervisor__lists_supervisory_levels_only()
    {
        $supervisor = User::whereIn('LevelId', [1, 2, 3, 4, 5, 6, 7, 8])
            ->where('is_active', 1)->orderBy('id', 'desc')->first();
        $employee = User::where('LevelId', 0)->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$supervisor || !$employee) {
            $this->markTestSkipped('need both a supervisory-level and a plain-employee user');
        }

        $res = $this->getJson('/api/role/supervisor/users');

        $res->assertStatus(200);
        $this->assertSame(trans('messages.list_role_success'), $res->json('message'));
        $ids = array_column(array_values($res->json('content')), 'id');
        $this->assertContains($supervisor->id, $ids);
        $this->assertNotContains($employee->id, $ids);
    }

    /**
     * Any other keyword must name a real row in `roles`; the employee list then comes from the
     * stored procedure, scoped to the caller and flattened to id + full_name for the picker.
     */
    /** @test */
    public function list_via_role__filter__known_role__maps_the_sp_rows_to_id_and_full_name()
    {
        $roleName = DB::table('roles')->value('name');
        if (!$roleName) {
            $this->markTestSkipped('no rows in the roles table');
        }
        CallSpFake::fake('EH_SP_Employee_List', [
            [], [],
            [(object) ['id' => 21, 'Employee_Name' => 'Alice Tester', 'job_title' => 'QA'],
             (object) ['id' => 22, 'Employee_Name' => 'Bob Tester', 'job_title' => 'Dev']],
        ]);

        $res = $this->getJson('/api/role/' . rawurlencode($roleName) . '/users?department_id=5&name=te');

        $res->assertStatus(200);
        $this->assertSame(
            [['id' => 21, 'full_name' => 'Alice Tester'], ['id' => 22, 'full_name' => 'Bob Tester']],
            $res->json('content')
        );
        // the picker drops every other SP column
        $this->assertArrayNotHasKey('job_title', $res->json('content.0'));

        $params = CallSpFake::callsFor('EH_SP_Employee_List')[0]['params'];
        $this->assertEquals($this->admin->id, $params[0]);
        $this->assertEquals($this->admin->LevelId, $params[1]);
        $this->assertEquals(5, $params[2]);          // department filter from the query string
        $this->assertNull($params[3]);               // no sub-department asked for
        $this->assertSame(1, $params[4]);            // active employees only
        $this->assertSame('te', $params[5]);         // name filter
        $this->assertSame(1, $params[7]);            // page defaults to 1
    }

    /** Other arm: the stored procedure found nobody, so the picker gets an empty list. */
    /** @test */
    public function list_via_role__filter__known_role_with_no_matches__returns_an_empty_list()
    {
        $roleName = DB::table('roles')->value('name');
        if (!$roleName) {
            $this->markTestSkipped('no rows in the roles table');
        }
        CallSpFake::fake('EH_SP_Employee_List', [[], [], []]);

        $res = $this->getJson('/api/role/' . rawurlencode($roleName) . '/users');

        $res->assertStatus(200);
        $this->assertSame([], $res->json('content'));
    }

    /** A role that is not in the roles table is rejected before the stored procedure is reached. */
    /** @test */
    public function list_via_role__filter__unknown_role__error_400()
    {
        $res = $this->getJson('/api/role/no-such-role-' . uniqid() . '/users');

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
        $this->assertSame([], CallSpFake::callsFor('EH_SP_Employee_List'));
    }

    /** @test */
    public function list_via_role__filter__activity_log_write_fails__error_400()
    {
        UserModuleHelperFake::failLogActivity(new Exception('activity log unavailable'));

        $res = $this->getJson('/api/role/supervisor/users');

        $res->assertStatus(400);
        $this->assertSame('activity log unavailable', $res->json('error.content'));
    }

    // =========================================================== list_via_department()

    /** The department picker pages its active members 15 at a time. */
    /** @test */
    public function list_via_department__filter__populated_department__returns_active_members_paged_15()
    {
        $department = $this->populatedDepartment();
        if (!$department) {
            $this->markTestSkipped('no department with an active user in test DB');
        }
        $active = $department->users()->where('is_active', 1)->count();

        $res = $this->getJson('/api/department/' . $department->id . '/users');

        $res->assertStatus(200);
        $this->assertSame(trans('messages.list_role_success'), $res->json('message'));
        $this->assertCount(min(15, $active), $res->json('content'));   // one page's worth
        foreach ($res->json('content') as $row) {
            $this->assertEquals(1, $row['is_active']);      // inactive members are never listed
        }
    }

    /** Other arm: page=all switches the repository from a paginator to the full list. */
    /** @test */
    public function list_via_department__filter__page_all__returns_every_active_member_unpaged()
    {
        $department = $this->populatedDepartment();
        if (!$department) {
            $this->markTestSkipped('no department with an active user in test DB');
        }
        $active = $department->users()->where('is_active', 1)->count();

        $res = $this->getJson('/api/department/' . $department->id . '/users?page=all');

        $res->assertStatus(200);
        $this->assertCount($active, $res->json('content'));            // the page cap is lifted
    }

    /**
     * A department id that does not exist returns an empty list rather than blowing up — the
     * USR-NULL-1 guard in UserRepository::list_via_department (line 1062).
     */
    /** @test */
    public function list_via_department__filter__unknown_department__returns_an_empty_list()
    {
        $missing = (int) Department::max('id') + 100000;

        $res = $this->getJson('/api/department/' . $missing . '/users');

        $res->assertStatus(200);
        $this->assertSame([], $res->json('content'));
    }

    /** A department id that is not a number fails the int rule. */
    /** @test */
    public function list_via_department__filter__non_numeric_id__error_400()
    {
        $res = $this->getJson('/api/department/not-a-number/users');

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
    }

    // ================================================================= list_via_team()

    /**
     * F-USR-TEAMUSERS-1 — characterised as it behaves today. The team endpoint forwards its team id
     * to UserRepository::list_via_department, so it answers with the members of the DEPARTMENT that
     * happens to carry that id. Proven by comparing it against the department endpoint for the same
     * number: the two payloads are identical. When the endpoint is pointed at teams this fails.
     */
    /** @test */
    public function list_via_team__filter__returns_the_department_with_that_id_not_the_team_FINDING_F_USR_TEAMUSERS_1()
    {
        $department = $this->populatedDepartment();
        if (!$department) {
            $this->markTestSkipped('no department with an active user in test DB');
        }

        $viaTeam = $this->getJson('/api/team/' . $department->id . '/users');
        $viaDepartment = $this->getJson('/api/department/' . $department->id . '/users');

        $viaTeam->assertStatus(200);
        $this->assertSame($viaDepartment->json('content'), $viaTeam->json('content'));
    }

    /** A team id that does not exist as a department yields an empty list. */
    /** @test */
    public function list_via_team__filter__unknown_id__returns_an_empty_list()
    {
        $missing = (int) Department::max('id') + 100000;

        $res = $this->getJson('/api/team/' . $missing . '/users');

        $res->assertStatus(200);
        $this->assertSame([], $res->json('content'));
    }

    /** @test */
    public function list_via_team__filter__non_numeric_id__error_400()
    {
        $res = $this->getJson('/api/team/not-a-number/users');

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
    }

    /** @test */
    public function list_via_team__filter__activity_log_write_fails__error_400()
    {
        UserModuleHelperFake::failLogActivity(new Exception('activity log unavailable'));

        $res = $this->getJson('/api/team/1/users');

        $res->assertStatus(400);
        $this->assertSame('activity log unavailable', $res->json('error.content'));
    }
}
