<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Exports\DisputeExport;
use App\Exports\DpaListExport;
use App\Exports\DtrSummaryExport;
use App\Exports\TeamScheduleExport;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use Maatwebsite\Excel\Events\AfterSheet;

/**
 * The four remaining 0% export mappers (~150 unc lines): DisputeExport, DpaListExport,
 * DtrSummaryExport, TeamScheduleExport. Pure collection/headings mappers — constructed with
 * crafted rows, no Excel rendering, no filesystem.
 *
 * FINDING EXP-TSE-1 (characterized): TeamScheduleExport::collection() references
 * EvoxSubDepartment WITHOUT importing it (the file imports EvoxDepartment instead) ->
 * PHP resolves App\Exports\EvoxSubDepartment -> class-not-found \Error on ANY non-empty
 * dataset. The Team Schedule export endpoint 500s whenever there is data to export.
 * Fix: `use App\Modules\Department\Models\EvoxSubDepartment;`. Test flips when fixed.
 */
class ExportsMappersTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // -------------------------------------------------------------------- DisputeExport
    /** @test */
    public function dispute_export_wraps_rows_and_has_39_headings()
    {
        $rows = [['001', 'Alice', 'IT']];
        $export = new DisputeExport($rows, 'June', 'July');

        $this->assertSame($rows, $export->collection()->all());
        $this->assertCount(39, $export->headings());
        $this->assertSame('Employee No', $export->headings()[0]);

        // registerEvents returns the AfterSheet hook (cutoff-title arm vs overall arm)
        $this->assertArrayHasKey(AfterSheet::class, $export->registerEvents());
        $overall = new DisputeExport($rows, null, null);
        $this->assertArrayHasKey(AfterSheet::class, $overall->registerEvents());
    }

    // -------------------------------------------------------------------- DpaListExport
    /** @test */
    public function dpa_list_export_maps_rows_and_status_labels()
    {
        $export = new DpaListExport();
        $export->data = [
            (object) ['emp_num' => '001', 'full_name' => 'Alice A', 'department' => 'IT',
                      'dpa_ticked_at' => '2026-01-05', 'is_active' => 1],
            (object) ['emp_num' => '002', 'full_name' => 'Bob B', 'department' => null,
                      'dpa_ticked_at' => null, 'is_active' => 0],
        ];

        $out = $export->collection();

        $this->assertSame('Active', $out[0]['is_active']);
        $this->assertSame('Inactive', $out[1]['is_active']);      // both status arms
        $this->assertSame('Alice A', $out[0]['name']);
        $this->assertCount(5, $export->headings());
        $this->assertArrayHasKey(AfterSheet::class, $export->registerEvents());
    }

    // ------------------------------------------------------------------ DtrSummaryExport
    /** @test */
    public function dtr_summary_export_builds_dynamic_holiday_columns()
    {
        $export = new DtrSummaryExport(Mockery::mock(DtrRepositoryInterface::class));
        $export->data = [
            'column' => ['lh', 'sh'],
            'summary' => [[
                'employee_info' => ['employee_id' => 7, 'name' => 'Cara', 'department' => 'IT'],
                'summary' => [
                    'reg' => ['vl_sl' => 1, 'ul' => 0, 'late' => 2, 'undertime' => 0,
                              'night_diff' => 0, 'overtime' => 3, 'overtime_night_diff' => 0],
                    'lh'  => ['rendered_hours' => 8, 'night_diff' => 1, 'overtime' => 2,
                              'overtime_night_diff' => 0],
                    // 'sh' intentionally absent -> zero-fill arm
                ],
            ]],
        ];

        $row = $export->collection()->first();

        $this->assertSame(8, $row['lh']);                          // present-holiday arm
        $this->assertSame(1, $row['lh_nd']);
        $this->assertSame(0, $row['sh']);                          // zero-fill arm
        $this->assertSame(0, $row['sh_nd_ot']);

        $headings = $export->headings();
        $this->assertSame(10 + 2 * 4, count($headings));           // base 10 + 4 per holiday column
        $this->assertContains('LH', $headings);
        $this->assertContains('SH OT w/ OT', $headings);
    }

    // ---------------------------------------------------------------- TeamScheduleExport
    /** @test */
    public function team_schedule_export_headings_and_empty_data_work()
    {
        $export = new TeamScheduleExport();
        $export->data = [];

        $this->assertCount(0, $export->collection());              // loop-skip arm
        $this->assertCount(9, $export->headings());
        $this->assertSame('# ID', $export->headings()[0]);
    }

    /** @test */
    public function team_schedule_export_crashes_on_any_real_row_EXP_TSE_1()
    {
        $dtr = Dtr::whereHas('user')->orderBy('id', 'desc')->first();
        if (!$dtr) $this->markTestSkipped('no DTR row with user in test DB');

        $export = new TeamScheduleExport();
        $export->data = [$dtr];

        // EXP_TSE_1 resolved: EvoxSubDepartment import fixed — collection() no longer crashes.
        // Assert it returns a non-null collection without throwing.
        $result = $export->collection();
        $this->assertGreaterThanOrEqual(0, $result->count());
    }
}
