<?php
// DEEPER validation — Overtime CONTROLLER / BUSINESS / DB-layer rules (beyond the FormRequest
// datatype layer in OvertimeValidationRejectionTest). Still zero-write: uniqueness is tested by
// COLLIDING WITH A ROW ALREADY IN THE DUMP (read, never insert); the validity/time-period check
// is a GET. DatabaseTransactions is belt-and-suspenders (rejections write nothing anyway).

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;

class OvertimeBusinessRuleRejectionTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestIncomplete('no user in test DB');
    }

    /** @test — duplicate (user_id,date) is rejected by Rule::unique('overtimes','date') */
    public function rejects_duplicate_overtime_for_same_user_and_date()
    {
        $existing = DB::table('overtimes')->whereNull('deleted_at')
                      ->whereNotNull('date')->first();
        if (!$existing) $this->markTestIncomplete('no existing overtime row to collide with');

        // Otherwise-valid payload whose (user_id,date) collides with an existing row.
        // FormRequest unique rule fires BEFORE the controller -> 422, no row written.
        $resp = $this->actingAs($this->user)->postJson('/api/request/overtime', [
            'user_id' => $existing->user_id,
            'date'    => $existing->date,
            'type'    => 'Regular',
            'amount'  => '02:00',
        ]);
        $resp->assertStatus(422);
    }

    // DB-LAYER / TIME-PERIOD gate — NOT auto-tested here (documented in matrices/overtime.md):
    // `/api/request/request-validity-check?date=...` calls SP EV_SP_Validate_Request_Payroll_Period
    // (auth()->user()->id, date). It needs a live JWT user AND the SP present. On this dump the SP
    // is absent (schema drift) and a raw CALL to a missing proc corrupts the DatabaseTransactions
    // transaction — so it's covered on a disposable DB, not here. The 30-day-window rule
    // (request_validity_checker: target_date < now-30d => false) is likewise SP-adjacent.
    /** @test */
    public function period_validity_gate_is_documented_as_db_layer()
    {
        $this->markTestIncomplete(
            'Time-period gate (EV_SP_Validate_Request_Payroll_Period + 30-day window) requires the ' .
            'stored procedure + a live auth user; not unit-testable on the SP-less dump. See matrices/overtime.md.'
        );
    }
}
