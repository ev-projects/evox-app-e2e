<?php
/**
 * COVERAGE WAVE 2026-08-18 — the uncovered residue of the UserController read endpoints.
 *
 * Source under test:
 *   server/app/Modules/User/Http/Controllers/UserController.php
 *     schedule_history, schedule_info, my_team_list_under_department,
 *     sub_department_under_department, sub_department_list,
 *     my_team_list_under_selected_department, user_info, get_user_by_string,
 *     get_user_sub_department_handled, get_user_feature, get_features,
 *     getUserCountry, getCountry
 *   (reached through App\Modules\User\Models\User::evox_sub_departments_handled and
 *    ::departments_team, which are asserted here from the HTTP side)
 * Menu -> Page:  Profile -> User (team + sub-department pickers, feature matrix, country lists)
 * Routes: app/Modules/User/Routes/api.php, all mounted under /api.
 *
 * Coverage before this file: schedule_history 77.78%, schedule_info 80%,
 *   my_team_list_under_department 60%, sub_department_under_department 87.5%,
 *   sub_department_list 71.43%, my_team_list_under_selected_department 71.43%,
 *   user_info 80%, get_user_by_string 66.67%, get_user_sub_department_handled 77.78%,
 *   get_user_feature 83.33%, get_features 66.67%, getUserCountry 57.14%, getCountry 71.43%.
 *
 * SEAMS (no live SP, no live HTTP, no writes outside the transaction):
 *   Support/CallSpFake.php           — call_sp() in the controller and model namespaces. An
 *                                      unfaked SP throws, which is exactly how the catch arms of
 *                                      the SP-backed actions are exercised.
 *   Support/UserModuleHelperFake.php — log_activity(). It is the first statement inside the try{}
 *                                      of get_features/get_user_by_string, so arming it to throw
 *                                      models "the audit-log write failed" and is the only way to
 *                                      reach those catch arms.
 *
 * NOTE ON EXPECTED STATUS CODES — Laravel's HandleExceptions bootstrap sets error_reporting(-1) and
 * an error handler that throws ErrorException for every PHP notice. Undefined variables and
 * property reads on null therefore become Exceptions, are caught by these controllers' own
 * catch(Exception) arms, and surface as the 400 envelope carrying the raw PHP message. That is why
 * the findings below are asserted as 400s with an internal identifier leaking into error.content,
 * not as 500s.
 *
 * FINDINGS raised here (details in the report):
 *   F-USR-DEPTTEAM-1  my_team_list_under_department() fails for any caller who is not a
 *                     SubDepartment Head or a Client: User::departments_team() (User.php:817-821)
 *                     assigns $teams_id_array only inside that if, then calls ->get() on it
 *                     unconditionally. Should be an empty list or a permission error.
 *   F-USR-LEVELTYPE-1 get_user_feature() fails for an employee with no access level — the exact
 *                     shape UserRepository::register_user creates — because the response array
 *                     calls $user->level_type() outside the is_valid(LevelId) guard
 *                     (UserController.php:850).
 *   F-USR-FEATURE-1   get_user_feature() does not report an unknown user id as "not found"; it
 *                     reads $user->LevelId straight off the null (UserController.php:841).
 *   F-USR-SELDEPT-1   my_team_list_under_selected_department() reads an undefined $depat_id in its
 *                     is_numeric arm (UserController.php:448), so a single department id sent as a
 *                     scalar instead of an array fails outright.
 *   F-USR-SEARCH-1    get_user_by_string() runs its only DB query OUTSIDE the try (line 797), so a
 *                     database failure there escapes the error envelope entirely while the catch
 *                     guards only the logging and the response build.
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
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\EvoxLevels;
use App\Features;
use App\Modules\Team\Models\Team;
use App\Modules\User\Models\User;

class UserListsLoadBranchTest extends TestCase
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
        UserModuleHelperFake::activate();

        $this->admin = $this->userAtLevel('Admin');
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

    /** Newest active user carrying the named EVOX level, or null when the fixture is absent. */
    private function userAtLevel($levelName)
    {
        $level = EvoxLevels::where('Name', $levelName)->first();
        if (!$level) {
            return null;
        }

        return User::where('LevelId', $level->LevelId)
            ->where('is_active', 1)
            ->orderBy('id', 'desc')
            ->first();
    }

    /** Throwaway copy of a real user so NOT NULL columns are inherited; rolls back with the test. */
    private function replicaOf(User $template, array $overrides = [])
    {
        $uniq = substr(uniqid(), -8);
        $user = $template->replicate();
        $user->email = 'listbranch+' . $uniq . '@example.invalid';
        $user->username = 'listbranch_' . $uniq;
        $user->emp_num = 'LB' . $uniq;
        $user->bhr_num = 'LB' . $uniq;
        $user->password = Hash::make('SeamPass-2026!');

        foreach ($overrides as $column => $value) {
            $user->{$column} = $value;
        }

        $user->save();

        return $user;
    }

    /** The two row-block shapes EH_SP_Get_Department_By_UserId returns for sub-department reads. */
    private function fakeSubDepartmentSp(array $rows = null)
    {
        $rows = $rows === null
            ? [(object) ['Id' => 11, 'SubDepartment' => 'Delivery Ops']]
            : $rows;

        CallSpFake::fake('EH_SP_Get_Department_By_UserId', [$rows]);
    }

    // ============================================================== schedule_history()

    /** The schedule tab lists the employee's schedules five to a page. */
    /** @test */
    public function schedule_history__load__existing_user__returns_a_paginated_schedule_list()
    {
        $res = $this->getJson('/api/user/' . $this->admin->id . '/schedule_history');

        $res->assertStatus(200);
        $this->assertSame(trans('messages.show_default_schedule'), $res->json('message'));
        $res->assertJsonStructure(['content' => [
            'data',
            'pagination' => ['total', 'count', 'per_page', 'current_page', 'last_page'],
        ]]);
        $this->assertSame(5, $res->json('content.pagination.per_page'));
    }

    /** Other arm: ScheduleRepository::list() throws for an id that is not a user at all. */
    /** @test */
    public function schedule_history__load__unknown_user__error_400()
    {
        $missing = User::max('id') + 100000;

        $res = $this->getJson('/api/user/' . $missing . '/schedule_history');

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
        $this->assertSame("User {$missing} not found.", $res->json('error.content'));
    }

    // ================================================================= schedule_info()

    /** A schedule id that does not belong to the employee yields an empty resource, not an error. */
    /** @test */
    public function schedule_info__load__schedule_not_owned_by_the_user__returns_null_content()
    {
        $res = $this->getJson('/api/user/' . $this->admin->id . '/schedule/999999999');

        $res->assertStatus(200);
        $this->assertSame(trans('messages.show_default_schedule'), $res->json('message'));
        $this->assertEmpty($res->json('content')); // controller returns [] not null for a non-owned schedule — fixed 2026-08-25
    }

    /** Other arm: a non-numeric schedule id fails the int rule and is rejected. */
    /** @test */
    public function schedule_info__load__non_numeric_schedule_id__error_400()
    {
        $res = $this->getJson('/api/user/' . $this->admin->id . '/schedule/not-a-number');

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
    }

    // ===================================================================== user_info()

    /** A non-numeric user id fails the int rule and is converted to the error envelope. */
    /** @test */
    public function user_info__load__non_numeric_id__error_400()
    {
        $res = $this->getJson('/api/user/not-a-number/info');

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
    }

    // ================================================== my_team_list_under_department()

    /** A SubDepartment Head sees the teams that sit under the department they picked. */
    /** @test */
    public function my_team_list_under_department__load__sub_department_head__returns_that_departments_teams()
    {
        $head = $this->userAtLevel('SubDepartment Head');
        if (!$head) {
            $this->markTestSkipped('no active SubDepartment Head in test DB');
        }
        $team = Team::whereNotNull('department_id')->orderBy('id', 'desc')->first();
        if (!$team) {
            $this->markTestSkipped('no team with a department in test DB');
        }
        $this->actingAs($head, 'api');

        $res = $this->getJson('/api/user/' . $head->id . '/team_list/' . $team->department_id);

        $res->assertStatus(200);
        $this->assertSame(trans('messages.show_my_team_list'), $res->json('message'));
        $ids = array_column($res->json('content'), 'id');
        $this->assertContains($team->id, $ids);
        foreach ($res->json('content') as $row) {
            $this->assertEquals($team->department_id, $row['department_id']);
        }
    }

    /**
     * F-USR-DEPTTEAM-1 — other arm, characterised as it behaves today. An Admin is neither a
     * SubDepartment Head nor a Client, so User::departments_team() (User.php:817-821) never assigns
     * $teams_id_array yet calls ->get() on it regardless. Laravel promotes the resulting
     * "undefined variable" notice to an ErrorException, so the caller gets the generic 400 envelope
     * carrying an internal variable name instead of an empty team list or a permission error.
     * When the guard is added this test fails — that is the signal to flip it to the fixed shape.
     */
    /** @test */
    public function my_team_list_under_department__load__caller_is_not_a_sub_department_head__error_400_FINDING_F_USR_DEPTTEAM_1()
    {
        $team = Team::whereNotNull('department_id')->orderBy('id', 'desc')->first();
        if (!$team) {
            $this->markTestSkipped('no team with a department in test DB');
        }

        $res = $this->getJson('/api/user/' . $this->admin->id . '/team_list/' . $team->department_id);

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
        $this->assertStringContainsString('teams_id_array', $res->json('error.content'));
    }

    // ============================================== sub_department_under_department()

    /** The sub-department picker maps the stored procedure rows down to Id + Name. */
    /** @test */
    public function sub_department_under_department__load__valid_user__returns_the_mapped_sub_departments()
    {
        $this->fakeSubDepartmentSp([
            (object) ['Id' => 11, 'SubDepartment' => 'Delivery Ops'],
            (object) ['Id' => 12, 'SubDepartmentName' => 'Finance Ops'],
        ]);

        $res = $this->getJson('/api/user/' . $this->admin->id . '/sub_department/7');

        $res->assertStatus(200);
        $this->assertSame(trans('messages.show_sub_department_list'), $res->json('message'));
        $this->assertSame(
            [['Id' => 11, 'Name' => 'Delivery Ops'], ['Id' => 12, 'Name' => 'Finance Ops']],
            $res->json('content')
        );
        // the department the caller picked is what the SP is scoped to
        $params = CallSpFake::callsFor('EH_SP_Get_Department_By_UserId')[0]['params'];
        $this->assertEquals([$this->admin->id, 7, 0, 1], $params);
    }

    /** Other arm: an id that is not a user at all is reported by name in the error envelope. */
    /** @test */
    public function sub_department_under_department__load__unknown_user__error_400()
    {
        $missing = User::max('id') + 100000;

        $res = $this->getJson('/api/user/' . $missing . '/sub_department/7');

        $res->assertStatus(400);
        $this->assertSame("User {$missing} not found.", $res->json('error.content'));
    }

    /** Catch arm: the stored procedure is unavailable. */
    /** @test */
    public function sub_department_under_department__load__stored_procedure_fails__error_400()
    {
        // no CallSpFake::fake() registered -> the seam refuses the call the way a missing SP would
        $res = $this->getJson('/api/user/' . $this->admin->id . '/sub_department/7');

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
    }

    // ============================================================ sub_department_list()

    /** The global sub-department list asks the allocation SP for every active allocation. */
    /** @test */
    public function sub_department_list__load__ok__returns_the_first_result_set()
    {
        CallSpFake::fake('EH_SP_Team_Head_Allocation', [
            [(object) ['Id' => 3, 'Name' => 'Delivery Ops']],
            [(object) ['ignored' => true]],
        ]);

        $res = $this->getJson('/api/user/sub_department_list');

        $res->assertStatus(200);
        $this->assertSame([['Id' => 3, 'Name' => 'Delivery Ops']], $res->json('content'));
        $this->assertSame([null, null, 1, null, null],
            CallSpFake::callsFor('EH_SP_Team_Head_Allocation')[0]['params']);
    }

    /** @test */
    public function sub_department_list__load__stored_procedure_fails__error_400()
    {
        $res = $this->getJson('/api/user/sub_department_list');

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
    }

    // ================================== my_team_list_under_selected_department()

    /** Several departments picked at once: the sub-departments of each are merged into one list. */
    /** @test */
    public function team_list_all__submit__several_departments__merges_the_sub_departments_of_each()
    {
        $calls = 0;
        CallSpFake::fake('EH_SP_Get_Department_By_UserId', function ($params) use (&$calls) {
            $calls++;
            return [[(object) ['Id' => 100 + $params[1], 'SubDepartment' => 'Sub ' . $params[1]]]];
        });

        $res = $this->postJson('/api/user/' . $this->admin->id . '/team_list_all',
            ['departments' => [4, 9]]);

        $res->assertStatus(200);
        $this->assertSame(trans('messages.show_my_team_list'), $res->json('message'));
        $this->assertSame(
            [['Id' => 104, 'Name' => 'Sub 4'], ['Id' => 109, 'Name' => 'Sub 9']],
            $res->json('content')
        );
        $this->assertSame(2, $calls);
    }

    /** No department picked: an empty list comes back and the stored procedure is never called. */
    /** @test */
    public function team_list_all__submit__no_departments__returns_an_empty_list_without_calling_the_sp()
    {
        $res = $this->postJson('/api/user/' . $this->admin->id . '/team_list_all', []);

        $res->assertStatus(200);
        $this->assertSame([], $res->json('content'));
        $this->assertSame([], CallSpFake::callsFor('EH_SP_Get_Department_By_UserId'));
    }

    /**
     * F-USR-SELDEPT-1 — the is_numeric arm passes $depat_id, which is only ever defined by the
     * foreach of the array arm (UserController.php:444-448). A single department sent as a scalar
     * therefore reads an undefined variable, which Laravel promotes to an ErrorException, so the
     * page fails with the generic envelope and the sub-department SP is never reached.
     * Characterised as it behaves today; the fixed shape is 200 with department 4's sub-departments.
     */
    /** @test */
    public function team_list_all__submit__single_department_sent_as_a_scalar__error_400_FINDING_F_USR_SELDEPT_1()
    {
        $this->fakeSubDepartmentSp([(object) ['Id' => 55, 'SubDepartment' => 'Whatever']]);

        $res = $this->postJson('/api/user/' . $this->admin->id . '/team_list_all',
            ['departments' => 4]);

        $res->assertStatus(400);
        $this->assertStringContainsString('depat_id', $res->json('error.content'));
        $this->assertSame([], CallSpFake::callsFor('EH_SP_Get_Department_By_UserId'));
    }

    /** @test */
    public function team_list_all__submit__stored_procedure_fails__error_400()
    {
        $res = $this->postJson('/api/user/' . $this->admin->id . '/team_list_all',
            ['departments' => [4]]);

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
    }

    // ================================================ get_user_sub_department_handled()

    /** The allocation SP is scoped to the employee whose row was opened, in mode 4. */
    /** @test */
    public function user_sub_department_handled__load__ok__returns_the_allocations_for_that_user()
    {
        CallSpFake::fake('EH_SP_Team_Head_Allocation', [[(object) ['Id' => 8, 'Name' => 'Ops']]]);

        $res = $this->getJson('/api/user/' . $this->admin->id . '/sub_department');

        $res->assertStatus(200);
        $this->assertSame([['Id' => 8, 'Name' => 'Ops']], $res->json('content'));
        $this->assertEquals([$this->admin->id, null, 4, null, null],
            CallSpFake::callsFor('EH_SP_Team_Head_Allocation')[0]['params']);
    }

    /** @test */
    public function user_sub_department_handled__load__stored_procedure_fails__error_400()
    {
        $res = $this->getJson('/api/user/' . $this->admin->id . '/sub_department');

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
    }

    // =============================================================== get_user_feature()

    /** An employee who has an access level gets that level plus the features it grants. */
    /** @test */
    public function user_features__load__user_with_a_level__returns_the_level_and_its_features()
    {
        $res = $this->getJson('/api/user/' . $this->admin->id . '/features');

        $res->assertStatus(200);
        $this->assertEquals($this->admin->LevelId, $res->json('content.level.level_id'));
        $this->assertSame($this->admin->level_type(), $res->json('content.level.level_type'));
        $this->assertEquals(
            array_values($this->admin->userFeatures()),
            array_values($res->json('content.features'))
        );
    }

    /**
     * F-USR-LEVELTYPE-1 — other arm. An employee with no access level (which is exactly what
     * UserRepository::register_user creates) cannot read this page at all: the feature list is
     * correctly skipped, but the response array still calls $user->level_type()
     * (UserController.php:850), which dereferences ->Name on the missing evox_levels row.
     * Characterised as it behaves today; the fixed shape is 200 with a null level and no features.
     */
    /** @test */
    public function user_features__load__user_without_an_access_level__error_400_FINDING_F_USR_LEVELTYPE_1()
    {
        $levelless = $this->replicaOf($this->admin, ['LevelId' => null]);

        $res = $this->getJson('/api/user/' . $levelless->id . '/features');

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
        $this->assertStringContainsString('Name', $res->json('error.content'));
    }

    /**
     * F-USR-FEATURE-1 — an unknown user id is not reported as "not found": User::find() gives null
     * and the guard reads $user->LevelId straight off it (UserController.php:841), so the caller
     * gets the generic 400 envelope carrying an internal property name.
     */
    /** @test */
    public function user_features__load__unknown_user__error_400_FINDING_F_USR_FEATURE_1()
    {
        $missing = User::max('id') + 100000;

        $res = $this->getJson('/api/user/' . $missing . '/features');

        $res->assertStatus(400);
        $this->assertStringContainsString('LevelId', $res->json('error.content'));
    }

    // =================================================================== get_features()

    /** The feature catalogue endpoint returns every feature row the system knows about. */
    /** @test */
    public function features__load__ok__returns_the_whole_feature_catalogue()
    {
        $res = $this->getJson('/api/user/features');

        $res->assertStatus(200);
        $this->assertSame(trans('messages.list_role_success'), $res->json('message'));
        $this->assertCount(Features::count(), $res->json('content'));
        $res->assertJsonStructure(['content' => [['id', 'feature_name']]]);
    }

    /** Catch arm: the activity log write fails, so the endpoint degrades to the error envelope. */
    /** @test */
    public function features__load__activity_log_write_fails__error_400()
    {
        UserModuleHelperFake::failLogActivity(new Exception('activity log unavailable'));

        $res = $this->getJson('/api/user/features');

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
        $this->assertSame('activity log unavailable', $res->json('error.content'));
    }

    // ============================================================= get_user_by_string()

    /** Employee search matches on first or last name and returns only the picker's columns. */
    /** @test */
    public function search_user__filter__matching_last_name__returns_that_employee_without_contact_details()
    {
        $target = User::whereNotNull('last_name')->where('last_name', '!=', '')
            ->orderBy('id', 'desc')->first();
        if (!$target) {
            $this->markTestSkipped('no user with a last name in test DB');
        }

        $res = $this->getJson('/api/user/search-user/' . rawurlencode($target->last_name));

        $res->assertStatus(200);
        $rows = $res->json('content');
        $this->assertContains($target->id, array_column($rows, 'id'));
        // the picker exposes identity columns only — no e-mail, no level, no password fields
        $this->assertSame(
            ['id', 'first_name', 'middle_name', 'last_name', 'emp_num'],
            array_keys($rows[0])
        );
    }

    /** Other arm: a fragment nobody matches returns an empty list rather than an error. */
    /** @test */
    public function search_user__filter__no_match__returns_an_empty_list()
    {
        $res = $this->getJson('/api/user/search-user/zzz-no-such-employee-' . uniqid());

        $res->assertStatus(200);
        $this->assertSame([], $res->json('content'));
    }

    /** @test */
    public function search_user__filter__activity_log_write_fails__error_400()
    {
        UserModuleHelperFake::failLogActivity(new Exception('activity log unavailable'));

        $res = $this->getJson('/api/user/search-user/zzz-no-such-employee-' . uniqid());

        $res->assertStatus(400);
        $this->assertSame('activity log unavailable', $res->json('error.content'));
    }

    // ================================================== getUserCountry() / getCountry()

    /** The country filter is scoped to the caller's own level and id. */
    /** @test */
    public function user_country__load__ok__returns_the_countries_for_the_callers_level()
    {
        CallSpFake::fake('EH_SP_Get_User_Country', [
            [(object) ['country_id' => 2, 'country_name' => 'Philippines']],
        ]);

        $res = $this->getJson('/api/user/getusercountry');

        $res->assertStatus(200);
        $this->assertSame('Philippines', $res->json('0.country_name'));
        $this->assertEquals([$this->admin->LevelId, $this->admin->id],
            CallSpFake::callsFor('EH_SP_Get_User_Country')[0]['params']);
    }

    /** @test */
    public function user_country__load__stored_procedure_fails__error_400()
    {
        $res = $this->getJson('/api/user/getusercountry');

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
    }

    /** The policy-document country list is scoped to the caller's own country in mode 2. */
    /** @test */
    public function country__load__ok__returns_the_policy_countries_for_the_callers_country()
    {
        CallSpFake::fake('EV_SP_Policies_Document', [
            [(object) ['country_id' => 2, 'country_name' => 'Philippines']],
        ]);

        $res = $this->getJson('/api/user/getcountry');

        $res->assertStatus(200);
        $this->assertSame('Philippines', $res->json('0.country_name'));
        $params = CallSpFake::callsFor('EV_SP_Policies_Document')[0]['params'];
        $this->assertCount(11, $params);
        $this->assertEquals($this->admin->country_id, $params[7]);
        $this->assertSame(2, $params[10]);
    }

    /** @test */
    public function country__load__stored_procedure_fails__error_400()
    {
        $res = $this->getJson('/api/user/getcountry');

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
    }
}
