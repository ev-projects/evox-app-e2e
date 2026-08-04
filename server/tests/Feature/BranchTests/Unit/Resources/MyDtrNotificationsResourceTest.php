<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use App\Modules\Payroll\Resources\MyDtrNotificationsResource;

/**
 * WAVE-2 COVERAGE (2026-07-27). Pure toArray() branch tests for MyDtrNotificationsResource
 * (0% before this). The resource takes [$dtrs, $leaves, $requests] arrays of plain row objects
 * (SP/raw-query output shapes) — fully constructible with stdClass stubs, no DB.
 *
 * Branch map covered: complete-logs {late+undertime | late | undertime | on-time(dropped)},
 * incomplete-logs {no clock out | no clock in | no timelogs}, leave override {requested -> shown,
 * approved -> row dropped}, attached requests join on dtr_id, Absent passthrough status.
 */
class MyDtrNotificationsResourceTest extends TestCase
{
    private function dtr(array $overrides = [])
    {
        return (object) array_merge([
            'dtr_id' => 1,
            'date' => '2026-07-01',
            'attendance_status' => '',
            'late' => 0,
            'undertime' => 0,
            'time_in' => 1000000000,
            'time_out' => 1000030000,
            'start_datetime' => 1000000000,
            'end_datetime' => 1000030000,
            'start_flexy_datetime' => null,
            'end_flexy_datetime' => null,
            'break_time' => 3600,
        ], $overrides);
    }

    private function transform(array $dtrs, array $leaves = [], array $requests = [])
    {
        return (new MyDtrNotificationsResource([$dtrs, $leaves, $requests]))->toArray(request());
    }

    public function test_late_and_undertime_combined_status_and_details()
    {
        $rows = $this->transform([$this->dtr(['late' => 0.5, 'undertime' => 0.25])]);

        $this->assertCount(1, $rows);
        $this->assertSame('Late & Undertime', $rows[0]['status']);
        // 0.5h = 1800s, 0.25h = 900s
        $this->assertSame(seconds_to_time(1800, true) . ' & ' . seconds_to_time(900, true), $rows[0]['details']);
        $this->assertSame('2026-07-01', $rows[0]['date']);
    }

    public function test_late_only_status()
    {
        $rows = $this->transform([$this->dtr(['late' => 1.0])]);

        $this->assertSame('Late', $rows[0]['status']);
        $this->assertSame(seconds_to_time(3600, true), $rows[0]['details']);
    }

    public function test_undertime_only_status()
    {
        $rows = $this->transform([$this->dtr(['undertime' => 2.0])]);

        $this->assertSame('Undertime', $rows[0]['status']);
    }

    public function test_on_time_complete_log_row_is_dropped()
    {
        // complete logs + no late/undertime -> status stays "" -> filtered out
        $this->assertSame([], $this->transform([$this->dtr()]));
    }

    public function test_absent_with_no_timelogs()
    {
        $rows = $this->transform([$this->dtr([
            'attendance_status' => 'Absent', 'time_in' => null, 'time_out' => null,
        ])]);

        $this->assertSame('Absent', $rows[0]['status']);
        $this->assertSame('No timelogs', $rows[0]['details']);
        $this->assertNull($rows[0]['time_in']);
    }

    public function test_no_clock_out_detail()
    {
        $rows = $this->transform([$this->dtr([
            'attendance_status' => 'Absent', 'time_out' => null,
        ])]);

        $this->assertSame('No clock out', $rows[0]['details']);
    }

    public function test_no_clock_in_detail()
    {
        $rows = $this->transform([$this->dtr([
            'attendance_status' => 'Absent', 'time_in' => null,
        ])]);

        $this->assertSame('No clock in', $rows[0]['details']);
    }

    public function test_requested_leave_overrides_detail_as_pending()
    {
        $leave = (object) ['dtr_id' => 1, 'status' => 'requested', 'type' => 'Sick Leave'];
        $rows = $this->transform(
            [$this->dtr(['attendance_status' => 'Absent', 'time_in' => null, 'time_out' => null])],
            [$leave]
        );

        $this->assertSame('Sick Leave - Pending', $rows[0]['details']);
    }

    public function test_approved_leave_blanks_detail_and_drops_the_row()
    {
        $leave = (object) ['dtr_id' => 1, 'status' => 'approved', 'type' => 'Sick Leave'];
        $rows = $this->transform(
            [$this->dtr(['attendance_status' => 'Absent', 'time_in' => null, 'time_out' => null])],
            [$leave]
        );

        // approved leave sets details = "" -> is_valid fails -> row filtered out
        $this->assertSame([], $rows);
    }

    public function test_requests_are_joined_on_dtr_id()
    {
        $req = (object) ['dtr_id' => 1, 'id' => 77, 'type' => 'alter_log', 'status' => 'requested'];
        $strayReq = (object) ['dtr_id' => 999, 'id' => 78, 'type' => 'overtime', 'status' => 'approved'];
        $rows = $this->transform([$this->dtr(['late' => 1.0])], [], [$req, $strayReq]);

        $this->assertCount(1, $rows[0]['requests']);
        $this->assertSame(77, $rows[0]['requests'][0]['id']);
        $this->assertSame('alter_log', $rows[0]['requests'][0]['request_type']);
    }

    public function test_empty_input_yields_empty_array()
    {
        $this->assertSame([], $this->transform([]));
    }
}
