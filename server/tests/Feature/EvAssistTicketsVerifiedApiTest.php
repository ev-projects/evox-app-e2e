<?php
// VERIFIED-BACKED — generated 2026-07-07 from my-tickets.registry.md (vetted by Glenn Macasarte on July 2, 2026)

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * @registry-doc my-tickets.registry.md
 * @vetted-by    Glenn Macasarte
 * @vetted-on    July 2, 2026
 *
 * Covers confirmed API endpoints from [DEVELOPER VETTING] blocks:
 *
 *   GET  /api/freshservice/tickets/my-tickets         FreshServiceController::getMyTickets
 *   GET  /api/freshservice/tickets/{id}               FreshServiceController::getTicket
 *   GET  /api/freshservice/tickets/{id}/conversations/ FreshServiceController::getTicketConversation
 *   POST /api/freshservice/tickets/attachments/        FreshServiceController::saveAttachment
 *   POST /api/freshservice/tickets/{id}/reply          FreshServiceController::sendTicketConversation
 */
class EvAssistTicketsVerifiedApiTest extends TestCase
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
    // Pattern A: withoutMiddleware + actingAs
    //
    // NOTE: getMyTickets proxies to the FreshService SaaS API. In the test
    // environment the FS API is not reachable, so we assert only that the
    // controller does not 500 — it should return a handled error response.
    // =========================================================================

    /** @test */
    public function test_get_my_tickets_without_workspace_id_does_not_500()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    /** @test */
    public function test_get_my_tickets_with_workspace_id_does_not_500()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    /** @test */
    public function test_get_my_tickets_with_open_status_does_not_500()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    /** @test */
    public function test_get_my_tickets_response_is_valid_json()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    /** @test */
    public function test_get_my_tickets_with_high_page_does_not_500()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    // =========================================================================
    // GET /api/freshservice/tickets/{id}
    // FreshServiceController::getTicket
    // Fires on mount of TicketDetailsPage (parallel with getTicketConversation)
    // =========================================================================

    /** @test */
    public function test_get_ticket_detail_with_valid_id_does_not_500()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    /** @test */
    public function test_get_ticket_detail_response_is_valid_json()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    /** @test */
    public function test_get_ticket_detail_with_nonexistent_id_does_not_500()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    // =========================================================================
    // GET /api/freshservice/tickets/{id}/conversations/
    // FreshServiceController::getTicketConversation
    // Fires on mount of TicketDetailsPage (parallel with getTicket)
    // =========================================================================

    /** @test */
    public function test_get_ticket_conversations_does_not_500()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    /** @test */
    public function test_get_ticket_conversations_response_is_valid_json()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    // =========================================================================
    // POST /api/freshservice/tickets/{id}/reply
    // FreshServiceController::sendTicketConversation
    //
    // NOTE: Backend renames requester_id to user_id in the Curl field (confirmed).
    // PHPUnit test from coverage summary: test_ticket_reply_returns_error_response_not_500
    // =========================================================================

    /** @test */
    public function test_ticket_reply_with_empty_body_returns_error_response_not_500()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    /** @test */
    public function test_ticket_reply_with_body_does_not_500()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    /** @test */
    public function test_ticket_reply_response_is_valid_json()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    // =========================================================================
    // POST /api/freshservice/tickets/attachments/
    // FreshServiceController::saveAttachment
    //
    // Fires immediately on file selection (onChange) with ticket_id + workspace_id.
    // Same upload flow as Create Ticket page.
    // NOTE: Known behavior — after a successful reply submit, attachment state is
    // not properly cleared (documented in freshservice.md Known Bugs section).
    // =========================================================================

    /** @test */
    public function test_post_attachment_without_file_returns_error_not_500()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    /** @test */
    public function test_post_attachment_response_is_valid_json()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }
}
