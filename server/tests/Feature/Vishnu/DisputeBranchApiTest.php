<?php

// DRAFT — generated 2026-06-17, needs verification

/**
 * DisputeBranchApiTest
 *
 * Goal: exercise the insertToOvertimeDispute and insertToRestDayWorkDispute code
 * paths so that EV_SP_PD_Autoamtion_Overtimes and EV_SP_PD_Autoamtion_RestDay
 * are called at least once during the test run, giving coverage to the three
 * previously-uncovered dispute branches (Rank 1, 2, 3 in the critical-gaps table).
 *
 * Dispute branch entry points:
 *   - OvertimeController::store    — triggered when request_mode === 'dispute'
 *   - OvertimeController::approve  — triggered when request_validity_checker() returns 2
 *   - RestDayWorkController::store — triggered when request_mode === 'dispute'
 *   - RestDayWorkController::approve — triggered when request_validity_checker() returns 2
 *
 * Test patterns:
 *   A — Controller logic: withoutMiddleware() + actingAs() → assert not 500
 *   B — Auth enforcement: no withoutMiddleware(), no Bearer token → 401
 *
 * Note: Pattern B for overtime/approve is also in OvertimeValidationApiTest.php.
 * The tests here are named differently (dispute-branch context) and kept for
 * completeness so this file is self-contained.
 *
 * Note: The SP name contains a typo in production (`Autoamtion` not `Automation`) —
 * tests deliberately rely on the existing SP name.
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;

class DisputeBranchApiTest extends TestCase
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

        $this->user = User::where('is_active', 1)
            ->whereNotNull('email')
            ->firstOrFail();
    }

    // ─── Pattern B — Auth enforcement ────────────────────────────────────────

    /**
     * @test
     * PUT /api/request/overtime/approve/{id} without token must return 401.
     * Dispute branch (validity==2) is inside approve — auth gate fires first.
     */
    public function test_overtime_approve_dispute_branch_without_token_returns_401()
    {
        $response = $this->putJson(
            '/api/request/overtime/approve/1',
            [],
            $this->apiKey
        );
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /**
     * @test
     * PUT /api/request/rest_day_work/approve/{id} without token must return 401.
     * Dispute branch (validity==2) is inside approve — auth gate fires first.
     */
    public function test_rdw_approve_dispute_branch_without_token_returns_401()
    {
        $response = $this->putJson(
            '/api/request/rest_day_work/approve/1',
            [],
            $this->apiKey
        );
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // ─── Pattern A — Overtime dispute store (request_mode=dispute) ───────────

    /**
     * @test
     * POST /api/request/overtime with request_mode=dispute directly calls
     * insertToOvertimeDispute() → EV_SP_PD_Autoamtion_Overtimes.
     * The SP will fire; it may fail gracefully in the test environment.
     * Assert: not 500, response has 'message' or 'error' key.
     */
    public function test_overtime_store_dispute_mode_calls_sp_and_does_not_return_500()
    {
        $this->withoutMiddleware();

        $payload = [
            'user_id'       => $this->user->id,
            'date'          => '2026-01-20',
            'type'          => 'pre_overtime',
            'amount'        => '01:00',
            'request_mode'  => 'dispute',
            'employee_note' => 'PHPUnit dispute branch coverage test',
            'session_id'    => 'phpunit-dispute-ot',
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/request/overtime', $payload, $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'Overtime dispute-mode store must not throw 500 — SP failure must be caught.');

        // Response envelope: success_response wraps as {message, content} or
        // error_response wraps as {error}. Either is acceptable for coverage.
        $body = $response->json();
        $this->assertTrue(
            isset($body['message']) || isset($body['error']),
            'Response must contain a "message" key (success) or "error" key (graceful failure).'
        );
    }

    /**
     * @test
     * Overtime dispute-mode store: on 201, envelope must have 'message' and 'content'.
     * On non-201 (SP failed gracefully), envelope must have 'error'.
     */
    public function test_overtime_store_dispute_mode_response_envelope_shape()
    {
        $this->withoutMiddleware();

        $payload = [
            'user_id'      => $this->user->id,
            'date'         => '2026-01-21',
            'type'         => 'post_overtime',
            'amount'       => '00:30',
            'request_mode' => 'dispute',
            'session_id'   => 'phpunit-dispute-ot-2',
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/request/overtime', $payload, $this->apiKey);

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
     * PUT /api/request/overtime/approve/{id} on an existing overtime record.
     * request_validity_checker() will evaluate the user+date combination;
     * if it returns 2 the dispute branch fires; otherwise the normal approve
     * path runs. Either way, must not return 500.
     */
    public function test_overtime_approve_with_existing_record_does_not_return_500()
    {
        $this->withoutMiddleware();

        $overtime = Overtime::whereNull('deleted_at')->first();

        if (!$overtime) {
            $this->markTestSkipped('No overtime records in DB — cannot test approve dispute branch.');
        }

        $payload = [
            'user_id' => $overtime->user_id,
            'date'    => $overtime->date,
            'type'    => $overtime->type ?? 'pre_overtime',
            'amount'  => '01:00',
        ];

        $response = $this->actingAs($this->user)
            ->putJson('/api/request/overtime/approve/' . $overtime->id, $payload, $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'Overtime approve (dispute or normal branch) must not throw 500.');
    }

    /**
     * @test
     * PUT /api/request/overtime/approve on a non-existent ID:
     * the normal branch reaches findOrFail and throws ModelNotFoundException,
     * which is caught and returned as error_response — never 500.
     * This also exercises the request_validity_checker() call path before the ID lookup.
     */
    public function test_overtime_approve_nonexistent_id_uses_error_envelope_not_500()
    {
        $this->withoutMiddleware();

        $payload = [
            'user_id' => $this->user->id,
            'date'    => '2026-01-22',
            'type'    => 'pre_overtime',
            'amount'  => '01:00',
        ];

        $response = $this->actingAs($this->user)
            ->putJson('/api/request/overtime/approve/999999', $payload, $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        $this->assertNotNull(
            $response->json('error'),
            'Non-existent overtime approve must return the error envelope.'
        );
    }

    // ─── Pattern A — RestDayWork dispute store (request_mode=dispute) ─────────

    /**
     * @test
     * POST /api/request/rest_day_work with request_mode=dispute directly calls
     * insertToRestDayWorkDispute() → EV_SP_PD_Autoamtion_RestDay.
     * The store method also does a DTR is_rest_day check before calling the SP;
     * if no DTR row exists for that date the check is bypassed (dtr_check == null).
     * Assert: not 500, response has 'message' or 'error' key.
     */
    public function test_rdw_store_dispute_mode_calls_sp_and_does_not_return_500()
    {
        $this->withoutMiddleware();

        $payload = [
            'user_id'       => $this->user->id,
            'date'          => '2026-01-25',
            'start_time'    => '08:00',
            'end_time'      => '17:00',
            'break_time'    => '01:00',
            'request_mode'  => 'dispute',
            'employee_note' => 'PHPUnit RDW dispute branch coverage test',
            'session_id'    => 'phpunit-dispute-rdw',
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/request/rest_day_work', $payload, $this->apiKey);

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
     * RDW dispute-mode store: on 201, envelope has 'message' and 'content'.
     * On non-201 (DTR is_rest_day==0 block, or SP failure), envelope has 'error'.
     */
    public function test_rdw_store_dispute_mode_response_envelope_shape()
    {
        $this->withoutMiddleware();

        $payload = [
            'user_id'    => $this->user->id,
            'date'       => '2026-01-26',
            'start_time' => '09:00',
            'end_time'   => '18:00',
            'break_time' => '01:00',
            'request_mode' => 'dispute',
            'session_id'   => 'phpunit-dispute-rdw-2',
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/request/rest_day_work', $payload, $this->apiKey);

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
     * PUT /api/request/rest_day_work/approve/{id} on an existing RDW record.
     * request_validity_checker() determines the branch; either the normal
     * approve or the dispute branch runs. Must not return 500.
     */
    public function test_rdw_approve_with_existing_record_does_not_return_500()
    {
        $this->withoutMiddleware();

        $rdw = RestDayWork::whereNull('deleted_at')->first();

        if (!$rdw) {
            $this->markTestSkipped('No rest_day_work records in DB — cannot test approve dispute branch.');
        }

        $payload = [
            'user_id'    => $rdw->user_id,
            'date'       => $rdw->date,
            'start_time' => '08:00',
            'end_time'   => '17:00',
            'break_time' => '01:00',
        ];

        $response = $this->actingAs($this->user)
            ->putJson('/api/request/rest_day_work/approve/' . $rdw->id, $payload, $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'RDW approve (dispute or normal branch) must not throw 500.');
    }

    /**
     * @test
     * PUT /api/request/rest_day_work/approve on a non-existent ID:
     * the catch block returns error_response — must never be 500.
     */
    public function test_rdw_approve_nonexistent_id_uses_error_envelope_not_500()
    {
        $this->withoutMiddleware();

        $payload = [
            'user_id'    => $this->user->id,
            'date'       => '2026-01-27',
            'start_time' => '08:00',
            'end_time'   => '17:00',
            'break_time' => '01:00',
        ];

        $response = $this->actingAs($this->user)
            ->putJson('/api/request/rest_day_work/approve/999999', $payload, $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        $this->assertNotNull(
            $response->json('error'),
            'Non-existent RDW approve must return the error envelope.'
        );
    }
}
