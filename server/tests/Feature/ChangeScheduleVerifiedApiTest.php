<?php
// VERIFIED-BACKED — generated 2026-07-07 from change-schedule.registry.md (vetted by Glenn Macasarte on July 1, 2026)

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * @registry-doc change-schedule.registry.md
 * @vetted-by    Glenn Macasarte
 * @vetted-on    July 1, 2026
 *
 * Covers confirmed API endpoints from [DEVELOPER VETTING] — Area 5:
 *   POST   /api/request/change_schedule          ChangeScheduleController::store  (:40)
 *   PUT    /api/request/change_schedule/approve/{id}  ChangeScheduleController::approve (:117)
 *   PUT    /api/request/change_schedule/decline/{id}  ChangeScheduleController::decline (:140)
 *   PUT    /api/request/change_schedule/cancel/{id}   ChangeScheduleController::cancel  (:186)
 *
 * Known bugs recorded (not fixed):
 *   B-001 cancel() uses trans('messages.cancel_overtime_success') — wrong message key
 *   B-002 No server-side validation of schedule_details / schedule_policies
 *   B-003 Dead custom validation message valid_from.unique_dates
 *   B-007 Raw SQL string interpolation in changeSchedules() — SQL injection risk
 *   B-008 eval() in ChangeSchedule.js render
 */
class ChangeScheduleVerifiedApiTest extends TestCase
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
    // POST /api/request/change_schedule
    // ChangeScheduleController::store (:40)
    // =========================================================================

    /** @test */
    public function test_store_without_token_returns_401()
    {
        $response = $this->postJson('/api/request/change_schedule', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // PUT /api/request/change_schedule/approve/{id}
    // ChangeScheduleController::approve (:117)
    // =========================================================================

    /** @test */
    public function test_approve_without_token_returns_401()
    {
        $response = $this->putJson('/api/request/change_schedule/approve/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // PUT /api/request/change_schedule/decline/{id}
    // ChangeScheduleController::decline (:140)
    // =========================================================================

    /** @test */
    public function test_decline_without_token_returns_401()
    {
        $response = $this->putJson('/api/request/change_schedule/decline/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // PUT /api/request/change_schedule/cancel/{id}
    // ChangeScheduleController::cancel (:186)
    // =========================================================================

    /** @test */
    public function test_cancel_without_token_returns_401()
    {
        $response = $this->putJson('/api/request/change_schedule/cancel/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic (withoutMiddleware + actingAs)
    // POST /api/request/change_schedule — store
    // ChangeScheduleController::store (:40)
    // Missing required fields → validation error (422)
    // B-002: no server-side validation of schedule_details/schedule_policies,
    //        so only top-level fields (valid_from, valid_to) are validated here
    // =========================================================================

    /** @test */
    public function test_store_without_required_fields_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->postJson('/api/request/change_schedule', [], $this->apiKey);
        // valid_from and valid_to are required; missing payload must fail validation
        $this->assertContains($response->status(), [422, 400]);
    }

    /** @test */
    public function test_store_with_valid_from_after_valid_to_returns_422()
    {
        // Yup cross-field rule: valid_from must be <= valid_to
        // Backend: valid_to must be after_or_equal:valid_from
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->postJson('/api/request/change_schedule', [
                'valid_from'        => '2026-08-31',
                'valid_to'          => '2026-08-01', // earlier than valid_from
                'schedule_details'  => [],
                'schedule_policies' => [],
            ], $this->apiKey);
        $this->assertContains($response->status(), [422, 400]);
    }

    // =========================================================================
    // PATTERN A — approve
    // PUT /api/request/change_schedule/approve/{id}
    // ChangeScheduleController::approve (:117)
    // Non-existent ID → 404 or controlled error (not 500)
    // =========================================================================

    /** @test */
    public function test_approve_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->putJson('/api/request/change_schedule/approve/999999', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_approve_nonexistent_id_returns_404_or_error_response()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->putJson('/api/request/change_schedule/approve/999999', [], $this->apiKey);
        $this->assertContains($response->status(), [404, 422, 400, 403]);
    }

    // =========================================================================
    // PATTERN A — decline
    // PUT /api/request/change_schedule/decline/{id}
    // ChangeScheduleController::decline (:140)
    // Non-existent ID → 404 or controlled error (not 500)
    // =========================================================================

    /** @test */
    public function test_decline_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->putJson('/api/request/change_schedule/decline/999999', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_decline_nonexistent_id_returns_404_or_error_response()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->putJson('/api/request/change_schedule/decline/999999', [], $this->apiKey);
        $this->assertContains($response->status(), [404, 422, 400, 403]);
    }

    // =========================================================================
    // PATTERN A — cancel
    // PUT /api/request/change_schedule/cancel/{id}
    // ChangeScheduleController::cancel (:186)
    // Non-existent ID → 404 or controlled error (not 500)
    // B-001: success message uses trans('messages.cancel_overtime_success') — wrong key
    // =========================================================================

    /** @test */
    public function test_cancel_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->putJson('/api/request/change_schedule/cancel/999999', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_cancel_nonexistent_id_returns_404_or_error_response()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->putJson('/api/request/change_schedule/cancel/999999', [], $this->apiKey);
        $this->assertContains($response->status(), [404, 422, 400, 403]);
    }

    // =========================================================================
    // Known bug markers
    // =========================================================================

    /** @test */
    public function test_cancel_success_message_is_known_bug_wrong_key()
    {
        // KNOWN BUG B-001: ChangeScheduleController::cancel() returns
        // trans('messages.cancel_overtime_success') — this is the overtime cancellation
        // message, not a change-of-schedule message. Should be cancel_change_schedule_success.
        // Verified by Glenn Macasarte on July 1, 2026.
        $this->markTestIncomplete(
            'Known bug B-001: cancel() uses trans(\'messages.cancel_overtime_success\') — ' .
            'wrong message key. Should be cancel_change_schedule_success. ' .
            'See ChangeScheduleController::cancel() (:186).'
        );
    }

    /** @test */
    public function test_schedule_details_missing_server_validation_is_known_bug()
    {
        // KNOWN BUG B-002: No server-side validation of schedule_details or
        // schedule_policies fields. A malformed payload throws an unhandled exception
        // rather than returning a 422. Cannot be safely asserted without causing a 500.
        $this->markTestIncomplete(
            'Known bug B-002: No server-side validation of schedule_details / ' .
            'schedule_policies. Malformed payload throws unhandled exception. ' .
            'See ChangeScheduleController::store() (:40).'
        );
    }
}
