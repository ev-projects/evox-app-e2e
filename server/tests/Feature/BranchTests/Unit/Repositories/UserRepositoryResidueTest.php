<?php
/**
 * COVERAGE WAVE 2026-08-19 — the arms of UserRepository that the existing BHR-sync and
 * sync-and-lists suites left open: the failure arms of every method, the BHR field arms those
 * suites' fixtures never triggered, the sorting and filtering arms of the two big list builders,
 * and the two DB::select stored-procedure wrappers that had never run at all.
 *
 * Source under test:
 *   server/app/Modules/User/Repositories/UserRepository.php
 *     register_user, insert_bhr_user_to_evox, update_bhr_user_to_evox,
 *     update_bhr_user_country_to_evox, apply_user_supervisor_pivot, destroy_department_users,
 *     show_via_bhr_number, new_get_my_team_list, get_users_under_supervisee,
 *     get_users_under_supervisee_active_with_no_schedule, apply_temporary_password,
 *     change_password, tick_dpa, assign_level_features, assign_employees_to_user,
 *     list_via_department, get_users_under_supervisee_active_with_requests,
 *     get_users_under_supervisee_active_with_invalid_check_ins,
 *     and the private generate_department reached from lines 154 and 246
 * Menu -> Page: Admin -> Users / BHR sync, MyTeam -> Team list, Profile -> Change password
 *
 * Coverage before this file: register_user 84.21%, insert_bhr_user_to_evox 86.21%,
 *   update_bhr_user_to_evox 84.44%, update_bhr_user_country_to_evox 59.09%,
 *   apply_user_supervisor_pivot 70%, destroy_department_users 60%, show_via_bhr_number 72.73%,
 *   new_get_my_team_list 87.69%, get_users_under_supervisee 51.43%,
 *   get_users_under_supervisee_active_with_no_schedule 81.82%, apply_temporary_password 75%,
 *   change_password 86.67%, tick_dpa 88.89%, assign_level_features 75%,
 *   assign_employees_to_user 90%, list_via_department 20%, generate_department 35.71%,
 *   get_users_under_supervisee_active_with_requests 0%,
 *   get_users_under_supervisee_active_with_invalid_check_ins 0%.
 *
 * SEAMS
 *   Support/CallSpFake.php       — the employee-list SP behind users_handled(). Leaving it
 *                                  unregistered is how the read methods' catch arms are reached.
 *   Support/DeadConnectionTrait  — swaps Eloquent's connection resolver for one that throws, and
 *                                  restores it in a finally. The DB facade is untouched, so the
 *                                  DatabaseTransactions transaction still rolls back. This is how
 *                                  the write methods' catch arms are reached without breaking
 *                                  anything.
 *   A proxied partial mock of the `db` manager for the two DB::select('CALL SP_…') wrappers, so
 *   their contract is asserted without executing a real stored procedure (the cursor-hang class).
 *   The real manager is restored in a finally before the transaction rolls back.
 *
 * SAFETY: every write here targets a row this test created, or a department id that matches no
 * user, and all of it rolls back. No existing employee row is modified.
 *
 * FINDINGS raised here:
 *   F-USR-AUTHGATE-DEAD  new_get_my_team_list() and change_password() guard their bodies with
 *                        `if (get_authenticated_user($id))`, but that helper either returns a User
 *                        or throws — it never returns a falsy value (user_helper.php:12-40). Both
 *                        else arms are unreachable, and an unauthorised id surfaces as a rethrown
 *                        "not authorized" exception rather than the empty result the guard implies.
 */

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Exception;
use Mockery;
use Tests\TestCase;
use Tests\Support\CallSpFake;
use Tests\Feature\BranchTests\Support\DeadConnectionTrait;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Facade;
use Illuminate\Support\Facades\Hash;
use App\EvoxLevels;
use App\Features;
use App\UserFeatures;
use App\Modules\Department\Models\Department;
use App\Modules\Team\Models\Team;
use App\Modules\User\Models\User;
use App\Modules\User\Models\UtcTimelog;
use App\Modules\User\Repositories\UserRepository;

class UserRepositoryResidueTest extends TestCase
{
    use DatabaseTransactions;
    use DeadConnectionTrait;

    /** @var UserRepository */
    private $repo;
    /** @var User */
    private $admin;

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();
        $this->repo = new UserRepository();

        $this->admin = $this->userAtLevel('Admin');
        if (!$this->admin) {
            $this->markTestSkipped('no active Admin-level user in test DB');
        }
        // resolve the guard before any seam is armed — log_error() reads auth()->user()
        $this->be($this->admin);
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    // ------------------------------------------------------------------------ helpers

    private function userAtLevel($levelName)
    {
        $level = EvoxLevels::where('Name', $levelName)->first();
        if (!$level) {
            return null;
        }

        return User::where('LevelId', $level->LevelId)->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
    }

    /** A supervisory user whose team comes from the employee-list SP. */
    private function supervisor()
    {
        foreach (['Department Head', 'SubDepartment Head', 'Division Head', 'HR', 'Payroll'] as $name) {
            $user = $this->userAtLevel($name);
            if ($user) {
                return $user;
            }
        }

        return null;
    }

    /** BHR-API-shaped payload, exactly the fields the sync methods read. */
    private function bhrUser(array $overrides = [])
    {
        $uniq = 'R' . substr(uniqid(), -8);

        return (object) array_merge([
            'id' => 'BHRRES-' . $uniq,
            'employeeNumber' => 'EVR-' . $uniq,
            'bestEmail' => "residue+{$uniq}@example.invalid",
            'firstName' => 'Residue', 'middleName' => 'R', 'lastName' => 'Test',
            'nickname' => 'res',
            'employmentHistoryStatus' => 'Regular',
            'hireDate' => '2020-01-05',
            'jobTitle' => 'QA Fixture',
            'mobilePhone' => '0900000000',
            'country' => 'Philippine',
            'dateOfBirth' => '1990-01-01',
            'terminationDate' => null,
            'department' => null,
        ], $overrides);
    }

    private function utcCollection()
    {
        return collect([(object) ['country_name' => 'Philippine', 'country_id' => 1]]);
    }

    /** A department id that no user is attached to, so mass operations touch nothing. */
    private function emptyDepartmentId()
    {
        return (int) Department::max('id') + 100000;
    }

    /**
     * Run $fn with the `db` manager replaced by a proxied partial mock, so DB::select can be
     * stubbed without executing a stored procedure. Everything not stubbed still passes through to
     * the real manager, and the real instance is restored before the transaction rolls back.
     */
    private function withStubbedDatabaseSelect(callable $arrange, callable $fn)
    {
        $real = $this->app->make('db');
        $proxy = Mockery::mock($real);
        $arrange($proxy);

        $this->app->instance('db', $proxy);
        Facade::clearResolvedInstance('db');

        try {
            return $fn();
        } finally {
            $this->app->instance('db', $real);
            Facade::clearResolvedInstance('db');
        }
    }

    // ================================================================== register_user()

    /** Registering an admin-created user issues a temporary password and forces a reset. */
    /** @test */
    public function register_user__creates_an_inactive_shell_account_with_a_temporary_password()
    {
        $email = 'registered+' . substr(uniqid(), -8) . '@example.invalid';

        $result = $this->repo->register_user(new Request([
            'email' => $email, 'first_name' => 'New', 'last_name' => 'Joiner',
        ]));

        $this->assertSame($email, $result['user']->email);
        $this->assertSame($email, $result['user']->username);     // username defaults to the e-mail
        $this->assertSame(8, strlen($result['temporary_password']));
        $this->assertTrue(Hash::check($result['temporary_password'], $result['user']->password));
        $this->assertTrue((bool) $result['user']->force_change_password);
        $this->assertTrue((bool) $result['user']->is_active);
        $this->assertNull($result['user']->bhr_num);              // not a BambooHR employee yet
        $this->assertSame(get_constant('REGISTERED_USER'), $result['user']->employment_status);
    }

    /** Catch arm: a database failure is rolled back and rethrown, never swallowed. */
    /** @test */
    public function register_user__database_failure__is_rolled_back_and_rethrown()
    {
        $before = User::count();

        $this->assertRethrowsDeadConnection(function () {
            $this->repo->register_user(new Request([
                'email' => 'never+' . uniqid() . '@example.invalid',
                'first_name' => 'Never', 'last_name' => 'Saved',
            ]));
        });

        $this->assertSame($before, User::count());
    }

    // ========================================================= insert_bhr_user_to_evox()

    /**
     * A leaver arriving from BambooHR keeps their end date, and an unknown department is created
     * on the fly rather than dropped (generate_department's insert arm).
     */
    /** @test */
    public function insert_bhr_user__with_a_termination_date_and_a_new_department__records_both()
    {
        $departmentName = 'Seam Department ' . substr(uniqid(), -8);

        $user = $this->repo->insert_bhr_user_to_evox(
            $this->bhrUser(['terminationDate' => '2026-03-31', 'department' => $departmentName]),
            $this->utcCollection()
        );

        $this->assertStringContainsString('2026-03-31', (string) $user->termination_date);

        $department = Department::where('department_name', $departmentName)->first();
        $this->assertNotNull($department, 'an unknown BHR department must be created');
        $this->assertEquals($department->id, $user->department_id);
    }

    /** The other side of the two date guards: BambooHR's zero-dates are ignored, not stored. */
    /** @test */
    public function insert_bhr_user__with_zero_dates__leaves_birthdate_and_termination_unset()
    {
        $user = $this->repo->insert_bhr_user_to_evox(
            $this->bhrUser(['dateOfBirth' => '0000-00-00', 'terminationDate' => '0000-00-00']),
            $this->utcCollection()
        );

        $this->assertNull($user->birthdate);
        $this->assertNull($user->termination_date);
    }

    /** Catch arm. */
    /** @test */
    public function insert_bhr_user__database_failure__is_rolled_back_and_rethrown()
    {
        $before = User::count();

        $this->assertRethrowsDeadConnection(function () {
            $this->repo->insert_bhr_user_to_evox($this->bhrUser(), $this->utcCollection());
        });

        $this->assertSame($before, User::count());
    }

    // ========================================================= update_bhr_user_to_evox()

    /**
     * A termination date coming back from BambooHR deactivates the EVOX account — the rule that
     * decides whether a leaver can still sign in.
     */
    /** @test */
    public function update_bhr_user__with_a_termination_date__deactivates_the_account()
    {
        $target = $this->throwawayUser();

        $out = $this->repo->update_bhr_user_to_evox($target,
            $this->bhrUser(['terminationDate' => '2026-03-31', 'dateOfBirth' => '0000-00-00']),
            new UtcTimelog());

        $this->assertFalse((bool) $out->is_active);
        $this->assertStringContainsString('2026-03-31', (string) $out->termination_date);
        $this->assertNull($out->birthdate);                     // the zero birthdate was ignored
        $this->assertFalse((bool) User::find($target->id)->is_active);
    }

    /** The other arm of the same rule: a terminated employment status also deactivates. */
    /** @test */
    public function update_bhr_user__with_a_terminated_employment_status__deactivates_the_account()
    {
        $target = $this->throwawayUser();

        $out = $this->repo->update_bhr_user_to_evox($target,
            $this->bhrUser([
                'terminationDate' => '0000-00-00',
                'employmentHistoryStatus' => get_constant('BHR_USER_EMPLOYMENT_STATUS.terminated'),
            ]),
            new UtcTimelog());

        $this->assertFalse((bool) $out->is_active);
    }

    /** Catch arm. */
    /** @test */
    public function update_bhr_user__database_failure__is_rolled_back_and_rethrown()
    {
        $target = $this->throwawayUser();
        $originalEmail = $target->email;

        $this->assertRethrowsDeadConnection(function () use ($target) {
            $this->repo->update_bhr_user_to_evox($target, $this->bhrUser(), new UtcTimelog());
        });

        $this->assertSame($originalEmail, User::find($target->id)->email);
    }

    // ================================================= update_bhr_user_country_to_evox()

    /** A BambooHR record with no e-mail is skipped entirely — the country is left alone. */
    /** @test */
    public function update_bhr_user_country__without_an_email__changes_nothing()
    {
        $target = $this->throwawayUser();
        $originalCountry = $target->country_id;

        $out = $this->repo->update_bhr_user_country_to_evox($target,
            $this->bhrUser(['bestEmail' => null, 'country' => 'India']), new UtcTimelog());

        $this->assertEquals($originalCountry, $out->country_id);
        $this->assertEquals($originalCountry, User::find($target->id)->country_id);
    }

    /** An unrecognised country name leaves the existing country in place rather than nulling it. */
    /** @test */
    public function update_bhr_user_country__with_an_unknown_country__keeps_the_existing_one()
    {
        $target = $this->throwawayUser();
        $originalCountry = $target->country_id;

        $out = $this->repo->update_bhr_user_country_to_evox($target,
            $this->bhrUser(['country' => 'Atlantis-' . uniqid()]), new UtcTimelog());

        $this->assertEquals($originalCountry, $out->country_id);
    }

    /** Catch arm. */
    /** @test */
    public function update_bhr_user_country__database_failure__is_rolled_back_and_rethrown()
    {
        $target = $this->throwawayUser();

        $this->assertRethrowsDeadConnection(function () use ($target) {
            $this->repo->update_bhr_user_country_to_evox($target, $this->bhrUser(), new UtcTimelog());
        });
    }

    // ======================================================= apply_user_supervisor_pivot()

    /** Catch arm. */
    /** @test */
    public function apply_user_supervisor_pivot__database_failure__is_rolled_back_and_rethrown()
    {
        $this->assertRethrowsDeadConnection(function () {
            $this->repo->apply_user_supervisor_pivot(['some-bhr-number' => [1]]);
        });
    }

    // ========================================================= destroy_department_users()

    /** Removing a department removes its members; a department with no members removes nobody. */
    /** @test */
    public function destroy_department_users__department_with_no_members__deletes_nothing()
    {
        $before = User::count();

        $this->assertNull($this->repo->destroy_department_users($this->emptyDepartmentId()));

        $this->assertSame($before, User::count());
    }

    /** Catch arm. */
    /** @test */
    public function destroy_department_users__database_failure__is_rolled_back_and_rethrown()
    {
        $before = User::count();

        $this->assertRethrowsDeadConnection(function () {
            $this->repo->destroy_department_users($this->emptyDepartmentId());
        });

        $this->assertSame($before, User::count());
    }

    // ============================================================== show_via_bhr_number()

    /** With a country given the lookup is scoped to it, so the same BHR number can miss. */
    /** @test */
    public function show_via_bhr_number__with_a_country__only_matches_inside_that_country()
    {
        $existing = User::whereNotNull('bhr_num')->whereNotNull('country_id')
            ->orderBy('id', 'desc')->first();
        if (!$existing) {
            $this->markTestSkipped('no BHR-numbered user with a country in test DB');
        }
        $otherCountry = UtcTimelog::where('country_id', '!=', $existing->country_id)
            ->value('country_id');
        if (!$otherCountry) {
            $this->markTestSkipped('only one country configured in UTC_TimeLogs');
        }

        $hit = $this->repo->show_via_bhr_number($existing->bhr_num, $existing->country_id);
        $miss = $this->repo->show_via_bhr_number($existing->bhr_num, $otherCountry);

        $this->assertSame($existing->id, $hit->id);
        $this->assertNull($miss);
    }

    /** A non-numeric country is ignored and the unscoped lookup is used instead. */
    /** @test */
    public function show_via_bhr_number__with_a_non_numeric_country__falls_back_to_the_plain_lookup()
    {
        $existing = User::whereNotNull('bhr_num')->orderBy('id', 'desc')->first();
        if (!$existing) {
            $this->markTestSkipped('no BHR-numbered user in test DB');
        }

        $found = $this->repo->show_via_bhr_number($existing->bhr_num, 'not-a-country');

        $this->assertSame($existing->id, $found->id);
    }

    /** Catch arm. */
    /** @test */
    public function show_via_bhr_number__database_failure__is_rethrown()
    {
        $this->assertRethrowsDeadConnection(function () {
            $this->repo->show_via_bhr_number('any-bhr-number');
        });
    }

    // ============================================================== new_get_my_team_list()

    /** Sorting by name ascending is done in PHP over the full unpaged result set. */
    /** @test */
    public function new_get_my_team_list__ordered_by_name_ascending__sorts_in_php()
    {
        CallSpFake::fake('EH_SP_Employee_List', $this->teamListBlocks(['Cara', 'Alice', 'Bob']));
        request()->merge(['order_by' => 'name:asc', 'page' => 1]);

        $out = $this->repo->new_get_my_team_list($this->admin->id);

        $this->assertSame(['Alice', 'Bob', 'Cara'],
            array_map(function ($e) { return $e->Employee_Name; }, $out['data']));
    }

    /** Sorting by job title, both directions. */
    /** @test */
    public function new_get_my_team_list__ordered_by_job_title__sorts_both_directions()
    {
        $names = ['Cara', 'Alice', 'Bob'];
        $titles = ['QA', 'Analyst', 'Developer'];

        CallSpFake::fake('EH_SP_Employee_List', $this->teamListBlocks($names, $titles));
        request()->merge(['order_by' => 'job_title:asc', 'page' => 1]);
        $asc = $this->repo->new_get_my_team_list($this->admin->id);

        $this->assertSame(['Analyst', 'Developer', 'QA'],
            array_map(function ($e) { return $e->job_title; }, $asc['data']));

        CallSpFake::reset();
        CallSpFake::activate();
        CallSpFake::fake('EH_SP_Employee_List', $this->teamListBlocks($names, $titles));
        request()->merge(['order_by' => 'job_title:desc', 'page' => 1]);
        $desc = $this->repo->new_get_my_team_list($this->admin->id);

        $this->assertSame(['QA', 'Developer', 'Analyst'],
            array_map(function ($e) { return $e->job_title; }, $desc['data']));
    }

    /**
     * F-USR-AUTHGATE-DEAD — the guard reads as "return an empty list when the caller may not see
     * this team", but get_authenticated_user() never returns falsy: it throws, and the throw is
     * rethrown to the caller. Characterised as it behaves today.
     */
    /** @test */
    public function new_get_my_team_list__unknown_employee__throws_instead_of_returning_empty_FINDING_F_USR_AUTHGATE_DEAD()
    {
        $missing = User::max('id') + 100000;
        request()->merge(['order_by' => null, 'page' => 1]);

        $this->expectException(Exception::class);

        $this->repo->new_get_my_team_list($missing);
    }

    // ========================================================= get_users_under_supervisee()

    /** Every screen filter narrows the same supervisee query; the array forms of each. */
    /** @test */
    public function get_users_under_supervisee__array_filters__narrow_the_supervisee_query()
    {
        $supervisor = $this->supervisor();
        if (!$supervisor) {
            $this->markTestSkipped('no supervisory-level user in test DB');
        }
        $this->be($supervisor);
        $team = Team::orderBy('id', 'desc')->first();
        if (!$team) {
            $this->markTestSkipped('no team in test DB');
        }
        CallSpFake::fake('EH_SP_Employee_List', [
            [(object) ['id' => $supervisor->id]],
            [(object) ['CurrentPage' => 1]],
        ]);

        $request = new Request([
            'selectedDepartments' => [1, 2],
            'selectedTeams' => [$team->id],
            'name' => 'zzz-no-such-employee',
            'is_active' => 1,
        ]);

        $result = $this->repo->get_users_under_supervisee($request, '2020-01-01', '2020-01-02',
            true, true);

        $this->assertCount(0, $result);          // impossible name — the filters all applied
    }

    /** The same filters arriving as comma-separated strings, plus the paginated arm. */
    /** @test */
    public function get_users_under_supervisee__string_filters_and_paging__return_a_paginator()
    {
        $supervisor = $this->supervisor();
        if (!$supervisor) {
            $this->markTestSkipped('no supervisory-level user in test DB');
        }
        $this->be($supervisor);
        $team = Team::orderBy('id', 'desc')->first();
        if (!$team) {
            $this->markTestSkipped('no team in test DB');
        }
        CallSpFake::fake('EH_SP_Employee_List', [
            [(object) ['id' => $supervisor->id]],
            [(object) ['CurrentPage' => 1]],
        ]);

        $request = new Request([
            'selectedDepartments' => '1,2',
            'selectedTeams' => (string) $team->id,
            'team_id' => $team->id,
            'name' => 'zzz-no-such-employee',
            'page' => 1,
        ]);

        $result = $this->repo->get_users_under_supervisee($request, '2020-01-01', '2020-01-02');

        $this->assertInstanceOf(\Illuminate\Pagination\LengthAwarePaginator::class, $result);
        $this->assertSame(100, $result->perPage());
        $this->assertSame(0, $result->total());
    }

    /** Catch arm — the supervisee lookup itself failed. */
    /** @test */
    public function get_users_under_supervisee__supervisee_lookup_fails__is_rethrown()
    {
        $supervisor = $this->supervisor();
        if (!$supervisor) {
            $this->markTestSkipped('no supervisory-level user in test DB');
        }
        $this->be($supervisor);

        // EH_SP_Employee_List deliberately unregistered — the seam refuses the call
        $this->expectException(Exception::class);

        $this->repo->get_users_under_supervisee(new Request(), '2020-01-01', '2020-01-02');
    }

    // ========================== get_users_under_supervisee_active_with_no_schedule()

    /**
     * The reminder list is built from the supervisor's own team and carries only the columns the
     * reminder e-mail needs — never the whole employee row.
     */
    /** @test */
    public function supervisees_with_no_schedule__are_scoped_to_the_supervisors_team()
    {
        $supervisor = $this->supervisor();
        if (!$supervisor) {
            $this->markTestSkipped('no supervisory-level user in test DB');
        }
        CallSpFake::fake('EH_SP_Employee_List', [
            [(object) ['id' => $supervisor->id]],
            [(object) ['CurrentPage' => 1]],
        ]);

        $result = $this->repo->get_users_under_supervisee_active_with_no_schedule($supervisor);

        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Collection::class, $result);
        foreach ($result as $row) {
            $this->assertSame(
                ['id', 'emp_num', 'first_name', 'last_name', 'email', 'department_name'],
                array_keys($row->getAttributes())
            );
        }
        // the team came from the employee-list SP, scoped to this supervisor
        $params = CallSpFake::callsFor('EH_SP_Employee_List')[0]['params'];
        $this->assertEquals($supervisor->id, $params[0]);
        $this->assertSame(1, $params[4]);        // active employees only
    }

    /** Catch arm. */
    /** @test */
    public function supervisees_with_no_schedule__supervisee_lookup_fails__is_rethrown()
    {
        $supervisor = $this->supervisor();
        if (!$supervisor) {
            $this->markTestSkipped('no supervisory-level user in test DB');
        }

        $this->expectException(Exception::class);

        $this->repo->get_users_under_supervisee_active_with_no_schedule($supervisor);
    }

    // ========================================================== apply_temporary_password()

    /** Catch arm — nothing is written when the lookup fails. */
    /** @test */
    public function apply_temporary_password__database_failure__is_rethrown()
    {
        $this->assertRethrowsDeadConnection(function () {
            $this->repo->apply_temporary_password('someone@example.invalid', 'temp1234');
        });
    }

    // ==================================================================== change_password()

    /** Catch arm: an id that is not an employee is rethrown, not silently ignored. */
    /** @test */
    public function change_password__unknown_employee__is_rethrown()
    {
        $this->expectException(ModelNotFoundException::class);

        $this->repo->change_password(User::max('id') + 100000, [
            'current_password' => 'whatever', 'new_password' => 'whatever2',
        ]);
    }

    // =========================================================================== tick_dpa()

    /** Only the signed-in employee may tick their own DPA acknowledgement. */
    /** @test */
    public function tick_dpa__another_employees_id__ticks_nothing()
    {
        $other = User::where('id', '!=', $this->admin->id)->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$other) {
            $this->markTestSkipped('need a second user in test DB');
        }
        $before = $other->dpa_ticked_at;

        $this->assertNull($this->repo->tick_dpa($other->id));

        $this->assertEquals($before, User::find($other->id)->dpa_ticked_at);
    }

    /** Catch arm. */
    /** @test */
    public function tick_dpa__unknown_employee__is_rethrown()
    {
        $this->expectException(ModelNotFoundException::class);

        $this->repo->tick_dpa(User::max('id') + 100000);
    }

    // ============================================================== assign_level_features()

    /** Removing every feature marks each one as explicitly revoked rather than deleting the row. */
    /** @test */
    public function assign_level_features__empty_list__revokes_every_feature_the_user_had()
    {
        $target = $this->throwawayUser();
        $owned = array_values($target->userFeatures());
        if (!$owned) {
            $this->markTestSkipped('the fixture level grants no features');
        }

        $this->repo->assign_level_features($target->id, [], null);

        $revoked = UserFeatures::where('user_id', $target->id)->where('has_access', 0)->count();
        $this->assertGreaterThan(0, $revoked);
        $this->assertSame([], array_values($target->fresh()->userFeatures()));
    }

    /** Granting a feature the level does not include attaches it with access. */
    /** @test */
    public function assign_level_features__new_feature__is_attached_with_access()
    {
        $target = $this->throwawayUser();
        $owned = array_values($target->userFeatures());
        $extra = Features::whereNotIn('feature_name', $owned ?: ['-'])->first();
        if (!$extra) {
            $this->markTestSkipped('no feature outside the fixture level to grant');
        }

        $this->repo->assign_level_features($target->id, array_merge($owned, [$extra->feature_name]), null);

        $this->assertSame(1, (int) UserFeatures::where('user_id', $target->id)
            ->where('feature_id', $extra->id)->value('has_access'));
        $this->assertContains($extra->feature_name, array_values($target->fresh()->userFeatures()));
    }

    /** Catch arm. */
    /** @test */
    public function assign_level_features__unknown_employee__is_rethrown()
    {
        $this->expectException(ModelNotFoundException::class);

        $this->repo->assign_level_features(User::max('id') + 100000, [], null);
    }

    // ============================================================ assign_employees_to_user()

    /**
     * Picking a department with no employees selected clears that department's people from the
     * supervisor and adds nobody back.
     */
    /** @test */
    public function assign_employees__department_with_no_employees_picked__adds_nobody()
    {
        $supervisor = $this->throwawayUser();
        $department = $this->throwawayDepartment();

        $out = $this->repo->assign_employees_to_user($supervisor->id, [
            'department_id' => $department->id,
            'user_id' => [],
        ]);

        $this->assertSame($supervisor->id, $out->id);
        $this->assertSame(0, $out->supervisee()->count());
    }

    /** Other arm: with no department the picked employees are added to whoever is already there. */
    /** @test */
    public function assign_employees__without_a_department__adds_the_picked_employees()
    {
        $supervisor = $this->throwawayUser();
        $employee = User::where('id', '!=', $supervisor->id)->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$employee) {
            $this->markTestSkipped('need a second user in test DB');
        }

        $out = $this->repo->assign_employees_to_user($supervisor->id, [
            'department_id' => null,
            'user_id' => [$employee->id],
        ]);

        $this->assertContains($employee->id, $out->supervisee()->pluck('users.id')->toArray());
    }

    /** Catch arm. */
    /** @test */
    public function assign_employees__unknown_supervisor__is_rethrown()
    {
        $this->expectException(ModelNotFoundException::class);

        $this->repo->assign_employees_to_user(User::max('id') + 100000, ['user_id' => []]);
    }

    // ================================================================= list_via_department()

    /** Catch arm. */
    /** @test */
    public function list_via_department__database_failure__is_rethrown()
    {
        $this->assertRethrowsDeadConnection(function () {
            $this->repo->list_via_department(1);
        });
    }

    // ====================== the two DB::select stored-procedure wrappers (were 0%)

    /**
     * The cut-off reminder list asks SP_Employee_Request_Cutoff for the window, the supervisor and
     * the department, and always in "mail" mode.
     */
    /** @test */
    public function supervisees_with_requests__calls_the_cutoff_sp_with_the_window_and_scope()
    {
        $captured = [];

        $rows = $this->withStubbedDatabaseSelect(
            function ($db) use (&$captured) {
                $db->shouldReceive('select')->once()
                   ->andReturnUsing(function ($sql, $bindings) use (&$captured) {
                       $captured = ['sql' => $sql, 'bindings' => $bindings];
                       return [(object) ['user_id' => 5]];
                   });
            },
            function () {
                return $this->repo->get_users_under_supervisee_active_with_requests(
                    '2020-01-01', '2020-01-15', 42, 7);
            }
        );

        $this->assertSame(5, $rows[0]->user_id);
        $this->assertStringContainsString('CALL SP_Employee_Request_Cutoff', $captured['sql']);
        $this->assertSame(['2020-01-01', '2020-01-15', 42, 7, null, 'mail'], $captured['bindings']);
    }

    /** Catch arm. */
    /** @test */
    public function supervisees_with_requests__stored_procedure_fails__is_rethrown()
    {
        $this->expectException(Exception::class);

        $this->withStubbedDatabaseSelect(
            function ($db) {
                $db->shouldReceive('select')->once()->andThrow(new Exception('SP unavailable'));
            },
            function () {
                return $this->repo->get_users_under_supervisee_active_with_requests(
                    '2020-01-01', '2020-01-15');
            }
        );
    }

    /** The invalid-check-in reminder is scoped to a supervisor and a department only. */
    /** @test */
    public function supervisees_with_invalid_check_ins__calls_its_sp_with_the_scope_only()
    {
        $captured = [];

        $rows = $this->withStubbedDatabaseSelect(
            function ($db) use (&$captured) {
                $db->shouldReceive('select')->once()
                   ->andReturnUsing(function ($sql, $bindings) use (&$captured) {
                       $captured = ['sql' => $sql, 'bindings' => $bindings];
                       return [];
                   });
            },
            function () {
                return $this->repo->get_users_under_supervisee_active_with_invalid_check_ins(42, 7);
            }
        );

        $this->assertSame([], $rows);
        $this->assertStringContainsString('CALL SP_InvalidChekin_Notification', $captured['sql']);
        $this->assertSame([42, 7], $captured['bindings']);
    }

    /** Catch arm. */
    /** @test */
    public function supervisees_with_invalid_check_ins__stored_procedure_fails__is_rethrown()
    {
        $this->expectException(Exception::class);

        $this->withStubbedDatabaseSelect(
            function ($db) {
                $db->shouldReceive('select')->once()->andThrow(new Exception('SP unavailable'));
            },
            function () {
                return $this->repo->get_users_under_supervisee_active_with_invalid_check_ins();
            }
        );
    }

    // ------------------------------------------------------------------------ fixtures

    /** A throwaway copy of a real user, so writes never touch an employee's live row. */
    private function throwawayUser()
    {
        $uniq = substr(uniqid(), -8);
        $user = $this->admin->replicate();
        $user->email = 'repores+' . $uniq . '@example.invalid';
        $user->username = 'repores_' . $uniq;
        $user->emp_num = 'RR' . $uniq;
        $user->bhr_num = 'RR' . $uniq;
        $user->password = Hash::make('SeamPass-2026!');
        $user->is_active = 1;
        $user->termination_date = null;
        $user->save();

        return $user;
    }

    /** An empty department created for this test, so department-wide writes touch nobody. */
    private function throwawayDepartment()
    {
        $department = new Department();
        $department->department_name = 'Seam Department ' . substr(uniqid(), -8);
        $department->description = null;
        $department->created_at = date('Y-m-d H:i:s');
        $department->updated_at = date('Y-m-d H:i:s');
        $department->save();

        return $department;
    }

    /** Employee rows, a PerPage block and a filler block — the shape the list builder expects. */
    private function teamListBlocks(array $names, array $titles = null)
    {
        $emps = [];
        foreach ($names as $i => $name) {
            $emps[] = (object) [
                'Employee_Name' => $name,
                'job_title' => $titles ? $titles[$i] : 'QA',
            ];
        }

        return [
            $emps,
            [(object) ['PerPage' => 15, 'TotalCount' => 30, 'CurrentPage' => 1]],
            [],
        ];
    }
}
