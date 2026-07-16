<?php

/**
 * EVOX Sync API Tests — Vishnu Padmanabhan
 *
 * INDEPENDENT coverage — written without reviewing Gary's Api/ tests.
 * Purpose: parallel suite for later diff/comparison with Gary's work.
 *
 * SyncController routes use ONLY auth.apikey middleware (no JWT).
 * These endpoints are called by HRIS/BHR integrations, not by logged-in users.
 *
 * Routes (all POST, middleware: auth.apikey only):
 *   POST /api/sync_users
 *   POST /api/sync_users_hris
 *   POST /api/sync_holidays
 *   POST /api/sync_leaves
 *   POST /api/sync_timeoff_allocation
 *   POST /api/sync_timeoff_allocation_new
 *   POST /api/sync_timeoff_allocation_fail_sync
 *
 * Note: SyncController uses raw response()->json() — NOT the EVOX
 * {message,content} envelope. Missing-key errors return {"errors":{...}} HTTP 200.
 *
 * Auth enforcement: missing X-Authorization header → 401
 *   {"errors":[{"message":"Unauthorized"}]} (from ejarnutowski/laravel-api-key package)
 *
 * Test patterns:
 *   K — API-key enforcement: no X-Authorization header → 401
 *   V — Validation: API key present, body missing required fields → errors JSON (not 500)
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;

class SyncApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;

    protected function setUp(): void
    {
        parent::setUp();

        $this->apiKey = [
            'X-Authorization' => env(
                'APP_API_KEY',
                'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z'
            ),
        ];

        // sync_holidays/sync_leaves/sync_users hit the same BHR-backed SyncController
        // family that AdminSyncApiTest.php already flags as unsafe without a mock —
        // bind evoxtest_BhrMock so these routes never reach live api.bamboohr.com.
        $this->app->bind(BhrRepositoryInterface::class, function () {
            return new \Tests\Feature\Api\evoxtest_BhrMock();
        });
    }

    // ─── API-key enforcement (Pattern K) — all 7 sync routes ─────────────────

    /** @test */
    public function test_sync_users_without_api_key_returns_401()
    {
        $response = $this->postJson('/api/sync_users', []);
        $response->assertStatus(401);
        $this->assertNotNull($response->json('errors'), 'Missing API key must return errors envelope.');
    }

    /** @test */
    public function test_sync_users_hris_without_api_key_returns_401()
    {
        $response = $this->postJson('/api/sync_users_hris', []);
        $response->assertStatus(401);
        $this->assertNotNull($response->json('errors'));
    }

    /** @test */
    public function test_sync_holidays_without_api_key_returns_401()
    {
        $response = $this->postJson('/api/sync_holidays', []);
        $response->assertStatus(401);
        $this->assertNotNull($response->json('errors'));
    }

    /** @test */
    public function test_sync_leaves_without_api_key_returns_401()
    {
        $response = $this->postJson('/api/sync_leaves', []);
        $response->assertStatus(401);
        $this->assertNotNull($response->json('errors'));
    }

    /** @test */
    public function test_sync_timeoff_allocation_without_api_key_returns_401()
    {
        $response = $this->postJson('/api/sync_timeoff_allocation', []);
        $response->assertStatus(401);
        $this->assertNotNull($response->json('errors'));
    }

    /** @test */
    public function test_sync_timeoff_allocation_new_without_api_key_returns_401()
    {
        $response = $this->postJson('/api/sync_timeoff_allocation_new', []);
        $response->assertStatus(401);
        $this->assertNotNull($response->json('errors'));
    }

    /** @test */
    public function test_sync_timeoff_allocation_fail_sync_without_api_key_returns_401()
    {
        $response = $this->postJson('/api/sync_timeoff_allocation_fail_sync', []);
        $response->assertStatus(401);
        $this->assertNotNull($response->json('errors'));
    }

    // ─── Route existence + validation (Pattern V) — API key present, no body ─

    /** @test */
    public function test_sync_users_with_api_key_missing_body_returns_validation_errors_not_500()
    {
        // Required: firstName, bestEmail, lastName, employeeNumber, bhrNumber, status
        $response = $this->postJson('/api/sync_users', [], $this->apiKey);

        $this->assertNotEquals(404, $response->status(),
            'POST /api/sync_users must exist — 404 is a routing regression.');
        $this->assertNotEquals(500, $response->status(),
            'sync_users with empty body must return validation errors, not 500.');
        // SyncController returns {"errors":{...}} on validation failure
        $this->assertNotNull($response->json('errors'),
            'Validation failure must include an errors key.');
    }

    /** @test */
    public function test_sync_users_hris_with_api_key_missing_body_returns_not_500()
    {
        $response = $this->postJson('/api/sync_users_hris', [], $this->apiKey);
        $this->assertNotEquals(404, $response->status());
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_sync_holidays_with_api_key_is_reachable()
    {
        $response = $this->postJson('/api/sync_holidays', [], $this->apiKey);
        $this->assertNotEquals(404, $response->status());
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_sync_leaves_with_api_key_is_reachable()
    {
        $response = $this->postJson('/api/sync_leaves', [], $this->apiKey);
        $this->assertNotEquals(404, $response->status());
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_sync_timeoff_allocation_with_api_key_is_reachable()
    {
        $response = $this->postJson('/api/sync_timeoff_allocation', [], $this->apiKey);
        $this->assertNotEquals(404, $response->status());
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_sync_timeoff_allocation_new_with_api_key_is_reachable()
    {
        $response = $this->postJson('/api/sync_timeoff_allocation_new', [], $this->apiKey);
        $this->assertNotEquals(404, $response->status());
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_sync_timeoff_allocation_fail_sync_with_api_key_is_reachable()
    {
        $response = $this->postJson('/api/sync_timeoff_allocation_fail_sync', [], $this->apiKey);
        $this->assertNotEquals(404, $response->status());
        $this->assertNotEquals(500, $response->status());
    }
}
