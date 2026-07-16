<?php
// CoverageMax — generated 2026-07-08, raises coverage on untested Department-module routes.

namespace Tests\Feature\CoverageMax;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Department module — endpoints with no prior PHPUnit coverage. All require jwtauth + auth.apikey.
 *   GET  department/get_department_all
 *   GET  department/all_with_announcements
 *   GET  department/{id}/users                          (DepartmentController@users)
 *   GET  department/announcements/increment_dashboard_departments
 *   PUT  department/announcements/my_handle_announcements/{id}/update-status
 *   PUT  department/announcements/hr/{id}/update-status
 *
 *   Pattern B — no JWT => 401.   Pattern A — withoutMiddleware()+actingAs => not 500.
 */
class DepartmentEndpointsTest extends TestCase
{
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
            $this->markTestSkipped('No users in test DB.');
        }
    }

    /** Resolve a real department id defensively (Eloquent table `departments`). */
    private function realDepartmentId(): int
    {
        try {
            $d = \App\Modules\Department\Models\Department::first();
            return $d ? $d->id : 1;
        } catch (\Throwable $e) {
            return 1;
        }
    }

    // ─── Pattern B: auth enforcement ─────────────────────────────────────────

    /** @test */
    public function test_get_department_all_without_token_returns_401()
    {
        $this->getJson('/api/department/get_department_all', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_all_with_announcements_without_token_returns_401()
    {
        $this->getJson('/api/department/all_with_announcements', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_department_users_without_token_returns_401()
    {
        $this->getJson('/api/department/1/users', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_increment_dashboard_departments_without_token_returns_401()
    {
        $this->getJson('/api/department/announcements/increment_dashboard_departments', $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_my_handle_update_status_without_token_returns_401()
    {
        $this->putJson('/api/department/announcements/my_handle_announcements/1/update-status', [], $this->apiKey)->assertStatus(401);
    }

    /** @test */
    public function test_hr_update_status_without_token_returns_401()
    {
        $this->putJson('/api/department/announcements/hr/1/update-status', [], $this->apiKey)->assertStatus(401);
    }

    // ─── Pattern A: controller body must not 500 ─────────────────────────────

    /** @test */
    public function test_get_department_all_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/department/get_department_all', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_department_all_returns_json_on_200()
    {
        // Note: get_department_all returns the {message,content} envelope only for
        // handler-level users (LevelId != 0); for admin/LevelId==0 it returns a bare [].
        // Both are valid 200 JSON — assert it decodes, not a fixed shape.
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/department/get_department_all', $this->apiKey);
        if ($response->status() === 200) {
            $this->assertIsArray($response->json());
        }
    }

    /** @test */
    public function test_all_with_announcements_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/department/all_with_announcements', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_department_users_with_real_id_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $deptId = $this->realDepartmentId();
        $response = $this->actingAs($this->user)->getJson("/api/department/{$deptId}/users", $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_department_users_nonexistent_id_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/department/999999/users', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_increment_dashboard_departments_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/department/announcements/increment_dashboard_departments', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_my_handle_update_status_nonexistent_id_returns_not_500()
    {
        // PUT against a nonexistent announcement id inside a rolled-back transaction —
        // exercises AnnouncementController@update_status without mutating real rows.
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->putJson('/api/department/announcements/my_handle_announcements/999999/update-status',
                ['status' => 0], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_hr_update_status_nonexistent_id_returns_not_500()
    {
        $this->requireUser();
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->putJson('/api/department/announcements/hr/999999/update-status',
                ['status' => 0], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }
}
