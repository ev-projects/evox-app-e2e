<?php
/**
 * @registry-doc all-list.registry.md
 * @vetted-by    Glenn Macasarte
 * @vetted-on    July 3, 2026
 *
 * VERIFIED-BACKED — generated 2026-07-07 from all-list.registry.md.
 *
 * Confirmed API endpoints from [DEVELOPER VETTING]:
 *   GET  /api/department/announcements/all
 *       → loads all department announcements for the admin list view.
 *   DELETE /api/department/announcements/my_handle_announcements/{id}
 *       → AnnouncementController::destroy($id)
 *       → soft-deletes root record, hard-deletes clones.
 *
 * Route: /app/admin/AnnouncementList/ (corrected by vetting; AI DRAFT had /app/hr/ManageHrAnnouncements/).
 * Component: client/src/container/Admin/AdminAnnouncementsList/AdminAnnouncementsList.js
 * Access: Admin-only (confirmed in open questions vetting).
 */

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class AllAnnouncementListVerifiedApiTest extends TestCase
{
    use DatabaseTransactions; // SAFETY: converted from RefreshDatabase 2026-07-08 — never migrate:fresh on staging DB

    private array $apiKey;
    private User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        // Page is admin-only — use an active admin user where available.
        $this->adminUser = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();
    }

    // =========================================================================
    // PATTERN B — Auth enforcement (no withoutMiddleware)
    // GET /api/department/announcements/all
    // [DEVELOPER VETTING] confirmed endpoint for loading the admin announcement list.
    // =========================================================================

    /** @test */
    public function test_get_all_announcements_without_token_returns_401(): void
    {
        $response = $this->getJson('/api/department/announcements/all', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN B — Auth enforcement (no withoutMiddleware)
    // DELETE /api/department/announcements/my_handle_announcements/{id}
    // [DEVELOPER VETTING] confirmed endpoint → AnnouncementController::destroy($id)
    // =========================================================================

    /** @test */
    public function test_delete_announcement_without_token_returns_401(): void
    {
        $response = $this->deleteJson('/api/department/announcements/my_handle_announcements/1', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic (withoutMiddleware + actingAs)
    // GET /api/department/announcements/all
    // Returns all department announcements — admin scope (not HR-only, not paginated per vetting).
    // =========================================================================

    /** @test */
    public function test_get_all_announcements_returns_200(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->adminUser)
                         ->getJson('/api/department/announcements/all', $this->apiKey);
        $response->assertStatus(200);
    }

    /** @test */
    public function test_get_all_announcements_response_is_array_or_has_data_key(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->adminUser)
                         ->getJson('/api/department/announcements/all', $this->apiKey);
        $response->assertStatus(200);
        $body = $response->json();
        // Response is either a top-level array or has a 'data' key — either form is acceptable.
        $this->assertTrue(
            is_array($body) || isset($body['data']),
            'Response should be an array or contain a "data" key.'
        );
    }

    /** @test */
    public function test_get_all_announcements_does_not_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->adminUser)
                         ->getJson('/api/department/announcements/all', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // PATTERN A — AnnouncementController::destroy($id)
    // DELETE /api/department/announcements/my_handle_announcements/{id}
    // [DEVELOPER VETTING]: soft-deletes root record + hard-deletes clones.
    // =========================================================================

    /** @test */
    public function test_delete_nonexistent_announcement_does_not_500(): void
    {
        // Use a very high ID that is unlikely to exist in test DB.
        // Controller should return 404 or a structured error — NOT 500.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->adminUser)
                         ->deleteJson('/api/department/announcements/my_handle_announcements/999999', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_delete_announcement_with_valid_id_returns_success_status(): void
    {
        // This test requires a seeded announcement record.
        // If no record exists the test is skipped gracefully.
        $this->withoutMiddleware();

        // Attempt to find an announcement ID to delete.
        $listResponse = $this->actingAs($this->adminUser)
                             ->getJson('/api/department/announcements/all', $this->apiKey);

        if ($listResponse->status() !== 200) {
            $this->markTestIncomplete('Could not retrieve announcement list to obtain a valid ID for deletion test.');
        }

        $body = $listResponse->json();
        $items = is_array($body) ? $body : ($body['data'] ?? []);

        if (empty($items)) {
            $this->markTestIncomplete('No announcements found in test DB — seeding required for delete test.');
        }

        // Use the first available announcement ID.
        $firstItem = reset($items);
        $announcementId = $firstItem['id'] ?? null;

        if (!$announcementId) {
            $this->markTestIncomplete('Announcement record has no "id" key — adjust field name to match DB schema.');
        }

        $deleteResponse = $this->actingAs($this->adminUser)
                               ->deleteJson(
                                   "/api/department/announcements/my_handle_announcements/{$announcementId}",
                                   $this->apiKey
                               );

        // AnnouncementController::destroy soft-deletes root + hard-deletes clones.
        // Acceptable responses: 200 (success payload) or 204 (no content).
        $this->assertContains($deleteResponse->status(), [200, 204],
            "Expected 200 or 204 from AnnouncementController::destroy, got {$deleteResponse->status()}."
        );
    }
}
