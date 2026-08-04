<?php
// CoverageMax — generated 2026-07-08, raises coverage on untested User-module routes.

namespace Tests\Feature\CoverageMax;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * User module — endpoints with no prior PHPUnit coverage. All require jwtauth + auth.apikey.
 *   GET  user/search-user-dispute
 *   GET  user/getcountry
 *   GET  user/getallassets
 *   GET  user/getasset/{id}
 *   GET  user/getassets
 *   GET  user/{id}/info
 *   GET  user/{id}/time_off/{start}/{end}
 *   GET  user/{id}/schedule/{schedule_id}
 *   GET  user/{id}/my_team_list
 *   GET  user/{id}/team_list/{department_id}
 *   GET  user/{id}/sub_department/{department_id}
 *   POST user/{id}/tick_dpa
 *   GET  role/{role}/users
 *   GET  department/{department_id}/users   (UserController@list_via_department)
 *   GET  team/{team_id}/users
 *
 *   Pattern B — no JWT => 401.   Pattern A — withoutMiddleware()+actingAs => not 500.
 */
class UserEndpointsTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->user = User::where('is_active', 1)->first() ?? User::first();
    }

    private function requireUser()
    {
        if (!$this->user) {
            $this->markTestIncomplete('No users in test DB.');
        }
    }

    private function today(): string { return date('Y-m-d'); }
    private function monthStart(): string { return date('Y-m-01'); }

    /** Resolve a real department id defensively (Eloquent table `departments`). */
    private function realDepartmentId(): int
    {
        try {
            $d = \App\Modules\Department\Models\Department::first();
            return $d ? $d->id : 1;
        } catch (\Throwable $e) {
            return 1;
        }
    }

    // ─── Pattern B: auth enforcement (no user needed) ────────────────────────

    /** @test */
    public function test_search_user_dispute_without_token_returns_401()
    {
        $this->getJson('/api/user/search-user-dispute', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_getcountry_without_token_returns_401()
    {
        $this->getJson('/api/user/getcountry', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_getallassets_without_token_returns_401()
    {
        $this->getJson('/api/user/getallassets', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_getassets_without_token_returns_401()
    {
        $this->getJson('/api/user/getassets', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_getasset_by_id_without_token_returns_401()
    {
        $this->getJson('/api/user/getasset/1', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_user_info_without_token_returns_401()
    {
        $this->getJson('/api/user/1/info', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_time_off_without_token_returns_401()
    {
        $this->getJson('/api/user/1/time_off/2026-01-01/2026-01-31', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_schedule_info_without_token_returns_401()
    {
        $this->getJson('/api/user/1/schedule/1', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_my_team_list_without_token_returns_401()
    {
        $this->getJson('/api/user/1/my_team_list', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_team_list_under_department_without_token_returns_401()
    {
        $this->getJson('/api/user/1/team_list/1', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_sub_department_under_department_without_token_returns_401()
    {
        $this->getJson('/api/user/1/sub_department/1', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_tick_dpa_without_token_returns_401()
    {
        $this->postJson('/api/user/1/tick_dpa', [], $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_list_via_role_without_token_returns_401()
    {
        $this->getJson('/api/role/admin/users', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_list_via_department_users_without_token_returns_401()
    {
        $this->getJson('/api/department/1/users', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_list_via_team_users_without_token_returns_401()
    {
        $this->getJson('/api/team/1/users', $this->apiKey)->assertStatus(401);
    }

    // ─── Pattern A: controller body must not 500 ─────────────────────────────

    /** @test */
    public function test_getcountry_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/user/getcountry', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_getallassets_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/user/getallassets', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_getassets_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/user/getassets', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_getasset_by_nonexistent_id_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/user/getasset/999999', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_user_info_with_real_id_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson("/api/user/{$this->user->id}/info", $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_user_info_nonexistent_id_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/user/999999/info', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_time_off_with_real_id_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson("/api/user/{$this->user->id}/time_off/{$this->monthStart()}/{$this->today()}", $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_schedule_info_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson("/api/user/{$this->user->id}/schedule/999999", $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_my_team_list_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson("/api/user/{$this->user->id}/my_team_list", $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_team_list_under_department_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson("/api/user/{$this->user->id}/team_list/999999", $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_sub_department_under_department_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson("/api/user/{$this->user->id}/sub_department/999999", $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_list_via_role_returns_not_500()
    {
        // BLOCKER (schema drift): role/{role}/users calls the EH_SP_Employee_List stored
        // procedure via call_sp() (raw PDO). This test DB lacks that SP / the EVOX_LEVELS
        // table, and the raw-PDO failure corrupts the surrounding DatabaseTransactions
        // transaction — aborting the whole PHPUnit run, not just this test. Auth coverage
        // is retained by test_list_via_role_without_token_returns_401; the controller body
        // can only be exercised on a DB that has the stored procedures loaded.
        $this->markTestIncomplete('role/{role}/users depends on stored procedures absent from the test DB.');
    }

    /** @test */
    public function test_list_via_department_users_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $deptId = $this->realDepartmentId();
        $response = $this->actingAs($this->user)->getJson("/api/department/{$deptId}/users", $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_list_via_team_users_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/team/999999/users', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_search_user_dispute_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/user/search-user-dispute?search=test', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }
}
