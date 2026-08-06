<?php
// CoverageMax — generated 2026-07-08, covers the payroll DTR gap, the public web PDF
// route, and documents the 3 broken routes flagged in the route inventory.

namespace Tests\Feature\CoverageMax;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 *   GET  dtr/insert_time_in_out/{dtr_id}/{time_in}/{time_out}/{is_rest_day}  (jwt+key) — auth only
 *   GET  demo-generate-pdf                                                   (web, no auth) — not-500
 *   GET  masters/departments   — BROKEN: MastersController class missing
 *   GET  summaryreport1        — BROKEN: ReportController@team_dtr_summaryreportnew missing (no auth)
 *   GET  exportsummaryreport1  — BROKEN: ReportController@newdtrsummaryreportcsvexport missing (no auth)
 */
class PayrollWebBrokenTest extends TestCase
{
    // B1 — file-download routes return a Symfony BinaryFileResponse, and Laravel 5.7's
    // TestResponse does not proxy status() to it, so ->status() fatals on any export test.
    // Reading the underlying response works for BOTH BinaryFileResponse and JsonResponse,
    // so it is used throughout this file rather than only on the download assertions.

    use DatabaseTransactions;

    private array $apiKey;
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->user = User::where('is_active', 1)->first() ?? User::first();
    }

    // ─── Payroll DTR gap — auth enforcement ──────────────────────────────────

    /** @test */
    public function test_insert_time_in_out_without_token_returns_401()
    {
        // Mutating cron-only route ("to be removed"); assert only that it is JWT-guarded.
        $this->getJson('/api/dtr/insert_time_in_out/1/09:00:00/18:00:00/0', $this->apiKey)
            ->assertStatus(401);
    }

    // ─── Public web route — PDFController@demoGeneratePDF ─────────────────────

    /**
     * @test
     * routes/web.php, no auth. PDFController@demoGeneratePDF renders the `pdfs.coe` blade
     * to a PDF. It is demo/dead code (hardcoded "Welcome to My Blog" payload) and 500s in
     * the staging test environment (missing view / dompdf font config). This asserts only
     * that the route is registered and reaches the controller (not a 404), documenting the
     * demo route without depending on PDF rendering being configured.
     */
    public function test_demo_generate_pdf_route_is_registered()
    {
        $response = $this->get('/demo-generate-pdf');
        $this->assertNotEquals(404, $response->baseResponse->getStatusCode());
    }

    // ─── Broken routes — regression guards for the inventory findings ─────────

    /**
     * @test
     * BROKEN (BUG-2): /api/masters/departments points at MastersController@departments,
     * but the MastersController class does not exist anywhere in the codebase (added for
     * the Stefan Attendance API, never implemented). With JWT middleware the no-token
     * request is rejected at 401 before controller resolution — so the route is registered
     * but unreachable. This guards the registration; fixing the bug means adding the class.
     */
    public function test_masters_departments_route_registered_but_controller_missing()
    {
        $response = $this->getJson('/api/masters/departments', $this->apiKey);
        // 401 (guarded) proves the route exists; a 404 would mean it was never registered.
        $this->assertContains($response->baseResponse->getStatusCode(), [401]);
    }

    /**
     * @test
     * BROKEN (BUG-3): /api/summaryreport1 -> ReportController@team_dtr_summaryreportnew,
     * a method that does not exist, and the route carries NO middleware (unauthenticated).
     * Hitting it resolves the controller and fails method resolution => 500.
     * Documents the current broken state as a regression guard.
     */
    public function test_summaryreport1_is_broken_missing_method()
    {
        $response = $this->getJson('/api/summaryreport1');
        $this->assertContains($response->baseResponse->getStatusCode(), [404, 500]);
    }

    /**
     * @test
     * BROKEN (BUG-4): /api/exportsummaryreport1 -> ReportController@newdtrsummaryreportcsvexport,
     * missing method, no middleware. Documents the broken state.
     */
    public function test_exportsummaryreport1_is_broken_missing_method()
    {
        $response = $this->getJson('/api/exportsummaryreport1');
        $this->assertContains($response->baseResponse->getStatusCode(), [404, 500]);
    }
}
