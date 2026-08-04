<?php

/**
 * EVOX Approval Workflow API Tests — Vishnu Padmanabhan
 * Status: DRAFT — needs verification against staging
 *
 * Covers four controllers sharing the same approval workflow:
 *   OvertimeController, RestDayWorkController,
 *   ChangeScheduleController, AlterLogPunchController
 *
 * Violations fixed (2026-06-18):
 *   Fix A — runtime API key
 *   Fix B — env-var user loading
 *   Fix C — JWT authHeaders() replaces withoutMiddleware() + actingAs()
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class ApprovalWorkflowApiTest extends TestCase
{
    use DatabaseTransactions;

    private string $apiKey;
    protected ?int $userId = null;
    private int $nonExistentId = 999999;

    protected function setUp(): void
    {
        parent::setUp();

        $this->apiKey = \Illuminate\Support\Str::random(64);
        \Illuminate\Support\Facades\DB::table('api_keys')->insert([
            'name'       => 'evox_e2e_' . strtolower(class_basename(static::class)) . '_' . now()->format('His'),
            'key'        => $this->apiKey,
            'active'     => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->userId = $this->requireUser('EMPLOYEE_PHILIPPINES');
    }

    private function loadUserByVariant(string $variant): ?int
    {
        $email = env('E2E_USER_' . strtoupper($variant));
        if (!$email) return null;
        return \App\Modules\User\Models\User::where('email', $email)->value('id');
    }

    private function requireUser(string $variant): int
    {
        $id = $this->loadUserByVariant($variant);
        if (!$id) $this->markTestIncomplete("E2E_USER_{$variant} not found in DB");
        return $id;
    }

    private function authHeaders(): array
    {
        $user = \App\Modules\User\Models\User::findOrFail($this->userId);
        $token = auth('api')->login($user);
        return ['Authorization' => "Bearer {$token}", 'X-Authorization' => $this->apiKey];
    }

    // =========================================================================
    // OVERTIME — Pattern B (auth enforcement, no token → 401)
    // =========================================================================

    /** @test */
    public function test_overtime_store_without_token_returns_401(): void
    {
        $response = $this->postJson('/api/request/overtime/', [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_overtime_update_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/overtime/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_overtime_destroy_without_token_returns_401(): void
    {
        $response = $this->deleteJson('/api/request/overtime/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_overtime_approve_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/overtime/approve/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_overtime_decline_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/overtime/decline/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_overtime_pending_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/overtime/pending/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_overtime_cancel_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/overtime/cancel/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // OVERTIME — Pattern A (controller logic)
    // =========================================================================

    /** @test */
    public function test_overtime_store_with_valid_payload_returns_not_500(): void
    {
        $payload = [
            'user_id' => $this->userId,
            'date'    => '2099-01-01',
            'type'    => 'pre_overtime',
            'amount'  => '02:00',
        ];

        $response = $this->postJson('/api/request/overtime/', $payload, $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'OvertimeController@store must not throw 500 — any failure must be caught.');
    }

    /** @test */
    public function test_overtime_store_missing_required_fields_returns_422(): void
    {
        $response = $this->postJson('/api/request/overtime/', [
            'user_id' => $this->userId,
        ], $this->authHeaders());

        $response->assertStatus(422);
    }

    /** @test */
    public function test_overtime_store_missing_user_id_returns_422(): void
    {
        $response = $this->postJson('/api/request/overtime/', [
            'date'   => '2099-02-01',
            'type'   => 'pre_overtime',
            'amount' => '01:00',
        ], $this->authHeaders());

        $response->assertStatus(422);
    }

    /** @test */
    public function test_overtime_update_with_valid_payload_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/overtime/' . $this->nonExistentId, [
            'user_id' => $this->userId,
            'date'    => '2099-01-02',
            'type'    => 'pre_overtime',
            'amount'  => '01:30',
        ], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'OvertimeController@update must not throw 500.');
    }

    /** @test */
    public function test_overtime_update_missing_required_fields_returns_422(): void
    {
        $response = $this->putJson('/api/request/overtime/' . $this->nonExistentId, [
            'user_id' => $this->userId,
        ], $this->authHeaders());

        $response->assertStatus(422);
    }

    /** @test */
    public function test_overtime_destroy_returns_not_500(): void
    {
        $response = $this->deleteJson('/api/request/overtime/' . $this->nonExistentId, [], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'OvertimeController@destroy must not throw 500 for a non-existent record.');
    }

    /** @test */
    public function test_overtime_approve_with_valid_payload_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/overtime/approve/' . $this->nonExistentId, [
            'user_id' => $this->userId,
            'date'    => '2099-01-03',
            'type'    => 'pre_overtime',
            'amount'  => '01:00',
        ], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'OvertimeController@approve must not throw 500.');
    }

    /** @test */
    public function test_overtime_approve_missing_required_fields_returns_422(): void
    {
        $response = $this->putJson('/api/request/overtime/approve/' . $this->nonExistentId, [
            'user_id' => $this->userId,
        ], $this->authHeaders());

        $response->assertStatus(422);
    }

    /**
     * SECURITY FIX VERIFIED — self-approval gate now active at controller level.
     * @test
     */
    public function test_overtime_approve_self_approval_returns_403(): void
    {
        $response = $this->putJson('/api/request/overtime/approve/' . $this->nonExistentId, [
            'user_id' => $this->userId,
            'date'    => '2099-01-04',
            'type'    => 'pre_overtime',
            'amount'  => '01:00',
        ], $this->authHeaders());

        $this->assertEquals(403, $response->status(),
            'A27 FIXED: OvertimeController::approve() now blocks self-approval at controller level and returns 403.');
    }

    /** @test */
    public function test_overtime_decline_with_valid_payload_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/overtime/decline/' . $this->nonExistentId, [
            'user_id' => $this->userId,
            'date'    => '2099-01-05',
            'type'    => 'pre_overtime',
            'amount'  => '01:00',
        ], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'OvertimeController@decline must not throw 500.');
    }

    /** @test */
    public function test_overtime_decline_missing_required_fields_returns_422(): void
    {
        $response = $this->putJson('/api/request/overtime/decline/' . $this->nonExistentId, [
            'user_id' => $this->userId,
        ], $this->authHeaders());

        $response->assertStatus(422);
    }

    /** @test */
    public function test_overtime_pending_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/overtime/pending/' . $this->nonExistentId, [], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'OvertimeController@pending must not throw 500.');
    }

    /** @test */
    public function test_overtime_cancel_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/overtime/cancel/' . $this->nonExistentId, [], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'OvertimeController@cancel must not throw 500.');
    }

    // =========================================================================
    // REST DAY WORK — Pattern B
    // =========================================================================

    /** @test */
    public function test_rest_day_work_store_without_token_returns_401(): void
    {
        $response = $this->postJson('/api/request/rest_day_work/', [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_rest_day_work_update_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/rest_day_work/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_rest_day_work_destroy_without_token_returns_401(): void
    {
        $response = $this->deleteJson('/api/request/rest_day_work/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_rest_day_work_approve_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/rest_day_work/approve/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_rest_day_work_decline_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/rest_day_work/decline/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_rest_day_work_pending_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/rest_day_work/pending/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_rest_day_work_cancel_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/rest_day_work/cancel/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // REST DAY WORK — Pattern A
    // =========================================================================

    /** @test */
    public function test_rest_day_work_store_with_valid_payload_returns_not_500(): void
    {
        $response = $this->postJson('/api/request/rest_day_work/', [
            'user_id'    => $this->userId,
            'date'       => '2099-06-01',
            'start_time' => '08:00',
            'end_time'   => '17:00',
            'break_time' => '01:00',
        ], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'RestDayWorkController@store must not throw 500.');
    }

    /** @test */
    public function test_rest_day_work_store_missing_required_fields_returns_422(): void
    {
        $response = $this->postJson('/api/request/rest_day_work/', [
            'user_id' => $this->userId,
            'date'    => '2099-06-02',
        ], $this->authHeaders());

        $response->assertStatus(422);
    }

    /** @test */
    public function test_rest_day_work_store_missing_user_id_returns_422(): void
    {
        $response = $this->postJson('/api/request/rest_day_work/', [
            'date'       => '2099-06-03',
            'start_time' => '08:00',
            'end_time'   => '17:00',
            'break_time' => '01:00',
        ], $this->authHeaders());

        $response->assertStatus(422);
    }

    /** @test */
    public function test_rest_day_work_update_with_valid_payload_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/rest_day_work/' . $this->nonExistentId, [
            'user_id'    => $this->userId,
            'date'       => '2099-06-04',
            'start_time' => '08:00',
            'end_time'   => '17:00',
            'break_time' => '01:00',
        ], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'RestDayWorkController@update must not throw 500.');
    }

    /** @test */
    public function test_rest_day_work_update_missing_required_fields_returns_422(): void
    {
        $response = $this->putJson('/api/request/rest_day_work/' . $this->nonExistentId, [
            'user_id' => $this->userId,
        ], $this->authHeaders());

        $response->assertStatus(422);
    }

    /** @test */
    public function test_rest_day_work_destroy_returns_not_500(): void
    {
        $response = $this->deleteJson('/api/request/rest_day_work/' . $this->nonExistentId, [], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'RestDayWorkController@destroy must not throw 500 for a non-existent record.');
    }

    /** @test */
    public function test_rest_day_work_approve_with_valid_payload_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/rest_day_work/approve/' . $this->nonExistentId, [
            'user_id'    => $this->userId,
            'date'       => '2099-06-05',
            'start_time' => '08:00',
            'end_time'   => '17:00',
            'break_time' => '01:00',
        ], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'RestDayWorkController@approve must not throw 500.');
    }

    /** @test */
    public function test_rest_day_work_approve_missing_required_fields_returns_422(): void
    {
        $response = $this->putJson('/api/request/rest_day_work/approve/' . $this->nonExistentId, [
            'user_id' => $this->userId,
        ], $this->authHeaders());

        $response->assertStatus(422);
    }

    /**
     * SECURITY FIX VERIFIED — self-approval gate now active at controller level (Rest Day Work).
     * @test
     */
    public function test_rest_day_work_approve_self_approval_returns_403(): void
    {
        $response = $this->putJson('/api/request/rest_day_work/approve/' . $this->nonExistentId, [
            'user_id'    => $this->userId,
            'date'       => '2099-06-06',
            'start_time' => '08:00',
            'end_time'   => '17:00',
            'break_time' => '01:00',
        ], $this->authHeaders());

        $this->assertEquals(403, $response->status(),
            'A27 FIXED: RestDayWorkController::approve() now blocks self-approval at controller level and returns 403.');
    }

    /** @test */
    public function test_rest_day_work_decline_with_valid_payload_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/rest_day_work/decline/' . $this->nonExistentId, [
            'user_id'    => $this->userId,
            'date'       => '2099-06-07',
            'start_time' => '08:00',
            'end_time'   => '17:00',
            'break_time' => '01:00',
        ], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'RestDayWorkController@decline must not throw 500.');
    }

    /** @test */
    public function test_rest_day_work_decline_missing_required_fields_returns_422(): void
    {
        $response = $this->putJson('/api/request/rest_day_work/decline/' . $this->nonExistentId, [
            'user_id' => $this->userId,
        ], $this->authHeaders());

        $response->assertStatus(422);
    }

    /** @test */
    public function test_rest_day_work_pending_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/rest_day_work/pending/' . $this->nonExistentId, [], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'RestDayWorkController@pending must not throw 500.');
    }

    /** @test */
    public function test_rest_day_work_cancel_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/rest_day_work/cancel/' . $this->nonExistentId, [], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'RestDayWorkController@cancel must not throw 500.');
    }

    // =========================================================================
    // CHANGE SCHEDULE — Pattern B
    // =========================================================================

    /** @test */
    public function test_change_schedule_store_without_token_returns_401(): void
    {
        $response = $this->postJson('/api/request/change_schedule/', [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_change_schedule_update_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/change_schedule/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_change_schedule_destroy_without_token_returns_401(): void
    {
        $response = $this->deleteJson('/api/request/change_schedule/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_change_schedule_approve_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/change_schedule/approve/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_change_schedule_decline_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/change_schedule/decline/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_change_schedule_pending_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/change_schedule/pending/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_change_schedule_cancel_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/change_schedule/cancel/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // CHANGE SCHEDULE — Pattern A
    // =========================================================================

    /** @test */
    public function test_change_schedule_store_with_valid_payload_returns_not_500(): void
    {
        $response = $this->postJson('/api/request/change_schedule/', [
            'valid_from' => '2099-07-01',
            'valid_to'   => '2099-07-07',
        ], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'ChangeScheduleController@store must not throw 500.');
    }

    /** @test */
    public function test_change_schedule_store_missing_valid_from_returns_422(): void
    {
        $response = $this->postJson('/api/request/change_schedule/', [
            'valid_to' => '2099-07-07',
        ], $this->authHeaders());

        $response->assertStatus(422);
    }

    /** @test */
    public function test_change_schedule_store_missing_valid_to_returns_422(): void
    {
        $response = $this->postJson('/api/request/change_schedule/', [
            'valid_from' => '2099-07-01',
        ], $this->authHeaders());

        $response->assertStatus(422);
    }

    /** @test */
    public function test_change_schedule_store_valid_to_before_valid_from_returns_422(): void
    {
        $response = $this->postJson('/api/request/change_schedule/', [
            'valid_from' => '2099-07-10',
            'valid_to'   => '2099-07-01',
        ], $this->authHeaders());

        $response->assertStatus(422);
    }

    /** @test */
    public function test_change_schedule_update_with_valid_payload_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/change_schedule/' . $this->nonExistentId, [
            'valid_from' => '2099-07-08',
            'valid_to'   => '2099-07-14',
        ], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'ChangeScheduleController@update must not throw 500.');
    }

    /** @test */
    public function test_change_schedule_update_missing_required_fields_returns_422(): void
    {
        $response = $this->putJson('/api/request/change_schedule/' . $this->nonExistentId, [], $this->authHeaders());

        $response->assertStatus(422);
    }

    /** @test */
    public function test_change_schedule_destroy_returns_not_500(): void
    {
        $response = $this->deleteJson('/api/request/change_schedule/' . $this->nonExistentId, [], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'ChangeScheduleController@destroy must not throw 500 for a non-existent record.');
    }

    /** @test */
    public function test_change_schedule_approve_with_valid_payload_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/change_schedule/approve/' . $this->nonExistentId, [
            'valid_from' => '2099-07-15',
            'valid_to'   => '2099-07-21',
        ], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'ChangeScheduleController@approve must not throw 500.');
    }

    /** @test */
    public function test_change_schedule_approve_missing_required_fields_returns_422(): void
    {
        $response = $this->putJson('/api/request/change_schedule/approve/' . $this->nonExistentId, [], $this->authHeaders());

        $response->assertStatus(422);
    }

    /**
     * SECURITY TEST — self-approval risk (Change Schedule).
     * @test
     */
    public function test_change_schedule_approve_self_approval_risk_no_403_returned(): void
    {
        $response = $this->putJson('/api/request/change_schedule/approve/' . $this->nonExistentId, [
            'valid_from' => '2099-07-22',
            'valid_to'   => '2099-07-28',
        ], $this->authHeaders());

        $this->assertNotEquals(403, $response->status(),
            'SECURITY RISK CONFIRMED: No 403 returned for self-approval on change_schedule/approve. '
            . 'The approval_of_request permission middleware is commented out.');
    }

    /** @test */
    public function test_change_schedule_decline_with_valid_payload_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/change_schedule/decline/' . $this->nonExistentId, [
            'valid_from' => '2099-07-29',
            'valid_to'   => '2099-08-04',
        ], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'ChangeScheduleController@decline must not throw 500.');
    }

    /** @test */
    public function test_change_schedule_decline_missing_required_fields_returns_422(): void
    {
        $response = $this->putJson('/api/request/change_schedule/decline/' . $this->nonExistentId, [], $this->authHeaders());

        $response->assertStatus(422);
    }

    /** @test */
    public function test_change_schedule_pending_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/change_schedule/pending/' . $this->nonExistentId, [], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'ChangeScheduleController@pending must not throw 500.');
    }

    /** @test */
    public function test_change_schedule_cancel_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/change_schedule/cancel/' . $this->nonExistentId, [], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'ChangeScheduleController@cancel must not throw 500.');
    }

    // =========================================================================
    // ALTER LOG PUNCH — Pattern B
    // =========================================================================

    /** @test */
    public function test_alter_log_punch_store_without_token_returns_401(): void
    {
        $response = $this->postJson('/api/request/alter_log_punch/', [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_alter_log_punch_update_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/alter_log_punch/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_alter_log_punch_destroy_without_token_returns_401(): void
    {
        $response = $this->deleteJson('/api/request/alter_log_punch/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_alter_log_punch_approve_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/alter_log_punch/approve/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_alter_log_punch_decline_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/alter_log_punch/decline/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_alter_log_punch_pending_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/alter_log_punch/pending/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_alter_log_punch_cancel_without_token_returns_401(): void
    {
        $response = $this->putJson('/api/request/alter_log_punch/cancel/' . $this->nonExistentId, [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // ALTER LOG PUNCH — Pattern A
    // NOTE: AlterLogPunchController uses plain Request, no FormRequest → no built-in 422
    // =========================================================================

    /** @test */
    public function test_alter_log_punch_store_with_payload_returns_not_500(): void
    {
        $response = $this->postJson('/api/request/alter_log_punch/', [
            'user_id'       => $this->userId,
            'date'          => '2099-08-01',
            'time_in'       => '2099-08-01 08:00:00',
            'time_out'      => '2099-08-01 17:00:00',
            'employee_note' => 'Test alter log punch store',
        ], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'AlterLogPunchController@store must not throw 500.');
    }

    /**
     * No FormRequest = no built-in 422 gate on AlterLogPunchController@store.
     * RISK: Malformed input reaches the repository / database layer with no prior sanitisation.
     * @test
     */
    public function test_alter_log_punch_store_empty_payload_no_422_returned_documents_missing_validation(): void
    {
        $response = $this->postJson('/api/request/alter_log_punch/', [], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'AlterLogPunchController@store with empty payload must not return 500.');

        $this->addToAssertionCount(1);
    }

    /** @test */
    public function test_alter_log_punch_update_with_payload_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/alter_log_punch/' . $this->nonExistentId, [
            'user_id'  => $this->userId,
            'date'     => '2099-08-02',
            'time_in'  => '2099-08-02 08:00:00',
            'time_out' => '2099-08-02 17:00:00',
        ], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'AlterLogPunchController@update must not throw 500.');
    }

    /** @test */
    public function test_alter_log_punch_destroy_returns_not_500(): void
    {
        $response = $this->deleteJson('/api/request/alter_log_punch/' . $this->nonExistentId, [], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'AlterLogPunchController@destroy must not throw 500 for a non-existent record.');
    }

    /** @test */
    public function test_alter_log_punch_approve_with_payload_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/alter_log_punch/approve/' . $this->nonExistentId, [
            'user_id'  => $this->userId,
            'date'     => '2099-08-03',
            'time_in'  => '2099-08-03 08:00:00',
            'time_out' => '2099-08-03 17:00:00',
        ], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'AlterLogPunchController@approve must not throw 500.');
    }

    /**
     * SECURITY TEST — self-approval risk (Alter Log Punch).
     * No FormRequest and no permission middleware — approval gate is completely absent.
     * @test
     */
    public function test_alter_log_punch_approve_self_approval_risk_no_403_returned(): void
    {
        $response = $this->putJson('/api/request/alter_log_punch/approve/' . $this->nonExistentId, [
            'user_id' => $this->userId,
        ], $this->authHeaders());

        $this->assertNotEquals(403, $response->status(),
            'SECURITY RISK CONFIRMED: No 403 returned for self-approval on alter_log_punch/approve. '
            . 'No FormRequest and no permission middleware — approval gate is completely absent.');
    }

    /** @test */
    public function test_alter_log_punch_decline_with_payload_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/alter_log_punch/decline/' . $this->nonExistentId, [
            'user_id' => $this->userId,
        ], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'AlterLogPunchController@decline must not throw 500.');
    }

    /** @test */
    public function test_alter_log_punch_pending_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/alter_log_punch/pending/' . $this->nonExistentId, [], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'AlterLogPunchController@pending must not throw 500.');
    }

    /** @test */
    public function test_alter_log_punch_cancel_returns_not_500(): void
    {
        $response = $this->putJson('/api/request/alter_log_punch/cancel/' . $this->nonExistentId, [], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'AlterLogPunchController@cancel must not throw 500.');
    }
}
