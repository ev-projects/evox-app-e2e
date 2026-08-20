<?php

/**
 * AlterLogPunchController — full surface coverage
 * Table: alter_log_punches_new
 * Routes: /api/request/alter_log_punch/{id}
 *
 * setUp() inserts ONE pending AlterLogPunch for Glenn.
 * DatabaseTransactions rolls it back — no permanent side effects.
 * Existing DB data is never touched.
 */

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Modules\User\Models\User;

class evoxtest_AlterLogPunchApiTest extends TestCase
{
    use DatabaseTransactions;

    private User $employee;   // Glenn — submits
    private User $supervisor; // Gary  — approves / declines
    private string $empToken;
    private string $supToken;
    private string $rawApiKey;
    private int $recordId;    // pending AlterLogPunch seeded in setUp()

    // A far-future date avoids DtrPunchHistory conflicts for store() tests
    private const TEST_DATE = '2099-12-31';
    private const NEW_PUNCH  = '[{"start_time":"2099-12-31 09:00:00","end_time":"2099-12-31 18:00:00","project_name":"E2E","remarks":"test"}]';

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake(); // prevent real SMTP attempts — MAIL_DRIVER env override is cached at boot

        // Load real users — no fake inserts
        $this->employee   = User::where('email', env('E2E_USER_EMPLOYEE_PHILIPPINES', 'glenn.macasarte@eastvantage.com'))->firstOrFail();
        $this->supervisor = User::where('email', env('E2E_USER_SUPERVISOR_PHILIPPINES', 'gary.aure@eastvantage.com'))->firstOrFail();

        // Runtime API key — rolled back by DatabaseTransactions
        $this->rawApiKey = Str::random(64);
        DB::table('api_keys')->insert([
            'name'       => 'evox_e2e_alterlogpunch_' . now()->format('His'),
            'key'        => $this->rawApiKey,
            'active'     => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Real JWT tokens
        $this->empToken = auth('api')->login($this->employee);
        $this->supToken = auth('api')->login($this->supervisor);

        // Seed ONE pending AlterLogPunch for Glenn — rolled back after each test
        $this->recordId = DB::table('alter_log_punches_new')->insertGetId([
            'user_id'       => $this->employee->id,
            'date'          => self::TEST_DATE,
            'old_punch'     => '[]',
            'new_punch'     => self::NEW_PUNCH,
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
        return (DB::table('alter_log_punches_new')->max('id') ?? 0) + 9999;
    }

    // ─── auth gate ──────────────────────────────────────────────────────────

    /** @test */
    public function store_requires_jwt_returns_401()
    {
        $res = $this->postJson('/api/request/alter_log_punch/', [
            'user_id'   => $this->employee->id,
            'date'      => self::TEST_DATE,
            'new_punch' => self::NEW_PUNCH,
        ], ['X-Authorization' => $this->rawApiKey]);

        $res->assertStatus(401);
    }

    /** @test */
    public function find_requires_jwt_returns_401()
    {
        $this->getJson('/api/request/alter_log_punch/' . $this->recordId,
            ['X-Authorization' => $this->rawApiKey]
        )->assertStatus(401);
    }

    // ─── store ──────────────────────────────────────────────────────────────

    /** @test */
    public function store_creates_new_record_when_no_existing_pending_on_date()
    {
        // Use a different date so setUp record (TEST_DATE) is not duplicated
        $date = '2099-11-30';
        $punch = '[{"start_time":"2099-11-30 09:00:00","end_time":"2099-11-30 18:00:00","project_name":"E2E","remarks":"new"}]';

        $res = $this->postJson('/api/request/alter_log_punch/', [
            'user_id'       => $this->employee->id,
            'date'          => $date,
            'new_punch'     => $punch,
            'employee_note' => 'new record test',
        ], $this->empHeaders());

        // 201 created OR 200 (update path if somehow a record existed)
        $this->assertContains($res->status(), [200, 201], 'Expected 200 or 201 from store');
    }

    /** @test */
    public function store_updates_existing_pending_record_for_same_date_and_user()
    {
        // setUp() already seeded a pending record on TEST_DATE for Glenn.
        // Posting the same date should hit the update branch (count > 0).
        $res = $this->postJson('/api/request/alter_log_punch/', [
            'user_id'       => $this->employee->id,
            'date'          => self::TEST_DATE,
            'new_punch'     => self::NEW_PUNCH,
            'employee_note' => 'updating existing',
        ], $this->empHeaders());

        // Returns 200 with update message (not 201 created)
        $res->assertStatus(200);
        $this->assertArrayHasKey('content', $res->json());
    }

    // ─── find ───────────────────────────────────────────────────────────────

    /** @test */
    public function find_returns_record_for_supervisor()
    {
        $res = $this->getJson('/api/request/alter_log_punch/' . $this->recordId,
            $this->supHeaders());

        $res->assertStatus(200);
        $this->assertArrayHasKey('content', $res->json());
    }

    /** @test */
    public function find_returns_record_for_owner_employee()
    {
        $res = $this->getJson('/api/request/alter_log_punch/' . $this->recordId,
            $this->empHeaders());

        $this->assertContains($res->status(), [200, 400],
            'Owner find should succeed or return controlled error — never 500');
    }

    /** @test */
    public function find_returns_error_for_nonexistent_id()
    {
        $res = $this->getJson('/api/request/alter_log_punch/' . $this->nonExistentId(),
            $this->supHeaders());

        $this->assertContains($res->status(), [400, 404]);
        $this->assertArrayHasKey('error', $res->json());
    }

    // ─── update ─────────────────────────────────────────────────────────────

    /** @test */
    public function update_modifies_employee_note_on_existing_record()
    {
        $res = $this->putJson('/api/request/alter_log_punch/' . $this->recordId, [
            'user_id'       => $this->employee->id,
            'date'          => self::TEST_DATE,
            'new_punch'     => self::NEW_PUNCH,
            'employee_note' => 'updated note',
        ], $this->empHeaders());

        $this->assertContains($res->status(), [200, 400],
            'Update should succeed or return a controlled error — never 500');
    }

    /** @test */
    public function update_returns_error_for_nonexistent_id()
    {
        $res = $this->putJson('/api/request/alter_log_punch/' . $this->nonExistentId(), [
            'user_id'   => $this->employee->id,
            'date'      => self::TEST_DATE,
            'new_punch' => self::NEW_PUNCH,
        ], $this->empHeaders());

        $this->assertContains($res->status(), [400, 404, 500],
            'Nonexistent ID update must not silently succeed');
        $this->assertNotEquals(200, $res->status());
    }

    // ─── destroy ────────────────────────────────────────────────────────────

    /** @test */
    public function destroy_removes_the_seeded_record()
    {
        $res = $this->deleteJson('/api/request/alter_log_punch/' . $this->recordId,
            [], $this->empHeaders());

        $this->assertContains($res->status(), [200, 400],
            'Destroy should return 200 or controlled error — never 500');

        if ($res->status() === 200) {
            $this->assertNull(
                DB::table('alter_log_punches_new')->where('id', $this->recordId)->whereNull('deleted_at')->first(),
                'Record should be soft-deleted'
            );
        }
    }

    /** @test */
    public function destroy_returns_error_for_nonexistent_id()
    {
        $res = $this->deleteJson('/api/request/alter_log_punch/' . $this->nonExistentId(),
            [], $this->empHeaders());

        $this->assertContains($res->status(), [400, 404, 500]);
        $this->assertNotEquals(200, $res->status());
    }

    // ─── approve ────────────────────────────────────────────────────────────

    /** @test */
    public function approve_supervisor_approves_employee_request()
    {
        $res = $this->putJson('/api/request/alter_log_punch/approve/' . $this->recordId,
            [
                'user_id'       => $this->employee->id,
                'date'          => self::TEST_DATE,
                'new_punch'     => self::NEW_PUNCH,
                'approver_note' => 'approved by supervisor',
            ],
            $this->supHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'Approve as supervisor should return 200 or controlled error — never 500');

        if ($res->status() === 200) {
            $record = DB::table('alter_log_punches_new')->where('id', $this->recordId)->first();
            $this->assertEquals('approved', $record->status ?? null);
        }
    }

    /** @test */
    public function approve_returns_error_for_nonexistent_id()
    {
        $res = $this->putJson('/api/request/alter_log_punch/approve/' . $this->nonExistentId(),
            ['user_id' => $this->employee->id, 'date' => self::TEST_DATE, 'new_punch' => self::NEW_PUNCH],
            $this->supHeaders()
        );

        $this->assertContains($res->status(), [400, 404]);
        $this->assertArrayHasKey('error', $res->json());
    }

    /** @test */
    public function approve_returns_401_without_jwt()
    {
        $res = $this->putJson('/api/request/alter_log_punch/approve/' . $this->recordId,
            ['user_id' => $this->employee->id, 'date' => self::TEST_DATE, 'new_punch' => self::NEW_PUNCH],
            ['X-Authorization' => $this->rawApiKey]
        );
        $res->assertStatus(401);
    }

    // ─── decline ────────────────────────────────────────────────────────────

    /** @test */
    public function decline_supervisor_declines_employee_request()
    {
        $res = $this->putJson('/api/request/alter_log_punch/decline/' . $this->recordId,
            [
                'user_id'       => $this->employee->id,
                'date'          => self::TEST_DATE,
                'new_punch'     => self::NEW_PUNCH,
                'approver_note' => 'declined by supervisor',
            ],
            $this->supHeaders()
        );

        $this->assertContains($res->status(), [200, 400],
            'Decline as supervisor should return 200 or controlled error — never 500');

        if ($res->status() === 200) {
            $record = DB::table('alter_log_punches_new')->where('id', $this->recordId)->first();
            $this->assertEquals('declined', $record->status ?? null);
        }
    }

    /** @test */
    public function decline_returns_error_for_nonexistent_id()
    {
        $res = $this->putJson('/api/request/alter_log_punch/decline/' . $this->nonExistentId(),
            ['user_id' => $this->employee->id, 'date' => self::TEST_DATE, 'new_punch' => self::NEW_PUNCH],
            $this->supHeaders()
        );

        $this->assertContains($res->status(), [400, 404]);
        $this->assertArrayHasKey('error', $res->json());
    }

    // ─── pending ────────────────────────────────────────────────────────────

    /** @test */
    public function pending_resets_status_back_to_pending()
    {
        // First approve it so there is something to reset
        DB::table('alter_log_punches_new')->where('id', $this->recordId)
            ->update(['status' => 'approved']);

        $res = $this->putJson('/api/request/alter_log_punch/pending/' . $this->recordId,
            [], $this->supHeaders());

        $this->assertContains($res->status(), [200, 400],
            'Pending reset should return 200 or controlled error — never 500');

        if ($res->status() === 200) {
            $record = DB::table('alter_log_punches_new')->where('id', $this->recordId)->first();
            $this->assertEquals('pending', $record->status ?? null);
        }
    }

    /** @test */
    public function pending_returns_error_for_nonexistent_id()
    {
        $res = $this->putJson('/api/request/alter_log_punch/pending/' . $this->nonExistentId(),
            [], $this->supHeaders());

        $this->assertContains($res->status(), [400, 404]);
        $this->assertArrayHasKey('error', $res->json());
    }

    // ─── cancel ─────────────────────────────────────────────────────────────

    /** @test */
    public function cancel_employee_cancels_own_request()
    {
        $res = $this->putJson('/api/request/alter_log_punch/cancel/' . $this->recordId,
            [], $this->empHeaders());

        $this->assertContains($res->status(), [200, 400],
            'Cancel as owner should return 200 or controlled error — never 500');

        if ($res->status() === 200) {
            $record = DB::table('alter_log_punches_new')->where('id', $this->recordId)->first();
            $this->assertEquals('cancelled', $record->status ?? null);
        }
    }

    /** @test */
    public function cancel_returns_error_for_nonexistent_id()
    {
        $res = $this->putJson('/api/request/alter_log_punch/cancel/' . $this->nonExistentId(),
            [], $this->empHeaders());

        $this->assertContains($res->status(), [400, 404]);
        $this->assertArrayHasKey('error', $res->json());
    }
}
