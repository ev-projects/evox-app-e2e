<?php
// VERIFIED-BACKED — generated 2026-07-07 from rest-day-work.registry.md (vetted by Glenn Macasarte on July 1, 2026)

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * @registry-doc rest-day-work.registry.md
 * @vetted-by Glenn Macasarte
 * @vetted-on July 1, 2026
 *
 * Confirmed API endpoints and controllers from [DEVELOPER VETTING]:
 *   POST   /api/request/rest_day_work            RestDayWorkController::store    (:37)
 *   PUT    /api/request/rest_day_work/approve/{id} RestDayWorkController::approve (:161)
 *   PUT    /api/request/rest_day_work/decline/{id} RestDayWorkController::decline (:204)
 *   PUT    /api/request/rest_day_work/cancel/{id}  RestDayWorkController::cancel  (:245)
 *
 * Known bugs (recorded, not fixed):
 *   B-001 Medium: approve() fallthrough — request_validity_checker returning false falls to regular-approve path
 *   B-002 Low:    updated_by assigned twice in RestDayWorkRepository::store() (harmless)
 *   B-003 Low:    SP name typo: EV_SP_PD_Autoamtion_RestDay
 *   B-004 Medium: sendRestDayWorkRequestChangeStatusEmail is an empty stub — no email on approve or decline
 */
class RestDayWorkVerifiedApiTest extends TestCase
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
    // POST /api/request/rest_day_work
    // RestDayWorkController::store (:37)
    // =========================================================================

    /** @test */
    public function test_store_rest_day_work_without_token_returns_401()
    {
        $response = $this->postJson('/api/request/rest_day_work', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // PUT /api/request/rest_day_work/approve/{id}
    // RestDayWorkController::approve (:161)
    // =========================================================================

    /** @test */
    public function test_approve_rest_day_work_without_token_returns_401()
    {
        $response = $this->putJson('/api/request/rest_day_work/approve/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // PUT /api/request/rest_day_work/decline/{id}
    // RestDayWorkController::decline (:204)
    // =========================================================================

    /** @test */
    public function test_decline_rest_day_work_without_token_returns_401()
    {
        $response = $this->putJson('/api/request/rest_day_work/decline/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // PUT /api/request/rest_day_work/cancel/{id}
    // RestDayWorkController::cancel (:245)
    // =========================================================================

    /** @test */
    public function test_cancel_rest_day_work_without_token_returns_401()
    {
        $response = $this->putJson('/api/request/rest_day_work/cancel/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic (withoutMiddleware + actingAs)
    // POST /api/request/rest_day_work — store with missing required fields returns 422
    // RestDayWorkController::store (:37)
    // =========================================================================

    /** @test */
    public function test_store_rest_day_work_with_missing_fields_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/rest_day_work',
            [],
            $this->apiKey
        );
        // Missing date, start_time, end_time, break_time — Laravel validation should reject
        $response->assertStatus(422);
    }

    /** @test */
    public function test_store_rest_day_work_with_valid_payload_does_not_500()
    {
        // B-002: updated_by is assigned twice in RestDayWorkRepository::store() — harmless duplicate
        $this->withoutMiddleware();
        $payload = [
            'date'          => date('Y-m-d'),
            'start_time'    => '08:00:00',
            'end_time'      => '17:00:00',
            'break_time'    => '01:00:00',
            'employee_note' => 'Test note',
            'method'        => 'store',
            'action'        => null,
        ];
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/rest_day_work',
            $payload,
            $this->apiKey
        );
        // Must not 500 — may be 200, 201, or 422 (e.g. if date is not a rest day)
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // PATTERN A — RestDayWorkController::approve (:161)
    // PUT /api/request/rest_day_work/approve/{id}
    // B-001: request_validity_checker returning false falls to regular-approve path
    // =========================================================================

    /** @test */
    public function test_approve_rest_day_work_nonexistent_id_does_not_500()
    {
        // B-001: approval of a request older than 30 days may silently fall through to regular path
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->putJson(
            '/api/request/rest_day_work/approve/999999',
            ['approver_note' => 'Approved'],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_approve_rest_day_work_is_known_bug_b001_fallthrough()
    {
        // B-001: When request_validity_checker returns false (request older than 30 days),
        // RestDayWorkController::approve() falls through to the regular-approve path instead
        // of the dispute path. This means old requests may be approved incorrectly.
        // The dispute SP (EV_SP_PD_Autoamtion_RestDay) is bypassed.
        $this->markTestIncomplete(
            'Known bug B-001: RestDayWorkController::approve() — request_validity_checker returning false ' .
            '(>30 days old) falls to regular-approve path. Dispute SP EV_SP_PD_Autoamtion_RestDay is skipped. ' .
            'Cannot be safely reproduced without a real >30-day-old request record.'
        );
    }

    // =========================================================================
    // PATTERN A — RestDayWorkController::decline (:204)
    // PUT /api/request/rest_day_work/decline/{id}
    // B-004: sendRestDayWorkRequestChangeStatusEmail is an empty stub
    // =========================================================================

    /** @test */
    public function test_decline_rest_day_work_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->putJson(
            '/api/request/rest_day_work/decline/999999',
            ['approver_note' => 'Declined'],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_decline_rest_day_work_email_is_known_bug_b004_empty_stub()
    {
        // B-004: sendRestDayWorkRequestChangeStatusEmail is an empty stub.
        // No email is sent to the employee on approve or decline.
        $this->markTestIncomplete(
            'Known bug B-004: sendRestDayWorkRequestChangeStatusEmail is an empty stub. ' .
            'Employees receive no notification on approve or decline. ' .
            'Requires email implementation to test.'
        );
    }

    // =========================================================================
    // PATTERN A — RestDayWorkController::cancel (:245)
    // PUT /api/request/rest_day_work/cancel/{id}
    // =========================================================================

    /** @test */
    public function test_cancel_rest_day_work_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->putJson(
            '/api/request/rest_day_work/cancel/999999',
            [],
            $this->apiKey
        );
        // Nonexistent ID — expect 404 or 422, must not 500
        $this->assertNotEquals(500, $response->status());
    }
}
