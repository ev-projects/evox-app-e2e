<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use App\Modules\Payroll\Resources\TeamAttendanceSummaryResource;

/**
 * WAVE-2 COVERAGE (2026-07-27). Branch tests for TeamAttendanceSummaryResource::toArray()
 * (0% before this). Same fake-DTR technique as TeamAttendanceResourcesTest — methods only,
 * no DB/SP/external.
 *
 * // FINDING BUG-9 (REAL APP BUG, characterized below): line 78 uses ASSIGNMENT, not comparison:
 *      if($dtr->get_dtr_history()->latest()->first()->log_out_type = "Log_out")
 *    The condition is always truthy, so ANY dtr-history row forces status "Present" — even when
 *    the actual last action was a Log_in (employee currently absent mid-shift would still show
 *    Present). test_bug9_* asserts the CURRENT (buggy) behavior so the fix will surface here.
 */
class TasFakeRelation
{
    private $items;
    public function __construct(array $items = []) { $this->items = $items; }
    public function where(...$args) { return $this; }
    public function whereIn(...$args) { return $this; }
    public function whereNotNull(...$args) { return $this; }
    public function latest(...$args) { return $this; }
    public function get() { return collect($this->items); }
    public function first() { return collect($this->items)->first(); }
}

class TasFakeLeave
{
    public $type = 'Vacation Leave';
    public $amount = 1;
    public $approved = true;
    public function isApproved() { return $this->approved; }
}

class TasFakeUser
{
    public $id = 42;
    public $emp_num = 'EV-0042';
    public $job_title = 'Developer';
    public function getFullName($mode = null) { return 'Santos, Maria'; }
}

class TasFakeDtr
{
    public $date = '2026-07-01';
    public $source_type_tagging = null;

    public $restDay = false;
    public $holidayRows = [];
    public $leaveRows = [];
    public $schedule = false;
    public $validTimelogs = false;
    public $insideSchedWindow = true;
    public $historyRows = [];
    public $payrollRows = [];

    public function isRestDay() { return $this->restDay; }
    public function holidays() { return new TasFakeRelation($this->holidayRows); }
    public function leaves() { return new TasFakeRelation($this->leaveRows); }
    public function hasSchedule() { return $this->schedule; }
    public function hasValidTimelogs() { return $this->validTimelogs; }
    public function checkCurrentTime() { return $this->insideSchedWindow; }
    public function get_dtr_history() { return new TasFakeRelation($this->historyRows); }
    public function payroll_items() { return new TasFakeRelation($this->payrollRows); }
    public function user() { return new TasFakeRelation([new TasFakeUser()]); }
}

class TeamAttendanceSummaryResourceTest extends TestCase
{
    private function transform(TasFakeDtr $dtr)
    {
        $rows = (new TeamAttendanceSummaryResource([$dtr]))->toArray(request());
        $this->assertCount(1, $rows);
        return $rows[0];
    }

    public function test_holiday_status()
    {
        $dtr = new TasFakeDtr();
        $dtr->holidayRows = [(object) ['name' => 'New Year']];

        $row = $this->transform($dtr);

        $this->assertSame('Holiday', $row['status']);
        $this->assertSame(42, $row['user_id']);
        $this->assertSame('Santos, Maria', $row['name']);
        $this->assertNull($row['hours']);
    }

    public function test_approved_leave_with_amount_shows_leave_type()
    {
        $dtr = new TasFakeDtr();
        $dtr->leaveRows = [new TasFakeLeave()];

        $this->assertSame('Vacation Leave', $this->transform($dtr)['status']);
    }

    public function test_unapproved_leave_is_ignored()
    {
        $leave = new TasFakeLeave();
        $leave->approved = false;
        $dtr = new TasFakeDtr();
        $dtr->leaveRows = [$leave];

        // falls through to the no-flags path -> No Schedule
        $this->assertSame('No Schedule', $this->transform($dtr)['status']);
    }

    public function test_rest_day_work_tagging_accumulates_rendered_hours()
    {
        $dtr = new TasFakeDtr();
        $dtr->restDay = true;
        $dtr->source_type_tagging = get_constant('DTR_SOURCE_TYPE_TAGGING.rest_day_work');
        $dtr->payrollRows = [
            (object) ['item' => get_constant('PAYROLL_ITEMS.rendered_hours'), 'value' => 7200],
        ];

        $row = $this->transform($dtr);

        $this->assertSame('Rest Day Work', $row['status']);
        $this->assertSame(seconds_to_time(7200, true), $row['hours']);
    }

    public function test_scheduled_present_with_valid_timelogs()
    {
        $dtr = new TasFakeDtr();
        $dtr->schedule = true;
        $dtr->validTimelogs = true;

        $this->assertSame('Present', $this->transform($dtr)['status']);
    }

    public function test_scheduled_absent_inside_schedule_window_no_history()
    {
        $dtr = new TasFakeDtr();
        $dtr->schedule = true;
        $dtr->insideSchedWindow = true;

        $this->assertSame('Absent', $this->transform($dtr)['status']);
    }

    public function test_scheduled_not_yet_started_before_window_no_history()
    {
        $dtr = new TasFakeDtr();
        $dtr->schedule = true;
        $dtr->insideSchedWindow = false;

        $this->assertSame('Not yet started', $this->transform($dtr)['status']);
    }

    public function test_bug9_any_history_row_forces_present_even_when_last_action_was_log_in()
    {
        $dtr = new TasFakeDtr();
        $dtr->schedule = true;
        $dtr->insideSchedWindow = true;
        // Last history action is a LOG IN (not out) — a correct == check would keep "Absent".
        $dtr->historyRows = [(object) ['log_out_type' => 'Log_in']];

        // BUG-9: `=` assignment is always truthy -> status becomes Present regardless.
        $this->assertSame('Present', $this->transform($dtr)['status']);
    }

    public function test_no_schedule_on_rest_day_shows_rest_day()
    {
        $dtr = new TasFakeDtr();
        $dtr->restDay = true; // no RDW tagging

        $this->assertSame('Rest Day', $this->transform($dtr)['status']);
    }

    public function test_overtime_payroll_item_overrides_status_and_sums_hours()
    {
        $dtr = new TasFakeDtr();
        $dtr->schedule = true;
        $dtr->validTimelogs = true;
        $dtr->payrollRows = [
            (object) ['item' => get_constant('PAYROLL_ITEMS.overtime'), 'value' => 3600],
            (object) ['item' => get_constant('PAYROLL_ITEMS.overtime_night_diff'), 'value' => 1800],
        ];

        $row = $this->transform($dtr);

        $this->assertSame('Overtime', $row['status']);
        $this->assertSame(seconds_to_time(5400, true), $row['hours']);
    }

    public function test_empty_collection_returns_empty_array()
    {
        $this->assertSame([], (new TeamAttendanceSummaryResource([]))->toArray(request()));
    }
}
