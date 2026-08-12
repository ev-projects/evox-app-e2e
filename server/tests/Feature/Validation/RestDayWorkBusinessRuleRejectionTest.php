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
        if (!$this->user) $this->markTestIncomplete('no user in test DB');
    }

    /** @test — duplicate (user_id,date) is rejected by Rule::unique('rest_day_works','date') */
    public function rejects_duplicate_rest_day_work_for_same_user_and_date()
    {
        $existing = DB::table('rest_day_works')->whereNull('deleted_at')
                      ->whereNotNull('date')->first();
        if (!$existing) $this->markTestIncomplete('no existing rest_day_work row to collide with');

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
        // Dynamic lookup: find any workday DTR (is_rest_day=0) that has no existing rest_day_work
        // for that (user_id, date), so the FormRequest unique rule passes and the controller's own
        // cross-check fires — returning 400 (not 422) BEFORE ::store() is ever called.
        $existingDtr = DB::table('dtrs')
            ->where('is_rest_day', 0)
            ->whereNotNull('user_id')
            ->whereNotNull('date')
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))->from('rest_day_works')
                  ->whereRaw('rest_day_works.user_id = dtrs.user_id')
                  ->whereRaw('rest_day_works.date = dtrs.date')
                  ->whereNull('rest_day_works.deleted_at');
            })
            ->orderBy('id', 'desc')
            ->first();

        if (!$existingDtr) {
            $this->markTestIncomplete(
                'no workday DTR available without a rest_day_work collision — ' .
                'every workday DTR already has a rest_day_work row (or no DTRs exist)'
            );
        }

        $dtrUser = User::find($existingDtr->user_id);
        if (!$dtrUser) {
            $this->markTestIncomplete(
                'workday DTR owner (id=' . $existingDtr->user_id . ') not resolvable from users table'
            );
        }

        $resp = $this->actingAs($dtrUser)->postJson('/api/request/rest_day_work', [
            'user_id'    => $dtrUser->id,
            'date'       => $existingDtr->date,
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
        $this->markTestIncomplete(
            'Dispute-mode branch calls EV_SP_PD_Autoamtion_RestDay via a raw SP CALL; not safely ' .
            'unit-testable on the shared dump (risk of breaking the DatabaseTransactions rollback ' .
            'guarantee). See matrices/rest-day-work.md.'
        );
    }
}
