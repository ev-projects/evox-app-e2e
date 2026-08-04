<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for DisputeController read arms. Menu=Requests Page=Disputes.
 *
 * Top-level controller App\Http\Controllers\DisputeController. This file covers the read/load
 * routes (show / showExport / getEmployeeDispute / getpayrollcutoff). All SP calls in this
 * controller are READ-ONLY; DatabaseTransactions rolls back any incidental state. Each test is
 * authored with valid bounded inputs so the SP runs on the live-dump DB without writes.
 *
 * DEPENDENCY: DisputeController constructor takes PayrollCutoffRepositoryInterface. All tests
 * bind a bare mock via IoC so the controller instantiates. show() and showExport() use the
 * mock for the cutoff resolution; other methods ignore it.
 *
 * Routes (mounted under /api, middleware jwtauth + auth.apikey):
 *   GET /api/getdispute                            -> show()              [EV_SP_Validate_Payroll_Level + EV_SP_PD_Get_Pending_Request]
 *   GET /api/getdisputeExport                      -> showExport()        [EV_SP_PD_Get_Payroll_Report + Excel download]
 *   GET /api/getuserdispute/{id}                   -> getEmployeeDispute()[EV_SP_PD_Get_Pending_Request]
 *   GET /api/getpayrollcutoff/{fromdate}/{todate}  -> getpayrollcutoff()  [EV_SP_Get_Payroll_Cutoff]
 *
 * FINDINGS:
 *  // FINDING: DisputeController never imports Exception (namespace App\Http\Controllers, no `use Exception;`).
 *             Every catch(Exception $e) is dead — any throwable escapes as uncaught 500 rather than error_response.
 *  // FINDING (show): EV_SP_Validate_Payroll_Level and the downstream SP calls are all OUTSIDE the try/catch,
 *             so an SP failure would be uncaught even if the catch were live.
 *  // FINDING (getpayrollcutoff): the SP call is OUTSIDE the try/catch for the same reason.
 *
 * SPs used here are all read-only:
 *   EV_SP_Validate_Payroll_Level   — checks user payroll level (returns IsExists flag)
 *   EV_SP_PD_Get_Pending_Request   — reads dispute/pending-request list for a user
 *   EV_SP_PD_Get_Payroll_Report    — reads payroll dispute summary (start_date, end_date)
 *   EV_SP_Get_Payroll_Cutoff       — reads payroll cutoff info for a date range
 */

namespace Tests\Feature\BranchTests\Requests\Disputes;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Maatwebsite\Excel\Facades\Excel;
use App\Modules\User\Models\User;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;

class DisputesLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        Excel::fake();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestIncomplete('no user in test DB');
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function mockDep(string $iface): \Mockery\MockInterface
    {
        $m = Mockery::mock($iface);
        $this->app->instance($iface, $m);
        return $m;
    }

    // -------------------------------------------------------------------- show()
    // EV_SP_Validate_Payroll_Level($user_id): non-payroll users → IsExists=0 → else arm →
    // EV_SP_PD_Get_Pending_Request($user_id, null, null, 0, 1) → list → success_response 200.
    // SP calls are OUTSIDE the try/catch (see FINDING above).
    /** @test */
    public function show__load__non_payroll_user__ok_200()
    {
        // FINDING: SPs are outside try; catch(Exception) is dead. SP success → success_response 200.
        $this->mockDep(PayrollCutoffRepositoryInterface::class); // constructor dep; unused in show()

        $res = $this->getJson('/api/getdispute');

        $this->assertNotEquals(500, $res->status(), 'EV_SP_Validate_Payroll_Level + EV_SP_PD_Get_Pending_Request must run without 500');
        $res->assertStatus(200);
    }

    // ---------------------------------------------------------------- showExport()
    // PayrollCutoffRepositoryInterface mock returns bounded dates → EV_SP_PD_Get_Payroll_Report →
    // builds $results array → Excel::download (intercepted by Excel::fake()) → 200.
    /** @test */
    public function showExport__load__bounded_dates__ok_200()
    {
        $cutoffMock = $this->mockDep(PayrollCutoffRepositoryInterface::class);
        $cutoffMock->shouldReceive('get_payroll_cutoff')->andReturn(
            (object) ['start_date' => '2026-03-01', 'end_date' => '2026-03-31']
        );

        $res = $this->get('/api/getdisputeExport');

        $this->assertNotEquals(500, $res->getStatusCode(), 'EV_SP_PD_Get_Payroll_Report + Excel download must not yield 500');
    }

    // ------------------------------------------------------------ getEmployeeDispute()
    // EV_SP_PD_Get_Pending_Request(null, null, $request->id, null, 2): returns disputes for the given id.
    // Passing id as query param since $request->id reads from input (not route segment in L5.7).
    /** @test */
    public function getEmployeeDispute__load__valid_user_id__ok_200()
    {
        $this->mockDep(PayrollCutoffRepositoryInterface::class); // constructor dep; unused here

        $res = $this->getJson('/api/getuserdispute/' . $this->user->id . '?id=' . $this->user->id);

        $this->assertNotEquals(500, $res->status(), 'EV_SP_PD_Get_Pending_Request (mode 2) must run without 500');
        $res->assertStatus(200);
    }

    // ------------------------------------------------------------ getpayrollcutoff()
    // EV_SP_Get_Payroll_Cutoff($fromdate, $todate): read-only. In L5.7 route params merge into request
    // input, so $request->fromdate / $request->todate resolve from the URL segments.
    /** @test */
    public function getpayrollcutoff__load__valid_dates__ok_200()
    {
        $this->mockDep(PayrollCutoffRepositoryInterface::class); // constructor dep; unused here

        // SP: EV_SP_Get_Payroll_Cutoff('2026-03-01', '2026-03-31'). SP call is OUTSIDE try (FINDING).
        $res = $this->getJson('/api/getpayrollcutoff/2026-03-01/2026-03-31');

        $this->assertNotEquals(500, $res->status(), 'EV_SP_Get_Payroll_Cutoff must run without 500');
        $res->assertStatus(200);
    }
}
