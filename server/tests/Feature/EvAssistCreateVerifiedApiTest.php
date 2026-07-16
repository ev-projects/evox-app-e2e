<?php
// VERIFIED-BACKED — generated 2026-07-07 from create-ticket.registry.md (vetted by Glenn Macasarte on July 2, 2026)

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

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
 * [CODE REVIEW 2026-07-07] Corrected createTicket endpoint from /api/freshservice/tickets
 * to /api/freshservice/tickets/ (with trailing slash). Route::post('/') under prefix 'tickets'
 * generates /api/freshservice/tickets/ — server/routes/api.php line 96-98.
 */
class EvAssistCreateVerifiedApiTest extends TestCase
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
    // SP: EV_FS_Get_Category(1, null, null) + N+1 calls per workspace/category
    // =========================================================================

    /** @test */
    public function test_get_workspaces_returns_200_with_data()
    {
        $this->markTestSkipped('UNSAFE sync: withoutMiddleware()+actingAs() would run the REAL sync body — live BHR call + whole-DB write (mass user/DTR/leave sync). Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    /** @test */
    public function test_get_workspaces_response_is_array_or_object()
    {
        $this->markTestSkipped('UNSAFE sync: withoutMiddleware()+actingAs() would run the REAL sync body — live BHR call + whole-DB write (mass user/DTR/leave sync). Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
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
    // Query: User::where('email', 'like', "%keyword%")->where('is_active', 1)->get()
    // Note: returns raw JSON array (not standard success_response envelope — documented inconsistency)
    // =========================================================================

    /** @test */
    public function test_get_user_suggestions_with_keyword_returns_200()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    /** @test */
    public function test_get_user_suggestions_returns_array()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    /** @test */
    public function test_get_user_suggestions_with_empty_keyword_does_not_500()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    /** @test */
    public function test_get_user_suggestions_with_single_char_keyword_does_not_500()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // POST /api/freshservice/tickets//attachments/
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
    // POST /api/freshservice/tickets//attachments/ → FreshServiceController::saveAttachment
    // Validates MIME type (max 5120 KB), base64-encodes, proxies to FS API
    // =========================================================================

    /** @test */
    public function test_post_attachment_without_file_returns_validation_error()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
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
    // Curl POST to FS SaaS API; on success: EV_SP_FS_Ticket_Count(ticket_id, requester_id, created_at, workspace_id, user_id)
    // =========================================================================

    /** @test */
    public function test_post_create_ticket_with_missing_required_fields_returns_validation_error()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    /** @test */
    public function test_post_create_ticket_subject_too_short_returns_error()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    /** @test */
    public function test_post_create_ticket_description_too_short_returns_error()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    /** @test */
    public function test_post_create_ticket_invalid_priority_returns_error()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    /** @test */
    public function test_post_create_ticket_subject_at_255_char_limit_does_not_500()
    {
        $this->markTestSkipped('UNSAFE outgoing/sync: withoutMiddleware()+actingAs() would run the REAL body — live BHR/Freshservice external call and/or whole-DB write. Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }
}
