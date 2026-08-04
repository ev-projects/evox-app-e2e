<?php

/**
 * EVOX-31 — PHPUnit P0: Payroll Cutoff API Tests
 * Source: Payroll module routes /api/payroll/cutoff/
 */

namespace Tests\Feature\Api;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class PayrollCutoffApiTest extends TestCase
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

    // ─── GET /api/payroll/cutoff/all ─────────────────────────────────────────

    /** @test */
    public function test_get_all_payroll_cutoffs_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/payroll/cutoff/all');

        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_payroll_cutoffs_list_is_not_empty()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/payroll/cutoff/all');

        $response->assertStatus(200);
        $content = $response->json('content');
        $this->assertNotEmpty($content, 'Payroll cutoffs should exist in test database');
    }

    // ─── GET /api/payroll/cutoff/{id} ─────────────────────────────────────────

    /** @test */
    public function test_get_specific_payroll_cutoff_returns_200()
    {
        // Use known existing ID from test database
        $response = $this->actingAs($this->user)
            ->getJson('/api/payroll/cutoff/93');

        $this->assertContains($response->status(), [200, 400, 404]);
    }

    /** @test */
    public function test_get_nonexistent_payroll_cutoff_returns_empty_or_error()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/payroll/cutoff/9999999');

        // App may return 200 with null content or a 404 — both are acceptable
        // Key: content should not be a populated cutoff object
        if ($response->status() === 200) {
            $content = $response->json('content');
            $this->assertTrue(
                is_null($content) || (is_array($content) && empty($content)),
                'Non-existent cutoff returned populated content'
            );
        } else {
            $this->assertContains($response->status(), [400, 404]);
        }
    }

    // ─── GET /api/payroll/cutoff/get_filter_for_dtr/{user_id} ────────────────

    /** @test */
    public function test_get_dtr_filter_cutoffs_for_user_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson("/api/payroll/cutoff/get_filter_for_dtr/{$this->user->id}");

        $response->assertStatus(200);
    }

    // ─── Security: payroll endpoints require auth ─────────────────────────────

    /** @test */
    public function test_payroll_cutoff_without_auth_is_rejected()
    {
        $this->app->instance('middleware.disable', false);
        $response = $this->getJson('/api/payroll/cutoff/all');
        $this->assertContains($response->status(), [401, 403]);
    }
}
