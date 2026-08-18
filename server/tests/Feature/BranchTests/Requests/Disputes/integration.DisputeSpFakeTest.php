<?php
/**
 * SOURCE UNDER TEST: app/Http/Controllers/DisputeController.php
 * MENU PATH:         Payroll -> Disputes (and Requests -> My Disputes)
 * MEASURED COVERAGE AT AUTHORING (lines-%): store 75, show 83.33, showExport 96.08,
 *   getEmployeeDispute 60, UpdateDispute 60, getpayrollcutoff 60.
 *
 * FINDINGS:
 *  // FINDING (already registered, not re-reported): every `catch (Exception $e)` in this controller
 *     is dead. DisputeController is in namespace App\Http\Controllers and does NOT `use Exception;`,
 *     so the caught type is the non-existent App\Http\Controllers\Exception. That is the whole of
 *     the residual uncovered surface in store/getEmployeeDispute/UpdateDispute/getpayrollcutoff:
 *     those lines cannot execute. A stored-procedure failure therefore escapes as an uncaught 500
 *     instead of the intended 400. Characterised once below (*_FINDING_DEAD_CATCH).
 *
 * NET-NEW COMPLEMENT to Unit\Repositories\DisputeControllerSpFakeTest.php, which covers the happy
 * paths of every method. This file adds the arms it left: the empty-export arm, the geo filter,
 * the remaining store() validation rules, UpdateDispute's null-remarks default, and the dead-catch
 * characterisation. All stored procedures go through CallSpFake; the CSV export is Excel::fake()d.
 */

namespace Tests\Feature\BranchTests\Requests\Disputes;

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

class DisputeSpFakeIntegrationTest extends TestCase
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

        $this->user = User::where('is_active', 1)->whereNotNull('LevelId')
            ->orderBy('id', 'desc')->first();
        if (!$this->user) {
            $this->markTestSkipped('no active user in test DB');
        }
        $this->actingAs($this->user);

        $cutoff = Mockery::mock(PayrollCutoffRepositoryInterface::class)->shouldIgnoreMissing();
        $cutoff->shouldReceive('get_payroll_cutoff')
            ->andReturn((object) ['start_date' => '2026-08-01', 'end_date' => '2026-08-15']);
        $this->app->instance(PayrollCutoffRepositoryInterface::class, $cutoff);
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    // ===================================================================== store()

    // employee_id must name a real user — a dangling id is refused and nothing is written.
    /** @test */
    public function filing_a_dispute_against_a_non_existent_employee_is_refused()
    {
        $res = $this->postJson('/api/storedispute', [
            'employee_id'  => 999999999,
            'dispute_type' => 'overtime',
        ]);

        $this->assertArrayHasKey('employee_id', $res->json('errors'));
        $this->assertSame(0, Dispute::where('employee_id', 999999999)->count());
    }

    // dispute_type is capped at 50 characters and status at 20; both are refused without a write.
    /** @test */
    public function a_dispute_type_or_status_over_its_length_limit_is_refused()
    {
        $overlongType = str_repeat('x', 51);

        $res = $this->postJson('/api/storedispute', [
            'employee_id'  => $this->user->id,
            'dispute_type' => $overlongType,
            'status'       => str_repeat('y', 21),
        ]);

        $errors = $res->json('errors');
        $this->assertArrayHasKey('dispute_type', $errors);
        $this->assertArrayHasKey('status', $errors);
        $this->assertSame(0, Dispute::where('dispute_type', $overlongType)->count());
    }

    // dispute_type is mandatory even when the employee is valid.
    /** @test */
    public function a_dispute_with_no_type_is_refused()
    {
        $res = $this->postJson('/api/storedispute', ['employee_id' => $this->user->id]);

        $this->assertArrayHasKey('dispute_type', $res->json('errors'));
    }

    // ====================================================================== show()

    // A payroll-level caller may narrow the summary by geo; the filter is passed straight to the
    // report SP alongside the explicit cutoff dates, which override the current cutoff.
    /** @test */
    public function a_payroll_caller_can_narrow_the_summary_by_geo_and_explicit_dates()
    {
        CallSpFake::fake('EV_SP_Validate_Payroll_Level', [[(object) ['IsExists' => 1]]]);
        CallSpFake::fake('EV_SP_PD_Get_Payroll_Report', [[]]);

        $res = $this->getJson('/api/getdispute?startDate=2026-05-01&endDate=2026-05-15&geo=Philippines');

        $res->assertStatus(200);
        $this->assertSame([], $res->json('content'));
        $this->assertSame(
            ['2026-05-01', '2026-05-15', 'Philippines'],
            CallSpFake::callsFor('EV_SP_PD_Get_Payroll_Report')[0]['params']
        );
    }

    // A non-payroll caller with no filters at all: department null and the status defaults to 0,
    // i.e. "pending", and the caller can only ever see their own scope (their id is parameter 1).
    /** @test */
    public function a_non_payroll_caller_with_no_filters_sees_their_own_pending_disputes()
    {
        CallSpFake::fake('EV_SP_Validate_Payroll_Level', [[(object) ['IsExists' => 0]]]);
        CallSpFake::fake('EV_SP_PD_Get_Pending_Request', [[(object) ['id' => 5]]]);

        $res = $this->getJson('/api/getdispute');

        $res->assertStatus(200);
        $this->assertSame(
            [$this->user->id, null, null, 0, 1],
            CallSpFake::callsFor('EV_SP_PD_Get_Pending_Request')[0]['params']
        );
        $this->assertCount(0, CallSpFake::callsFor('EV_SP_PD_Get_Payroll_Report'));
    }

    // ================================================================ showExport()

    // Nothing to export: the mapper loop is skipped and an empty CSV is still produced, rather
    // than an error the browser cannot open.
    /** @test */
    public function exporting_a_period_with_no_disputes_still_downloads_an_empty_csv()
    {
        CallSpFake::fake('EV_SP_PD_Get_Payroll_Report', [[]]);

        $res = $this->get('/api/getdisputeExport?startDate=2026-05-01&endDate=2026-05-15');

        $res->assertStatus(200);
        Excel::assertDownloaded('Dispute.csv', function (DisputeExport $export) {
            return $export->collection()->isEmpty();      // no rows mapped
        });
        $this->assertSame(
            ['2026-05-01', '2026-05-15', null],
            CallSpFake::callsFor('EV_SP_PD_Get_Payroll_Report')[0]['params']
        );
    }

    // Without explicit dates the export falls back to the current payroll cutoff.
    /** @test */
    public function exporting_without_dates_falls_back_to_the_current_payroll_cutoff()
    {
        CallSpFake::fake('EV_SP_PD_Get_Payroll_Report', [[]]);

        $res = $this->get('/api/getdisputeExport');

        $res->assertStatus(200);
        $this->assertSame(
            ['2026-08-01', '2026-08-15', null],
            CallSpFake::callsFor('EV_SP_PD_Get_Payroll_Report')[0]['params']
        );
    }

    // ============================================================== UpdateDispute()

    // Remarks are optional: omitting them sends an explicit null rather than an empty string, so
    // the SP can tell "no remark given" from "remark cleared".
    /** @test */
    public function updating_a_dispute_without_remarks_sends_an_explicit_null()
    {
        CallSpFake::fake('EV_SP_PD_Update_Dispute_Status', [[]]);

        $res = $this->putJson('/api/updatedispute/321', ['status' => 'rejected']);

        $res->assertStatus(200);
        $this->assertSame(
            ['rejected', '321', null],
            CallSpFake::callsFor('EV_SP_PD_Update_Dispute_Status')[0]['params']
        );
    }

    // ================================================== dead-catch characterisation

    // FINDING (already registered) — expected-current-behaviour. The stored procedure fails, but
    // `catch (Exception $e)` resolves to App\Http\Controllers\Exception and cannot match, so the
    // throwable escapes and the caller gets an uncaught 500 instead of the intended 400
    // error_response. When `use Exception;` is added this test fails; flip it to assert 400 then.
    /** @test */
    public function a_stored_procedure_failure_escapes_as_an_uncaught_500_FINDING_DEAD_CATCH()
    {
        // EV_SP_PD_Get_Pending_Request intentionally NOT faked -> CallSpFake throws.
        $res = $this->getJson('/api/getuserdispute/456');

        $res->assertStatus(500);
    }
}
