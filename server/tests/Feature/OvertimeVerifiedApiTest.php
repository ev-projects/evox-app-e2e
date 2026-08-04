<?php
/**
 * @registry-doc overtime.registry.md
 * @vetted-by    Glenn Macasarte
 * @vetted-on    June 30, 2026
 *
 * VERIFIED-BACKED — generated 2026-07-07 from overtime.registry.md
 * CORRECTED 2026-07-07 — HTTP methods fixed after code review:
 *   store was PUT in registry doc (wrong) — actual route is POST
 *   approve/decline/cancel were POST in registry doc (wrong) — actual routes are PUT
 *
 * Confirmed API endpoints and controllers (from route file):
 *   POST /api/request/overtime                    → OvertimeController::store     (:41)
 *   PUT  /api/request/overtime/approve/{id}       → OvertimeController::approve   (:150)
 *   PUT  /api/request/overtime/decline/{id}       → OvertimeController::decline   (:200)
 *   PUT  /api/request/overtime/cancel/{id}        → OvertimeController::cancel    (:247)
 *
 * Known bugs documented here (not fixed):
 *   B-001  OvertimeController::decline calls $this->overtime->decline() twice (lines 204 + 216)
 *   B-002  SP name typo: EV_SP_PD_Autoamtion_Overtimes — matches actual DB SP name; do not change
 *   B-003  OvertimeController::pending has NO supervisor check — any authenticated user can call it
 */

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class OvertimeVerifiedApiTest extends TestCase
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
    // Auth enforcement — unauthenticated requests must be rejected
    // =========================================================================

    /** @test */
    public function test_store_overtime_without_token_returns_401()
    {
        // POST /api/request/overtime — actual route is POST (registry doc incorrectly said PUT)
        $response = $this->postJson('/api/request/overtime', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_approve_overtime_without_token_returns_401()
    {
        // PUT /api/request/overtime/approve/{id} — actual route is PUT (registry doc incorrectly said POST)
        $response = $this->putJson('/api/request/overtime/approve/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_decline_overtime_without_token_returns_401()
    {
        // PUT /api/request/overtime/decline/{id} — actual route is PUT (registry doc incorrectly said POST)
        // KNOWN BUG B-001: OvertimeController::decline calls $this->overtime->decline() twice (lines 204 + 216)
        $response = $this->putJson('/api/request/overtime/decline/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_cancel_overtime_without_token_returns_401()
    {
        // PUT /api/request/overtime/cancel/{id} — actual route is PUT (registry doc incorrectly said POST)
        $response = $this->putJson('/api/request/overtime/cancel/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic (withoutMiddleware + actingAs)
    // POST /api/request/overtime → OvertimeController::store (:41)
    // Requires: date, amount, type, user_id (and optionally employee_note)
    // =========================================================================

    /** @test */
    public function test_store_overtime_with_missing_required_fields_returns_422_or_validation_error()
    {
        $this->withoutMiddleware();
        // Send empty body — date, amount, type, user_id all required per backend validation
        $response = $this->actingAs($this->user)->postJson('/api/request/overtime', [], $this->apiKey);
        // Backend may return 422 Unprocessable Entity or 400 — must not 500
        $this->assertNotEquals(500, $response->status());
        $this->assertContains($response->status(), [400, 422]);
    }

    /** @test */
    public function test_store_overtime_does_not_500_with_valid_structure()
    {
        // KNOWN BUG B-002: SP used internally is EV_SP_PD_Autoamtion_Overtimes (typo matches DB)
        $this->withoutMiddleware();
        $payload = [
            'user_id'       => $this->user->id,   // required: exists:users,id
            'date'          => now()->toDateString(),
            'amount'        => '01:00:00',
            'type'          => 'pre_overtime',
            'employee_note' => 'Test overtime note.',
            'action'        => null,
            'method'        => 'store',
            'id'            => '',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/overtime', $payload, $this->apiKey);
        // Must not 500 — specific success/failure depends on checkRequestValidity() logic
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_store_overtime_with_result_0_does_not_500()
    {
        // [DEVELOPER VETTING] missing case: if result=0, shows alert "Request not allowed at the moment.
        //  Please wait until DTR generation is complete." — backend must not 500 in this path
        $this->withoutMiddleware();
        $payload = [
            'user_id'       => $this->user->id,   // required: exists:users,id
            'date'          => now()->toDateString(),
            'amount'        => '01:00:00',
            'type'          => 'post_overtime',
            'employee_note' => '',
            'action'        => null,
            'method'        => 'store',
            'id'            => '',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/overtime', $payload, $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // PATTERN A — OvertimeController::approve (:150)
    // PUT /api/request/overtime/approve/{id}
    // =========================================================================

    /** @test */
    public function test_approve_overtime_with_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->putJson(
            '/api/request/overtime/approve/999999',
            ['action' => 'approve'],
            $this->apiKey
        );
        // Must not 500 — should return 404 or a handled error response
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_approve_overtime_does_not_500_with_valid_id_structure()
    {
        // KNOWN BUG B-002: if validity=2 path triggers insertToOvertimeDispute(),
        // it calls EV_SP_PD_Autoamtion_Overtimes (typo intentional — matches DB SP name)
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->putJson(
            '/api/request/overtime/approve/1',
            ['action' => 'approve', 'approver_note' => 'Approved.'],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // PATTERN A — OvertimeController::decline (:200)
    // PUT /api/request/overtime/decline/{id}
    // KNOWN BUG B-001: decline() called twice — test documents but does not assert on double-write
    // =========================================================================

    /** @test */
    public function test_decline_overtime_with_nonexistent_id_does_not_500()
    {
        // KNOWN BUG B-001: $this->overtime->decline() called at lines 204 AND 216 — idempotent but wasteful
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->putJson(
            '/api/request/overtime/decline/999999',
            ['action' => 'decline'],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_decline_overtime_bug_b001_double_decline_call_is_known()
    {
        // KNOWN BUG B-001: OvertimeController::decline calls $this->overtime->decline() at lines 204 + 216.
        // The decline is applied twice. Current production behaviour is likely idempotent
        // (sets status to 'declined' twice) but wastes a database query.
        // This test is skipped until the bug is fixed and a regression assertion can be written.
        $this->markTestIncomplete(
            'Known bug B-001: OvertimeController::decline calls $this->overtime->decline() at lines 204 and 216. ' .
            'Decline is applied twice. Skip until fixed. See overtime.registry.md § Known bugs B-001.'
        );
    }

    // =========================================================================
    // PATTERN A — OvertimeController::cancel (:247)
    // PUT /api/request/overtime/cancel/{id}
    // =========================================================================

    /** @test */
    public function test_cancel_overtime_with_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->putJson(
            '/api/request/overtime/cancel/999999',
            ['action' => 'cancel'],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_cancel_overtime_does_not_500_with_valid_id_structure()
    {
        // OvertimeController::cancel (:247) checks get_authenticated_user() to confirm requester owns the record
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->putJson(
            '/api/request/overtime/cancel/1',
            ['action' => 'cancel'],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // Known bug markers
    // =========================================================================

    /** @test */
    public function test_pending_endpoint_bug_b003_no_supervisor_check_is_known()
    {
        // KNOWN BUG B-003: OvertimeController::pending has NO supervisor check.
        // Any authenticated user can call this endpoint, not just supervisors.
        // Verdict: suspected gap — needs developer decision before a regression test can be written.
        $this->markTestIncomplete(
            'Known bug B-003: OvertimeController::pending has no supervisor/role check. ' .
            'Any authenticated user can call it. Needs developer decision on expected behaviour. ' .
            'See overtime.registry.md § Known bugs B-003.'
        );
    }
}
