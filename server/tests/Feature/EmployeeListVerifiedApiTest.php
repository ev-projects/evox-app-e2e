<?php
// VERIFIED-BACKED — generated 2026-07-07 from employee-list.registry.md (vetted by Glenn Macasarte on July 2, 2026)

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * @registry-doc employee-list.registry.md
 * @vetted-by    Glenn Macasarte
 * @vetted-on    July 2, 2026
 *
 * Covers: UserController::my_team_list (UserController.php:338)
 * Endpoint: GET /api/user/{id}/my_team_list
 * Repository: UserRepository::new_get_my_team_list (UserRepository.php:683)
 * Stored procedure: EH_SP_Employee_List
 */
class EmployeeListVerifiedApiTest extends TestCase
{
    use DatabaseTransactions; // SAFETY: converted from RefreshDatabase 2026-07-08 — never migrate:fresh on staging DB

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->user = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();
    }

    // =========================================================================
    // PATTERN B — Auth enforcement (no withoutMiddleware)
    // GET /api/user/{id}/my_team_list
    // =========================================================================

    /** @test */
    public function test_my_team_list_without_token_returns_401()
    {
        $response = $this->getJson('/api/user/' . $this->user->id . '/my_team_list', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic (withoutMiddleware + actingAs)
    // GET /api/user/{id}/my_team_list — no filter params
    // UserController::my_team_list (UserController.php:338)
    // =========================================================================

    /** @test */
    public function test_my_team_list_returns_200_for_authenticated_user()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/' . $this->user->id . '/my_team_list',
            $this->apiKey
        );
        $response->assertStatus(200);
    }

    /** @test */
    public function test_my_team_list_response_contains_data_key()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/' . $this->user->id . '/my_team_list',
            $this->apiKey
        );
        $response->assertStatus(200);
        $this->assertArrayHasKey('content', $response->json());
    }

    /** @test */
    public function test_my_team_list_data_is_array()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/' . $this->user->id . '/my_team_list',
            $this->apiKey
        );
        $response->assertStatus(200);
        // content is null when the acting user has no team members — both null and [] are valid.
        $content = $response->json('content');
        $this->assertTrue(
            is_null($content) || is_array($content),
            'content must be null (no team) or an array, got: ' . gettype($content)
        );
    }

    // =========================================================================
    // Filter params — confirmed fields: Department, Sub-Department, Status,
    //                                   Job Title, Employee Name (Q1 answer)
    // =========================================================================

    /** @test */
    public function test_my_team_list_with_status_filter_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/' . $this->user->id . '/my_team_list?status=1',
            $this->apiKey
        );
        $response->assertStatus(200);
    }

    /** @test */
    public function test_my_team_list_with_department_filter_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/' . $this->user->id . '/my_team_list?department_id=1',
            $this->apiKey
        );
        $response->assertStatus(200);
    }

    /** @test */
    public function test_my_team_list_with_name_filter_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/' . $this->user->id . '/my_team_list?name=test',
            $this->apiKey
        );
        $response->assertStatus(200);
    }

    /** @test */
    public function test_my_team_list_with_all_filter_params_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/' . $this->user->id . '/my_team_list?department_id=1&status=1&name=test',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // Edge case — nonexistent user ID
    // =========================================================================

    /** @test */
    public function test_my_team_list_for_nonexistent_user_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/999999/my_team_list',
            $this->apiKey
        );
        // Should return a non-500 status (likely 200 with empty data, or 403/404)
        $this->assertNotEquals(500, $response->status());
    }
}
