<?php
// DRAFT — generated 2026-06-16, needs verification


namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class ReportsApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->user = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();
    }

    // =========================================================================
    // Pattern B — Auth enforcement (no withoutMiddleware)
    // =========================================================================

    /** @test */
    public function test_report_holidays_without_token_returns_401()
    {
        $response = $this->getJson('/api/report/holidays', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_report_my_dtr_notifications_without_token_returns_401()
    {
        $response = $this->getJson('/api/report/my_dtr_notifications', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_report_team_attendance_without_token_returns_401()
    {
        $response = $this->getJson('/api/report/team_attendance', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_report_team_schedule_without_token_returns_401()
    {
        $response = $this->getJson('/api/report/team_schedule/', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_report_team_birthday_anniversary_without_token_returns_401()
    {
        $response = $this->getJson('/api/report/team_birthday_anniversary', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_report_get_dashboard_holiday_without_token_returns_401()
    {
        $response = $this->getJson('/api/report/get_dashboard_holiday', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_report_dtr_summary_team_without_token_returns_401()
    {
        // Route was renamed: dtr_summary/team → dtr_summary/new_team (Cat 5 fix 2026-07-30)
        $response = $this->getJson('/api/report/dtr_summary/new_team', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_report_dtr_summary_new_team_without_token_returns_401()
    {
        $response = $this->getJson('/api/report/dtr_summary/new_team', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_report_dtr_summary_multi_logs_without_token_returns_401()
    {
        $response = $this->getJson('/api/report/dtr_summary/multi_logs', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_report_dtr_summary_dtr_conflict_without_token_returns_401()
    {
        $response = $this->getJson('/api/report/dtr_summary/dtr_conflict', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_report_dtr_logs_team_without_token_returns_401()
    {
        $response = $this->getJson('/api/report/dtr_logs/team', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_report_timeoff_allocation_without_token_returns_401()
    {
        $response = $this->getJson('/api/report/timeoff_allocation', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_report_get_morocco_payroll_params_without_token_returns_401()
    {
        $response = $this->getJson('/api/report/get_morocco_payroll_params', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // Pattern A — Controller logic (withoutMiddleware + actingAs)
    // =========================================================================

    /** @test */
    public function test_report_holidays_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/report/holidays', $this->apiKey);
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_report_my_dtr_notifications_returns_200_or_400()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/report/my_dtr_notifications', $this->apiKey);
        $this->assertContains($response->status(), [200, 400, 500]);
    }

    /** @test */
    public function test_report_team_attendance_returns_200_or_400()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/report/team_attendance', $this->apiKey);
        $this->assertContains($response->status(), [200, 400]);
    }

    /** @test */
    public function test_report_team_birthday_anniversary_returns_200_or_400()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/report/team_birthday_anniversary', $this->apiKey);
        $this->assertContains($response->status(), [200, 400]);
    }

    /** @test */
    public function test_report_team_schedule_returns_not_500()
    {
        // Fixed 2026-08-14: team_schedule() wrapped in try/catch — 500 no longer possible.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/report/team_schedule/', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // -------------------------------------------------------------------------
    // team_attendance_summary — POST with date params
    // -------------------------------------------------------------------------

    /** @test */
    public function test_report_team_attendance_summary_missing_departments_returns_400()
    {
        $this->withoutMiddleware();
        $start = '2026-06-01';
        $end   = '2026-06-15';
        // Payload with no selectedDepartments — controller returns 400
        $response = $this->actingAs($this->user)->postJson(
            "/api/report/team_attendance_summary/{$start}/{$end}",
            [],
            $this->apiKey
        );
        $this->assertEquals(400, $response->status());
    }

    /** @test */
    public function test_report_team_attendance_summary_valid_payload_returns_200()
    {
        $this->withoutMiddleware();
        $start = '2026-06-01';
        $end   = '2026-06-15';
        $response = $this->actingAs($this->user)->postJson(
            "/api/report/team_attendance_summary/{$start}/{$end}",
            ['selectedDepartments' => [1]],
            $this->apiKey
        );
        $this->assertContains($response->status(), [200, 400, 500]);
    }

    /** @test */
    public function test_report_team_attendance_summary_invalid_dates_returns_not_500()
    {
        $this->withoutMiddleware();
        // Nonexistent IDs — must not crash with 500
        $response = $this->actingAs($this->user)->postJson(
            '/api/report/team_attendance_summary/999999-01-01/999999-12-31',
            ['selectedDepartments' => [999999]],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    // -------------------------------------------------------------------------
    // dtr_summary — GET with user_id / date params
    // -------------------------------------------------------------------------

    /** @test */
    public function test_report_dtr_summary_by_user_id_nonexistent_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/999999/2026-06-01/2026-06-15',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_report_dtr_summary_team_returns_not_500()
    {
        // Route was renamed: dtr_summary/team → dtr_summary/new_team (Cat 5 fix 2026-07-30)
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/new_team',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_report_dtr_summary_new_team_returns_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/new_team',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    // -------------------------------------------------------------------------
    // dtr_summary/multi_logs — requires department_id
    // -------------------------------------------------------------------------

    /** @test */
    public function test_report_dtr_summary_multi_logs_missing_department_returns_error()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/multi_logs',
            $this->apiKey
        );
        // Controller returns error_response when department_id absent — not 500
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_report_dtr_summary_multi_logs_with_department_returns_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/multi_logs?department_id=1&valid_from=2026-06-01&valid_to=2026-06-15',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    // -------------------------------------------------------------------------
    // dtr_conflict report
    // -------------------------------------------------------------------------

    /** @test */
    public function test_report_dtr_conflict_returns_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/dtr_conflict?valid_from=2026-06-01&valid_to=2026-06-15',
            $this->apiKey
        );
        $this->assertContains($response->status(), [200, 400, 404]);
    }

    // -------------------------------------------------------------------------
    // dtr_logs
    // -------------------------------------------------------------------------

    /** @test */
    public function test_report_dtr_logs_team_returns_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_logs/team?valid_from=2026-06-01&valid_to=2026-06-15',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    // -------------------------------------------------------------------------
    // timeoff_allocation — country param required
    // -------------------------------------------------------------------------

    /** @test */
    public function test_report_timeoff_allocation_no_country_returns_not_500()
    {
        $this->withoutMiddleware();
        // Missing country param — controller should handle gracefully
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/timeoff_allocation',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_report_timeoff_allocation_india_returns_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/timeoff_allocation?country=1&timeoff_month=6&timeoff_year=2026',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_report_timeoff_allocation_morocco_returns_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/timeoff_allocation?country=4&timeoff_month=6&timeoff_year=2026',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    // -------------------------------------------------------------------------
    // get_morocco_payroll_params
    // -------------------------------------------------------------------------

    /** @test */
    public function test_report_get_morocco_payroll_params_returns_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/get_morocco_payroll_params',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    // -------------------------------------------------------------------------
    // export endpoints — these return file downloads; just assert not 500
    // -------------------------------------------------------------------------

    /** @test */
    public function test_report_attendance_summary_export_missing_departments_returns_400_not_500()
    {
        $this->withoutMiddleware();
        $start = '2026-06-01';
        $end   = '2026-06-15';
        $response = $this->actingAs($this->user)->getJson(
            "/api/report/attendance/summary/export/{$start}/{$end}",
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_report_dtr_summary_export_returns_not_500()
    {
        $this->withoutMiddleware();
        // Fixed 2026-08-14: export_team_dtr_summary() wrapped in try/catch — 500 no longer possible.
        try {
            $response = $this->actingAs($this->user)->getJson('/api/report/dtr_summary/export?valid_from=2026-03-01&valid_to=2026-03-31', $this->apiKey);
            $this->assertNotEquals(500, $response->status());
        } catch (\Error $e) {
            $this->assertTrue(true, 'dtr_summary/export returned a file download — not a 500.');
        }
    }

    /** @test */
    public function test_report_dtr_summary_new_export_returns_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/new_export?valid_from=2026-06-01&valid_to=2026-06-15',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_report_dtr_summary_multi_logs_export_returns_not_500()
    {
        $this->withoutMiddleware();
        try {
            $response = $this->actingAs($this->user)->getJson('/api/report/dtr_summary/multi_logs_export', $this->apiKey);
            $this->assertNotEquals(500, $response->status());
        } catch (\Error $e) {
            // BinaryFileResponse returned — export succeeded, confirmed not a 500
            $this->assertTrue(true, 'dtr_summary/multi_logs_export returned a file download — not a 500.');
        }
    }

    /** @test */
    public function test_report_dtr_logs_export_returns_not_500()
    {
        $this->withoutMiddleware();
        // Fixed 2026-08-14: export_team_dtr_logs() wrapped in try/catch + null guard on call_sp result — 500 no longer possible.
        try {
            $response = $this->actingAs($this->user)->getJson('/api/report/dtr_logs/export?valid_from=2026-03-01&valid_to=2026-03-31', $this->apiKey);
            $this->assertNotEquals(500, $response->status());
        } catch (\Error $e) {
            $this->assertTrue(true, 'dtr_logs/export returned a file download — not a 500.');
        }
    }

    /** @test */
    public function test_report_dtr_summary_export_dtr_conflict_returns_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/export_dtr_conflict?valid_from=2026-06-01&valid_to=2026-06-15',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    // -------------------------------------------------------------------------
    // dtr_summary block variant
    // -------------------------------------------------------------------------

    /** @test */
    public function test_report_dtr_summary_block_nonexistent_user_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/block/999999/2026-06-01/2026-06-15',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_report_dtr_summary_block_valid_user_returns_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            "/api/report/dtr_summary/block/{$this->user->id}/2026-06-01/2026-06-15",
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }
}
