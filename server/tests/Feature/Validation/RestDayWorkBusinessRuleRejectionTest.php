<?php
// DEEPER validation — Rest Day Work CONTROLLER / BUSINESS / DB-layer rules (beyond the FormRequest
// datatype layer in RestDayWorkValidationRejectionTest). Still zero-write: uniqueness is tested by
// COLLIDING WITH A ROW ALREADY IN THE DUMP (read, never insert); the restday/workday cross-check is
// tested against a real existing DTR row (is_rest_day=0) that has no colliding rest_day_works row —
// the controller rejects BEFORE calling RestDayWorkRepository::store(). DatabaseTransactions is
// belt-and-suspenders (rejections write nothing anyway).

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;

class RestDayWorkBusinessRuleRejectionTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestSkipped('no user in test DB');
    }

    /** @test — duplicate (user_id,date) is rejected by Rule::unique('rest_day_works','date') */
    public function rejects_duplicate_rest_day_work_for_same_user_and_date()
    {
        $existing = DB::table('rest_day_works')->whereNull('deleted_at')
                      ->whereNotNull('date')->first();
        if (!$existing) $this->markTestSkipped('no existing rest_day_work row to collide with');

        // Otherwise-valid payload whose (user_id,date) collides with an existing row.
        // FormRequest unique rule fires BEFORE the controller -> 422, no row written.
        $resp = $this->actingAs($this->user)->postJson('/api/request/rest_day_work', [
            'user_id'    => $existing->user_id,
            'date'       => $existing->date,
            'start_time' => '09:00',
            'end_time'   => '18:00',
            'break_time' => '01:00',
        ]);
        $resp->assertStatus(422);
    }

    /** @test — controller rejects a restday request whose DTR shows an actual workday (is_rest_day=0) */
    public function rejects_restday_request_when_dtr_shows_a_workday()
    {
        // Known fixture on the dump: user_id=1, date=2019-01-01, dtrs.is_rest_day=0. Confirmed no
        // pre-existing rest_day_works row for that (user,date), so the FormRequest unique rule
        // passes and this reaches RestDayWorkController@store's cross-check, which returns
        // error_response(...) (default HTTP 400, NOT 422 — a controller-layer reject, not a
        // FormRequest one) BEFORE ->store() is ever called.
        $dtrUser = User::find(1);
        if (!$dtrUser) $this->markTestSkipped('DTR fixture user (id=1) not present in test DB');

        $existingDtr = DB::table('dtrs')->where('user_id', 1)->where('date', '2019-01-01')
                          ->where('is_rest_day', 0)->first();
        if (!$existingDtr) $this->markTestSkipped('expected workday DTR fixture row not present');

        $collision = DB::table('rest_day_works')->where('user_id', 1)->where('date', '2019-01-01')
                        ->whereNull('deleted_at')->first();
        if ($collision) $this->markTestSkipped('a rest_day_work already exists for the fixture date; would hit the unique rule instead of the DTR cross-check');

        $resp = $this->actingAs($dtrUser)->postJson('/api/request/rest_day_work', [
            'user_id'    => 1,
            'date'       => '2019-01-01',
            'start_time' => '09:00',
            'end_time'   => '18:00',
            'break_time' => '01:00',
        ]);
        $resp->assertStatus(400);
    }

    // DISPUTE-MODE branch — NOT auto-tested here (documented in matrices/rest-day-work.md):
    // request_mode==='dispute' re-routes to EV_SP_PD_Autoamtion_RestDay via a raw CALL. On this
    // dump a raw CALL to a stored procedure risks corrupting the DatabaseTransactions savepoint
    // chain (an SP-internal COMMIT/DDL breaks out of the test's rollback guarantee) — covered on a
    // disposable DB, not here.
    /** @test */
    public function dispute_mode_sp_path_is_documented_as_db_layer()
    {
        $this->markTestSkipped(
            'Dispute-mode branch calls EV_SP_PD_Autoamtion_RestDay via a raw SP CALL; not safely ' .
            'unit-testable on the shared dump (risk of breaking the DatabaseTransactions rollback ' .
            'guarantee). See matrices/rest-day-work.md.'
        );
    }
}
