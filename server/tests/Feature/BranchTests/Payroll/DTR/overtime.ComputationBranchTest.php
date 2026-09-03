<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Payroll/Models/Computation.php  ::compute_overtime (private, entered from
 *                                                get_computed_payroll_items at line 157)
 *   supporting: ::get_night_diff_datetime, ::get_total_night_diff, ::set_expected_work,
 *               ::set_actual_time  (all on the same call path)
 *
 * MENU PATH
 *   Requests -> Overtime (approve)  ->  Payroll -> Daily Time Record
 *   An approved overtime request is what makes this method produce anything; the numbers it returns
 *   are the overtime hours that appear on the DTR and on every payroll export downstream.
 *
 * COVERAGE BEFORE THIS FILE
 *   Computation::compute_overtime  96.04% of lines. The four uncovered lines are the whole
 *   underlapped/overlapped midnight-crossing family — precisely the arithmetic nobody can check by
 *   eye and the arithmetic that decides how much an employee is paid.
 *
 * WHY THE ASSERTIONS ARE EXACT NUMBERS
 *   This is a money path, so "returns a collection of payroll items" is not a test. Every expected
 *   value below is derived by hand from the source and written out in the comment above the
 *   assertion, so a change in the formula fails the test with a readable diff rather than passing
 *   because both sides moved together. Durations are asserted, never absolute timestamps, so the
 *   owner's timezone offset cannot influence the result.
 *
 * FINDINGS
 *   none
 */

namespace Tests\Feature\BranchTests\Payroll\DTR;

use Tests\TestCase;
use Tests\Feature\BranchTests\Support\DtrFixtureTrait;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\Payroll\Models\Computation;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Request\Models\Overtime;

class ComputationOvertimeBranchTest extends TestCase
{
    use DatabaseTransactions, DtrFixtureTrait;

    /** An overtime request for the fixture user on fixture day 0. */
    private function overtimeRequest($type, $amount_seconds, $status = 'approved')
    {
        return Overtime::create([
            'user_id'       => $this->requireFixtureUser()->id,
            'date'          => $this->fixtureDate(0),
            'amount'        => $amount_seconds,
            'type'          => $type,
            'status'        => $status,
            'employee_note' => 'fixture overtime',
            'created_by'    => $this->requireFixtureUser()->id,
            'updated_by'    => $this->requireFixtureUser()->id,
        ]);
    }

    /**
     * Run the engine and return only the overtime family, keyed "item|tag" so a test can state
     * exactly which buckets were filled and which were left empty.
     */
    private function overtimeItems(Dtr $dtr)
    {
        $items = (new Computation())->get_computed_payroll_items($dtr);

        $wanted = [get_constant('PAYROLL_ITEMS.overtime'), get_constant('PAYROLL_ITEMS.overtime_night_diff')];
        $out = [];
        foreach ($items as $item) {
            if (in_array($item->item, $wanted, true)) {
                $out[$item->item . '|' . ($item->tag === null ? 'regular' : $item->tag)] = (int) $item->value;
            }
        }
        ksort($out);
        return $out;
    }

    // ---------------------------------------------------------------------------------------
    // ARM 1 — overtime that starts and finishes inside the DTR's own date, clear of night diff
    // ---------------------------------------------------------------------------------------
    // Schedule and logs 08:00-17:00, 2h post-overtime.
    //   actual_time_end   = 17:00 (time_out is not past the schedule end)
    //   overtime window   = 17:00 -> 19:00, both on the DTR date -> "same date" arm
    //   night diff window = 22:00 -> 06:00 next day, so 17:00-19:00 sits wholly outside it
    //   overtime          = (19:00 - 17:00) - 0 = 7200s, night diff = 0 (never pushed)
    /** @test */
    public function post_overtime_finishing_before_ten_pm_is_paid_in_full_with_no_night_differential()
    {
        $dtr = $this->scheduledDay(0, [
            'start' => '08:00:00', 'end' => '17:00:00',
            'in'    => '08:00:00', 'out' => '17:00:00',
            'break' => 3600,
        ]);
        $this->overtimeRequest(get_constant('OVERTIME_TYPE.post'), 7200);

        $items = $this->overtimeItems($dtr);

        $this->assertEquals(['overtime|regular' => 7200], $items);
    }

    // ---------------------------------------------------------------------------------------
    // ARM 2 — pre-overtime that reaches back across midnight (the UNDERLAPPED arm)
    // ---------------------------------------------------------------------------------------
    // Same 08:00-17:00 day, 10h pre-overtime.
    //   actual_time_start = 08:00, so the overtime window is (day-1) 22:00 -> (day) 08:00
    //   date_to_compare   = midnight at the START of the DTR date
    //   the window starts before that midnight AND the request is pre -> underlapped arm
    //   night diff window = (day-1) 22:00 -> (day) 06:00
    //
    //   day 0 (yesterday) slice, 22:00 -> 00:00:
    //     night diff underlapped = 00:00 - 22:00                    = 7200
    //     overtime  underlapped  = (00:00 - 22:00) - 7200           = 0     -> not pushed
    //   day 1 slice, 00:00 -> 08:00:
    //     night diff (regular)   = 06:00 - 00:00                    = 21600
    //     overtime  (regular)    = (08:00 - 00:00) - 21600          = 7200
    //
    // The zero is the point of the arm: the whole pre-midnight stretch is night differential, so
    // nothing of it may also be paid as plain overtime.
    /** @test */
    public function pre_overtime_reaching_back_over_midnight_splits_into_underlapped_night_differential()
    {
        $dtr = $this->scheduledDay(0, [
            'start' => '08:00:00', 'end' => '17:00:00',
            'in'    => '08:00:00', 'out' => '17:00:00',
            'break' => 3600,
        ]);
        $this->overtimeRequest(get_constant('OVERTIME_TYPE.pre'), 36000);

        $items = $this->overtimeItems($dtr);

        $this->assertEquals([
            'overtime_night_diff|regular'     => 21600,
            'overtime_night_diff|underlapped' => 7200,
            'overtime|regular'                => 7200,
        ], $items);
        $this->assertArrayNotHasKey('overtime|underlapped', $items);
    }

    // ---------------------------------------------------------------------------------------
    // ARM 3 — post-overtime that runs past midnight (the OVERLAPPED arm)
    // ---------------------------------------------------------------------------------------
    // Same 08:00-17:00 day, 10h post-overtime.
    //   overtime window = 17:00 -> 03:00 next day, date_to_compare = midnight of the NEXT day
    //   window starts before that midnight and the request is post -> overlapped arm
    //   night diff window = 22:00 -> 06:00 next day
    //
    //   day 1 slice, 17:00 -> 00:00:
    //     night diff (regular)  = 00:00 - 22:00               = 7200
    //     overtime  (regular)   = (00:00 - 17:00) - 7200      = 18000
    //   day 2 slice, 00:00 -> 03:00:
    //     night diff overlapped = 03:00 - 00:00               = 10800
    //     overtime  overlapped  = (03:00 - 00:00) - 10800     = 0     -> not pushed
    /** @test */
    public function post_overtime_running_past_midnight_splits_into_overlapped_night_differential()
    {
        $dtr = $this->scheduledDay(0, [
            'start' => '08:00:00', 'end' => '17:00:00',
            'in'    => '08:00:00', 'out' => '17:00:00',
            'break' => 3600,
        ]);
        $this->overtimeRequest(get_constant('OVERTIME_TYPE.post'), 36000);

        $items = $this->overtimeItems($dtr);

        $this->assertEquals([
            'overtime_night_diff|overlapped' => 10800,
            'overtime_night_diff|regular'    => 7200,
            'overtime|regular'               => 18000,
        ], $items);
        $this->assertArrayNotHasKey('overtime|overlapped', $items);
    }

    // ---------------------------------------------------------------------------------------
    // ARM 4 — night shift: the overtime starts AFTER midnight, so nothing lands on the DTR's day
    // ---------------------------------------------------------------------------------------
    // Schedule and logs 22:00 -> 06:00 the next morning, 2h post-overtime.
    //   actual_time_end = 06:00 on day 2, which is already past date_to_compare (midnight of day 2)
    //   -> the final else: everything is overlapped, nothing regular
    //   night diff window = 22:00 -> 06:00 next day, and the overtime runs 06:00 -> 08:00, i.e.
    //   it begins exactly at the closing edge -> night diff overlapped = 0
    //   overtime overlapped = (08:00 - 06:00) - 0 = 7200
    /** @test */
    public function post_overtime_on_a_night_shift_lands_entirely_on_the_following_day()
    {
        $dtr = $this->scheduledDay(0, [
            'start' => '22:00:00', 'end' => [1, '06:00:00'],
            'in'    => '22:00:00', 'out' => [1, '06:00:00'],
            'break' => 3600,
        ]);
        $this->overtimeRequest(get_constant('OVERTIME_TYPE.post'), 7200);

        $items = $this->overtimeItems($dtr);

        $this->assertEquals(['overtime|overlapped' => 7200], $items);
    }

    // ---------------------------------------------------------------------------------------
    // ARM 5 — the guard: an overtime request that is not approved earns nothing
    // ---------------------------------------------------------------------------------------
    /** @test */
    public function a_pending_overtime_request_produces_no_overtime_at_all()
    {
        $dtr = $this->scheduledDay(0, [
            'start' => '08:00:00', 'end' => '17:00:00',
            'in'    => '08:00:00', 'out' => '17:00:00',
            'break' => 3600,
        ]);
        $this->overtimeRequest(get_constant('OVERTIME_TYPE.post'), 7200, get_constant('REQUEST_STATUS.pending'));

        $this->assertSame([], $this->overtimeItems($dtr));
    }

    /** @test */
    public function a_declined_overtime_request_produces_no_overtime_at_all()
    {
        $dtr = $this->scheduledDay(0, [
            'start' => '08:00:00', 'end' => '17:00:00',
            'in'    => '08:00:00', 'out' => '17:00:00',
            'break' => 3600,
        ]);
        $this->overtimeRequest(get_constant('OVERTIME_TYPE.post'), 7200, get_constant('REQUEST_STATUS.declined'));

        $this->assertSame([], $this->overtimeItems($dtr));
    }

    /** @test */
    public function a_day_with_no_overtime_request_produces_no_overtime_at_all()
    {
        $dtr = $this->scheduledDay(0, [
            'start' => '08:00:00', 'end' => '17:00:00',
            'in'    => '08:00:00', 'out' => '17:00:00',
            'break' => 3600,
        ]);

        $this->assertSame([], $this->overtimeItems($dtr));
    }

    // ---------------------------------------------------------------------------------------
    // ARM 6 — the request is read from the DTR's own date, not the employee's other days
    // ---------------------------------------------------------------------------------------
    // Dtr::overtime() joins on user_id and filters on the DTR's date. An approved request filed for
    // a different day must not leak into this day's pay.
    /** @test */
    public function an_approved_overtime_filed_for_another_date_does_not_pay_on_this_date()
    {
        $dtr = $this->scheduledDay(0, [
            'start' => '08:00:00', 'end' => '17:00:00',
            'in'    => '08:00:00', 'out' => '17:00:00',
            'break' => 3600,
        ]);
        Overtime::create([
            'user_id'    => $this->requireFixtureUser()->id,
            'date'       => $this->fixtureDate(3),          // three days later, same employee
            'amount'     => 7200,
            'type'       => get_constant('OVERTIME_TYPE.post'),
            'status'     => get_constant('REQUEST_STATUS.approved'),
            'created_by' => $this->requireFixtureUser()->id,
            'updated_by' => $this->requireFixtureUser()->id,
        ]);

        $this->assertSame([], $this->overtimeItems($dtr));
    }
}
