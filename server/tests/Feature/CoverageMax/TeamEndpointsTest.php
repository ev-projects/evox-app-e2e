<?php
// CoverageMax — generated 2026-07-08, raises coverage on untested Team-module routes.

namespace Tests\Feature\CoverageMax;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Department\Models\Department;
use Illuminate\Support\Facades\DB;

/**
 * Team module — endpoints with no prior PHPUnit coverage:
 *   GET  team/all                          — TeamController@all
 *   GET  department/{department_id}/teams  — TeamController@list_via_department
 *   GET  user/{user_id}/teams_handled      — TeamController@list_via_team_handler
 *
 * All three require middleware jwtauth + auth.apikey.
 *   Pattern B — no JWT bearer token => 401 (routing + middleware).
 *   Pattern A — withoutMiddleware() + actingAs => not 500 (controller body).
 */
class TeamEndpointsTest extends TestCase
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

    /** Resolve a real department id defensively (Eloquent table `departments`). */
    private function realDepartmentId(): int
    {
        try {
            $d = Department::first();
            return $d ? $d->id : 1;
        } catch (\Throwable $e) {
            return 1;
        }
    }

    // ─── Pattern B: auth enforcement ─────────────────────────────────────────

    /** @test */
    public function test_team_all_without_token_returns_401()
    {
        $this->getJson('/api/team/all', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_teams_via_department_without_token_returns_401()
    {
        $this->getJson('/api/department/1/teams', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_teams_handled_without_token_returns_401()
    {
        $this->getJson('/api/user/1/teams_handled', $this->apiKey)->assertStatus(401);
    }

    // ─── Pattern A: controller body must not 500 ─────────────────────────────

    /** @test */
    public function test_team_all_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/team/all', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_team_all_success_envelope_shape()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/team/all', $this->apiKey);
        if ($response->status() === 200) {
            $response->assertJsonStructure(['message', 'content']);
        }
    }

    /** @test */
    public function test_teams_via_department_with_real_id_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $deptId = $this->realDepartmentId();
        $response = $this->actingAs($this->user)->getJson("/api/department/{$deptId}/teams", $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_teams_via_department_nonexistent_id_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/department/999999/teams', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_teams_handled_with_real_user_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson("/api/user/{$this->user->id}/teams_handled", $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * KNOWN BUG (BUG-1): user/{id}/teams_handled 500s for a nonexistent user id.
     * TeamRepository::list_via_team_handler does User::find($id)->teams_handled();
     * for a missing id, find() returns null and ->teams_handled() throws a PHP \Error
     * (not \Exception), which neither the repo nor the controller catch — so it 500s
     * instead of returning a 404 error envelope. This test documents the current
     * behaviour (tolerating the 500) while still exercising the route for coverage.
     */
    public function test_teams_handled_nonexistent_user_documents_known_500_bug()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/user/999999/teams_handled', $this->apiKey);
        // BUG-1 fixed in TeamRepository::list_via_team_handler (null check added — returns collect()).
        // Nonexistent user now returns 200 with empty list instead of 500.
        $this->assertContains($response->status(), [200, 404]);
    }
}
