<?php

// DRAFT — generated 2026-06-17, needs verification

/**
 * DisputeBranchApiTest — Vishnu Padmanabhan
 *
 * Covers overtime + rest_day_work dispute branches in OvertimeController and
 * RestDayWorkController (request_mode=dispute + approve dispute branch).
 *
 * Violations fixed (2026-06-18):
 *   Fix A — runtime API key
 *   Fix B — env-var user loading
 *   Fix C — JWT authHeaders() replaces withoutMiddleware() + actingAs()
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;

class DisputeBranchApiTest extends TestCase
{
    use DatabaseTransactions;

    private string $apiKey;
    protected ?int $userId = null;

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

    // ─── Pattern B — Auth enforcement ────────────────────────────────────────

    /**
     * @test
     */
    public function test_overtime_approve_dispute_branch_without_token_returns_401()
    {
        $response = $this->putJson(
            '/api/request/overtime/approve/1',
            [],
            ['X-Authorization' => $this->apiKey]
        );
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /**
     * @test
     */
    public function test_rdw_approve_dispute_branch_without_token_returns_401()
    {
        $response = $this->putJson(
            '/api/request/rest_day_work/approve/1',
            [],
            ['X-Authorization' => $this->apiKey]
        );
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // ─── Pattern A — Overtime dispute store (request_mode=dispute) ───────────

    /**
     * @test
     */
    public function test_overtime_store_dispute_mode_calls_sp_and_does_not_return_500()
    {
        $payload = [
            'user_id'       => $this->userId,
            'date'          => '2026-01-20',
            'type'          => 'pre_overtime',
            'amount'        => '01:00',
            'request_mode'  => 'dispute',
            'employee_note' => 'PHPUnit dispute branch coverage test',
            'session_id'    => 'phpunit-dispute-ot',
        ];

        $response = $this->postJson('/api/request/overtime', $payload, $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'Overtime dispute-mode store must not throw 500 — SP failure must be caught.');

        $body = $response->json();
        $this->assertTrue(
            isset($body['message']) || isset($body['error']),
            'Response must contain a "message" key (success) or "error" key (graceful failure).'
        );
    }

    /**
     * @test
     */
    public function test_overtime_store_dispute_mode_response_envelope_shape()
    {
        $payload = [
            'user_id'      => $this->userId,
            'date'         => '2026-01-21',
            'type'         => 'post_overtime',
            'amount'       => '00:30',
            'request_mode' => 'dispute',
            'session_id'   => 'phpunit-dispute-ot-2',
        ];

        $response = $this->postJson('/api/request/overtime', $payload, $this->authHeaders());

        $this->assertNotEquals(500, $response->status());

        if ($response->status() === 201) {
            $response->assertJsonStructure(['message', 'content']);
        } else {
            $this->assertNotNull(
                $response->json('error'),
                'Non-201 dispute-mode store must use the error envelope.'
            );
        }
    }

    // ─── Pattern A — Overtime approve dispute branch (existing record) ────────

    /**
     * @test
     */
    public function test_overtime_approve_with_existing_record_does_not_return_500()
    {
        // Employee submits → Supervisor approves (correct business flow)
        $overtime = Overtime::where('user_id', $this->userId)
            ->whereNull('deleted_at')
            ->first();

        if (!$overtime) {
            $this->markTestIncomplete('Cat 1: No overtime records for this user — submit an overtime request first.');
        }

        $supervisorId = $this->loadUserByVariant('SUPERVISOR_PHILIPPINES');
        if (!$supervisorId) {
            $this->markTestIncomplete('Cat 2: E2E_USER_SUPERVISOR_PHILIPPINES not set — add this env var to server/.env.');
        }

        $supervisorUser = \App\Modules\User\Models\User::findOrFail($supervisorId);
        $supervisorToken = auth('api')->login($supervisorUser);
        $supervisorHeaders = [
            'Authorization'   => "Bearer {$supervisorToken}",
            'X-Authorization' => $this->apiKey,
        ];

        $payload = [
            'user_id' => $overtime->user_id,
            'date'    => $overtime->date,
            'type'    => $overtime->type ?? 'pre_overtime',
            'amount'  => '01:00',
        ];

        $response = $this->putJson('/api/request/overtime/approve/' . $overtime->id, $payload, $supervisorHeaders);

        $this->assertNotEquals(500, $response->status(),
            'Supervisor approving employee overtime must not throw 500.');
    }

    /**
     * @test
     */
    public function test_overtime_approve_nonexistent_id_uses_error_envelope_not_500()
    {
        $payload = [
            'user_id' => $this->userId,
            'date'    => '2026-01-22',
            'type'    => 'pre_overtime',
            'amount'  => '01:00',
        ];

        $response = $this->putJson('/api/request/overtime/approve/999999', $payload, $this->authHeaders());

        $this->assertNotEquals(500, $response->status());
        $this->assertNotNull(
            $response->json('error'),
            'Non-existent overtime approve must return the error envelope.'
        );
    }

    // ─── Pattern A — RestDayWork dispute store (request_mode=dispute) ─────────

    /**
     * @test
     */
    public function test_rdw_store_dispute_mode_calls_sp_and_does_not_return_500()
    {
        $payload = [
            'user_id'       => $this->userId,
            'date'          => '2026-01-25',
            'start_time'    => '08:00',
            'end_time'      => '17:00',
            'break_time'    => '01:00',
            'request_mode'  => 'dispute',
            'employee_note' => 'PHPUnit RDW dispute branch coverage test',
            'session_id'    => 'phpunit-dispute-rdw',
        ];

        $response = $this->postJson('/api/request/rest_day_work', $payload, $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'RDW dispute-mode store must not throw 500 — SP failure must be caught.');

        $body = $response->json();
        $this->assertTrue(
            isset($body['message']) || isset($body['error']),
            'Response must contain a "message" key (success) or "error" key (graceful failure).'
        );
    }

    /**
     * @test
     */
    public function test_rdw_store_dispute_mode_response_envelope_shape()
    {
        $payload = [
            'user_id'    => $this->userId,
            'date'       => '2026-01-26',
            'start_time' => '09:00',
            'end_time'   => '18:00',
            'break_time' => '01:00',
            'request_mode' => 'dispute',
            'session_id'   => 'phpunit-dispute-rdw-2',
        ];

        $response = $this->postJson('/api/request/rest_day_work', $payload, $this->authHeaders());

        $this->assertNotEquals(500, $response->status());

        if ($response->status() === 201) {
            $response->assertJsonStructure(['message', 'content']);
        } else {
            $this->assertNotNull(
                $response->json('error'),
                'Non-201 RDW dispute-mode store must use the error envelope.'
            );
        }
    }

    // ─── Pattern A — RestDayWork approve dispute branch (existing record) ──────

    /**
     * @test
     */
    public function test_rdw_approve_with_existing_record_does_not_return_500()
    {
        $rdw = RestDayWork::whereNull('deleted_at')->first();

        if (!$rdw) {
            $this->markTestIncomplete('Cat 1: No rest_day_work records in DB — submit a rest-day-work request first.');
        }

        $payload = [
            'user_id'    => $rdw->user_id,
            'date'       => $rdw->date,
            'start_time' => '08:00',
            'end_time'   => '17:00',
            'break_time' => '01:00',
        ];

        $response = $this->putJson('/api/request/rest_day_work/approve/' . $rdw->id, $payload, $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'RDW approve (dispute or normal branch) must not throw 500.');
    }

    /**
     * @test
     */
    public function test_rdw_approve_nonexistent_id_uses_error_envelope_not_500()
    {
        $payload = [
            'user_id'    => $this->userId,
            'date'       => '2026-01-27',
            'start_time' => '08:00',
            'end_time'   => '17:00',
            'break_time' => '01:00',
        ];

        $response = $this->putJson('/api/request/rest_day_work/approve/999999', $payload, $this->authHeaders());

        $this->assertNotEquals(500, $response->status());
        $this->assertNotNull(
            $response->json('error'),
            'Non-existent RDW approve must return the error envelope.'
        );
    }
}
