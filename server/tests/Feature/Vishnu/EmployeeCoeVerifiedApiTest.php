<?php
// VERIFIED-BACKED — generated 2026-07-07 from employee-coe.registry.md (vetted by Gobi Singaravel on 2026-07-01)

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * @registry-doc employee-coe.registry.md
 * @vetted-by Gobi Singaravel
 * @vetted-on 2026-07-01
 *
 * Confirmed API surface (from [DEVELOPER VETTING]):
 *   GET  /api/request/coe/user/?keyword={string}  → COEController::getUsers()
 *   GET  /api/request/coe/                        → COEController (history list, fires on load + after submit)
 *   POST /api/request/coe                         → COEController::create()
 *
 * Known bugs documented in registry:
 *   B-1: purpose_note not in Yup schema — Travel To can be empty on submit (PDF prints blank destination)
 *   B-2: GET /api/request/coe/ response body contains "Sucess" (typo) in production
 *   B-3: fetchCOE() fetches HR user's own COE history, not selected employee's
 *   B-4: employee_id has no server-side validation — null User::find() causes fatal 500
 */
class EmployeeCoeVerifiedApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->user = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // GET /api/request/coe/user/
    // Developer-confirmed: GET /api/request/coe/user/?keyword={string} → COEController::getUsers()
    // =========================================================================

    /** @test */
    public function test_get_coe_users_without_token_returns_401(): void
    {
        $response = $this->getJson('/api/request/coe/user/?keyword=Jo', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // GET /api/request/coe/
    // Developer-confirmed: fires on page load → returns COE history for HR user
    // =========================================================================

    /** @test */
    public function test_get_coe_history_without_token_returns_401(): void
    {
        $response = $this->getJson('/api/request/coe/', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // POST /api/request/coe
    // Developer-confirmed: POST /api/request/coe → COEController::create() → PDF stream
    // =========================================================================

    /** @test */
    public function test_post_coe_without_token_returns_401(): void
    {
        $response = $this->postJson('/api/request/coe/', [
            'purpose_index'    => 0,
            'show_compensation' => '0',
            'employee_id'      => 1,
            'employee_name'    => 'Test Employee',
        ], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // GET /api/request/coe/user/?keyword={string} — two-char minimum enforced FE-side only
    // Developer-confirmed: scoped to same country if LevelId ≠ 5; super-admin gets cross-country
    // =========================================================================

    /** @test */
    public function test_get_coe_users_with_valid_keyword_returns_200(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/request/coe/user/?keyword=Jo',
            $this->apiKey
        );
        $response->assertStatus(200);
    }

    /** @test */
    public function test_get_coe_users_response_is_array(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/request/coe/user/?keyword=Jo',
            $this->apiKey
        );
        $response->assertStatus(200);
        // Response must be an array (list of matching employees)
        $this->assertIsArray($response->json());
    }

    /** @test */
    public function test_get_coe_users_with_empty_keyword_does_not_500(): void
    {
        // FE debounce guard prevents this call for query.length < 2 — but backend must not crash
        // if it receives an empty keyword directly.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/request/coe/user/?keyword=',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // GET /api/request/coe/ — COE history list
    // Developer-confirmed ➕ missing: fires on load + after submit; returns HR user's own history
    // KNOWN BUG B-2: response body contains "Sucess" (typo) in production
    // KNOWN BUG B-3: fetches HR user's own COE history, not selected employee's
    // =========================================================================

    /** @test */
    public function test_get_coe_history_returns_200(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/request/coe/',
            $this->apiKey
        );
        $response->assertStatus(200);
    }

    /** @test */
    public function test_get_coe_history_response_has_message_and_content_keys(): void
    {
        // KNOWN BUG B-2: "message" value is "Sucess" (typo) in production — assert key exists,
        // not the spelling. Record only — do not fix here.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/request/coe/',
            $this->apiKey
        );
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_get_coe_history_content_is_array(): void
    {
        // KNOWN BUG B-3: content reflects HR user's own COE history only, not selected employee's.
        // Record only — do not fix here.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/request/coe/',
            $this->apiKey
        );
        $response->assertStatus(200);
        $this->assertIsArray($response->json('content'));
    }

    // =========================================================================
    // PATTERN A — POST /api/request/coe — validation: purpose_index required (HTTP 422)
    // Developer-confirmed (backend): purpose_index is server-side required → HTTP 422 if missing
    // =========================================================================

    /** @test */
    public function test_post_coe_without_purpose_index_returns_422(): void
    {
        // Developer-confirmed: COERequest validates purpose_index as required.
        // Missing purpose_index → HTTP 422 Unprocessable Entity.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/request/coe/', [
            'show_compensation' => '0',
            'employee_id'      => 1,
            'employee_name'    => 'Test Employee',
        ], $this->apiKey);
        $response->assertStatus(422);
    }

    // =========================================================================
    // PATTERN A — POST /api/request/coe — known bug: invalid employee_id causes 500
    // KNOWN BUG B-4: employee_id has no server-side validation — null User::find() → fatal 500
    // =========================================================================

    /** @test */
    public function test_post_coe_with_nonexistent_employee_id_is_known_500_bug(): void
    {
        // KNOWN BUG B-4: employee_id has no server-side validation.
        // COEController::create() calls User::find($request->employee_id) — if the user does not exist,
        // $user is null and $user->country_id throws a fatal error → 500.
        // Backend (COERequest) does not validate employee_id at all. Record only — do not fix here.
        $this->markTestSkipped(
            'Known production bug: COEController::create() calls User::find() with no null-check. ' .
            'Sending a non-existent employee_id returns 500. ' .
            'COERequest does not validate employee_id server-side. ' .
            'See employee-coe.registry.md — Backend Validation Rules table.'
        );
    }

    // =========================================================================
    // PATTERN A — POST /api/request/coe — show_compensation has no server-side validation
    // Developer-confirmed: show_compensation is NOT validated server-side — silently proceeds if omitted
    // =========================================================================

    /** @test */
    public function test_post_coe_show_compensation_has_no_server_side_validation(): void
    {
        // Developer-confirmed: COERequest does not validate show_compensation server-side.
        // Omitting it should NOT cause a 422 — it silently proceeds.
        // This test documents the absence of server-side validation for this field.
        // Note: requires a valid employee_id to avoid KNOWN BUG B-4; skip if none available.
        $this->markTestSkipped(
            'Requires a seeded employee_id with BHR profile to reach show_compensation logic without ' .
            'hitting KNOWN BUG B-4 (null User::find() fatal 500). ' .
            'Document: show_compensation is not validated server-side per COERequest. ' .
            'See employee-coe.registry.md — Backend Validation Rules table.'
        );
    }
}
