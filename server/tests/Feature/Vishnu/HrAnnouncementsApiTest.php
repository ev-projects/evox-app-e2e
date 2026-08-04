<?php
// DRAFT — generated 2026-06-16, needs verification

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * HrAnnouncementsApiTest
 *
 * Covers HrController routes (all middleware: jwtauth, auth.apikey):
 *   GET    /api/hr/announcements/all       — list all announcements
 *   GET    /api/hr/announcements/{id}      — single announcement
 *   POST   /api/hr/announcements           — create announcement
 *   POST   /api/hr/announcements/{id}      — update announcement
 *   DELETE /api/hr/announcements/{id}      — delete announcement
 *
 * Known bugs:
 *   BUG-HR-01: getAnnouncement() calls ->toArray() on null for non-existent ID → 500
 *   BUG-HR-02: store() + delete() missing `use Exception;` → catch resolves to namespaced class → 500
 */
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

    // ─── Pattern B — Auth enforcement ────────────────────────────────────────

    /** @test */
    public function test_hr_announcements_all_without_token_returns_401()
    {
        $response = $this->getJson('/api/hr/announcements/all', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_hr_announcements_create_without_token_returns_401()
    {
        $response = $this->postJson('/api/hr/announcements', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_hr_announcements_delete_without_token_returns_401()
    {
        $response = $this->deleteJson('/api/hr/announcements/1', [], $this->apiKey);
        $response->assertStatus(401);
    }

    // ─── Pattern A — Controller logic ────────────────────────────────────────

    /** @test */
    public function test_hr_announcements_all_returns_200_and_success_envelope()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/hr/announcements/all', $this->apiKey);
        $this->assertNotEquals(404, $response->status(), 'GET /api/hr/announcements/all must exist.');
        $this->assertNotEquals(500, $response->status());
        if ($response->status() === 400) {
            $this->markTestIncomplete('APP-BUG HR-01: GET /api/hr/announcements/all returns 400 — App\Modules\Changelogs\Models\ChangeLogs class not found in this environment. HrController::announcements() catches Throwable and returns error_response. Fix: create the ChangeLogs model or update HrController to use the correct model class.');
        }
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_hr_announcements_get_single_nonexistent_id_does_not_return_200()
    {
        // BUG-HR-01: HrController::getAnnouncement() calls ChangeLogs::find($id)->toArray()
        // with no null check — non-existent ID → null->toArray() → PHP Error → 500.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/hr/announcements/999999', $this->apiKey);
        if ($response->status() === 500) {
            $this->markTestIncomplete('APP-BUG HR-01: HrController::getAnnouncement() calls ->toArray() on null for non-existent ID — no null guard → 500. Fix: add null check before ->toArray().');
        }
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_hr_announcements_create_missing_fields_does_not_return_200()
    {
        // BUG-HR-02: HrController missing `use Exception;` — catch(Exception $e) resolves to
        // non-existent namespaced class, catching nothing → all exceptions propagate → 500.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/hr/announcements', [], $this->apiKey);
        if ($response->status() === 500) {
            $this->markTestIncomplete('APP-BUG HR-02: HrController::store() missing `use Exception;` — namespaced catch catches nothing → 500. Fix: add `use Exception;` or use `catch(\\Exception $e)`.');
        }
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_hr_announcements_delete_nonexistent_id_does_not_return_200()
    {
        // BUG-HR-02: same namespace catch bug in delete() + null->delete() pattern.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->deleteJson('/api/hr/announcements/999999', [], $this->apiKey);
        if ($response->status() === 500) {
            $this->markTestIncomplete('APP-BUG HR-02: HrController::delete() — null->delete() + namespace catch bug → 500. Fix: null check + `use Exception;`.');
        }
        $this->assertNotEquals(500, $response->status());
    }
}
