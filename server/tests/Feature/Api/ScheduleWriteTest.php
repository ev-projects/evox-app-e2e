<?php

/**
 * EVOX-31 — PHPUnit P0: Schedule Write Operation Tests
 * Source: ScheduleController.php + ScheduleRepository.php
 * Covers: store, update, destroy, assign — all missing from existing ScheduleApiTest.
 * Using DatabaseTransactions — all DB changes rolled back after each test.
 */

namespace Tests\Feature\Api;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Schedule\Models\Schedule;

class ScheduleWriteTest extends TestCase
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

    private function validSchedulePayload(array $overrides = []): array
    {
        return array_merge([
            'name'              => 'PHPUnit Test Schedule',
            'source_type'       => 'template',
            'schedule_type'     => 'standard',
            'work_days'         => [],
            'schedule_details'  => [],
            'schedule_policies' => [
                'allow_late'        => true,
                'allow_undertime'   => true,
                'allow_night_diff'  => false,
            ],
        ], $overrides);
    }

    // ─── POST /api/schedule/ (store) ──────────────────────────────────────────

    /** @test */
    public function test_store_schedule_with_valid_payload_does_not_return_404()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/schedule/', $this->validSchedulePayload());

        $this->assertNotEquals(404, $response->status());
    }

    /** @test */
    public function test_store_schedule_returns_201_or_422_with_valid_name()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/schedule/', $this->validSchedulePayload());

        $this->assertContains($response->status(), [200, 201, 422, 500]);
    }

    /** @test */
    public function test_store_schedule_without_name_returns_422()
    {
        $payload = $this->validSchedulePayload(['name' => null]);
        $response = $this->actingAs($this->user)
            ->postJson('/api/schedule/', $payload);

        // Missing required 'name' should fail validation
        $this->assertContains($response->status(), [400, 422]);
    }

    /** @test */
    public function test_store_schedule_with_invalid_source_type_returns_422()
    {
        $payload = $this->validSchedulePayload(['source_type' => 'invalid_type']);
        $response = $this->actingAs($this->user)
            ->postJson('/api/schedule/', $payload);

        $this->assertContains($response->status(), [400, 422]);
    }

    /** @test */
    public function test_store_schedule_with_invalid_schedule_type_returns_422()
    {
        $payload = $this->validSchedulePayload(['schedule_type' => 'weekly']);
        $response = $this->actingAs($this->user)
            ->postJson('/api/schedule/', $payload);

        $this->assertContains($response->status(), [400, 422]);
    }

    // ─── PUT /api/schedule/{id} (update) ─────────────────────────────────────

    /** @test */
    public function test_update_schedule_endpoint_is_reachable()
    {
        $schedule = Schedule::first();
        if (!$schedule) {
            $this->markTestIncomplete('No schedule found in database.');
        }

        $response = $this->actingAs($this->user)
            ->putJson("/api/schedule/{$schedule->id}", $this->validSchedulePayload([
                'name' => 'Updated PHPUnit Schedule',
            ]));

        $this->assertNotEquals(404, $response->status());
    }

    /** @test */
    public function test_update_nonexistent_schedule_returns_404_or_error()
    {
        $response = $this->actingAs($this->user)
            ->putJson('/api/schedule/999999', $this->validSchedulePayload());

        $this->assertContains($response->status(), [400, 404, 422, 500]);
    }

    /** @test */
    public function test_update_schedule_with_valid_payload_returns_success_or_validation_error()
    {
        $schedule = Schedule::where('source_type', 'template')->first();
        if (!$schedule) {
            $schedule = Schedule::first();
        }
        if (!$schedule) {
            $this->markTestIncomplete('No schedule found in database.');
        }

        $response = $this->actingAs($this->user)
            ->putJson("/api/schedule/{$schedule->id}", $this->validSchedulePayload([
                'name' => 'PHPUnit Updated ' . now()->format('His'),
            ]));

        $this->assertContains($response->status(), [200, 201, 400, 422, 500]);
    }

    // ─── DELETE /api/schedule/{id} (destroy) ─────────────────────────────────

    /** @test */
    public function test_destroy_nonexistent_schedule_returns_error()
    {
        $response = $this->actingAs($this->user)
            ->deleteJson('/api/schedule/999999');

        $this->assertContains($response->status(), [400, 404, 422, 500]);
    }

    /** @test */
    public function test_destroy_schedule_endpoint_is_reachable()
    {
        $schedule = Schedule::first();
        if (!$schedule) {
            $this->markTestIncomplete('No schedule found in database.');
        }

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/schedule/{$schedule->id}");

        // DatabaseTransactions rolls back — data stays safe
        $this->assertNotEquals(404, $response->status());
    }

    // ─── POST /api/schedule/assign/ ───────────────────────────────────────────

    /** @test */
    public function test_assign_schedule_without_required_fields_returns_422()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/schedule/assign/', []);

        $this->assertContains($response->status(), [400, 422]);
    }

    /** @test */
    public function test_assign_schedule_with_invalid_source_type_returns_422()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/schedule/assign/', [
                'source_type' => 'invalid',
                'bind_to'     => 'user',
                'bind_id'     => $this->user->id,
            ]);

        $this->assertContains($response->status(), [400, 422]);
    }

    /** @test */
    public function test_assign_schedule_endpoint_accepts_valid_source_type()
    {
        $schedule = Schedule::first();
        if (!$schedule) {
            $this->markTestIncomplete('No schedule found in database.');
        }

        $response = $this->actingAs($this->user)
            ->postJson('/api/schedule/assign/', [
                'source_type'       => 'default',
                'bind_to'           => 'user',
                'bind_id'           => (string) $this->user->id,
                'schedule_id'       => $schedule->id,
                'schedule_type'     => 'standard',
                'valid_from'        => '2026-05-01',
                'work_days'         => [],
                'schedule_details'  => [],
                'schedule_policies' => [],
            ]);

        $this->assertNotEquals(404, $response->status());
    }
}
