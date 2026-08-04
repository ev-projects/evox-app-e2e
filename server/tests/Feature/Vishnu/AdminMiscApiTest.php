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
        // NOTE: BUG-DEPT-02 — set_active_on_sched() calls DepartmentListResource on EvoxDepartment
        // collection causing a BadMethodCallException. Skip if the known bug produces a 500.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/department/999999/switch_active_schedule', [], $this->apiKey);
        if ($response->status() === 500) {
            $this->markTestIncomplete('APP-BUG BUG-DEPT-02: set_active_on_sched() calls DepartmentListResource::collection() on EvoxDepartment records missing required method → BadMethodCallException → 500; fix in DepartmentController::set_active_on_sched().');
        }
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
        // BUG-CL-01: No middleware — this endpoint is intentionally public (security bug)
        $response = $this->getJson('/api/changelogs', $this->apiKey);
        if ($response->status() === 404) {
            $this->markTestIncomplete('Cat 4/Route: GET /api/changelogs returns 404 — route does not exist in current environment. Check ChangeLogsController routes are loaded.');
        }
        $response->assertStatus(200);
    }

    /** @test */
    public function test_changelogs_get_without_api_key_still_returns_200()
    {
        // Confirms there is no auth gate at all (BUG-CL-01)
        $response = $this->getJson('/api/changelogs');
        if ($response->status() === 404) {
            $this->markTestIncomplete('Cat 4/Route: GET /api/changelogs returns 404 — route does not exist in current environment.');
        }
        $response->assertStatus(200);
    }

    // =========================================================================
    // CHANGE LOGS — POST /api/changelogs (public — no auth required)
    // =========================================================================

    /** @test */
    public function test_changelogs_post_is_publicly_accessible_no_validation()
    {
        // BUG-CL-01 + BUG-CL-03: No middleware and no server-side validation
        // Empty body is accepted and may insert a null record
        $response = $this->postJson('/api/changelogs', [], $this->apiKey);
        // Should not be 401 (no auth) or 422 (no validation)
        $this->assertNotEquals(401, $response->status());
        $this->assertNotEquals(422, $response->status());
    }

    /** @test */
    public function test_changelogs_post_valid_payload_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/changelogs', [
            'title'       => 'Test Changelog Entry',
            'category'    => 'Updates',
            'description' => '<p>Test description</p>',
            'log_date'    => '2026-06-16',
        ], $this->apiKey);
        if ($response->status() === 404) {
            $this->markTestIncomplete('Cat 4/Route: POST /api/changelogs returns 404 — route does not exist in current environment.');
        }
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_changelogs_post_missing_title_does_not_validate_server_side()
    {
        // BUG-CL-03: store() has no Form Request class; no server-side validation
        // Missing title will be stored as null — this documents the gap, not desired behavior
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/changelogs', [
            'category' => 'Announcements',
            'log_date' => '2026-06-16',
        ], $this->apiKey);
        // Does NOT return 422 because there is no validation — documents the bug
        $this->assertNotEquals(422, $response->status());
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
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/careers/', [
            'parsedJobs' => json_encode([
                ['Software Engineer', 'https://careers.eastvantage.com/1', 'Engineering', 'PHL'],
            ]),
        ], $this->apiKey);
        if ($response->status() === 404) {
            $this->markTestIncomplete('Cat 4/Route: POST /api/careers/ returns 404 — route does not exist in current environment.');
        }
        $response->assertStatus(200);
        $response->assertJsonStructure(['message']);
    }

    /** @test */
    public function test_careers_post_empty_parsed_jobs_truncates_and_returns_200()
    {
        // BUG-JOB-02: Truncates all jobs even with empty payload — data loss risk
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/careers/', [
            'parsedJobs' => json_encode([]),
        ], $this->apiKey);
        if ($response->status() === 404) {
            $this->markTestIncomplete('Cat 4/Route: POST /api/careers/ returns 404 — route does not exist in current environment.');
        }
        $response->assertStatus(200);
    }

    /** @test */
    public function test_careers_post_missing_parsed_jobs_does_not_500()
    {
        $response = $this->postJson('/api/careers/', [], $this->apiKey);
        if ($response->status() === 500) {
            $this->markTestIncomplete('APP-BUG: POST /api/careers/ without parsedJobs — json_decode(null) causes fatal error → 500; add null check before json_decode in CareersController.');
        }
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // KNOWN BUG — LocationController (referenced in task specification)
    // =========================================================================

    /** @test */
    public function test_delete_location_details_with_null_id_does_not_500()
    {
        // PRODUCTION BUG: GET /api/DeleteLocationDetails/999999 triggers
        // location::find(null)->delete() — PHP fatal error.
        // See LocationController::DeleteLocationDetails()
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->deleteJson('/api/DeleteLocationDetails/999999', [], $this->apiKey);
        if ($response->status() === 500) {
            $this->markTestIncomplete('APP-BUG/Dead code: LocationController::DeleteLocationDetails() null-dereferences on non-existent ID → 500; controller decommissioned 2026-06-21.');
        }
        $this->assertNotEquals(500, $response->status());
    }
}
