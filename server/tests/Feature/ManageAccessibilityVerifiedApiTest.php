<?php
// VERIFIED-BACKED — generated 2026-07-07 from manage-accessibility.registry.md (vetted by Gobi Singaravel on 2026-07-02)

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * @registry-doc manage-accessibility.registry.md
 * @vetted-by Gobi Singaravel
 * @vetted-on 2026-07-02
 *
 * Page: Manage Policy Accessibility (/app/policiesdocumentlist)
 * Component: evox-app/client/src/components/PoliciesDocument/UploadedDocumentList.js
 *
 * Confirmed API surface (from [DEVELOPER VETTING]):
 *   GET  /api/showlist?GlobalType=1&selectedDepartments=All
 *        → PoliciesDocumentController::showlist()
 *        → call_sp('EV_SP_Policies_Document', [..., type=5])
 *        → returns documents created by the logged-in user
 *
 *   PUT  /api/updatestatus/{id}/1
 *        → PoliciesDocumentController::updatestatus()
 *        → call_sp('EV_SP_Document_Status_Update', [id, 1, userId])   (activate)
 *
 *   PUT  /api/updatestatus/{id}/0
 *        → PoliciesDocumentController::updatestatus()
 *        → call_sp('EV_SP_Document_Status_Update', [id, 0, userId])   (deactivate)
 *
 * Toggle is immediate — no confirmation dialog (confirmed on staging).
 */
class ManageAccessibilityVerifiedApiTest extends TestCase
{
    use DatabaseTransactions; // SAFETY: converted from RefreshDatabase 2026-07-08 — never migrate:fresh on staging DB

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->user   = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();
    }

    // =========================================================================
    // PATTERN B — Auth enforcement (no withoutMiddleware)
    // GET /api/showlist
    // =========================================================================

    /** @test */
    public function test_showlist_without_token_returns_401(): void
    {
        $response = $this->getJson('/api/showlist?GlobalType=1&selectedDepartments=All', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // PUT /api/updatestatus/{id}/{status}
    // =========================================================================

    /** @test */
    public function test_updatestatus_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/updatestatus/1/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic (withoutMiddleware + actingAs)
    // GET /api/showlist?GlobalType=1&selectedDepartments=All
    // Confirmed: PoliciesDocumentController::showlist()
    // Confirmed: returns documents created by logged-in user (type=5 SP call)
    // =========================================================================

    /** @test */
    public function test_showlist_returns_200(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/showlist?GlobalType=1&selectedDepartments=All',
            $this->apiKey
        );
        $response->assertStatus(200);
    }

    /** @test */
    public function test_showlist_response_is_json(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/showlist?GlobalType=1&selectedDepartments=All',
            $this->apiKey
        );
        $response->assertStatus(200);
        $this->assertNotNull($response->json());
    }

    /** @test */
    public function test_showlist_does_not_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/showlist?GlobalType=1&selectedDepartments=All',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_showlist_with_no_params_does_not_500(): void
    {
        // Guard: endpoint should degrade gracefully if query params are absent.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/showlist', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // PATTERN A — Activate document
    // PUT /api/updatestatus/{id}/1
    // Confirmed: PoliciesDocumentController::updatestatus()
    // Confirmed: calls EV_SP_Document_Status_Update([id, 1, userId])
    // =========================================================================

    /** @test */
    public function test_updatestatus_activate_with_valid_id_does_not_500(): void
    {
        $this->withoutMiddleware();
        // Use ID 1 as a smoke-test; in a seeded environment a real document would exist.
        $response = $this->actingAs($this->user)->putJson('/api/updatestatus/1/1', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_updatestatus_activate_returns_json(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->putJson('/api/updatestatus/1/1', [], $this->apiKey);
        // Must return JSON (not an HTML error page or dump-and-die).
        $this->assertNotNull($response->json());
    }

    // =========================================================================
    // PATTERN A — Deactivate document
    // PUT /api/updatestatus/{id}/0
    // Confirmed: PoliciesDocumentController::updatestatus()
    // Confirmed: calls EV_SP_Document_Status_Update([id, 0, userId])
    // =========================================================================

    /** @test */
    public function test_updatestatus_deactivate_with_valid_id_does_not_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->putJson('/api/updatestatus/1/0', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_updatestatus_deactivate_returns_json(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->putJson('/api/updatestatus/1/0', [], $this->apiKey);
        $this->assertNotNull($response->json());
    }

    // =========================================================================
    // Edge cases — nonexistent / invalid IDs
    // =========================================================================

    /** @test */
    public function test_updatestatus_with_nonexistent_id_does_not_500(): void
    {
        // A record ID of 999999 should not exist; the SP/controller must handle gracefully.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->putJson('/api/updatestatus/999999/1', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }
}
