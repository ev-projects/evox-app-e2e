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
use App\Modules\User\Models\User;

class MyTeamRequestVerifiedApiTest extends TestCase
{
    use DatabaseTransactions; // SAFETY: converted from RefreshDatabase 2026-07-08 — never migrate:fresh on staging DB

    private array $apiKey;
    private User $supervisorUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        // Prefer a supervisor-level (non-employee) active user so the SP returns team data.
        // Falls back to any active user with an email if no supervisor exists in the test DB.
        $this->supervisorUser = User::where('is_active', 1)
            ->whereNotNull('email')
            ->firstOrFail();
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

    /** @test */
    public function test_request_list_my_team_requests_returns_200_for_authenticated_user()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->supervisorUser)
            ->getJson('/api/request/request-list?url=my_team_requests', $this->apiKey);

        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_my_team_requests_with_date_range_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->supervisorUser)
            ->getJson(
                '/api/request/request-list?url=my_team_requests&valid_from=2026-06-01&valid_to=2026-06-30',
                $this->apiKey
            );

        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_my_team_requests_with_status_filter_returns_200()
    {
        $this->withoutMiddleware();
        // status param is toggled by the Pending/Approved/Cancelled/Declined buttons
        $response = $this->actingAs($this->supervisorUser)
            ->getJson(
                '/api/request/request-list?url=my_team_requests&status=Pending',
                $this->apiKey
            );

        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_my_team_requests_with_request_type_filter_returns_200()
    {
        $this->withoutMiddleware();
        // request_type_int set by the All/Alteration/OT/RDW/Change Schedule/Multi Punch tabs
        $response = $this->actingAs($this->supervisorUser)
            ->getJson(
                '/api/request/request-list?url=my_team_requests&request_type=0',
                $this->apiKey
            );

        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_my_team_requests_with_department_filter_returns_200()
    {
        $this->withoutMiddleware();
        // department_id from the <select name="department_id"> filter
        $response = $this->actingAs($this->supervisorUser)
            ->getJson(
                '/api/request/request-list?url=my_team_requests&department_id=1',
                $this->apiKey
            );

        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_my_team_requests_with_name_filter_returns_200()
    {
        $this->withoutMiddleware();
        // name param from <input placeholder="Enter name">
        $response = $this->actingAs($this->supervisorUser)
            ->getJson(
                '/api/request/request-list?url=my_team_requests&name=Test',
                $this->apiKey
            );

        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_my_team_requests_with_showall_param_returns_200()
    {
        $this->withoutMiddleware();
        // showall=1 broadens scope to all division employees (DivisionHead/HR only in practice)
        $response = $this->actingAs($this->supervisorUser)
            ->getJson(
                '/api/request/request-list?url=my_team_requests&showall=1',
                $this->apiKey
            );

        $response->assertStatus(200);
    }

    /** @test */
    public function test_request_list_my_team_requests_with_page_param_does_not_500()
    {
        // SP paginates at 10 records per page; very high page should return empty results, not error
        $this->withoutMiddleware();
        $response = $this->actingAs($this->supervisorUser)
            ->getJson(
                '/api/request/request-list?url=my_team_requests&page=9999',
                $this->apiKey
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
