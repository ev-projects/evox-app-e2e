<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;

/**
 * @registry-doc dtr-summary.registry.md
 * @vetted-by    Glenn Macasarte
 * @vetted-on    July 2, 2026
 *
 * CORRECTED 2026-07-07 — endpoint and parameter names fixed after code review:
 *   Wrong path: /api/new_dtr_summary_report
 *   Correct path: /api/report/dtr_summary/new_team
 *     (Route::get('new_team', 'ReportController@new_dtr_summary_report') under prefix 'report/dtr_summary')
 *   Wrong params: start_date / end_date
 *   Correct params: valid_from / valid_to
 *     (ReportController::new_dtr_summary_report reads $request->valid_from and $request->valid_to)
 *
 * Controller confirmed by developer vetting (Q2):
 *   App\Modules\Report\Http\Controllers\ReportController@new_dtr_summary_report
 *
 * All Area 1 / Area 2 / Area 3 elements from the AI draft were confirmed NOT to
 * exist on this page. Tests here cover only the confirmed controller action and
 * the auth enforcement that guards it.
 */
class DtrSummaryVerifiedApiTest extends TestCase
{
    use DatabaseTransactions; // SAFETY: converted from RefreshDatabase 2026-07-08 — never migrate:fresh on staging DB

    private array $apiKey;
    private User $user;
    private string $validFrom;
    private string $validTo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        // SP EH_SP_DTR_Summary_Report requires a supervisor (LevelId > 0); load Gary Aure (LevelId=1, sub-dept 403)
        $this->user = User::where('email', env('E2E_USER_SUPERVISOR_PHILIPPINES', 'gary.aure@eastvantage.com'))->firstOrFail();

        $cutoff = DB::table('payroll_cutoffs')
            ->whereNull('deleted_at')
            ->whereRaw('CURDATE() BETWEEN start_date AND end_date')
            ->select('start_date', 'end_date')
            ->first();
        $this->validFrom = $cutoff ? $cutoff->start_date : '2026-03-01';
        $this->validTo   = $cutoff ? $cutoff->end_date   : '2026-03-31';
    }

    // =========================================================================
    // PATTERN B — Auth enforcement (no withoutMiddleware)
    // ReportController@new_dtr_summary_report — route requires authentication.
    // =========================================================================

    /** @test */
    public function test_new_dtr_summary_report_without_token_returns_401()
    {
        // Confirmed controller: ReportController@new_dtr_summary_report
        // Confirmed route: GET /api/report/dtr_summary/new_team
        // Any unauthenticated request must be rejected before reaching the controller.
        $response = $this->getJson('/api/report/dtr_summary/new_team', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic (withoutMiddleware + actingAs)
    // GET /api/report/dtr_summary/new_team
    // Developer-confirmed endpoint via ReportController@new_dtr_summary_report.
    // Filters confirmed by vetting: department_id, name (search), valid_from, valid_to.
    // NOTE: Controller reads $request->valid_from and $request->valid_to (not start_date/end_date)
    // =========================================================================

    /** @test */
    public function test_new_dtr_summary_report_returns_200_with_valid_date_range()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user, 'api')->getJson(
            "/api/report/dtr_summary/new_team?valid_from={$this->validFrom}&valid_to={$this->validTo}&is_active=1",
            $this->apiKey
        );
        $response->assertStatus(200);
    }

    /** @test */
    public function test_new_dtr_summary_report_with_department_filter_returns_200()
    {
        // Developer confirmed: Department dropdown exists — passes department_id param.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user, 'api')->getJson(
            "/api/report/dtr_summary/new_team?valid_from={$this->validFrom}&valid_to={$this->validTo}&department_id=403&is_active=1",
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
        $response->assertStatus(200);
    }

    /** @test */
    public function test_new_dtr_summary_report_with_name_search_returns_200()
    {
        // Developer confirmed: Name search text input exists — passes name param.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user, 'api')->getJson(
            "/api/report/dtr_summary/new_team?valid_from={$this->validFrom}&valid_to={$this->validTo}&name=Glenn&is_active=1",
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
        $response->assertStatus(200);
    }

    /** @test */
    public function test_new_dtr_summary_report_with_all_filters_returns_200()
    {
        // Combined: department + name + date range — all confirmed filter controls.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user, 'api')->getJson(
            "/api/report/dtr_summary/new_team?valid_from={$this->validFrom}&valid_to={$this->validTo}&department_id=403&name=Glenn&is_active=1",
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
        $response->assertStatus(200);
    }

    /** @test */
    public function test_new_dtr_summary_report_with_no_date_params_does_not_500()
    {
        // Missing valid_from / valid_to — controller passes null to SP; the is_active ?? 1
        // default in the controller prevents the SP from crashing on null is_active.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user, 'api')->getJson(
            '/api/report/dtr_summary/new_team?is_active=1',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_new_dtr_summary_report_response_is_json()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user, 'api')->getJson(
            "/api/report/dtr_summary/new_team?valid_from={$this->validFrom}&valid_to={$this->validTo}&is_active=1",
            $this->apiKey
        );
        $response->assertStatus(200);
        $this->assertNotNull($response->json());
    }
}
