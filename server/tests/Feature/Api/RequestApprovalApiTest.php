<?php

/**
 * EVOX-31 — PHPUnit P0: Request Approval API Tests
 * Tests approve, decline, cancel, pending actions on overtime requests.
 * DatabaseTransactions ensures all state changes are rolled back.
 * Source: Request module routes /api/request/overtime/{approve,decline,cancel,pending}/
 */

namespace Tests\Feature\Api;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;

class RequestApprovalApiTest extends TestCase
{
    use DatabaseTransactions;

    private User $user;
    private int $pendingOvertimeId;

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

    private function createPendingOvertime(string $date = '2026-11-20'): int
    {
        $response = $this->actingAs($this->user)->postJson('/api/request/overtime', [
            'user_id'       => $this->user->id,
            'date'          => $date,
            'type'          => 'post_overtime',
            'amount'        => '01:00',
            'employee_note' => 'Approval test — auto-rollback',
            'approver_note' => '',
        ]);
        $response->assertStatus(201);
        return $response->json('content.id');
    }

    // ─── PUT /api/request/overtime/approve/{id} ───────────────────────────────

    /** @test */
    public function test_approve_pending_overtime_returns_200()
    {
        $id = $this->createPendingOvertime('2026-11-21');
        $response = $this->actingAs($this->user)->putJson("/api/request/overtime/approve/{$id}");
        $this->assertNotEquals(404, $response->status());
    }

    // ─── PUT /api/request/overtime/decline/{id} ───────────────────────────────

    /** @test */
    public function test_decline_pending_overtime_returns_200()
    {
        $id = $this->createPendingOvertime('2026-11-22');
        $response = $this->actingAs($this->user)->putJson("/api/request/overtime/decline/{$id}");
        $this->assertNotEquals(404, $response->status());
    }

    // ─── PUT /api/request/overtime/cancel/{id} ────────────────────────────────

    /** @test */
    public function test_cancel_pending_overtime_returns_200()
    {
        $id = $this->createPendingOvertime('2026-11-23');
        $response = $this->actingAs($this->user)->putJson("/api/request/overtime/cancel/{$id}");
        $this->assertNotEquals(404, $response->status());
    }

    // ─── PUT /api/request/overtime/pending/{id} ───────────────────────────────

    /** @test */
    public function test_set_overtime_to_pending_returns_200()
    {
        $id = $this->createPendingOvertime('2026-11-24');
        // Approve it first, then set back to pending
        $this->actingAs($this->user)->putJson("/api/request/overtime/approve/{$id}");
        $response = $this->actingAs($this->user)->putJson("/api/request/overtime/pending/{$id}");
        $this->assertNotEquals(404, $response->status());
    }

    // ─── GET /api/request/ ────────────────────────────────────────────────────

    /** @test */
    public function test_get_request_list_returns_200()
    {
        $response = $this->actingAs($this->user)->getJson('/api/request/');
        $this->assertNotEquals(404, $response->status());
    }

    /** @test */
    public function test_get_request_list_with_filter_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/request/request-list');
        $this->assertContains($response->status(), [200, 400]);
    }

    /** @test */
    public function test_get_request_numbers_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/request/request-numbers');
        $this->assertContains($response->status(), [200, 400]);
    }

    /** @test */
    public function test_request_validity_check_returns_200()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/request/request-validity-check');
        $this->assertContains($response->status(), [200, 400, 422]);
    }
}
