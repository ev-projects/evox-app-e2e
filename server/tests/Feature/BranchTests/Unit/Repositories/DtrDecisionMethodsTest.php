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
 * `isOntime()` and `onTimeLog()` read the DTR's schedule policies through the
 * policies() hasMany, so the "policy IS present" arms bind an in-memory Dtr to the id of a REAL
 * probed dtr_policies row (bounded, ORDER BY id DESC LIMIT 1). The "policy is ABSENT" arms use an
 * unbound Dtr: Laravel's HasOneOrMany::addConstraints emits `dtr_id is null AND dtr_id is not null`,
 * an impossible WHERE, so nothing is scanned and the relation is guaranteed empty.
 * No stored procedure is invoked anywhere in this file; nothing is ever written.
 *
 * ARMS COVERED
 *   isOntime                   : no allow_late policy -> hasLog() true / false;
 *                                allow_late present -> in before start, in exactly at start, late on a FIXED
 *                                schedule, inside flexy grace, at the flexy boundary, past the flexy grace,
 *                                and the is_valid(time_in) guard with no punch
 *   onTimeLog                  : no policies -> validLog() true / false; both policies -> full fixed day,
 *                                flexible full render, flexible short render, timed in past grace, late on a
 *                                fixed schedule, and the no-schedule early exit
 *   underlapped_payroll_items  : relation shape + tag binding + real rows all carry the underlapped tag
 *   overlapped_payroll_items   : relation shape + tag binding + real rows all carry the overlapped tag
 *
 * REMOVED 2026-08-06: the tests for checkUndertime(), isTimedOutBefore/Between/AfterSchedule()
 * and summary_report_short() were deleted together with the methods themselves. Those methods had
 * no caller anywhere in the application, so the tests exercised code no user could reach — they
 * raised the method-coverage figure without protecting anybody. Finding DTR-RES-1, which that
 * suite characterized, is preserved in coverage-max/KNOWLEDGE-BASE/FINDINGS-REGISTER.md.
 *
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
    // =====================================================================================



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



}
