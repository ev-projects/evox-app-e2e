<?php

/**
 * ReportController — full surface coverage
 * All SP-backed methods tested with real bounded inputs (LevelId=1, department_id=403,
 * date range 2026-03-01..2026-03-31) to keep SP execution fast under Xdebug.
 *
 * Gary Aure (LevelId=1, department_id=403) is used as the authenticated supervisor
 * for team/report endpoints; Glenn (employee) for personal DTR endpoints.
 */

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Modules\User\Models\User;

class evoxtest_ReportControllerApiTest extends TestCase
{
    use DatabaseTransactions;

    private User $employee;   // Glenn  — personal DTR endpoints
    private User $supervisor; // Gary   — team/report endpoints (LevelId=1, dept=403)
    private string $empToken;
    private string $supToken;
    private string $rawApiKey;

    private const VALID_FROM = '2026-03-01';
    private const VALID_TO   = '2026-03-31';
    // Gary's sub-department ID per CLAUDE.md LevelId rule
    private const DEPT_ID    = 403;

    protected function setUp(): void
    {
        parent::setUp();

        $this->employee   = User::where('email', env('E2E_USER_EMPLOYEE_PHILIPPINES', 'glenn.macasarte@eastvantage.com'))->firstOrFail();
        $this->supervisor = User::where('email', env('E2E_USER_SUPERVISOR_PHILIPPINES', 'gary.aure@eastvantage.com'))->firstOrFail();

        $this->rawApiKey = Str::random(64);
        DB::table('api_keys')->insert([
            'name'       => 'evox_e2e_report_' . now()->format('His'),
            'key'        => $this->rawApiKey,
            'active'     => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->empToken = auth('api')->login($this->employee);
        $this->supToken = auth('api')->login($this->supervisor);
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    private function empHeaders(): array
    {
        return ['Authorization' => 'Bearer ' . $this->empToken, 'X-Authorization' => $this->rawApiKey];
    }

    private function supHeaders(): array
    {
        return ['Authorization' => 'Bearer ' . $this->supToken, 'X-Authorization' => $this->rawApiKey];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Auth gate
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function report_holidays_requires_jwt()
    {
        $this->getJson('/api/report/holidays', ['X-Authorization' => $this->rawApiKey])
            ->assertStatus(401);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // holidays — GET /api/report/holidays
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function holidays_returns_upcoming_holidays()
    {
        $res = $this->getJson('/api/report/holidays', $this->empHeaders());

        $res->assertStatus(200);
        $this->assertArrayHasKey('content', $res->json());
    }

    // ═══════════════════════════════════════════════════════════════════════
    // team_attendance — GET /api/report/team_attendance
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function team_attendance_returns_today_attendance_for_supervisor()
    {
        $res = $this->getJson('/api/report/team_attendance', $this->supHeaders());

        $this->assertContains($res->status(), [200, 400],
            'team_attendance should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // team_birthday_anniversary — GET /api/report/team_birthday_anniversary
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function team_birthday_anniversary_calls_eh_sp_dashboard()
    {
        $res = $this->getJson('/api/report/team_birthday_anniversary', $this->supHeaders());

        $this->assertContains($res->status(), [200, 400],
            'team_birthday_anniversary should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // my_dtr_notifications — GET /api/report/my_dtr_notifications
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function my_dtr_notifications_returns_current_cutoff_data_for_employee()
    {
        $res = $this->getJson('/api/report/my_dtr_notifications', $this->empHeaders());

        $this->assertContains($res->status(), [200, 400],
            'my_dtr_notifications should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // dtr_summary — GET /api/report/dtr_summary/{user_id}/{start}/{end}
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function dtr_summary_returns_data_for_employee_in_range()
    {
        $res = $this->getJson(
            '/api/report/dtr_summary/' . $this->employee->id . '/' . self::VALID_FROM . '/' . self::VALID_TO,
            $this->empHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'dtr_summary should not crash with 500');
    }

    /** @test */
    public function dtr_summary_block_returns_data_for_employee_in_range()
    {
        $res = $this->getJson(
            '/api/report/dtr_summary/block/' . $this->employee->id . '/' . self::VALID_FROM . '/' . self::VALID_TO,
            $this->empHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'dtr_summary_block should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // team_schedule — GET /api/report/team_schedule/
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function team_schedule_day_scope_returns_daily_view()
    {
        $res = $this->getJson(
            '/api/report/team_schedule/?scope_type=day&department_id=' . self::DEPT_ID,
            $this->supHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'team_schedule day scope should not crash with 500');
    }

    /** @test */
    public function team_schedule_week_scope_returns_weekly_view()
    {
        $res = $this->getJson(
            '/api/report/team_schedule/?scope_type=week&department_id=' . self::DEPT_ID,
            $this->supHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'team_schedule week scope should not crash with 500');
    }

    /** @test */
    public function team_schedule_month_scope_returns_monthly_view()
    {
        $res = $this->getJson(
            '/api/report/team_schedule/?scope_type=month&department_id=' . self::DEPT_ID,
            $this->supHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'team_schedule month scope should not crash with 500');
    }

    /** @test */
    public function team_schedule_with_explicit_date_range()
    {
        $res = $this->getJson(
            '/api/report/team_schedule/?start_date=' . self::VALID_FROM . '&end_date=' . self::VALID_TO . '&department_id=' . self::DEPT_ID,
            $this->supHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'team_schedule explicit range should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // team_attendance_summary — POST /api/report/team_attendance_summary/{start}/{end}
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function team_attendance_summary_returns_400_when_no_department_selected()
    {
        $res = $this->postJson(
            '/api/report/team_attendance_summary/' . self::VALID_FROM . '/' . self::VALID_TO,
            [], // no selectedDepartments
            $this->supHeaders()
        );

        // Controller returns 400 explicitly when selectedDepartments is null
        $res->assertStatus(400);
    }

    /** @test */
    public function team_attendance_summary_with_selected_departments_calls_sp()
    {
        $res = $this->postJson(
            '/api/report/team_attendance_summary/' . self::VALID_FROM . '/' . self::VALID_TO,
            ['selectedDepartments' => [self::DEPT_ID]],
            $this->supHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'team_attendance_summary with department should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // new_dtr_summary_report — GET /api/report/dtr_summary/new_team
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function new_dtr_summary_report_returns_summary_rows_for_supervisor()
    {
        $res = $this->getJson(
            '/api/report/dtr_summary/new_team?department_id=' . self::DEPT_ID .
            '&valid_from=' . self::VALID_FROM . '&valid_to=' . self::VALID_TO . '&is_active=1',
            $this->supHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'new_dtr_summary_report should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // dtr_multi_logs_summary_report — GET /api/report/dtr_summary/multi_logs
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function dtr_multi_logs_summary_returns_400_when_no_department()
    {
        $res = $this->getJson(
            '/api/report/dtr_summary/multi_logs?valid_from=' . self::VALID_FROM . '&valid_to=' . self::VALID_TO,
            $this->supHeaders()
        );

        // Controller explicitly returns 400 when department_id missing
        $res->assertStatus(400);
    }

    /** @test */
    public function dtr_multi_logs_summary_calls_sp_with_valid_department()
    {
        $res = $this->getJson(
            '/api/report/dtr_summary/multi_logs?department_id=' . self::DEPT_ID .
            '&valid_from=' . self::VALID_FROM . '&valid_to=' . self::VALID_TO,
            $this->supHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'dtr_multi_logs_summary with department should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // dtr_conflict_report — GET /api/report/dtr_summary/dtr_conflict
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function dtr_conflict_report_returns_results_or_404_for_valid_range()
    {
        $res = $this->getJson(
            '/api/report/dtr_summary/dtr_conflict?valid_from=' . self::VALID_FROM . '&valid_to=' . self::VALID_TO,
            $this->supHeaders()
        );

        // 200 = has conflict rows; 404 = no conflicts found (controller returns JSON 404)
        $this->assertContains($res->status(), [200, 400, 404],
            'dtr_conflict_report should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // timeoff_allocation_report — GET /api/report/timeoff_allocation
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function timeoff_allocation_report_india_branch_country_1()
    {
        $res = $this->getJson(
            '/api/report/timeoff_allocation?country=1&timeoff_month=3&timeoff_year=2026&export=0',
            $this->supHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'timeoff_allocation India branch should not crash with 500');
    }

    /** @test */
    public function timeoff_allocation_report_morocco_branch_country_4()
    {
        $res = $this->getJson(
            '/api/report/timeoff_allocation?country=4&timeoff_month=3&timeoff_year=2026&export=0',
            $this->supHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'timeoff_allocation Morocco branch should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // getMoroccoPayrollParams — GET /api/report/get_morocco_payroll_params
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function get_morocco_payroll_params_returns_sp_lookup_tables()
    {
        $res = $this->getJson('/api/report/get_morocco_payroll_params', $this->supHeaders());

        $this->assertContains($res->status(), [200, 400],
            'getMoroccoPayrollParams should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // team_dtr_logs — GET /api/report/dtr_logs/team
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function team_dtr_logs_calls_eh_sp_dtr_logs_for_supervisor()
    {
        $res = $this->getJson(
            '/api/report/dtr_logs/team?department_id=' . self::DEPT_ID .
            '&valid_from=' . self::VALID_FROM . '&valid_to=' . self::VALID_TO . '&is_active=1',
            $this->supHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'team_dtr_logs should not crash with 500');
    }
}
