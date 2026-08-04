<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use App\Modules\Payroll\Resources\TeamAttendanceResources;

/**
 * WAVE-2 COVERAGE (2026-07-27). Branch tests for TeamAttendanceResources::toArray()
 * (0% before this). The resource iterates DTR-like objects and only calls METHODS on them
 * (isRestDay/hasSchedule/relations/user), so it is fully testable with hand-rolled fakes —
 * no DB, no SP, nothing external.
 *
 * Branch map: RestDay{plain|RDW-approved}, Holiday, Leave-type passthrough,
 * schedule{Absent|On Time|Present+late/undertime values|Incomplete Logs},
 * RDW sub-arms {Absent|On Time}, on-leave-with-log 'On Time', No Schedule.
 */
class TaFakeRelation
{
    private $items;
    public function __construct(array $items = []) { $this->items = $items; }
    public function where(...$args) { return $this; }
    public function whereIn(...$args) { return $this; }
    public function whereNotNull(...$args) { return $this; }
    public function get() { return collect($this->items); }
    public function first() { return collect($this->items)->first(); }
}

class TaFakeUser
{
    public $job_title = 'QA Engineer';
    public function getFullName($mode = null) { return 'Dela Cruz, Juan'; }
}

class TaFakeDtr
{
    public $date = '2026-07-01';
    public $start_datetime = 1000000000;
    public $end_datetime = 1000030000;
    public $start_flexy_datetime = 1000003600;
    public $end_flexy_datetime = 1000033600;

    public $restDay = false;
    public $rdwRows = [];
    public $holidayRows = [];
    public $leaveRows = [];
    public $schedule = false;
    public $flexible = false;
    public $log = false;
    public $onTime = false;
    public $validLogFlag = false;
    public $incomplete = false;
    public $payrollRows = [];

    public function isRestDay() { return $this->restDay; }
    public function rest_day_work() { return new TaFakeRelation($this->rdwRows); }
    public function holidays() { return new TaFakeRelation($this->holidayRows); }
    public function leaves() { return new TaFakeRelation($this->leaveRows); }
    public function hasSchedule() { return $this->schedule; }
    public function hasFlexibleSchedule() { return $this->flexible; }
    public function hasLog() { return $this->log; }
    public function onTimeLog() { return $this->onTime; }
    public function validLog() { return $this->validLogFlag; }
    public function isIncompleteLog() { return $this->incomplete; }
    public function payroll_items() { return new TaFakeRelation($this->payrollRows); }
    public function user() { return new TaFakeRelation([new TaFakeUser()]); }
}

class TeamAttendanceResourcesTest extends TestCase
{
    private function transform(TaFakeDtr $dtr)
    {
        $rows = (new TeamAttendanceResources([$dtr]))->toArray(request());
        $this->assertCount(1, $rows);
        return $rows[0];
    }

    public function test_plain_rest_day_status()
    {
        $dtr = new TaFakeDtr();
        $dtr->restDay = true;

        $row = $this->transform($dtr);

        $this->assertSame(['Rest Day'], $row['status']);
        $this->assertSame([], $row['schedule']);
        $this->assertSame('Dela Cruz, Juan', $row['name']);
    }

    public function test_approved_rest_day_work_flags_rdw_then_absent_without_log()
    {
        $dtr = new TaFakeDtr();
        $dtr->restDay = true;
        $dtr->rdwRows = [(object) ['status' => 'approved']];
        $dtr->schedule = true;

        $row = $this->transform($dtr);

        // RDW arm + rest-day-work sub-arm: no log -> Absent
        $this->assertSame(['RDW', 'Absent'], $row['status']);
        $this->assertCount(1, $row['schedule']);
    }

    public function test_approved_rdw_with_valid_log_is_on_time()
    {
        $dtr = new TaFakeDtr();
        $dtr->restDay = true;
        $dtr->rdwRows = [(object) ['status' => 'approved']];
        $dtr->schedule = true;
        $dtr->log = true;
        $dtr->validLogFlag = true;

        $this->assertSame(['RDW', 'On Time'], $this->transform($dtr)['status']);
    }

    public function test_holiday_with_log_is_on_time()
    {
        $dtr = new TaFakeDtr();
        $dtr->holidayRows = [(object) ['name' => 'Independence Day']];
        $dtr->schedule = true;
        $dtr->validLogFlag = true;

        $this->assertSame(['Holiday', 'On Time'], $this->transform($dtr)['status']);
    }

    public function test_leave_type_is_passed_through_as_status()
    {
        $dtr = new TaFakeDtr();
        $dtr->leaveRows = [(object) ['type' => 'Sick Leave']];

        $this->assertSame(['Sick Leave'], $this->transform($dtr)['status']);
    }

    public function test_scheduled_absent_when_no_log()
    {
        $dtr = new TaFakeDtr();
        $dtr->schedule = true;

        $this->assertSame(['Absent'], $this->transform($dtr)['status']);
    }

    public function test_scheduled_on_time()
    {
        $dtr = new TaFakeDtr();
        $dtr->schedule = true;
        $dtr->log = true;
        $dtr->onTime = true;

        $this->assertSame(['On Time'], $this->transform($dtr)['status']);
    }

    public function test_scheduled_present_with_late_and_undertime_values_formatted()
    {
        $dtr = new TaFakeDtr();
        $dtr->schedule = true;
        $dtr->flexible = true;
        $dtr->log = true; // present but not on time
        $dtr->payrollRows = [
            (object) ['item' => 'late', 'value' => 600],
            (object) ['item' => 'late', 'value' => 300],      // same item accumulates
            (object) ['item' => 'undertime', 'value' => 900],
        ];

        $row = $this->transform($dtr);

        $this->assertSame(['Present'], $row['status']);
        $this->assertCount(2, $row['schedule']); // fixed + flexy window
        $this->assertSame(seconds_to_time(900, true), $row['values']['late']);
        $this->assertSame(seconds_to_time(900, true), $row['values']['undertime']);
    }

    public function test_incomplete_log_appends_status()
    {
        $dtr = new TaFakeDtr();
        $dtr->schedule = true;
        $dtr->log = true;
        $dtr->incomplete = true;

        $this->assertSame(['Present', 'Incomplete Logs'], $this->transform($dtr)['status']);
    }

    public function test_no_schedule_no_flags_is_no_schedule()
    {
        $this->assertSame(['No Schedule'], $this->transform(new TaFakeDtr())['status']);
    }

    public function test_empty_collection_returns_empty_array()
    {
        $this->assertSame([], (new TeamAttendanceResources([]))->toArray(request()));
    }
}
