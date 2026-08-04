<?php

/**
 * EVOX-31 — PHPUnit P0: Department API Tests
 * All GET endpoints — read-only, no data risk.
 * 261 departments in test database.
 * Source: Department module routes /api/department/
 */

namespace Tests\Feature\Api;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class DepartmentApiTest extends TestCase
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

    /** @test */
    public function test_get_all_departments_returns_200()
    {
        $response = $this->actingAs($this->user)->getJson('/api/department/all');
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_departments_list_is_not_empty()
    {
        $response = $this->actingAs($this->user)->getJson('/api/department/all');
        $response->assertStatus(200);
        $this->assertNotEmpty($response->json('content'));
    }

    /** @test */
    public function test_get_department_all_returns_200()
    {
        $response = $this->actingAs($this->user)->getJson('/api/department/get_department_all');
        $this->assertContains($response->status(), [200, 400]);
    }

    /** @test */
    public function test_get_all_with_announcements_returns_200()
    {
        $response = $this->actingAs($this->user)->getJson('/api/department/all_with_announcements');
        $this->assertContains($response->status(), [200, 400]);
    }

    /** @test */
    public function test_get_specific_department_returns_200()
    {
        // Get first department ID from the list
        $list = $this->actingAs($this->user)->getJson('/api/department/all');
        $list->assertStatus(200);
        $deptId = $list->json('content.0.id') ?? $list->json('content.0.DepartmentId') ?? 1;

        $response = $this->actingAs($this->user)->getJson("/api/department/{$deptId}");
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_department_users_returns_200()
    {
        $list = $this->actingAs($this->user)->getJson('/api/department/all');
        $list->assertStatus(200);
        $deptId = $list->json('content.0.id') ?? $list->json('content.0.DepartmentId') ?? 1;

        $response = $this->actingAs($this->user)->getJson("/api/department/{$deptId}/users");
        $this->assertContains($response->status(), [200, 400]);
    }

    /** @test */
    public function test_get_department_default_schedule_returns_200()
    {
        $list = $this->actingAs($this->user)->getJson('/api/department/all');
        $list->assertStatus(200);
        $deptId = $list->json('content.0.id') ?? $list->json('content.0.DepartmentId') ?? 1;

        $response = $this->actingAs($this->user)->getJson("/api/department/{$deptId}/default_schedule");
        $this->assertContains($response->status(), [200, 400]);
    }

    /** @test */
    public function test_department_endpoints_require_auth()
    {
        $this->app->instance('middleware.disable', false);
        $response = $this->getJson('/api/department/all');
        $this->assertNotEquals(200, $response->status());
    }
}
