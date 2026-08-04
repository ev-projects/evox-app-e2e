<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\DtrPolicy;
use App\Modules\Payroll\Models\DtrPayrollItems;

/**
 * COMPLETES App\Modules\Payroll\Models\Dtr — the PAYROLL DECISION layer, all at 0% before this file.
 *
 * WHY A USER CARES: these eight members decide, for every employee for every working day, whether
 * the day is counted as ON TIME, LATE or UNDERTIME, and what the day's late/undertime/overtime/
 * night-differential totals look like on the Attendance and Team Schedule screens. Every one of
 * them feeds money. `isOntime()` is what paints the "early" badge in Dtr::getDtrStatus() (Menu:
 * Reports -> Daily/Weekly/Team Schedule, and the Team Schedule export); `onTimeLog()` is what
 * TeamAttendanceResources shows a manager for their team.
 *
 * SHAPE: the boolean predicates are pure attribute logic, so they are driven by UNSAVED in-memory
 * Dtr instances (same technique as DtrModelPredicatesTest) — no DB, no writes, no DatabaseTransactions.
 * `isOntime()`, `checkUndertime()` and `onTimeLog()` read the DTR's schedule policies through the
 * policies() hasMany, so the "policy IS present" arms bind an in-memory Dtr to the id of a REAL
 * probed dtr_policies row (bounded, ORDER BY id DESC LIMIT 1). The "policy is ABSENT" arms use an
 * unbound Dtr: Laravel's HasOneOrMany::addConstraints emits `dtr_id is null AND dtr_id is not null`,
 * an impossible WHERE, so nothing is scanned and the relation is guaranteed empty.
 * No stored procedure is invoked anywhere in this file; nothing is ever written.
 *
 * ARMS COVERED
 *   isTimedOutBeforeSchedule   : out before end / out at end / out after end
 *   isTimedOutBetweenSchedule  : flexible in-window, flexible at both boundaries, standard >= end, standard short
 *   isTimedOutAfterSchedule    : flexible requires end_flexy, flexible short of end_flexy, standard >= end, standard short
 *   isOntime                   : no allow_late policy -> hasLog() true / false;
 *                                allow_late present -> in before start, in exactly at start, late on a FIXED
 *                                schedule, inside flexy grace, at the flexy boundary, past the flexy grace,
 *                                and the is_valid(time_in) guard with no punch
 *   checkUndertime             : no allow_undertime policy -> false; policy present -> out before end, out at
 *                                end, out past end on a FIXED schedule (else arm), flexible short day,
 *                                flexible full day, expected-out CAPPED at end_flexy, timed in after grace
 *   onTimeLog                  : no policies -> validLog() true / false; both policies -> full fixed day,
 *                                flexible full render, flexible short render, timed in past grace, late on a
 *                                fixed schedule, and the no-schedule early exit
 *   underlapped_payroll_items  : relation shape + tag binding + real rows all carry the underlapped tag
 *   overlapped_payroll_items   : relation shape + tag binding + real rows all carry the overlapped tag
 *   summary_report_short       : real drt_summary_report row -> full formatting loop; and the broken-state arm
 *
 * FINDING DTR-RES-1 (characterized, app NOT modified): Dtr::summary_report_short() reads
 * `$this->resource->date` and `$this->resource->user_id`. `resource` is a property of a Laravel
 * JsonResource, NOT of an Eloquent model — the whole method is a verbatim copy-paste of the summary
 * block in App\Modules\Payroll\Resources\DtrLogResource::toArray() (lines 37-59). On a Dtr,
 * `$this->resource` resolves to null, so the method either raises "Attempt to read property on null"
 * or (with warnings not converted) queries `login_date IS NULL AND user_id IS NULL` and returns [].
 * It can never return that DTR's own totals. The method has no callers anywhere in the codebase.
 */
class DtrDecisionMethodsTest extends TestCase
{
    /** 08:00 - 17:00 fixed schedule, expressed in the seconds-of-day form the DTR columns use. */
    const START = 28800;
    const END = 61200;
    const START_FLEXY = 32400;  // 09:00 — latest allowed time-in
    const END_FLEXY = 64800;    // 18:00 — latest allowed time-out

    /** @var array memoised probe results; false = not probed yet */
    private $probed = [];

    /** Build an UNSAVED Dtr; $id (optional) binds policies()/payroll-item relations to a real parent row. */
    private function dtr(array $attrs = [], $id = null)
    {
        $d = new Dtr();
        if ($id !== null) {
            $d->id = $id;
        }
        foreach ($attrs as $k => $v) {
            $d->$k = $v;
        }
        return $d;
    }

    private function fixed(array $extra = [])
    {
        return ['start_datetime' => self::START, 'end_datetime' => self::END] + $extra;
    }

    private function flexible(array $extra = [], $endFlexy = self::END_FLEXY)
    {
        return [
            'start_datetime' => self::START,
            'end_datetime' => self::END,
            'start_flexy_datetime' => self::START_FLEXY,
            'end_flexy_datetime' => $endFlexy,
        ] + $extra;
    }

    /** ONE dtr id that carries the named schedule policy switched on. Bounded probe, never a scan. */
    private function dtrIdWithPolicy($policy)
    {
        if (!array_key_exists($policy, $this->probed)) {
            $row = DtrPolicy::where('policy', '=', $policy)
                ->where('value', '=', '1')
                ->orderBy('id', 'desc')
                ->first();
            $this->probed[$policy] = $row ? (int) $row->dtr_id : null;
        }
        return $this->probed[$policy];
    }

    /** ONE dtr id carrying BOTH allow_late and allow_undertime — needed by onTimeLog(). */
    private function dtrIdWithBothPolicies()
    {
        if (!array_key_exists('__both', $this->probed)) {
            $lateIds = DtrPolicy::where('policy', '=', 'allow_late')
                ->where('value', '=', '1')
                ->orderBy('id', 'desc')
                ->limit(50)
                ->pluck('dtr_id')
                ->all();

            $id = null;
            if (!empty($lateIds)) {
                $id = DtrPolicy::whereIn('dtr_id', $lateIds)
                    ->where('policy', '=', 'allow_undertime')
                    ->where('value', '=', '1')
                    ->orderBy('id', 'desc')
                    ->value('dtr_id');
            }
            $this->probed['__both'] = $id === null ? null : (int) $id;
        }
        return $this->probed['__both'];
    }

    // =====================================================================================
    //  Time-out classification — pure in-memory, no DB touched at all
    // =====================================================================================

    /** @test */
    public function timed_out_before_schedule_marks_anyone_who_clocked_out_at_or_before_the_end_time()
    {
        // left at 16:00 on a 08:00-17:00 shift
        $this->assertTrue($this->dtr($this->fixed(['time_out' => 57600]))->isTimedOutBeforeSchedule());
        // left exactly at 17:00 — the boundary is inclusive
        $this->assertTrue($this->dtr($this->fixed(['time_out' => self::END]))->isTimedOutBeforeSchedule());
        // stayed until 18:00
        $this->assertFalse($this->dtr($this->fixed(['time_out' => 64800]))->isTimedOutBeforeSchedule());
    }

    /** @test */
    public function timed_out_between_schedule_separates_the_flexible_window_from_a_fixed_shift()
    {
        // FLEXIBLE 17:00-18:00 window: 17:30 sits strictly inside it
        $this->assertTrue($this->dtr($this->flexible(['time_out' => 63000]))->isTimedOutBetweenSchedule());
        // both flexible boundaries are EXCLUSIVE — 17:00 and 18:00 are not "between"
        $this->assertFalse($this->dtr($this->flexible(['time_out' => self::END]))->isTimedOutBetweenSchedule());
        $this->assertFalse($this->dtr($this->flexible(['time_out' => self::END_FLEXY]))->isTimedOutBetweenSchedule());

        // FIXED shift: the second arm only needs time_out at or beyond the end time
        $this->assertTrue($this->dtr($this->fixed(['time_out' => self::END]))->isTimedOutBetweenSchedule());
        $this->assertTrue($this->dtr($this->fixed(['time_out' => 64800]))->isTimedOutBetweenSchedule());
        $this->assertFalse($this->dtr($this->fixed(['time_out' => 57600]))->isTimedOutBetweenSchedule());
    }

    /** @test */
    public function timed_out_after_schedule_requires_the_flexy_end_when_the_shift_is_flexible()
    {
        // FLEXIBLE: only clocking out at/after 18:00 counts as "after schedule"
        $this->assertTrue($this->dtr($this->flexible(['time_out' => self::END_FLEXY]))->isTimedOutAfterSchedule());
        $this->assertTrue($this->dtr($this->flexible(['time_out' => 68400]))->isTimedOutAfterSchedule());
        // 17:30 is past the plain end time but still inside the flexible window -> NOT after schedule
        $this->assertFalse($this->dtr($this->flexible(['time_out' => 63000]))->isTimedOutAfterSchedule());

        // FIXED: the plain end time is the bar
        $this->assertTrue($this->dtr($this->fixed(['time_out' => self::END]))->isTimedOutAfterSchedule());
        $this->assertFalse($this->dtr($this->fixed(['time_out' => 57600]))->isTimedOutAfterSchedule());
    }

    // =====================================================================================
    //  isOntime() / onTimeLog() — policy-driven
    // =====================================================================================

    /** @test */
    public function without_an_allow_late_policy_any_punch_at_all_counts_as_on_time()
    {
        // No policy row is reachable from an unbound DTR, so the else arm runs: hasLog() decides.
        $this->assertTrue($this->dtr(['time_in' => self::START, 'time_out' => self::END])->isOntime());
        // a lone time-out still satisfies the OR inside hasLog()
        $this->assertTrue($this->dtr(['time_in' => null, 'time_out' => self::END])->isOntime());
        // an employee who never punched is not on time
        $this->assertFalse($this->dtr(['time_in' => null, 'time_out' => null])->isOntime());
    }

    /** @test */
    public function with_an_allow_late_policy_only_punches_inside_the_grace_window_are_on_time()
    {
        $id = $this->dtrIdWithPolicy('allow_late');
        if ($id === null) {
            $this->markTestSkipped('no allow_late=1 row in dtr_policies in this test DB');
        }

        // clocked in 07:00, before the 08:00 start
        $this->assertTrue($this->dtr($this->fixed(['time_in' => 25200]), $id)->isOntime());
        // clocked in exactly at 08:00 — inclusive
        $this->assertTrue($this->dtr($this->fixed(['time_in' => self::START]), $id)->isOntime());
        // 08:20 on a FIXED shift: there is no grace window to fall back on -> late
        $this->assertFalse($this->dtr($this->fixed(['time_in' => 30000]), $id)->isOntime());

        // same 08:20 punch on a FLEXIBLE shift with a 08:00-09:00 grace window -> on time
        $this->assertTrue($this->dtr($this->flexible(['time_in' => 30000]), $id)->isOntime());
        // 09:00 exactly — the flexy boundary is inclusive here
        $this->assertTrue($this->dtr($this->flexible(['time_in' => self::START_FLEXY]), $id)->isOntime());
        // 10:00, past the grace window -> late
        $this->assertFalse($this->dtr($this->flexible(['time_in' => 36000]), $id)->isOntime());

        // never clocked in -> the is_valid() guard short-circuits the whole method
        $this->assertFalse($this->dtr($this->flexible(['time_in' => null]), $id)->isOntime());
    }

    /** @test */
    public function without_schedule_policies_on_time_log_falls_back_to_a_complete_pair_of_punches()
    {
        // else arm: no allow_late/allow_undertime -> a complete in+out pair is enough
        $this->assertTrue($this->dtr($this->fixed(['time_in' => self::START, 'time_out' => self::END]))->onTimeLog());
        // incomplete pair -> validLog() false -> falls through to the final return
        $this->assertFalse($this->dtr($this->fixed(['time_in' => self::START, 'time_out' => null]))->onTimeLog());
        // no schedule at all -> early exit before any policy lookup
        $this->assertFalse($this->dtr(['time_in' => self::START, 'time_out' => self::END])->onTimeLog());
    }

    /** @test */
    public function on_time_log_requires_the_full_shift_to_be_rendered_when_both_policies_are_on()
    {
        $id = $this->dtrIdWithBothPolicies();
        if ($id === null) {
            $this->markTestSkipped('no DTR with both allow_late=1 and allow_undertime=1 in this test DB');
        }

        // in at 08:00, out at 17:00 — the straightforward complete-shift arm
        $this->assertTrue($this->dtr($this->fixed(['time_in' => self::START, 'time_out' => self::END]), $id)->onTimeLog());

        // FLEXIBLE: in at 08:20 owes 9h, so the expected out is 17:20 (62400)
        $this->assertTrue($this->dtr($this->flexible(['time_in' => 30000, 'time_out' => 62400]), $id)->onTimeLog());
        // ...clocking out one minute short of the expected out is NOT a complete day
        $this->assertFalse($this->dtr($this->flexible(['time_in' => 30000, 'time_out' => 61500]), $id)->onTimeLog());
        // ...clocked in 11:06, past the grace window -> rejected before any rendering maths
        $this->assertFalse($this->dtr($this->flexible(['time_in' => 40000, 'time_out' => 70000]), $id)->onTimeLog());

        // FIXED shift, clocked in late: neither the complete-shift arm nor the flexible arm applies
        $this->assertFalse($this->dtr($this->fixed(['time_in' => 30000, 'time_out' => 70000]), $id)->onTimeLog());

        // no schedule -> early exit even with both policies on
        $this->assertFalse($this->dtr(['time_in' => 1, 'time_out' => 2], $id)->onTimeLog());
    }

    // =====================================================================================
    //  checkUndertime()
    // =====================================================================================

    /** @test */
    public function without_an_allow_undertime_policy_a_short_day_is_never_flagged_as_undertime()
    {
        // The policy gate is the first thing the method reads; with no policy it always returns false,
        // even for someone who clearly left three hours early.
        $this->assertFalse($this->dtr($this->fixed(['time_out' => 50400]))->checkUndertime());
        $this->assertFalse($this->dtr($this->flexible(['time_in' => 30000, 'time_out' => 50400]))->checkUndertime());
    }

    /** @test */
    public function allow_undertime_policy_flags_short_days_on_fixed_and_flexible_shifts()
    {
        $id = $this->dtrIdWithPolicy('allow_undertime');
        if ($id === null) {
            $this->markTestSkipped('no allow_undertime=1 row in dtr_policies in this test DB');
        }

        // FIXED shift, out at 16:40 -> undertime
        $this->assertTrue($this->dtr($this->fixed(['time_out' => 60000]), $id)->checkUndertime());
        // out exactly at 17:00 — the <= boundary still reports undertime (characterised as-is)
        $this->assertTrue($this->dtr($this->fixed(['time_out' => self::END]), $id)->checkUndertime());
        // FIXED shift, stayed past 17:00 -> the else arm returns false outright
        $this->assertFalse($this->dtr($this->fixed(['time_out' => 64000]), $id)->checkUndertime());

        // FLEXIBLE: in 08:20 -> expected out 17:20 (62400); leaving 17:05 is short -> undertime
        $this->assertTrue($this->dtr($this->flexible(['time_in' => 30000, 'time_out' => 61500]), $id)->checkUndertime());
        // ...leaving 17:46 covers the full 9h -> no undertime
        $this->assertFalse($this->dtr($this->flexible(['time_in' => 30000, 'time_out' => 64000]), $id)->checkUndertime());

        // CAP ARM: in 09:00 would owe until 18:00, but the flexy end is 17:30 (63000), so the
        // expected out is capped at 17:30; leaving 17:13 is still short -> undertime
        $capped = $this->flexible(['time_in' => self::START_FLEXY, 'time_out' => 62000], 63000);
        $this->assertTrue($this->dtr($capped, $id)->checkUndertime());

        // FLEXIBLE but clocked in 11:06, outside the grace window -> falls through to the final return
        $this->assertFalse($this->dtr($this->flexible(['time_in' => 40000, 'time_out' => 64000]), $id)->checkUndertime());
    }

    // =====================================================================================
    //  Tagged payroll-item relations (overnight shifts split their pay across two DTR days)
    // =====================================================================================

    /** @test */
    public function underlapped_and_overlapped_payroll_item_relations_filter_by_their_tag()
    {
        $blank = new Dtr();

        $under = $blank->underlapped_payroll_items();
        $over = $blank->overlapped_payroll_items();

        $this->assertInstanceOf(HasMany::class, $under);
        $this->assertInstanceOf(HasMany::class, $over);
        $this->assertContains(get_constant('PAYROLL_ITEM_TAGS.underlapped'), $under->getBindings());
        $this->assertContains(get_constant('PAYROLL_ITEM_TAGS.overlapped'), $over->getBindings());

        // Unbound parent -> `dtr_id is null AND dtr_id is not null` -> guaranteed empty, nothing scanned.
        $this->assertCount(0, $under->get());
        $this->assertCount(0, $over->get());

        // Bounded probe over the most recent payroll items for a real tagged parent.
        $recent = DtrPayrollItems::orderBy('id', 'desc')->limit(500)->get(['id', 'dtr_id', 'tag']);

        $underRow = $recent->firstWhere('tag', get_constant('PAYROLL_ITEM_TAGS.underlapped'));
        if ($underRow) {
            $rows = $this->dtr([], (int) $underRow->dtr_id)->underlapped_payroll_items()->get();
            $this->assertGreaterThan(0, $rows->count());
            foreach ($rows as $row) {
                $this->assertTrue($row->isUnderlapped(), 'underlapped relation returned a differently tagged item');
            }
        }

        $overRow = $recent->firstWhere('tag', get_constant('PAYROLL_ITEM_TAGS.overlapped'));
        if ($overRow) {
            $rows = $this->dtr([], (int) $overRow->dtr_id)->overlapped_payroll_items()->get();
            $this->assertGreaterThan(0, $rows->count());
            foreach ($rows as $row) {
                $this->assertTrue($row->isOverlapped(), 'overlapped relation returned a differently tagged item');
            }
        }
    }

    // =====================================================================================
    //  summary_report_short()
    // =====================================================================================

    /** @test */
    public function summary_report_short_formats_the_daily_payroll_totals_for_a_real_summary_row()
    {
        try {
            $row = DB::table('drt_summary_report')->orderBy('id', 'desc')->first();
        } catch (\Throwable $e) {
            $this->markTestSkipped('drt_summary_report is not readable in this test DB: ' . $e->getMessage());
            return;
        }
        if (!$row) {
            $this->markTestSkipped('drt_summary_report has no rows in this test DB');
        }

        // The method reads $this->resource->{date,user_id} (see FINDING DTR-RES-1), so the only way
        // to reach its formatting loop on a Dtr is to supply that property explicitly.
        $dtr = new Dtr();
        $dtr->resource = (object) ['date' => $row->login_date, 'user_id' => $row->user_id];

        $items = $dtr->summary_report_short();

        $this->assertIsArray($items);
        foreach (['late', 'undertime', 'overtime', 'overtime_night_diff', 'night_diff', 'rendered_hours',
                  get_constant('PAYROLL_ITEMS.unpaid_leave')] as $key) {
            $this->assertArrayHasKey($key, $items, "summary_report_short() must expose the '$key' total");
        }

        // Every total is either a formatted H:i:s string (positive) or an empty string (nothing to show);
        // the unpaid-leave entry is a rounded day count.
        foreach ($items as $key => $value) {
            $this->assertTrue(
                is_string($value) || is_numeric($value),
                "payroll total '$key' should be a formatted string or a number"
            );
        }
    }

    /** @test */
    public function summary_report_short_cannot_read_its_own_dtr_FINDING_DTR_RES_1()
    {
        // A perfectly normal DTR: the date and the employee are both set on the model itself.
        $dtr = $this->dtr(['date' => '2026-01-01', 'user_id' => 1]);

        $thrown = null;
        $result = null;
        try {
            $result = $dtr->summary_report_short();
        } catch (\Throwable $e) {
            $thrown = $e;
        }

        // CHARACTERIZATION (app deliberately not fixed): because the method reads the JsonResource-only
        // `$this->resource` property, it can never see $dtr->date / $dtr->user_id. It either raises a
        // read-on-null diagnostic or silently returns nothing — never this DTR's real totals.
        $this->assertTrue(
            $thrown !== null || $result === [],
            'summary_report_short() unexpectedly returned data for a DTR whose $resource is undefined'
        );

        if ($thrown !== null) {
            $message = $thrown->getMessage();
            $this->assertTrue(
                stripos($message, 'on null') !== false || stripos($message, 'non-object') !== false,
                'expected the undefined $resource property to be the cause, got: ' . $message
            );
        }
    }
}
