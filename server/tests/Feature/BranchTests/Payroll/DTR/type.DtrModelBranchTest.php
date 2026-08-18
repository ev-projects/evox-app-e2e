<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Payroll/Models/Dtr.php  ::getDtrType, ::leavesToAcronym, ::isUnplanned
 *
 * MENU PATH
 *   Payroll -> Daily Time Record   (the per-day type badge and the leave acronym on each row)
 *   Reports -> DTR Summary         (getDtrType decides which summary column a day's hours land in)
 *
 * COVERAGE BEFORE THIS FILE
 *   Dtr::getDtrType        51.28% of lines — every multi-holiday and policy-gated arm uncovered
 *   Dtr::leavesToAcronym    0.00% of lines
 *
 * WHAT THESE RULES MEAN
 *   getDtrType answers "what kind of day was this, for pay purposes". It is the single input that
 *   routes a day's hours into the regular, rest-day or holiday bucket, and it is deliberately
 *   asymmetric: the same rest day is 'rd' on screen but only counts as 'rd' for payroll when it
 *   was actually tagged as rest day work. Two holidays falling on one date compound (legal+legal
 *   becomes double legal, legal+special becomes special-legal), and a schedule policy can switch a
 *   holiday off entirely, in which case the day pays as an ordinary day.
 *
 * FINDINGS
 *   none
 */

namespace Tests\Feature\BranchTests\Payroll\DTR;

use Tests\TestCase;
use Tests\Feature\BranchTests\Support\DtrFixtureTrait;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\Holiday;
use App\Modules\Payroll\Models\Leave;

class DtrTypeBranchTest extends TestCase
{
    use DatabaseTransactions, DtrFixtureTrait;

    /** Attach a holiday of the given type to the DTR's date. */
    private function attachHoliday(Dtr $dtr, $type, $name = 'fixture holiday')
    {
        $holiday = Holiday::create([
            'name'          => $name,
            'date'          => $dtr->date,
            'type'          => $type,
            'is_predefined' => 0,
            'country_id'    => $this->requireFixtureUser()->country_id,
        ]);
        $dtr->holidays()->attach($holiday->id);
        return $holiday;
    }

    /** Attach an approved leave of the given type to the DTR. */
    private function attachLeave(Dtr $dtr, $type, $amount = 1)
    {
        return Leave::create([
            'dtr_id'     => $dtr->id,
            'type'       => $type,
            'status'     => 'approved',
            'amount'     => $amount,
            'updated_by' => $this->requireFixtureUser()->id,
        ]);
    }

    // =======================================================================================
    // getDtrType — no holiday: the day is either regular or a rest day
    // =======================================================================================

    /** @test */
    public function a_working_day_with_no_holiday_is_a_regular_day()
    {
        $dtr = $this->makeDtr(0, ['is_rest_day' => 0]);

        $this->assertSame(get_constant('DTR_TYPE.regular'), $dtr->getDtrType());
        $this->assertSame(get_constant('DTR_TYPE.regular'), $dtr->getDtrType(true));
    }

    /** @test */
    public function a_rest_day_is_shown_as_a_rest_day_on_screen()
    {
        $dtr = $this->makeDtr(0, [
            'is_rest_day'         => 1,
            'source_type_tagging' => get_constant('DTR_SOURCE_TYPE_TAGGING.default'),
        ]);

        $this->assertSame(get_constant('DTR_TYPE.rest_day'), $dtr->getDtrType());
    }

    // The asymmetry that matters for money: for payroll a rest day only counts as a rest day when
    // the employee was actually put on rest day work. A plain rest day pays as a regular day.
    /** @test */
    public function a_rest_day_that_was_never_tagged_as_rest_day_work_pays_as_a_regular_day()
    {
        $dtr = $this->makeDtr(0, [
            'is_rest_day'         => 1,
            'source_type_tagging' => get_constant('DTR_SOURCE_TYPE_TAGGING.default'),
        ]);

        $this->assertSame(get_constant('DTR_TYPE.regular'), $dtr->getDtrType(true));
    }

    /** @test */
    public function a_rest_day_tagged_as_rest_day_work_pays_as_a_rest_day()
    {
        $dtr = $this->makeDtr(0, [
            'is_rest_day'         => 1,
            'source_type_tagging' => get_constant('REQUEST_TYPES.rest_day_work'),
        ]);

        $this->assertSame(get_constant('DTR_TYPE.rest_day'), $dtr->getDtrType(true));
    }

    // =======================================================================================
    // getDtrType — a single holiday
    // =======================================================================================

    /** @test */
    public function a_day_carrying_one_legal_holiday_is_a_legal_holiday()
    {
        $dtr = $this->makeDtr(0);
        $this->attachHoliday($dtr, get_constant('DTR_TYPE.holiday.legal'));

        $this->assertSame(get_constant('DTR_TYPE.holiday.legal'), $dtr->getDtrType(true));
    }

    /** @test */
    public function a_day_carrying_one_special_holiday_is_a_special_holiday()
    {
        $dtr = $this->makeDtr(0);
        $this->attachHoliday($dtr, get_constant('DTR_TYPE.holiday.special'));

        $this->assertSame(get_constant('DTR_TYPE.holiday.special'), $dtr->getDtrType(true));
    }

    // A holiday row whose type is neither legal nor special satisfies neither branch of the policy
    // gate, so no holiday type is ever set and the day falls back to its rest-day/regular answer.
    /** @test */
    public function a_holiday_of_an_unrecognised_type_leaves_the_day_regular()
    {
        $dtr = $this->makeDtr(0, ['is_rest_day' => 0]);
        $this->attachHoliday($dtr, 'company_event');

        $this->assertSame(get_constant('DTR_TYPE.regular'), $dtr->getDtrType(true));
    }

    // =======================================================================================
    // getDtrType — two holidays on one date compound
    // =======================================================================================

    /** @test */
    public function two_legal_holidays_on_one_date_compound_into_a_double_legal_holiday()
    {
        $dtr = $this->makeDtr(0);
        $this->attachHoliday($dtr, get_constant('DTR_TYPE.holiday.legal'), 'legal one');
        $this->attachHoliday($dtr, get_constant('DTR_TYPE.holiday.legal'), 'legal two');

        $this->assertSame(get_constant('DTR_TYPE.holiday.double_legal'), $dtr->getDtrType(true));
    }

    /** @test */
    public function two_special_holidays_on_one_date_compound_into_a_double_special_holiday()
    {
        $dtr = $this->makeDtr(0);
        $this->attachHoliday($dtr, get_constant('DTR_TYPE.holiday.special'), 'special one');
        $this->attachHoliday($dtr, get_constant('DTR_TYPE.holiday.special'), 'special two');

        $this->assertSame(get_constant('DTR_TYPE.holiday.double_special'), $dtr->getDtrType(true));
    }

    /** @test */
    public function a_legal_and_a_special_holiday_on_one_date_compound_into_a_special_legal_holiday()
    {
        $dtr = $this->makeDtr(0);
        $this->attachHoliday($dtr, get_constant('DTR_TYPE.holiday.legal'), 'the legal one');
        $this->attachHoliday($dtr, get_constant('DTR_TYPE.holiday.special'), 'the special one');

        $this->assertSame(get_constant('DTR_TYPE.holiday.special_legal'), $dtr->getDtrType(true));
    }

    // =======================================================================================
    // getDtrType — a schedule policy can switch a holiday off for this employee
    // =======================================================================================

    /** @test */
    public function a_legal_holiday_is_ignored_when_the_day_policy_disallows_legal_holidays()
    {
        $dtr = $this->makeDtr(0, ['is_rest_day' => 0]);
        $this->attachHoliday($dtr, get_constant('DTR_TYPE.holiday.legal'));
        $this->addPolicy($dtr, 'allow_legal_holiday', '0');

        $this->assertSame(get_constant('DTR_TYPE.regular'), $dtr->getDtrType(true));
    }

    /** @test */
    public function a_legal_holiday_still_applies_when_the_day_policy_allows_legal_holidays()
    {
        $dtr = $this->makeDtr(0, ['is_rest_day' => 0]);
        $this->attachHoliday($dtr, get_constant('DTR_TYPE.holiday.legal'));
        $this->addPolicy($dtr, 'allow_legal_holiday', '1');

        $this->assertSame(get_constant('DTR_TYPE.holiday.legal'), $dtr->getDtrType(true));
    }

    /** @test */
    public function a_special_holiday_is_ignored_when_the_day_policy_disallows_special_holidays()
    {
        $dtr = $this->makeDtr(0, ['is_rest_day' => 1, 'source_type_tagging' => get_constant('REQUEST_TYPES.rest_day_work')]);
        $this->attachHoliday($dtr, get_constant('DTR_TYPE.holiday.special'));
        $this->addPolicy($dtr, 'allow_special_holiday', '0');

        // the holiday is switched off, so the day falls back to what it otherwise is: rest day work
        $this->assertSame(get_constant('DTR_TYPE.rest_day'), $dtr->getDtrType(true));
    }

    // =======================================================================================
    // leavesToAcronym
    // =======================================================================================

    // Long form: initials of every word, whatever the leave is called.
    /** @test */
    public function the_leave_acronym_is_built_from_the_initial_of_every_word()
    {
        $dtr = $this->makeDtr(0);
        $this->attachLeave($dtr, 'Vacation Leave');

        $this->assertSame('VL', $dtr->leavesToAcronym());
    }

    /** @test */
    public function the_leave_acronym_covers_leave_names_longer_than_two_words()
    {
        $dtr = $this->makeDtr(0);
        $this->attachLeave($dtr, 'MGC Unpaid Call Out Days');

        $this->assertSame('MUCOD', $dtr->leavesToAcronym());
    }

    // Simple form, sick leave: the one acronym that survives unchanged.
    /** @test */
    public function the_simple_form_keeps_sick_leave_as_sl()
    {
        $dtr = $this->makeDtr(0);
        $this->attachLeave($dtr, 'Sick Leave');

        $this->assertSame('SL', $dtr->leavesToAcronym(true));
    }

    // Simple form, any other unplanned leave: reported as unplanned rather than by name.
    /** @test */
    public function the_simple_form_reports_unpaid_leave_as_unplanned()
    {
        $dtr = $this->makeDtr(0);
        $this->attachLeave($dtr, 'Unpaid Leave');

        $this->assertSame('UL', $dtr->leavesToAcronym(true));
        $this->assertTrue($dtr->isUnplanned());
    }

    /** @test */
    public function the_simple_form_reports_bereavement_leave_as_unplanned_despite_its_initials()
    {
        $dtr = $this->makeDtr(0);
        $this->attachLeave($dtr, 'Bereavement leave');

        // initials would give "Bl"; the unplanned rule overrides it
        $this->assertSame('Bl', $dtr->leavesToAcronym());
        $this->assertSame('UL', $dtr->leavesToAcronym(true));
    }

    // Simple form, a planned leave: spelled out in full rather than abbreviated.
    /** @test */
    public function the_simple_form_spells_out_a_planned_leave_in_full()
    {
        $dtr = $this->makeDtr(0);
        $this->attachLeave($dtr, 'Vacation Leave');

        $this->assertFalse($dtr->isUnplanned());
        $this->assertSame('Vacation Leave', $dtr->leavesToAcronym(true));
    }
}
