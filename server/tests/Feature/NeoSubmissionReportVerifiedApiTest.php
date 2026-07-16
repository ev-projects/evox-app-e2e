<?php
// VERIFIED-BACKED — generated 2026-07-07 from submission-report.registry.md (vetted by Gobi Singaravel on 2026-07-01)

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * @registry-doc submission-report.registry.md
 * @vetted-by    Gobi Singaravel
 * @vetted-on    2026-07-01
 *
 * Confirmed API endpoints from [DEVELOPER VETTING]:
 *   GET  /api/get_users_pending_submissions/?country={country}    NeoController::get_users_pending_submissions()
 *   GET  /api/get_user_submissions_data/?guid={guid}            NeoController::get_user_submissions_data()
 *   POST /api/approve_submissions/                              NeoController::approve_submissions()
 *   POST /api/request_for_resubmission/                         NeoController::request_for_resubmission()
 *   GET  /api/get_neo_file/{userId}/{fileId}                    NeoController::get_file()
 *
 * [CODE REVIEW 2026-07-07] Developer vetting comments in registry were INCORRECT.
 *   All /api/neo/* paths do not exist in Laravel routes (server/routes/api.php lines 70-76).
 *   Real paths use underscores and no /neo/ prefix segment.
 *
 * NOTE: All NEO endpoints proxy to an external NEO server via cURL.
 * Tests assert HTTP contract (auth enforcement, param routing, no 500).
 * They cannot assert the external NEO server response payload in isolation.
 */
class NeoSubmissionReportVerifiedApiTest extends TestCase
{
    use DatabaseTransactions; // SAFETY: converted from RefreshDatabase 2026-07-08 — never migrate:fresh on staging DB

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->user   = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // GET /api/get_users_pending_submissions/?country=Philippines
    // Row 8: fires on submission list mount; auto-determined country from user profile
    // =========================================================================

    /** @test */
    public function test_get_pending_submissions_without_token_returns_401()
    {
        $response = $this->getJson('/api/get_users_pending_submissions/?country=Philippines', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic (withoutMiddleware + actingAs)
    // GET /api/get_users_pending_submissions/?country=Philippines
    // Row 8: NeoController::get_users_pending_submissions() → cURL to external NEO server
    // =========================================================================

    /** @test */
    public function test_get_pending_submissions_with_valid_auth_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/get_users_pending_submissions/?country=Philippines',
            $this->apiKey
        );
        // Endpoint proxies to external NEO server — response content varies by environment.
        // Assert: must not return a 500 server error.
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_pending_submissions_response_is_json()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/get_users_pending_submissions/?country=Philippines',
            $this->apiKey
        );
        $this->assertNotNull($response->json());
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // GET /api/get_user_submissions_data/?guid={guid}
    // Row 9: fires on detail page mount — NeoController::get_user_submissions_data()
    // =========================================================================

    /** @test */
    public function test_get_submissions_data_without_token_returns_401()
    {
        $response = $this->getJson('/api/get_user_submissions_data/?guid=test-guid', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // GET /api/get_user_submissions_data/?guid={guid}
    // Row 9: NeoController::get_user_submissions_data() → cURL to external NEO server
    //        /api/genericform/review/{guid}
    // No country filter on this endpoint — any authenticated user with valid guid
    // =========================================================================

    /** @test */
    public function test_get_submissions_data_with_valid_auth_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/get_user_submissions_data/?guid=test-guid-placeholder',
            $this->apiKey
        );
        // Endpoint proxies to external NEO server — response for unknown guid may be 404 or error payload.
        // Assert: must not return a PHP 500.
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_submissions_data_missing_guid_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/get_user_submissions_data/',
            $this->apiKey
        );
        // Missing required param — should return a handled error, not a PHP 500.
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // POST /api/approve_submissions/
    // Row 7 (all-approve path): NeoController::approve_submissions()
    // Params sent as query params: ?guid=&approvedBy=&department=Human+Resources&notes=&country=
    // =========================================================================

    /** @test */
    public function test_post_approve_submissions_without_token_returns_401()
    {
        $response = $this->postJson('/api/approve_submissions/', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // POST /api/approve_submissions/
    // Row 7: confirm dialog confirmed → params sent as query params (not body)
    // =========================================================================

    /** @test */
    public function test_post_approve_submissions_with_valid_params_does_not_500()
    {
        $this->withoutMiddleware();
        // Params sent as query params — confirmed in DEVELOPER VETTING 2026-07-01
        $response = $this->actingAs($this->user)->postJson(
            '/api/approve_submissions/?guid=test-guid&approvedBy=Test+User&department=Human+Resources&notes=Test+note&country=Philippines',
            [],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_post_approve_submissions_missing_guid_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/approve_submissions/?approvedBy=Test+User&department=Human+Resources&notes=Test&country=Philippines',
            [],
            $this->apiKey
        );
        // Missing guid — should return a handled error, not a PHP 500.
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // POST /api/request_for_resubmission/
    // Row 7 (resubmit path): NeoController::request_for_resubmission()
    // Params as query params: ?userGuid=&fieldsToResubmit={"0":"fieldName"}&reason=&requestedBy=&country=
    // =========================================================================

    /** @test */
    public function test_post_request_resubmission_without_token_returns_401()
    {
        $response = $this->postJson('/api/request_for_resubmission/', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // POST /api/request_for_resubmission/
    // Row 7: fieldsToResubmit is JSON-encoded object e.g. {"0":"fieldName"}
    // =========================================================================

    /** @test */
    public function test_post_request_resubmission_with_valid_params_does_not_500()
    {
        $this->withoutMiddleware();
        $fieldsParam = urlencode('{"0":"fieldName"}');
        $response = $this->actingAs($this->user)->postJson(
            "/api/request_for_resubmission/?userGuid=test-guid&fieldsToResubmit={$fieldsParam}&reason=Please+resubmit&requestedBy=Test+User&country=Philippines",
            [],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_post_request_resubmission_missing_user_guid_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/request_for_resubmission/?reason=Please+resubmit&requestedBy=Test+User&country=Philippines',
            [],
            $this->apiKey
        );
        // Missing userGuid — should return a handled error, not a PHP 500.
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // GET /api/get_neo_file/{userId}/{fileId}
    // Row 3: NeoController::get_neo_file() → cURL to NEO server → streams base64 file
    //        Displays in modal with <iframe> (blob URL, width 100%, height 750px)
    // =========================================================================

    /** @test */
    public function test_get_neo_file_without_token_returns_401()
    {
        $response = $this->getJson('/api/get_neo_file/42728402/f2ae21d2-972c-493d-a585-a079f2a29889', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // GET /api/get_neo_file/{userId}/{fileId}
    // Example confirmed: GET /api/get_neo_file/42728402/f2ae21d2-972c-493d-a585-a079f2a29889
    // =========================================================================

    /** @test */
    public function test_get_neo_file_with_valid_auth_does_not_500()
    {
        $this->withoutMiddleware();
        // Use a non-existent file — response may be 404 or error payload from NEO server.
        // Assert: must not return a PHP 500.
        $response = $this->actingAs($this->user)->getJson(
            '/api/get_neo_file/00000000/00000000-0000-0000-0000-000000000000',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_neo_file_with_confirmed_url_pattern_does_not_500()
    {
        // [CODE REVIEW 2026-07-07] Developer vetting above was INCORRECT — the code says the opposite.
        // Real route: server/routes/api.php line 76: Route::get('get_neo_file/{userId}/{fileId}', 'NeoController@get_file')
        // Correct path: /api/get_neo_file/{userId}/{fileId}. The {bhr_num} param is {userId} per the real route.
        // The /api/neo/ prefix does not exist in Laravel routes — vetting was wrong.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/get_neo_file/42728402/f2ae21d2-972c-493d-a585-a079f2a29889',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }
}
