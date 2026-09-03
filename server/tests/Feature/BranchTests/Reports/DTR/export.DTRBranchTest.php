<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for ReportController::export arms. Menu=Reports Page=DTR.
 *
 * Export/download endpoints. Excel::fake() intercepts downloads (no file written); Storage::fake('local')
 * isolates the dtrsummary.temp scratch file; constructor deps are IoC-mocked so no call_sp / real BHR fires.
 * The dtr_half_day_mismatch raw-SP call is driven via DB::shouldReceive (catch arm only).
 * success_response => 200 {message,content}; error_response default => 400 {error:{message,content}};
 * Excel::download => 200 file response. NOTE: export() catch returns success_response 200 (not an error).
 *
 * SKIPPED arms (success paths hit call_sp / raw DB SP-call — forbidden by SPEC):
 *   // SKIPPED-SP  export()                                  success arm -> call_sp('EH_SP_Attendance_Summary')
 *   // SKIPPED-SP  dtr_multi_logs_summary_report_csv_export  success arm -> call_sp('EV_SP_Multi_Quick_Punch_Report')
 *   // SKIPPED-SP  dtr_half_day_mismatch                     success arm -> DB::select('call Half_Day_Conflict_Report(...)')
 * Whole methods SKIPPED (first statement fires call_sp — no arm returns before it):
 *   // SKIPPED-SP  export_team_dtr_logs             -> call_sp('EH_SP_DTR_Logs')
 *   // SKIPPED-SP  new_dtr_summary_report_csv_export -> call_sp('EH_SP_DTR_Summary_Report')
 *
 * Routes (module prefix report/, mounted under /api):
 *   GET /api/report/attendance/summary/export/{start}/{end}   -> export()
 *   GET /api/report/dtr_summary/export                         -> export_team_dtr_summary()
 *   GET /api/report/dtr_summary/export_dtr_conflict            -> dtr_half_day_mismatch()
 *   GET /api/report/dtr_summary/multi_logs_export             -> dtr_multi_logs_summary_report_csv_export()
 */

namespace Tests\Feature\BranchTests\Reports\DTR;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Maatwebsite\Excel\Facades\Excel;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\Report\Repositories\ReportRepositoryInterface;

class DTRExportBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        Excel::fake();                 // intercept downloads, write nothing
        Storage::fake('local');        // isolate app/export/dtrsummary.temp scratch file
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestIncomplete('no user in test DB');
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

    // ------------------------------------------------------------------- export()
    // Branch: valid dates, no selectedDepartments -> `if ($department_ids === null)` -> json 400 (before call_sp)
    // SKIPPED-SP: with a department the success arm fires call_sp('EH_SP_Attendance_Summary')
    /** @test */
    public function export__export__no_department__error_400()
    {
        $res = $this->actingAs($this->user)
                    ->getJson('/api/report/attendance/summary/export/2026-07-01/2026-07-15');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: invalid date -> validate() throws -> catch returns success_response 200 ("No report data found.")
    /** @test */
    public function export__export__invalid_date__ok_200()
    {
        $res = $this->actingAs($this->user)
                    ->getJson('/api/report/attendance/summary/export/NOT-A-DATE/2026-07-15?selectedDepartments[]=1');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // ------------------------------------------------- export_team_dtr_summary()
    // No try/catch. Branch: current_page == 1 (writes temp) AND current_page < last_page -> success_response 200
    /** @test */
    public function export_team_dtr_summary__export__first_page_more_pages__ok_200()
    {
        // total=30, perPage=15, currentPage=1 -> lastPage=2 -> 1 < 2 true
        $paginator = new LengthAwarePaginator([$this->user], 30, 15, 1);
        $userRepo = $this->mockDep(UserRepositoryInterface::class);
        $userRepo->shouldReceive('get_users_under_supervisee')->once()->andReturn($paginator);

        $report = $this->mockDep(ReportRepositoryInterface::class);
        $report->shouldReceive('get_dtr_summary')->once()
               ->andReturn(['summary' => [], 'column' => []]);

        $res = $this->actingAs($this->user)
                    ->getJson('/api/report/dtr_summary/export?valid_from=2026-07-01&valid_to=2026-07-15');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch: current_page == 1 AND current_page == last_page (not <) -> else -> Excel::download 200
    /** @test */
    public function export_team_dtr_summary__export__last_page__downloads_200()
    {
        // total=15, perPage=15, currentPage=1 -> lastPage=1 -> 1 < 1 false
        $paginator = new LengthAwarePaginator([$this->user], 15, 15, 1);
        $userRepo = $this->mockDep(UserRepositoryInterface::class);
        $userRepo->shouldReceive('get_users_under_supervisee')->once()->andReturn($paginator);

        $report = $this->mockDep(ReportRepositoryInterface::class);
        $report->shouldReceive('get_dtr_summary')->once()
               ->andReturn(['summary' => [], 'column' => []]);

        $res = $this->actingAs($this->user)
                    ->get('/api/report/dtr_summary/export?valid_from=2026-07-01&valid_to=2026-07-15');

        $res->assertStatus(200);
        Excel::assertDownloaded('dtrsummary.csv');
    }

    // ------------------------------------------------- dtr_half_day_mismatch()
    // Raw SP driven via DB::shouldReceive. Branch: DB throws -> catch(Exception) -> error_response 400
    // SKIPPED-SP: success arm returns DB::select('call Half_Day_Conflict_Report(...)') directly
    /** @test */
    public function dtr_half_day_mismatch__export__exception__error_400()
    {
        DB::shouldReceive('select')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)
                    ->getJson('/api/report/dtr_summary/export_dtr_conflict?valid_from=2026-07-01&valid_to=2026-07-15');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // -------------------------------------- dtr_multi_logs_summary_report_csv_export()
    // Branch: `if (!is_valid($request->department_id))` -> error_response 400 (returns BEFORE call_sp)
    // SKIPPED-SP: valid-department success arm -> call_sp('EV_SP_Multi_Quick_Punch_Report')
    /** @test */
    public function dtr_multi_logs_summary_report_csv_export__export__no_department__error_400()
    {
        $res = $this->actingAs($this->user)
                    ->getJson('/api/report/dtr_summary/multi_logs_export?valid_from=2026-07-01&valid_to=2026-07-15');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
