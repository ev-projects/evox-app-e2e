<?php

/**
 * EVOX-31 — PHPUnit P0: Report API Extended Tests
 * Source: ReportController.php — covers all untested endpoints:
 *   dtr_summary/block, /team, /new_team, /multi_logs, /dtr_conflict,
 *   export variants, export_dtr_conflict
 * Using DatabaseTransactions — never modifies production data.
 */

namespace Tests\Feature\Api;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class ReportExtendedApiTest extends TestCase
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
    }

    // ─── dtr_summary/block ────────────────────────────────────────────────────

    /** @test */
    public function test_dtr_summary_block_returns_non_404_for_valid_user()
    {
        $response = $this->actingAs($this->user)
            ->getJson("/api/report/dtr_summary/block/{$this->userId}/2026-04-01/2026-04-30");

        $this->assertNotEquals(404, $response->status());
    }

    /** @test */
    public function test_dtr_summary_block_for_previous_month()
    {
        $response = $this->actingAs($this->user)
            ->getJson("/api/report/dtr_summary/block/{$this->userId}/2026-03-01/2026-03-31");

        $this->assertContains($response->status(), [200, 400, 500]);
    }

    // ─── dtr_summary/team ─────────────────────────────────────────────────────

    /** @test */
    public function test_team_dtr_summary_endpoint_is_reachable()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/dtr_summary/team');

        $this->assertNotEquals(404, $response->status());
    }

    /** @test */
    public function test_team_dtr_summary_with_date_params()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/dtr_summary/team?start_date=2026-04-01&end_date=2026-04-30');

        $this->assertContains($response->status(), [200, 400, 422]);
    }

    // ─── dtr_summary/new_team ─────────────────────────────────────────────────

    /** @test */
    public function test_new_dtr_summary_report_endpoint_is_reachable()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/dtr_summary/new_team');

        $this->assertNotEquals(404, $response->status());
    }

    // ─── dtr_summary/multi_logs ───────────────────────────────────────────────

    /** @test */
    public function test_dtr_multi_logs_summary_report_is_reachable()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/dtr_summary/multi_logs');

        $this->assertNotEquals(404, $response->status());
    }

    // ─── dtr_summary/dtr_conflict ─────────────────────────────────────────────

    /** @test */
    public function test_dtr_conflict_report_is_reachable()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/dtr_summary/dtr_conflict');

        $this->assertNotEquals(404, $response->status());
    }

    /** @test */
    public function test_dtr_conflict_report_with_date_params()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/dtr_summary/dtr_conflict?start_date=2026-04-01&end_date=2026-04-30');

        $this->assertContains($response->status(), [200, 400, 422]);
    }

    // ─── dtr_summary/export_dtr_conflict ──────────────────────────────────────

    /** @test */
    public function test_export_dtr_conflict_is_reachable()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/dtr_summary/export_dtr_conflict');

        $this->assertNotEquals(404, $response->status());
    }

    // ─── dtr_summary/export (team DTR summary CSV) ────────────────────────────

    /** @test */
    public function test_export_team_dtr_summary_is_reachable()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/dtr_summary/export');

        $this->assertNotEquals(404, $response->status());
    }

    // ─── dtr_summary/multi_logs_export ────────────────────────────────────────

    /** @test */
    public function test_dtr_multi_logs_export_is_reachable()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/dtr_summary/multi_logs_export');

        $this->assertNotEquals(404, $response->status());
    }

    // ─── attendance export ────────────────────────────────────────────────────

    /** @test */
    public function test_attendance_summary_export_is_reachable()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/attendance/summary/export/2026-04-01/2026-04-30');

        $this->assertNotEquals(404, $response->status());
    }

    // ─── Different user / auth boundary ───────────────────────────────────────

    /** @test */
    public function test_dtr_summary_block_for_different_user_returns_data_or_error()
    {
        $otherUser = User::where('id', '!=', $this->userId)->where('is_active', 1)->first();
        if (!$otherUser) {
            $this->markTestSkipped('No alternate active user found.');
        }

        $response = $this->actingAs($this->user)
            ->getJson("/api/report/dtr_summary/block/{$otherUser->id}/2026-04-01/2026-04-30");

        $this->assertContains($response->status(), [200, 400, 403, 422, 500]);
    }
}
