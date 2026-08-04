<?php
// VERIFIED-BACKED — generated 2026-07-07 from coe.registry.md (vetted by Glenn Macasarte on July 2, 2026)

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * @registry-doc coe.registry.md
 * @vetted-by    Glenn Macasarte
 * @vetted-on    July 2, 2026
 *
 * Covers confirmed API actions from [DEVELOPER VETTING]:
 *   GET  /api/request/coe/  → COEController::all  (COEController.php:35)
 *   POST /api/request/coe/  → COEController::create (COEController.php:53)
 */
class CoeVerifiedApiTest extends TestCase
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
    // GET /api/request/coe/ → COEController::all (COEController.php:35)
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
    // POST /api/request/coe/ → COEController::create (COEController.php:53)
    // =========================================================================

    /** @test */
    public function test_post_coe_create_without_token_returns_401(): void
    {
        $response = $this->postJson('/api/request/coe/', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // GET /api/request/coe/ → COEController::all (COEController.php:35)
    // Returns the authenticated employee's COE history ordered by created_at ASC
    // KNOWN BUG BUG-003: success message contains typo trans('Sucess')
    // =========================================================================

    /** @test */
    public function test_get_coe_history_authenticated_returns_200(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/request/coe/', $this->apiKey);
        $response->assertStatus(200);
    }

    /** @test */
    public function test_get_coe_history_returns_array_data(): void
    {
        // COEController::all queries: COE::where('user_id', auth()->user()->id)
        //                                   ->orderBy('created_at', 'asc')->get()
        // success_response wraps result in 'content' key (not 'data').
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/request/coe/', $this->apiKey);
        $response->assertStatus(200);
        $this->assertIsArray($response->json('content'));
    }

    /** @test */
    public function test_get_coe_history_does_not_500(): void
    {
        // KNOWN BUG BUG-003: COEController::all returns trans('Sucess') (misspelled key).
        // The response still 200s — we guard that the response is not a 500.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/request/coe/', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // PATTERN A — Validation: POST /api/request/coe/ with missing required fields
    // COEController::create (COEController.php:53) — validated by COERequest
    // Required: purpose_index
    // KNOWN BUG BUG-002: show_compensation not in COERequest rules
    // =========================================================================

    /** @test */
    public function test_post_coe_create_missing_purpose_index_returns_422(): void
    {
        // purpose_index is required per COERequest validation rules
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/coe/',
            [
                'show_compensation' => '0',
            ],
            $this->apiKey
        );
        // Must reject with validation error — not proceed to BambooHR call
        $response->assertStatus(422);
    }

    /** @test */
    public function test_post_coe_create_with_empty_body_returns_422(): void
    {
        // Both purpose_index and show_compensation are required on the form.
        // KNOWN BUG BUG-002: show_compensation not backend-validated — only purpose_index
        // is guaranteed to be in COERequest rules. Missing purpose_index must 422.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/coe/',
            [],
            $this->apiKey
        );
        $response->assertStatus(422);
    }

    /** @test */
    public function test_post_coe_create_known_bug_missing_show_compensation_not_validated_server_side(): void
    {
        // KNOWN BUG BUG-002 (Low): show_compensation is required by Yup on the frontend
        // but is NOT in COERequest backend validation rules. Omitting it should ideally 422,
        // but the current implementation may silently proceed.
        // This test is marked as skipped — it documents the missing validation, not current behavior.
        $this->markTestIncomplete(
            'Known bug BUG-002: show_compensation is Yup-required on the frontend but absent ' .
            'from COERequest backend validation rules. A POST without it may not 422. ' .
            'Fix: add show_compensation to COERequest::rules().'
        );
    }

    /** @test */
    public function test_post_coe_create_known_bug_pdf_streaming_prevents_json_error_parsing(): void
    {
        // KNOWN BUG BUG-010 (Medium): COEController::create streams the response as application/pdf
        // (arraybuffer). If BambooHR is unreachable or any downstream step fails after the
        // controller starts, the catch block in the Redux action receives binary data, not JSON.
        // Formatter.alert_error() cannot parse it — the error is swallowed or shown as garbage.
        // This cannot be reproduced without mocking the BambooHR HTTP client.
        $this->markTestIncomplete(
            'Known bug BUG-010: PDF arraybuffer response type prevents JSON error body parsing ' .
            'in the Redux catch block. Requires BambooHR HTTP client mock to reproduce. ' .
            'See COEController::create() and the Redux addCOE action.'
        );
    }

    /** @test */
    public function test_post_coe_create_known_bug_sp_generate_sequence_no_transaction(): void
    {
        // KNOWN BUG BUG-005 (Medium): EV_SP_COE_Generate_Sequence is called without a
        // wrapping DB transaction. Concurrent submissions from the same employee (or concurrent
        // employees at the same location) may produce duplicate sequence numbers.
        $this->markTestIncomplete(
            'Known bug BUG-005: EV_SP_COE_Generate_Sequence has no transaction wrapping. ' .
            'Concurrent submissions may produce duplicate sequence numbers. ' .
            'Requires a parallel-request integration test — not safely reproducible in unit tests.'
        );
    }

    /** @test */
    public function test_post_coe_create_known_bug_sp_get_template_called_twice(): void
    {
        // KNOWN BUG BUG-004 (Low): COEController::create calls EV_SP_COE_Get_Template twice.
        // The first call is a debug-logging artifact — its result is discarded. Only the second
        // call's result is used for PDF rendering. No functional impact but wastes one DB round-trip.
        $this->markTestIncomplete(
            'Known bug BUG-004: EV_SP_COE_Get_Template is called twice in COEController::create. ' .
            'First call result is discarded. Requires SP call counting via DB query log or mock.'
        );
    }
}
