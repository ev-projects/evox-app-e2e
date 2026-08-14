<?php
// VERIFIED-BACKED — generated 2026-07-07 from my-tickets.registry.md (vetted by Glenn Macasarte on July 2, 2026)
// Updated 2026-08-13: Pattern A tests implemented via evoxtest_FreshServiceCurlMock (no live API).

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use App\Modules\User\Models\User;
use Tests\Feature\Api\evoxtest_FreshServiceCurlMock;

/**
 * @registry-doc my-tickets.registry.md
 * @vetted-by    Glenn Macasarte
 * @vetted-on    July 2, 2026
 *
 * Covers confirmed API endpoints from [DEVELOPER VETTING] blocks:
 *
 *   GET  /api/freshservice/tickets/my-tickets          FreshServiceController::getMyTickets
 *   GET  /api/freshservice/tickets/{id}                FreshServiceController::getTicket
 *   GET  /api/freshservice/tickets/{id}/conversations/ FreshServiceController::getTicketConversation
 *   POST /api/freshservice/tickets/attachments/        FreshServiceController::saveAttachment
 *   POST /api/freshservice/tickets/{id}/reply          FreshServiceController::sendTicketConversation
 *
 * Pattern A (controller logic): withoutMiddleware() + actingAs() + Curl mock.
 * Pattern B (auth enforcement): no middleware bypass, no actingAs — asserts 401.
 *
 * Mock: evoxtest_FreshServiceCurlMock swapped onto Ixudra\Curl\Facades\Curl in setUp().
 * getMyTickets mock returns 2 tickets (ids 88001 + 88002).
 */
class EvAssistTicketsVerifiedApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User  $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->user   = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();

        \Ixudra\Curl\Facades\Curl::swap(new evoxtest_FreshServiceCurlMock());
        evoxtest_FreshServiceCurlMock::useSuccessMode();
    }

    protected function tearDown(): void
    {
        evoxtest_FreshServiceCurlMock::useSuccessMode();
        parent::tearDown();
    }

    // =========================================================================
    // Auth enforcement — all FreshService endpoints require a bearer token.
    // Pattern B: no withoutMiddleware, no actingAs.
    // =========================================================================

    /** @test */
    public function test_get_my_tickets_without_auth_returns_401()
    {
        $response = $this->getJson('/api/freshservice/tickets/my-tickets', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_get_ticket_detail_without_auth_returns_401()
    {
        $response = $this->getJson('/api/freshservice/tickets/1', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_get_ticket_conversations_without_auth_returns_401()
    {
        $response = $this->getJson('/api/freshservice/tickets/1/conversations/', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_post_reply_without_auth_returns_401()
    {
        $response = $this->postJson('/api/freshservice/tickets/1/reply', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_post_attachment_without_auth_returns_401()
    {
        $response = $this->postJson('/api/freshservice/tickets/attachments/', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // GET /api/freshservice/tickets/my-tickets
    // FreshServiceController::getMyTickets
    // Mock returns 2 tickets in success mode; 400 error envelope in error mode.
    // =========================================================================

    /** @test */
    public function test_get_my_tickets_without_workspace_id_does_not_500()
    {
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->getJson('/api/freshservice/tickets/my-tickets', $this->apiKey);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_get_my_tickets_with_workspace_id_does_not_500()
    {
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->getJson('/api/freshservice/tickets/my-tickets?workspaceId=1', $this->apiKey);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_get_my_tickets_with_open_status_does_not_500()
    {
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->getJson('/api/freshservice/tickets/my-tickets?status=open', $this->apiKey);

        $response->assertStatus(200);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_my_tickets_response_is_valid_json()
    {
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->getJson('/api/freshservice/tickets/my-tickets?page=1&limit=10', $this->apiKey);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content' => ['tickets', 'total']]);

        // Mock returns 2 tickets (ids 88001, 88002)
        $tickets = $response->json('content.tickets');
        $this->assertCount(2, $tickets);
        $this->assertEquals(88001, $tickets[0]['id']);
        $this->assertEquals(88002, $tickets[1]['id']);
        $this->assertEquals('E2E Mock Ticket Alpha', $tickets[0]['subject']);
        $this->assertEquals('E2E Mock Ticket Beta',  $tickets[1]['subject']);
    }

    /** @test */
    public function test_get_my_tickets_with_high_page_does_not_500()
    {
        // High page number — mock still returns 200 (controller doesn't validate page).
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->getJson('/api/freshservice/tickets/my-tickets?page=9999&limit=10', $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        $response->assertStatus(200);
    }

    // =========================================================================
    // GET /api/freshservice/tickets/{id}
    // FreshServiceController::getTicket
    // =========================================================================

    /** @test */
    public function test_get_ticket_detail_with_valid_id_does_not_500()
    {
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->getJson('/api/freshservice/tickets/88001', $this->apiKey);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_get_ticket_detail_response_is_valid_json()
    {
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->getJson('/api/freshservice/tickets/88001', $this->apiKey);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content' => ['ticket']]);

        $this->assertEquals(88001, $response->json('content.ticket.id'));
        $this->assertEquals('E2E Mock Ticket Alpha', $response->json('content.ticket.subject'));
    }

    /** @test */
    public function test_get_ticket_detail_with_nonexistent_id_does_not_500()
    {
        // Error mode: mock returns 422 → controller wraps in error_response(400). Not 500.
        evoxtest_FreshServiceCurlMock::useErrorMode();

        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->getJson('/api/freshservice/tickets/99999999', $this->apiKey);

        $response->assertStatus(400)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // =========================================================================
    // GET /api/freshservice/tickets/{id}/conversations/
    // FreshServiceController::getTicketConversation
    // =========================================================================

    /** @test */
    public function test_get_ticket_conversations_does_not_500()
    {
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->getJson('/api/freshservice/tickets/88001/conversations/', $this->apiKey);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_get_ticket_conversations_response_is_valid_json()
    {
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->getJson('/api/freshservice/tickets/88001/conversations/', $this->apiKey);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content' => ['conversations']]);

        $conversations = $response->json('content.conversations');
        $this->assertIsArray($conversations);
        $this->assertNotEmpty($conversations);
        $this->assertEquals(55001, $conversations[0]['id']);
    }

    // =========================================================================
    // POST /api/freshservice/tickets/{id}/reply
    // FreshServiceController::sendTicketConversation
    // =========================================================================

    /** @test */
    public function test_ticket_reply_with_empty_body_returns_error_response_not_500()
    {
        // Error mode: mock returns 422 → controller returns error_response(400).
        evoxtest_FreshServiceCurlMock::useErrorMode();

        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->postJson('/api/freshservice/tickets/88001/reply', [
                'id'   => 88001,
                'body' => '',
            ], $this->apiKey);

        $response->assertStatus(400)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function test_ticket_reply_with_body_does_not_500()
    {
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->postJson('/api/freshservice/tickets/88001/reply', [
                'id'           => 88001,
                'body'         => 'E2E automated test reply — mock, no real FS call.',
                'requester_id' => 10001,
            ], $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        $response->assertStatus(200);
    }

    /** @test */
    public function test_ticket_reply_response_is_valid_json()
    {
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->postJson('/api/freshservice/tickets/88001/reply', [
                'id'   => 88001,
                'body' => 'E2E automated test reply.',
            ], $this->apiKey);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content' => ['conversation']]);

        $this->assertEquals(55001, $response->json('content.conversation.id'));
    }

    // =========================================================================
    // POST /api/freshservice/tickets/attachments/
    // FreshServiceController::saveAttachment
    // =========================================================================

    /** @test */
    public function test_post_attachment_without_file_returns_error_not_500()
    {
        // No 'attachment' key → hasFile('attachment') false → error_response(400) before Curl.
        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->postJson('/api/freshservice/tickets/attachments/', [], $this->apiKey);

        $response->assertStatus(400)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function test_post_attachment_response_is_valid_json()
    {
        // Fake txt file — 'txt' is in the allowed mimes list (mimes:txt,csv,...).
        $file = UploadedFile::fake()->create('evox-e2e-test.txt', 5, 'text/plain');

        $response = $this->withoutMiddleware()
            ->actingAs($this->user, 'api')
            ->call(
                'POST',
                '/api/freshservice/tickets/attachments/',
                ['workspace_id' => 1],
                [],
                ['attachment' => $file],
                ['HTTP_X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')]
            );

        // Mock returns success → success_response(200) with attachment object.
        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }
}
