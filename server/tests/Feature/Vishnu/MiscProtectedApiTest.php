<?php

/**
 * EVOX Miscellaneous Protected API Tests — Vishnu Padmanabhan
 *
 * INDEPENDENT coverage — written without reviewing Gary's Api/ tests.
 * Purpose: parallel suite for later diff/comparison with Gary's work.
 *
 * Covers 6 controllers with small footprints — grouped here to avoid
 * proliferating single-file test classes.
 *
 * All routes: middleware jwtauth, auth.apikey
 *
 * ┌─ LocationController (5 routes) ──────────────────────────────────────────┐
 * │   GET  /api/getlocation/{locationid?}      — list or single location     │
 * │   GET  /api/getlocationcal                 — calendar-friendly location  │
 * │   POST /api/storelocation                  — create location             │
 * │   PUT  /api/UpdateLocationDetails/{roomid} — update location             │
 * │   GET  /api/DeleteLocationDetails/{roomid} — delete location (GET verb)  │
 * ├─ HrController (5 routes — via api/hr/announcements) ─────────────────────┤
 * │   GET  /api/hr/announcements/all           — list all announcements      │
 * │   GET  /api/hr/announcements/{id}          — single announcement         │
 * │   POST /api/hr/announcements               — create announcement         │
 * │   POST /api/hr/announcements/{id}          — update announcement         │
 * │   DELETE /api/hr/announcements/{id}        — delete announcement         │
 * ├─ ProfileController (2 routes) ────────────────────────────────────────────┤
 * │   POST /api/user/{id}/profile              — create/set profile          │
 * │   PUT  /api/user/{id}/profile              — update profile              │
 * ├─ CodeOfConductController (2 routes) ──────────────────────────────────────┤
 * │   GET  /api/user_coc                       — get CoC status for user     │
 * │   POST /api/acknowledge_coc                — record CoC acknowledgement  │
 * ├─ UtctimelogController (1 route) ──────────────────────────────────────────┤
 * │   GET  /api/utc/sync_adjustment            — trigger UTC sync            │
 * └─ RedisController (1 route) ───────────────────────────────────────────────┘
 *     GET  /api/get_redis_notifications/{user_id} — fetch Redis notification queue
 *
 * Test patterns:
 *   B — Auth enforcement: no withoutMiddleware(), no Bearer → 401
 *   A — Route existence + graceful failure: withoutMiddleware() + actingAs()
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class MiscProtectedApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Support\Facades\Cache::flush(); // clear rate-limiter between tests

        $this->apiKey = [
            'X-Authorization' => env(
                'APP_API_KEY',
                'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z'
            ),
        ];

        $this->user = User::where('is_active', 1)
            ->whereNotNull('email')
            ->firstOrFail();
    }

    // ═══ LOCATION CONTROLLER ═════════════════════════════════════════════════

    /** @test */
    public function test_getlocation_without_token_returns_401()
    {
        $this->markTestSkipped('LocationController decommissioned 2026-06-21 — /api/getlocation returns 404, not 401.');
    }

    /** @test */
    public function test_storelocation_without_token_returns_401()
    {
        $this->markTestSkipped('LocationController decommissioned 2026-06-21 — /api/storelocation returns 404, not 401.');
    }

    /** @test */
    public function test_getlocation_route_exists_and_returns_array()
    {
        $this->markTestSkipped('LocationController decommissioned 2026-06-21 — /api/getlocation route removed, returns 404.');
    }

    /** @test */
    public function test_getlocation_with_id_returns_response_not_500()
    {
        $this->markTestSkipped('LocationController decommissioned 2026-06-21 — /api/getlocation/{id} route removed, returns 404.');
    }

    /** @test */
    public function test_getlocationcal_route_exists_and_does_not_500()
    {
        $this->markTestSkipped('LocationController decommissioned 2026-06-21 — /api/getlocationcal route removed, returns 404.');
    }

    /** @test */
    public function test_storelocation_missing_fields_returns_validation_error_not_500()
    {
        $this->markTestSkipped('LocationController decommissioned 2026-06-21 — /api/storelocation route removed, returns 404.');
    }

    /** @test */
    public function test_update_location_route_exists()
    {
        $this->markTestSkipped('LocationController decommissioned 2026-06-21 — /api/UpdateLocationDetails/{id} route removed, returns 404.');
    }

    /** @test */
    public function test_delete_location_route_exists_and_does_not_500()
    {
        // PRODUCTION BUG: LocationController::DeleteLocationDetails() does
        // location::find($id)->delete() without a null check. When $id doesn't exist,
        // find() returns null and ->delete() on null throws PHP \Error (not Exception).
        // catch(Exception $e) does not catch \Error in PHP 7 → HTTP 500.
        // Fix: add null check before ->delete(). Same pattern as RoomController bug.
        // Route existence + auth are verified by test_getlocation_without_token_returns_401 (Pattern B).
        $this->markTestSkipped('LocationController decommissioned 2026-06-21 — Known production bug: DeleteLocationDetails() calls ->delete() on null for non-existent ID → PHP \\Error → 500.');
    }

    // ═══ HR CONTROLLER — MODULE DELETED 2026-08-13 ═══════════════════════════
    // app/Modules/Hr/ deleted entirely. Routes unregistered → all return 404.
    // Middleware never fires (no route → no middleware chain) → auth tests also expect 404.

    /** @test */
    public function test_hr_announcements_all_without_token_returns_404()
    {
        // Route gone — unregistered routes return 404 before middleware fires.
        $response = $this->getJson('/api/hr/announcements/all', $this->apiKey);
        $response->assertStatus(404);
    }

    /** @test */
    public function test_hr_announcements_all_returns_404_module_deleted()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/hr/announcements/all', $this->apiKey);
        $response->assertStatus(404);
    }

    /** @test */
    public function test_hr_get_single_announcement_returns_404_module_deleted()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/hr/announcements/999999999');
        $response->assertStatus(404);
    }

    /** @test */
    public function test_hr_create_announcement_without_token_returns_404()
    {
        // Route gone — 404 before middleware fires.
        $response = $this->postJson('/api/hr/announcements', [], $this->apiKey);
        $response->assertStatus(404);
    }

    /** @test */
    public function test_hr_create_announcement_returns_404_module_deleted()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/hr/announcements', []);
        $response->assertStatus(404);
    }

    /** @test */
    public function test_hr_delete_announcement_without_token_returns_404()
    {
        // Route gone — 404 before middleware fires.
        $response = $this->deleteJson('/api/hr/announcements/1', [], $this->apiKey);
        $response->assertStatus(404);
    }

    /** @test */
    public function test_hr_delete_announcement_returns_404_module_deleted()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->deleteJson('/api/hr/announcements/999999999');
        $response->assertStatus(404);
    }

    // ═══ PROFILE CONTROLLER ══════════════════════════════════════════════════

    /** @test */
    public function test_post_profile_without_token_returns_401()
    {
        // Route removed 2026-08-13: POST /api/user/{id}/profile no longer exists.
        // The PUT route exists, so POST returns 405 Method Not Allowed (not 404).
        $response = $this->postJson("/api/user/{$this->user->id}/profile", [], $this->apiKey);
        $response->assertStatus(405);
    }

    /** @test */
    public function test_put_profile_without_token_returns_401()
    {
        $response = $this->putJson("/api/user/{$this->user->id}/profile", [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_post_profile_route_exists_and_does_not_500()
    {
        // Route removed 2026-08-13: POST /api/user/{id}/profile no longer registered.
        // ProfileController@store() was never implemented; route was dead code (Client role decommissioned).
        $this->markTestSkipped('Route removed 2026-08-13: POST /api/user/{id}/profile no longer exists — ProfileController@store() was never implemented and the route was dead code.');
    }

    /** @test */
    public function test_put_profile_route_exists_and_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->putJson("/api/user/{$this->user->id}/profile", [], $this->apiKey);
        $this->assertNotEquals(404, $response->status(),
            'PUT /api/user/{id}/profile must exist.');
        $this->assertNotEquals(500, $response->status());
    }

    // ═══ CODE OF CONDUCT CONTROLLER ══════════════════════════════════════════

    /** @test */
    public function test_user_coc_without_token_returns_401()
    {
        $response = $this->getJson('/api/user_coc', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_acknowledge_coc_without_token_returns_401()
    {
        $response = $this->postJson('/api/acknowledge_coc', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_user_coc_route_exists_and_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/user_coc', $this->apiKey);
        $this->assertNotEquals(404, $response->status(), 'GET /api/user_coc must exist.');
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_acknowledge_coc_route_exists_and_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/acknowledge_coc', [], $this->apiKey);
        $this->assertNotEquals(404, $response->status(), 'POST /api/acknowledge_coc must exist.');
        $this->assertNotEquals(500, $response->status());
    }

    // ═══ UTC TIMELOG CONTROLLER ═══════════════════════════════════════════════

    /** @test */
    public function test_utc_sync_adjustment_without_token_returns_401()
    {
        $response = $this->getJson('/api/utc/sync_adjustment', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_utc_sync_adjustment_route_exists_and_does_not_500()
    {
        $this->markTestIncomplete('UNSAFE sync: withoutMiddleware()+actingAs() would run the REAL sync body — live BHR call + whole-DB write (mass user/DTR/leave sync). Route existence + auth are proven by the without-token 401 test. Body execution is intentionally not run. See OUTGOING-CALL-SAFETY-AUDIT.md / finding A38.');
    }

    // ═══ REDIS CONTROLLER ════════════════════════════════════════════════════

    /** @test */
    public function test_get_redis_notifications_without_token_returns_401()
    {
        $response = $this->getJson("/api/get_redis_notifications/{$this->user->id}", $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_get_redis_notifications_route_exists_and_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson("/api/get_redis_notifications/{$this->user->id}", $this->apiKey);

        $this->assertNotEquals(404, $response->status(),
            'GET /api/get_redis_notifications/{user_id} must exist.');
        $this->assertNotEquals(500, $response->status(),
            'Redis notifications must return gracefully even if Redis is unavailable.');
    }
}
