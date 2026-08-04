<?php
// DEEPER validation — Alter Log (single time-in/time-out edit) CONTROLLER / BUSINESS / DB-layer
// rules (beyond the FormRequest datatype layer in AlterLogValidationRejectionTest). Zero-write:
// uniqueness is tested by COLLIDING WITH A ROW ALREADY IN THE DUMP (read, never insert).
// DatabaseTransactions is belt-and-suspenders (rejections write nothing anyway).

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;

class AlterLogBusinessRuleRejectionTest extends TestCase
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

    /** @test — duplicate (user_id,date) is rejected by Rule::unique('alter_logs','date') */
    public function rejects_duplicate_alter_log_for_same_user_and_date()
    {
        $existing = DB::table('alter_logs')->whereNull('deleted_at')
                      ->whereNotNull('date')->first();
        if (!$existing) $this->markTestIncomplete('no existing alter_log row to collide with');

        // Otherwise-valid payload whose (user_id,date) collides with an existing row.
        // FormRequest unique rule fires BEFORE the controller -> 422, no row written.
        $resp = $this->actingAs($this->user)->postJson('/api/request/alter_log', [
            'user_id'       => $existing->user_id,
            'date'          => $existing->date,
            'new_time_in'   => $existing->date . ' 09:00:00',
            'new_time_out'  => $existing->date . ' 18:00:00',
            'employee_note' => 'Collision check',
        ]);
        $resp->assertStatus(422);
    }

    // NO-TIME-ORDERING-RULE gap — NOT testable as a 422 (documented in matrices/alter-log.md,
    // finding A9-adjacent): AlterLogRequest has no after/before rule between new_time_in and
    // new_time_out, so a caller submitting new_time_in AFTER new_time_out would actually SUCCEED
    // and write a row -- unsafe to automate on the live-dump DB.
    /** @test */
    public function missing_time_order_rule_is_documented_not_tested()
    {
        $this->markTestIncomplete(
            'AlterLogRequest has no cross-field time-order rule (new_time_in <= new_time_out) — ' .
            'submitting an inverted pair would PASS validation and write a real row, so it is not ' .
            'safe to automate here. See matrices/alter-log.md finding.'
        );
    }

    // DISPUTE-MODE branch — NOT auto-tested here (documented in matrices/alter-log.md):
    // request_mode==='dispute' re-routes to EV_SP_PD_Autoamtion_AlterLog via a raw CALL, which
    // risks corrupting the DatabaseTransactions savepoint chain on this SP-less dump.
    /** @test */
    public function dispute_mode_sp_path_is_documented_as_db_layer()
    {
        $this->markTestIncomplete(
            'Dispute-mode branch calls EV_SP_PD_Autoamtion_AlterLog via a raw SP CALL; not safely ' .
            'unit-testable on the shared dump. See matrices/alter-log.md.'
        );
    }
}
