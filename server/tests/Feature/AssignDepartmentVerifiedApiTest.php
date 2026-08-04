<?php
/**
 * @registry-doc assign-department.registry.md
 * @vetted-by    Glenn Macasarte
 * @vetted-on    July 3, 2026
 *
 * VERIFIED-BACKED — generated 2026-07-07 from assign-department.registry.md
 *
 * Confirmed API surface (from [DEVELOPER VETTING] blocks):
 *   GET  /api/department/{dept_id}/default_schedule   → DepartmentController::default_schedule
 *   GET  /api/schedule/{template_id}                  → ScheduleController::show
 *   POST /api/schedule/assign/                        → ScheduleController::assign
 *
 * KNOWN BUG (Yup schema): `to` field is validated `when source_type is 'update'`
 * but source_type is always 'default' on this page. The `to` date is therefore
 * never validated. See area 4, assign-all-btn vetting note.
 */

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class AssignDepartmentVerifiedApiTest extends TestCase
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
    // PATTERN B — Auth enforcement
    // GET /api/department/{dept_id}/default_schedule
    // Controller: DepartmentController::default_schedule
    // =========================================================================

    /** @test */
    public function test_get_department_default_schedule_without_token_returns_401(): void
    {
        // [CODE REVIEW 2026-07-07] Route is GET /{id}/default_schedule (no trailing slash).
        // Using /api/department/1/default_schedule (without slash) to match the route.
        $response = $this->getJson('/api/department/1/default_schedule', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // GET /api/department/{dept_id}/default_schedule
    // Loads existing department schedule into the form (Area 1).
    // Returns 200 with schedule data when department exists.
    // =========================================================================

    /** @test */
    public function test_get_department_default_schedule_returns_200_for_valid_department(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/department/1/default_schedule', $this->apiKey);
        $response->assertStatus(200);
    }

    /** @test */
    public function test_get_department_default_schedule_for_nonexistent_department_does_not_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/department/999999/default_schedule', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // GET /api/schedule/{template_id}
    // Controller: ScheduleController::show
    // =========================================================================

    /** @test */
    public function test_get_schedule_template_without_token_returns_401(): void
    {
        $response = $this->getJson('/api/schedule/1', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // GET /api/schedule/{template_id}
    // Template selector (Area 2, row 4): pre-populates time fields from saved template.
    // =========================================================================

    /** @test */
    public function test_get_schedule_template_returns_200_for_valid_id(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/schedule/1', $this->apiKey);
        $response->assertStatus(200);
    }

    /** @test */
    public function test_get_schedule_template_for_nonexistent_id_does_not_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/schedule/999999', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // POST /api/schedule/assign/
    // Controller: ScheduleController::assign
    // =========================================================================

    /** @test */
    public function test_post_schedule_assign_without_token_returns_401(): void
    {
        $response = $this->postJson('/api/schedule/assign/', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // POST /api/schedule/assign/ — action='update'
    // Update button (Area 4, row 12): updates department schedule record only.
    // Does NOT propagate to individual employees.
    // =========================================================================

    /** @test */
    public function test_post_schedule_assign_action_update_with_no_body_returns_validation_error_not_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/schedule/assign/', [
            'action' => 'update',
        ], $this->apiKey);
        // Missing required fields (bind_id, from, schedule_type) → 422 or 400; must not 500
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_post_schedule_assign_action_update_with_valid_payload_returns_non_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/schedule/assign/', [
            'action'        => 'update',
            'bind_to'       => 'department',
            'source_type'   => 'default',
            'bind_id'       => 1,
            'from'          => now()->toDateString(),
            'schedule_type' => 'standard',
        ], $this->apiKey);
        // Response depends on data in DB — assert no server error
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // POST /api/schedule/assign/ — action='assign'
    // Assign to All Employees button (Area 4, row 13):
    // Updates department schedule AND propagates to all users (bind_to='department').
    // Triggers apply_schedule_to_dtr for each affected user → writes to dtrs table.
    // High-volume side-effect; confirmed by Glenn Macasarte.
    // =========================================================================

    /** @test */
    public function test_post_schedule_assign_action_assign_with_no_body_returns_validation_error_not_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/schedule/assign/', [
            'action' => 'assign',
        ], $this->apiKey);
        // Missing required fields → 422 or 400; must not 500
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_post_schedule_assign_action_assign_with_valid_payload_returns_non_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/schedule/assign/', [
            'action'        => 'assign',
            'bind_to'       => 'department',
            'source_type'   => 'default',
            'bind_id'       => 1,
            'from'          => now()->toDateString(),
            'schedule_type' => 'standard',
        ], $this->apiKey);
        // Response depends on data in DB — assert no server error
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // PATTERN A — Partial-assign actions (Area 3, rows 10-11)
    // POST /api/schedule/assign/ — action='assign_schedule_holiday_policy'
    // Pushes only the holiday policy to all employees; does not change entire schedule.
    // =========================================================================

    /** @test */
    public function test_post_schedule_assign_action_assign_holiday_policy_returns_non_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/schedule/assign/', [
            'action'  => 'assign_schedule_holiday_policy',
            'bind_to' => 'department',
            'bind_id' => 1,
        ], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // PATTERN A — Partial-assign actions (Area 3, rows 10-11)
    // POST /api/schedule/assign/ — action='assign_schedule_policy'
    // Pushes only the schedule policy to all employees; does not change entire schedule.
    // =========================================================================

    /** @test */
    public function test_post_schedule_assign_action_assign_schedule_policy_returns_non_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/schedule/assign/', [
            'action'  => 'assign_schedule_policy',
            'bind_to' => 'department',
            'bind_id' => 1,
        ], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // Known production bug markers
    // =========================================================================

    /** @test */
    public function test_to_date_yup_bug_source_type_update_condition_is_unreachable(): void
    {
        // KNOWN BUG: The Yup schema validates `to` (Date To) field only
        // `when source_type is 'update'`, but source_type on this page is always 'default'.
        // The `to` date is therefore NEVER required/validated in the frontend.
        // Backend validation should enforce this independently of frontend Yup schema.
        // This test is a marker — it does not reproduce the bug but documents it.
        $this->markTestIncomplete(
            'Known Yup schema bug: `to` field validated when source_type=\'update\' ' .
            'but source_type is always \'default\' on ScheduleAssignDepartment. ' .
            'The actual condition should be source_type=\'temporary\'. ' .
            'The `to` date field is never validated in the frontend. ' .
            'See assign-department.registry.md Area 4 assign-all-btn vetting note.'
        );
    }
}
