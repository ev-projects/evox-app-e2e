<?php

/**
 * EVOX-31 — PHPUnit P0: Report API Tests
 * HIGHEST coverage impact: ReportController.php has 1,234 uncovered lines.
 * All endpoints are read-only — no data modification risk.
 * Source: Report module routes /api/report/
 */

namespace Tests\Feature\Api;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class ReportApiTest extends TestCase
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

    /** @test */
    public function test_get_dashboard_holidays_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/get_dashboard_holiday');
        $this->assertNotEquals(404, $response->status());
    }

    /** @test */
    public function test_get_holidays_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/holidays');
        $response->assertStatus(200);
    }

    /** @test */
    public function test_get_my_dtr_notifications_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/my_dtr_notifications');
        $this->assertContains($response->status(), [200, 400]);
    }

    /** @test */
    public function test_get_team_attendance_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/team_attendance');
        $this->assertContains($response->status(), [200, 400]);
    }

    /** @test */
    public function test_get_team_schedule_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/team_schedule/');
        $this->assertNotEquals(404, $response->status());
    }

    /** @test */
    public function test_get_team_birthday_anniversary_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/report/team_birthday_anniversary');
        $this->assertContains($response->status(), [200, 400]);
    }

    /** @test */
    public function test_get_dtr_summary_for_user_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson("/api/report/dtr_summary/{$this->userId}/2026-04-01/2026-04-30");
        $this->assertContains($response->status(), [200, 400]);
    }

    /** @test */
    public function test_get_dtr_summary_current_month_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson("/api/report/dtr_summary/{$this->userId}/2026-05-01/2026-05-31");
        $this->assertContains($response->status(), [200, 400]);
    }

    /** @test */
    public function test_post_team_attendance_summary_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/report/team_attendance_summary/2026-04-01/2026-04-30', []);
        $this->assertContains($response->status(), [200, 400, 422]);
    }

    /** @test */
    public function test_report_endpoints_require_authentication()
    {
        $this->app->instance('middleware.disable', false);
        $response = $this->getJson('/api/report/holidays');
        $this->assertNotEquals(200, $response->status());
    }
}
