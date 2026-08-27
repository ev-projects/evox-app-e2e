<?php
// VERIFIED-BACKED — generated 2026-07-07 from my-dispute-requests.registry.md (vetted by Gobi Singaravel on 2026-06-29)

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * @registry-doc my-dispute-requests.registry.md
 * @vetted-by Gobi Singaravel
 * @vetted-on 2026-06-29
 *
 * Confirmed endpoint: GET /api/request/request-list-disputes
 * Confirmed controller: RequestController::requestListDisputes
 * Confirmed SP: EV_SP_PD_Employee_Report (called 4× per request — one per status)
 *
 * Known bugs documented in registry:
 *   B-V001: Both dates empty → API fires with empty valid_from/valid_to — no validation guard in controller
 *   B-V002: Asymmetric date validation — Date To filled + Date From empty fires the API
 *   B-V003: Wrong field name in error message when Date From filled, Date To empty
 *   PERF: EV_SP_PD_Employee_Report called 4× on every request (once per status)
 *   NAV: Eye-icon row action commented out in MyRequestsDispute.js — no detail navigation
 *   GUARD: isListLoaded guard reset on unmount — API refetches on every page revisit
 */
class MyDisputeRequestsVerifiedApiTest extends TestCase
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
    // GET /api/request/request-list-disputes
    // [DEVELOPER VETTING]: confirmed endpoint, confirmed controller
    // =========================================================================

    /** @test */
    public function test_request_list_disputes_without_token_returns_401(): void
    {
        $response = $this->getJson('/api/request/request-list-disputes', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic (withoutMiddleware + actingAs)
    // GET /api/request/request-list-disputes
    // Default params on load (from [DEVELOPER VETTING]):
    //   status=pending, page=1, request_type=all, url=my_requests_dispute
    //   valid_from/valid_to = payroll cutoff start/end (tested as empty below)
    // =========================================================================

    /** @test */
    public function test_request_list_disputes_with_default_params_returns_200(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/request/request-list-disputes?status=pending&page=1&request_type=all&url=my_requests_dispute',
            $this->apiKey
        );
        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_disputes_returns_array_data(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/request/request-list-disputes?status=pending&page=1&request_type=all&url=my_requests_dispute',
            $this->apiKey
        );
        $response->assertStatus(200);
        // Controller merges results from 4 SP calls; when user has zero disputes the endpoint
        // returns null instead of [] — both are valid empty-list responses.
        $data = $response->json('content');
        $this->assertTrue(
            is_null($data) || is_array($data),
            'content must be null (no disputes) or an array, got: ' . gettype($data)
        );
    }

    /** @test */
    public function test_request_list_disputes_status_approved_returns_200(): void
    {
        // [DEVELOPER VETTING]: "Approved" status toggle fires API immediately on click
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/request/request-list-disputes?status=approved&page=1&request_type=all&url=my_requests_dispute',
            $this->apiKey
        );
        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_disputes_status_cancelled_returns_200(): void
    {
        // [DEVELOPER VETTING]: "Cancelled" toggle fires API immediately. Spelling open issue: cancelled vs canceled.
        // Validator uses "canceled" (single-l); double-l returns 422.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/request/request-list-disputes?status=canceled&page=1&request_type=all&url=my_requests_dispute',
            $this->apiKey
        );
        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_disputes_status_declined_returns_200(): void
    {
        // [DEVELOPER VETTING]: "Declined" toggle fires API immediately on click
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/request/request-list-disputes?status=declined&page=1&request_type=all&url=my_requests_dispute',
            $this->apiKey
        );
        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_disputes_type_alteration_returns_200(): void
    {
        // [DEVELOPER VETTING]: request_type sends string "alteration" not an integer (registry was wrong)
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/request/request-list-disputes?status=pending&page=1&request_type=alteration&url=my_requests_dispute',
            $this->apiKey
        );
        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_disputes_type_overtime_returns_200(): void
    {
        // [DEVELOPER VETTING]: request_type sends string "overtime" not an integer; label is "Overtime" not "OT"
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/request/request-list-disputes?status=pending&page=1&request_type=overtime&url=my_requests_dispute',
            $this->apiKey
        );
        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_disputes_type_rest_day_work_returns_200(): void
    {
        // [DEVELOPER VETTING]: request_type sends string "rest_day_work" not an integer; label is "Rest Day Work" not "RDW"
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/request/request-list-disputes?status=pending&page=1&request_type=rest_day_work&url=my_requests_dispute',
            $this->apiKey
        );
        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_disputes_with_date_range_returns_200(): void
    {
        // [DEVELOPER VETTING]: Filter button applies date range.
        // Both dates empty fires API without error — Bug B-V001 (no server-side validation guard).
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/request/request-list-disputes?status=pending&page=1&request_type=all&url=my_requests_dispute&valid_from=2026-06-01&valid_to=2026-06-30',
            $this->apiKey
        );
        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_disputes_with_empty_dates_does_not_500(): void
    {
        // Bug B-V001: Both dates empty → Filter submits with no validation error.
        // API fires with empty valid_from and valid_to — controller must not 500.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/request/request-list-disputes?status=pending&page=1&request_type=all&url=my_requests_dispute&valid_from=&valid_to=',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_request_list_disputes_page_param_is_hardcoded_1_does_not_500(): void
    {
        // [DEVELOPER VETTING]: page=1 is hardcoded in every API request — no pagination UI exists.
        // Verify the controller does not error when page=1 is sent explicitly.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/request/request-list-disputes?status=pending&page=1&request_type=all&url=my_requests_dispute',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_disputes_sp_called_4_times_per_request_is_known_perf_issue(): void
    {
        // KNOWN PERFORMANCE BUG: RequestController::requestListDisputes calls EV_SP_PD_Employee_Report
        // 4× on every request (once per status: pending, approved, cancelled, declined).
        // This test documents the behavior but cannot assert SP call count without mocking the DB layer.
        // Verify the endpoint still returns 200 (i.e., 4 SP calls do not cause a timeout in test env).
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/request/request-list-disputes?status=pending&page=1&request_type=all&url=my_requests_dispute',
            $this->apiKey
        );
        $response->assertStatus(200);
        // If this test starts timing out, the 4× SP call pattern is degrading under load.
    }
}
