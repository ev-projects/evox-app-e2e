<?php

/**
 * @registry-doc template-list.registry.md
 * @vetted-by    Glenn Macasarte
 * @vetted-on    July 3, 2026
 */

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class TemplateListVerifiedApiTest extends TestCase
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
    // GET /api/schedule/templates/
    // ScheduleController::templates → ScheduleRepository::get_template_schedules
    // =========================================================================

    /** @test */
    public function test_get_template_schedules_without_token_returns_401(): void
    {
        $response = $this->getJson('/api/schedule/templates/', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic (withoutMiddleware + actingAs)
    // GET /api/schedule/templates/
    // ScheduleController::templates → ScheduleRepository::get_template_schedules
    // Admin receives all templates; non-admin receives only their own (filtered in repository).
    // =========================================================================

    /** @test */
    public function test_get_template_schedules_returns_200(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/schedule/templates/', $this->apiKey);
        $response->assertStatus(200);
    }

    /** @test */
    public function test_get_template_schedules_returns_array_payload(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/schedule/templates/', $this->apiKey);
        $response->assertStatus(200);
        // Response must be an array (list of template schedules)
        $this->assertIsArray($response->json());
    }

    /** @test */
    public function test_get_template_schedules_does_not_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/schedule/templates/', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // DELETE /api/schedule/{id}
    // ScheduleController::destroy($id)
    // =========================================================================

    /** @test */
    public function test_delete_schedule_without_token_returns_401(): void
    {
        $response = $this->deleteJson('/api/schedule/1', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // DELETE /api/schedule/{id}
    // ScheduleController::destroy($id) → ScheduleRepository::destroy($id)
    // Checks source_type == 'template'; wraps in DB::beginTransaction();
    // soft-deletes schedules, hard-deletes schedule_details + schedule_policies.
    // =========================================================================

    /** @test */
    public function test_delete_schedule_for_nonexistent_id_does_not_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->deleteJson('/api/schedule/999999', $this->apiKey);
        // Must not crash the server regardless of whether the record exists
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_delete_non_template_schedule_returns_200_with_not_authorized_message(): void
    {
        // Known behaviour from [DEVELOPER VETTING]: if the schedule record exists but
        // source_type != 'template', ScheduleController::destroy returns HTTP 200 with a
        // "not authorized" message body instead of HTTP 403.
        // This test documents the current (incorrect) behaviour — not the desired behaviour.
        $this->markTestIncomplete(
            'Requires a seed record with source_type != \'template\'. ' .
            'Documented known behaviour: backend returns HTTP 200 with a "not authorized" message ' .
            'instead of HTTP 403 when the record is not a template. ' .
            'See ScheduleController::destroy and template-list.registry.md [DEVELOPER VETTING].'
        );
    }

    /** @test */
    public function test_delete_schedule_permission_middleware_is_commented_out(): void
    {
        // Known issue from [DEVELOPER VETTING]: permission middleware `permission:delete_schedule`
        // is commented out on the DELETE /api/schedule/{id} route. Any authenticated user can
        // attempt to delete any template — there is no role/permission guard at the route level.
        // This test documents the gap; a separate security fix ticket is needed.
        $this->markTestIncomplete(
            'Known security gap: permission:delete_schedule middleware is commented out. ' .
            'Any authenticated user can call DELETE /api/schedule/{id}. ' .
            'See template-list.registry.md [DEVELOPER VETTING].'
        );
    }
}
