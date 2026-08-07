<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use App\Modules\Payroll\Models\Dtr;

/**
 * Dtr model predicate/getter layer (52.9%, 123 unc lines). These members are pure attribute
 * logic — every test here builds an UNSAVED Dtr in memory, so the suite touches no database at
 * all (no DatabaseTransactions needed) and runs in milliseconds on any box.
 *
 * Arms: timelog completeness/validity family, schedule + flexible-schedule detection, break-time
 * validity, incomplete-log arm, source-type tagging family (default/temporary/rest-day-work/
 * change-schedule), rest-day flag, expected-time-in flexible-vs-standard precedence, rendered/
 * required/half-day time math, schedule string builders.
 */
class DtrModelPredicatesTest extends TestCase
{
    /** In-memory Dtr with only the attributes each arm needs. */
    private function dtr(array $attrs = [])
    {
        $d = new Dtr();
        foreach ($attrs as $k => $v) {
            $d->$k = $v;
        }
        return $d;
    }

    // ------------------------------------------------------------------ timelog family
    /** @test */
    public function timelog_predicates_cover_complete_partial_and_empty_states()
    {
        $complete = $this->dtr(['time_in' => 1000, 'time_out' => 2000]);
        $this->assertTrue($complete->hasCompleteTimelogs());
        $this->assertTrue($complete->hasValidTimelogs());
        $this->assertTrue($complete->validLog());
        $this->assertTrue($complete->hasLog());
        $this->assertTrue($complete->validLogIn());
        $this->assertFalse($complete->isIncompleteLog());

        $inOnly = $this->dtr(['time_in' => 1000, 'time_out' => null]);
        $this->assertFalse($inOnly->hasCompleteTimelogs());
        $this->assertFalse($inOnly->validLog());
        $this->assertTrue($inOnly->hasLog());                       // OR arm
        $this->assertTrue($inOnly->validLogIn());
        $this->assertFalse($inOnly->isIncompleteLog());

        $outOnly = $this->dtr(['time_in' => null, 'time_out' => 2000]);
        $this->assertTrue($outOnly->hasLog());
        $this->assertFalse($outOnly->validLogIn());
        $this->assertTrue($outOnly->isIncompleteLog());              // out-without-in arm

        $empty = $this->dtr(['time_in' => null, 'time_out' => null]);
        $this->assertFalse($empty->hasCompleteTimelogs());
        $this->assertFalse($empty->hasLog());
        $this->assertFalse($empty->isIncompleteLog());
    }

    // ----------------------------------------------------------------- schedule family
    /** @test */
    public function schedule_and_flexible_schedule_detection()
    {
        $standard = $this->dtr(['start_datetime' => 28800, 'end_datetime' => 61200]);
        $this->assertTrue($standard->hasSchedule());
        $this->assertFalse($standard->hasFlexibleSchedule());

        $flexible = $this->dtr([
            'start_datetime' => 28800, 'end_datetime' => 61200,
            'start_flexy_datetime' => 25200, 'end_flexy_datetime' => 32400,
        ]);
        $this->assertTrue($flexible->hasFlexibleSchedule());

        $none = $this->dtr(['start_datetime' => null, 'end_datetime' => null]);
        $this->assertFalse($none->hasSchedule());
        $this->assertFalse($none->hasFlexibleSchedule());
    }

    /** @test */
    public function schedule_string_builders_include_flexy_only_when_present()
    {
        $standard = $this->dtr(['start_datetime' => 28800, 'end_datetime' => 61200]);
        $this->assertCount(1, $standard->getSchedule());             // schedule-only arm
        $this->assertCount(1, $standard->getStartSchedule());

        $flexible = $this->dtr([
            'start_datetime' => 28800, 'end_datetime' => 61200,
            'start_flexy_datetime' => 25200, 'end_flexy_datetime' => 32400,
        ]);
        $this->assertCount(2, $flexible->getSchedule());             // flexy arm appends
        $this->assertCount(1, $flexible->getStartSchedule());

        $none = $this->dtr();
        $this->assertSame([], $none->getSchedule());                 // no-schedule arm
        $this->assertSame([], $none->getStartSchedule());
    }

    // -------------------------------------------------------------------- break time
    /** @test */
    public function break_time_validity_covers_positive_zero_and_null()
    {
        $this->assertTrue($this->dtr(['break_time' => 3600])->hasValidBreakTime());
        $this->assertFalse($this->dtr(['break_time' => 0])->hasValidBreakTime());
        $this->assertFalse($this->dtr(['break_time' => null])->hasValidBreakTime());
    }

    // --------------------------------------------------------------- tagging + rest day
    /** @test */
    public function source_type_tagging_family_is_mutually_exclusive()
    {
        $this->assertTrue($this->dtr(['source_type_tagging' => 'default'])->isDefault());
        $this->assertTrue($this->dtr(['source_type_tagging' => 'temporary'])->isTemporary());
        $this->assertTrue($this->dtr(['source_type_tagging' => 'rest_day_work'])->isRestDayWork());
        $this->assertTrue($this->dtr(['source_type_tagging' => 'change_schedule'])->isChangeSchedule());

        $other = $this->dtr(['source_type_tagging' => 'default']);
        $this->assertFalse($other->isTemporary());
        $this->assertFalse($other->isRestDayWork());
        $this->assertFalse($other->isChangeSchedule());
    }

    /** @test */
    public function rest_day_flag_arms()
    {
        $this->assertTrue($this->dtr(['is_rest_day' => 1])->isRestDay());
        $this->assertFalse($this->dtr(['is_rest_day' => 0])->isRestDay());
        $this->assertFalse($this->dtr(['is_rest_day' => null])->isRestDay());
    }

    // ------------------------------------------------------------------- time getters
    /** @test */
    public function expected_time_in_prefers_flexy_then_standard_then_zero()
    {
        $flexible = $this->dtr(['start_flexy_datetime' => 25200, 'start_datetime' => 28800]);
        $this->assertSame(25200, $flexible->getExpectedTimeIn());     // flexy precedence arm

        $standard = $this->dtr(['start_datetime' => 28800]);
        $this->assertSame(28800, $standard->getExpectedTimeIn());     // standard arm

        $this->assertSame(0, $this->dtr()->getExpectedTimeIn());      // neither arm
    }

    /** @test */
    public function rendered_required_and_half_day_time_math()
    {
        $dtr = $this->dtr([
            'time_in' => 1000, 'time_out' => 5000,
            'start_datetime' => 28800, 'end_datetime' => 61200, 'break_time' => 3600,
        ]);

        $this->assertSame(4000, $dtr->getTotalRenderedTime());
        $this->assertSame(32400, $dtr->getRequiredTime());
        $this->assertEqualsWithDelta((32400 / 2) - (3600 / 2), $dtr->getRequiredHalfDayTime(), 0.001);

        $noLogs = $this->dtr(['time_in' => null, 'time_out' => null]);
        $this->assertSame(0, $noLogs->getTotalRenderedTime());        // invalid-timelog arm
        $this->assertSame(0, $noLogs->getRequiredTime());             // no-schedule arm
    }
}
