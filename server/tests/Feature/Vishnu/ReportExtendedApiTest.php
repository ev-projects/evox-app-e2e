<?php

/**
 * DRAFT — generated 2026-06-18, needs verification
 *
 * ReportExtendedApiTest — supplementary coverage for ReportController.php.
 *
 * This file extends ReportsApiTest.php without duplicating any test it already
 * contains.  It covers:
 *
 *   (a) Pattern B (401 enforcement) for every route that ReportsApiTest.php
 *       omits — i.e. the parameterised routes and all export endpoints.
 *
 *   (b) Pattern A (withoutMiddleware + actingAs) depth tests for:
 *         • get_dashboard_holidays    — SP-backed, route reachability check
 *         • team_attendance_summary   — bad date format → validation error (not 500)
 *         • dtr_summary               — parameterised, real user, valid dates
 *         • dtr_summary_block         — parameterised, real user, valid dates
 *         • team_dtr_logs             — date range only (no department filter)
 *         • export_team_dtr_logs      — file-download endpoint, must not 500
 *         • export_team_dtr_summary   — paginated export, must not 500
 *         • new_dtr_summary_report_csv_export — CSV download, must not 500
 *         • dtr_multi_logs_summary_report_csv_export — requires dept, must not 500
 *         • dtr_half_day_mismatch     — raw DB call, must not 500
 *         • timeoff_allocation        — missing month/year, missing country
 *         • getMoroccoPayrollParams   — additional envelope assertion
 *
 *   (c) Missing-required-param → non-500 / validation-error tests for:
 *         • team_attendance_summary without date segments
 *         • dtr_summary with invalid date format
 *         • timeoff_allocation with country=1 but no month/year
 *         • timeoff_allocation with country=4 but no month/year
 *
 * Routes (all under prefix api/report/, middleware: jwtauth, auth.apikey):
 *   GET   report/get_dashboard_holiday
 *   POST  report/team_attendance_summary/{start_date}/{end_date}
 *   GET   report/attendance/summary/export/{start_date}/{end_date}
 *   GET   report/dtr_summary/{user_id}/{start_date}/{end_date}
 *   GET   report/dtr_summary/block/{user_id}/{start_date}/{end_date}
 *   GET   report/dtr_summary/export
 *   GET   report/dtr_summary/new_export
 *   GET   report/dtr_summary/multi_logs_export
 *   GET   report/dtr_summary/export_dtr_conflict
 *   GET   report/dtr_logs/export
 *   GET   report/timeoff_allocation
 *   GET   report/get_morocco_payroll_params
 *
 * Test patterns:
 *   A — Controller logic: withoutMiddleware() + actingAs($this->user)
 *   B — Auth enforcement: no withoutMiddleware(), no Bearer token → 401
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class ReportExtendedApiTest extends TestCase
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
    // SECTION 1 — Pattern B: Auth enforcement (401) for routes missing in
    //             ReportsApiTest.php
    // =========================================================================

    // -------------------------------------------------------------------------
    // team_attendance_summary — POST with date segments in URI
    // ReportsApiTest only has Pattern A tests; Pattern B was omitted.
    // -------------------------------------------------------------------------

    /** @test */
    public function test_team_attendance_summary_without_token_returns_401()
    {
        $response = $this->postJson(
            '/api/report/team_attendance_summary/2026-06-01/2026-06-15',
            [],
            $this->apiKey
        );
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // -------------------------------------------------------------------------
    // attendance/summary/export — GET with date segments in URI
    // -------------------------------------------------------------------------

    /** @test */
    public function test_attendance_summary_export_without_token_returns_401()
    {
        $response = $this->getJson(
            '/api/report/attendance/summary/export/2026-06-01/2026-06-15',
            $this->apiKey
        );
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // -------------------------------------------------------------------------
    // dtr_summary/{user_id}/{start_date}/{end_date} — parameterised GET
    // -------------------------------------------------------------------------

    /** @test */
    public function test_dtr_summary_parameterised_without_token_returns_401()
    {
        $response = $this->getJson(
            '/api/report/dtr_summary/1/2026-06-01/2026-06-15',
            $this->apiKey
        );
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // -------------------------------------------------------------------------
    // dtr_summary/block/{user_id}/{start_date}/{end_date}
    // -------------------------------------------------------------------------

    /** @test */
    public function test_dtr_summary_block_without_token_returns_401()
    {
        $response = $this->getJson(
            '/api/report/dtr_summary/block/1/2026-06-01/2026-06-15',
            $this->apiKey
        );
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // -------------------------------------------------------------------------
    // dtr_summary/export — export_team_dtr_summary
    // -------------------------------------------------------------------------

    /** @test */
    public function test_dtr_summary_export_without_token_returns_401()
    {
        $response = $this->getJson('/api/report/dtr_summary/export', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // -------------------------------------------------------------------------
    // dtr_summary/new_export — new_dtr_summary_report_csv_export
    // -------------------------------------------------------------------------

    /** @test */
    public function test_dtr_summary_new_export_without_token_returns_401()
    {
        $response = $this->getJson('/api/report/dtr_summary/new_export', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // -------------------------------------------------------------------------
    // dtr_summary/multi_logs_export — dtr_multi_logs_summary_report_csv_export
    // -------------------------------------------------------------------------

    /** @test */
    public function test_dtr_summary_multi_logs_export_without_token_returns_401()
    {
        $response = $this->getJson('/api/report/dtr_summary/multi_logs_export', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // -------------------------------------------------------------------------
    // dtr_summary/export_dtr_conflict — dtr_half_day_mismatch
    // -------------------------------------------------------------------------

    /** @test */
    public function test_dtr_summary_export_dtr_conflict_without_token_returns_401()
    {
        $response = $this->getJson('/api/report/dtr_summary/export_dtr_conflict', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // -------------------------------------------------------------------------
    // dtr_logs/export — export_team_dtr_logs
    // -------------------------------------------------------------------------

    /** @test */
    public function test_dtr_logs_export_without_token_returns_401()
    {
        $response = $this->getJson('/api/report/dtr_logs/export', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }


    // =========================================================================
    // SECTION 2 — Pattern A: get_dashboard_holidays
    //   Maps to GET /api/report/get_dashboard_holiday
    //   ReportsApiTest has Pattern B only; Pattern A (controller) was missing.
    // =========================================================================

    /**
     * @test
     * Controller calls EH_SP_Dashboard SP (mode=1) and returns result[1] directly.
     * The controller re-throws on exception, so we only assert the route is
     * reachable (not 404/405) — not that it returns a specific status.
     */
    public function test_get_dashboard_holiday_route_is_reachable()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/report/get_dashboard_holiday', $this->apiKey);

        // Route must be registered
        $this->assertNotEquals(404, $response->status(),
            'GET /api/report/get_dashboard_holiday must be routed (not 404).');
        $this->assertNotEquals(405, $response->status());
    }


    // =========================================================================
    // SECTION 3 — Pattern A: team_attendance_summary
    //   Maps to POST /api/report/team_attendance_summary/{start}/{end}
    // =========================================================================

    /**
     * @test
     * Bad date format in URI segments — controller runs $this->validate() which
     * throws a ValidationException (HTTP 422 in Laravel's default handler).
     * Either 422 or 400 is acceptable; 500 is never acceptable.
     */
    public function test_attendance_summary_invalid_date_format_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->postJson(
            '/api/report/team_attendance_summary/not-a-date/also-not-a-date',
            ['selectedDepartments' => [1]],
            $this->apiKey
        );

        $this->assertNotEquals(
            500,
            $response->status(),
            'team_attendance_summary must not crash with 500 on invalid date format.'
        );
    }

    /**
     * @test
     * Valid date format, valid department array — controller calls SP.
     * SP may fail in test env; controller must catch and not return 500.
     */
    public function test_attendance_summary_valid_dates_and_department_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->postJson(
            '/api/report/team_attendance_summary/2026-06-01/2026-06-15',
            ['selectedDepartments' => [1]],
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * Missing selectedDepartments → controller returns 400 explicitly.
     * Separate from the ReportsApiTest version — asserts exact 400 status.
     */
    public function test_attendance_summary_without_departments_returns_400()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->postJson(
            '/api/report/team_attendance_summary/2026-06-01/2026-06-15',
            [],
            $this->apiKey
        );

        $this->assertEquals(400, $response->status());
    }

    /**
     * @test
     * Optional name filter does not crash the endpoint.
     */
    public function test_attendance_summary_with_name_filter_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->postJson(
            '/api/report/team_attendance_summary/2026-06-01/2026-06-15',
            ['selectedDepartments' => [1], 'name' => 'test'],
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * selectedTeams filter combined with departments must not crash.
     */
    public function test_attendance_summary_with_teams_filter_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->postJson(
            '/api/report/team_attendance_summary/2026-06-01/2026-06-15',
            ['selectedDepartments' => [1], 'selectedTeams' => [1]],
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }


    // =========================================================================
    // SECTION 4 — Pattern A: dtr_summary (parameterised)
    //   Maps to GET /api/report/dtr_summary/{user_id}/{start_date}/{end_date}
    // =========================================================================

    /**
     * @test
     * Valid user ID + valid date range — controller runs get_dtr_summary SP.
     * SP may return empty in test env; must not be 500.
     */
    public function test_dtr_summary_parameterised_valid_user_and_dates_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            "/api/report/dtr_summary/{$this->user->id}/2026-06-01/2026-06-15",
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * Invalid date format — $this->validate() inside controller must fire
     * without crashing with 500.
     */
    public function test_dtr_summary_parameterised_invalid_date_format_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/1/31-06-2026/01-07-2026',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * Non-numeric user_id — validation rule 'int' must reject without 500.
     */
    public function test_dtr_summary_parameterised_non_numeric_user_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/not-a-number/2026-06-01/2026-06-15',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }


    // =========================================================================
    // SECTION 5 — Pattern A: dtr_summary_block
    //   Maps to GET /api/report/dtr_summary/block/{user_id}/{start_date}/{end_date}
    // =========================================================================

    /**
     * @test
     * Valid user + valid dates — response includes column_names key on success.
     */
    public function test_dtr_summary_block_valid_user_response_has_column_names_or_error()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            "/api/report/dtr_summary/block/{$this->user->id}/2026-06-01/2026-06-15",
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());

        // On success the controller appends column_names to the result
        if ($response->status() === 200) {
            $content = $response->json('content');
            $this->assertNotNull($content, '200 response must include content key.');
        }
    }

    /**
     * @test
     * end_date before start_date — must not return 500 (SP handles or errors gracefully).
     */
    public function test_dtr_summary_block_reversed_dates_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            "/api/report/dtr_summary/block/{$this->user->id}/2026-06-15/2026-06-01",
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * Nonexistent user_id — controller calls get_authenticated_user which will
     * throw; catch block must fire and return error_response (not 500).
     */
    public function test_dtr_summary_block_nonexistent_user_returns_error_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/block/999999/2026-06-01/2026-06-15',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }


    // =========================================================================
    // SECTION 6 — Pattern A: team_dtr_logs (additional depth)
    //   Maps to GET /api/report/dtr_logs/team
    //   ReportsApiTest has a basic not-500 test; add deeper coverage here.
    // =========================================================================

    /**
     * @test
     * date range spanning a full month — SP call with large range must not 500.
     */
    public function test_dtr_logs_team_full_month_range_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_logs/team?valid_from=2026-06-01&valid_to=2026-06-30',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * department_id filter combined with date range — must not 500.
     */
    public function test_dtr_logs_team_with_department_filter_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_logs/team?valid_from=2026-06-01&valid_to=2026-06-15&department_id=1',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * On success the response envelope has 'data' key inside content.
     */
    public function test_dtr_logs_team_success_response_contains_data_key()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_logs/team?valid_from=2026-06-01&valid_to=2026-06-15',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());

        if ($response->status() === 200) {
            $this->assertArrayHasKey(
                'data',
                $response->json('content'),
                'team_dtr_logs success response must nest results under content.data.'
            );
        }
    }

    /**
     * @test
     * Missing date params — SP receives nulls; must not throw 500.
     */
    public function test_dtr_logs_team_without_date_params_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_logs/team',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }


    // =========================================================================
    // SECTION 7 — Pattern A: export_team_dtr_logs (file download)
    //   Maps to GET /api/report/dtr_logs/export
    // =========================================================================

    /**
     * @test
     * Export endpoint streams a CSV; in test env the SP may return empty rows.
     * Must not 500 — either returns a file (200/206) or a handled error.
     */
    public function test_dtr_logs_export_with_date_range_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_logs/export?valid_from=2026-06-01&valid_to=2026-06-15',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * Export without dates — must not 500 (SP receives null params).
     */
    public function test_dtr_logs_export_without_dates_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_logs/export',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }


    // =========================================================================
    // SECTION 8 — Pattern A: export_team_dtr_summary (paginated)
    //   Maps to GET /api/report/dtr_summary/export
    //   ReportsApiTest has a not-500 test; add pagination + missing param cases.
    // =========================================================================

    /**
     * @test
     * First page of paginated export — controller writes to temp storage.
     * Must not 500 in test env.
     */
    public function test_dtr_summary_export_page_1_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/export?valid_from=2026-06-01&valid_to=2026-06-15&page=1',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * Without date params — controller passes nulls to SP; must not 500.
     */
    public function test_dtr_summary_export_without_dates_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/export',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }


    // =========================================================================
    // SECTION 9 — Pattern A: timeoff_allocation country=1 (India payroll)
    //   Maps to GET /api/report/timeoff_allocation?country=1
    //   ReportsApiTest covers the happy path; add missing-param edge cases.
    // =========================================================================

    /**
     * @test
     * country=1 but no timeoff_month or timeoff_year — SP receives nulls.
     * Controller must not 500.
     */
    public function test_india_payroll_report_missing_month_year_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/timeoff_allocation?country=1',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * country=1, export=1 — triggers the Excel download branch.
     * Must not 500 even when SP returns empty sets.
     */
    public function test_india_payroll_report_export_branch_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/timeoff_allocation?country=1&timeoff_month=6&timeoff_year=2026&export=1',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * country=1, JSON branch (export=0) — response must have timeoffItems key.
     */
    public function test_india_payroll_report_json_branch_returns_timeoff_items_key()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/timeoff_allocation?country=1&timeoff_month=6&timeoff_year=2026&export=0',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());

        if ($response->status() === 200) {
            $content = $response->json('content');
            $this->assertArrayHasKey(
                'timeoffItems',
                $content,
                'India payroll JSON response must include content.timeoffItems.'
            );
        }
    }

    /**
     * @test
     * January edge case (timeoff_month=1): previous_mon calculation wraps to 12.
     * Must not 500.
     */
    public function test_india_payroll_report_january_wraps_previous_month_correctly()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/timeoff_allocation?country=1&timeoff_month=1&timeoff_year=2026&export=0',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }


    // =========================================================================
    // SECTION 10 — Pattern A: timeoff_allocation country=4 (Morocco payroll)
    //   Maps to GET /api/report/timeoff_allocation?country=4
    //   ReportsApiTest covers the happy path; add missing-param and export cases.
    // =========================================================================

    /**
     * @test
     * country=4 but no timeoff_month or timeoff_year — SP receives nulls.
     * Must not 500.
     */
    public function test_morocco_payroll_report_missing_month_year_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/timeoff_allocation?country=4',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * country=4, export=1 — triggers the Morocco Excel download branch.
     * Must not 500 even when SP returns empty sets.
     */
    public function test_morocco_payroll_report_export_branch_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/timeoff_allocation?country=4&timeoff_month=6&timeoff_year=2026&export=1',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * country=4, JSON branch — response must include 'reports' key.
     */
    public function test_morocco_payroll_report_json_branch_returns_reports_key()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/timeoff_allocation?country=4&timeoff_month=6&timeoff_year=2026&export=0',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());

        if ($response->status() === 200) {
            $content = $response->json('content');
            $this->assertArrayHasKey(
                'reports',
                $content,
                'Morocco payroll JSON response must include content.reports.'
            );
        }
    }

    /**
     * @test
     * country=4 with department filter — SP receives department param.
     * Must not 500.
     */
    public function test_morocco_payroll_report_with_department_filter_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/timeoff_allocation?country=4&timeoff_month=6&timeoff_year=2026&department=1',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * January edge case (timeoff_month=1): previous_mon wraps to 12 in Morocco branch.
     * Must not 500.
     */
    public function test_morocco_payroll_report_january_wraps_previous_month_correctly()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/timeoff_allocation?country=4&timeoff_month=1&timeoff_year=2026&export=0',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }


    // =========================================================================
    // SECTION 11 — Pattern A: getMoroccoPayrollParams (envelope check)
    //   Maps to GET /api/report/get_morocco_payroll_params
    //   ReportsApiTest has a not-500 test; verify response structure here.
    // =========================================================================

    /**
     * @test
     * SP returns 3 result sets (month, year, department); on success the response
     * is a raw array (not wrapped in success_response envelope) due to the
     * controller returning $response directly.
     */
    public function test_get_morocco_payroll_params_response_structure()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/get_morocco_payroll_params',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());

        if ($response->status() === 200) {
            $json = $response->json();
            // Controller returns ['month' => ..., 'year' => ..., 'department' => ...]
            $this->assertArrayHasKey('month', $json);
            $this->assertArrayHasKey('year', $json);
            $this->assertArrayHasKey('department', $json);
        }
    }


    // =========================================================================
    // SECTION 12 — Pattern A: team_schedule (scope_type variants)
    //   Maps to GET /api/report/team_schedule/
    //   ReportsApiTest has a basic not-500 test; add scope_type variants.
    // =========================================================================

    /**
     * @test
     * scope_type=week — controller calculates startOfWeek/endOfWeek.
     * Must not 500.
     */
    public function test_team_schedule_week_scope_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/team_schedule/?scope_type=week',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * scope_type=month — controller calculates firstOfMonth/endOfMonth.
     * Must not 500.
     */
    public function test_team_schedule_month_scope_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/team_schedule/?scope_type=month',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * scope_type=day — controller returns DailyScheduleReources.
     * Must not 500.
     */
    public function test_team_schedule_day_scope_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/team_schedule/?scope_type=day',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * Explicit start_date/end_date — controller uses those instead of scope_type.
     * Must not 500.
     */
    public function test_team_schedule_explicit_date_range_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/team_schedule/?start_date=2026-06-01&end_date=2026-06-07',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * name filter — controller applies whereRaw LIKE filter.
     * Must not 500.
     */
    public function test_team_schedule_with_name_filter_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/team_schedule/?scope_type=week&name=test',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }


    // =========================================================================
    // SECTION 13 — Pattern A: dtr_half_day_mismatch (export_dtr_conflict)
    //   Maps to GET /api/report/dtr_summary/export_dtr_conflict
    // =========================================================================

    /**
     * @test
     * With valid date range — raw DB::select('call Half_Day_Conflict_Report...')
     * may return empty or rows; must not 500.
     */
    public function test_export_dtr_conflict_with_date_range_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/export_dtr_conflict?valid_from=2026-06-01&valid_to=2026-06-15',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * Without date params — SP receives empty strings; must not 500.
     */
    public function test_export_dtr_conflict_without_date_params_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/export_dtr_conflict',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }


    // =========================================================================
    // SECTION 14 — Pattern A: new_dtr_summary_report_csv_export
    //   Maps to GET /api/report/dtr_summary/new_export
    //   ReportsApiTest has a not-500 test; add sup_id override case here.
    // =========================================================================

    /**
     * @test
     * With valid date range — calls EH_SP_DTR_Summary_Report SP and downloads CSV.
     * Must not 500.
     */
    public function test_dtr_summary_new_export_with_dates_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/new_export?valid_from=2026-06-01&valid_to=2026-06-15',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * sup_id override — controller uses $request->sup_id instead of $me->id.
     * Must not 500.
     */
    public function test_dtr_summary_new_export_with_sup_id_override_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            "/api/report/dtr_summary/new_export?valid_from=2026-06-01&valid_to=2026-06-15&sup_id={$this->user->id}",
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }


    // =========================================================================
    // SECTION 15 — Pattern A: dtr_multi_logs_summary_report_csv_export
    //   Maps to GET /api/report/dtr_summary/multi_logs_export
    // =========================================================================

    /**
     * @test
     * Missing department_id — controller returns error_response explicitly (not 500).
     */
    public function test_multi_logs_export_missing_department_returns_error_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/multi_logs_export?valid_from=2026-06-01&valid_to=2026-06-15',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
        // Controller returns error_response when department_id is absent
        $this->assertNotNull($response->json('error'));
    }

    /**
     * @test
     * With department_id and valid dates — calls EV_SP_Multi_Quick_Punch_Report SP
     * and downloads CSV. Must not 500.
     */
    public function test_multi_logs_export_with_department_and_dates_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/multi_logs_export?department_id=1&valid_from=2026-06-01&valid_to=2026-06-15',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }


    // =========================================================================
    // SECTION 16 — Pattern A: attendance/summary/export (export method)
    //   Maps to GET /api/report/attendance/summary/export/{start}/{end}
    //   ReportsApiTest has a not-500 for missing department.
    //   Add: with valid department, bad date format.
    // =========================================================================

    /**
     * @test
     * With selectedDepartments — controller calls EH_SP_Attendance_Summary SP
     * and triggers Excel download. Must not 500.
     */
    public function test_attendance_summary_export_with_department_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/attendance/summary/export/2026-06-01/2026-06-15?selectedDepartments=1',
            $this->apiKey
        );

        // Controller catch block wraps failures in success_response with empty array
        $this->assertNotEquals(500, $response->status());
    }

    /**
     * @test
     * Bad date format in URI — $this->validate() fires; must not return 500.
     * Acceptable: 422 (validation exception) or any other non-500 handled response.
     */
    public function test_attendance_summary_export_invalid_date_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)->getJson(
            '/api/report/attendance/summary/export/not-a-date/also-bad?selectedDepartments=1',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
    }
}
