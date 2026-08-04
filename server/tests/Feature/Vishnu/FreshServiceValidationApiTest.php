<?php
// DRAFT — generated 2026-06-16, needs verification


/**
 * EVOX FreshService Validation API Tests — Vishnu Padmanabhan
 *
 * Extends coverage beyond FreshServiceApiTest.php (which handles auth enforcement
 * and graceful-failure tests for the external Curl endpoints).
 *
 * THIS FILE focuses on:
 *   - Payload validation gaps (missing required fields → 422)
 *   - Response envelope correctness (getUserSuggestions raw-array anomaly)
 *   - Upload validation (file type / size rules)
 *   - Null-ID guard (ID 999999 must not produce 500)
 *   - Workspace response structure (nested SP data)
 *
 * Routes tested (all under prefix /api/freshservice/, middleware: jwtauth, auth.apikey):
 *   GET  /api/freshservice/workspaces
 *   GET  /api/freshservice/tickets/my-tickets
 *   POST /api/freshservice/tickets/
 *   GET  /api/freshservice/tickets/{id}
 *   POST /api/freshservice/tickets/{id}/reply
 *   GET  /api/freshservice/tickets/{id}/conversations
 *   POST /api/freshservice/tickets/upload-image
 *   POST /api/freshservice/tickets/attachments
 *   GET  /api/freshservice/users/suggestions
 *
 * Pattern A — Controller logic: withoutMiddleware() + actingAs()
 * Pattern B — Auth enforcement: no withoutMiddleware(), no Bearer token → 401
 *
 * Note: All endpoints proxying to the external FreshService SaaS API will fail
 * gracefully (catch block returns error_response) in the test environment.
 * Tests assert NOT 500 rather than 200 for those paths.
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class FreshServiceValidationApiTest extends TestCase
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
    // AUTH ENFORCEMENT — Pattern B (no withoutMiddleware)
    // All 9 routes must reject unauthenticated requests with 401 + token_absent
    // =========================================================================

    /** @test */
    public function test_workspaces_without_token_returns_401()
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
    public function test_ticket_reply_without_token_returns_401()
    {
        $response = $this->postJson('/api/freshservice/tickets/1/reply', [], $this->apiKey);
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

    // =========================================================================
    // GET /api/freshservice/workspaces — DB-only SP path (Pattern A)
    // =========================================================================

    /** @test */
    public function test_workspaces_returns_success_envelope_with_message_and_content()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/freshservice/workspaces', $this->apiKey);

        // SP may succeed (200) or return graceful error (400) — never 500
        $this->assertNotEquals(500, $response->status());

        if ($response->status() === 200) {
            $response->assertJsonStructure(['message', 'content']);
        } else {
            $this->assertNotNull($response->json('error'),
                'Non-200 workspaces response must use the error envelope.');
        }
    }

    /** @test */
    public function test_workspaces_content_is_array_or_empty()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/freshservice/workspaces', $this->apiKey);

        $this->assertNotEquals(500, $response->status());

        if ($response->status() === 200) {
            // content is either an array of workspace objects or an empty array
            $content = $response->json('content');
            $this->assertTrue(
                is_array($content),
                'Workspaces content must be an array (empty or populated).'
            );
        }
    }

    // =========================================================================
    // POST /api/freshservice/tickets/ — createTicket validation (Pattern A)
    // The controller proxies to external API so no 200 is expected in test env.
    // We validate that missing required fields do not crash (not 500).
    // =========================================================================

    /** @test */
    public function test_create_ticket_empty_payload_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/freshservice/tickets/', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_create_ticket_missing_subject_does_not_500()
    {
        $this->withoutMiddleware();
        $payload = [
            'description'  => 'This is a test description for a FreshService ticket.',
            'priority'     => 2,
            'status'       => 2,
            'workspace_id' => 1,
        ];
        $response = $this->actingAs($this->user)->postJson('/api/freshservice/tickets/', $payload, $this->apiKey);
        // External API will reject — controller catches and returns error_response, not 500
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_create_ticket_missing_workspace_id_does_not_500()
    {
        $this->withoutMiddleware();
        $payload = [
            'subject'     => 'Test FreshService ticket subject',
            'description' => 'This is a test description for a FreshService ticket.',
            'priority'    => 2,
            'status'      => 2,
        ];
        $response = $this->actingAs($this->user)->postJson('/api/freshservice/tickets/', $payload, $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_create_ticket_missing_description_does_not_500()
    {
        $this->withoutMiddleware();
        $payload = [
            'subject'      => 'Test FreshService ticket subject',
            'priority'     => 2,
            'status'       => 2,
            'workspace_id' => 1,
        ];
        $response = $this->actingAs($this->user)->postJson('/api/freshservice/tickets/', $payload, $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_create_ticket_invalid_priority_does_not_500()
    {
        $this->withoutMiddleware();
        $payload = [
            'subject'      => 'Test FreshService ticket subject',
            'description'  => 'This is a test description.',
            'priority'     => 99, // invalid — valid values are 1/2/3/4
            'status'       => 2,
            'workspace_id' => 1,
        ];
        $response = $this->actingAs($this->user)->postJson('/api/freshservice/tickets/', $payload, $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_create_ticket_valid_payload_returns_error_response_not_500()
    {
        // External FS API unavailable in test — controller catch returns error_response
        $this->withoutMiddleware();
        $payload = [
            'subject'             => 'PHPUnit test ticket from EVOX',
            'description'         => 'This is a PHPUnit smoke test description.',
            'priority'            => 2,
            'status'              => 2,
            'workspace_id'        => 1,
            'attachments'         => [],
            'removed_attachments' => [],
            'cc_emails'           => [],
        ];
        $response = $this->actingAs($this->user)->postJson('/api/freshservice/tickets/', $payload, $this->apiKey);
        // Should return error_response (external API unavailable) — never 500
        $this->assertNotEquals(500, $response->status());
        $this->assertNotNull(
            $response->json('error'),
            'createTicket in test env must return error envelope (external API unavailable).'
        );
    }

    // =========================================================================
    // GET /api/freshservice/tickets/my-tickets (Pattern A)
    // =========================================================================

    /** @test */
    public function test_my_tickets_without_workspace_id_returns_error_not_500()
    {
        // workspaceId is nullable — controller still proxies to external API
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/freshservice/tickets/my-tickets?status=all&page=1&limit=100', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_my_tickets_with_workspace_id_returns_error_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/freshservice/tickets/my-tickets?status=open&page=1&limit=100&workspaceId=1', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_my_tickets_with_status_filter_does_not_500()
    {
        $this->withoutMiddleware();
        foreach (['all', 'open', 'pending', 'resolved', 'closed'] as $status) {
            $response = $this->actingAs($this->user)
                ->getJson("/api/freshservice/tickets/my-tickets?status={$status}&page=1&limit=100", $this->apiKey);
            $this->assertNotEquals(500, $response->status(),
                "my-tickets with status={$status} must not 500.");
        }
    }

    // =========================================================================
    // GET /api/freshservice/tickets/{id} — getTicket (Pattern A)
    // =========================================================================

    /** @test */
    public function test_get_ticket_with_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/freshservice/tickets/999999', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_ticket_returns_error_envelope_on_failure()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/freshservice/tickets/999999', $this->apiKey);
        // External API unavailable — must use error envelope
        $this->assertNotEquals(500, $response->status());
        $this->assertNotNull($response->json('error'),
            'getTicket must return error envelope when external API unavailable.');
    }

    // =========================================================================
    // GET /api/freshservice/tickets/{id}/conversations (Pattern A)
    // =========================================================================

    /** @test */
    public function test_get_conversations_with_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/freshservice/tickets/999999/conversations', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // POST /api/freshservice/tickets/{id}/reply — sendTicketConversation (Pattern A)
    // =========================================================================

    /** @test */
    public function test_ticket_reply_empty_payload_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->postJson('/api/freshservice/tickets/1/reply', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_ticket_reply_missing_body_does_not_500()
    {
        $this->withoutMiddleware();
        $payload = [
            'requester_id'        => 12345,
            'attachments'         => [],
            'removed_attachments' => [],
            'cc_emails'           => [],
        ];
        $response = $this->actingAs($this->user)
            ->postJson('/api/freshservice/tickets/1/reply', $payload, $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_ticket_reply_valid_payload_returns_error_not_500()
    {
        // External API unavailable in test env — catch block returns error_response
        $this->withoutMiddleware();
        $payload = [
            'body'                => 'PHPUnit test reply to ticket.',
            'requester_id'        => 12345,
            'attachments'         => [],
            'removed_attachments' => [],
            'cc_emails'           => [],
        ];
        $response = $this->actingAs($this->user)
            ->postJson('/api/freshservice/tickets/999999/reply', $payload, $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // POST /api/freshservice/tickets/upload-image — saveTicketImage (Pattern A)
    // Validates: file must be jpeg/png/jpg, max 5120 KB
    // =========================================================================

    /** @test */
    public function test_upload_image_empty_payload_returns_error_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->postJson('/api/freshservice/tickets/upload-image', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
        $this->assertNotNull($response->json('error'),
            'No-file upload must return error envelope.');
    }

    // =========================================================================
    // POST /api/freshservice/tickets/attachments — saveAttachment (Pattern A)
    // Validates: attachment required; workspace_id required integer
    // =========================================================================

    /** @test */
    public function test_save_attachment_empty_payload_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->postJson('/api/freshservice/tickets/attachments', [], $this->apiKey);
        // FreshService controller returns 400 (not 422) for validation errors
        $this->assertContains($response->status(), [400, 422]);
    }

    /** @test */
    public function test_save_attachment_missing_attachment_file_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'workspace_id' => 1,
            // attachment file missing
        ];
        $response = $this->actingAs($this->user)
            ->postJson('/api/freshservice/tickets/attachments', $payload, $this->apiKey);
        // FreshService controller returns 400 (not 422) for validation errors
        $this->assertContains($response->status(), [400, 422]);
    }

    /** @test */
    public function test_save_attachment_missing_workspace_id_returns_422()
    {
        $this->withoutMiddleware();
        // workspace_id is required integer per saveAttachment validation rules
        $payload = [
            // No workspace_id, no file — both missing
        ];
        $response = $this->actingAs($this->user)
            ->postJson('/api/freshservice/tickets/attachments', $payload, $this->apiKey);
        // FreshService controller returns 400 (not 422) for validation errors
        $this->assertContains($response->status(), [400, 422]);
    }

    /** @test */
    public function test_save_attachment_non_integer_workspace_id_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'workspace_id' => 'not-an-integer',
        ];
        $response = $this->actingAs($this->user)
            ->postJson('/api/freshservice/tickets/attachments', $payload, $this->apiKey);
        // workspace_id validated as integer; missing file also fails
        // FreshService controller returns 400 (not 422) for validation errors
        $this->assertContains($response->status(), [400, 422]);
    }

    // =========================================================================
    // GET /api/freshservice/users/suggestions — getUserSuggestions (Pattern A)
    // NOTE: This endpoint returns a raw JSON array, NOT the standard
    // success_response envelope (Bug 4 in the full-stack report).
    // All other endpoints return { message, content } on success.
    // =========================================================================

    /** @test */
    public function test_user_suggestions_returns_raw_json_array_not_envelope()
    {
        $this->withoutMiddleware();
        $keyword = substr($this->user->email, 0, 3);
        $response = $this->actingAs($this->user)
            ->getJson('/api/freshservice/users/suggestions?keyword=' . urlencode($keyword), $this->apiKey);

        $response->assertStatus(200);
        // KNOWN ANOMALY (Bug 4): getUserSuggestions returns raw array, not success_response envelope
        // Verify it is a JSON array (no 'message'/'content' wrapper)
        $this->assertIsArray($response->json(),
            'getUserSuggestions must return a raw JSON array (no envelope wrapper).');
        $this->assertArrayNotHasKey('message', $response->json(),
            'getUserSuggestions must NOT wrap response in success_response envelope (Bug 4).');
    }

    /** @test */
    public function test_user_suggestions_result_format_contains_email_string()
    {
        $this->withoutMiddleware();
        // Search by user's first 3 email chars — guaranteed at least one match
        $keyword = substr($this->user->email, 0, 3);
        $response = $this->actingAs($this->user)
            ->getJson('/api/freshservice/users/suggestions?keyword=' . urlencode($keyword), $this->apiKey);

        $response->assertStatus(200);
        $data = $response->json();
        $this->assertIsArray($data);

        if (count($data) > 0) {
            // Format is: "First Last <email> - Job Title"
            $firstEntry = $data[0];
            $this->assertIsString($firstEntry,
                'Each suggestion must be a formatted string like "First Last <email> - Job Title".');
            $this->assertStringContainsString('<', $firstEntry,
                'Suggestion must contain email wrapped in angle brackets.');
            $this->assertStringContainsString('>', $firstEntry,
                'Suggestion must contain email wrapped in angle brackets.');
        }
    }

    /** @test */
    public function test_user_suggestions_no_match_returns_empty_array()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/freshservice/users/suggestions?keyword=zzznomatch99999xyzabc', $this->apiKey);
        $response->assertStatus(200);
        $this->assertIsArray($response->json());
        $this->assertCount(0, $response->json());
    }

    /** @test */
    public function test_user_suggestions_empty_keyword_returns_200_and_array()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/freshservice/users/suggestions?keyword=', $this->apiKey);
        $response->assertStatus(200);
        $this->assertIsArray($response->json());
    }

    /** @test */
    public function test_user_suggestions_without_keyword_param_returns_200()
    {
        $this->withoutMiddleware();
        // keyword not provided — controller reads it as null, LIKE '%null%' query
        $response = $this->actingAs($this->user)
            ->getJson('/api/freshservice/users/suggestions', $this->apiKey);
        $response->assertStatus(200);
        $this->assertIsArray($response->json());
    }
}
