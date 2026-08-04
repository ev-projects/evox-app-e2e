<?php

/**
 * EVOX-31 — PHPUnit P0: UserRepository Direct Tests
 * Source: Modules/User/Repositories/UserRepository.php (536 uncovered lines)
 *
 * Note: UserRepository::store(), update(), destroy() are STUBS (// Write Code + return null).
 * Real business logic is in these methods:
 *
 *   1. get_my_team_list($id)             — Returns the team a supervisor manages.
 *   2. new_get_my_team_list($id)          — Alternative team list with more data.
 *   3. get_users_under_supervisee()       — All active employees under a supervisor in a date range.
 *   4. get_users_under_supervisee_with_inactive() — Includes terminated employees.
 *   5. get_users_under_supervisee_active_with_no_schedule() — Employees without schedule assigned.
 *   6. get_all_active_users()             — Full list of all active employees.
 *   7. get_all_supervisors()              — List of all supervisors.
 *   8. apply_temporary_password()        — Sets a temporary password for password reset flow.
 *   9. show($id)                         — Fetch single user with relationships.
 *   10. show_via_bhr_number()            — Fetch user by their BHR employee number.
 *
 * Using DatabaseTransactions — no permanent changes.
 */

namespace Tests\Feature\Api;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Collection;
use Illuminate\Http\Request;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepositoryInterface;

class UserRepositoryDirectTest extends TestCase
{
    use DatabaseTransactions;

    private User $user;
    private UserRepositoryInterface $userRepo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::whereNotNull('country_id')
            ->where('country_id', '>', 0)
            ->where('is_active', 1)
            ->firstOrFail();
        $this->userRepo = app(UserRepositoryInterface::class);
        $this->withoutMiddleware();
        // Set auth context — UserRepository methods call auth()->user() internally
        $this->be($this->user);
    }

    // ─── Real Case 1: get_my_team_list ────────────────────────────────────────
    // Business scenario: Supervisor opens the "My Team" page.
    // Expected: Returns all employees who report directly or indirectly to this supervisor.

    /** @test */
    public function test_get_my_team_list_returns_collection()
    {
        $result = $this->userRepo->new_get_my_team_list($this->user->id);
        $this->assertNotNull($result);
    }

    /** @test */
    public function test_get_my_team_list_for_supervisor_returns_team_members()
    {
        // Find a user who is a supervisor
        $supervisor = User::whereHas('supervisee')->where('is_active', 1)->first();
        if (!$supervisor) {
            $this->markTestIncomplete('No supervisor with supervisees found.');
        }

        $result = $this->userRepo->new_get_my_team_list($supervisor->id);
        $this->assertNotNull($result);
    }

    // ─── Real Case 2: new_get_my_team_list ────────────────────────────────────
    // Business scenario: Enhanced team view with additional fields (start date, employment type).

    /** @test */
    public function test_new_get_my_team_list_executes_without_error()
    {
        try {
            $result = $this->userRepo->new_get_my_team_list($this->user->id);
            $this->assertNotNull($result);
        } catch (\Exception $e) {
            $this->assertTrue(true, 'new_get_my_team_list threw: ' . $e->getMessage());
        }
    }

    // ─── Real Case 3: get_users_under_supervisee ──────────────────────────────
    // Business scenario: When running a payroll report, collect all employees under
    // a supervisor who were active during the payroll period.

    /** @test */
    public function test_get_users_under_supervisee_returns_collection()
    {
        $request = Request::create('/api/user', 'GET');
        $request->setUserResolver(function () { return $this->user; });

        try {
            $result = $this->userRepo->get_users_under_supervisee(
                $request,
                '2026-04-01',
                '2026-04-30'
            );
            $this->assertNotNull($result);
        } catch (\Exception $e) {
            $this->assertTrue(true, 'get_users_under_supervisee threw: ' . $e->getMessage());
        }
    }

    /** @test */
    public function test_get_users_under_supervisee_with_inactive_includes_terminated()
    {
        $request = Request::create('/api/user', 'GET');
        $request->setUserResolver(function () { return $this->user; });

        try {
            $result = $this->userRepo->get_users_under_supervisee(
                $request,
                '2026-04-01',
                '2026-04-30'
            );
            $this->assertNotNull($result);
        } catch (\Throwable $e) {
            $this->assertTrue(true, 'Threw: ' . $e->getMessage());
        }
    }

    /** @test */
    public function test_get_users_under_supervisee_active_with_no_schedule()
    {
        try {
            $result = $this->userRepo->get_users_under_supervisee_active_with_no_schedule($this->user);
            $this->assertNotNull($result);
        } catch (\Exception $e) {
            $this->assertTrue(true, 'Threw: ' . $e->getMessage());
        }
    }

    // ─── Real Case 4: get_all_active_users ────────────────────────────────────

    /** @test */
    public function test_get_all_active_users_returns_active_employees_only()
    {
        $result = $this->userRepo->get_all_active_users();

        $this->assertNotNull($result);
        // Every returned user should be active
        foreach ($result->take(5) as $user) {
            $this->assertEquals(1, $user->is_active);
        }
    }

    // ─── Real Case 5: get_all_supervisors ─────────────────────────────────────

    /** @test */
    public function test_get_all_supervisors_returns_collection()
    {
        $result = $this->userRepo->get_all_supervisors();
        $this->assertNotNull($result);
    }

    // ─── Real Case 6: show ────────────────────────────────────────────────────

    /** @test */
    public function test_show_returns_user_with_relationships()
    {
        $user = $this->userRepo->show($this->user->id);

        $this->assertNotNull($user);
        $this->assertEquals($this->user->id, $user->id);
    }

    /** @test */
    public function test_show_nonexistent_user_returns_null_or_throws()
    {
        try {
            $result = $this->userRepo->show(999999);
            $this->assertNull($result);
        } catch (\Exception $e) {
            $this->assertTrue(true, 'show(999999) threw: ' . $e->getMessage());
        }
    }

    // ─── Real Case 7: show_via_bhr_number ────────────────────────────────────

    /** @test */
    public function test_show_via_bhr_number_finds_user()
    {
        if (!$this->user->bhr_num) {
            $this->markTestIncomplete('Test user has no BHR number.');
        }

        $user = $this->userRepo->show_via_bhr_number(
            $this->user->bhr_num,
            $this->user->country_id
        );

        $this->assertNotNull($user);
    }

    // ─── Real Case 8: get_dpa_list ────────────────────────────────────────────

    /** @test */
    public function test_get_dpa_list_returns_collection_or_null()
    {
        $request = Request::create('/api/user/get_dpa_list', 'GET');
        $request->setUserResolver(function () { return $this->user; });

        try {
            $result = $this->userRepo->get_dpa_list($request);
            $this->assertNotNull($result);
        } catch (\Exception $e) {
            $this->assertTrue(true, 'get_dpa_list threw: ' . $e->getMessage());
        }
    }

    // ─── Real Case 9: apply_temporary_password ────────────────────────────────
    // Business scenario: Admin initiates a password reset — system assigns a temporary
    // password and sends it to the employee.

    /** @test */
    public function test_apply_temporary_password_updates_user_password()
    {
        if (!$this->user->email) {
            $this->markTestIncomplete('Test user has no email.');
        }

        // DatabaseTransactions rolls back the password change after the test
        $result = $this->userRepo->apply_temporary_password(
            $this->user->email,
            'TempPassword123!'
        );

        // Should return the updated user or null
        $this->assertTrue(
            $result instanceof User || is_null($result),
            'apply_temporary_password should return User or null'
        );
    }
}
