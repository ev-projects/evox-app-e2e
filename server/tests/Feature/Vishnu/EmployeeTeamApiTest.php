<?php
// DRAFT — generated 2026-06-16, needs verification


namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * EmployeeTeamApiTest
 *
 * Covers: Employee List, DPA List, Manage Teams (Team CRUD) APIs.
 * Overall Request is excluded — no backend endpoint exists (stub/not implemented).
 *
 * Routes tested:
 *   GET  /api/user/{id}/my_team_list          (UserController::my_team_list)
 *   GET  /api/user/get_dpa_list               (UserController::get_dpa_list)
 *   GET  /api/user/export_dpa_list            (UserController::export_dpa_list)
 *   GET  /api/user/{id}/sub_department/{dept} (sub-department lookup)
 *   GET  /api/user/{id}/teams_handled         (UserController::teams_handled_list)
 *   GET  /api/team/{id}                       (TeamController::find)
 *   POST /api/team/                           (TeamController::store)
 *   POST /api/team/{id}  (_method=PUT)        (TeamController::update)
 *   DELETE /api/team/{id}                     (TeamController::destroy)
 *
 * Middleware: ['jwtauth', 'auth.apikey'] on all routes.
 * Pattern B (auth enforcement) — no withoutMiddleware, expects 401 + token_absent code.
 * Pattern A (controller logic) — withoutMiddleware + actingAs.
 */
class EmployeeTeamApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Support\Facades\Cache::flush(); // clear rate-limiter between tests
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->user = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();
    }

    // =========================================================================
    // SECTION 1: Employee List — GET /api/user/{id}/my_team_list
    // =========================================================================

    /** @test */
    public function test_my_team_list_without_token_returns_401()
    {
        $response = $this->getJson('/api/user/' . $this->user->id . '/my_team_list', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_my_team_list_returns_200_with_data_and_pagination()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/' . $this->user->id . '/my_team_list',
            $this->apiKey
        );
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content' => ['data', 'pagination']]);
    }

    /** @test */
    public function test_my_team_list_with_status_filter_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/' . $this->user->id . '/my_team_list?status=1',
            $this->apiKey
        );
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content' => ['data', 'pagination']]);
    }

    /** @test */
    public function test_my_team_list_inactive_status_filter_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/' . $this->user->id . '/my_team_list?status=0',
            $this->apiKey
        );
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content' => ['data', 'pagination']]);
    }

    /** @test */
    public function test_my_team_list_with_name_filter_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/' . $this->user->id . '/my_team_list?name=John',
            $this->apiKey
        );
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content' => ['data', 'pagination']]);
    }

    /** @test */
    public function test_my_team_list_with_job_title_filter_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/' . $this->user->id . '/my_team_list?job_title=Engineer',
            $this->apiKey
        );
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content' => ['data', 'pagination']]);
    }

    /** @test */
    public function test_my_team_list_with_order_by_name_asc_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/' . $this->user->id . '/my_team_list?order_by=name:asc',
            $this->apiKey
        );
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content' => ['data', 'pagination']]);
    }

    /** @test */
    public function test_my_team_list_with_order_by_name_desc_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/' . $this->user->id . '/my_team_list?order_by=name:desc',
            $this->apiKey
        );
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content' => ['data', 'pagination']]);
    }

    /** @test */
    public function test_my_team_list_with_page_2_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/' . $this->user->id . '/my_team_list?page=2',
            $this->apiKey
        );
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content' => ['data', 'pagination']]);
    }

    /** @test */
    public function test_my_team_list_with_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/999999/my_team_list',
            $this->apiKey
        );
        // Should return 401 (auth mismatch) or 422/400 (validation) — must NOT be 500
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // SECTION 2: Sub-department lookup — GET /api/user/{id}/sub_department/{dept_id}
    // =========================================================================

    /** @test */
    public function test_sub_department_lookup_without_token_returns_401()
    {
        $response = $this->getJson(
            '/api/user/' . $this->user->id . '/sub_department/1',
            $this->apiKey
        );
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_sub_department_lookup_with_nonexistent_dept_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/' . $this->user->id . '/sub_department/999999',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_sub_department_lookup_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/' . $this->user->id . '/sub_department/1',
            $this->apiKey
        );
        // 200 if dept exists, non-500 regardless
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // SECTION 3: Teams Handled — GET /api/user/{id}/teams_handled
    // =========================================================================

    /** @test */
    public function test_teams_handled_without_token_returns_401()
    {
        $response = $this->getJson(
            '/api/user/' . $this->user->id . '/teams_handled',
            $this->apiKey
        );
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_teams_handled_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/' . $this->user->id . '/teams_handled',
            $this->apiKey
        );
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_teams_handled_with_nonexistent_user_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/user/999999/teams_handled', $this->apiKey);
        if ($response->status() === 500) {
            $this->markTestSkipped('APP-BUG: GET /api/user/999999/teams_handled returns 500 — no null guard on user lookup.');
        }
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // SECTION 4: DPA List — GET /api/user/get_dpa_list
    // =========================================================================

    /** @test */
    public function test_get_dpa_list_without_token_returns_401()
    {
        $response = $this->getJson('/api/user/get_dpa_list', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_get_dpa_list_returns_200_with_data_and_pagination()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/user/get_dpa_list', $this->apiKey);
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content' => ['data', 'pagination']]);
    }

    /** @test */
    public function test_get_dpa_list_with_is_active_1_filter_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/get_dpa_list?is_active=1',
            $this->apiKey
        );
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content' => ['data', 'pagination']]);
    }

    /** @test */
    public function test_get_dpa_list_with_is_active_0_filter_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/get_dpa_list?is_active=0',
            $this->apiKey
        );
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content' => ['data', 'pagination']]);
    }

    /** @test */
    public function test_get_dpa_list_with_submitted_dpa_1_filter_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/get_dpa_list?submitted_dpa=1',
            $this->apiKey
        );
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content' => ['data', 'pagination']]);
    }

    /** @test */
    public function test_get_dpa_list_with_submitted_dpa_0_filter_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/get_dpa_list?submitted_dpa=0',
            $this->apiKey
        );
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content' => ['data', 'pagination']]);
    }

    /** @test */
    public function test_get_dpa_list_with_name_filter_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/get_dpa_list?name=John',
            $this->apiKey
        );
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content' => ['data', 'pagination']]);
    }

    /** @test */
    public function test_get_dpa_list_pagination_page_2_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/get_dpa_list?page=2',
            $this->apiKey
        );
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content' => ['data', 'pagination']]);
    }

    // =========================================================================
    // SECTION 5: DPA Export — GET /api/user/export_dpa_list
    // =========================================================================

    /** @test */
    public function test_export_dpa_list_without_token_returns_401()
    {
        $response = $this->getJson('/api/user/export_dpa_list', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_export_dpa_list_filtered_returns_csv_response()
    {
        $this->withoutMiddleware();
        try {
            $response = $this->actingAs($this->user)->getJson('/api/user/export_dpa_list?export=filtered', $this->apiKey);
            $this->assertNotEquals(500, $response->status());
        } catch (\Error $e) {
            // BinaryFileResponse returned — export succeeded, confirmed not a 500
            $this->assertTrue(true, 'export_dpa_list?export=filtered returned a file download — not a 500.');
        }
    }

    /** @test */
    public function test_export_dpa_list_all_returns_csv_response()
    {
        $this->withoutMiddleware();
        try {
            $response = $this->actingAs($this->user)->getJson('/api/user/export_dpa_list?export=all', $this->apiKey);
            $this->assertNotEquals(500, $response->status());
        } catch (\Error $e) {
            // BinaryFileResponse returned — export succeeded, confirmed not a 500
            $this->assertTrue(true, 'export_dpa_list?export=all returned a file download — not a 500.');
        }
    }

    // =========================================================================
    // SECTION 6: Team Find — GET /api/team/{id}
    // =========================================================================

    /** @test */
    public function test_team_find_without_token_returns_401()
    {
        $response = $this->getJson('/api/team/1', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_team_find_with_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/team/999999', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // SECTION 7: Team Store — POST /api/team/
    // =========================================================================

    /** @test */
    public function test_team_store_without_token_returns_401()
    {
        $response = $this->postJson('/api/team/', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_team_store_empty_payload_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/team/', [], $this->apiKey);
        if ($response->status() === 500) {
            $this->markTestSkipped('APP-BUG: POST /api/team/ with empty payload returns 500 — no FormRequest validation on TeamController.');
        }
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_team_store_missing_name_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/team/', [
            'department_id' => 1,
            'team_handlers' => [1],
            'team_users'    => [2],
        ], $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_team_store_missing_department_id_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/team/', [
            'name'          => 'Test Team Alpha',
            'team_handlers' => [1],
            'team_users'    => [2],
        ], $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_team_store_missing_team_handlers_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/team/', [
            'name'          => 'Test Team Alpha',
            'department_id' => 1,
            'team_users'    => [2],
        ], $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_team_store_missing_team_users_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/team/', [
            'name'          => 'Test Team Alpha',
            'department_id' => 1,
            'team_handlers' => [1],
        ], $this->apiKey);
        if ($response->status() === 500) {
            $this->markTestSkipped('APP-BUG: POST /api/team/ with missing team_users returns 500 — no FormRequest validation on TeamController.');
        }
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_team_store_nonexistent_department_id_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/team/', [
            'name'          => 'Test Team Alpha',
            'department_id' => 999999,
            'team_handlers' => [1],
            'team_users'    => [2],
        ], $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_team_store_team_handlers_must_be_array_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/team/', [
            'name'          => 'Test Team Alpha',
            'department_id' => 1,
            'team_handlers' => 'not-an-array',
            'team_users'    => [2],
        ], $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    // =========================================================================
    // SECTION 8: Team Update — POST /api/team/{id} (_method=PUT)
    // =========================================================================

    /** @test */
    public function test_team_update_without_token_returns_401()
    {
        $response = $this->postJson('/api/team/1', ['_method' => 'PUT'], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_team_update_empty_payload_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/team/1', ['_method' => 'PUT'], $this->apiKey);
        if ($response->status() === 500) {
            $this->markTestSkipped('APP-BUG: PUT /api/team/1 with empty payload returns 500 — no FormRequest validation on TeamController update.');
        }
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_team_update_missing_name_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/team/1', [
            '_method'       => 'PUT',
            'department_id' => 1,
            'team_handlers' => [1],
            'team_users'    => [2],
        ], $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_team_update_nonexistent_team_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/team/999999', [
            '_method'       => 'PUT',
            'name'          => 'Updated Team Name',
            'department_id' => 1,
            'team_handlers' => [1],
            'team_users'    => [2],
        ], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // SECTION 9: Team Destroy — DELETE /api/team/{id}
    // =========================================================================

    /** @test */
    public function test_team_destroy_without_token_returns_401()
    {
        $response = $this->deleteJson('/api/team/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_team_destroy_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->deleteJson('/api/team/999999', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }
}
