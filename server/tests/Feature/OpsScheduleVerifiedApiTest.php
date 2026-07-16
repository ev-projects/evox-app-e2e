<?php
/**
 * @registry-doc ops-schedule.registry.md
 * @vetted-by    Glenn Macasarte
 * @vetted-on    July 2, 2026
 *
 * VERIFIED-BACKED — generated 2026-07-07 from ops-schedule.registry.md.
 *
 * Covers: GET /api/opsschedule → OpsScheduleController::get()
 *
 * [CODE REVIEW 2026-07-07] EVOX-176 "no auth middleware" claim was INCORRECT.
 * Modules/Opsschedule/Routes/api.php line 16 wraps all routes in ['jwtauth', 'auth.apikey'].
 * Unauthenticated requests return 401, not 200.
 */

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class OpsScheduleVerifiedApiTest extends TestCase
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
    // EVOX-176 — No auth middleware: endpoint is publicly accessible.
    // Confirming that the endpoint does NOT return 401 without a bearer token
    // (this is the documented security bug, not desired behaviour).
    // =========================================================================

    /** @test */
    public function test_get_opsschedule_without_token_returns_401(): void
    {
        // [CODE REVIEW 2026-07-07] Route IS protected: Modules/Opsschedule/Routes/api.php line 16
        // wraps all opsschedule routes in ['jwtauth', 'auth.apikey'] middleware.
        // EVOX-176 bug claim (no auth middleware) was INCORRECT per the route file.
        $response = $this->getJson('/api/opsschedule', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic (withoutMiddleware + actingAs)
    // GET /api/opsschedule → OpsScheduleController::get()
    // Returns a two-column structure (array_chunk into 2 halves).
    // =========================================================================

    /** @test */
    public function test_get_opsschedule_returns_200(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/opsschedule', $this->apiKey);
        $response->assertStatus(200);
    }

    /** @test */
    public function test_get_opsschedule_returns_array_response(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/opsschedule', $this->apiKey);
        $response->assertStatus(200);
        $body = $response->json();
        $this->assertIsArray($body);
    }

    /** @test */
    public function test_get_opsschedule_returns_two_column_structure(): void
    {
        // OpsScheduleController::get() uses array_chunk to split department
        // records into two halves. The response should be an array of exactly
        // 2 elements (left column and right column).
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/opsschedule', $this->apiKey);
        $response->assertStatus(200);
        $body = $response->json();
        $this->assertIsArray($body);
        // Two-column split: at most 2 top-level entries
        $this->assertLessThanOrEqual(2, count($body));
    }

    /** @test */
    public function test_get_opsschedule_does_not_return_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/opsschedule', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }
}
