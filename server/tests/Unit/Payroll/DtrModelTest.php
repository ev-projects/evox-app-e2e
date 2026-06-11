<?php

namespace Tests\Unit\Payroll;

use Tests\TestCase;
use App\Modules\Payroll\Models\Dtr;

/**
 * Tests for pure Dtr model helper methods that do not hit the database.
 * All timestamps are derived from a fixed anchor date (2026-01-05) so that
 * arithmetic assertions are deterministic regardless of server timezone.
 */
class DtrModelTest extends TestCase
{
    private $date = '2026-01-05';
    private $midnight;
    private $start;       // 09:00
    private $end;         // 18:00
    private $startFlexy;  // 11:00
    private $endFlexy;    // 20:00
    private $userId = 1698;

    protected function setUp(): void
    {
        parent::setUp();
        $this->midnight   = strtotime($this->date);
        $this->start      = $this->midnight + 9 * 3600;
        $this->end        = $this->midnight + 18 * 3600;
        $this->startFlexy = $this->midnight + 11 * 3600;
        $this->endFlexy   = $this->midnight + 20 * 3600;
    }

    private function make(array $attrs = []): Dtr
    {
        return new Dtr(array_merge([
            'user_id'               => $this->userId,
            'date'                  => $this->date,
            'start_datetime'        => $this->start,
            'end_datetime'          => $this->end,
            'start_flexy_datetime'  => null,
            'end_flexy_datetime'    => null,
            'break_time'            => 3600,
            'time_in'               => null,
            'time_out'              => null,
            'is_rest_day'           => 0,
            'source_type_tagging'   => 'default',
        ], $attrs));
    }

    // --- hasSchedule ---

    public function test_hasSchedule_true_when_both_datetimes_set()
    {
        $this->assertTrue($this->make()->hasSchedule());
    }

    public function test_hasSchedule_false_when_start_missing()
    {
        $this->assertFalse($this->make(['start_datetime' => null])->hasSchedule());
    }

    public function test_hasSchedule_false_when_end_missing()
    {
        $this->assertFalse($this->make(['end_datetime' => null])->hasSchedule());
    }

    // --- hasFlexibleSchedule ---

    public function test_hasFlexibleSchedule_true_when_flexy_datetimes_set()
    {
        $dtr = $this->make(['start_flexy_datetime' => $this->startFlexy, 'end_flexy_datetime' => $this->endFlexy]);
        $this->assertTrue($dtr->hasFlexibleSchedule());
    }

    public function test_hasFlexibleSchedule_false_when_flexy_null()
    {
        $this->assertFalse($this->make()->hasFlexibleSchedule());
    }

    // --- hasCompleteTimelogs ---

    public function test_hasCompleteTimelogs_true_when_both_logs_present()
    {
        $dtr = $this->make(['time_in' => $this->start, 'time_out' => $this->end]);
        $this->assertTrue($dtr->hasCompleteTimelogs());
    }

    public function test_hasCompleteTimelogs_false_when_only_time_in()
    {
        $dtr = $this->make(['time_in' => $this->start]);
        $this->assertFalse($dtr->hasCompleteTimelogs());
    }

    public function test_hasCompleteTimelogs_false_when_no_logs()
    {
        $this->assertFalse($this->make()->hasCompleteTimelogs());
    }

    // --- validLog / validLogIn / hasLog ---

    public function test_validLog_true_when_both_logs_set()
    {
        $dtr = $this->make(['time_in' => $this->start, 'time_out' => $this->end]);
        $this->assertTrue($dtr->validLog());
    }

    public function test_validLog_false_when_no_logs()
    {
        $this->assertFalse($this->make()->validLog());
    }

    public function test_validLogIn_true_when_time_in_set()
    {
        $this->assertTrue($this->make(['time_in' => $this->start])->validLogIn());
    }

    public function test_validLogIn_false_when_time_in_null()
    {
        $this->assertFalse($this->make()->validLogIn());
    }

    public function test_hasLog_true_when_only_time_in_set()
    {
        $this->assertTrue($this->make(['time_in' => $this->start])->hasLog());
    }

    public function test_hasLog_false_when_no_logs()
    {
        $this->assertFalse($this->make()->hasLog());
    }

    // --- hasValidBreakTime ---

    public function test_hasValidBreakTime_true_for_positive_break()
    {
        $this->assertTrue($this->make(['break_time' => 3600])->hasValidBreakTime());
    }

    public function test_hasValidBreakTime_false_when_zero()
    {
        $this->assertFalse($this->make(['break_time' => 0])->hasValidBreakTime());
    }

    public function test_hasValidBreakTime_false_when_null()
    {
        $this->assertFalse($this->make(['break_time' => null])->hasValidBreakTime());
    }

    // --- isRestDay ---

    public function test_isRestDay_true()
    {
        $this->assertTrue($this->make(['is_rest_day' => 1])->isRestDay());
    }

    public function test_isRestDay_false()
    {
        $this->assertFalse($this->make(['is_rest_day' => 0])->isRestDay());
    }

    // --- Source type tagging ---

    public function test_isDefault_true()
    {
        $this->assertTrue($this->make(['source_type_tagging' => 'default'])->isDefault());
    }

    public function test_isDefault_false_for_temporary()
    {
        $this->assertFalse($this->make(['source_type_tagging' => 'temporary'])->isDefault());
    }

    public function test_isTemporary_true()
    {
        $this->assertTrue($this->make(['source_type_tagging' => 'temporary'])->isTemporary());
    }

    public function test_isRestDayWork_true()
    {
        $this->assertTrue($this->make(['source_type_tagging' => 'rest_day_work'])->isRestDayWork());
    }

    public function test_isChangeSchedule_true()
    {
        $this->assertTrue($this->make(['source_type_tagging' => 'change_schedule'])->isChangeSchedule());
    }

    // --- getTotalRenderedTime ---

    public function test_getTotalRenderedTime_returns_time_out_minus_time_in()
    {
        // 9 hours = 32400 seconds
        $dtr = $this->make(['time_in' => $this->start, 'time_out' => $this->end]);
        $this->assertEquals(32400, $dtr->getTotalRenderedTime());
    }

    public function test_getTotalRenderedTime_returns_zero_when_no_logs()
    {
        $this->assertEquals(0, $this->make()->getTotalRenderedTime());
    }

    // --- getRequiredTime ---

    public function test_getRequiredTime_returns_schedule_duration()
    {
        // 9AM to 6PM = 32400 seconds
        $this->assertEquals(32400, $this->make()->getRequiredTime());
    }

    public function test_getRequiredTime_returns_zero_without_schedule()
    {
        $dtr = $this->make(['start_datetime' => null, 'end_datetime' => null]);
        $this->assertEquals(0, $dtr->getRequiredTime());
    }

    // --- getRequiredHalfDayTime ---

    public function test_getRequiredHalfDayTime_equals_required_time_halved_minus_half_break()
    {
        // requiredTime = 32400, breakTime = 3600
        // halfDayTime = (32400/2) - (3600/2) = 16200 - 1800 = 14400
        $this->assertEquals(14400, $this->make()->getRequiredHalfDayTime());
    }

    // --- getExpectedTimeIn ---

    public function test_getExpectedTimeIn_returns_start_datetime_for_standard_schedule()
    {
        $this->assertEquals($this->start, $this->make()->getExpectedTimeIn());
    }

    public function test_getExpectedTimeIn_returns_flexy_start_for_flexible_schedule()
    {
        $dtr = $this->make(['start_flexy_datetime' => $this->startFlexy, 'end_flexy_datetime' => $this->endFlexy]);
        $this->assertEquals($this->startFlexy, $dtr->getExpectedTimeIn());
    }

    public function test_getExpectedTimeIn_returns_zero_when_no_schedule()
    {
        $dtr = $this->make(['start_datetime' => null, 'end_datetime' => null]);
        $this->assertEquals(0, $dtr->getExpectedTimeIn());
    }

    // --- isTimedInBeforeSchedule ---

    public function test_isTimedInBeforeSchedule_true_when_time_in_exactly_at_start()
    {
        $this->assertTrue($this->make(['time_in' => $this->start])->isTimedInBeforeSchedule());
    }

    public function test_isTimedInBeforeSchedule_true_when_early()
    {
        $this->assertTrue($this->make(['time_in' => $this->start - 1800])->isTimedInBeforeSchedule());
    }

    public function test_isTimedInBeforeSchedule_false_when_late()
    {
        $this->assertFalse($this->make(['time_in' => $this->start + 1800])->isTimedInBeforeSchedule());
    }

    // --- isTimedInAfterSchedule (requires flexible schedule) ---

    public function test_isTimedInAfterSchedule_true_when_at_flexy_start()
    {
        $dtr = $this->make([
            'time_in'              => $this->startFlexy,
            'start_flexy_datetime' => $this->startFlexy,
            'end_flexy_datetime'   => $this->endFlexy,
        ]);
        $this->assertTrue($dtr->isTimedInAfterSchedule());
    }

    public function test_isTimedInAfterSchedule_true_when_after_flexy_start()
    {
        $dtr = $this->make([
            'time_in'              => $this->startFlexy + 3600,
            'start_flexy_datetime' => $this->startFlexy,
            'end_flexy_datetime'   => $this->endFlexy,
        ]);
        $this->assertTrue($dtr->isTimedInAfterSchedule());
    }

    // --- isTimedInBetweenSchedule ---

    public function test_isTimedInBetweenSchedule_true_when_within_flex_window()
    {
        // time_in at 10AM, between 9AM (start) and 11AM (flexy start)
        $dtr = $this->make([
            'time_in'              => $this->midnight + 10 * 3600,
            'start_flexy_datetime' => $this->startFlexy,
            'end_flexy_datetime'   => $this->endFlexy,
        ]);
        $this->assertTrue($dtr->isTimedInBetweenSchedule());
    }

    public function test_isTimedInBetweenSchedule_false_when_before_start()
    {
        $dtr = $this->make([
            'time_in'              => $this->start - 1800,
            'start_flexy_datetime' => $this->startFlexy,
            'end_flexy_datetime'   => $this->endFlexy,
        ]);
        $this->assertFalse($dtr->isTimedInBetweenSchedule());
    }

    // --- hasOverlappedTimeLogs ---

    public function test_hasOverlappedTimeLogs_true_when_time_out_is_next_day()
    {
        $timeIn  = $this->midnight + 22 * 3600;
        $timeOut = $this->midnight + 26 * 3600; // 2AM next day
        $dtr = $this->make(['time_in' => $timeIn, 'time_out' => $timeOut]);
        $this->assertTrue($dtr->hasOverlappedTimeLogs());
    }

    public function test_hasOverlappedTimeLogs_false_when_same_day()
    {
        $dtr = $this->make(['time_in' => $this->start, 'time_out' => $this->end]);
        $this->assertFalse($dtr->hasOverlappedTimeLogs());
    }

    // --- hasUnderlappedTimeLogs ---

    public function test_hasUnderlappedTimeLogs_true_when_time_in_is_previous_day()
    {
        $prevMidnight = $this->midnight - 86400;
        $timeIn  = $prevMidnight + 22 * 3600;
        $timeOut = $this->midnight + 7 * 3600;
        $dtr = $this->make(['time_in' => $timeIn, 'time_out' => $timeOut]);
        $this->assertTrue($dtr->hasUnderlappedTimeLogs());
    }

    public function test_hasUnderlappedTimeLogs_false_when_same_day()
    {
        $dtr = $this->make(['time_in' => $this->start, 'time_out' => $this->end]);
        $this->assertFalse($dtr->hasUnderlappedTimeLogs());
    }
}
