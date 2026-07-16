<?php

/**
 * EVOX-31 — PHPUnit P0: Overtime API Endpoint Tests
 * Tests every endpoint in the Overtime request module.
 * Source: app/Modules/Request/Routes/api.php, OvertimeController, OvertimeRequest
 */

namespace Tests\Feature\Api;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;

class OvertimeApiTest extends TestCase
{
    use DatabaseTransactions;

    private User $user;
    private string $baseDate = '2026-09-01'; // future date unlikely to have existing records

    protected function setUp(): void
    {
        parent::setUp();
        // Get an active user with country_id (required for timezone lookup in controllers)
        $this->user = User::whereNotNull('country_id')
            ->where('country_id', '>', 0)
            ->where('is_active', 1)
            ->firstOrFail();
        $this->withoutMiddleware();
    }

    // ─── POST /api/request/overtime/ ─────────────────────────────────────────

    /** @test */
    public function test_create_overtime_returns_201_with_valid_payload()
    {
        $response = $this->actingAs($this->user)->postJson('/api/request/overtime', [
            'user_id'       => $this->user->id,
            'date'          => $this->baseDate,
            'type'          => 'post_overtime',
            'amount'        => '02:00',
            'employee_note' => 'PHPUnit test — disregard',
            'approver_note' => '',
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure(['message', 'content']);

        $this->assertDatabaseHas('overtimes', [
            'user_id' => $this->user->id,
            'date'    => $this->baseDate,
            'status'  => 'pending',
        ]);
    }

    /** @test */
    public function test_create_overtime_missing_date_returns_422()
    {
        $response = $this->actingAs($this->user)->postJson('/api/request/overtime', [
            'user_id' => $this->user->id,
            'type'    => 'post_overtime',
            'amount'  => '01:00',
        ]);
        $response->assertStatus(422);
    }

    /** @test */
    public function test_create_overtime_missing_user_id_returns_422()
    {
        $response = $this->actingAs($this->user)->postJson('/api/request/overtime', [
            'date'   => $this->baseDate,
            'type'   => 'post_overtime',
            'amount' => '01:00',
        ]);
        $response->assertStatus(422);
    }

    /** @test */
    public function test_create_overtime_invalid_type_returns_422()
    {
        $response = $this->actingAs($this->user)->postJson('/api/request/overtime', [
            'user_id' => $this->user->id,
            'date'    => $this->baseDate,
            'type'    => 'invalid_type',
            'amount'  => '01:00',
        ]);
        $response->assertStatus(422);
    }

    /** @test */
    public function test_create_overtime_amount_in_seconds_returns_422()
    {
        // amount must be H:i format, not seconds
        $response = $this->actingAs($this->user)->postJson('/api/request/overtime', [
            'user_id' => $this->user->id,
            'date'    => $this->baseDate,
            'type'    => 'post_overtime',
            'amount'  => '3600',
        ]);
        $response->assertStatus(422);
    }

    /** @test */
    public function test_create_overtime_duplicate_date_returns_422()
    {
        // Create first record
        $this->actingAs($this->user)->postJson('/api/request/overtime', [
            'user_id' => $this->user->id,
            'date'    => '2026-09-02',
            'type'    => 'post_overtime',
            'amount'  => '01:00',
        ]);

        // Same date for same user → unique constraint
        $response = $this->actingAs($this->user)->postJson('/api/request/overtime', [
            'user_id' => $this->user->id,
            'date'    => '2026-09-02',
            'type'    => 'post_overtime',
            'amount'  => '01:30',
        ]);
        $response->assertStatus(422);
    }

    /** @test */
    public function test_create_overtime_pre_overtime_type_accepted()
    {
        $response = $this->actingAs($this->user)->postJson('/api/request/overtime', [
            'user_id' => $this->user->id,
            'date'    => '2026-09-03',
            'type'    => 'pre_overtime',
            'amount'  => '01:00',
        ]);
        $response->assertStatus(201);
    }

    /** @test */
    public function test_unauthenticated_overtime_request_rejected()
    {
        // withoutMiddleware() is OFF for this test — we need auth to kick in
        $this->app->instance('middleware.disable', false);
        $response = $this->postJson('/api/request/overtime', [
            'user_id' => 1,
            'date'    => $this->baseDate,
            'type'    => 'post_overtime',
            'amount'  => '01:00',
        ]);
        $this->assertContains($response->status(), [401, 403]);
    }

    // ─── GET /api/request/overtime/{id} ──────────────────────────────────────

    /** @test */
    public function test_find_overtime_returns_200_for_existing_record()
    {
        // Create a record first
        $create = $this->actingAs($this->user)->postJson('/api/request/overtime', [
            'user_id' => $this->user->id,
            'date'    => '2026-09-04',
            'type'    => 'post_overtime',
            'amount'  => '01:00',
        ]);
        $create->assertStatus(201);
        $id = $create->json('content.id');

        $response = $this->actingAs($this->user)->getJson("/api/request/overtime/{$id}");
        $response->assertStatus(200);
        $this->assertEquals($id, $response->json('content.id'));
    }

    // ─── PUT /api/request/overtime/{id} ──────────────────────────────────────

    /** @test */
    public function test_update_pending_overtime_returns_200()
    {
        $create = $this->actingAs($this->user)->postJson('/api/request/overtime', [
            'user_id' => $this->user->id,
            'date'    => '2026-09-05',
            'type'    => 'post_overtime',
            'amount'  => '01:00',
        ]);
        $create->assertStatus(201);
        $id = $create->json('content.id');

        $response = $this->actingAs($this->user)->putJson("/api/request/overtime/{$id}", [
            'user_id' => $this->user->id,
            'date'    => '2026-09-05',
            'type'    => 'post_overtime',
            'amount'  => '02:00',
        ]);
        $response->assertStatus(200);
    }

    // ─── DELETE /api/request/overtime/{id} ───────────────────────────────────

    /** @test */
    public function test_delete_pending_overtime_returns_200()
    {
        $create = $this->actingAs($this->user)->postJson('/api/request/overtime', [
            'user_id' => $this->user->id,
            'date'    => '2026-09-06',
            'type'    => 'post_overtime',
            'amount'  => '01:00',
        ]);
        $create->assertStatus(201);
        $id = $create->json('content.id');

        $response = $this->actingAs($this->user)->deleteJson("/api/request/overtime/{$id}");
        $response->assertStatus(200);

        $this->assertDatabaseMissing('overtimes', [
            'id'         => $id,
            'deleted_at' => null,
        ]);
    }
}
