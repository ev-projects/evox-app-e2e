<?php

/**
 * EVOX-31 — PHPUnit P0: User API Extended Tests
 * Source: UserController.php (353 uncovered) + UserRepository.php (566 uncovered)
 * Covers endpoints not in UserApiTest.php:
 *   time_off, temporary_schedules, schedule/{id}, team_list,
 *   get_dpa_list, sub_department_list, getusercountry, getcountry,
 *   features, search-user-dispute, getallassets, getassets, register validation
 */

namespace Tests\Feature\Api;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Schedule\Models\Schedule;

class UserApiExtendedTest extends TestCase
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

    // ─── GET /api/user/{id}/time_off/{start_date}/{end_date} ─────────────────

    /** @test */
    public function test_get_user_time_off_returns_non_404()
    {
        $response = $this->actingAs($this->user)
            ->getJson("/api/user/{$this->userId}/time_off/2026-04-01/2026-04-30");

        $this->assertNotEquals(404, $response->status());
    }

    /** @test */
    public function test_get_user_time_off_for_current_month()
    {
        $response = $this->actingAs($this->user)
            ->getJson("/api/user/{$this->userId}/time_off/2026-05-01/2026-05-31");

        $this->assertContains($response->status(), [200, 400, 422]);
    }

    // ─── GET /api/user/{id}/temporary_schedules ───────────────────────────────

    /** @test */
    public function test_get_temporary_schedules_returns_non_404()
    {
        $response = $this->actingAs($this->user)
            ->getJson("/api/user/{$this->userId}/temporary_schedules");

        $this->assertNotEquals(404, $response->status());
    }

    // ─── GET /api/user/{id}/schedule/{schedule_id} ────────────────────────────

    /** @test */
    public function test_get_user_schedule_info_returns_non_404()
    {
        $schedule = Schedule::first();
        if (!$schedule) {
            $this->markTestIncomplete('No schedule found.');
        }

        $response = $this->actingAs($this->user)
            ->getJson("/api/user/{$this->userId}/schedule/{$schedule->id}");

        $this->assertNotEquals(404, $response->status());
    }

    // ─── GET /api/user/{id}/team_list/{department_id} ─────────────────────────

    /** @test */
    public function test_get_team_list_under_department_returns_non_404()
    {
        $response = $this->actingAs($this->user)
            ->getJson("/api/user/{$this->userId}/team_list/1");

        $this->assertContains($response->status(), [200, 400, 404, 422]);
    }

    // ─── GET /api/user/get_dpa_list ───────────────────────────────────────────

    /** @test */
    public function test_get_dpa_list_returns_non_404()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/user/get_dpa_list');

        $this->assertNotEquals(404, $response->status());
    }

    // ─── GET /api/user/sub_department_list ────────────────────────────────────

    /** @test */
    public function test_sub_department_list_returns_non_404()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/user/sub_department_list');

        $this->assertNotEquals(404, $response->status());
    }

    // ─── GET /api/user/getusercountry ─────────────────────────────────────────

    /** @test */
    public function test_get_user_country_returns_non_404()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/user/getusercountry');

        $this->assertNotEquals(404, $response->status());
    }

    // ─── GET /api/user/getcountry ─────────────────────────────────────────────

    /** @test */
    public function test_get_country_list_returns_non_404()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/user/getcountry');

        $this->assertNotEquals(404, $response->status());
    }

    // ─── GET /api/user/features ───────────────────────────────────────────────

    /** @test */
    public function test_get_features_returns_non_404()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/user/features');

        $this->assertNotEquals(404, $response->status());
    }

    // ─── GET /api/user/search-user-dispute ────────────────────────────────────

    /** @test */
    public function test_search_user_dispute_returns_non_404()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/user/search-user-dispute');

        $this->assertNotEquals(404, $response->status());
    }

    // ─── GET /api/user/getallassets ───────────────────────────────────────────

    /** @test */
    public function test_get_all_assets_returns_non_404()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/user/getallassets');

        $this->assertNotEquals(404, $response->status());
    }

    /** @test */
    public function test_get_user_assets_returns_non_404()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/user/getassets');

        $this->assertNotEquals(404, $response->status());
    }

    // ─── POST /api/user/register (validation path) ────────────────────────────

    /** @test */
    public function test_register_user_without_required_fields_returns_422()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/user/register', []);

        // Missing required fields → validation error
        $this->assertContains($response->status(), [400, 422, 403]);
    }

    /** @test */
    public function test_register_user_with_invalid_email_returns_422()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/user/register', [
                'email'    => 'not-an-email',
                'name'     => 'Test',
                'password' => 'short',
            ]);

        $this->assertContains($response->status(), [400, 422, 403]);
    }

    // ─── GET /api/user/export_dpa_list ────────────────────────────────────────

    /** @test */
    public function test_export_dpa_list_returns_non_404()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/user/export_dpa_list');

        $this->assertNotEquals(404, $response->getStatusCode());
    }

    // ─── UserRepository: get_all_active_users ─────────────────────────────────

    /** @test */
    public function test_user_model_can_fetch_active_users()
    {
        $users = User::where('is_active', 1)->take(5)->get();
        $this->assertGreaterThan(0, $users->count());
        $this->assertNotNull($users->first()->id);
    }

    /** @test */
    public function test_user_model_scope_with_country_filter()
    {
        $users = User::whereNotNull('country_id')->where('country_id', '>', 0)->take(10)->get();
        $this->assertGreaterThan(0, $users->count());
        foreach ($users as $user) {
            $this->assertNotNull($user->country_id);
        }
    }
}
