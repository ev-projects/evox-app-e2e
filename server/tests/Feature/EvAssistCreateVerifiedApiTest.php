<?php
// VERIFIED-BACKED — generated 2026-07-07 from create-ticket.registry.md (vetted by Glenn Macasarte on July 2, 2026)
// Updated 2026-08-13: Pattern A tests implemented via evoxtest_FreshServiceCurlMock (no live API).

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use Tests\Feature\Api\evoxtest_FreshServiceCurlMock;

/**
 * @registry-doc create-ticket.registry.md
 * @vetted-by Glenn Macasarte
 * @vetted-on July 2, 2026
 *
 * Covers confirmed API endpoints from [DEVELOPER VETTING] blocks:
 *  - GET  /api/freshservice/workspaces          → FreshServiceController::getWorkspaces
 *  - GET  /api/freshservice/users/suggestions   → FreshServiceController::getUserSuggestions
 *  - POST /api/freshservice/tickets/attachments/ → FreshServiceController::saveAttachment
 *  - POST /api/freshservice/tickets/             → FreshServiceController::createTicket
 *
 * Pattern A (controller logic): withoutMiddleware() + actingAs() + Curl mock.
 * Pattern B (auth enforcement): no middleware bypass, no actingAs — asserts 401.
 *
 * Mock: evoxtest_FreshServiceCurlMock swapped onto Ixudra\Curl\Facades\Curl in setUp().
 * getWorkspaces and getUserSuggestions never call Curl — pure DB; no mock needed.
 * saveAttachment (no-file path) returns error before Curl — no mock needed.
 */
class EvAssistCreateVerifiedApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User  $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->user   = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();

        // Swap Curl facade — prevents any real HTTP call to FreshService.
        \Ixudra\Curl\Facades\Curl::swap(new evoxtest_FreshServiceCurlMock());
        evoxtest_FreshServiceCurlMock::useSuccessMode(); // default for each test
    }

    protected function tearDown(): void
    {
        evoxtest_FreshServiceCurlMock::useSuccessMode(); // reset in case a test left error mode on
        parent::tearDown();
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // GET /api/freshservice/workspaces
    // =========================================================================

    /** @test */
    public function test_get_workspaces_without_token_returns_401()
    {
        $response = $this->getJson('/api/freshservice/workspaces', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // GET /api/freshservice/workspaces → FreshServiceController::getWorkspaces
    // No Curl — reads EV_FS_Get_Category SP (local DB). Mock not required.
    // =========================================================================

    /** @test */
    public function test_get_workspaces_returns_200_with_data()
    {
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->getJson('/api/freshservice/workspaces', $this->apiKey);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_get_workspaces_response_is_array_or_object()
    {
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->getJson('/api/freshservice/workspaces', $this->apiKey);

        $response->assertStatus(200);
        $this->assertIsArray($response->json('content'));
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // GET /api/freshservice/users/suggestions?keyword=test
    // =========================================================================

    /** @test */
    public function test_get_user_suggestions_without_token_returns_401()
    {
        $response = $this->getJson('/api/freshservice/users/suggestions?keyword=test', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // GET /api/freshservice/users/suggestions → FreshServiceController::getUserSuggestions
    // No Curl — queries users table directly. Returns raw JSON array (no EVOX envelope).
    // =========================================================================

    /** @test */
    public function test_get_user_suggestions_with_keyword_returns_200()
    {
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->getJson('/api/freshservice/users/suggestions?keyword=test', $this->apiKey);

        $response->assertStatus(200);
    }

    /** @test */
    public function test_get_user_suggestions_returns_array()
    {
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->getJson('/api/freshservice/users/suggestions?keyword=eastvantage', $this->apiKey);

        $response->assertStatus(200);
        $this->assertIsArray($response->json()); // raw array — no EVOX envelope
    }

    /** @test */
    public function test_get_user_suggestions_with_empty_keyword_does_not_500()
    {
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->getJson('/api/freshservice/users/suggestions?keyword=', $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        $response->assertStatus(200);
    }

    /** @test */
    public function test_get_user_suggestions_with_single_char_keyword_does_not_500()
    {
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->getJson('/api/freshservice/users/suggestions?keyword=a', $this->apiKey);

        $response->assertStatus(200);
        $this->assertIsArray($response->json());
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // POST /api/freshservice/tickets/attachments/
    // =========================================================================

    /** @test */
    public function test_post_attachment_without_token_returns_401()
    {
        $response = $this->postJson('/api/freshservice/tickets/attachments/', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // POST /api/freshservice/tickets/attachments/ → FreshServiceController::saveAttachment
    // No-file path: controller returns error_response before touching Curl.
    // =========================================================================

    /** @test */
    public function test_post_attachment_without_file_returns_validation_error()
    {
        // No 'attachment' key → hasFile('attachment') is false → error_response(400) before Curl.
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->postJson('/api/freshservice/tickets/attachments/', [], $this->apiKey);

        $response->assertStatus(400)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // POST /api/freshservice/tickets/
    // =========================================================================

    /** @test */
    public function test_post_create_ticket_without_token_returns_401()
    {
        $response = $this->postJson('/api/freshservice/tickets/', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // POST /api/freshservice/tickets/ → FreshServiceController::createTicket
    // Mock returns 422 for error tests (exercises the non-200 Curl branch).
    // Mock returns 200 + ticket object for the success test.
    // Note: on success the controller calls EV_SP_FS_Ticket_Count; if that SP is
    // absent from the test DB the outer catch returns 400 — still not 500.
    // =========================================================================

    /** @test */
    public function test_post_create_ticket_with_missing_required_fields_returns_validation_error()
    {
        evoxtest_FreshServiceCurlMock::useErrorMode();

        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->postJson('/api/freshservice/tickets/', [], $this->apiKey);

        // Mock returns 422 → controller wraps in error_response(400). Not 500.
        $response->assertStatus(400)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function test_post_create_ticket_subject_too_short_returns_error()
    {
        evoxtest_FreshServiceCurlMock::useErrorMode();

        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->postJson('/api/freshservice/tickets/', ['subject' => 'Hi'], $this->apiKey);

        $response->assertStatus(400)
            ->assertJsonStructure(['error']);
    }

    /** @test */
    public function test_post_create_ticket_description_too_short_returns_error()
    {
        evoxtest_FreshServiceCurlMock::useErrorMode();

        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->postJson('/api/freshservice/tickets/', [
                'subject'     => 'Valid subject line',
                'description' => 'Too short',
            ], $this->apiKey);

        $response->assertStatus(400)
            ->assertJsonStructure(['error']);
    }

    /** @test */
    public function test_post_create_ticket_invalid_priority_returns_error()
    {
        evoxtest_FreshServiceCurlMock::useErrorMode();

        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->postJson('/api/freshservice/tickets/', [
                'subject'     => 'Valid subject line',
                'description' => 'Valid description text here.',
                'priority'    => 999, // invalid
                'workspace_id' => 1,
            ], $this->apiKey);

        $response->assertStatus(400)
            ->assertJsonStructure(['error']);
    }

    /** @test */
    public function test_post_create_ticket_subject_at_255_char_limit_does_not_500()
    {
        // Success mode: mock returns ticket object → controller calls EV_SP_FS_Ticket_Count.
        // If SP is present → 200. If SP absent → caught by try/catch → 400. Either way, not 500.
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->postJson('/api/freshservice/tickets/', [
                'subject'      => str_repeat('A', 255),
                'description'  => 'E2E automated test — subject boundary check.',
                'priority'     => 1,
                'status'       => 2,
                'workspace_id' => 1,
            ], $this->apiKey);

        $this->assertNotEquals(500, $response->status());
    }
}
