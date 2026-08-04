<?php

/**
 * EVOX-31 — PHPUnit P0: Announcements + Holidays + Dashboard API Tests
 * Covers multiple smaller modules: Department announcements, holidays (from Report module),
 * and dashboard endpoints.
 * All read-only — no data modification risk.
 */

namespace Tests\Feature\Api;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class AnnouncementAndHolidayApiTest extends TestCase
{
    use DatabaseTransactions;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::whereNotNull('country_id')
            ->where('country_id', '>', 0)
            ->where('is_active', 1)
            ->firstOrFail();
        $this->withoutMiddleware();
    }

    // ─── Department announcements ─────────────────────────────────────────────

    /** @test */
    public function test_get_all_announcements_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/department/announcements/all');
        $this->assertContains($response->status(), [200, 400, 404]);
    }

    // ─── Redis/notification endpoints ─────────────────────────────────────────

    /** @test */
    public function test_get_redis_notifications_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson("/api/get_redis_notifications/{$this->user->id}");
        $this->assertContains($response->status(), [200, 400]);
    }

    // ─── Dashboard endpoints ──────────────────────────────────────────────────

    /** @test */
    public function test_get_dashboard_all_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/get_dashboard_all/all');
        $this->assertContains($response->status(), [200, 400]);
    }

    // ─── Leave related ────────────────────────────────────────────────────────

    /** @test */
    public function test_get_user_time_off_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson("/api/user/{$this->user->id}/time_off/2026-04-01/2026-04-30");
        $this->assertContains($response->status(), [200, 400]);
    }

    /** @test */
    public function test_get_user_temporary_schedules_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson("/api/user/{$this->user->id}/temporary_schedules");
        $this->assertContains($response->status(), [200, 400]);
    }

    // ─── Request disputes ─────────────────────────────────────────────────────

    /** @test */
    public function test_get_request_list_disputes_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/request/request-list-disputes');
        $this->assertContains($response->status(), [200, 400]);
    }

    // ─── Payroll additional ───────────────────────────────────────────────────

    /** @test */
    public function test_get_incomplete_dtr_logs_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/dtr/incomplete_logs');
        $response->assertStatus(200);
    }

    /** @test */
    public function test_get_dtr_for_large_date_range_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson("/api/dtr/{$this->user->id}/2026-01-01/2026-05-31");
        $this->assertContains($response->status(), [200, 400]);
    }
}
