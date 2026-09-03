<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Payroll/Models/DtrSummary.php  ::get_summary
 *                                              ::compute_payroll_items_to_summary, ::check_if_holiday
 *   (instantiated at ReportRepository.php:39, called at ReportRepository.php:132)
 *
 * MENU PATH
 *   Reports -> DTR Summary        (the per-employee totals table and its CSV export)
 *   Payroll -> Daily Time Record  (the same totals shown above an employee's own record)
 *
 * COVERAGE BEFORE THIS FILE
 *   DtrSummary::get_summary  85.71% of lines. Uncovered: the overlapped/underlapped routing (which
 *   decides WHICH day a night shift's spill-over hours are paid on) and the rest-day tagging rule.
 *
 * WHAT THESE RULES MEAN
 *   get_summary turns a range of days into one row of totals per pay category. Three rules do the
 *   real work and all three are asserted here:
 *     1. rendered hours are reported NET of night differential — the night hours are paid under
 *        their own heading, so counting them twice would overpay;
 *     2. late and undertime are only charged on ordinary days, never on a holiday;
 *     3. hours that spill past midnight are paid against the day they spilled INTO (or out of),
 *        not the day they were logged — except that a rest day keeps its own hours.
 *
 * FINDINGS
 *   none
 */

namespace Tests\Feature\BranchTests\Payroll\DTR;

use Tests\TestCase;
use Tests\Feature\BranchTests\Support\DtrFixtureTrait;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\DtrPayrollItems;
use App\Modules\Payroll\Models\DtrSummary;
use App\Modules\Payroll\Models\Holiday;
use App\Modules\Payroll\Models\Leave;

class DtrSummaryBranchTest extends TestCase
{
    use DatabaseTransactions, DtrFixtureTrait;

    /** A worked day: schedule 08:00-17:00 and logs to match, so validLog() and hasSchedule() hold. */
    private function workedDay($day = 0, array $attrs = [])
    {
        return $this->scheduledDay($day, [
            'start' => '08:00:00', 'end' => '17:00:00',
            'in'    => '08:00:00', 'out' => '17:00:00',
            'break' => 3600,
        ], $attrs);
    }

    private function addItem(Dtr $dtr, $item, $value, $tag = null)
    {
        return DtrPayrollItems::create([
            'dtr_id' => $dtr->id,
            'item'   => $item,
            'value'  => $value,
            'tag'    => $tag,
        ]);
    }

    private function summaryFor(array $dtrs)
    {
        return (new DtrSummary())->get_summary(
            Dtr::whereIn('id', array_map(function (Dtr $d) { return $d->id; }, $dtrs))
               ->orderBy('date', 'asc')
               ->get()
        );
    }

    private function attachHoliday(Dtr $dtr, $type)
    {
        $holiday = Holiday::create([
            'name'          => 'fixture holiday ' . $type,
            'date'          => $dtr->date,
            'type'          => $type,
            'is_predefined' => 0,
            'country_id'    => $this->requireFixtureUser()->country_id,
        ]);
        $dtr->holidays()->attach($holiday->id);
        return $holiday;
    }

    // =======================================================================================
    // RULE 1 — rendered hours are reported net of night differential
    // =======================================================================================
    // 8h rendered of which 1h fell in the night window, plus 30m late, 15m undertime, 2h overtime.
    //   rendered_hours = (28800 - 3600) / 3600 = 7 h   <- the deduction under test
    //   night_diff     =            3600 / 3600 = 1 h
    //   overtime       =            7200 / 3600 = 2 h
    //   late           =            1800 / 3600 = 0.5 h
    //   undertime      =             900 / 3600 = 0.25 h
    /** @test */
    public function rendered_hours_are_reported_after_the_night_differential_has_been_taken_out()
    {
        $dtr = $this->workedDay(0);
        $this->addItem($dtr, get_constant('PAYROLL_ITEMS.rendered_hours'), 28800);
        $this->addItem($dtr, get_constant('PAYROLL_ITEMS.night_diff'), 3600);
        $this->addItem($dtr, get_constant('PAYROLL_ITEMS.overtime'), 7200);
        $this->addItem($dtr, get_constant('PAYROLL_ITEMS.late'), 1800);
        $this->addItem($dtr, get_constant('PAYROLL_ITEMS.undertime'), 900);

        $summary = $this->summaryFor([$dtr]);
        $reg = $summary[get_constant('DTR_TYPE.regular')];

        $this->assertEquals(7, $reg[get_constant('PAYROLL_ITEMS.rendered_hours')]);
        $this->assertEquals(1, $reg[get_constant('PAYROLL_ITEMS.night_diff')]);
        $this->assertEquals(2, $reg[get_constant('PAYROLL_ITEMS.overtime')]);
        $this->assertEquals(0.5, $reg[get_constant('PAYROLL_ITEMS.late')]);
        $this->assertEquals(0.25, $reg[get_constant('PAYROLL_ITEMS.undertime')]);
    }

    // =======================================================================================
    // RULE 2 — late and undertime are not charged on a holiday
    // =======================================================================================
    /** @test */
    public function late_and_undertime_are_not_charged_on_a_legal_holiday()
    {
        $dtr = $this->workedDay(0);
        $this->attachHoliday($dtr, get_constant('DTR_TYPE.holiday.legal'));
        $this->addItem($dtr, get_constant('PAYROLL_ITEMS.rendered_hours'), 28800);
        $this->addItem($dtr, get_constant('PAYROLL_ITEMS.night_diff'), 3600);
        $this->addItem($dtr, get_constant('PAYROLL_ITEMS.overtime'), 7200);
        $this->addItem($dtr, get_constant('PAYROLL_ITEMS.late'), 1800);
        $this->addItem($dtr, get_constant('PAYROLL_ITEMS.undertime'), 900);

        $summary = $this->summaryFor([$dtr]);

        // the late/undertime charge is suppressed entirely...
        $this->assertEquals(0, $summary[get_constant('DTR_TYPE.regular')][get_constant('PAYROLL_ITEMS.late')]);
        $this->assertEquals(0, $summary[get_constant('DTR_TYPE.regular')][get_constant('PAYROLL_ITEMS.undertime')]);
        // ...and the hours are paid under the legal-holiday heading, not the regular one
        $lh = $summary[get_constant('DTR_TYPE.holiday.legal')];
        $this->assertEquals(7, $lh[get_constant('PAYROLL_ITEMS.rendered_hours')]);
        $this->assertEquals(2, $lh[get_constant('PAYROLL_ITEMS.overtime')]);
        $this->assertEquals(0, $summary[get_constant('DTR_TYPE.regular')][get_constant('PAYROLL_ITEMS.rendered_hours')]);
    }

    // =======================================================================================
    // RULE 3 — where spill-over hours are paid
    // =======================================================================================

    // Overlapped hours (logged after midnight) belong to the FOLLOWING day's category.
    /** @test */
    public function hours_that_spill_past_midnight_are_paid_against_the_following_day_category()
    {
        $today    = $this->workedDay(0);
        $tomorrow = $this->makeDtr(1, [
            'is_rest_day'         => 1,
            'source_type_tagging' => get_constant('REQUEST_TYPES.rest_day_work'),
        ]);
        $this->addItem($today, get_constant('PAYROLL_ITEMS.overtime'), 7200,
                       get_constant('PAYROLL_ITEM_TAGS.overlapped'));

        $summary = $this->summaryFor([$today, $tomorrow]);

        // tomorrow is a rest day, so the two spilled hours are rest-day overtime
        $this->assertEquals(2, $summary[get_constant('DTR_TYPE.rest_day')][get_constant('PAYROLL_ITEMS.overtime')]);
        $this->assertEquals(0, $summary[get_constant('DTR_TYPE.regular')][get_constant('PAYROLL_ITEMS.overtime')]);
    }

    // With no following day on record there is nowhere to route them, so they stay regular.
    /** @test */
    public function spilled_hours_stay_regular_when_the_following_day_has_no_record()
    {
        $today = $this->workedDay(0);
        $this->addItem($today, get_constant('PAYROLL_ITEMS.overtime'), 7200,
                       get_constant('PAYROLL_ITEM_TAGS.overlapped'));

        $summary = $this->summaryFor([$today]);

        $this->assertEquals(2, $summary[get_constant('DTR_TYPE.regular')][get_constant('PAYROLL_ITEMS.overtime')]);
    }

    // Underlapped hours (logged before midnight, belonging to a shift that started yesterday)
    // are paid against the PREVIOUS day's category.
    /** @test */
    public function hours_carried_over_from_the_previous_night_are_paid_against_that_previous_day()
    {
        $yesterday = $this->makeDtr(0, [
            'is_rest_day'         => 1,
            'source_type_tagging' => get_constant('REQUEST_TYPES.rest_day_work'),
        ]);
        $today = $this->workedDay(1);
        $this->addItem($today, get_constant('PAYROLL_ITEMS.overtime'), 10800,
                       get_constant('PAYROLL_ITEM_TAGS.underlapped'));

        $summary = $this->summaryFor([$yesterday, $today]);

        $this->assertEquals(3, $summary[get_constant('DTR_TYPE.rest_day')][get_constant('PAYROLL_ITEMS.overtime')]);
        $this->assertEquals(0, $summary[get_constant('DTR_TYPE.regular')][get_constant('PAYROLL_ITEMS.overtime')]);
    }

    /** @test */
    public function carried_over_hours_stay_regular_when_the_previous_day_has_no_record()
    {
        $today = $this->workedDay(1);
        $this->addItem($today, get_constant('PAYROLL_ITEMS.overtime'), 10800,
                       get_constant('PAYROLL_ITEM_TAGS.underlapped'));

        $summary = $this->summaryFor([$today]);

        $this->assertEquals(3, $summary[get_constant('DTR_TYPE.regular')][get_constant('PAYROLL_ITEMS.overtime')]);
    }

    // The rest-day exception: a rest day's spill-over is kept as rest-day pay even though the day
    // it spills into is an ordinary working day.
    /** @test */
    public function a_rest_days_spill_over_stays_rest_day_pay_even_though_the_next_day_is_ordinary()
    {
        $restDay = $this->workedDay(0, [
            'is_rest_day'         => 1,
            'source_type_tagging' => get_constant('REQUEST_TYPES.rest_day_work'),
        ]);
        $this->makeDtr(1);                                  // an ordinary next day
        $this->addItem($restDay, get_constant('PAYROLL_ITEMS.overtime'), 7200,
                       get_constant('PAYROLL_ITEM_TAGS.overlapped'));

        $summary = $this->summaryFor([$restDay]);

        $this->assertEquals(2, $summary[get_constant('DTR_TYPE.rest_day')][get_constant('PAYROLL_ITEMS.overtime')]);
        $this->assertEquals(0, $summary[get_constant('DTR_TYPE.regular')][get_constant('PAYROLL_ITEMS.overtime')]);
    }

    // ...but a holiday on the next day wins over the rest-day exception, because a holiday is
    // never overwritten by the rest-day rule.
    /** @test */
    public function a_holiday_on_the_next_day_takes_the_spill_over_ahead_of_the_rest_day_rule()
    {
        $restDay  = $this->workedDay(0, [
            'is_rest_day'         => 1,
            'source_type_tagging' => get_constant('REQUEST_TYPES.rest_day_work'),
        ]);
        $tomorrow = $this->makeDtr(1);
        $this->attachHoliday($tomorrow, get_constant('DTR_TYPE.holiday.legal'));
        $this->addItem($restDay, get_constant('PAYROLL_ITEMS.overtime'), 7200,
                       get_constant('PAYROLL_ITEM_TAGS.overlapped'));

        $summary = $this->summaryFor([$restDay]);

        $this->assertEquals(2, $summary[get_constant('DTR_TYPE.holiday.legal')][get_constant('PAYROLL_ITEMS.overtime')]);
        $this->assertEquals(0, $summary[get_constant('DTR_TYPE.rest_day')][get_constant('PAYROLL_ITEMS.overtime')]);
    }

    // =======================================================================================
    // Leave and absence — the two counts that are days, not hours
    // =======================================================================================

    // A paid leave is counted in days and must NOT be run through the seconds-to-hours conversion.
    /** @test */
    public function a_half_day_paid_leave_is_counted_as_half_a_day_not_converted_to_hours()
    {
        $dtr = $this->workedDay(0);
        $this->addItem($dtr, get_constant('PAYROLL_ITEMS.rendered_hours'), 28800);
        Leave::create([
            'dtr_id' => $dtr->id, 'type' => 'Vacation Leave', 'status' => 'approved',
            'amount' => 0.5, 'updated_by' => $this->requireFixtureUser()->id,
        ]);

        $summary = $this->summaryFor([$dtr]);
        $reg = $summary[get_constant('DTR_TYPE.regular')];

        $this->assertEquals(0.5, $reg[get_constant('PAYROLL_ITEMS.on_leave')]);
        // the leave short-circuits the day: the 8 rendered hours on it are deliberately not counted
        $this->assertEquals(0, $reg[get_constant('PAYROLL_ITEMS.rendered_hours')]);
        $this->assertEquals(0, $reg[get_constant('PAYROLL_ITEMS.unpaid_leave')]);
    }

    // A scheduled day with no logs at all, no leave and no holiday is one day absent.
    /** @test */
    public function a_scheduled_day_with_no_time_logs_counts_as_one_unpaid_day()
    {
        $dtr = $this->scheduledDay(0, ['start' => '08:00:00', 'end' => '17:00:00', 'break' => 3600]);

        $summary = $this->summaryFor([$dtr]);
        $reg = $summary[get_constant('DTR_TYPE.regular')];

        $this->assertEquals(1, $reg[get_constant('PAYROLL_ITEMS.unpaid_leave')]);
        $this->assertEquals(0, $reg[get_constant('PAYROLL_ITEMS.on_leave')]);
    }

    // Unpaid leave is not a paid leave, so it does not reach the vl/sl bucket — the day reads as
    // absent, which is what "UL" means on the report.
    /** @test */
    public function an_unpaid_leave_is_reported_as_an_unpaid_day_rather_than_a_paid_leave()
    {
        $dtr = $this->scheduledDay(0, ['start' => '08:00:00', 'end' => '17:00:00', 'break' => 3600]);
        Leave::create([
            'dtr_id' => $dtr->id, 'type' => 'Unpaid Leave', 'status' => 'approved',
            'amount' => 1, 'updated_by' => $this->requireFixtureUser()->id,
        ]);

        $summary = $this->summaryFor([$dtr]);
        $reg = $summary[get_constant('DTR_TYPE.regular')];

        $this->assertEquals(0, $reg[get_constant('PAYROLL_ITEMS.on_leave')]);
        $this->assertEquals(1, $reg[get_constant('PAYROLL_ITEMS.unpaid_leave')]);
    }

    // A leave that is still awaiting approval counts for nothing on either side.
    /** @test */
    public function a_leave_that_is_not_yet_approved_is_neither_paid_leave_nor_absence_relief()
    {
        $dtr = $this->scheduledDay(0, ['start' => '08:00:00', 'end' => '17:00:00', 'break' => 3600]);
        Leave::create([
            'dtr_id' => $dtr->id, 'type' => 'Vacation Leave', 'status' => 'requested',
            'amount' => 1, 'updated_by' => $this->requireFixtureUser()->id,
        ]);

        $summary = $this->summaryFor([$dtr]);
        $reg = $summary[get_constant('DTR_TYPE.regular')];

        $this->assertEquals(0, $reg[get_constant('PAYROLL_ITEMS.on_leave')]);
        $this->assertEquals(1, $reg[get_constant('PAYROLL_ITEMS.unpaid_leave')]);   // still absent
    }

    // =======================================================================================
    // Column list — the report's column headers follow the days actually present
    // =======================================================================================
    // 'reg' is always dropped from the column list (it is the fixed first column of the report);
    // a holiday day adds its own column.
    /** @test */
    public function the_regular_column_is_dropped_from_the_column_list_and_a_holiday_adds_its_own()
    {
        $dtr = $this->workedDay(0);
        $this->attachHoliday($dtr, get_constant('DTR_TYPE.holiday.legal'));
        $this->addItem($dtr, get_constant('PAYROLL_ITEMS.rendered_hours'), 28800);

        $model = new DtrSummary();
        $model->get_summary(Dtr::whereIn('id', [$dtr->id])->get());

        $this->assertArrayNotHasKey(get_constant('DTR_TYPE.regular'), $model->column);
        $this->assertArrayHasKey(get_constant('DTR_TYPE.holiday.legal'), $model->column);
    }

    // An empty range still returns the full zeroed skeleton rather than nothing, so the report
    // renders its columns for an employee with no days in the cutoff.
    /** @test */
    public function an_empty_date_range_returns_a_zeroed_summary_rather_than_an_empty_one()
    {
        $summary = (new DtrSummary())->get_summary(new \Illuminate\Database\Eloquent\Collection());

        $this->assertArrayHasKey(get_constant('DTR_TYPE.regular'), $summary);
        $this->assertArrayHasKey(get_constant('DTR_TYPE.rest_day'), $summary);
        foreach ($summary[get_constant('DTR_TYPE.regular')] as $value) {
            $this->assertEquals(0, $value);
        }
    }
}
