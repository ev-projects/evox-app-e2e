<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use App\Modules\Payroll\Models\Computation;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\Leave;
use App\Modules\Request\Models\Overtime;

/**
 * Computation engine — ARM COMPLETION for the six partially covered private computations reached
 * through the single public entry point get_computed_payroll_items(Dtr):
 *
 *   set_timeoff · compute_late · compute_undertime · compute_night_diff · compute_overtime ·
 *   compute_rendered_time
 *
 * ComputationEngineTest already probes real staging DTRs and asserts the SHAPE of the result.
 * This suite is the complement: it pins the payroll MATH of every remaining branch to an exact
 * number of seconds, so it must be deterministic. It therefore touches NO database at all —
 * ComputationArmsDtrStub extends Dtr and overrides only the four relation accessors the engine
 * calls (user / policies / leaves / holidays / overtime) with in-memory stubs. Nothing is read,
 * nothing is written, no DatabaseTransactions needed, and the numbers cannot drift with the dump.
 *
 * The owner's timezone offset is '+00:00' everywhere except the double-offset finding test, so
 * every timestamp below reads exactly as the wall clock of the shift being modelled.
 *
 * Fault injection: the same stub can make a Dtr accessor throw, which is the only way to reach the
 * `catch (Exception $e) { log_error($e); throw $e; }` arm of each computation. The business rule
 * being pinned there is that a failed computation PROPAGATES — it never degrades into an empty or
 * partial payroll-item list that would silently underpay the employee.
 *
 * FINDINGS characterised here (today's behaviour asserted, app code untouched):
 *   FINDING_LATE_DOUBLE_OFFSET        compute_late subtracts the owner offset a second time
 *   FINDING_ND_BREAK_OUTSIDE_WORKTIME break time outside the worked window still wipes night diff
 *   FINDING_RENDERED_LATE_LOGIN       logging in after the scheduled break start renders 0 hours
 *   FINDING_RENDERED_OVERLAP_GUARD    the overlapped guard tests the wrong variable
 */
class ComputationArmsCompleteTest extends TestCase
{
    /** @var Computation */
    private $engine;

    const D1 = '2024-06-10';   // the DTR date (Monday, no DST transition anywhere near it)
    const D2 = '2024-06-11';   // next day
    const D3 = '2024-06-12';   // day after next

    protected function setUp(): void
    {
        parent::setUp();
        $this->engine = new Computation();
    }

    // ------------------------------------------------------------------------------- helpers

    private function ts($datetime)
    {
        return strtotime($datetime);
    }

    /** In-memory Dtr double. $opts: offset, policies, leaves, holidays, overtime, throw_on. */
    private function makeDtr(array $attrs, array $opts = [])
    {
        $d = new ComputationArmsDtrStub();

        $d->stub_offset = isset($opts['offset']) ? $opts['offset'] : '+00:00';

        $policies = isset($opts['policies']) ? $opts['policies'] : [];
        $stub_policies = [];
        foreach ($policies as $policy) {
            $stub_policies[] = (object) ['policy' => $policy, 'value' => '1'];
        }
        $d->stub_policies = $stub_policies;

        $d->stub_leaves   = isset($opts['leaves'])   ? $opts['leaves']   : [];
        $d->stub_holidays = isset($opts['holidays']) ? $opts['holidays'] : [];
        $d->stub_overtime = isset($opts['overtime']) ? $opts['overtime'] : null;
        $d->throw_on      = isset($opts['throw_on']) ? $opts['throw_on'] : [];

        foreach ($attrs as $key => $value) {
            $d->$key = $value;
        }

        return $d;
    }

    /** 09:00-18:00 standard shift with a 1h break, timed in and out exactly on schedule. */
    private function standardShift(array $override = [], array $opts = [])
    {
        return $this->makeDtr(array_merge([
            'date'           => self::D1,
            'start_datetime' => $this->ts(self::D1 . ' 09:00:00'),
            'end_datetime'   => $this->ts(self::D1 . ' 18:00:00'),
            'break_time'     => 3600,
            'time_in'        => $this->ts(self::D1 . ' 09:00:00'),
            'time_out'       => $this->ts(self::D1 . ' 18:00:00'),
        ], $override), $opts);
    }

    private function leave($status, $type, $amount)
    {
        return new Leave(['status' => $status, 'type' => $type, 'amount' => $amount]);
    }

    private function overtime($status, $type, $amount)
    {
        return new Overtime(['status' => $status, 'type' => $type, 'amount' => $amount]);
    }

    private function compute($dtr)
    {
        return $this->engine->get_computed_payroll_items($dtr);
    }

    /** Value of the single payroll item of this type+tag, or null when the engine emitted none. */
    private function itemValue($items, $type, $tag = null)
    {
        $matches = [];
        foreach ($items as $item) {
            $item_tag = $item->tag;
            $same_tag = ($tag === null) ? ($item_tag === null) : ($item_tag === $tag);
            if ($item->item === $type && $same_tag) {
                $matches[] = $item->value;
            }
        }
        $this->assertLessThanOrEqual(
            1, count($matches),
            'expected at most one ' . $type . ' item tagged ' . var_export($tag, true)
        );

        return count($matches) === 1 ? $matches[0] : null;
    }

    private function itemTypes($items)
    {
        $types = [];
        foreach ($items as $item) {
            $types[] = $item->item . ($item->tag === null ? '' : ':' . $item->tag);
        }
        sort($types);

        return $types;
    }

    private function late($items)      { return $this->itemValue($items, get_constant('PAYROLL_ITEMS.late')); }
    private function undertime($items) { return $this->itemValue($items, get_constant('PAYROLL_ITEMS.undertime')); }

    private function nightDiff($items, $tag = null)
    {
        return $this->itemValue($items, get_constant('PAYROLL_ITEMS.night_diff'), $tag);
    }

    private function overtimeValue($items, $tag = null)
    {
        return $this->itemValue($items, get_constant('PAYROLL_ITEMS.overtime'), $tag);
    }

    private function overtimeNightDiff($items, $tag = null)
    {
        return $this->itemValue($items, get_constant('PAYROLL_ITEMS.overtime_night_diff'), $tag);
    }

    private function rendered($items, $tag = null)
    {
        return $this->itemValue($items, get_constant('PAYROLL_ITEMS.rendered_hours'), $tag);
    }

    // ==========================================================================================
    //  set_timeoff
    // ==========================================================================================

    /**
     * Rule: only an APPROVED and PAID leave sets the DTR's time-off; a denied leave and an unpaid
     * leave are both skipped, so the full lateness is still charged.
     *
     * @test
     */
    public function only_an_approved_paid_leave_sets_the_time_off_credit()
    {
        // 09:00-10:00 required day, no break, timed in 2h late.
        $attrs = [
            'start_datetime' => $this->ts(self::D1 . ' 09:00:00'),
            'end_datetime'   => $this->ts(self::D1 . ' 10:00:00'),
            'break_time'     => 0,
            'time_in'        => $this->ts(self::D1 . ' 11:00:00'),
            'time_out'       => $this->ts(self::D1 . ' 12:00:00'),
        ];

        // (a) leaves that must be ignored: denied paid leave + approved UNPAID leave.
        $ignored = $this->standardShift($attrs, [
            'policies' => ['allow_late'],
            'leaves'   => [
                $this->leave('denied', 'Vacation Leave', 1),
                $this->leave('approved', 'Unpaid Leave', 1),
            ],
        ]);
        $this->assertSame(7200, $this->late($this->compute($ignored)), 'no time-off credit may be granted');

        // (b) approved + paid whole-day leave: time-off = 1.0 * (required - break) = 3600s,
        //     which is subtracted from the 7200s of lateness.
        $credited = $this->standardShift($attrs, [
            'policies' => ['allow_late'],
            'leaves'   => [
                $this->leave('denied', 'Vacation Leave', 1),          // skipped, loop continues
                $this->leave('approved', 'Sick Leave', 1),            // taken
            ],
        ]);
        $this->assertSame(3600, $this->late($this->compute($credited)));
    }

    // ==========================================================================================
    //  compute_late
    // ==========================================================================================

    /**
     * Rule: a HALF-DAY paid leave zeroes lateness outright — even when late-minus-time-off is
     * still positive. Contrast with the whole-day leave, which only nets the time-off off.
     *
     * @test
     */
    public function half_day_leave_zeroes_late_while_whole_day_leave_only_nets_it_off()
    {
        $attrs = [
            'start_datetime' => $this->ts(self::D1 . ' 09:00:00'),
            'end_datetime'   => $this->ts(self::D1 . ' 10:00:00'),
            'break_time'     => 0,
            'time_in'        => $this->ts(self::D1 . ' 11:00:00'),   // 2h late
            'time_out'       => $this->ts(self::D1 . ' 12:00:00'),
        ];

        $half = $this->standardShift($attrs, [
            'policies' => ['allow_late'],
            'leaves'   => [$this->leave('approved', 'Vacation Leave', 0.5)],
        ]);
        // 7200 - (0.5 * 3600) = 5400 > 0, but the half-day rule forces it to zero.
        $this->assertNull($this->late($this->compute($half)), 'half-day leave must cancel lateness');

        $whole = $this->standardShift($attrs, [
            'policies' => ['allow_late'],
            'leaves'   => [$this->leave('approved', 'Vacation Leave', 1)],
        ]);
        $this->assertSame(3600, $this->late($this->compute($whole)));
    }

    /**
     * Rule: lateness beyond 8 hours is treated as bad data and discarded (no `late` item at all)
     * rather than charged; 8 hours or less is charged in full.
     *
     * @test
     */
    public function late_beyond_eight_hours_is_discarded_as_invalid()
    {
        $over = $this->standardShift([
            'time_in'  => $this->ts(self::D1 . ' 18:30:00'),   // 9h30m late
            'time_out' => $this->ts(self::D1 . ' 19:00:00'),
        ], ['policies' => ['allow_late']]);
        $this->assertNull($this->late($this->compute($over)), '34200s > 8h must be dropped');

        $under = $this->standardShift([
            'time_in'  => $this->ts(self::D1 . ' 17:00:00'),   // exactly 8h late
            'time_out' => $this->ts(self::D1 . ' 18:00:00'),
        ], ['policies' => ['allow_late']]);
        $this->assertSame(28800, $this->late($this->compute($under)));
    }

    /**
     * FINDING_LATE_DOUBLE_OFFSET — get_computed_payroll_items() already shifts time_in AND
     * start/flexy datetimes by the owner's UTC offset, then compute_late subtracts that offset a
     * SECOND time (`$late = time_in - (expected_time_in + owner_offset_seconds)`). The gate that
     * decides "is he late at all" uses the correct comparison, so for a +08:00 employee the engine
     * agrees he is late and then charges 0. Same DTR, same lateness, different country => the late
     * item disappears. Asserting today's behaviour; app code untouched.
     *
     * @test
     */
    public function late_is_understated_by_the_owner_offset_FINDING_LATE_DOUBLE_OFFSET()
    {
        $attrs = [
            'time_in'  => $this->ts(self::D1 . ' 09:30:00'),   // 30 minutes late
            'time_out' => $this->ts(self::D1 . ' 18:00:00'),
        ];

        $utc = $this->standardShift($attrs, ['policies' => ['allow_late'], 'offset' => '+00:00']);
        $this->assertSame(1800, $this->late($this->compute($utc)));

        $manila = $this->standardShift($attrs, ['policies' => ['allow_late'], 'offset' => '+08:00']);
        // 1800 - 28800 = negative => zeroed. The same 30 minutes are charged to nobody.
        $this->assertNull(
            $this->late($this->compute($manila)),
            'FINDING: the owner offset is subtracted twice, so a +08:00 employee is never late'
        );
    }

    // ==========================================================================================
    //  compute_undertime
    // ==========================================================================================

    /**
     * Rule (standard schedule, break deduction ladder): undertime is end-of-shift minus time-out,
     * then the break is handled in three bands —
     *   below half-day        : charged in full
     *   inside the break band : capped at exactly half a day
     *   beyond the break band : one break length is forgiven
     *
     * @test
     */
    public function standard_undertime_walks_the_three_break_deduction_bands()
    {
        // half_day = (32400 - 3600) / 2 = 14400 ; break band = 14400..18000
        $below = $this->standardShift(
            ['time_out' => $this->ts(self::D1 . ' 16:00:00')],      // 2h short
            ['policies' => ['allow_undertime']]
        );
        $this->assertSame(7200, $this->undertime($this->compute($below)));

        $inside = $this->standardShift(
            ['time_out' => $this->ts(self::D1 . ' 13:30:00')],      // 4h30m short
            ['policies' => ['allow_undertime']]
        );
        $this->assertSame(14400, $this->undertime($this->compute($inside)), 'capped at half a day');

        $beyond = $this->standardShift(
            ['time_out' => $this->ts(self::D1 . ' 10:00:00')],      // 8h short
            ['policies' => ['allow_undertime']]
        );
        $this->assertSame(25200, $this->undertime($this->compute($beyond)), '28800 - 3600 break');
    }

    /**
     * Rule: undertime larger than the required time of the day is bad data — discarded, not
     * charged. Employee timed in and out entirely before his shift started.
     *
     * @test
     */
    public function undertime_greater_than_the_required_time_is_discarded()
    {
        $dtr = $this->standardShift([
            'time_in'  => $this->ts(self::D1 . ' 06:00:00'),
            'time_out' => $this->ts(self::D1 . ' 07:00:00'),
        ], ['policies' => ['allow_undertime']]);

        // 39600 raw - 3600 break = 36000 > required 32400 => dropped.
        $this->assertNull($this->undertime($this->compute($dtr)));
    }

    /**
     * Rule (half-day leave): undertime is measured against the time-off credit, not the schedule.
     * Short of the credit => only the missing part is charged. One second past it => nothing is
     * charged, even though the employee left long before the end of the shift.
     *
     * @test
     */
    public function half_day_leave_charges_undertime_only_against_the_time_off_credit()
    {
        $half = [$this->leave('approved', 'Vacation Leave', 0.5)];  // credit = 0.5 * (32400-3600) = 14400

        $short = $this->standardShift(
            ['time_out' => $this->ts(self::D1 . ' 12:00:00')],       // rendered 10800 <= 14400
            ['policies' => ['allow_undertime'], 'leaves' => $half]
        );
        $this->assertSame(3600, $this->undertime($this->compute($short)), '14400 credit - 10800 rendered');

        $exceeded = $this->standardShift(
            ['time_out' => $this->ts(self::D1 . ' 09:00:00') + 14401],  // rendered 14401 > 14400
            ['policies' => ['allow_undertime'], 'leaves' => $half]
        );
        $this->assertNull(
            $this->undertime($this->compute($exceeded)),
            'one second past the credit clears the undertime entirely'
        );

        // A WHOLE-day leave takes the other arm: schedule-based undertime minus the full credit.
        $whole = $this->standardShift(
            ['time_out' => $this->ts(self::D1 . ' 12:00:00')],
            ['policies' => ['allow_undertime'], 'leaves' => [$this->leave('approved', 'Vacation Leave', 1)]]
        );
        // 21600 - 28800 => negative => dropped.
        $this->assertNull($this->undertime($this->compute($whole)));
    }

    /**
     * Rule (flexible schedule): the expected time-out depends on WHEN the employee timed in —
     *   before the window : measured against end_datetime
     *   inside the window : required time minus rendered time
     *   after the window  : measured against end_flexy_datetime
     *
     * @test
     */
    public function flexible_schedule_undertime_uses_a_different_yardstick_per_time_in_band()
    {
        $flexi = [
            'start_datetime'       => $this->ts(self::D1 . ' 09:00:00'),
            'end_datetime'         => $this->ts(self::D1 . ' 18:00:00'),
            'start_flexy_datetime' => $this->ts(self::D1 . ' 10:00:00'),
            'end_flexy_datetime'   => $this->ts(self::D1 . ' 19:00:00'),
            'break_time'           => 3600,
        ];
        $opts = ['policies' => ['allow_undertime']];

        $before = $this->makeDtr(array_merge($flexi, [
            'date'     => self::D1,
            'time_in'  => $this->ts(self::D1 . ' 08:00:00'),
            'time_out' => $this->ts(self::D1 . ' 17:00:00'),
        ]), $opts);
        $this->assertSame(3600, $this->undertime($this->compute($before)), 'measured to end_datetime');

        $between = $this->makeDtr(array_merge($flexi, [
            'date'     => self::D1,
            'time_in'  => $this->ts(self::D1 . ' 09:30:00'),
            'time_out' => $this->ts(self::D1 . ' 16:30:00'),
        ]), $opts);
        $this->assertSame(7200, $this->undertime($this->compute($between)), 'required 32400 - rendered 25200');

        $after = $this->makeDtr(array_merge($flexi, [
            'date'     => self::D1,
            'time_in'  => $this->ts(self::D1 . ' 10:30:00'),
            'time_out' => $this->ts(self::D1 . ' 18:00:00'),
        ]), $opts);
        $this->assertSame(3600, $this->undertime($this->compute($after)), 'measured to end_flexy_datetime');
    }

    // ==========================================================================================
    //  compute_night_diff
    // ==========================================================================================

    /**
     * Rule: night differential is only the slice of worked time inside 22:00-06:00. An evening
     * shift ending at 23:00 earns exactly the 22:00-23:00 hour, and the 18:00-19:00 break (outside
     * the window) deducts nothing.
     *
     * @test
     */
    public function evening_shift_earns_night_diff_only_from_ten_pm()
    {
        $dtr = $this->standardShift([
            'start_datetime' => $this->ts(self::D1 . ' 14:00:00'),
            'end_datetime'   => $this->ts(self::D1 . ' 23:00:00'),
            'time_in'        => $this->ts(self::D1 . ' 14:00:00'),
            'time_out'       => $this->ts(self::D1 . ' 23:00:00'),
        ], ['policies' => ['allow_night_diff']]);

        $items = $this->compute($dtr);

        $this->assertSame(3600, $this->nightDiff($items), '22:00-23:00 only');
        $this->assertNull($this->nightDiff($items, 'overlapped'));
    }

    /**
     * Rule: an overnight shift splits its night differential across the calendar boundary — day 1
     * carries 22:00-24:00 and day 2 carries 00:00-06:00 tagged `overlapped`. The 02:00-03:00 break
     * falls on day 2, so the whole hour is deducted from the OVERLAPPED bucket only.
     *
     * @test
     */
    public function overnight_shift_splits_night_diff_and_deducts_the_break_on_the_right_day()
    {
        $dtr = $this->standardShift([
            'start_datetime' => $this->ts(self::D1 . ' 22:00:00'),
            'end_datetime'   => $this->ts(self::D2 . ' 07:00:00'),
            'time_in'        => $this->ts(self::D1 . ' 22:00:00'),
            'time_out'       => $this->ts(self::D2 . ' 07:00:00'),
        ], ['policies' => ['allow_night_diff']]);

        $items = $this->compute($dtr);

        $this->assertSame(7200, $this->nightDiff($items), 'day 1: 22:00-24:00');
        $this->assertSame(18000, $this->nightDiff($items, 'overlapped'), 'day 2: 00:00-06:00 less the 1h break');
    }

    /**
     * Rule: when the break itself straddles midnight (22:30-00:30) each half is deducted from the
     * day it belongs to — day 1 loses 22:30-24:00, day 2 loses 00:00-00:30.
     *
     * @test
     */
    public function break_straddling_midnight_is_deducted_from_both_night_diff_buckets()
    {
        $dtr = $this->standardShift([
            'start_datetime' => $this->ts(self::D1 . ' 19:00:00'),
            'end_datetime'   => $this->ts(self::D2 . ' 04:00:00'),
            'break_time'     => 7200,                                  // break 22:30 - 00:30
            'time_in'        => $this->ts(self::D1 . ' 19:00:00'),
            'time_out'       => $this->ts(self::D2 . ' 04:00:00'),
        ], ['policies' => ['allow_night_diff']]);

        $items = $this->compute($dtr);

        $this->assertSame(1800, $this->nightDiff($items), '7200 window hours - 5400 break on day 1');
        $this->assertSame(12600, $this->nightDiff($items, 'overlapped'), '14400 - 1800 break on day 2');
    }

    /**
     * Rule: an employee whose time-in is already past midnight has no day-1 night differential at
     * all — everything he earns is tagged `overlapped`.
     *
     * @test
     */
    public function timing_in_after_midnight_produces_overlapped_night_diff_only()
    {
        $dtr = $this->standardShift([
            'start_datetime' => $this->ts(self::D1 . ' 23:00:00'),
            'end_datetime'   => $this->ts(self::D2 . ' 08:00:00'),
            'time_in'        => $this->ts(self::D2 . ' 01:00:00'),
            'time_out'       => $this->ts(self::D2 . ' 09:00:00'),
        ], ['policies' => ['allow_night_diff']]);

        $items = $this->compute($dtr);

        $this->assertNull($this->nightDiff($items), 'nothing belongs to day 1');
        $this->assertSame(14400, $this->nightDiff($items, 'overlapped'), '01:00-06:00 less the 1h break');
    }

    /**
     * FINDING_ND_BREAK_OUTSIDE_WORKTIME — the scheduled break is derived from the SCHEDULE
     * (expected work start + half a day), never from the time actually logged. An employee who
     * times in after his scheduled break has that break deducted anyway: here 3h of break falls
     * 01:00-04:00 while he only worked 04:00-10:30, so both night differential and rendered hours
     * go negative and are silently zeroed. He worked 04:00-07:00 inside the night window and is
     * paid nothing for the whole DTR. Asserting today's behaviour; app code untouched.
     *
     * @test
     */
    public function break_scheduled_before_time_in_wipes_the_whole_dtr_FINDING_ND_BREAK_OUTSIDE_WORKTIME()
    {
        $dtr = $this->standardShift([
            'start_datetime' => $this->ts(self::D1 . ' 22:00:00'),
            'end_datetime'   => $this->ts(self::D2 . ' 07:00:00'),
            'break_time'     => 10800,                                 // break 01:00 - 04:00
            'time_in'        => $this->ts(self::D2 . ' 04:00:00'),
            'time_out'       => $this->ts(self::D2 . ' 10:30:00'),
        ], ['policies' => ['allow_night_diff']]);

        $items = $this->compute($dtr);

        // night diff 7200 - 10800 break = -3600 => zeroed ; rendered 10800 - 10800 = 0.
        $this->assertNull($this->nightDiff($items, 'overlapped'));
        $this->assertNull($this->nightDiff($items));
        $this->assertSame(
            [], $this->itemTypes($items),
            'FINDING: a break scheduled outside the worked window zeroes every payroll item'
        );
    }

    // ==========================================================================================
    //  compute_overtime
    // ==========================================================================================

    /**
     * Rule: post-overtime runs from the actual end of the shift; the part of it that falls inside
     * 22:00-06:00 is split out as overtime_night_diff and REMOVED from the plain overtime value,
     * so the two always add up to the approved amount.
     *
     * @test
     */
    public function post_overtime_splits_its_night_portion_out_of_the_plain_overtime()
    {
        $day = $this->standardShift([], [
            'overtime' => $this->overtime('approved', get_constant('OVERTIME_TYPE.post'), 7200),
        ]);
        $items = $this->compute($day);
        $this->assertSame(7200, $this->overtimeValue($items), '18:00-20:00 is all daytime');
        $this->assertNull($this->overtimeNightDiff($items));

        $night = $this->standardShift([], [
            'overtime' => $this->overtime('approved', get_constant('OVERTIME_TYPE.post'), 18000),
        ]);
        $items = $this->compute($night);
        $this->assertSame(14400, $this->overtimeValue($items), '18:00-22:00');
        $this->assertSame(3600, $this->overtimeNightDiff($items), '22:00-23:00');
        $this->assertSame(18000, $this->overtimeValue($items) + $this->overtimeNightDiff($items));
    }

    /**
     * Rule: post-overtime crossing midnight is broken into four possible buckets; here 8 approved
     * hours become 18:00-22:00 overtime, 22:00-24:00 night diff, and 00:00-02:00 night diff tagged
     * `overlapped`. Every approved second is still accounted for.
     *
     * @test
     */
    public function post_overtime_crossing_midnight_is_tagged_overlapped()
    {
        $dtr = $this->standardShift([], [
            'overtime' => $this->overtime('approved', get_constant('OVERTIME_TYPE.post'), 28800),
        ]);

        $items = $this->compute($dtr);

        $this->assertSame(14400, $this->overtimeValue($items));
        $this->assertSame(7200, $this->overtimeNightDiff($items));
        $this->assertSame(7200, $this->overtimeNightDiff($items, 'overlapped'));
        $this->assertNull($this->overtimeValue($items, 'overlapped'), '00:00-02:00 is entirely night time');
        $this->assertSame(
            28800,
            $this->overtimeValue($items) + $this->overtimeNightDiff($items) + $this->overtimeNightDiff($items, 'overlapped')
        );
    }

    /**
     * Rule: pre-overtime runs backwards from the actual start of the shift. Inside the same day it
     * is plain overtime; when it reaches back into the PREVIOUS day the part before midnight is
     * tagged `underlapped`.
     *
     * @test
     */
    public function pre_overtime_reaching_into_the_previous_day_is_tagged_underlapped()
    {
        $sameDay = $this->standardShift([], [
            'overtime' => $this->overtime('approved', get_constant('OVERTIME_TYPE.pre'), 3600),
        ]);
        $items = $this->compute($sameDay);
        $this->assertSame(3600, $this->overtimeValue($items), '08:00-09:00');
        $this->assertNull($this->overtimeNightDiff($items));

        $acrossMidnight = $this->standardShift([
            'start_datetime' => $this->ts(self::D1 . ' 01:00:00'),
            'end_datetime'   => $this->ts(self::D1 . ' 10:00:00'),
            'time_in'        => $this->ts(self::D1 . ' 01:00:00'),
            'time_out'       => $this->ts(self::D1 . ' 10:00:00'),
        ], [
            'overtime' => $this->overtime('approved', get_constant('OVERTIME_TYPE.pre'), 7200),
        ]);
        $items = $this->compute($acrossMidnight);

        // 23:00-00:00 belongs to the previous day, 00:00-01:00 to the DTR date; both are night time.
        $this->assertSame(3600, $this->overtimeNightDiff($items, 'underlapped'));
        $this->assertSame(3600, $this->overtimeNightDiff($items));
        $this->assertNull($this->overtimeValue($items, 'underlapped'), 'all of it was night differential');
        $this->assertNull($this->overtimeValue($items));
    }

    /**
     * Rule: when the shift itself already ends after midnight the whole post-overtime sits on the
     * next day, so both buckets are tagged `overlapped` and nothing is charged to the DTR date.
     *
     * @test
     */
    public function overtime_starting_after_midnight_is_entirely_overlapped()
    {
        $dtr = $this->standardShift([
            'start_datetime' => $this->ts(self::D1 . ' 16:00:00'),
            'end_datetime'   => $this->ts(self::D2 . ' 01:00:00'),
            'time_in'        => $this->ts(self::D1 . ' 16:00:00'),
            'time_out'       => $this->ts(self::D2 . ' 01:00:00'),
        ], [
            'overtime' => $this->overtime('approved', get_constant('OVERTIME_TYPE.post'), 28800),
        ]);

        $items = $this->compute($dtr);

        $this->assertSame(18000, $this->overtimeNightDiff($items, 'overlapped'), '01:00-06:00');
        $this->assertSame(10800, $this->overtimeValue($items, 'overlapped'), '06:00-09:00');
        $this->assertNull($this->overtimeValue($items), 'nothing belongs to the DTR date');
        $this->assertNull($this->overtimeNightDiff($items));
    }

    /**
     * Rule: an overtime request that is not approved earns nothing, no matter how many hours it
     * asks for. Same for a DTR with no overtime request at all.
     *
     * @test
     */
    public function unapproved_or_missing_overtime_earns_no_overtime_items()
    {
        $pending = $this->standardShift([], [
            'overtime' => $this->overtime('pending', get_constant('OVERTIME_TYPE.post'), 28800),
        ]);
        $items = $this->compute($pending);
        $this->assertNull($this->overtimeValue($items));
        $this->assertNull($this->overtimeNightDiff($items));

        $none = $this->standardShift();
        $items = $this->compute($none);
        $this->assertNull($this->overtimeValue($items));
        $this->assertSame(
            [get_constant('PAYROLL_ITEMS.rendered_hours')],
            $this->itemTypes($items),
            'a plain worked day yields rendered hours and nothing else'
        );
    }

    // ==========================================================================================
    //  compute_rendered_time
    // ==========================================================================================

    /**
     * Rule: a same-day shift renders (start -> break) + (break -> end); the break is never paid.
     *
     * @test
     */
    public function same_day_shift_renders_the_schedule_minus_the_break()
    {
        $items = $this->compute($this->standardShift());

        $this->assertSame(28800, $this->rendered($items), '9h shift - 1h break');
        $this->assertNull($this->rendered($items, 'overlapped'));
    }

    /**
     * Rule: an overnight shift renders separately per calendar day, and a break that straddles
     * midnight is deducted from both days.
     *
     * @test
     */
    public function overnight_shift_renders_per_day_with_the_break_split_across_midnight()
    {
        $dtr = $this->standardShift([
            'start_datetime' => $this->ts(self::D1 . ' 19:00:00'),
            'end_datetime'   => $this->ts(self::D2 . ' 04:00:00'),
            'break_time'     => 7200,                                  // break 22:30 - 00:30
            'time_in'        => $this->ts(self::D1 . ' 19:00:00'),
            'time_out'       => $this->ts(self::D2 . ' 04:00:00'),
        ]);

        $items = $this->compute($dtr);

        $this->assertSame(12600, $this->rendered($items), '19:00-24:00 less 5400 break');
        $this->assertSame(12600, $this->rendered($items, 'overlapped'), '00:00-04:00 less 1800 break');
        $this->assertSame(25200, $this->rendered($items) + $this->rendered($items, 'overlapped'), '9h - 2h break');
    }

    /**
     * Rule: when the employee times in after midnight of an overnight shift, everything he renders
     * is tagged `overlapped` and the day-1 bucket stays empty.
     *
     * @test
     */
    public function timing_in_after_midnight_renders_only_the_overlapped_bucket()
    {
        $dtr = $this->standardShift([
            'start_datetime' => $this->ts(self::D1 . ' 20:00:00'),
            'end_datetime'   => $this->ts(self::D2 . ' 05:00:00'),
            'time_in'        => $this->ts(self::D2 . ' 00:30:00'),
            'time_out'       => $this->ts(self::D2 . ' 05:00:00'),
        ]);

        $items = $this->compute($dtr);

        $this->assertNull($this->rendered($items));
        $this->assertSame(12600, $this->rendered($items, 'overlapped'), '4h30m worked less the 1h break');
    }

    /**
     * FINDING_RENDERED_LATE_LOGIN — rendered hours are computed as
     * (scheduled break start - actual start) + (actual end - scheduled break end). An employee who
     * arrives AFTER the scheduled break start makes the first term negative, the total goes below
     * zero and the whole result is zeroed: 30 minutes of real work are rendered as nothing.
     * Asserting today's behaviour; app code untouched.
     *
     * @test
     */
    public function logging_in_after_the_scheduled_break_renders_nothing_FINDING_RENDERED_LATE_LOGIN()
    {
        $dtr = $this->standardShift([
            'time_in'  => $this->ts(self::D1 . ' 17:30:00'),   // break was scheduled 13:00-14:00
            'time_out' => $this->ts(self::D1 . ' 18:00:00'),
        ]);

        $items = $this->compute($dtr);

        // (13:00 - 17:30) + (18:00 - 14:00) = -16200 + 14400 = -1800 => zeroed.
        $this->assertNull(
            $this->rendered($items),
            'FINDING: 30 worked minutes render as zero because the break is subtracted from a shift he missed'
        );
        $this->assertSame([], $this->itemTypes($items));
    }

    /**
     * FINDING_RENDERED_OVERLAP_GUARD — the validity guard for the overlapped bucket reads
     * `if ($rendered_hours_overlapped < 0 || $rendered_hours > getRequiredTime())`, i.e. its second
     * clause tests the DAY-1 variable, which the previous guard has already clamped to 0. The
     * clause is therefore dead and the overlapped bucket is never capped at the required time.
     * Observable consequence pinned here: day 1 is wiped (the full break is charged to a partial
     * day) while the overlapped bucket survives untouched. Asserting today's behaviour.
     *
     * @test
     */
    public function overlapped_rendered_hours_survive_a_wiped_day_one_FINDING_RENDERED_OVERLAP_GUARD()
    {
        $dtr = $this->standardShift([
            'start_datetime' => $this->ts(self::D1 . ' 14:00:00'),
            'end_datetime'   => $this->ts(self::D2 . ' 02:00:00'),   // 12h required, break 19:30-20:30
            'time_in'        => $this->ts(self::D1 . ' 23:30:00'),
            'time_out'       => $this->ts(self::D3 . ' 01:00:00'),   // never clocked out that night
        ]);

        $items = $this->compute($dtr);

        // day 1: 23:30-24:00 = 1800 - 3600 break = -1800 => zeroed. day 2: 00:00-02:00 = 7200 kept.
        $this->assertNull($this->rendered($items));
        $this->assertSame(
            7200, $this->rendered($items, 'overlapped'),
            'FINDING: the overlapped guard tests $rendered_hours, so the overlapped bucket is never validated'
        );
        $this->assertSame([get_constant('PAYROLL_ITEMS.rendered_hours') . ':overlapped'], $this->itemTypes($items));
    }

    // ==========================================================================================
    //  failure arms — every computation rethrows instead of returning a partial payroll
    // ==========================================================================================

    private function expectPropagatedFailure()
    {
        Log::shouldReceive('critical')->zeroOrMoreTimes();
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('injected computation failure');
    }

    /** @test */
    public function set_timeoff_rethrows_instead_of_computing_without_the_leave()
    {
        $this->expectPropagatedFailure();

        $dtr = $this->standardShift([], [
            'policies' => ['allow_late'],
            'leaves'   => [new ComputationArmsThrowingLeave()],
        ]);

        $this->compute($dtr);
    }

    /** @test */
    public function compute_late_rethrows_instead_of_charging_zero_lateness()
    {
        $this->expectPropagatedFailure();

        $dtr = $this->standardShift(
            ['time_in' => $this->ts(self::D1 . ' 10:00:00')],
            ['policies' => ['allow_late'], 'throw_on' => ['getExpectedTimeIn']]
        );

        $this->compute($dtr);
    }

    /** @test */
    public function compute_undertime_rethrows_instead_of_charging_zero_undertime()
    {
        $this->expectPropagatedFailure();

        $dtr = $this->standardShift(
            ['time_out' => $this->ts(self::D1 . ' 16:00:00')],
            ['policies' => ['allow_undertime'], 'throw_on' => ['getTotalRenderedTime']]
        );

        $this->compute($dtr);
    }

    /** @test */
    public function compute_night_diff_rethrows_instead_of_paying_no_differential()
    {
        $this->expectPropagatedFailure();

        $dtr = $this->standardShift([
            'start_datetime' => $this->ts(self::D1 . ' 22:00:00'),
            'end_datetime'   => $this->ts(self::D2 . ' 07:00:00'),
            'time_in'        => $this->ts(self::D1 . ' 22:00:00'),
            'time_out'       => $this->ts(self::D2 . ' 07:00:00'),
        ], ['policies' => ['allow_night_diff'], 'throw_on' => ['hasOverlappedTimeLogs']]);

        $this->compute($dtr);
    }

    /** @test */
    public function compute_overtime_rethrows_instead_of_dropping_the_approved_overtime()
    {
        $this->expectPropagatedFailure();

        $dtr = $this->standardShift([], ['throw_on' => ['overtime']]);

        $this->compute($dtr);
    }

    /** @test */
    public function compute_rendered_time_rethrows_instead_of_rendering_zero_hours()
    {
        $this->expectPropagatedFailure();

        // No night-diff policy, so compute_rendered_time is the first caller of the failing accessor.
        $dtr = $this->standardShift([], ['throw_on' => ['hasOverlappedTimeLogs']]);

        $this->compute($dtr);
    }
}


/**
 * Minimal stand-in for an Eloquent relation: the engine only ever calls ->get(), ->first() or
 * ->count() on the relations it reads.
 */
class ComputationArmsRelationStub
{
    private $items;

    public function __construct($items)
    {
        $this->items = new Collection(is_array($items) ? $items : [$items]);
    }

    public function get()
    {
        return $this->items;
    }

    public function first()
    {
        return $this->items->first();
    }

    public function count()
    {
        return $this->items->count();
    }
}

/** Owner stand-in: the engine only asks for the country timezone offset. */
class ComputationArmsUserStub
{
    private $offset;

    public function __construct($offset)
    {
        $this->offset = $offset;
    }

    public function country_timezone_to_offset()
    {
        return $this->offset;
    }
}

/** A Leave whose approval check blows up — used to reach set_timeoff's catch arm. */
class ComputationArmsThrowingLeave extends Leave
{
    public function isApproved()
    {
        throw new \Exception('injected computation failure: isApproved');
    }
}

/**
 * Dtr double: real Dtr behaviour (every predicate and getter is the production one) with the five
 * relation accessors served from memory, plus opt-in fault injection on the accessors the private
 * computations call first.
 */
class ComputationArmsDtrStub extends Dtr
{
    public $stub_offset = '+00:00';
    public $stub_policies = [];
    public $stub_leaves = [];
    public $stub_holidays = [];
    public $stub_overtime = null;
    public $throw_on = [];

    private function maybeThrow($method)
    {
        if (in_array($method, $this->throw_on, true)) {
            throw new \Exception('injected computation failure: ' . $method);
        }
    }

    public function user()
    {
        return new ComputationArmsRelationStub(new ComputationArmsUserStub($this->stub_offset));
    }

    public function policies()
    {
        return new ComputationArmsRelationStub($this->stub_policies);
    }

    public function leaves()
    {
        return new ComputationArmsRelationStub($this->stub_leaves);
    }

    public function holidays()
    {
        return new ComputationArmsRelationStub($this->stub_holidays);
    }

    public function overtime()
    {
        $this->maybeThrow('overtime');

        return new ComputationArmsRelationStub($this->stub_overtime === null ? [] : [$this->stub_overtime]);
    }

    public function getExpectedTimeIn()
    {
        $this->maybeThrow('getExpectedTimeIn');

        return parent::getExpectedTimeIn();
    }

    public function getTotalRenderedTime()
    {
        $this->maybeThrow('getTotalRenderedTime');

        return parent::getTotalRenderedTime();
    }

    public function hasOverlappedTimeLogs()
    {
        $this->maybeThrow('hasOverlappedTimeLogs');

        return parent::hasOverlappedTimeLogs();
    }
}
