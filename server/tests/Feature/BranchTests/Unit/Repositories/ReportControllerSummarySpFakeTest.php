<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\NewExportDTRSummary;
use App\Exports\ExportDTRMultiLogsSummary;
use App\Exports\TimeoffAllocationExport;
use App\Modules\User\Models\User;

/**
 * ReportController SP-walled tail (Menu=Reports Pages=DTR Summary New / Multi-Punch Logs /
 * Timeoff Allocation / Morocco Payroll — 174 unc lines; these methods were on the BUG-078
 * exclusion list because they call SPs live). CallSpFake shadows the controller namespace;
 * Excel::fake() captures the CSV downloads (no filesystem writes).
 *
 * NOT covered here, on purpose: dtr_half_day_mismatch + dtr_conflict_report — they run
 * `DB::select('call Half_Day_Conflict_Report("<interpolated dates>")')` RAW, outside both seams
 * -> live SP + BUG-078 hang risk in tests, and string-interpolated request input inside a CALL
 * statement (FINDING RPT-SQL-1, registered).
 *
 * Routes (prefix report/ under /api): dtr_summary/new_team, dtr_summary/new_export,
 * dtr_summary/multi_logs, dtr_summary/multi_logs_export, timeoff_allocation,
 * get_morocco_payroll_params. jwtauth/auth.apikey bypassed via withoutMiddleware().
 */
class ReportControllerSummarySpFakeTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();
        Excel::fake();
        $this->withoutMiddleware();

        $this->user = User::whereNotNull('LevelId')->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$this->user) $this->markTestSkipped('no active user with LevelId in test DB');
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        parent::tearDown();
    }

    /** One DTR-summary row with every field the 35-column mapper reads. */
    private function summaryRow()
    {
        $row = [
            'Employee_Name' => 'Alice Report', 'Employee_Number' => '001', 'Department_Name' => 'IT',
            'UL' => 0, 'Leaves' => 1, 'Late' => 2, 'Under_Time' => 0, 'Render_Hr' => 160,
            'Night_Diff' => 0, 'OverTime' => 4, 'OT_ND' => 0,
        ];
        foreach (['RD', 'LH', 'DSH', 'DLH', 'SLH'] as $k) {
            $row["{$k}_Render_HR"] = 0; $row["{$k}_ND"] = 0; $row["{$k}_OT"] = 0; $row["{$k}_OT_ND"] = 0;
        }
        $row['SH_Render_Hr'] = 0; $row['SH_ND'] = 0; $row['SH_OT'] = 0; $row['SH_OT_ND'] = 0;
        return (object) $row;
    }

    // -------------------------------------------------------- new_dtr_summary_report
    /** @test */
    public function new_dtr_summary_maps_sp_rows_and_supports_sup_id_override()
    {
        CallSpFake::fake('EH_SP_DTR_Summary_Report', [[], [$this->summaryRow()]]);

        $res = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/new_team?sup_id=777&department_id=3&is_active=1&name=al&valid_from=2026-07-01&valid_to=2026-07-15');

        $res->assertStatus(200);
        $items = $res->json('content.dtrItems');
        $this->assertCount(1, $items);
        $this->assertSame('Alice Report', $items[0]['Employee_Name']);
        $this->assertSame('IT', $items[0]['Department']);
        $this->assertEquals(160, $items[0]['Render_Hr']);

        $p = CallSpFake::callsFor('EH_SP_DTR_Summary_Report')[0]['params'];
        $this->assertSame('777', $p[0]);                        // sup_id override arm
        $this->assertSame(['3', '1', 'al'], [$p[2], $p[3], $p[4]]);
        $this->assertSame('2026-07-01', $p[5]);
    }

    /** @test */
    public function new_dtr_summary_defaults_to_auth_user_when_no_sup_id()
    {
        CallSpFake::fake('EH_SP_DTR_Summary_Report', [[], []]);

        $res = $this->actingAs($this->user)->getJson('/api/report/dtr_summary/new_team');

        $res->assertStatus(200);
        $this->assertSame([], $res->json('content.dtrItems'));
        $this->assertSame($this->user->id,
            CallSpFake::callsFor('EH_SP_DTR_Summary_Report')[0]['params'][0]);
    }

    /** @test */
    public function new_dtr_summary_csv_export_downloads_file()
    {
        CallSpFake::fake('EH_SP_DTR_Summary_Report', [[], [$this->summaryRow()]]);

        $res = $this->actingAs($this->user)->get('/api/report/dtr_summary/new_export');

        $res->assertStatus(200);
        Excel::assertDownloaded('newdtrsummary.csv', function (NewExportDTRSummary $export) {
            return true;
        });
    }

    // -------------------------------------------------- dtr_multi_logs_summary_report
    /** @test */
    public function multi_logs_requires_department_then_maps_rows()
    {
        // missing-department guard arm — SP never called
        $res = $this->actingAs($this->user)->getJson('/api/report/dtr_summary/multi_logs');
        $res->assertStatus(400);
        $this->assertSame([], CallSpFake::calls());

        CallSpFake::fake('EV_SP_Multi_Quick_Punch_Report', [[
            (object) ['Employee_Name' => 'Bob', 'Employee_Number' => '002', 'Department_Name' => 'IT',
                      'date' => '2026-07-10', 'duration_hr' => 9, 'render_hr' => 8,
                      'night_diff_hr' => 0, 'project_name' => 'ProjX'],
        ]]);
        $res = $this->actingAs($this->user)->getJson(
            '/api/report/dtr_summary/multi_logs?department_id=3&valid_from=2026-07-01&valid_to=2026-07-15');

        $res->assertStatus(200);
        $items = $res->json('content.dtrItems');
        $this->assertSame('ProjX', $items[0]['Project_Name']);
        $p = CallSpFake::callsFor('EV_SP_Multi_Quick_Punch_Report')[0]['params'];
        $this->assertSame(['2026-07-01', '2026-07-15', '3'], [$p[0], $p[1], $p[2]]);
        $this->assertSame($this->user->id, $p[4]);
    }

    /** @test */
    public function multi_logs_csv_export_downloads_file()
    {
        CallSpFake::fake('EV_SP_Multi_Quick_Punch_Report', [[]]);

        $res = $this->actingAs($this->user)
            ->get('/api/report/dtr_summary/multi_logs_export?department_id=3');

        $res->assertStatus(200);
        Excel::assertDownloaded('dtrmultilogssummary.csv', function (ExportDTRMultiLogsSummary $e) {
            return true;
        });
    }

    // ------------------------------------------------------- timeoff_allocation_report
    private function timeoffRow(array $overrides = [])
    {
        return (object) array_merge([
            'Sno' => 1, 'Employee_Name' => 'Cara', 'Employment_Status' => 'Regular',
            'Account' => 'ACC', 'HireDate' => '2020-01-01', 'PresentDays' => 20,
            'PrsentDays' => 20,                                  // the new-hire block reads this typo'd field
            'Paid_Leave' => 1, 'LWP_Leave' => 0, 'Max_Leave_Eligible' => 12,
            'Pre_LWP_Leave' => 0, 'Close_Leave_Balance' => 11,
        ], $overrides);
    }

    /** @test */
    public function timeoff_india_json_arm_returns_existing_and_new_hire_blocks()
    {
        CallSpFake::fake('EVOX_PAYROLL_REPORT',
            [[$this->timeoffRow()], [$this->timeoffRow(['Sno' => 2, 'Employee_Name' => 'Dan'])]]);

        $res = $this->actingAs($this->user)->getJson(
            '/api/report/timeoff_allocation?country=1&timeoff_month=7&timeoff_year=2026');

        $res->assertStatus(200);
        $this->assertSame('Cara', $res->json('content.timeoffItems.0.Employee_Name'));
        $this->assertSame('Dan', $res->json('content.timeoffItemsnew.0.Employee_Name'));
        $this->assertSame(1, $res->json('content.timeoffItemsnew.0.NewHire'));   // first new row flagged
        $this->assertSame(['7', '2026'],
            CallSpFake::callsFor('EVOX_PAYROLL_REPORT')[0]['params']);
    }

    /** @test */
    public function timeoff_india_export_arm_downloads_indian_payroll_csv()
    {
        CallSpFake::fake('EVOX_PAYROLL_REPORT', [[$this->timeoffRow()], []]);

        $res = $this->actingAs($this->user)->get(
            '/api/report/timeoff_allocation?country=1&timeoff_month=1&timeoff_year=2026&export=1');

        $res->assertStatus(200);
        Excel::assertDownloaded('IndianPayroll.csv', function (TimeoffAllocationExport $e) {
            return true;                                        // month-1==0 -> previous month December arm
        });
    }

    /** @test */
    public function timeoff_morocco_arms_json_and_export()
    {
        CallSpFake::fake('EH_SP_Morocco_DTR_Summary_Report', [[$this->timeoffRow()]]);

        $res = $this->actingAs($this->user)->getJson(
            '/api/report/timeoff_allocation?country=4&timeoff_month=7&timeoff_year=2026&department=3');
        $res->assertStatus(200);
        $this->assertCount(1, $res->json('content.reports'));
        $p = CallSpFake::callsFor('EH_SP_Morocco_DTR_Summary_Report')[0]['params'];
        $this->assertSame(['7', '2026', '3', 2], $p);

        $res = $this->actingAs($this->user)->get(
            '/api/report/timeoff_allocation?country=4&timeoff_month=7&timeoff_year=2026&department=3&export=1');
        $res->assertStatus(200);
        Excel::assertDownloaded('MoroccoPayroll.csv', function (TimeoffAllocationExport $e) {
            return true;
        });
    }

    // ------------------------------------------------------- getMoroccoPayrollParams
    /** @test */
    public function morocco_params_returns_department_month_year_blocks()
    {
        CallSpFake::fake('EH_SP_Morocco_DTR_Summary_Report', [
            [(object) ['department' => 'IT']],
            [(object) ['month' => 7]],
            [(object) ['year' => 2026]],
        ]);

        $res = $this->actingAs($this->user)->getJson('/api/report/get_morocco_payroll_params');

        $res->assertStatus(200);
        $this->assertSame('IT', $res->json('department.0.department'));
        $this->assertSame(7, $res->json('month.0.month'));
        $p = CallSpFake::callsFor('EH_SP_Morocco_DTR_Summary_Report')[0]['params'];
        $this->assertSame([null, null, null, 1], $p);
    }
}
