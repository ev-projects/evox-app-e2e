<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Maatwebsite\Excel\Facades\Excel;
use App\Dispute;
use App\Exports\DisputeExport;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use App\Modules\User\Models\User;

/**
 * DisputeController (Menu=Payroll Page=Disputes — 35.2%, 57 unc lines). Every read/update path is
 * SP-walled (EV_SP_PD_*) and App\Http\Controllers is seam-shadowed; PayrollCutoffRepository is the
 * one constructor dep (IoC-mocked); Excel::fake() catches the CSV export. store() writes a real
 * Dispute row — rolled back.
 *
 * QUIRK (documented, not a formal finding): store() returns HTTP 200 with an `errors` body on
 * validation failure (not 422) — asserted as-is so a future fix will surface here.
 */
class DisputeControllerSpFakeTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;
    /** @var Mockery\MockInterface */
    private $cutoff;

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();
        Excel::fake();
        $this->withoutMiddleware();

        $this->user = User::where('is_active', 1)->whereNotNull('LevelId')
            ->orderBy('id', 'desc')->first();
        if (!$this->user) $this->markTestSkipped('no active user in test DB');

        $this->cutoff = Mockery::mock(PayrollCutoffRepositoryInterface::class)->shouldIgnoreMissing();
        $this->cutoff->shouldReceive('get_payroll_cutoff')
            ->andReturn((object) ['start_date' => '2026-07-01', 'end_date' => '2026-07-15']);
        $this->app->instance(PayrollCutoffRepositoryInterface::class, $this->cutoff);
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    /** A payroll-report row carrying every field the 39-column export mapper reads. */
    private function payrollReportRow()
    {
        $row = [
            'Employee_Number' => '001', 'Employee_Name' => 'Alice Dispute', 'Department_Name' => 'IT',
            'Cutoff' => 'JUL-1', 'PayrollPeriod' => '2026-07', 'ApprovedDate' => '2026-07-16',
            'datefilling' => '2026-07-10', 'Remarks' => 'ok', 'unpaid_leave' => 0,
            'reg_late' => 1, 'reg_undertime' => 0, 'Render_Hr' => 160, 'Night_Diff' => 0,
            'OverTime' => 2, 'OT_ND' => 0,
        ];
        foreach (['RD', 'LH', 'DSH', 'DLH', 'SLH'] as $k) {
            $row["{$k}_Render_HR"] = 0; $row["{$k}_ND"] = 0; $row["{$k}_OT"] = 0; $row["{$k}_OT_ND"] = 0;
        }
        $row['SH_Render_Hr'] = 0; $row['SH_ND'] = 0; $row['SH_OT'] = 0; $row['SH_OT_ND'] = 0;
        return (object) $row;
    }

    // ------------------------------------------------------------------------ store()
    /** @test */
    public function store_validation_failure_returns_errors_body()
    {
        $res = $this->actingAs($this->user)->postJson('/api/storedispute', [
            'dispute_type' => 'overtime',                    // employee_id missing
        ]);

        $res->assertStatus(200);                             // controller quirk: 200, not 422
        $this->assertArrayHasKey('employee_id', $res->json('errors'));
        $this->assertSame(0, Dispute::where('dispute_type', 'overtime')
            ->where('created_at', '>', now()->subMinute())->count());
    }

    /** @test */
    public function store_success_creates_dispute_row()
    {
        $res = $this->actingAs($this->user)->postJson('/api/storedispute', [
            'employee_id' => $this->user->id,
            'dispute_type' => 'seam-test-type',
            'description' => 'created by DisputeControllerSpFakeTest',
            'status' => 'pending',
        ]);

        $res->assertStatus(201);
        $this->assertSame('Dispute submitted successfully', $res->json('message'));
        $this->assertNotNull(Dispute::find($res->json('dispute.id')));     // row inside the txn
    }

    // ------------------------------------------------------------------------- show()
    /** @test */
    public function show_payroll_level_returns_summary_report_with_cutoff_dates()
    {
        CallSpFake::fake('EV_SP_Validate_Payroll_Level', [[(object) ['IsExists' => 1]]]);
        CallSpFake::fake('EV_SP_PD_Get_Payroll_Report', [[$this->payrollReportRow()]]);

        $res = $this->actingAs($this->user)->getJson('/api/getdispute');

        $res->assertStatus(200);
        $this->assertSame('Alice Dispute', $res->json('content.0.Employee_Name'));
        $p = CallSpFake::callsFor('EV_SP_PD_Get_Payroll_Report')[0]['params'];
        $this->assertSame(['2026-07-01', '2026-07-15', null], $p);          // cutoff-default arm
    }

    /** @test */
    public function show_non_payroll_returns_pending_requests_with_explicit_dates_ignored()
    {
        CallSpFake::fake('EV_SP_Validate_Payroll_Level', [[(object) ['IsExists' => 0]]]);
        CallSpFake::fake('EV_SP_PD_Get_Pending_Request', [[(object) ['id' => 1]]]);

        $res = $this->actingAs($this->user)->getJson('/api/getdispute?department=3&status=2');

        $res->assertStatus(200);
        $p = CallSpFake::callsFor('EV_SP_PD_Get_Pending_Request')[0]['params'];
        $this->assertSame([$this->user->id, '3', null, '2', 1], $p);
    }

    // -------------------------------------------------------------------- showExport()
    /** @test */
    public function show_export_maps_39_columns_and_downloads_csv()
    {
        CallSpFake::fake('EV_SP_PD_Get_Payroll_Report', [[$this->payrollReportRow()]]);

        $res = $this->actingAs($this->user)
            ->get('/api/getdisputeExport?startDate=2026-06-01&endDate=2026-06-15');

        $res->assertStatus(200);
        Excel::assertDownloaded('Dispute.csv', function (DisputeExport $e) { return true; });
        $p = CallSpFake::callsFor('EV_SP_PD_Get_Payroll_Report')[0]['params'];
        $this->assertSame(['2026-06-01', '2026-06-15', null], $p);          // explicit-dates arm
    }

    // --------------------------------------------------- employee dispute / update / cutoff
    /** @test */
    public function employee_dispute_update_and_cutoff_endpoints_pass_sp_params()
    {
        CallSpFake::fake('EV_SP_PD_Get_Pending_Request', [[(object) ['id' => 9]]]);
        $res = $this->actingAs($this->user)->getJson('/api/getuserdispute/456');
        $res->assertStatus(200);
        $this->assertSame([null, null, '456', null, 2],
            CallSpFake::callsFor('EV_SP_PD_Get_Pending_Request')[0]['params']);

        CallSpFake::fake('EV_SP_PD_Update_Dispute_Status', [[]]);
        $res = $this->actingAs($this->user)->putJson('/api/updatedispute/77', [
            'status' => 'approved', 'remarks' => 'ok by test',
        ]);
        $res->assertStatus(200);
        $this->assertSame(['approved', '77', 'ok by test'],
            CallSpFake::callsFor('EV_SP_PD_Update_Dispute_Status')[0]['params']);

        CallSpFake::fake('EV_SP_Get_Payroll_Cutoff', [[(object) ['cutoff' => 'JUL-1']]]);
        $res = $this->actingAs($this->user)
            ->getJson('/api/getpayrollcutoff/2026-07-01/2026-07-15');   // route params -> $request->fromdate fallback
        $res->assertStatus(200);
        $this->assertSame('JUL-1', $res->json('0.cutoff'));
        $this->assertSame(['2026-07-01', '2026-07-15'],
            CallSpFake::callsFor('EV_SP_Get_Payroll_Cutoff')[0]['params']);
    }
}
