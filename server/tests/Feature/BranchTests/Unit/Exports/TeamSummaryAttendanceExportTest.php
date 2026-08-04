<?php

namespace Tests\Feature\BranchTests\Unit\Exports;

use Tests\TestCase;
use App\Exports\TeamSummaryAttendanceExport;
use Maatwebsite\Excel\Facades\Excel;

/**
 * WAVE-2 COVERAGE (2026-07-27). Tests for app/Exports/TeamSummaryAttendanceExport.php
 * (0% before this — 146 lines). The class is pure array-in/spreadsheet-out; the render test
 * uses Excel::raw() which builds the workbook fully IN MEMORY (drawings, styles, both sheets)
 * — no file writes, no DB, no network.
 *
 * // FINDING EXPORT-1: the class declares `protected $lis;` but the constructor assigns
 *    `$this->list` — the typo makes $list an undeclared dynamic property (works on PHP 7.4,
 *    deprecation-warns on 8.2 → upgrade-audit item).
 * // FINDING EXPORT-2: the 'list' arm of array() has a SECOND return block after the first
 *    `return $list;` (lines ~113-141) — unreachable dead code.
 */
class TeamSummaryAttendanceExportTest extends TestCase
{
    private function stats()
    {
        return [
            'attendance'       => ['total_count' => 12, 'total_percentage' => 0.8, 'target_percentage' => 0.95],
            'planned_leaves'   => ['total_count' => 0,  'total_percentage' => 0,   'target_percentage' => 0.05],
            'unplanned_leaves' => ['total_count' => 3,  'total_percentage' => 0.2, 'target_percentage' => 0],
            'total_headcount'  => 15,
            'scheduled_employees' => ['total_count' => 15],
        ];
    }

    private function list_rows()
    {
        return [
            ['user_id' => 'EV-001', 'name' => 'Dela Cruz, Juan', 'department' => 'QA',
             'job_title' => 'QA Engineer', 'date' => '2026-07-01', 'status' => 'Present'],
            ['user_id' => 'EV-002', 'name' => 'Santos, Maria', 'department' => 'Dev',
             'job_title' => 'Developer', 'date' => '2026-07-01', 'status' => 'Absent'],
        ];
    }

    public function test_report_sheet_headings_title_and_widths()
    {
        $export = new TeamSummaryAttendanceExport($this->stats(), $this->list_rows(), 'report');

        $this->assertSame(['Label', 'Number', 'Percentage', 'Target'], $export->headings());
        $this->assertSame('Report', $export->title());
        $this->assertSame('A6', $export->startCell());
        $this->assertSame(['A' => 30, 'B' => 15, 'C' => 15, 'D' => 15], $export->columnWidths());
    }

    public function test_list_sheet_headings_title_and_widths()
    {
        $export = new TeamSummaryAttendanceExport($this->stats(), $this->list_rows(), 'list');

        $this->assertSame(['Employee #', 'NAME', 'Department', 'JOB TITLE', 'DATE', 'STATUS'], $export->headings());
        $this->assertSame('List', $export->title());
        $this->assertCount(6, $export->columnWidths());
    }

    public function test_report_array_zero_counts_render_as_string_zero()
    {
        $rows = (new TeamSummaryAttendanceExport($this->stats(), $this->list_rows(), 'report'))->array();

        $this->assertCount(3, $rows);
        $this->assertSame(['Attendance', 12, 0.8, 0.95], $rows[0]);
        // planned_leaves has all-zero count/percentage -> '0' strings via the ternaries
        $this->assertSame(['Planned Leaves', '0', '0', 0.05], $rows[1]);
        $this->assertSame('Unplanned Leaves', $rows[2][0]);
    }

    public function test_list_array_maps_rows_and_formats_date()
    {
        $rows = (new TeamSummaryAttendanceExport($this->stats(), $this->list_rows(), 'list'))->array();

        $this->assertCount(2, $rows);
        $this->assertSame(['EV-001', 'Dela Cruz, Juan', 'QA', 'QA Engineer', 'July-01', 'Present'], $rows[0]);
        $this->assertSame('Absent', $rows[1][5]);
    }

    public function test_sheets_returns_report_and_list_pair()
    {
        $sheets = (new TeamSummaryAttendanceExport($this->stats(), $this->list_rows()))->sheets();

        $this->assertCount(2, $sheets);
        $this->assertSame('Report', $sheets[0]->title());
        $this->assertSame('List', $sheets[1]->title());
    }

    public function test_full_workbook_renders_in_memory()
    {
        if (!file_exists(public_path('/images/EV_logo_FLAT.jpg'))) {
            $this->markTestIncomplete('logo asset missing in this environment (drawings() would throw)');
        }

        // Renders BOTH sheets incl. drawings() + styles() closures entirely in memory.
        $binary = Excel::raw(
            new TeamSummaryAttendanceExport($this->stats(), $this->list_rows()),
            \Maatwebsite\Excel\Excel::XLSX
        );

        $this->assertNotEmpty($binary);
        $this->assertSame("PK", substr($binary, 0, 2)); // xlsx = zip container
    }
}
