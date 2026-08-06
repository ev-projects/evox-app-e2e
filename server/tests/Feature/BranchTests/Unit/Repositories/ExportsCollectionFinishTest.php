<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Collection as SupportCollection;
use App\Exports\DtrSummaryExport;
use App\Exports\ExportDTRMismatch;
use App\Exports\ExportDTRMultiLogsSummary;
use App\Exports\TeamScheduleExport;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Department\Models\EvoxSubDepartment;

/**
 * Finishes collection() — the last unfinished method — on four spreadsheet exporters, which flips
 * each of the four classes to fully covered:
 *
 *   DtrSummaryExport            payroll DTR Summary download (dynamic holiday columns)
 *   ExportDTRMismatch           DTR Mismatch report download
 *   ExportDTRMultiLogsSummary   Multiple-Logs Summary report download
 *   TeamScheduleExport          Team Schedule download (per-employee shift grid)
 *
 * WHY A USER CARES: these four are the "Export to Excel" buttons on Payroll > DTR Summary,
 * Reports > DTR Mismatch, Reports > Multiple Logs and Team > Schedule. If collection() maps a
 * row wrongly or blows up, the manager gets a corrupt payroll sheet or a 500 on download — and
 * nothing else in the app tells them the numbers are wrong.
 *
 * ARMS COVERED (both success AND guard/degenerate paths of every collection()):
 *  - DtrSummaryExport: holiday column PRESENT arm (rendered/nd/ot/nd_ot copied) + holiday column
 *    ABSENT arm (zero-fill), multi-row loop, empty-column list, empty-summary loop-skip guard.
 *  - ExportDTRMismatch / ExportDTRMultiLogsSummary: array-of-arrays rows, array-of-objects rows,
 *    empty payload guard, and an already-a-Collection payload (collect() pass-through arm).
 *  - TeamScheduleExport: real Dtr + user + sub-department mapping, hasSchedule() TRUE arm,
 *    hasFlexibleSchedule() TRUE arm (nested), no-schedule FALSE arm (blank duty columns),
 *    and the empty-dataset loop-skip guard.
 *
 * Safety: no stored procedures, no writes, no whole-table scans. The Team Schedule arms reuse a
 * single existing Dtr row and mutate it IN MEMORY ONLY (never saved) to reach the schedule
 * branches; DatabaseTransactions is on as a belt-and-braces rollback.
 */
class ExportsCollectionFinishTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /**
     * Bounded probe (max 25 rows, never a table scan) for a DTR whose user exists AND whose
     * sub-department row exists — TeamScheduleExport::collection() dereferences both without a
     * null guard, so anything less is not exportable.
     */
    private function findExportableDtr()
    {
        // PROBE WIDENED 2026-08-06: was limit(25). A window that small gave up on databases
        // holding thousands of qualifying rows, so the test marked itself incomplete and covered
        // NOTHING - which is why several classes with working tests reported 0% coverage.
        // Still bounded and indexed; no whole-table scan.
        $candidates = Dtr::whereHas('user')->orderBy('id', 'desc')->limit(400)->get();

        foreach ($candidates as $dtr) {
            $user = $dtr->user()->first();
            if (!$user) {
                continue;
            }
            if (EvoxSubDepartment::where('Id', $user->SubDepartmentID)->first()) {
                return $dtr;
            }
        }

        return null;
    }

    // ================================================================== DtrSummaryExport

    /** @test */
    public function dtr_summary_export_copies_present_holiday_buckets_and_zero_fills_missing_ones()
    {
        $export = new DtrSummaryExport(Mockery::mock(DtrRepositoryInterface::class));
        $export->data = [
            'column'  => ['lh', 'sh', 'rd'],
            'summary' => [
                [
                    'employee_info' => ['employee_id' => '1001', 'name' => 'Ana Cruz', 'department' => 'Finance'],
                    'summary' => [
                        'reg' => [
                            'vl_sl' => 8, 'ul' => 0, 'late' => 15, 'undertime' => 5,
                            'night_diff' => 2, 'overtime' => 3, 'overtime_night_diff' => 1,
                        ],
                        'lh' => [
                            'rendered_hours' => 8, 'night_diff' => 2,
                            'overtime' => 4, 'overtime_night_diff' => 1,
                        ],
                        // 'sh' and 'rd' deliberately absent -> zero-fill arm
                    ],
                ],
                [
                    'employee_info' => ['employee_id' => '1002', 'name' => 'Ben Uy', 'department' => 'IT'],
                    'summary' => [
                        'reg' => [
                            'vl_sl' => 0, 'ul' => 1, 'late' => 0, 'undertime' => 0,
                            'night_diff' => 0, 'overtime' => 0, 'overtime_night_diff' => 0,
                        ],
                        'sh' => [
                            'rendered_hours' => 4, 'night_diff' => 0,
                            'overtime' => 0, 'overtime_night_diff' => 0,
                        ],
                    ],
                ],
            ],
        ];

        $rows = $export->collection();

        $this->assertCount(2, $rows, 'one spreadsheet row per employee in the summary');

        $ana = $rows[0];
        // general information block
        $this->assertSame('1001', $ana['employee_id']);
        $this->assertSame('Ana Cruz', $ana['name']);
        $this->assertSame('Finance', $ana['department']);
        $this->assertSame(8, $ana['leaves']);
        $this->assertSame(0, $ana['ul']);
        $this->assertSame(15, $ana['late']);
        $this->assertSame(5, $ana['undertime']);
        $this->assertSame(2, $ana['night_diff']);
        $this->assertSame(3, $ana['overtime']);
        $this->assertSame(1, $ana['overtime_night_diff']);
        // holiday bucket PRESENT arm
        $this->assertSame(8, $ana['lh']);
        $this->assertSame(2, $ana['lh_nd']);
        $this->assertSame(4, $ana['lh_ot']);
        $this->assertSame(1, $ana['lh_nd_ot']);
        // holiday bucket ABSENT arm -> zero-filled, key still emitted so columns stay aligned
        $this->assertSame(0, $ana['sh']);
        $this->assertSame(0, $ana['sh_nd']);
        $this->assertSame(0, $ana['sh_ot']);
        $this->assertSame(0, $ana['sh_nd_ot']);
        $this->assertSame(0, $ana['rd']);

        $ben = $rows[1];
        $this->assertSame('Ben Uy', $ben['name']);
        $this->assertSame(4, $ben['sh']);            // second row hits the present arm on a different key
        $this->assertSame(0, $ben['lh']);            // and the zero-fill arm on the first key

        // every row must carry the same column count, otherwise the sheet shears
        $this->assertSame(count($ana), count($ben));
        $this->assertSame(10 + 3 * 4, count($ana));
    }

    /** @test */
    public function dtr_summary_export_handles_empty_summary_and_no_holiday_columns()
    {
        $export = new DtrSummaryExport(Mockery::mock(DtrRepositoryInterface::class));
        $export->data = ['column' => [], 'summary' => []];

        $this->assertCount(0, $export->collection());        // loop-skip guard arm
        $this->assertCount(10, $export->headings());         // base headings only
        $this->assertSame('# ID', $export->headings()[0]);
        $this->assertSame('OT with ND', $export->headings()[9]);
    }

    /** @test */
    public function dtr_summary_export_headings_grow_by_four_per_holiday_column()
    {
        $export = new DtrSummaryExport(Mockery::mock(DtrRepositoryInterface::class));
        $export->data = ['column' => ['lh', 'sh'], 'summary' => []];

        $headings = $export->headings();

        $this->assertCount(10 + 2 * 4, $headings);
        $this->assertSame('LH', $headings[10]);
        $this->assertSame('LH ND', $headings[11]);
        $this->assertSame('LH OT', $headings[12]);
        $this->assertSame('LH OT w/ OT', $headings[13]);
        $this->assertSame('SH', $headings[14]);
    }

    // ================================================================ ExportDTRMismatch

    /** @test */
    public function dtr_mismatch_export_passes_rows_through_and_publishes_twelve_columns()
    {
        $rows = [
            ['001', 'Ana Cruz', 'Finance', '2026-07-01', '09:00', '18:00',
             'Vacation Leave', 1, 'approved', 'note', '2026-07-01', '2026-07-02'],
            ['002', 'Ben Uy', 'IT', '2026-07-02', '09:15', null,
             null, 0, 'pending', '', '2026-07-02', '2026-07-02'],
        ];

        $export = new ExportDTRMismatch($rows);
        $out = $export->collection();

        $this->assertInstanceOf(SupportCollection::class, $out);
        $this->assertSame($rows, $out->all());
        $this->assertCount(2, $out);

        $headings = $export->headings();
        $this->assertCount(12, $headings);
        $this->assertSame('Employee Number', $headings[0]);
        $this->assertSame('Status', $headings[8]);
        $this->assertSame('Updated at', $headings[11]);
        $this->assertSame(count($headings), count($rows[0]), 'row width must match heading width');
    }

    /** @test */
    public function dtr_mismatch_export_accepts_objects_and_an_empty_payload()
    {
        $objects = new ExportDTRMismatch([
            (object) ['emp_num' => '003', 'name' => 'Cara Reyes'],
        ]);
        $this->assertCount(1, $objects->collection());
        $this->assertSame('Cara Reyes', $objects->collection()->first()->name);

        $empty = new ExportDTRMismatch([]);                  // no mismatches found guard arm
        $this->assertCount(0, $empty->collection());
        $this->assertCount(12, $empty->headings());          // headers still written to the sheet
    }

    // ======================================================== ExportDTRMultiLogsSummary

    /** @test */
    public function multi_logs_summary_export_passes_rows_through_and_publishes_eight_columns()
    {
        $rows = [
            ['Ana Cruz', '001', 'Finance', '2026-07-01', 9.0, 8.0, 0.0, 'Project A'],
            ['Ben Uy', '002', 'IT', '2026-07-01', 12.5, 11.0, 2.0, 'Project B'],
        ];

        $export = new ExportDTRMultiLogsSummary($rows);
        $out = $export->collection();

        $this->assertInstanceOf(SupportCollection::class, $out);
        $this->assertSame($rows, $out->all());
        $this->assertSame('Project B', $out[1][7]);

        $headings = $export->headings();
        $this->assertCount(8, $headings);
        $this->assertSame('Employee Name', $headings[0]);
        $this->assertSame('Total_Hours', $headings[4]);
        $this->assertSame('Project_Name', $headings[7]);
        $this->assertSame(count($headings), count($rows[0]), 'row width must match heading width');
    }

    /** @test */
    public function multi_logs_summary_export_accepts_a_collection_and_an_empty_payload()
    {
        // collect() on an existing Collection is a pass-through — the report builder hands one in
        $preBuilt = collect([
            (object) ['name' => 'Ana Cruz', 'rendered_hr' => 8.0],
        ]);
        $export = new ExportDTRMultiLogsSummary($preBuilt);
        $this->assertCount(1, $export->collection());
        $this->assertSame(8.0, $export->collection()->first()->rendered_hr);

        $empty = new ExportDTRMultiLogsSummary([]);          // nobody had multiple logs guard arm
        $this->assertCount(0, $empty->collection());
        $this->assertCount(8, $empty->headings());
    }

    // ================================================================ TeamScheduleExport

    /** @test */
    public function team_schedule_export_returns_no_rows_and_still_publishes_headings_when_no_one_matched()
    {
        $export = new TeamScheduleExport();
        $export->data = [];

        $this->assertCount(0, $export->collection());        // loop-skip guard arm

        $headings = $export->headings();
        $this->assertCount(9, $headings);
        $this->assertSame('# ID', $headings[0]);
        $this->assertSame('Department', $headings[2]);
        $this->assertSame('Flexi Start', $headings[6]);
    }

    /** @test */
    public function team_schedule_export_maps_employee_identity_and_department_for_a_real_dtr()
    {
        $dtr = $this->findExportableDtr();
        if (!$dtr) {
            $this->markTestSkipped('no DTR row whose user has an existing EVOX_SUB_DEPARTMENT record');
        }

        $user = $dtr->user()->first();
        $subDepartment = EvoxSubDepartment::where('Id', $user->SubDepartmentID)->first();

        $export = new TeamScheduleExport();
        $export->data = [$dtr];

        $row = $export->collection()->first();

        $this->assertSame($user->id, $row['id']);
        $this->assertSame($user->getFullName(3), $row['name']);
        $this->assertSame($subDepartment->Name, $row['department']);
        $this->assertSame($dtr->date, $row['date']);
        $this->assertIsString($row['status'], 'status is imploded from getDtrStatus() flags');
        $this->assertSame(
            ['id', 'name', 'department', 'date', 'on_duty', 'off_duty', 'flexy_start', 'flexy_off', 'status'],
            array_keys($row),
            'mapped row must line up 1:1 with the nine headings'
        );
    }

    /** @test */
    public function team_schedule_export_fills_duty_times_only_when_a_schedule_exists()
    {
        $dtr = $this->findExportableDtr();
        if (!$dtr) {
            $this->markTestSkipped('no DTR row whose user has an existing EVOX_SUB_DEPARTMENT record');
        }

        // ---- no-schedule arm: duty and flexi columns stay blank (in-memory only, never saved)
        $dtr->start_datetime       = null;
        $dtr->end_datetime         = null;
        $dtr->start_flexy_datetime = null;
        $dtr->end_flexy_datetime   = null;

        $export = new TeamScheduleExport();
        $export->data = [$dtr];
        $blank = $export->collection()->first();

        $this->assertSame('', $blank['on_duty']);
        $this->assertSame('', $blank['off_duty']);
        $this->assertSame('', $blank['flexy_start']);
        $this->assertSame('', $blank['flexy_off']);

        // ---- fixed-schedule arm: duty filled, flexi still blank
        $start = mktime(9, 0, 0, 7, 1, 2026);
        $end   = mktime(18, 0, 0, 7, 1, 2026);
        $dtr->start_datetime = $start;
        $dtr->end_datetime   = $end;

        $export->data = [$dtr];
        $fixed = $export->collection()->first();

        $this->assertSame(date('h:i:s', $start), $fixed['on_duty']);
        $this->assertSame(date('h:i:s', $end), $fixed['off_duty']);
        $this->assertSame('', $fixed['flexy_start'], 'flexi columns stay blank without a flexi window');
        $this->assertSame('', $fixed['flexy_off']);

        // ---- flexible-schedule arm (nested inside the schedule arm): all four columns filled
        $flexyStart = mktime(8, 0, 0, 7, 1, 2026);
        $flexyEnd   = mktime(10, 0, 0, 7, 1, 2026);
        $dtr->start_flexy_datetime = $flexyStart;
        $dtr->end_flexy_datetime   = $flexyEnd;

        $export->data = [$dtr];
        $flexi = $export->collection()->first();

        $this->assertSame(date('h:i:s', $start), $flexi['on_duty']);
        $this->assertSame(date('h:i:s', $flexyStart), $flexi['flexy_start']);
        $this->assertSame(date('h:i:s', $flexyEnd), $flexi['flexy_off']);
    }

    /** @test */
    public function team_schedule_export_maps_every_dtr_it_is_handed()
    {
        $dtr = $this->findExportableDtr();
        if (!$dtr) {
            $this->markTestSkipped('no DTR row whose user has an existing EVOX_SUB_DEPARTMENT record');
        }

        $export = new TeamScheduleExport();
        $export->data = [$dtr, $dtr, $dtr];                  // multi-iteration loop arm

        $rows = $export->collection();

        $this->assertCount(3, $rows);
        $this->assertSame($rows[0], $rows[1]);
        $this->assertSame($rows[1], $rows[2]);
    }
}
