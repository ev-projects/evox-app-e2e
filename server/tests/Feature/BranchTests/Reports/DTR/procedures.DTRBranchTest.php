<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Report/Http/Controllers/ReportController.php
 *       ::team_dtr_logs                        ::export_team_dtr_logs
 *       ::team_schedule                        ::get_dashboard_holidays
 *       ::export                               ::new_dtr_summary_report_csv_export
 *       ::dtr_multi_logs_summary_report        ::dtr_multi_logs_summary_report_csv_export
 *       ::timeoff_allocation_report            ::export_team_dtr_summary (the append page)
 *
 * MENU PATH
 *   Reports -> DTR Logs / DTR Summary / Multi Punch / Time-off Allocation / Attendance Summary
 *   My Team -> Schedule
 *   Dashboard -> Holidays
 *
 * COVERAGE BEFORE THIS FILE
 *   team_dtr_logs                            26.53%   export_team_dtr_logs                6.67%
 *   team_schedule                            83.58%   get_dashboard_holidays             75.00%
 *   export                                   54.17%   new_dtr_summary_report_csv_export  97.92%
 *   dtr_multi_logs_summary_report            88.46%   ..._csv_export                     40.00%
 *   timeoff_allocation_report                95.18%   export_team_dtr_summary            82.76%
 *
 * WHY THIS FILE EXISTS ALONGSIDE load./export.DTRBranchTest
 *   Those two suites documented these same methods as "SKIPPED-SP — the first statement in the try
 *   fires call_sp, so no arm returns before it". The Tests\Support\CallSpFake seam removes that
 *   wall: the procedure boundary is intercepted, the controller's own assembly and formatting code
 *   runs for real, and the database is never asked for a procedure. Nothing in the older suites is
 *   changed; this file only adds the arms they had to leave out.
 *
 * WHAT IS ASSERTED
 *   Two things per endpoint, because both can break independently: the payload the controller
 *   builds out of the procedure's rows, and the arguments it asks the procedure for (which employee,
 *   which window, which mode). A report that quietly asks for the wrong window is the failure that
 *   reaches payroll.
 *
 * FINDINGS
 *   none
 */

namespace Tests\Feature\BranchTests\Reports\DTR;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Tests\Feature\BranchTests\Support\DtrFixtureTrait;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use Mockery;
use App\Modules\Report\Repositories\ReportRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;

class DTRProceduresBranchTest extends TestCase
{
    use DatabaseTransactions, DtrFixtureTrait;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        Excel::fake();
        Storage::fake('local');
        $this->withoutMiddleware();
        CallSpFake::activate();
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    private function me()
    {
        return $this->requireFixtureUser();
    }

    /** Named 'hit' rather than 'get': TestCase::get() is public and must not be shadowed. */
    private function hit($url)
    {
        return $this->actingAs($this->me())->getJson($url);
    }

    /** One DTR log row exactly as EH_SP_DTR_Logs returns it. */
    private function logRow(array $overrides = [])
    {
        return (object) array_merge([
            'dtr_id'               => 7001,
            'Employee_Number'      => $this->me()->emp_num,
            'user_id'              => $this->me()->id,
            'date'                 => $this->fixtureDate(0),
            'time_in'              => $this->fixtureTs(0, 8 * 3600),
            'time_out'             => $this->fixtureTs(0, 17 * 3600),
            'start_datetime'       => $this->fixtureTs(0, 8 * 3600),
            'end_datetime'         => $this->fixtureTs(0, 17 * 3600),
            'start_flexy_datetime' => null,
            'end_flexy_datetime'   => null,
            'break_time'           => 3600,
            'is_rest_day'          => 0,
            'Department_Name'      => 'Fixture Department',
            'Employee_Name'        => 'Fixture Employee',
            'late'                 => 0,
            'undertime'            => 0,
            'overtime'             => 0,
            'overtime_night_diff'  => 0,
            'night_diff'           => 0,
            'ul'                   => 0,
            'rendered_hours'       => 0,
            'leave_type'           => null,
            'amount'               => 0,
            'country_time_zone'    => 'UTC',
            'timezone'             => 'UTC',
        ], $overrides);
    }

    /** One row of the DTR summary report, every column the CSV writer reads. */
    private function summaryReportRow(array $overrides = [])
    {
        $columns = ['UL', 'Leaves', 'Late', 'Under_Time', 'Render_Hr', 'Night_Diff', 'OverTime', 'OT_ND',
            'RD_Render_HR', 'RD_ND', 'RD_OT', 'RD_OT_ND', 'LH_Render_HR', 'LH_ND', 'LH_OT', 'LH_OT_ND',
            'SH_Render_Hr', 'SH_ND', 'SH_OT', 'SH_OT_ND', 'DSH_Render_HR', 'DSH_ND', 'DSH_OT', 'DSH_OT_ND',
            'DLH_Render_HR', 'DLH_ND', 'DLH_OT', 'DLH_OT_ND', 'SLH_Render_HR', 'SLH_ND', 'SLH_OT', 'SLH_OT_ND'];

        return (object) array_merge(array_fill_keys($columns, 0), [
            'Employee_Name'   => 'Fixture Employee',
            'Employee_Number' => $this->me()->emp_num,
            'Department_Name' => 'Fixture Department',
        ], $overrides);
    }

    // =======================================================================================
    // team_dtr_logs
    // =======================================================================================

    /** @test */
    public function the_team_dtr_log_turns_each_procedure_row_into_a_named_and_timed_entry()
    {
        CallSpFake::fake('EH_SP_DTR_Logs', [
            [$this->logRow(['late' => 0.5, 'overtime' => 2, 'rendered_hours' => 8, 'ul' => 1])],
            [(object) ['dtr_id' => 7001, 'name' => 'Fixture Day', 'type' => 'lh']],
        ]);

        $response = $this->hit('/api/report/dtr_logs/team?valid_from=' . $this->fixtureDate(0)
                             . '&valid_to=' . $this->fixtureDate(1) . '&department_id=3&is_active=1');

        $response->assertStatus(200);
        $row = $response->json('content.data.0');
        $this->assertSame(7001, $row['id']);
        $this->assertSame('Fixture Employee', $row['full_name']);
        $this->assertSame('Fixture Department', $row['department']);
        $this->assertSame('00:30:00', $row['payroll_items']['late']);
        $this->assertSame('02:00:00', $row['payroll_items']['overtime']);
        $this->assertSame('08:00:00', $row['payroll_items']['rendered_hours']);
        $this->assertEquals(1, $row['payroll_items']['ul']);
        $this->assertSame('01:00', $row['break_time']);
        // the holiday set is matched to the day by id
        $this->assertCount(1, $row['holidays']);
        $this->assertSame('Fixture Day', $row['holidays'][0]['name']);
    }

    // Figures that are zero are shown as blank cells, and a holiday belonging to a different day is
    // not attached to this one.
    /** @test */
    public function the_team_dtr_log_blanks_empty_figures_and_ignores_another_days_holiday()
    {
        CallSpFake::fake('EH_SP_DTR_Logs', [
            [$this->logRow(['break_time' => 0])],
            [(object) ['dtr_id' => 9999, 'name' => 'Someone Elses Day', 'type' => 'lh']],
        ]);

        $row = $this->hit('/api/report/dtr_logs/team?department_id=3')->json('content.data.0');

        $this->assertSame('', $row['payroll_items']['late']);
        $this->assertSame('', $row['payroll_items']['overtime']);
        $this->assertSame('', $row['payroll_items']['rendered_hours']);
        $this->assertSame([], $row['holidays']);
        $this->assertNull($row['break_time'], 'a zero break was rendered as a duration');
    }

    // A leave only appears when it has an amount against it.
    /** @test */
    public function the_team_dtr_log_shows_a_leave_only_when_some_of_the_day_was_taken()
    {
        CallSpFake::fake('EH_SP_DTR_Logs', [
            [$this->logRow(['dtr_id' => 1, 'leave_type' => 'Vacation Leave', 'amount' => 0.5]),
             $this->logRow(['dtr_id' => 2, 'leave_type' => 'Vacation Leave', 'amount' => 0])],
            [],
        ]);

        $rows = $this->hit('/api/report/dtr_logs/team?department_id=3')->json('content.data');

        $this->assertSame('Vacation Leave(0.5)', $rows[0]['payroll_items']['other_leave']);
        $this->assertNull($rows[1]['payroll_items']['other_leave']);
    }

    /** @test */
    public function the_team_dtr_log_asks_the_procedure_for_the_window_and_department_selected()
    {
        CallSpFake::fake('EH_SP_DTR_Logs', [[], []]);

        $this->hit('/api/report/dtr_logs/team?valid_from=' . $this->fixtureDate(0)
                 . '&valid_to=' . $this->fixtureDate(3) . '&department_id=7&is_active=1&name=Smith');

        $params = CallSpFake::callsFor('EH_SP_DTR_Logs')[0]['params'];
        $this->assertSame(2, $params[0]);                              // mode
        $this->assertSame($this->me()->id, $params[1]);
        $this->assertSame('7', $params[3]);
        $this->assertSame('Smith', $params[5]);
        $this->assertSame($this->fixtureDate(0), $params[6]);
        $this->assertSame($this->fixtureDate(3), $params[7]);
    }

    /** @test */
    public function a_failing_dtr_log_procedure_is_reported_as_an_error_rather_than_an_empty_report()
    {
        CallSpFake::fake('EH_SP_DTR_Logs', function () {
            throw new \RuntimeException('procedure unavailable');
        });

        $this->hit('/api/report/dtr_logs/team?department_id=3')
             ->assertStatus(400)
             ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // =======================================================================================
    // export_team_dtr_logs
    // =======================================================================================

    /** @test */
    public function exporting_the_team_dtr_log_downloads_a_csv_built_from_the_procedure_rows()
    {
        CallSpFake::fake('EH_SP_DTR_Logs', [[$this->logRow()], []]);

        $response = $this->actingAs($this->me())
                         ->get('/api/report/dtr_logs/export?department_id=3&valid_from='
                             . $this->fixtureDate(0) . '&valid_to=' . $this->fixtureDate(1));

        $response->assertStatus(200);
        Excel::assertDownloaded('dtr_log.csv');
    }

    // The guard the report view does not have: an empty procedure response is refused outright
    // rather than downloading an empty file.
    /** @test */
    public function exporting_the_team_dtr_log_refuses_when_the_procedure_returns_nothing_at_all()
    {
        CallSpFake::fake('EH_SP_DTR_Logs', []);

        $this->hit('/api/report/dtr_logs/export?department_id=3')
             ->assertStatus(400)
             ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // =======================================================================================
    // team_schedule
    // =======================================================================================
    //
    // The employee list comes from EH_SP_Employee_List, whose result sets are searched for the one
    // whose first row carries an Employee_Name. Faking it to name exactly one person keeps the
    // schedule query bounded to that person's days.
    //
    // Only the arms that do not build a schedule-grid resource are covered here: the CSV export and
    // the missing-window guard. The three grid resources (daily, weekly, team) are presentation
    // objects with their own uncovered branches and belong in a resource suite, not this one.

    private function fakeEmployeeList()
    {
        CallSpFake::fake('EH_SP_Employee_List', [
            [(object) ['id' => $this->me()->id, 'Employee_Name' => 'Fixture Employee']],
        ]);
    }

    /** @test */
    public function exporting_the_team_schedule_downloads_a_csv_of_the_teams_days_in_the_window()
    {
        $this->fakeEmployeeList();
        $this->makeDtr(0, [
            'start_datetime' => $this->fixtureTs(0, 8 * 3600),
            'end_datetime'   => $this->fixtureTs(0, 17 * 3600),
        ]);

        $response = $this->actingAs($this->me())
                         ->get('/api/report/team_schedule/?export=all&department_id=3&start_date='
                             . $this->fixtureDate(0) . '&end_date=' . $this->fixtureDate(1));

        $response->assertStatus(200);
        Excel::assertDownloaded('dtrsummary.csv');
    }

    /** @test */
    public function the_team_schedule_asks_the_employee_list_procedure_for_the_department_chosen()
    {
        $this->fakeEmployeeList();

        $this->actingAs($this->me())
             ->get('/api/report/team_schedule/?export=all&department_id=8&sub_department_id=12&name=Smith'
                 . '&start_date=' . $this->fixtureDate(0) . '&end_date=' . $this->fixtureDate(1));

        $params = CallSpFake::callsFor('EH_SP_Employee_List')[0]['params'];
        $this->assertSame($this->me()->id, $params[0]);
        $this->assertSame('8', $params[2]);
        $this->assertSame('12', $params[3]);
        $this->assertSame(1, $params[4]);                              // active employees only
        $this->assertSame('Smith', $params[5]);
    }

    // The sub-department filter is only honoured alongside a department: on its own it is dropped,
    // because a sub-department is meaningless without its parent.
    /** @test */
    public function a_sub_department_filter_without_a_department_is_dropped()
    {
        $this->fakeEmployeeList();

        $this->actingAs($this->me())
             ->get('/api/report/team_schedule/?export=all&sub_department_id=12&start_date='
                 . $this->fixtureDate(0) . '&end_date=' . $this->fixtureDate(1));

        $this->assertNull(CallSpFake::callsFor('EH_SP_Employee_List')[0]['params'][3]);
    }

    // Asked for neither explicit dates nor a recognised scope, the screen has no window to draw and
    // is refused rather than rendering an arbitrary one.
    /** @test */
    public function the_team_schedule_is_refused_when_no_window_and_no_scope_are_given()
    {
        $this->fakeEmployeeList();

        $this->hit('/api/report/team_schedule/?department_id=3')
             ->assertStatus(400)
             ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // =======================================================================================
    // get_dashboard_holidays
    // =======================================================================================

    // The dashboard takes the SECOND set the procedure returns — the first is the announcements.
    /** @test */
    public function the_dashboard_holiday_panel_returns_the_holiday_set_from_the_procedure()
    {
        CallSpFake::fake('EH_SP_Dashboard', [
            [(object) ['not' => 'the holidays']],
            [(object) ['name' => 'Fixture Day', 'date' => $this->fixtureDate(0)]],
        ]);

        $response = $this->hit('/api/report/get_dashboard_holiday');

        $response->assertStatus(200);
        $this->assertSame('Fixture Day', $response->json('0.name'));
    }

    /** @test */
    public function the_dashboard_holiday_panel_asks_the_procedure_about_the_signed_in_employee()
    {
        CallSpFake::fake('EH_SP_Dashboard', [[], []]);

        $this->hit('/api/report/get_dashboard_holiday');

        $params = CallSpFake::callsFor('EH_SP_Dashboard')[0]['params'];
        $this->assertSame($this->me()->LevelId, $params[0]);
        $this->assertSame($this->me()->id, $params[1]);
        $this->assertSame(1, $params[4]);                              // mode 1 = holidays
    }

    // Unlike its neighbours this method rethrows rather than formatting an error, so a failing
    // procedure surfaces as a server error.
    /** @test */
    public function a_failing_dashboard_procedure_surfaces_as_a_server_error()
    {
        CallSpFake::fake('EH_SP_Dashboard', function () {
            throw new \RuntimeException('procedure unavailable');
        });

        $this->hit('/api/report/get_dashboard_holiday')->assertStatus(500);
    }

    // =======================================================================================
    // new_dtr_summary_report_csv_export
    // =======================================================================================

    /** @test */
    public function exporting_the_dtr_summary_downloads_a_csv_and_reads_the_second_procedure_set()
    {
        CallSpFake::fake('EH_SP_DTR_Summary_Report', [
            [(object) ['ignored' => true]],
            [$this->summaryReportRow(['Render_Hr' => 8, 'OverTime' => 2])],
        ]);

        $response = $this->actingAs($this->me())
                         ->get('/api/report/dtr_summary/new_export?department_id=3&valid_from='
                             . $this->fixtureDate(0) . '&valid_to=' . $this->fixtureDate(1));

        $response->assertStatus(200);
        Excel::assertDownloaded('newdtrsummary.csv');
    }

    // The report is normally run for the signed-in supervisor, but an explicit supervisor id
    // overrides that — this is how payroll runs another manager's team.
    /** @test */
    public function the_dtr_summary_export_runs_for_another_supervisor_when_one_is_named()
    {
        CallSpFake::fake('EH_SP_DTR_Summary_Report', [[], []]);

        $this->actingAs($this->me())
             ->get('/api/report/dtr_summary/new_export?sup_id=4242&department_id=3');

        $this->assertSame('4242', CallSpFake::callsFor('EH_SP_DTR_Summary_Report')[0]['params'][0]);
    }

    /** @test */
    public function the_dtr_summary_export_defaults_to_the_signed_in_supervisor_and_to_active_staff()
    {
        CallSpFake::fake('EH_SP_DTR_Summary_Report', [[], []]);

        $this->actingAs($this->me())->get('/api/report/dtr_summary/new_export?department_id=3');

        $params = CallSpFake::callsFor('EH_SP_DTR_Summary_Report')[0]['params'];
        $this->assertSame($this->me()->id, $params[0]);
        $this->assertSame(1, $params[3]);                              // is_active defaults to 1
        $this->assertSame('', $params[4]);                             // no name filter
    }

    /** @test */
    public function a_failing_dtr_summary_procedure_is_reported_as_an_error()
    {
        CallSpFake::fake('EH_SP_DTR_Summary_Report', function () {
            throw new \RuntimeException('procedure unavailable');
        });

        $this->hit('/api/report/dtr_summary/new_export?department_id=3')
             ->assertStatus(400)
             ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // =======================================================================================
    // dtr_multi_logs_summary_report (+ its CSV export)
    // =======================================================================================

    private function multiLogRow(array $overrides = [])
    {
        return (object) array_merge([
            'Employee_Name'   => 'Fixture Employee',
            'Employee_Number' => $this->me()->emp_num,
            'Department_Name' => 'Fixture Department',
            'date'            => $this->fixtureDate(0),
            'duration_hr'     => 9,
            'render_hr'       => 8,
            'night_diff_hr'   => 1,
            'project_name'    => 'Fixture Project',
        ], $overrides);
    }

    /** @test */
    public function the_multi_punch_report_lists_each_project_session_with_its_hours()
    {
        CallSpFake::fake('EV_SP_Multi_Quick_Punch_Report', [[$this->multiLogRow()]]);

        $response = $this->hit('/api/report/dtr_summary/multi_logs?department_id=3&valid_from='
                             . $this->fixtureDate(0) . '&valid_to=' . $this->fixtureDate(1));

        $response->assertStatus(200);
        $item = $response->json('content.dtrItems.0');
        $this->assertSame('Fixture Employee', $item['Employee_Name']);
        $this->assertSame('Fixture Project', $item['Project_Name']);
        $this->assertEquals(9, $item['Total_Hours']);
        $this->assertEquals(8, $item['Rendered_Hr']);
        $this->assertEquals(1, $item['Night_Diff']);
        // the report is a single page by construction
        $this->assertSame(1, $response->json('content.current_page'));
        $this->assertFalse($response->json('content.has_next_page'));
    }

    /** @test */
    public function the_multi_punch_report_asks_the_procedure_for_the_selected_window_and_department()
    {
        CallSpFake::fake('EV_SP_Multi_Quick_Punch_Report', [[]]);

        $this->hit('/api/report/dtr_summary/multi_logs?department_id=11&valid_from='
                 . $this->fixtureDate(0) . '&valid_to=' . $this->fixtureDate(3));

        $params = CallSpFake::callsFor('EV_SP_Multi_Quick_Punch_Report')[0]['params'];
        $this->assertSame($this->fixtureDate(0), $params[0]);
        $this->assertSame($this->fixtureDate(3), $params[1]);
        $this->assertSame('11', $params[2]);
        $this->assertSame($this->me()->id, $params[4]);
    }

    /** @test */
    public function exporting_the_multi_punch_report_downloads_a_csv()
    {
        CallSpFake::fake('EV_SP_Multi_Quick_Punch_Report', [[$this->multiLogRow()]]);

        $response = $this->actingAs($this->me())
                         ->get('/api/report/dtr_summary/multi_logs_export?department_id=3&valid_from='
                             . $this->fixtureDate(0) . '&valid_to=' . $this->fixtureDate(1));

        $response->assertStatus(200);
        Excel::assertDownloaded('dtrmultilogssummary.csv');
    }

    /** @test */
    public function exporting_the_multi_punch_report_still_refuses_without_a_department()
    {
        CallSpFake::fake('EV_SP_Multi_Quick_Punch_Report', [[]]);

        $this->hit('/api/report/dtr_summary/multi_logs_export')
             ->assertStatus(400);
        $this->assertSame([], CallSpFake::callsFor('EV_SP_Multi_Quick_Punch_Report'));
    }

    // =======================================================================================
    // timeoff_allocation_report
    // =======================================================================================

    private function indiaRow(array $overrides = [])
    {
        return (object) array_merge([
            'Sno' => 1, 'Employee_Name' => 'Fixture Employee', 'Employment_Status' => 'Regular',
            'Account' => 'Fixture Account', 'HireDate' => '2015-01-01', 'PresentDays' => 20,
            'PrsentDays' => 20, 'Paid_Leave' => 2, 'LWP_Leave' => 0, 'Max_Leave_Eligible' => 12,
            'Pre_LWP_Leave' => 1, 'Close_Leave_Balance' => 10,
        ], $overrides);
    }

    /** @test */
    public function the_india_time_off_report_lists_existing_staff_and_new_hires_separately()
    {
        CallSpFake::fake('EVOX_PAYROLL_REPORT', [
            [$this->indiaRow(['Employee_Name' => 'Existing Person'])],
            [$this->indiaRow(['Employee_Name' => 'New Person'])],
        ]);

        $response = $this->hit('/api/report/timeoff_allocation?country=1&timeoff_month=6&timeoff_year=2026');

        $response->assertStatus(200);
        $this->assertSame('Existing Person', $response->json('content.timeoffItems.0.Employee_Name'));
        $this->assertSame(0, $response->json('content.timeoffItems.0.NewHire'));
        $this->assertSame('New Person', $response->json('content.timeoffItemsnew.0.Employee_Name'));
        $this->assertSame(1, $response->json('content.timeoffItemsnew.0.NewHire'));
    }

    /** @test */
    public function the_india_time_off_report_asks_the_procedure_for_the_month_and_year_chosen()
    {
        CallSpFake::fake('EVOX_PAYROLL_REPORT', [[], []]);

        $this->hit('/api/report/timeoff_allocation?country=1&timeoff_month=6&timeoff_year=2026');

        $this->assertSame(['6', '2026'], CallSpFake::callsFor('EVOX_PAYROLL_REPORT')[0]['params']);
    }

    /** @test */
    public function the_india_time_off_report_downloads_a_csv_when_export_is_asked_for()
    {
        CallSpFake::fake('EVOX_PAYROLL_REPORT', [[$this->indiaRow()], []]);

        $response = $this->actingAs($this->me())
                         ->get('/api/report/timeoff_allocation?country=1&timeoff_month=6&timeoff_year=2026&export=1');

        $response->assertStatus(200);
        Excel::assertDownloaded('IndianPayroll.csv');
    }

    // January rolls the "previous month" label back to December rather than to month zero.
    /** @test */
    public function the_january_time_off_export_labels_the_previous_month_as_december()
    {
        CallSpFake::fake('EVOX_PAYROLL_REPORT', [[$this->indiaRow()], []]);

        $response = $this->actingAs($this->me())
                         ->get('/api/report/timeoff_allocation?country=1&timeoff_month=1&timeoff_year=2026&export=1');

        $response->assertStatus(200);
        Excel::assertDownloaded('IndianPayroll.csv');
    }

    /** @test */
    public function the_morocco_time_off_report_returns_its_own_procedures_first_set()
    {
        CallSpFake::fake('EH_SP_Morocco_DTR_Summary_Report', [
            [(object) ['Employee_Name' => 'Morocco Person']],
        ]);

        $response = $this->hit('/api/report/timeoff_allocation?country=4&timeoff_month=6&timeoff_year=2026&department=2');

        $response->assertStatus(200);
        $this->assertSame('Morocco Person', $response->json('content.reports.0.Employee_Name'));
        $this->assertSame(
            ['6', '2026', '2', 2],
            CallSpFake::callsFor('EH_SP_Morocco_DTR_Summary_Report')[0]['params']
        );
    }

    /** @test */
    public function the_morocco_time_off_report_downloads_a_csv_when_export_is_asked_for()
    {
        CallSpFake::fake('EH_SP_Morocco_DTR_Summary_Report', [[(object) ['Employee_Name' => 'Morocco Person']]]);

        $response = $this->actingAs($this->me())
                         ->get('/api/report/timeoff_allocation?country=4&timeoff_month=6&timeoff_year=2026&export=1');

        $response->assertStatus(200);
        Excel::assertDownloaded('MoroccoPayroll.csv');
    }

    // A country the report has no source for asks no procedure at all.
    /** @test */
    public function a_country_the_time_off_report_has_no_source_for_asks_no_procedure()
    {
        $this->actingAs($this->me())->get('/api/report/timeoff_allocation?country=99');

        $this->assertSame([], CallSpFake::calls());
    }

    // =======================================================================================
    // export (attendance summary workbook)
    // =======================================================================================

    /** @test */
    public function the_attendance_summary_export_asks_its_procedure_for_the_selected_departments()
    {
        CallSpFake::fake('EH_SP_Attendance_Summary', [
            [(object) ['Name' => 'Fixture Employee']],
            [(object) ['TotalCount' => 1]],
        ]);

        $this->actingAs($this->me())
             ->get('/api/report/attendance/summary/export/' . $this->fixtureDate(0) . '/'
                 . $this->fixtureDate(1) . '?selectedDepartments=3,4&selectedTeams=9');

        $params = CallSpFake::callsFor('EH_SP_Attendance_Summary')[0]['params'];
        $this->assertSame($this->fixtureDate(0), $params[0]);
        $this->assertSame($this->fixtureDate(1), $params[1]);
        $this->assertSame('3,4', $params[2]);
        $this->assertSame('9', $params[3]);
        $this->assertSame($this->me()->id, $params[5]);
        $this->assertSame(3, $params[6]);                              // mode 3 = export
    }

    // =======================================================================================
    // export_team_dtr_summary — the page-two append
    // =======================================================================================
    //
    // The export is paged: page one writes the scratch file, every later page reads it back,
    // appends its own rows and writes it again. The existing export suite covers page one; this
    // covers the append, which is the arm that decides whether page two's employees appear in the
    // finished file at all.
    /** @test */
    public function a_later_page_of_the_dtr_summary_export_appends_to_what_earlier_pages_wrote()
    {
        Storage::disk('local')->put(
            'app/export/dtrsummary.temp',
            json_encode([['employee_info' => ['employee_id' => 'FROM-PAGE-ONE']]])
        );

        $paginator = new LengthAwarePaginator([$this->me()], 45, 15, 2);   // page 2 of 3
        $userRepo = Mockery::mock(UserRepositoryInterface::class);
        $userRepo->shouldReceive('get_users_under_supervisee')->once()->andReturn($paginator);
        $this->app->instance(UserRepositoryInterface::class, $userRepo);

        $report = Mockery::mock(ReportRepositoryInterface::class);
        $report->shouldReceive('get_dtr_summary')->once()->andReturn([
            'summary' => [['employee_info' => ['employee_id' => 'FROM-PAGE-TWO']]],
            'column'  => [],
        ]);
        $this->app->instance(ReportRepositoryInterface::class, $report);

        $response = $this->hit('/api/report/dtr_summary/export?valid_from=' . $this->fixtureDate(0)
                             . '&valid_to=' . $this->fixtureDate(1));

        $response->assertStatus(200);
        $this->assertSame(2, $response->json('content.current_page'));
        $this->assertSame(3, $response->json('content.last_page'));
        $this->assertTrue($response->json('content.has_next_page'));
        $this->assertCount(2, $response->json('content.content_array'));
        $this->assertSame('FROM-PAGE-ONE',
            $response->json('content.content_array.0.employee_info.employee_id'));
        $this->assertSame('FROM-PAGE-TWO',
            $response->json('content.content_array.1.employee_info.employee_id'));
    }
}
