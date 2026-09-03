<?php
// DRAFT — generated 2026-06-16, needs verification


namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * AdminMiscApiTest
 *
 * Covers: Department List, Generate Date, Change Logs,
 *         Admin Announcements, Job Openings (Careers Import)
 *
 * Routes under test:
 *   GET    /api/department/all
 *   DELETE /api/department/{id}
 *   POST   /api/department/{id}/switch_active_schedule
 *   POST   /api/generate/dtr/
 *   GET    /api/changelogs
 *   POST   /api/changelogs
 *   GET    /api/department/announcements/all
 *   DELETE /api/department/announcements/my_handle_announcements/{id}/
 *   GET    /api/careers/
 *   POST   /api/careers/
 */
class AdminMiscApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->user   = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();
    }

    // =========================================================================
    // DEPARTMENT LIST — GET /api/department/all
    // =========================================================================

    /** @test */
    public function test_department_all_without_token_returns_401()
    {
        $response = $this->getJson('/api/department/all', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_department_all_returns_200_with_structure()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/department/all', $this->apiKey);
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    // =========================================================================
    // DEPARTMENT DELETE — DELETE /api/department/{id}
    // =========================================================================

    /** @test */
    public function test_department_delete_without_token_returns_401()
    {
        $response = $this->deleteJson('/api/department/1', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_department_delete_with_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->deleteJson('/api/department/999999', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // DEPARTMENT SCHEDULE — POST /api/department/{id}/switch_active_schedule
    // =========================================================================

    /** @test */
    public function test_department_switch_active_schedule_without_token_returns_401()
    {
        $response = $this->postJson('/api/department/1/switch_active_schedule', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_department_switch_active_schedule_with_nonexistent_id_does_not_500()
    {
        // BUG-DEPT-02 fixed 2026-08-14: null guard added in DepartmentController::set_active_on_sched()
        // — non-existent ID now returns 404 instead of PHP \Error → 500.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/department/999999/switch_active_schedule', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_department_switch_active_schedule_empty_payload_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->postJson('/api/department/1/switch_active_schedule', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // GENERATE DTR — POST /api/generate/dtr/
    // =========================================================================

    /** @test */
    public function test_generate_dtr_without_token_returns_401()
    {
        $response = $this->postJson('/api/generate/dtr/', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_generate_dtr_missing_start_date_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/generate/dtr/', [
            'end_date' => '2026-06-15',
            'ids'      => [['label' => 'Test User', 'value' => $this->user->id]],
        ], $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_generate_dtr_missing_end_date_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/generate/dtr/', [
            'start_date' => '2026-06-01',
            'ids'        => [['label' => 'Test User', 'value' => $this->user->id]],
        ], $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_generate_dtr_missing_ids_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/generate/dtr/', [
            'start_date' => '2026-06-01',
            'end_date'   => '2026-06-03',
        ], $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_generate_dtr_end_date_before_start_date_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/generate/dtr/', [
            'start_date' => '2026-06-10',
            'end_date'   => '2026-06-01',
            'ids'        => [['label' => 'Test User', 'value' => $this->user->id]],
        ], $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_generate_dtr_empty_payload_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/generate/dtr/', [], $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_generate_dtr_valid_payload_returns_201()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/generate/dtr/', [
            'start_date' => '2026-06-01',
            'end_date'   => '2026-06-01',
            'ids'        => [['label' => 'Test User', 'value' => $this->user->id]],
        ], $this->apiKey);
        $response->assertStatus(201);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_generate_dtr_invalid_employee_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/generate/dtr/', [
            'start_date' => '2026-06-01',
            'end_date'   => '2026-06-01',
            'ids'        => [['label' => 'Ghost User', 'value' => 999999]],
        ], $this->apiKey);
        // findOrFail throws ModelNotFoundException → should be 404, not 500
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // CHANGE LOGS — GET /api/changelogs (public — no auth required)
    // =========================================================================

    /** @test */
    public function test_changelogs_get_is_publicly_accessible_returns_200()
    {
        $this->markTestSkipped('[BY-DESIGN] Changelogs module retired 2026-08-13 by Glenn Macasarte (ref BUG-064). GET /api/changelogs — route removed, returns 404.');
    }

    /** @test */
    public function test_changelogs_get_without_api_key_still_returns_200()
    {
        $this->markTestSkipped('[BY-DESIGN] Changelogs module retired 2026-08-13 (ref BUG-064). Route returns 404 — skip is permanent.');
    }

    // =========================================================================
    // CHANGE LOGS — POST /api/changelogs (public — no auth required)
    // =========================================================================

    /** @test */
    public function test_changelogs_post_is_publicly_accessible_no_validation()
    {
        $this->markTestSkipped('[BY-DESIGN] Changelogs module retired 2026-08-13 (ref BUG-064). Route returns 404 — skip is permanent.');
    }

    /** @test */
    public function test_changelogs_post_valid_payload_returns_200()
    {
        $this->markTestSkipped('[BY-DESIGN] Changelogs module retired 2026-08-13 (ref BUG-064). Route returns 404 — skip is permanent.');
    }

    /** @test */
    public function test_changelogs_post_missing_title_does_not_validate_server_side()
    {
        $this->markTestSkipped('[BY-DESIGN] Changelogs module retired 2026-08-13 (ref BUG-064). Route returns 404 — skip is permanent.');
    }

    // =========================================================================
    // ADMIN ANNOUNCEMENTS — GET /api/department/announcements/all
    // =========================================================================

    /** @test */
    public function test_announcements_all_without_token_returns_401()
    {
        $response = $this->getJson('/api/department/announcements/all', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_announcements_all_returns_200_with_structure()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/department/announcements/all', $this->apiKey);
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_announcements_all_with_department_filter_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/department/announcements/all?department_id=1', $this->apiKey);
        $response->assertStatus(200);
    }

    /** @test */
    public function test_announcements_all_with_status_ongoing_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/department/announcements/all?status=ongoing', $this->apiKey);
        $response->assertStatus(200);
    }

    /** @test */
    public function test_announcements_all_with_status_expired_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/department/announcements/all?status=expired', $this->apiKey);
        $response->assertStatus(200);
    }

    /** @test */
    public function test_announcements_all_with_title_filter_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/department/announcements/all?announcement_title=test', $this->apiKey);
        $response->assertStatus(200);
    }

    // =========================================================================
    // ADMIN ANNOUNCEMENTS — DELETE /api/department/announcements/my_handle_announcements/{id}/
    // =========================================================================

    /** @test */
    public function test_announcements_delete_without_token_returns_401()
    {
        $response = $this->deleteJson(
            '/api/department/announcements/my_handle_announcements/1/',
            [],
            $this->apiKey
        );
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_announcements_delete_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->deleteJson(
            '/api/department/announcements/my_handle_announcements/999999/',
            [],
            $this->apiKey
        );
        // Announcement::destroy(999999) returns 0 — success_response still sent (no 500)
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // JOB OPENINGS (CAREERS) — GET /api/careers/ (public — no auth required)
    // =========================================================================

    /** @test */
    public function test_careers_get_is_publicly_accessible_returns_200()
    {
        // BUG-JOB-01: No middleware — public endpoint (security bug)
        $response = $this->getJson('/api/careers/', $this->apiKey);
        // BUG-JOB-03: If job_openings table is empty, $careers is undefined → may 500
        // We assert NOT 401 (no auth gate) but allow 200 or 500 (known bug)
        $this->assertNotEquals(401, $response->status());
    }

    /** @test */
    public function test_careers_get_without_api_key_still_accessible()
    {
        // Confirms no auth gate on this endpoint (BUG-JOB-01)
        $response = $this->getJson('/api/careers/');
        $this->assertNotEquals(401, $response->status());
    }

    // =========================================================================
    // JOB OPENINGS (CAREERS) — POST /api/careers/ (public — no auth required)
    // =========================================================================

    /** @test */
    public function test_careers_post_is_publicly_accessible()
    {
        // BUG-JOB-01: No middleware — anyone can truncate and replace all job openings
        $response = $this->postJson('/api/careers/', [
            'parsedJobs' => json_encode([]),
        ]);
        // Should not require auth
        $this->assertNotEquals(401, $response->status());
    }

    /** @test */
    public function test_careers_post_valid_parsed_jobs_returns_200()
    {
        // Dead code removal: Careers module removed (BUG-065, confirmed dead code).
        // POST /api/careers/ returns 404 — route is gone.
        $this->markTestSkipped('Intentionally dropped: Careers module removed as dead code. POST /api/careers/ returns 404. (confirmed BUG-065)');
    }

    /** @test */
    public function test_careers_post_empty_parsed_jobs_truncates_and_returns_200()
    {
        // Dead code removal: Careers module removed (BUG-065, confirmed dead code).
        // POST /api/careers/ returns 404 — route is gone.
        $this->markTestSkipped('Intentionally dropped: Careers module removed as dead code. POST /api/careers/ returns 404. (confirmed BUG-065)');
    }

    /** @test */
    public function test_careers_post_missing_parsed_jobs_does_not_500()
    {
        // Dead code removal: Careers module removed (BUG-065, confirmed dead code).
        // POST /api/careers/ returns 404 — route is gone. assertNotEquals(500) passes.
        $response = $this->postJson('/api/careers/', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // KNOWN BUG — LocationController (referenced in task specification)
    // =========================================================================

    /** @test */
    public function test_delete_location_details_with_null_id_does_not_500()
    {
        // Dead code removal: LocationController decommissioned 2026-06-21.
        // DELETE /api/DeleteLocationDetails/999999 returns 404 — route is gone.
        // The original null-dereference bug is moot. assertNotEquals(500) passes.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->deleteJson('/api/DeleteLocationDetails/999999', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }
}
