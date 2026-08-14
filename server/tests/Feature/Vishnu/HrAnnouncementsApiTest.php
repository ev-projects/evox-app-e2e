<?php
/**
 * HrAnnouncementsApiTest
 *
 * HR ANNOUNCEMENTS MODULE — DELETED 2026-08-13 (user approval).
 * app/Modules/Hr/ directory removed entirely.
 *
 * All former HrController routes are now unregistered.
 * Laravel returns 404 {"message":"Not Found"} for all of them.
 * Middleware never fires (no route → no middleware chain),
 * so auth-gate checks also expect 404, not 401.
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class HrAnnouncementsApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->apiKey = [
            'X-Authorization' => env(
                'APP_API_KEY',
                'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z'
            ),
        ];

        $this->user = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();
    }

    // ─── Former Pattern B — routes gone, middleware never fires → 404 ─────────

    /** @test */
    public function test_hr_announcements_all_without_token_returns_404()
    {
        $response = $this->getJson('/api/hr/announcements/all', $this->apiKey);
        $response->assertStatus(404);
    }

    /** @test */
    public function test_hr_announcements_create_without_token_returns_404()
    {
        $response = $this->postJson('/api/hr/announcements', [], $this->apiKey);
        $response->assertStatus(404);
    }

    /** @test */
    public function test_hr_announcements_delete_without_token_returns_404()
    {
        $response = $this->deleteJson('/api/hr/announcements/1', [], $this->apiKey);
        $response->assertStatus(404);
    }

    // ─── Former Pattern A — module deleted, all endpoints return 404 ──────────

    /** @test */
    public function test_hr_announcements_all_returns_404_module_deleted()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/hr/announcements/all', $this->apiKey);
        $response->assertStatus(404);
    }

    /** @test */
    public function test_hr_announcements_get_single_returns_404_module_deleted()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/hr/announcements/999999', $this->apiKey);
        $response->assertStatus(404);
    }

    /** @test */
    public function test_hr_announcements_create_returns_404_module_deleted()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/hr/announcements', [], $this->apiKey);
        $response->assertStatus(404);
    }

    /** @test */
    public function test_hr_announcements_delete_returns_404_module_deleted()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->deleteJson('/api/hr/announcements/999999', [], $this->apiKey);
        $response->assertStatus(404);
    }
}
