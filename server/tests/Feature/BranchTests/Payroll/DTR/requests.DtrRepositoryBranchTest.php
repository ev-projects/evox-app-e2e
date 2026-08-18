<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Payroll/Repositories/DtrRepository.php
 *       ::apply_alter_log_to_dtr    ::remove_alter_log_from_dtr
 *       ::apply_rest_day_work_to_dtr ::remove_rest_day_from_dtr
 *   app/Modules/Request/Repositories/RestDayWorkRepository.php
 *       ::optimze_rest_day (private, entered from ::update at :90)
 *
 * MENU PATH
 *   My Team -> Requests -> Alteration      (approve / decline)
 *   My Team -> Requests -> Rest Day Work   (approve / decline)
 *   My Requests -> Rest Day Work (edit)    (RestDayWorkRepository::update)
 *
 * COVERAGE BEFORE THIS FILE
 *   apply_alter_log_to_dtr        66.67%
 *   remove_alter_log_from_dtr     23.81%
 *   apply_rest_day_work_to_dtr    68.75%
 *   remove_rest_day_from_dtr       0.00%
 *   optimze_rest_day               0.00%
 *
 * FINDINGS
 *   _FINDING_RDW_OPEN_TXN   approving a request whose date has no DTR row returns early from
 *                           DtrRepository without committing or rolling back the transaction it
 *                           opened, leaving the connection one transaction level deep for the rest
 *                           of the request. See the test of that name.
 *   _FINDING_RDW_DAY_UNITS  RestDayWorkRepository::optimze_rest_day adds or subtracts a whole day
 *                           (86400s) from start_time / end_time, which are seconds-from-midnight,
 *                           not timestamps. See the test of that name.
 */

namespace Tests\Feature\BranchTests\Payroll\DTR;

use Tests\TestCase;
use Tests\Feature\BranchTests\Support\DtrFixtureTrait;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\EvoxLevels;
use App\Modules\Payroll\Repositories\DtrRepository;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\Request\Repositories\RestDayWorkRepository;
use App\Modules\User\Models\User;

class DtrRequestApplicationBranchTest extends TestCase
{
    use DatabaseTransactions, DtrFixtureTrait;

    /** @var DtrRepository */
    private $repo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = $this->app->make(DtrRepository::class);
    }

    private function alterLog($day, $status, array $overrides = [])
    {
        return AlterLog::create(array_merge([
            'user_id'          => $this->requireFixtureUser()->id,
            'date'             => $this->fixtureDate($day),
            'current_time_in'  => $this->fixtureTs($day, 8 * 3600),
            'current_time_out' => $this->fixtureTs($day, 17 * 3600),
            'new_time_in'      => $this->fixtureTs($day, 7 * 3600),
            'new_time_out'     => $this->fixtureTs($day, 19 * 3600),
            'status'           => $status,
            'created_by'       => $this->requireFixtureUser()->id,
            'updated_by'       => $this->requireFixtureUser()->id,
        ], $overrides));
    }

    private function restDayWork($day, $status, array $overrides = [])
    {
        return RestDayWork::create(array_merge([
            'user_id'    => $this->requireFixtureUser()->id,
            'date'       => $this->fixtureDate($day),
            'start_time' => 9 * 3600,
            'end_time'   => 15 * 3600,
            'break_time' => 1800,
            'status'     => $status,
            'created_by' => $this->requireFixtureUser()->id,
            'updated_by' => $this->requireFixtureUser()->id,
        ], $overrides));
    }

    // =======================================================================================
    // apply_alter_log_to_dtr — an approved time correction rewrites the day's clock times
    // =======================================================================================

    /** @test */
    public function approving_a_time_correction_writes_the_requested_times_onto_the_day()
    {
        $dtr = $this->scheduledDay(0, [
            'start' => '08:00:00', 'end' => '17:00:00',
            'in'    => '09:30:00', 'out' => '16:00:00',
            'break' => 3600,
        ]);
        $alter = $this->alterLog(0, get_constant('REQUEST_STATUS.approved'));

        $returned = $this->repo->apply_alter_log_to_dtr($alter);

        $this->assertNotNull($returned);
        $this->assertSame($dtr->id, $returned->id);
        $this->assertEquals($this->fixtureTs(0, 7 * 3600), $dtr->fresh()->time_in);
        $this->assertEquals($this->fixtureTs(0, 19 * 3600), $dtr->fresh()->time_out);
    }

    // The status gate: a correction still waiting for a decision changes nothing.
    /** @test */
    public function a_pending_time_correction_leaves_the_days_clock_times_alone()
    {
        $dtr = $this->scheduledDay(0, [
            'start' => '08:00:00', 'end' => '17:00:00',
            'in'    => '09:30:00', 'out' => '16:00:00',
            'break' => 3600,
        ]);
        $alter = $this->alterLog(0, get_constant('REQUEST_STATUS.pending'));

        $returned = $this->repo->apply_alter_log_to_dtr($alter);

        $this->assertNull($returned);
        $this->assertEquals($this->fixtureTs(0, 9 * 3600 + 1800) - $this->fixtureOffset(), $dtr->fresh()->time_in);
    }

    /** @test */
    public function a_declined_time_correction_is_never_applied_to_the_day()
    {
        $dtr = $this->scheduledDay(0, [
            'start' => '08:00:00', 'end' => '17:00:00',
            'in'    => '09:30:00', 'out' => '16:00:00',
            'break' => 3600,
        ]);
        $alter = $this->alterLog(0, get_constant('REQUEST_STATUS.declined'));

        $this->assertNull($this->repo->apply_alter_log_to_dtr($alter));
        $this->assertEquals($this->fixtureTs(0, 9 * 3600 + 1800) - $this->fixtureOffset(), $dtr->fresh()->time_in);
    }

    // =======================================================================================
    // remove_alter_log_from_dtr — declining a correction restores the original clock times
    // =======================================================================================

    /** @test */
    public function declining_a_time_correction_restores_the_days_original_clock_times()
    {
        $dtr = $this->scheduledDay(0, [
            'start' => '08:00:00', 'end' => '17:00:00',
            'in'    => '07:00:00', 'out' => '19:00:00',      // the corrected times, already applied
            'break' => 3600,
        ]);
        $alter = $this->alterLog(0, get_constant('REQUEST_STATUS.declined'));

        $returned = $this->repo->remove_alter_log_from_dtr($alter);

        $this->assertNotNull($returned);
        $this->assertEquals($this->fixtureTs(0, 8 * 3600), $dtr->fresh()->time_in);
        $this->assertEquals($this->fixtureTs(0, 17 * 3600), $dtr->fresh()->time_out);
    }

    // The mirror gate: removal only ever acts on a declined request.
    /** @test */
    public function an_approved_time_correction_is_not_undone_by_the_removal_path()
    {
        $dtr = $this->scheduledDay(0, [
            'start' => '08:00:00', 'end' => '17:00:00',
            'in'    => '07:00:00', 'out' => '19:00:00',
            'break' => 3600,
        ]);
        $alter = $this->alterLog(0, get_constant('REQUEST_STATUS.approved'));

        $this->assertNull($this->repo->remove_alter_log_from_dtr($alter));
        $this->assertEquals($this->fixtureTs(0, 7 * 3600) - $this->fixtureOffset(), $dtr->fresh()->time_in);
    }

    // =======================================================================================
    // apply_rest_day_work_to_dtr
    // =======================================================================================

    /** @test */
    public function approving_rest_day_work_puts_the_requested_hours_on_the_day_and_flags_it()
    {
        $dtr = $this->makeDtr(0);
        $rdw = $this->restDayWork(0, get_constant('REQUEST_STATUS.approved'));

        $returned = $this->repo->apply_rest_day_work_to_dtr($rdw);

        $this->assertNotNull($returned);
        $fresh = $dtr->fresh();
        $this->assertEquals($this->fixtureTs(0, 9 * 3600), $fresh->start_datetime);
        $this->assertEquals($this->fixtureTs(0, 15 * 3600), $fresh->end_datetime);
        // rest day work is treated as worked time, so the clock times are filled in from the request
        $this->assertEquals($this->fixtureTs(0, 9 * 3600), $fresh->time_in);
        $this->assertEquals($this->fixtureTs(0, 15 * 3600), $fresh->time_out);
        $this->assertEquals(1800, $fresh->break_time);
        $this->assertEquals(1, $fresh->is_rest_day);
        $this->assertSame(get_constant('DTR_SOURCE_TYPE_TAGGING.rest_day_work'), $fresh->source_type_tagging);
        // any flexible window from the previous schedule is cleared
        $this->assertNull($fresh->start_flexy_datetime);
        $this->assertNull($fresh->end_flexy_datetime);
    }

    // A rest day work that finishes earlier in the clock than it starts is an overnight shift, so
    // the finish belongs to the following calendar day.
    /** @test */
    public function rest_day_work_that_ends_earlier_than_it_starts_finishes_on_the_next_day()
    {
        $dtr = $this->makeDtr(0);
        $rdw = $this->restDayWork(0, get_constant('REQUEST_STATUS.approved'), [
            'start_time' => 22 * 3600,
            'end_time'   => 6 * 3600,
        ]);

        $this->repo->apply_rest_day_work_to_dtr($rdw);

        $fresh = $dtr->fresh();
        $this->assertEquals($this->fixtureTs(0, 22 * 3600), $fresh->start_datetime);
        $this->assertEquals($this->fixtureTs(1, 6 * 3600), $fresh->end_datetime);
        $this->assertEquals($this->fixtureTs(1, 6 * 3600), $fresh->time_out);
    }

    /** @test */
    public function a_pending_rest_day_work_puts_no_hours_on_the_day()
    {
        $dtr = $this->makeDtr(0);
        $rdw = $this->restDayWork(0, get_constant('REQUEST_STATUS.pending'));

        $this->assertNull($this->repo->apply_rest_day_work_to_dtr($rdw));
        $this->assertNull($dtr->fresh()->start_datetime);
        $this->assertEquals(0, $dtr->fresh()->is_rest_day);
    }

    // =======================================================================================
    // remove_rest_day_from_dtr
    // =======================================================================================

    /** @test */
    public function declining_rest_day_work_strips_the_hours_back_off_the_day()
    {
        $dtr = $this->scheduledDay(0, [
            'start' => '09:00:00', 'end' => '15:00:00',
            'in'    => '09:00:00', 'out' => '15:00:00',
            'break' => 1800,
        ], [
            'is_rest_day'         => 1,
            'source_type_tagging' => get_constant('DTR_SOURCE_TYPE_TAGGING.rest_day_work'),
        ]);
        $rdw = $this->restDayWork(0, get_constant('REQUEST_STATUS.declined'));

        $returned = $this->repo->remove_rest_day_from_dtr($rdw);

        $this->assertNotNull($returned);
        $fresh = $dtr->fresh();
        $this->assertNull($fresh->start_datetime);
        $this->assertNull($fresh->end_datetime);
        $this->assertNull($fresh->start_flexy_datetime);
        $this->assertNull($fresh->end_flexy_datetime);
        $this->assertNull($fresh->break_time);
        $this->assertNull($fresh->time_in);
        $this->assertNull($fresh->time_out);
        // the day stays marked as a rest day, but is no longer tagged as rest day WORK
        $this->assertEquals(1, $fresh->is_rest_day);
        $this->assertSame(get_constant('DTR_SOURCE_TYPE_TAGGING.default'), $fresh->source_type_tagging);
    }

    /** @test */
    public function an_approved_rest_day_work_is_not_stripped_by_the_removal_path()
    {
        $dtr = $this->scheduledDay(0, [
            'start' => '09:00:00', 'end' => '15:00:00',
            'in'    => '09:00:00', 'out' => '15:00:00',
            'break' => 1800,
        ]);
        $rdw = $this->restDayWork(0, get_constant('REQUEST_STATUS.approved'));

        $this->assertNull($this->repo->remove_rest_day_from_dtr($rdw));
        $this->assertNotNull($dtr->fresh()->start_datetime);
    }

    // =======================================================================================
    // DEFECT — the early return that never closes its transaction
    // =======================================================================================
    //
    // Every one of these four methods opens a transaction on entry, then returns
    // `get_constant('DTR_NOT_EXISTS')` when the request's date has no DTR row. Two things are
    // wrong with that line:
    //   * DTR_NOT_EXISTS is not defined in config/constants.php, so it evaluates to null — the
    //     caller cannot tell "no such day" apart from "request was not approved";
    //   * the return happens BEFORE any commit or rollback, so the connection is left one
    //     transaction level deep for the remainder of the HTTP request. Every later commit in that
    //     request decrements back towards 1 and never reaches 0, so nothing after this point is
    //     actually persisted.
    //
    // Reachable from Chrome: file a rest day work for a date past the DTR generation horizon and
    // have a supervisor approve it (RestDayWorkController::approve -> apply_rest_day_work_to_dtr).
    // Nothing about the test environment is involved.
    //
    // The assertions below record TODAY's behaviour. When the early return is given a rollback,
    // this test fails — that is the signal to flip it into a regression guard.
    /** @test */
    public function approving_rest_day_work_for_a_day_with_no_record_leaks_an_open_transaction_FINDING_RDW_OPEN_TXN()
    {
        $this->requireFixtureUser();
        $rdw = $this->restDayWork(9, get_constant('REQUEST_STATUS.approved'));   // day 9 has no DTR

        $before = DB::transactionLevel();
        $returned = $this->repo->apply_rest_day_work_to_dtr($rdw);
        $after = DB::transactionLevel();

        try {
            $this->assertNull($returned, 'the "no DTR" sentinel is an undefined constant, so it is null');
            $this->assertSame($before + 1, $after, 'the early return no longer leaks a transaction level');
        } finally {
            // restore the connection so DatabaseTransactions can unwind cleanly even if an
            // assertion above fails; drains only levels the refusal path actually leaked
            while (DB::transactionLevel() > $before) {
                DB::rollBack();
            }
        }
        $this->assertSame($before, DB::transactionLevel());
    }

    /** @test */
    public function declining_rest_day_work_for_a_day_with_no_record_leaks_an_open_transaction_FINDING_RDW_OPEN_TXN()
    {
        $this->requireFixtureUser();
        $rdw = $this->restDayWork(9, get_constant('REQUEST_STATUS.declined'));

        $before = DB::transactionLevel();
        $returned = $this->repo->remove_rest_day_from_dtr($rdw);
        $after = DB::transactionLevel();

        try {
            $this->assertNull($returned);
            $this->assertSame($before + 1, $after);
        } finally {
            while (DB::transactionLevel() > $before) {
                DB::rollBack();
            }
        }
        $this->assertSame($before, DB::transactionLevel());
    }

    /** @test */
    public function approving_a_time_correction_for_a_day_with_no_record_leaks_an_open_transaction_FINDING_RDW_OPEN_TXN()
    {
        $this->requireFixtureUser();
        $alter = $this->alterLog(9, get_constant('REQUEST_STATUS.approved'));    // day 9 has no DTR

        $before = DB::transactionLevel();
        $returned = $this->repo->apply_alter_log_to_dtr($alter);
        $after = DB::transactionLevel();

        try {
            $this->assertNull($returned);
            $this->assertSame($before + 1, $after);
        } finally {
            while (DB::transactionLevel() > $before) {
                DB::rollBack();
            }
        }
        $this->assertSame($before, DB::transactionLevel());
    }

    /** @test */
    public function declining_a_time_correction_for_a_day_with_no_record_leaks_an_open_transaction_FINDING_RDW_OPEN_TXN()
    {
        $this->requireFixtureUser();
        $alter = $this->alterLog(9, get_constant('REQUEST_STATUS.declined'));

        $before = DB::transactionLevel();
        $returned = $this->repo->remove_alter_log_from_dtr($alter);
        $after = DB::transactionLevel();

        try {
            $this->assertNull($returned);
            $this->assertSame($before + 1, $after);
        } finally {
            while (DB::transactionLevel() > $before) {
                DB::rollBack();
            }
        }
        $this->assertSame($before, DB::transactionLevel());
    }

    // =======================================================================================
    // DEFECT — RestDayWorkRepository::optimze_rest_day works in the wrong unit
    // =======================================================================================
    //
    // update() stores start_time/end_time as SECONDS FROM MIDNIGHT, converted out of the EDITOR's
    // timezone (time_to_seconds(..., "subtract") uses Auth::user()'s offset). It then rebuilds the
    // instant using the OWNER's offset. When editor and owner sit in different countries the two
    // offsets do not cancel, the rebuilt instant lands on a different calendar day, and
    // optimze_rest_day "corrects" it by adding or subtracting a whole day.
    //
    // That correction is right for its sibling optimze_schedule_application, which shifts full
    // timestamps. Here it is applied to seconds-from-midnight, so the result is a time of day
    // outside 00:00-23:59 — negative when a day is subtracted. The rest day work then applies
    // hours that are a day out when it reaches the DTR.
    //
    // Reachable from Chrome: an Admin in one country editing an employee's late-evening rest day
    // work in another. Nothing here depends on the test environment.
    //
    // The assertion records TODAY's behaviour: the stored second-of-day is shifted by exactly one
    // day. When the unit bug is fixed the shift disappears and this test fails.
    /** @test */
    public function editing_rest_day_work_across_timezones_shifts_the_stored_time_by_a_whole_day_FINDING_RDW_DAY_UNITS()
    {
        list($editor, $owner) = $this->crossTimezonePair();

        $editor_offset = (int) string_offset_to_seconds($editor->country_timezone_to_offset());
        $owner_offset  = (int) string_offset_to_seconds($owner->country_timezone_to_offset());
        $delta = $owner_offset - $editor_offset;

        if ($delta > 1800) {
            $local_start   = 86400 - $delta + 1800;      // rebuilt instant lands on the NEXT day
            $expected_shift = -86400;
        } elseif ($delta < -1800) {
            $local_start   = -$delta - 1800;             // rebuilt instant lands on the PREVIOUS day
            $expected_shift = 86400;
        } else {
            $this->markTestSkipped(
                'the two countries available in this database are within 30 minutes of each other, '
                . 'so no edit can push the rebuilt instant onto a different calendar day'
            );
            return;
        }
        $local_end = $local_start + 3600;

        $rdw = RestDayWork::create([
            'user_id'    => $owner->id,
            'date'       => $this->fixtureDate(0),
            'start_time' => 0,
            'end_time'   => 0,
            'break_time' => 0,
            'status'     => get_constant('REQUEST_STATUS.pending'),
            'created_by' => $owner->id,
            'updated_by' => $owner->id,
        ]);

        $this->be($editor);
        $updated = (new RestDayWorkRepository())->update([
            'date'       => $this->fixtureDate(0),
            'start_time' => gmdate('H:i:s', $local_start),
            'end_time'   => gmdate('H:i:s', $local_end),
        ], $rdw);

        // without the day shift the stored values would be (local time - editor offset)
        $this->assertEquals($local_start - $editor_offset + $expected_shift, (int) $updated->start_time);
        $this->assertEquals($local_end   - $editor_offset + $expected_shift, (int) $updated->end_time);
    }

    /**
     * An Admin-level editor and an employee in a different country, both with a utc_timelog row.
     * Skips rather than guesses when the database cannot supply the pair.
     */
    private function crossTimezonePair()
    {
        $country_ids = DB::table('utc_timelog')->whereNotNull('country_id')->pluck('country_id')->all();
        $admin_levels = EvoxLevels::where('Name', 'Admin')->pluck('LevelId')->all();
        if (!$country_ids || !$admin_levels) {
            $this->markTestSkipped('no utc_timelog rows or no Admin level defined in this database');
        }

        $named = function ($q) {
            $q->where('is_active', 1)
              ->whereNotNull('first_name')->where('first_name', '!=', '')
              ->whereNotNull('last_name')->where('last_name', '!=', '');
        };

        $editor = User::whereIn('LevelId', $admin_levels)
            ->whereIn('country_id', $country_ids)
            ->where($named)
            ->orderBy('id', 'desc')->first();
        if (!$editor) {
            $this->markTestSkipped('no active Admin whose country has a utc_timelog row');
        }

        $owner = User::whereIn('country_id', $country_ids)
            ->where('country_id', '!=', $editor->country_id)
            ->where($named)
            ->orderBy('id', 'desc')->first();
        if (!$owner) {
            $this->markTestSkipped('no active employee in a second utc_timelog-backed country');
        }

        return [$editor, $owner];
    }
}
