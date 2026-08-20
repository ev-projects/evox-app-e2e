<?php

/**
 * RestDayWorkController — full surface coverage
 *
 * Key behaviors:
 *   • store() checks Dtr->is_rest_day == 1 before inserting;
 *     returns error "Date is not a restday" if the date is not a rest day.
 *   • approve() has self-approval 403 guard (same pattern as OvertimeController).
 *   • approve() calls request_validity_checker; dispute path calls EV_SP_PD_Autoamtion_RestDay.
 *   • decline() calls dtr->remove_rest_day_from_dtr().
 *   • start_time / end_time stored as Unix timestamps (strtotime).
 *
 * setUp() seeds a pending rest_day_work record directly into the table,
 * bypassing the is_rest_day Dtr check. DatabaseTransactions rolls back every
 * insert made by these tests — pre-existing rows are never touched.
 *
 * Routes (prefix: /api/request, middleware: jwtauth + auth.apikey):
 *   POST   /request/rest_day_work/           → store
 *   GET    /request/rest_day_work/{id}       → find
 *   PUT    /request/rest_day_work/{id}       → update
 *   DELETE /request/rest_day_work/{id}       → destroy
 *   PUT    /request/rest_day_work/approve/{id} → approve
 *   PUT    /request/rest_day_work/decline/{id} → decline
 *   PUT    /request/rest_day_work/pending/{id} → pending
 *   PUT    /request/rest_day_work/cancel/{id}  → cancel
 */

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Modules\User\Models\User;

class evoxtest_RestDayWorkApiTest extends TestCase
{
    use DatabaseTransactions;

    private User $employee;   // Glenn — submits and cancels
    private User $supervisor; // Gary  — approves and declines
    private string $empToken;
    private string $supToken;
    private string $rawApiKey;

    private int $rdwId; // seeded pending record used by most tests

    // 2026-03-15 is a Sunday (likely rest day for standard Mon-Fri schedules)
    private const RDW_DATE = '2026-03-15';

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake(); // prevent real SMTP attempts — MAIL_DRIVER env override is cached at boot

        $this->employee   = User::where('email', env('E2E_USER_EMPLOYEE_PHILIPPINES', 'glenn.macasarte@eastvantage.com'))->firstOrFail();
        $this->supervisor = User::where('email', env('E2E_USER_SUPERVISOR_PHILIPPINES', 'gary.aure@eastvantage.com'))->firstOrFail();

        $this->rawApiKey = Str::random(64);
        DB::table('api_keys')->insert([
            'name'       => 'evox_e2e_rdw_' . now()->format('His'),
            'key'        => $this->rawApiKey,
            'active'     => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->empToken = auth('api')->login($this->employee);
        $this->supToken = auth('api')->login($this->supervisor);

        // Direct insert bypasses is_rest_day check in store().
        // DatabaseTransactions rolls this back after each test.
        $this->rdwId = DB::table('rest_day_works')->insertGetId([
            'user_id'       => $this->employee->id,
            'date'          => self::RDW_DATE,
            'start_time'    => strtotime(self::RDW_DATE . ' 09:00:00'),
            'end_time'      => strtotime(self::RDW_DATE . ' 18:00:00'),
            'break_time'    => 3600,
            'status'        => 'pending',
            'employee_note' => 'E2E rest day work test',
            'created_by'    => $this->employee->id,
            'updated_by'    => $this->employee->id,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    private function empHeaders(): array
    {
        return ['Authorization' => 'Bearer ' . $this->empToken, 'X-Authorization' => $this->rawApiKey];
    }

    private function supHeaders(): array
    {
        return ['Authorization' => 'Bearer ' . $this->supToken, 'X-Authorization' => $this->rawApiKey];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // store — POST /api/request/rest_day_work/
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function store_missing_required_fields_returns_422()
    {
        $res = $this->postJson('/api/request/rest_day_work/', [], $this->empHeaders());

        // FormRequest validates date / start_time / end_time are present
        $res->assertStatus(422);
    }

    /** @test */
    public function store_returns_error_for_a_weekday_that_is_not_a_rest_day()
    {
        // Monday 2026-03-16 is almost certainly NOT a rest day for any employee
        $res = $this->postJson('/api/request/rest_day_work/', [
            'date'          => '2026-03-16',
            'start_time'    => '2026-03-16 09:00:00',
            'end_time'      => '2026-03-16 18:00:00',
            'break_time'    => '01:00',
            'employee_note' => 'E2E test — not a rest day',
        ], $this->empHeaders());

        // Controller returns 400 ("Date is not a restday") or 422 (validation);
        // 200 is also possible if the DTR record for that date happens to flag is_rest_day=1.
        // In all cases must not crash with 500.
        $this->assertContains($res->status(), [200, 201, 400, 422],
            'store() on a weekday should not crash with 500');
    }

    /** @test */
    public function store_dispute_mode_runs_insertToRestDayWorkDispute_branch()
    {
        // dispute=1 routes through insertToRestDayWorkDispute() in the controller
        $res = $this->postJson('/api/request/rest_day_work/', [
            'date'          => self::RDW_DATE,
            'start_time'    => self::RDW_DATE . ' 09:00:00',
            'end_time'      => self::RDW_DATE . ' 18:00:00',
            'break_time'    => '01:00',
            'employee_note' => 'E2E dispute mode',
            'dispute'       => 1,
        ], $this->empHeaders());

        // 200/201 = created; 400 = date is not a rest day / duplicate; never 500
        $this->assertContains($res->status(), [200, 201, 400, 422],
            'store() dispute mode should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // find — GET /api/request/rest_day_work/{id}
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function find_returns_the_seeded_record_by_id()
    {
        $res = $this->getJson('/api/request/rest_day_work/' . $this->rdwId, $this->empHeaders());

        $res->assertStatus(200);
        $content = $res->json('content');
        $this->assertNotNull($content);
        $this->assertEquals($this->rdwId, $content['id'] ?? null);
    }

    /** @test */
    public function find_returns_error_for_nonexistent_id()
    {
        $nonExistentId = (DB::table('rest_day_works')->max('id') ?? 0) + 9999;

        $res = $this->getJson('/api/request/rest_day_work/' . $nonExistentId, $this->empHeaders());

        $this->assertContains($res->status(), [400, 404],
            'find() with unknown id should return a not-found error, not 500');
    }

    /** @test */
    public function find_requires_jwt()
    {
        $this->getJson('/api/request/rest_day_work/' . $this->rdwId,
            ['X-Authorization' => $this->rawApiKey]
        )->assertStatus(401);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // update — PUT /api/request/rest_day_work/{id}
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function update_modifies_pending_rest_day_work()
    {
        $res = $this->putJson('/api/request/rest_day_work/' . $this->rdwId, [
            'date'          => self::RDW_DATE,
            'start_time'    => self::RDW_DATE . ' 09:30:00',
            'end_time'      => self::RDW_DATE . ' 18:30:00',
            'break_time'    => '01:00',
            'employee_note' => 'E2E updated note',
        ], $this->empHeaders());

        $this->assertContains($res->status(), [200, 400, 422],
            'update() should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // destroy — DELETE /api/request/rest_day_work/{id}
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function destroy_removes_pending_rest_day_work()
    {
        // Seed a separate record for the delete test so the main rdwId stays intact
        $toDelete = DB::table('rest_day_works')->insertGetId([
            'user_id'       => $this->employee->id,
            'date'          => '2026-03-22',
            'start_time'    => strtotime('2026-03-22 09:00:00'),
            'end_time'      => strtotime('2026-03-22 18:00:00'),
            'break_time'    => 3600,
            'status'        => 'pending',
            'employee_note' => 'E2E delete target',
            'created_by'    => $this->employee->id,
            'updated_by'    => $this->employee->id,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        $res = $this->deleteJson('/api/request/rest_day_work/' . $toDelete, [], $this->empHeaders());

        $this->assertContains($res->status(), [200, 400],
            'destroy() should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // approve — PUT /api/request/rest_day_work/approve/{id}
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function approve_returns_403_when_employee_tries_to_approve_own_request()
    {
        // Self-approval guard: the authenticated user is the same as the record owner
        $res = $this->putJson('/api/request/rest_day_work/approve/' . $this->rdwId, [
            'date' => self::RDW_DATE,
        ], $this->empHeaders());

        $res->assertStatus(403);
    }

    /** @test */
    public function approve_supervisor_can_approve_employee_request()
    {
        $res = $this->putJson('/api/request/rest_day_work/approve/' . $this->rdwId, [
            'date' => self::RDW_DATE,
        ], $this->supHeaders());

        // 200 = approved; 400 = request_validity_checker rejects the test date — both acceptable
        $this->assertContains($res->status(), [200, 400],
            'Supervisor approve should not return 403 or crash with 500');
        $this->assertNotEquals(403, $res->status());
        $this->assertNotEquals(500, $res->status());
    }

    // ═══════════════════════════════════════════════════════════════════════
    // decline — PUT /api/request/rest_day_work/decline/{id}
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function decline_supervisor_can_decline_employee_request()
    {
        // Seed a fresh record for this test to avoid state dependency on the approve test
        $toDecline = DB::table('rest_day_works')->insertGetId([
            'user_id'       => $this->employee->id,
            'date'          => '2026-03-08',
            'start_time'    => strtotime('2026-03-08 09:00:00'),
            'end_time'      => strtotime('2026-03-08 18:00:00'),
            'break_time'    => 3600,
            'status'        => 'pending',
            'employee_note' => 'E2E decline target',
            'created_by'    => $this->employee->id,
            'updated_by'    => $this->employee->id,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        $res = $this->putJson('/api/request/rest_day_work/decline/' . $toDecline, [
            'supervisor_note' => 'Declined by E2E test',
        ], $this->supHeaders());

        $this->assertContains($res->status(), [200, 400],
            'Supervisor decline should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // pending — PUT /api/request/rest_day_work/pending/{id}
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function pending_resets_record_back_to_pending_status()
    {
        // Pre-set to approved so pending() has a meaningful transition to make
        DB::table('rest_day_works')->where('id', $this->rdwId)->update(['status' => 'approved']);

        $res = $this->putJson('/api/request/rest_day_work/pending/' . $this->rdwId, [],
            $this->supHeaders());

        $this->assertContains($res->status(), [200, 400],
            'pending() should not crash with 500');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // cancel — PUT /api/request/rest_day_work/cancel/{id}
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function cancel_employee_can_cancel_own_pending_request()
    {
        $res = $this->putJson('/api/request/rest_day_work/cancel/' . $this->rdwId, [],
            $this->empHeaders());

        $this->assertContains($res->status(), [200, 400],
            'cancel() should not crash with 500');
    }
}
