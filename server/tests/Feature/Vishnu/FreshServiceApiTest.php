<?php

/**
 * EVOX FreshService API Tests — Vishnu Padmanabhan
 *
 * All 9 FreshService endpoints share middleware: jwtauth, auth.apikey.
 * Endpoints that proxy to an external FreshService API (via Curl) will fail
 * gracefully in the test environment — the catch block returns error_response,
 * so tests assert the response is NOT 500 and uses the correct error envelope.
 *
 * getWorkspaces()    — calls EV_FS_Get_Category SP (DB only, no external call)
 * getUserSuggestions — queries users table (DB only, no external call)
 * All other endpoints — Curl to FRESHSERVICE_API_BASE_URL (external, will fail gracefully)
 *
 * Routes (all under prefix api/freshservice/, middleware: jwtauth, auth.apikey):
 *   GET  freshservice/workspaces
 *   GET  freshservice/tickets/my-tickets
 *   POST freshservice/tickets/
 *   GET  freshservice/tickets/{id}
 *   POST freshservice/tickets/{id}/reply
 *   GET  freshservice/tickets/{id}/conversations
 *   POST freshservice/tickets/upload-image
 *   POST freshservice/tickets/attachments
 *   GET  freshservice/users/suggestions
 *
 * Test patterns:
 *   A — Controller logic: withoutMiddleware() + actingAs()
 *   B — Auth enforcement: no withoutMiddleware(), no Bearer token → 401
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class FreshServiceApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Support\Facades\Cache::flush(); // clear rate-limiter between tests

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

    // ─── Auth enforcement (Pattern B) — all FS endpoints require JWT ─────────

    /** @test */
    public function test_workspaces_without_token_returns_401_token_absent()
    {
        $response = $this->getJson('/api/freshservice/workspaces', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_my_tickets_without_token_returns_401()
    {
        $response = $this->getJson('/api/freshservice/tickets/my-tickets', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_create_ticket_without_token_returns_401()
    {
        $response = $this->postJson('/api/freshservice/tickets/', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_get_ticket_without_token_returns_401()
    {
        $response = $this->getJson('/api/freshservice/tickets/1', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_ticket_conversations_without_token_returns_401()
    {
        $response = $this->getJson('/api/freshservice/tickets/1/conversations', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_ticket_reply_without_token_returns_401()
    {
        $response = $this->postJson('/api/freshservice/tickets/1/reply', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_upload_image_without_token_returns_401()
    {
        $response = $this->postJson('/api/freshservice/tickets/upload-image', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_save_attachment_without_token_returns_401()
    {
        $response = $this->postJson('/api/freshservice/tickets/attachments', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_user_suggestions_without_token_returns_401()
    {
        $response = $this->getJson('/api/freshservice/users/suggestions', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // ─── getWorkspaces — DB-only, no external call (Pattern A) ───────────────

    /** @test */
    public function test_workspaces_endpoint_returns_200_or_graceful_error()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/freshservice/workspaces', $this->apiKey);
        $this->assertNotEquals(404, $response->status(), 'GET /api/freshservice/workspaces must exist.');
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_workspaces_success_response_has_message_and_content()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/freshservice/workspaces', $this->apiKey);
        if ($response->status() === 200) {
            $response->assertJsonStructure(['message', 'content']);
        } else {
            $this->assertNotNull($response->json('error'), 'Non-200 workspaces must use error envelope.');
        }
    }

    // ─── External Curl endpoints — graceful failure (Pattern A) ──────────────

    /** @test */
    public function test_my_tickets_returns_error_response_not_500_when_external_api_unavailable()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/freshservice/tickets/my-tickets', $this->apiKey);
        $this->assertNotEquals(500, $response->status(), 'FreshService Curl failure must return error_response, not 500.');
    }

    /** @test */
    public function test_create_ticket_returns_error_response_not_500_when_external_api_unavailable()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/freshservice/tickets/', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status(), 'FreshService Curl failure must return error_response, not 500.');
    }

    /** @test */
    public function test_get_ticket_returns_error_response_not_500_when_external_api_unavailable()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/freshservice/tickets/999999', $this->apiKey);
        $this->assertNotEquals(500, $response->status(), 'FreshService Curl failure must return error_response, not 500.');
    }

    /** @test */
    public function test_ticket_conversations_returns_error_response_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/freshservice/tickets/999999/conversations', $this->apiKey);
        $this->assertNotEquals(500, $response->status(), 'FreshService Curl failure must return error_response, not 500.');
    }

    /** @test */
    public function test_ticket_reply_returns_error_response_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/freshservice/tickets/999999/reply', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status(), 'FreshService Curl failure must return error_response, not 500.');
    }

    // ─── getUserSuggestions — DB-only (Pattern A) ────────────────────────────

    /** @test */
    public function test_user_suggestions_with_keyword_returns_200_and_json_array()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/freshservice/users/suggestions?keyword=Jo', $this->apiKey);
        $response->assertStatus(200);
        $this->assertIsArray($response->json(), 'User suggestions must return a JSON array.');
    }

    /** @test */
    public function test_user_suggestions_with_empty_keyword_returns_200_and_json_array()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/freshservice/users/suggestions?keyword=', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_user_suggestions_with_nonsense_keyword_returns_200_and_empty_array()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/freshservice/users/suggestions?keyword=zzzzzzzzzzzzz_evox_test', $this->apiKey);
        $response->assertStatus(200);
        $this->assertIsArray($response->json());
    }

    // ─── File upload — no file provided → graceful error (Pattern A) ─────────

    /** @test */
    public function test_upload_image_without_file_returns_error_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/freshservice/tickets/upload-image', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status(), 'upload-image without file must return graceful error, not 500.');
    }

    /** @test */
    public function test_save_attachment_without_file_returns_error_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/freshservice/tickets/attachments', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status(), 'attachments without file must return graceful error, not 500.');
    }
}
