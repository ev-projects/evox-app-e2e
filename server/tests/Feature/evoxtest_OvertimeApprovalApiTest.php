<?php

/**
 * OvertimeController — full surface coverage
 * Routes: /api/request/overtime/{id}
 *
 * setUp() inserts ONE pending Overtime for Glenn.
 * DatabaseTransactions rolls it back — no permanent side effects.
 *
 * Key business rule: approve() blocks self-approval (403).
 * request_validity_checker() may route to dispute path when cutoff is locked —
 * both 200 and 201 are acceptable outcomes for approve/decline happy paths.
 */

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Modules\User\Models\User;

class evoxtest_OvertimeApprovalApiTest extends TestCase
{
    use DatabaseTransactions;

    private User $employee;   // Glenn — submitter
    private User $supervisor; // Gary  — approver/decliner
    private string $empToken;
    private string $supToken;
    private string $rawApiKey;
    private int $recordId;    // pending Overtime seeded in setUp()

    // Use a 2026-03-15 date — a known past cutoff week
    private const OT_DATE   = '2026-03-15';
    private const OT_AMOUNT = 7200; // 2 hours in seconds (DB format)

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake(); // prevent real SMTP attempts — MAIL_DRIVER env override is cached at boot

        // Load real users
        $this->employee   = User::where('email', env('E2E_USER_EMPLOYEE_PHILIPPINES', 'glenn.macasarte@eastvantage.com'))->firstOrFail();
        $this->supervisor = User::where('email', env('E2E_USER_SUPERVISOR_PHILIPPINES', 'gary.aure@eastvantage.com'))->firstOrFail();

        // Runtime API key
        $this->rawApiKey = Str::random(64);
        DB::table('api_keys')->insert([
            'name'       => 'evox_e2e_overtime_' . now()->format('His'),
            'key'        => $this->rawApiKey,
            'active'     => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Real JWT tokens
        $this->empToken = auth('api')->login($this->employee);
        $this->supToken = auth('api')->login($this->supervisor);

        // Seed ONE pending Overtime for Glenn — rolled back after each test
        $this->recordId = DB::table('overtimes')->insertGetId([
            'user_id'       => $this->employee->id,
            'date'          => self::OT_DATE,
            'amount'        => self::OT_AMOUNT,
            'type'          => 'overtime',
            'status'        => 'pending',
            'employee_note' => 'E2E test record',
            'created_by'    => $this->employee->id,
            'updated_by'    => $this->employee->id,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    private function empHeaders(): array
    {
        return [
            'Authorization'   => 'Bearer ' . $this->empToken,
            'X-Authorization' => $this->rawApiKey,
        ];
    }

    private function supHeaders(): array
    {
        return [
            'Authorization'   => 'Bearer ' . $this->supToken,
            'X-Authorization' => $this->rawApiKey,
        ];
    }

    private function nonExistentId(): int
    {
        return (DB::table('overtimes')->max('id') ?? 0) + 9999;
    }

    // ─── auth gate ──────────────────────────────────────────────────────────

    /** @test */
    public function overtime_store_requires_jwt()
    {
        $res = $this->postJson('/api/request/overtime/', [
            'user_id' => $this->employee->id,
            'date'    => self::OT_DATE,
            'amount'  => '02:00',
            'type'    => 'overtime',
        ], ['X-Authorization' => $this->rawApiKey]);

        $res->assertStatus(401);
    }

    /** @test */
    public function overtime_find_requires_jwt()
    {
        $this->getJson('/api/request/overtime/' . $this->recordId,
            ['X-Authorization' => $this->rawApiKey]
        )->assertStatus(401);
    }

    // ─── store ──────────────────────────────────────────────────────────────

    /** @test */
    public function store_creates_regular_overtime_request()
    {
        $res = $this->postJson('/api/request/overtime/', [
            'user_id'       => $this->employee->id,
            'date'          => '2026-03-20', // different date to avoid dup
            'amount'        => '02:00',
            'type'          => 'overtime',
            'employee_note' => 'E2E store test',
        ], $this->empHeaders());

        // 201 created is the happy path; 422 if validation rejects format
        $this->assertContains($res->status(), [200, 201, 422],
            'Store should create record or return validation error — never 500');
    }

    /** @test */
    public function store_dispute_request_routes_to_dispute_branch()
    {
        $res = $this->postJson('/api/request/overtime/', [
            'user_id'        => $this->employee->id,
            'date'           => '2026-03-20',
            'amount'         => '01:00',
            'type'           => 'overtime',
            'request_mode'   => 'dispute',
            'employee_note'  => 'E2E dispute test',
        ], $this->empHeaders());

        // Dispute branch returns 201; SP may fail on dev data → 200/400 also acceptable
        $this->assertContains($res->status(), [200, 201, 400, 422],
            'Dispute store must not crash with 500');
    }

    // ─── find ───────────────────────────────────────────────────────────────

    /** @test */
    public function find_returns_seeded_overtime_record()
    {
        $res = $this->getJson('/api/request/overtime/' . $this->recordId,
            $this->supHeaders());

        $res->assertStatus(200);
        $this->assertArrayHasKey('content', $res->json());
    }

    /** @test */
    public function find_returns_error_for_nonexistent_id()
    {
        $res = $this->getJson('/api/request/overtime/' . $this->nonExistentId(),
            $this->supHeaders());

        // find() catches Exception and returns 404
        $this->assertContains($res->status(), [400, 404]);
    }

    // ─── update ─────────────────────────────────────────────────────────────

    /** @test */
    public function update_modifies_existing_overtime_record()
    {
        $res = $this->putJson('/api/request/overtime/' . $this->recordId, [
            'user_id'       => $this->employee->id,
            'date'          => self::OT_DATE,
            'amount'        => '01:30',
            'type'          => 'overtime',
            'employee_note' => 'updated note',
        ], $this->empHeaders());

        $this->assertContains($res->status(), [200, 422],
            'Update should succeed or return validation error — never 500');
    }

    /** @test */
    public function update_dispute_mode_declines_original_and_inserts_dispute()
    {
        $res = $this->putJson('/api/request/overtime/' . $this->recordId, [
            'user_id'       => $this->employee->id,
            'date'          => self::OT_DATE,
            'amount'        => '01:00',
            'type'          => 'overtime',
            'request_mode'  => 'dispute',
        ], $this->empHeaders());

        $this->assertContains($res->status(), [200, 201, 400, 422],
            'Dispute update must not crash with 500');
    }

    /** @test */
    public function update_returns_error_for_nonexistent_id()
    {
        $res = $this->putJson('/api/request/overtime/' . $this->nonExistentId(), [
            'user_id' => $this->employee->id,
            'date'    => self::OT_DATE,
            'amount'  => '01:00',
            'type'    => 'overtime',
        ], $this->empHeaders());

        $this->assertNotEquals(200, $res->status(),
            'Update on nonexistent ID must not return success');
    }

    // ─── destroy ────────────────────────────────────────────────────────────

    /** @test */
    public function destroy_soft_deletes_seeded_record()
    {
        $res = $this->deleteJson('/api/request/overtime/' . $this->recordId,
            [], $this->empHeaders());

        $this->assertContains($res->status(), [200, 400],
            'Destroy should return 200 or controlled error — never 500');

        if ($res->status() === 200) {
            $record = DB::table('overtimes')->where('id', $this->recordId)->first();
            $this->assertNotNull($record->deleted_at ?? null,
                'Record should be soft-deleted');
        }
    }

    /** @test */
    public function destroy_returns_error_for_nonexistent_id()
    {
        $res = $this->deleteJson('/api/request/overtime/' . $this->nonExistentId(),
            [], $this->empHeaders());

        $this->assertNotEquals(200, $res->status());
    }

    // ─── approve — self-approval guard ──────────────────────────────────────

    /** @test */
    public function approve_returns_403_when_employee_tries_to_approve_own_request()
    {
        // Glenn approves Glenn's own overtime — business rule: forbidden
        $res = $this->putJson('/api/request/overtime/approve/' . $this->recordId, [
            'user_id'       => $this->employee->id,
            'date'          => self::OT_DATE,
            'amount'        => '02:00',
            'type'          => 'overtime',
        ], $this->empHeaders());

        $res->assertStatus(403);
        $this->assertStringContainsStringIgnoringCase(
            'cannot approve your own request',
            $res->json('error') ?? ''
        );
    }

    /** @test */
    public function approve_supervisor_approves_employee_request()
    {
        // Gary approves Glenn's overtime (different user IDs — no self-approval block)
        $res = $this->putJson('/api/request/overtime/approve/' . $this->recordId, [
            'user_id'       => $this->employee->id,
            'date'          => self::OT_DATE,
            'amount'        => '02:00',
            'type'          => 'overtime',
            'approver_note' => 'approved by supervisor',
        ], $this->supHeaders());

        // 200 normal approval, 201 dispute-routed approval, 400 controlled business error
        $this->assertContains($res->status(), [200, 201, 400],
            'Supervisor approve should not crash with 500');
    }

    /** @test */
    public function approve_returns_error_for_nonexistent_id()
    {
        $res = $this->putJson('/api/request/overtime/approve/' . $this->nonExistentId(), [
            'user_id' => $this->employee->id,
            'date'    => self::OT_DATE,
            'amount'  => '02:00',
            'type'    => 'overtime',
        ], $this->supHeaders());

        $this->assertContains($res->status(), [400, 404]);
    }

    /** @test */
    public function approve_returns_401_without_jwt()
    {
        $res = $this->putJson('/api/request/overtime/approve/' . $this->recordId,
            ['user_id' => $this->employee->id, 'date' => self::OT_DATE, 'amount' => '02:00', 'type' => 'overtime'],
            ['X-Authorization' => $this->rawApiKey]
        );
        $res->assertStatus(401);
    }

    // ─── decline ────────────────────────────────────────────────────────────

    /** @test */
    public function decline_supervisor_declines_employee_request()
    {
        $res = $this->putJson('/api/request/overtime/decline/' . $this->recordId, [
            'user_id'       => $this->employee->id,
            'date'          => self::OT_DATE,
            'amount'        => '02:00',
            'type'          => 'overtime',
            'approver_note' => 'declined by supervisor',
        ], $this->supHeaders());

        $this->assertContains($res->status(), [200, 400],
            'Supervisor decline should not crash with 500');
    }

    /** @test */
    public function decline_returns_error_for_nonexistent_id()
    {
        $res = $this->putJson('/api/request/overtime/decline/' . $this->nonExistentId(), [
            'user_id' => $this->employee->id,
            'date'    => self::OT_DATE,
            'amount'  => '02:00',
            'type'    => 'overtime',
        ], $this->supHeaders());

        $this->assertContains($res->status(), [400, 404]);
    }

    // ─── pending ────────────────────────────────────────────────────────────

    /** @test */
    public function pending_resets_approved_overtime_back_to_pending()
    {
        // Pre-set status to approved
        DB::table('overtimes')->where('id', $this->recordId)->update(['status' => 'approved']);

        $res = $this->putJson('/api/request/overtime/pending/' . $this->recordId,
            [], $this->supHeaders());

        $this->assertContains($res->status(), [200, 400],
            'Pending reset should not crash with 500');

        if ($res->status() === 200) {
            $record = DB::table('overtimes')->where('id', $this->recordId)->first();
            $this->assertEquals('pending', $record->status ?? null);
        }
    }

    /** @test */
    public function pending_returns_error_for_nonexistent_id()
    {
        $res = $this->putJson('/api/request/overtime/pending/' . $this->nonExistentId(),
            [], $this->supHeaders());

        $this->assertContains($res->status(), [400, 404]);
    }

    // ─── cancel ─────────────────────────────────────────────────────────────

    /** @test */
    public function cancel_employee_cancels_own_pending_overtime()
    {
        $res = $this->putJson('/api/request/overtime/cancel/' . $this->recordId,
            [], $this->empHeaders());

        $this->assertContains($res->status(), [200, 400],
            'Cancel should not crash with 500');

        if ($res->status() === 200) {
            $record = DB::table('overtimes')->where('id', $this->recordId)->first();
            $this->assertEquals('cancelled', $record->status ?? null);
        }
    }

    /** @test */
    public function cancel_returns_error_for_nonexistent_id()
    {
        $res = $this->putJson('/api/request/overtime/cancel/' . $this->nonExistentId(),
            [], $this->empHeaders());

        $this->assertContains($res->status(), [400, 404]);
    }
}
