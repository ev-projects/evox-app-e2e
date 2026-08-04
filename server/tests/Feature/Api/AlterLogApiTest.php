<?php

/**
 * EVOX-31 — PHPUnit P0: Alter Log API Endpoint Tests
 * Source: AlterLogController, AlterLogRequest, Request module routes
 */

namespace Tests\Feature\Api;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;

class AlterLogApiTest extends TestCase
{
    use DatabaseTransactions;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Notification::fake();
        $this->user = User::whereNotNull('country_id')
            ->where('country_id', '>', 0)
            ->where('is_active', 1)
            ->firstOrFail();
        $this->withoutMiddleware();
    }

    private function validPayload(string $date = '2026-10-01'): array
    {
        return [
            'user_id'       => $this->user->id,
            'date'          => $date,
            'new_time_in'   => "{$date} 09:00:00",
            'new_time_out'  => "{$date} 18:00:00",
            'employee_note' => 'PHPUnit test alter log',
        ];
    }

    // ─── POST /api/request/alter_log/ ────────────────────────────────────────

    /** @test */
    public function test_create_alter_log_returns_201_with_valid_payload()
    {
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log', $this->validPayload());
        $response->assertStatus(201);
        $response->assertJsonStructure(['message', 'content']);
        $this->assertDatabaseHas('alter_logs', [
            'user_id' => $this->user->id,
            'date'    => '2026-10-01',
            'status'  => 'pending',
        ]);
    }

    /** @test */
    public function test_create_alter_log_missing_date_returns_422()
    {
        $payload = $this->validPayload();
        unset($payload['date']);
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log', $payload);
        $response->assertStatus(422);
    }

    /** @test */
    public function test_create_alter_log_missing_new_time_in_returns_422()
    {
        $payload = $this->validPayload('2026-10-02');
        unset($payload['new_time_in']);
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log', $payload);
        $response->assertStatus(422);
    }

    /** @test */
    public function test_create_alter_log_missing_new_time_out_returns_422()
    {
        $payload = $this->validPayload('2026-10-03');
        unset($payload['new_time_out']);
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log', $payload);
        $response->assertStatus(422);
    }

    /** @test */
    public function test_create_alter_log_missing_employee_note_returns_422()
    {
        $payload = $this->validPayload('2026-10-04');
        unset($payload['employee_note']);
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log', $payload);
        $response->assertStatus(422);
    }

    /** @test */
    public function test_create_alter_log_wrong_datetime_format_returns_422()
    {
        $payload = $this->validPayload('2026-10-05');
        $payload['new_time_in'] = '09:00'; // wrong format, should be Y-m-d H:i:s
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log', $payload);
        $response->assertStatus(422);
    }

    /** @test */
    public function test_create_alter_log_duplicate_date_returns_422()
    {
        $this->actingAs($this->user)->postJson('/api/request/alter_log', $this->validPayload('2026-10-06'));
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log', $this->validPayload('2026-10-06'));
        $response->assertStatus(422);
    }

    /** @test */
    public function test_create_alter_log_nonexistent_user_id_returns_422()
    {
        $payload = $this->validPayload('2026-10-07');
        $payload['user_id'] = 9999999;
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log', $payload);
        $response->assertStatus(422);
    }

    // ─── GET /api/request/alter_log/{id} ─────────────────────────────────────

    /** @test */
    public function test_find_alter_log_returns_200_for_existing_record()
    {
        $create = $this->actingAs($this->user)->postJson('/api/request/alter_log', $this->validPayload('2026-10-08'));
        $create->assertStatus(201);
        $id = $create->json('content.id');

        $response = $this->actingAs($this->user)->getJson("/api/request/alter_log/{$id}");
        $response->assertStatus(200);
        $this->assertEquals($id, $response->json('content.id'));
    }

    // ─── DELETE /api/request/alter_log/{id} ──────────────────────────────────

    /** @test */
    public function test_delete_pending_alter_log_returns_200()
    {
        $create = $this->actingAs($this->user)->postJson('/api/request/alter_log', $this->validPayload('2026-10-09'));
        $create->assertStatus(201);
        $id = $create->json('content.id');

        $response = $this->actingAs($this->user)->deleteJson("/api/request/alter_log/{$id}");
        $response->assertStatus(200);
        $this->assertDatabaseMissing('alter_logs', ['id' => $id, 'deleted_at' => null]);
    }
}
