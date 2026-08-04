<?php

namespace Tests\Feature\BranchTests\Unit\Exports;

use Tests\TestCase;
use App\Exports\EmployeeAttendanceReportExport;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\Events\AfterSheet;

/**
 * WAVE-2 COVERAGE (2026-07-27). Tests for app/Exports/EmployeeAttendanceReportExport.php
 * (0% before this — 185 lines, the single biggest zero-coverage backend file).
 * Constructor takes plain row objects (SP output shape) + a date range; array() and the
 * AfterSheet styling closure are exercised fully in memory via Excel::raw() — no file
 * writes, no DB, no network. Sheet styling helpers (setNumFormatPercent etc.) are app
 * macros registered by PHPExcelMacroServiceProvider, present in the normal app boot.
 */
class EmployeeAttendanceReportExportTest extends TestCase
{
    private function employees()
    {
        // 13 leading columns (name..VL) followed by one status cell per day of the period
        return [
            (object) ['name' => 'Dela Cruz, Juan', 'emp_num' => 'EV-001', 'account' => 'Acme',
                      'rate' => 0.9, 'unplanned' => 0.1, 'planned' => 0, 'sched_vl' => 20,
                      'present' => 18, 'sched' => 20, 'ul' => 2, 'absent' => 0, 'sl' => 1, 'vl' => 1,
                      'd1' => 'P', 'd2' => 'A', 'd3' => 'RD'],
            (object) ['name' => 'Santos, Maria', 'emp_num' => 'EV-002', 'account' => 'Acme',
                      'rate' => 1.0, 'unplanned' => 0, 'planned' => 0.05, 'sched_vl' => 20,
                      'present' => 20, 'sched' => 20, 'ul' => 0, 'absent' => 0, 'sl' => 0, 'vl' => 2,
                      'd1' => 'P', 'd2' => 'P', 'd3' => 'H'],
        ];
    }

    private function stats()
    {
        return [
            (object) ['headcount' => 2, 'account' => 'Acme', 'rate' => 0.95, 'unplanned' => 0.05,
                      'planned' => 0.02, 'sched_vl' => 40, 'present' => 38, 'sched' => 40,
                      'ul' => 2, 'absent' => 0, 'sl' => 1, 'vl' => 3],
        ];
    }

    private function export()
    {
        // 3-day period => count_period = 3 (matches the d1..d3 status cells above)
        return new EmployeeAttendanceReportExport($this->employees(), $this->stats(), '2026-07-01', '2026-07-03');
    }

    public function test_static_sheet_metadata()
    {
        $export = $this->export();

        $this->assertSame('Monthly Attendance Report', $export->title());
        $this->assertSame('B4', $export->startCell());
        $widths = $export->columnWidths();
        $this->assertSame(40, $widths['A']);
        $this->assertCount(13, $widths);
    }

    public function test_array_builds_title_headers_dayrow_employees_and_account_block()
    {
        $excel = $this->export()->array();

        $this->assertSame(['ATTENDANCE'], $excel[0]);

        // header row: 13 fixed labels + 3 period date cells (keys 1..3 appended by array_merge)
        $header = $excel[1];
        $this->assertSame('Name', $header[0]);
        $this->assertSame("Employee\nNumber", $header[1]);
        $this->assertCount(16, $header);
        $this->assertStringContainsString('Jul', $header[13]); // M-d formatted period cell

        // day-name row mirrors the period
        $this->assertCount(16, $excel[2]);

        // employees block: rows of flattened object values
        $employees = $excel[3];
        $this->assertCount(2, $employees);
        $this->assertSame('Dela Cruz, Juan', $employees[0][0]);
        $this->assertSame('P', $employees[0][13]); // first day status cell
        $this->assertSame('H', $employees[1][15]); // last day status cell

        // 4 spacer rows then the account headers + account stats (leading "" per stat row)
        $this->assertSame(['HEAD COUNT'], array_slice($excel[8], 1, 1));
        $this->assertSame('', $excel[9][0][0]);
        $this->assertSame(2, $excel[9][0][1]); // headcount value follows the blank lead cell
    }

    public function test_register_events_exposes_after_sheet_styler()
    {
        $events = $this->export()->registerEvents();

        $this->assertArrayHasKey(AfterSheet::class, $events);
        $this->assertInstanceOf(\Closure::class, $events[AfterSheet::class]);
    }

    public function test_full_workbook_renders_in_memory_including_styling_closure()
    {
        // Runs array() + the whole AfterSheet closure (zero-percent fill, status colour map,
        // month width pass, borders) against a real in-memory sheet.
        $binary = Excel::raw($this->export(), \Maatwebsite\Excel\Excel::XLSX);

        $this->assertNotEmpty($binary);
        $this->assertSame("PK", substr($binary, 0, 2)); // xlsx = zip container
    }
}
