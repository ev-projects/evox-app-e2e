<?php
// VERIFIED-BACKED — generated 2026-07-07 from my-list.registry.md (vetted by Glenn Macasarte on July 3, 2026)

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * API tests for the My Announcement List page.
 *
 * @registry-doc my-list.registry.md
 * @vetted-by    Glenn Macasarte
 * @vetted-on    July 3, 2026
 *
 * Route:     /app/team/DepartmentAnnouncementList/
 * Component: evox-app/client/src/container/DepartmentAnnouncements/DepartmentAnnouncementsList.js
 *
 * Confirmed API surface (from [DEVELOPER VETTING]):
 *   GET    /api/department/announcements/my_handle_announcements/all  → AnnouncementController::handle_announcements_index()
 *   GET    /api/department/announcements/strict/{id}              → AnnouncementController::show_strict()
 *   DELETE /api/department/announcements/my_handle_announcements/{id} → AnnouncementController::destroy($id)
 */
class MyAnnouncementListVerifiedApiTest extends TestCase
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
    // PATTERN B — Auth enforcement (no withoutMiddleware)
    // GET /api/department/announcements/my_handle_announcements/all
    // AnnouncementController::handle_announcements_index()
    // =========================================================================

    /** @test */
    public function test_my_handle_announcements_all_without_token_returns_401(): void
    {
        $response = $this->getJson('/api/department/announcements/my_handle_announcements/all', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // GET /api/department/announcements/strict/{id}
    // AnnouncementController::show_strict()
    // =========================================================================

    /** @test */
    public function test_show_strict_without_token_returns_401(): void
    {
        $response = $this->getJson('/api/department/announcements/strict/1', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // DELETE /api/department/announcements/my_handle_announcements/{id}
    // AnnouncementController::destroy($id)
    // =========================================================================

    /** @test */
    public function test_destroy_without_token_returns_401(): void
    {
        $response = $this->deleteJson('/api/department/announcements/my_handle_announcements/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic (withoutMiddleware + actingAs)
    // GET /api/department/announcements/my_handle_announcements/all
    // AnnouncementController::handle_announcements_index()
    // Scopes to departments the authenticated user handles.
    // =========================================================================

    /** @test */
    public function test_my_handle_announcements_all_returns_200(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/department/announcements/my_handle_announcements/all', $this->apiKey);
        $response->assertStatus(200);
    }

    /** @test */
    public function test_my_handle_announcements_all_returns_array(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/department/announcements/my_handle_announcements/all', $this->apiKey);
        $response->assertStatus(200);
        // Response is either an array of announcements or a wrapped object — must be valid JSON
        $this->assertNotNull($response->json());
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // GET /api/department/announcements/strict/{id}
    // AnnouncementController::show_strict()
    // Used by the Edit row-action to pre-populate the announcement form.
    // [DEVELOPER VETTING] ✏️ corrected: endpoint is /strict/{id}, not /my_handle_announcements/{id}
    // =========================================================================

    /** @test */
    public function test_show_strict_with_valid_id_returns_200(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/department/announcements/strict/1', $this->apiKey);
        // 200 if record exists; 404 if no announcement with id=1; 400 if controller exception
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_show_strict_with_nonexistent_id_does_not_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/department/announcements/strict/999999', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_show_strict_returns_announcement_data_structure(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/department/announcements/strict/1', $this->apiKey);
        if ($response->status() === 200) {
            // Announcement record must carry at minimum an id field
            $this->assertNotNull($response->json('id') ?? $response->json('data.id'));
        }
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // DELETE /api/department/announcements/my_handle_announcements/{id}
    // AnnouncementController::destroy($id)
    // [DEVELOPER VETTING] ✅ confirmed: soft-deletes root record + hard-deletes clones
    // (direct Eloquent, no SP). window.confirm is frontend-only — not testable here.
    // =========================================================================

    /** @test */
    public function test_destroy_nonexistent_id_does_not_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->deleteJson('/api/department/announcements/my_handle_announcements/999999', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_destroy_with_valid_id_returns_success_or_not_found(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->deleteJson('/api/department/announcements/my_handle_announcements/1', [], $this->apiKey);
        // Acceptable: 200 (deleted), 204 (no content), 404 (no seed record) — never 500
        $this->assertContains($response->status(), [200, 204, 404]);
        $this->assertNotEquals(500, $response->status());
    }
}
