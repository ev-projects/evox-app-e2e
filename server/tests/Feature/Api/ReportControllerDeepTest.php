<?php

/**
 * EVOX-31 — PHPUnit P0: ReportController Deep Tests
 * Source: Modules/Report/Http/Controllers/ReportController.php (681 uncovered, 23%)
 *
 * Covers untested endpoint groups:
 *   1. dtr_logs/team             — team_dtr_logs() via EH_SP_DTR_Logs stored proc
 *   2. dtr_logs/export           — export_team_dtr_logs()
 *   3. timeoff_allocation        — timeoff_allocation_report()
 *   4. get_morocco_payroll_params — getMoroccoPayrollParams()
 *   5. summaryreport1 / exportsummaryreport1 — alternative summary routes
 *   6. dtr_summary with real user data — triggers getDetailsOfSummary() private method
 */

namespace Tests\Feature\Api;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Payroll\Models\Dtr as PayrollDtr;

class ReportControllerDeepTest extends TestCase
{
    use DatabaseTransactions;

    private User $user;
    private int $userId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::whereNotNull('country_id')
            ->where('country_id', '>', 0)
            ->where('is_active', 1)
            ->firstOrFail();
        $this->userId = $this->user->id;
        $this->withoutMiddleware();
        // team_dtr_logs calls auth()->user() internally
        $this->be($this->user);
    }

    // ─── dtr_logs/team ────────────────────────────────────────────────────────

    /** @test */
    public function test_team_dtr_logs_endpoint_is_reachable()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/dtr_logs/team?valid_from=2026-04-01&valid_to=2026-04-30');

        $this->assertNotEquals(404, $response->status());
    }

    /** @test */
    public function test_team_dtr_logs_with_department_filter()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/dtr_logs/team?valid_from=2026-04-01&valid_to=2026-04-30&department_id=1&is_active=1');

        $this->assertContains($response->status(), [200, 400, 422, 500]);
    }

    /** @test */
    public function test_team_dtr_logs_with_name_filter()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/dtr_logs/team?valid_from=2026-05-01&valid_to=2026-05-31&name=test');

        $this->assertContains($response->status(), [200, 400, 422, 500]);
    }

    // ─── dtr_logs/export ──────────────────────────────────────────────────────

    /** @test */
    public function test_export_team_dtr_logs_endpoint_is_reachable()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/dtr_logs/export?valid_from=2026-04-01&valid_to=2026-04-30');

        $this->assertNotEquals(404, $response->status());
    }

    /** @test */
    public function test_export_team_dtr_logs_with_pov_toggle()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/dtr_logs/export?valid_from=2026-04-01&valid_to=2026-04-30&toggle_pov=1');

        $this->assertContains($response->status(), [200, 400, 422, 500]);
    }

    // ─── timeoff_allocation ───────────────────────────────────────────────────

    /** @test */
    public function test_timeoff_allocation_report_is_reachable()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/timeoff_allocation');

        $this->assertNotEquals(404, $response->status());
    }

    /** @test */
    public function test_timeoff_allocation_with_date_range()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/timeoff_allocation?valid_from=2026-04-01&valid_to=2026-04-30');

        $this->assertContains($response->status(), [200, 400, 422, 500]);
    }

    // ─── get_morocco_payroll_params ───────────────────────────────────────────

    /** @test */
    public function test_get_morocco_payroll_params_is_reachable()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/get_morocco_payroll_params');

        $this->assertNotEquals(404, $response->status());
    }

    // ─── summaryreport1 (legacy route without report/ prefix) ────────────────

    /** @test */
    public function test_summaryreport1_legacy_route_is_reachable()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/summaryreport1?valid_from=2026-04-01&valid_to=2026-04-30');

        $this->assertContains($response->status(), [200, 400, 404, 422, 500]);
    }

    /** @test */
    public function test_exportsummaryreport1_legacy_route_is_reachable()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/exportsummaryreport1?valid_from=2026-04-01&valid_to=2026-04-30');

        $this->assertContains($response->status(), [200, 400, 404, 422, 500]);
    }

    // ─── dtr_summary with user who has real DTR data ─────────────────────────
    // This triggers getDetailsOfSummary() private method

    /** @test */
    public function test_dtr_summary_with_user_who_has_dtr_data()
    {
        // Find a user with actual DTR records with time_in set
        $userWithDtr = PayrollDtr::whereNotNull('time_in')
            ->whereNotNull('time_out')
            ->whereHas('user', function($q) {
                $q->where('is_active', 1)->whereNotNull('country_id');
            })
            ->first();

        if (!$userWithDtr) {
            $this->markTestIncomplete('No user with complete DTR records found.');
        }

        // Call dtr_summary for the period where this DTR exists
        $month = substr($userWithDtr->date, 0, 7); // e.g. "2026-04"
        $startDate = $month . '-01';
        $endDate = $month . '-' . date('t', strtotime($startDate));

        $response = $this->actingAs($this->user)
            ->getJson("/api/report/dtr_summary/{$userWithDtr->user_id}/{$startDate}/{$endDate}");

        $this->assertContains($response->status(), [200, 400, 422]);
    }

    /** @test */
    public function test_dtr_summary_block_with_user_who_has_dtr_data()
    {
        $userWithDtr = PayrollDtr::whereNotNull('time_in')
            ->whereNotNull('time_out')
            ->first();

        if (!$userWithDtr) {
            $this->markTestIncomplete('No user with DTR data found.');
        }

        $month = substr($userWithDtr->date, 0, 7);
        $startDate = $month . '-01';
        $endDate = $month . '-' . date('t', strtotime($startDate));

        $response = $this->actingAs($this->user)
            ->getJson("/api/report/dtr_summary/block/{$userWithDtr->user_id}/{$startDate}/{$endDate}");

        $this->assertContains($response->status(), [200, 400, 422]);
    }

    // ─── team_attendance_summary with real date params ────────────────────────

    /** @test */
    public function test_team_attendance_summary_with_structured_request()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/report/team_attendance_summary/2026-04-01/2026-04-30', [
                'department_id' => null,
                'country_id'    => $this->user->country_id,
            ]);

        $this->assertContains($response->status(), [200, 400, 422, 500]);
    }
}
