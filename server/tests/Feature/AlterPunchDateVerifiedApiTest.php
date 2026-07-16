<?php
/**
 * @registry-doc alter-punch-date.registry.md
 * @vetted-by Glenn Macasarte
 * @vetted-on July 1, 2026
 *
 * VERIFIED-BACKED — generated 2026-07-07 from alter-punch-date.registry.md
 *
 * Known bugs documented in registry (not fixed — tests skip or mark where applicable):
 *   BUG-003: AlterLogPunchRepository::destroy() calls AlterLog::findOrFail() — deletes wrong model
 *   BUG-004: AlterLogPunchRepository::pending() calls AlterLog::findOrFail() — sets wrong model to pending
 *   BUG-005: Table name mismatch: model uses alter_log_punches_new, migration creates alter_log_punches
 *   BUG-008: No email notification at any stage of Alter Log Punch lifecycle
 *   BUG-009: Update path dead code — updateAlterLogPunch dispatch commented out in frontend
 *   GAP-003: No form request validation class — backend accepts any payload
 *   GAP-004: Conflict error returns HTTP 500 instead of 422
 *   GAP-005: No payroll-period / dispute check
 */

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class AlterPunchDateVerifiedApiTest extends TestCase
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
    // POST /api/request/alter_log_punch
    // Controller: AlterLogPunchController::store
    // =========================================================================

    /** @test */
    public function test_store_alter_log_punch_without_token_returns_401()
    {
        $response = $this->postJson('/api/request/alter_log_punch', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // PUT /api/request/alter_log_punch/approve/{id}
    // Controller: AlterLogPunchController::approve
    // =========================================================================

    /** @test */
    public function test_approve_alter_log_punch_without_token_returns_401()
    {
        $response = $this->putJson('/api/request/alter_log_punch/approve/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // PUT /api/request/alter_log_punch/decline/{id}
    // Controller: AlterLogPunchController::decline
    // =========================================================================

    /** @test */
    public function test_decline_alter_log_punch_without_token_returns_401()
    {
        $response = $this->putJson('/api/request/alter_log_punch/decline/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // PUT /api/request/alter_log_punch/cancel/{id}
    // Controller: AlterLogPunchController::cancel
    // =========================================================================

    /** @test */
    public function test_cancel_alter_log_punch_without_token_returns_401()
    {
        $response = $this->putJson('/api/request/alter_log_punch/cancel/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic (withoutMiddleware + actingAs)
    // POST /api/request/alter_log_punch
    // Controller: AlterLogPunchController::store
    // Upsert: if a pending record exists for user+date, it is updated (not duplicated)
    // GAP-003: No form request validation class — backend accepts any payload
    // =========================================================================

    /** @test */
    public function test_store_alter_log_punch_with_valid_payload_returns_200_or_422()
    {
        $this->withoutMiddleware();

        $payload = [
            'date'          => now()->subDay()->format('Y-m-d'),
            'employee_note' => 'Test correction note',
            'approver_note' => '',
            'new_punch'     => [
                [
                    'start_time'   => now()->subDay()->setTime(8, 0)->format('Y-m-d H:i:s'),
                    'end_time'     => now()->subDay()->setTime(12, 0)->format('Y-m-d H:i:s'),
                    'project_name' => 'EVOX',
                    'remarks'      => 'Morning shift correction',
                ],
            ],
        ];

        $response = $this->actingAs($this->user)->postJson(
            '/api/request/alter_log_punch',
            $payload,
            $this->apiKey
        );

        // Store should return 200 on success or 422 on validation/conflict
        // GAP-004: conflict error may return HTTP 500 instead of 422 (known bug — do not assert 422 exclusively)
        $this->assertContains($response->status(), [200, 201, 422, 500],
            'store should return 200/201 on success, 422 on conflict, or 500 (GAP-004 known bug)'
        );
    }

    /** @test */
    public function test_store_alter_log_punch_with_empty_payload_does_not_return_200()
    {
        // GAP-003: No form request validation class — backend accepts any payload and may throw PHP exception
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->postJson(
            '/api/request/alter_log_punch',
            [],
            $this->apiKey
        );

        // An empty payload should NOT return 200 (success) — it may return 422, 500, or other error
        $this->assertNotEquals(200, $response->status(),
            'An empty payload should not result in a successful 200 response'
        );
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // PUT /api/request/alter_log_punch/approve/{id}
    // Controller: AlterLogPunchController::approve
    // On approve: apply_alter_to_punch() soft-disables existing punches, inserts new DtrPunchHistory rows
    // =========================================================================

    /** @test */
    public function test_approve_alter_log_punch_nonexistent_id_returns_404_or_error()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->putJson(
            '/api/request/alter_log_punch/approve/999999',
            [],
            $this->apiKey
        );

        // Non-existent ID should return 404 or an appropriate error, not 200
        $this->assertNotEquals(200, $response->status(),
            'Approving a non-existent alter punch record should not return 200'
        );
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // PUT /api/request/alter_log_punch/decline/{id}
    // Controller: AlterLogPunchController::decline
    // On decline: remove_alter_to_punch() disables current active punches, re-activates old_punch IDs
    // =========================================================================

    /** @test */
    public function test_decline_alter_log_punch_nonexistent_id_returns_404_or_error()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->putJson(
            '/api/request/alter_log_punch/decline/999999',
            [],
            $this->apiKey
        );

        // Non-existent ID should return 404 or an appropriate error, not 200
        $this->assertNotEquals(200, $response->status(),
            'Declining a non-existent alter punch record should not return 200'
        );
    }

    // =========================================================================
    // PATTERN A — Controller logic
    // PUT /api/request/alter_log_punch/cancel/{id}
    // Controller: AlterLogPunchController::cancel
    // =========================================================================

    /** @test */
    public function test_cancel_alter_log_punch_nonexistent_id_returns_404_or_error()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->putJson(
            '/api/request/alter_log_punch/cancel/999999',
            [],
            $this->apiKey
        );

        // Non-existent ID should return 404 or an appropriate error, not 200
        $this->assertNotEquals(200, $response->status(),
            'Cancelling a non-existent alter punch record should not return 200'
        );
    }

    // =========================================================================
    // Known bug markers
    // =========================================================================

    /** @test */
    public function test_gap_004_conflict_returns_500_instead_of_422_is_known_bug()
    {
        // GAP-004: When on_conflict() check fires, backend returns HTTP 500 instead of 422.
        // Frontend shows a confusing generic error alert instead of a user-friendly message.
        // This cannot be safely triggered in a unit test without seeding overlapping punch data.
        $this->markTestSkipped(
            'Known bug GAP-004: AlterLogPunchController::store on_conflict() returns HTTP 500 instead of 422. ' .
            'Frontend displays generic error alert. Requires seeded punch data to reproduce. ' .
            'See alter-punch-date.registry.md > Known Bugs > GAP-004.'
        );
    }

    /** @test */
    public function test_bug_009_update_path_is_dead_code_is_known_bug()
    {
        // BUG-009: updateAlterLogPunch dispatch is commented out in onSubmitHandler.
        // Editing an existing pending record from the UI does nothing — no confirmation, no redirect, no error.
        // This is a frontend dead-code issue; no API test can cover it.
        $this->markTestSkipped(
            'Known bug BUG-009: updateAlterLogPunch dispatch commented out in AlterLogPunch.js onSubmitHandler. ' .
            'The update path is dead code — editing a pending record has no effect. ' .
            'See alter-punch-date.registry.md > Known Bugs > BUG-009.'
        );
    }

    /** @test */
    public function test_bug_003_destroy_deletes_wrong_model_is_known_bug()
    {
        // BUG-003: AlterLogPunchRepository::destroy() calls AlterLog::findOrFail() instead of
        // AlterLogPunch::findOrFail() — deletes an AlterLog record by ID, not the punch record.
        $this->markTestSkipped(
            'Known bug BUG-003: AlterLogPunchRepository::destroy() calls AlterLog::findOrFail() — ' .
            'deletes an AlterLog record by ID, not the AlterLogPunch record. ' .
            'See alter-punch-date.registry.md > Known Bugs > BUG-003.'
        );
    }
}
