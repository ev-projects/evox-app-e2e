<?php
/**
 * @registry-doc my-team-request.registry.md
 * @vetted-by    Glenn Macasarte
 * @vetted-on    July 3, 2026
 *
 * VERIFIED-BACKED — generated 2026-07-07 from my-team-request.registry.md
 * Covers confirmed API endpoints + controller methods from [DEVELOPER VETTING].
 *
 * Confirmed endpoints:
 *   GET  /api/request/request-list?url=my_team_requests  → RequestController::requestlist
 *   POST /api/request/bulk-request/                      → RequestController::bulkRequest
 */

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;

class MyTeamRequestVerifiedApiTest extends TestCase
{
    use DatabaseTransactions; // SAFETY: converted from RefreshDatabase 2026-07-08 — never migrate:fresh on staging DB

    private array $apiKey;
    private User $supervisorUser;
    private string $validFrom;
    private string $validTo;

    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Support\Facades\Cache::flush(); // clear rate-limiter between tests
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        // SP EH_SP_My_Team_Request requires supervisor (LevelId > 0); load Gary Aure (LevelId=1, sub-dept 403)
        $this->supervisorUser = User::where('email', env('E2E_USER_SUPERVISOR_PHILIPPINES', 'gary.aure@eastvantage.com'))->firstOrFail();

        $cutoff = DB::table('payroll_cutoffs')
            ->whereNull('deleted_at')
            ->whereRaw('CURDATE() BETWEEN start_date AND end_date')
            ->select('start_date', 'end_date')
            ->first();
        $this->validFrom = $cutoff ? $cutoff->start_date : '2026-03-01';
        $this->validTo   = $cutoff ? $cutoff->end_date   : '2026-03-31';
    }

    // =========================================================================
    // Auth enforcement
    // GET /api/request/request-list?url=my_team_requests
    // =========================================================================

    /** @test */
    public function test_request_list_my_team_requests_without_token_returns_401()
    {
        $response = $this->getJson(
            '/api/request/request-list?url=my_team_requests',
            $this->apiKey
        );
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // Auth enforcement
    // POST /api/request/bulk-request/
    // =========================================================================

    /** @test */
    public function test_bulk_request_without_token_returns_401()
    {
        $response = $this->postJson(
            '/api/request/bulk-request/',
            ['checkedList' => [], 'bulk_action' => 'Approved'],
            $this->apiKey
        );
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // Controller logic
    // GET /api/request/request-list?url=my_team_requests
    // RequestController::requestlist → branches on url='my_team_requests'
    // → EH_SP_My_Team_Request(user_id, LevelId, valid_from, valid_to,
    //                         request_type_int, status, department_id, name,
    //                         0, page, 10, departmentselect, showall)
    // =========================================================================

    /** Real JWT Bearer token headers for authenticated requests.
     *  actingAs() is unreliable with tymon/jwt-auth when the guard reinitialises per request. */
    private function jwtHeaders(): array
    {
        $token = auth('api')->login($this->supervisorUser);
        return [
            'Authorization'   => "Bearer {$token}",
            'X-Authorization' => $this->apiKey['X-Authorization'],
        ];
    }

    /** @test */
    public function test_request_list_my_team_requests_returns_200_for_authenticated_user()
    {
        $response = $this->getJson(
            '/api/request/request-list?url=my_team_requests&request_type=all&department_id=403',
            $this->jwtHeaders()
        );

        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_my_team_requests_with_date_range_returns_200()
    {
        $response = $this->getJson(
            "/api/request/request-list?url=my_team_requests&valid_from={$this->validFrom}&valid_to={$this->validTo}&request_type=all&department_id=403",
            $this->jwtHeaders()
        );

        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_my_team_requests_with_status_filter_returns_200()
    {
        // status param is toggled by the Pending/Approved/Cancelled/Declined buttons
        // REQUEST_STATUS values are lowercase (confirmed from constants.php)
        $response = $this->getJson(
            '/api/request/request-list?url=my_team_requests&status=pending&request_type=all&department_id=403',
            $this->jwtHeaders()
        );

        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_my_team_requests_with_request_type_filter_returns_200()
    {
        // request_type set by the All/Alteration/OT/RDW/Change Schedule/Multi Punch tabs
        // RequestFilterRequest validates request_type as string ('all','alteration','overtime',etc)
        $response = $this->getJson(
            '/api/request/request-list?url=my_team_requests&request_type=all&department_id=403',
            $this->jwtHeaders()
        );

        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_my_team_requests_with_department_filter_returns_200()
    {
        // department_id from the <select name="department_id"> filter
        $response = $this->getJson(
            '/api/request/request-list?url=my_team_requests&department_id=403&request_type=all',
            $this->jwtHeaders()
        );

        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_my_team_requests_with_name_filter_returns_200()
    {
        // name param from <input placeholder="Enter name">
        $response = $this->getJson(
            '/api/request/request-list?url=my_team_requests&name=Test&request_type=all&department_id=403',
            $this->jwtHeaders()
        );

        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_my_team_requests_with_showall_param_returns_200()
    {
        // showall=1 broadens scope to all division employees (DivisionHead/HR only in practice)
        $response = $this->getJson(
            '/api/request/request-list?url=my_team_requests&showall=1&request_type=all&department_id=403',
            $this->jwtHeaders()
        );

        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_my_team_requests_with_page_param_does_not_500()
    {
        // SP paginates at 10 records per page; very high page should return empty results, not error
        $response = $this->getJson(
            '/api/request/request-list?url=my_team_requests&page=9999&request_type=all&department_id=403',
            $this->jwtHeaders()
        );

        $this->assertNotEquals(500, $response->status());
        $response->assertStatus(200);
    }

    // =========================================================================
    // Controller logic
    // POST /api/request/bulk-request/
    // RequestController::bulkRequest
    // → iterates checkedList by table_name (overtimes, alter_logs, alter_log_punches,
    //   change_schedules, rest_day_works)
    // → per-item validity check → if dispute (result=2): EV_SP_PD_Autoamtion_{type}
    //                           → if valid (result=1): ApprovalTrait::approve()
    // =========================================================================

    /** @test */
    public function test_bulk_request_with_empty_checked_list_returns_200_or_validation_error()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->supervisorUser)
            ->postJson(
                '/api/request/bulk-request/',
                ['checkedList' => [], 'bulk_action' => 'Approved'],
                $this->apiKey
            );

        // An empty checkedList should not cause a 500 — it either processes with no-op or returns
        // a validation message. Either 200 or 422 is acceptable; 500 is not.
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_bulk_request_with_invalid_id_format_does_not_500()
    {
        $this->withoutMiddleware();
        // Each item in checkedList must be in the format "{id}.{table_name}".
        // Sending a malformed value should be handled gracefully.
        $response = $this->actingAs($this->supervisorUser)
            ->postJson(
                '/api/request/bulk-request/',
                ['checkedList' => ['not-a-valid-format'], 'bulk_action' => 'Approved'],
                $this->apiKey
            );

        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_bulk_request_deny_action_with_empty_list_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->supervisorUser)
            ->postJson(
                '/api/request/bulk-request/',
                ['checkedList' => [], 'bulk_action' => 'Deny'],
                $this->apiKey
            );

        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_bulk_request_missing_bulk_action_does_not_500()
    {
        $this->withoutMiddleware();
        // bulk_action is required for controller routing; missing it should return validation error, not 500
        $response = $this->actingAs($this->supervisorUser)
            ->postJson(
                '/api/request/bulk-request/',
                ['checkedList' => []],
                $this->apiKey
            );

        $this->assertNotEquals(500, $response->status());
    }
}
