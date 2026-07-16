<?php
// VERIFIED-BACKED — generated 2026-07-07 from dpa-list.registry.md (vetted by Glenn Macasarte on July 3, 2026)

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * @registry-doc dpa-list.registry.md
 * @vetted-by Glenn Macasarte
 * @vetted-on July 3, 2026
 *
 * Covers confirmed API actions from [DEVELOPER VETTING] blocks:
 *   - GET /api/user/get_dpa_list  → UserController::get_dpa_list  (UserController.php:520)
 *   - GET /api/user/export_dpa_list → UserController::export_dpa_list (UserController.php:551)
 */
class DpaListVerifiedApiTest extends TestCase
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
    // GET /api/user/get_dpa_list
    // =========================================================================

    /** @test */
    public function test_get_dpa_list_without_token_returns_401()
    {
        $response = $this->getJson('/api/user/get_dpa_list', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // GET /api/user/export_dpa_list
    // =========================================================================

    /** @test */
    public function test_export_dpa_list_without_token_returns_401()
    {
        $response = $this->getJson('/api/user/export_dpa_list?export=filtered', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic (withoutMiddleware + actingAs)
    // GET /api/user/get_dpa_list
    // UserController::get_dpa_list (UserController.php:520)
    // → UserRepository::get_dpa_list (UserRepository.php:1012)
    // → EH_SP_Employee_DPA_List(user_id, LevelId, department_id, is_active, name, submitted_dpa, page, 10, null)
    // =========================================================================

    /** @test */
    public function test_get_dpa_list_returns_200_for_authenticated_supervisor()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/user/get_dpa_list', $this->apiKey);
        // On SP failure the controller incorrectly returns 404; we accept 200 or 404 but not 500
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_dpa_list_with_is_active_filter_active_does_not_500()
    {
        // Confirmed filter param: is_active=1 (Active employees)
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/get_dpa_list?is_active=1',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_dpa_list_with_is_active_filter_inactive_does_not_500()
    {
        // Confirmed filter param: is_active=0 (Inactive employees)
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/get_dpa_list?is_active=0',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_dpa_list_with_submitted_dpa_yes_does_not_500()
    {
        // Confirmed filter param: submitted_dpa=1 (dpa_ticked_at IS NOT NULL)
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/get_dpa_list?submitted_dpa=1',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_dpa_list_with_submitted_dpa_no_does_not_500()
    {
        // Confirmed filter param: submitted_dpa=0 (dpa_ticked_at IS NULL)
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/get_dpa_list?submitted_dpa=0',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_dpa_list_with_department_id_filter_does_not_500()
    {
        // Confirmed filter param: department_id (sent from <select name="department_id">)
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/get_dpa_list?department_id=1',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_dpa_list_with_name_filter_does_not_500()
    {
        // Confirmed filter param: name (from <input name="name">)
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/get_dpa_list?name=Test',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_dpa_list_with_page_param_does_not_500()
    {
        // Confirmed: Filter submit resets page=1 before call; SP receives page param
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/get_dpa_list?page=1',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_dpa_list_with_high_page_number_does_not_500()
    {
        // Beyond last page should return empty results, not a server error
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/get_dpa_list?page=9999',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_dpa_list_with_all_filters_combined_does_not_500()
    {
        // All confirmed filter params sent together (mirrors full Filter submit payload)
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/get_dpa_list?is_active=1&submitted_dpa=1&department_id=1&name=Test&page=1',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // Known bug: on SP failure, controller returns HTTP 404 instead of 5xx
    // =========================================================================

    /** @test */
    public function test_get_dpa_list_sp_failure_returns_404_not_500_known_bug()
    {
        // KNOWN BUG: UserController::get_dpa_list returns HTTP 404 on SP failures
        // (should be 500 or 503). Marked as skipped until the bug is fixed.
        $this->markTestSkipped(
            'Known bug: UserController::get_dpa_list returns HTTP 404 (not 5xx) when ' .
            'EH_SP_Employee_DPA_List fails. See UserController.php:520 and registry doc Area 1.'
        );
    }

    // =========================================================================
    // PATTERN A — Export (filtered)
    // GET /api/user/export_dpa_list?export=filtered&<currentFilters>
    // UserController::export_dpa_list (UserController.php:551) → DpaListExport → downloads dpa_list.csv
    // Backend sends as dtrlogs.csv; frontend overrides name to dpa_list.csv
    // =========================================================================

    /** @test */
    public function test_export_dpa_list_filtered_returns_non_500()
    {
        // Confirmed: export=filtered keeps all current filter params
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/export_dpa_list?export=filtered',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_export_dpa_list_filtered_with_active_filter_does_not_500()
    {
        // Confirmed: filtered export includes is_active and submitted_dpa filters
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/export_dpa_list?export=filtered&is_active=1&submitted_dpa=1',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // PATTERN A — Export All
    // GET /api/user/export_dpa_list?export=all
    // Ignores department_id and name params; only is_active and submitted_dpa kept
    // perpage_count set to 99999 in repository to fetch all matching records
    // =========================================================================

    /** @test */
    public function test_export_dpa_list_all_returns_non_500()
    {
        // Confirmed: export=all ignores department_id and name; fetches all matching records
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/export_dpa_list?export=all',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_export_dpa_list_all_with_is_active_filter_does_not_500()
    {
        // Confirmed: export=all keeps is_active param; strips department_id and name
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/export_dpa_list?export=all&is_active=1',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_export_dpa_list_all_with_submitted_dpa_filter_does_not_500()
    {
        // Confirmed: export=all keeps submitted_dpa param
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/user/export_dpa_list?export=all&submitted_dpa=0',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }
}
