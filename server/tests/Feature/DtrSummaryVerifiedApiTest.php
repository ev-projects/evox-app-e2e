<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
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

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->user = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();
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
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/new_team?valid_from=2026-06-01&valid_to=2026-06-30',
            $this->apiKey
        );
        // Controller should return 200 for a valid date range.
        $response->assertStatus(200);
    }

    /** @test */
    public function test_new_dtr_summary_report_with_department_filter_returns_200()
    {
        // Developer confirmed: Department dropdown exists — passes department_id param.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/new_team?valid_from=2026-06-01&valid_to=2026-06-30&department_id=1',
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
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/new_team?valid_from=2026-06-01&valid_to=2026-06-30&name=Glenn',
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
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/new_team?valid_from=2026-06-01&valid_to=2026-06-30&department_id=1&name=Glenn',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
        $response->assertStatus(200);
    }

    /** @test */
    public function test_new_dtr_summary_report_with_no_date_params_does_not_500()
    {
        // Missing valid_from / valid_to — controller passes null to SP; should return
        // a handled 200 with empty data, not a 500.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/new_team',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_new_dtr_summary_report_response_is_json()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/new_team?valid_from=2026-06-01&valid_to=2026-06-30',
            $this->apiKey
        );
        $response->assertStatus(200);
        // Response must be parseable JSON — not a raw SP dump or HTML error page.
        $this->assertNotNull($response->json());
    }
}
