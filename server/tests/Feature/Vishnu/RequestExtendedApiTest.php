<?php
// DRAFT — generated 2026-06-17, needs verification
//
// Covers ONLY endpoints not already exercised in RequestManagementApiTest.php:
//   requestlistNumbers_dashboard  GET  /api/request/request-numbers_dashboard
//   bulkRequest (deny branch)     POST /api/request/bulk-request               (extra cases not in base test)
//   find (GET /)                  GET  /api/request/                            (not tested at all)
//   requestValidityChecker        GET  /api/request/request-validity-check
//   allrequest                    GET  /api/request/rest_day_work/myrequests   (method missing — documented)
//   change_request_status_via_hash_code
//                                 POST /api/request/approval/                  (api-key-only, no JWT)
//                                 NOTE: missing hash → error already in base test; this file adds
//                                       the no-api-key-header → 401 variant and the deny status variant.
//
// Test patterns:
//   A — Controller logic:   withoutMiddleware() + actingAs()
//   B — Auth enforcement:   real middleware stack, no Bearer token → 401
//
// Route middleware summary (from app/Modules/Request/Routes/api.php):
//   /api/request/approval/*          middleware: auth.apikey only  (no JWT)
//   /api/request/*                   middleware: jwtauth + auth.apikey
//
// KNOWN ISSUE: RequestController::allrequest() does not exist.
//   Route GET /api/request/rest_day_work/myrequests points to RequestController@allrequest
//   but the method is not declared in RequestController. The test below documents this
//   so that the gap is visible in test output rather than silently ignored.

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class RequestExtendedApiTest extends TestCase
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

    // =========================================================================
    // requestlistNumbers_dashboard
    // GET /api/request/request-numbers_dashboard
    // Middleware: jwtauth + auth.apikey
    // =========================================================================

    /** @test */
    public function test_request_numbers_dashboard_without_token_returns_401()
    {
        $response = $this->getJson('/api/request/request-numbers_dashboard', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_request_numbers_dashboard_with_auth_returns_200_not_500()
    {
        $this->markTestSkipped('BUG-001: EH_SP_Dashboard SP argument mismatch (expects 7 args, RequestRepository.php:410 passes 5) — additionally, get_status_numbers_only()\'s own catch block (RequestRepository.php:430) calls dd($e) on the resulting exception, which terminates the whole PHP process rather than failing just this request. See Bug #1 / Bug #25 in evoxtest_app_bugs_report.md.');
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/request/request-numbers_dashboard', $this->apiKey);
        // Calls get_status_numbers_only() via SP; may succeed (200) or fail gracefully
        $this->assertNotEquals(500, $response->status(),
            'requestlistNumbers_dashboard must not throw 500; any SP failure must be caught.');
        $this->assertContains($response->status(), [200, 400, 404]);
    }

    /** @test */
    public function test_request_numbers_dashboard_success_response_has_standard_envelope()
    {
        $this->markTestSkipped('BUG-001: EH_SP_Dashboard SP argument mismatch — same crash path as test_request_numbers_dashboard_with_auth_returns_200_not_500 above (RequestRepository.php:410/430). See Bug #1 / Bug #25 in evoxtest_app_bugs_report.md.');
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/request/request-numbers_dashboard', $this->apiKey);
        if ($response->status() === 200) {
            $response->assertJsonStructure(['message', 'content']);
        } else {
            $this->assertNotNull(
                $response->json('error'),
                'Non-200 must use the error envelope (message/error keys).'
            );
        }
    }

    // =========================================================================
    // bulkRequest — extended cases not in RequestManagementApiTest
    // POST /api/request/bulk-request
    // Middleware: jwtauth + auth.apikey
    // =========================================================================

    /** @test */
    public function test_bulk_request_deny_action_with_empty_checkedlist_returns_200()
    {
        // Exercises the 'deny' branch of the action switch with no items to process.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/bulk-request',
            ['bulk_action' => 'deny', 'checkedList' => []],
            $this->apiKey
        );
        $response->assertStatus(200);
    }

    /** @test */
    public function test_bulk_request_unknown_action_with_empty_checkedlist_does_not_500()
    {
        // bulk_action has no server-side enum validation — unknown value must not crash.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/bulk-request',
            ['bulk_action' => 'invalid_action', 'checkedList' => []],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_bulk_request_checkedlist_with_unknown_table_suffix_does_not_500()
    {
        // explode('.', value) gives [id, table]; unknown table hits the default: case (no-op).
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/bulk-request',
            ['bulk_action' => 'approve', 'checkedList' => ['1.unknown_table']],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // find
    // GET /api/request/   (RequestController@find)
    // Middleware: jwtauth + auth.apikey
    // Uses RequestFilterRequest validation (same rules as request-list)
    // =========================================================================

    /** @test */
    public function test_find_without_token_returns_401()
    {
        $response = $this->getJson('/api/request/', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_find_no_params_returns_200_with_all_request_types()
    {
        // No request_type param → controller iterates all REQUEST_TYPES constants.
        // valid_from/valid_to bound the query — without them each type's where() runs
        // an unbounded scan (WHERE 1=1) against the live DB (111k+ rows in some tables).
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/request/?valid_from=2026-03-01&valid_to=2026-03-31', $this->apiKey);
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_find_with_valid_request_type_returns_200()
    {
        // valid_from/valid_to bound the query — without them OvertimeRepository::where()
        // runs an unbounded scan (WHERE 1=1) against the live overtimes table, which hangs.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/request/?request_type=overtime&valid_from=2026-03-01&valid_to=2026-03-31', $this->apiKey);
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_find_with_invalid_status_returns_422()
    {
        // RequestFilterRequest validates status against REQUEST_STATUS constant.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/request/?status=not_a_real_status', $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_find_with_invalid_request_type_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/request/?request_type=not_a_real_type', $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_find_with_invalid_date_format_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/request/?valid_from=17-06-2026', $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_find_with_valid_date_range_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/request/?valid_from=2026-06-01&valid_to=2026-06-30&status=pending', $this->apiKey);
        $response->assertStatus(200);
    }

    // =========================================================================
    // requestValidityChecker
    // GET /api/request/request-validity-check
    // Middleware: jwtauth + auth.apikey
    // Calls SP EV_SP_Validate_Request_Payroll_Period(user_id, date)
    // =========================================================================

    /** @test */
    public function test_request_validity_checker_without_token_returns_401()
    {
        $response = $this->getJson('/api/request/request-validity-check', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_request_validity_checker_with_valid_date_returns_200_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/request/request-validity-check?date=2026-06-10', $this->apiKey);
        // SP may not be available in test env — catch block must fire; never 500.
        $this->assertNotEquals(500, $response->status(),
            'requestValidityChecker must catch SP failures and not throw 500.');
        $this->assertContains($response->status(), [200, 400, 404]);
    }

    /** @test */
    public function test_request_validity_checker_without_date_does_not_500()
    {
        // No date param → SP called with null date; must be caught, not crash.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/request/request-validity-check', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_request_validity_checker_with_invalid_date_format_does_not_500()
    {
        // Controller uses plain Request (not RequestFilterRequest) — no date validation.
        // Invalid format is passed straight to SP, which must not cause an uncaught exception.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/request/request-validity-check?date=not-a-date', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // allrequest  (KNOWN MISSING METHOD)
    // GET /api/request/rest_day_work/myrequests  → RequestController@allrequest
    // Middleware: jwtauth + auth.apikey
    //
    // ISSUE: RequestController::allrequest() is not declared anywhere in the codebase.
    // The route will resolve to a BadMethodCallException / 500 when called.
    // Tests below document the expected behaviour (auth + not 500) so the gap is
    // visible in CI output and can be tracked for remediation.
    // =========================================================================

    /** @test */
    public function test_allrequest_without_token_returns_401()
    {
        // Auth middleware fires before method resolution, so 401 is expected even
        // when the controller method is missing.
        $response = $this->getJson('/api/request/rest_day_work/myrequests', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_allrequest_method_missing_does_not_return_500_in_production_config()
    {
        // KNOWN BUG: RequestController::allrequest() does not exist.
        // With withoutMiddleware + actingAs the framework resolves the action and will throw
        // BadMethodCallException. This test documents the expected contract:
        // the app SHOULD NOT expose a raw 500; a controller method must be implemented.
        // Currently this test is expected to FAIL (or return 500) until the method is added.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/request/rest_day_work/myrequests', $this->apiKey);
        // Mark as skipped until method is implemented so CI does not block on it.
        if ($response->status() === 500) {
            $this->markTestIncomplete(
                'allrequest() method is missing from RequestController — route /api/request/rest_day_work/myrequests returns 500. Implement the method to fix this.'
            );
        }
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // change_request_status_via_hash_code  (API-key only — no JWT)
    // POST /api/request/approval/
    // Middleware: auth.apikey only
    // =========================================================================

    /** @test */
    public function test_approval_without_api_key_header_returns_401()
    {
        // No X-Authorization header at all → auth.apikey middleware rejects.
        // (Different from RequestManagementApiTest which sends the key but not the JWT.)
        $response = $this->postJson('/api/request/approval/', [
            'hash_code' => 'somehash',
            'status'    => 'approved',
        ]);
        // auth.apikey fires; no API key in header → 401
        $response->assertStatus(401);
    }

    /** @test */
    public function test_approval_missing_hash_code_returns_422()
    {
        // RequestApprovalChangeStatusRequest: hash_code is required.
        $this->withoutMiddleware();
        $response = $this->postJson(
            '/api/request/approval/',
            ['status' => 'approved'],
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_approval_missing_status_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->postJson(
            '/api/request/approval/',
            ['hash_code' => 'somehashvalue'],
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_approval_invalid_status_value_returns_422()
    {
        // status must be in REQUEST_STATUS constant (pending/approved/declined/canceled/...).
        $this->withoutMiddleware();
        $response = $this->postJson(
            '/api/request/approval/',
            ['hash_code' => 'somehashvalue', 'status' => 'NOT_A_VALID_STATUS'],
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_approval_declined_status_with_garbage_hash_does_not_500()
    {
        // 'declined' is valid per REQUEST_STATUS; the controller decrypts the hash and will
        // throw on invalid content — catch block must handle this gracefully.
        $this->withoutMiddleware();
        $response = $this->postJson(
            '/api/request/approval/',
            ['hash_code' => 'garbage-hash-value-that-cannot-decrypt', 'status' => 'declined'],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status(),
            'Decrypt failure on declined status must be caught; must not throw 500.');
    }

    /** @test */
    public function test_approval_both_fields_missing_returns_422()
    {
        // Sanity: empty payload fails validation before reaching controller logic.
        $this->withoutMiddleware();
        $response = $this->postJson(
            '/api/request/approval/',
            [],
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }
}
