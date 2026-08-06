<?php
// CoverageMax — generated 2026-07-08, raises coverage on untested Report-module routes.

namespace Tests\Feature\CoverageMax;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * Report module — endpoints with no prior PHPUnit coverage. All require jwtauth + auth.apikey.
 *   POST report/team_attendance_summary/{start}/{end}
 *   GET  report/attendance/summary/export/{start}/{end}
 *   GET  report/dtr_summary/{user_id}/{start}/{end}
 *   GET  report/dtr_summary/block/{user_id}/{start}/{end}
 *
 *   Pattern B — no JWT => 401.   Pattern A — withoutMiddleware()+actingAs => not 500.
 */
class ReportEndpointsTest extends TestCase
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

    private function requireUser()
    {
        if (!$this->user) {
            $this->markTestIncomplete('No users in test DB.');
        }
    }

    private function today(): string { return date('Y-m-d'); }
    private function monthStart(): string { return date('Y-m-01'); }

    // ─── Pattern B: auth enforcement ─────────────────────────────────────────

    /** @test */
    public function test_team_attendance_summary_without_token_returns_401()
    {
        $this->postJson('/api/report/team_attendance_summary/2026-01-01/2026-01-31', [], $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_attendance_summary_export_without_token_returns_401()
    {
        $this->getJson('/api/report/attendance/summary/export/2026-01-01/2026-01-31', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_dtr_summary_without_token_returns_401()
    {
        $this->getJson('/api/report/dtr_summary/1/2026-01-01/2026-01-31', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_dtr_summary_block_without_token_returns_401()
    {
        $this->getJson('/api/report/dtr_summary/block/1/2026-01-01/2026-01-31', $this->apiKey)->assertStatus(401);
    }

    // ─── Pattern A: controller body must not 500 ─────────────────────────────

    /** @test */
    public function test_dtr_summary_with_real_user_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson("/api/report/dtr_summary/{$this->user->id}/{$this->monthStart()}/{$this->today()}", $this->apiKey);
        $this->assertNotEquals(500, $response->baseResponse->getStatusCode());
    }

    /** @test */
    public function test_dtr_summary_nonexistent_user_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson("/api/report/dtr_summary/999999/{$this->monthStart()}/{$this->today()}", $this->apiKey);
        $this->assertNotEquals(500, $response->baseResponse->getStatusCode());
    }

    /** @test */
    public function test_dtr_summary_block_with_real_user_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson("/api/report/dtr_summary/block/{$this->user->id}/{$this->monthStart()}/{$this->today()}", $this->apiKey);
        $this->assertNotEquals(500, $response->baseResponse->getStatusCode());
    }

    /** @test */
    public function test_team_attendance_summary_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->postJson("/api/report/team_attendance_summary/{$this->monthStart()}/{$this->today()}", [], $this->apiKey);
        $this->assertNotEquals(500, $response->baseResponse->getStatusCode());
    }

    /** @test */
    public function test_attendance_summary_export_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson("/api/report/attendance/summary/export/{$this->monthStart()}/{$this->today()}", $this->apiKey);
        $this->assertNotEquals(500, $response->baseResponse->getStatusCode());
    }
}
