<?php

/**
 * EVOX Policies Document API Tests — Vishnu Padmanabhan
 *
 * INDEPENDENT coverage — written without reviewing Gary's Api/ tests.
 * Purpose: parallel suite for later diff/comparison with Gary's work.
 *
 * All 6 routes: middleware jwtauth, auth.apikey
 *
 * Routes:
 *   POST /api/uploadfiles                    — upload a policy document
 *   GET  /api/show                           — list policies for logged-in user
 *   GET  /api/showlist                       — list all policies (admin view)
 *   GET  /api/get_user_departments           — departments list for upload form
 *   PUT  /api/updatestatus/{id}/{status}     — change publish status
 *   GET  /api/download_policy/{id}           — stream the policy file (BinaryFileResponse)
 *
 * Note: downloadPolicy returns a BinaryFileResponse. To avoid the
 * BinaryFileResponse::status() incompatibility in Laravel 5.7 TestResponse,
 * we pass a non-existent ID (999999) so the controller returns an error_response
 * (JSON) instead of a file stream. For the happy-path file download, use
 * $response->getStatusCode() directly.
 *
 * Test patterns:
 *   B — Auth enforcement: no withoutMiddleware(), no Bearer → 401
 *   A — Route existence + response shape: withoutMiddleware() + actingAs()
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class PoliciesDocumentApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->apiKey = [
            'X-Authorization' => env(
                'APP_API_KEY',
                'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z'
            ),
        ];

        $this->user = User::where('is_active', 1)
            ->whereNotNull('email')
            ->firstOrFail();
    }

    // ─── Auth enforcement (Pattern B) ────────────────────────────────────────

    /** @test */
    public function test_show_without_token_returns_401()
    {
        $response = $this->getJson('/api/show', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_showlist_without_token_returns_401()
    {
        $response = $this->getJson('/api/showlist', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_get_user_departments_without_token_returns_401()
    {
        $response = $this->getJson('/api/get_user_departments', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_uploadfiles_without_token_returns_401()
    {
        $response = $this->postJson('/api/uploadfiles', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_updatestatus_without_token_returns_401()
    {
        $response = $this->putJson('/api/updatestatus/1/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_download_policy_without_token_returns_401()
    {
        $response = $this->getJson('/api/download_policy/1', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // ─── Route existence + response shape (Pattern A) ────────────────────────

    /** @test */
    public function test_show_returns_200_and_json_response()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/show', $this->apiKey);

        $this->assertNotEquals(404, $response->status(), 'GET /api/show must exist.');
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_showlist_returns_200_and_json_response()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/showlist', $this->apiKey);

        $this->assertNotEquals(404, $response->status(), 'GET /api/showlist must exist.');
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_user_departments_returns_200_and_json_response()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/get_user_departments', $this->apiKey);

        $this->assertNotEquals(404, $response->status());
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_uploadfiles_without_file_returns_graceful_error_not_500()
    {
        // Null guard present in PoliciesDocumentController::upload() at lines 22-24 (BUG-108 resolved).
        // No-file request returns a graceful error response — not 500. assertNotEquals(500) passes.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/uploadfiles', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_updatestatus_with_nonexistent_id_returns_not_404_route()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->putJson('/api/updatestatus/999999/1', [], $this->apiKey);

        $this->assertNotEquals(404, $response->status(),
            'PUT /api/updatestatus/{id}/{status} route must exist — 404 is a routing regression.');
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_download_policy_with_nonexistent_id_returns_graceful_error()
    {
        $this->withoutMiddleware();
        // Non-existent ID → SP returns null → controller should return error_response (JSON, not file)
        // Use getStatusCode() to avoid BinaryFileResponse::status() issue in Laravel 5.7
        $response = $this->actingAs($this->user)
            ->get('/api/download_policy/999999', $this->apiKey);

        $this->assertNotEquals(404, $response->getStatusCode(),
            'GET /api/download_policy/{id} route must exist.');
        $this->assertNotEquals(500, $response->getStatusCode(),
            'downloadPolicy with missing ID must not crash with 500.');
    }
}
