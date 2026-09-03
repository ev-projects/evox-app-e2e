<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for ReportController::load arms. Menu=Reports Page=DTR.
 *
 * Covers the read/page-load endpoints whose branch outcomes are reachable WITHOUT firing call_sp,
 * a real BHR/external call, or a destructive write. All 7 constructor deps are IoC-mocked; the two
 * raw-SP reads (dtr_conflict_report) are driven via DB::shouldReceive so no real stored procedure runs.
 * success_response => 200 {message,content}; error_response default => 400 {error:{message,content}};
 * dtr_conflict_report empty arm => 404 {message}.
 *
 * SKIPPED arms (success paths hit call_sp / raw DB SP-call — forbidden by SPEC):
 *   // SKIPPED-SP  dtr_multi_logs_summary_report  success arm  -> call_sp('EV_SP_Multi_Quick_Punch_Report')
 *   // SKIPPED-SP  timeoff_allocation_report      country==1   -> call_sp('EVOX_PAYROLL_REPORT')
 *   // SKIPPED-SP  timeoff_allocation_report      country==4   -> call_sp('EH_SP_Morocco_DTR_Summary_Report')
 * Whole methods SKIPPED (first statement in try is call_sp / external — no arm returns before it):
 *   // SKIPPED-SP  team_dtr_logs                -> call_sp('EH_SP_DTR_Logs')
 *   // SKIPPED-SP  team_schedule                -> call_sp('EH_SP_Employee_List')
 *   // SKIPPED-EXTERNAL get_dashboard_holidays  -> call_sp('EH_SP_Dashboard') (BHR)
 *   // SKIPPED-SP  team_birthday_anniversary    -> call_sp('EH_SP_Dashboard')
 *   // SKIPPED-SP  new_dtr_summary_report       -> call_sp('EH_SP_DTR_Summary_Report')
 *   // SKIPPED-SP  getMoroccoPayrollParams      -> call_sp('EH_SP_Morocco_DTR_Summary_Report')
 *
 * Routes (module prefix report/, mounted under /api):
 *   GET /api/report/holidays                                       -> holidays()
 *   GET /api/report/my_dtr_notifications                           -> my_dtr_notifications()
 *   GET /api/report/team_attendance                                -> team_attendance()
 *   GET /api/report/dtr_summary/{user_id}/{start}/{end}            -> dtr_summary()
 *   GET /api/report/dtr_summary/block/{user_id}/{start}/{end}      -> dtr_summary_block()
 *   GET /api/report/dtr_summary/dtr_conflict                       -> dtr_conflict_report()
 *   GET /api/report/dtr_summary/multi_logs                         -> dtr_multi_logs_summary_report()
 *   GET /api/report/timeoff_allocation                             -> timeoff_allocation_report()
 */

namespace Tests\Feature\BranchTests\Reports\DTR;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection as BaseCollection;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Report\Repositories\ReportRepositoryInterface;
use App\Modules\Payroll\Repositories\HolidayRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;

class DTRLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();               // reach controller bodies past jwt/apikey
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestIncomplete('no user in test DB');
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** Bind a Mockery mock for an interface into the container. */
    private function mockDep(string $iface): \Mockery\MockInterface
    {
        $m = Mockery::mock($iface);
        $this->app->instance($iface, $m);
        return $m;
    }

    // ---------------------------------------------------------------- holidays()
    /** @test */
    public function holidays__load__success__ok_200()
    {
        $holiday = $this->mockDep(HolidayRepositoryInterface::class);
        $holiday->shouldReceive('get_holidays')->once()->andReturn(new BaseCollection([]));

        $res = $this->actingAs($this->user)->getJson('/api/report/holidays');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function holidays__load__exception__error_400()
    {
        $holiday = $this->mockDep(HolidayRepositoryInterface::class);
        $holiday->shouldReceive('get_holidays')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)->getJson('/api/report/holidays');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ---------------------------------------------------- my_dtr_notifications()
    // The controller wraps the repo result in MyDtrNotificationsResource, whose constructor reads
    // $resource[0]/[1]/[2] (records, leaves, requests) — matching the repo's real return shape
    // [$dtr_records, $dtr_leaves, $dtr_requests]. The mock must therefore return a 3-element indexed
    // array (empty here), NOT an empty Collection: an empty Collection has no offsets 0/1/2, and the
    // undefined-offset notice is promoted to an ErrorException inside the controller's try -> 400.
    // With [[], [], []] the resource iterates empty arms -> success_response => 200. No SP/writes.
    /** @test */
    public function my_dtr_notifications__load__success__ok_200()
    {
        $cutoff = $this->mockDep(PayrollCutoffRepositoryInterface::class);
        $cutoff->shouldReceive('get_payroll_cutoff')->once()
               ->andReturn((object) ['start_date' => '2026-07-01']);
        $report = $this->mockDep(ReportRepositoryInterface::class);
        $report->shouldReceive('get_my_dtr_notifications')->once()->andReturn([[], [], []]);

        $res = $this->actingAs($this->user)->getJson('/api/report/my_dtr_notifications');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function my_dtr_notifications__load__exception__error_400()
    {
        $cutoff = $this->mockDep(PayrollCutoffRepositoryInterface::class);
        $cutoff->shouldReceive('get_payroll_cutoff')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)->getJson('/api/report/my_dtr_notifications');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // --------------------------------------------------------- team_attendance()
    /** @test */
    public function team_attendance__load__success__ok_200()
    {
        $report = $this->mockDep(ReportRepositoryInterface::class);
        $report->shouldReceive('get_team_attendance')->once()->andReturn(new BaseCollection([]));

        $res = $this->actingAs($this->user)->getJson('/api/report/team_attendance');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function team_attendance__load__exception__error_400()
    {
        $report = $this->mockDep(ReportRepositoryInterface::class);
        $report->shouldReceive('get_team_attendance')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)->getJson('/api/report/team_attendance');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // -------------------------------------------------------------- dtr_summary()
    /** @test */
    public function dtr_summary__load__success__ok_200()
    {
        $uid = $this->user->id;
        $report = $this->mockDep(ReportRepositoryInterface::class);
        $report->shouldReceive('get_dtr_summary')->once()
               ->andReturn([$uid => ['summary' => [], 'column' => []]]);

        $res = $this->actingAs($this->user)
                    ->getJson("/api/report/dtr_summary/{$uid}/2026-07-01/2026-07-15");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function dtr_summary__load__invalid_date__error_400()
    {
        $this->mockDep(ReportRepositoryInterface::class); // must never be reached: validate() throws first

        $res = $this->actingAs($this->user)
                    ->getJson("/api/report/dtr_summary/{$this->user->id}/NOT-A-DATE/2026-07-15");

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function dtr_summary__load__repository_exception__error_400()
    {
        $uid = $this->user->id;
        $report = $this->mockDep(ReportRepositoryInterface::class);
        $report->shouldReceive('get_dtr_summary')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)
                    ->getJson("/api/report/dtr_summary/{$uid}/2026-07-01/2026-07-15");

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // -------------------------------------------------------- dtr_summary_block()
    // Branch: end_date > yesterday -> `if ($end_date > $current_date)` caps it, then success 200
    /** @test */
    public function dtr_summary_block__load__future_end_date_capped__ok_200()
    {
        $uid = $this->user->id;
        $report = $this->mockDep(ReportRepositoryInterface::class);
        $report->shouldReceive('get_dtr_summary_block')->once()->andReturn(['summary' => []]);

        $res = $this->actingAs($this->user)
                    ->getJson("/api/report/dtr_summary/block/{$uid}/2026-07-01/2999-12-31");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch: past end_date -> capping `if` is false -> success 200
    /** @test */
    public function dtr_summary_block__load__past_end_date_no_cap__ok_200()
    {
        $uid = $this->user->id;
        $report = $this->mockDep(ReportRepositoryInterface::class);
        $report->shouldReceive('get_dtr_summary_block')->once()->andReturn(['summary' => []]);

        $res = $this->actingAs($this->user)
                    ->getJson("/api/report/dtr_summary/block/{$uid}/2000-01-01/2000-01-10");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function dtr_summary_block__load__exception__error_400()
    {
        $uid = $this->user->id;
        $report = $this->mockDep(ReportRepositoryInterface::class);
        $report->shouldReceive('get_dtr_summary_block')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)
                    ->getJson("/api/report/dtr_summary/block/{$uid}/2026-07-01/2026-07-10");

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // -------------------------------------------------------- dtr_conflict_report()
    // Raw SP is driven via DB::shouldReceive so no real Half_Day_Conflict_Report procedure runs.
    // Branch: DB returns empty -> `if ($report == NULL || empty($report))` -> 404 {message}
    /** @test */
    public function dtr_conflict_report__load__empty_report__not_found_404()
    {
        DB::shouldReceive('select')->once()->andReturn([]);

        $res = $this->actingAs($this->user)
                    ->getJson('/api/report/dtr_summary/dtr_conflict?valid_from=2026-07-01&valid_to=2026-07-15');

        $res->assertStatus(404)->assertJsonStructure(['message']);
    }

    // Branch: DB returns rows -> empty check false -> success 200
    /** @test */
    public function dtr_conflict_report__load__non_empty_report__ok_200()
    {
        DB::shouldReceive('select')->once()->andReturn([(object) ['x' => 1]]);

        $res = $this->actingAs($this->user)
                    ->getJson('/api/report/dtr_summary/dtr_conflict?valid_from=2026-07-01&valid_to=2026-07-15');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch: DB throws -> catch(Exception) -> error_response 400
    /** @test */
    public function dtr_conflict_report__load__exception__error_400()
    {
        DB::shouldReceive('select')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)
                    ->getJson('/api/report/dtr_summary/dtr_conflict?valid_from=2026-07-01&valid_to=2026-07-15');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ------------------------------------------------ dtr_multi_logs_summary_report()
    // Branch: `if (!is_valid($request->department_id))` -> error_response 400 (returns BEFORE call_sp)
    // SKIPPED-SP: valid-department success arm -> call_sp('EV_SP_Multi_Quick_Punch_Report')
    /** @test */
    public function dtr_multi_logs_summary_report__load__no_department__error_400()
    {
        $res = $this->actingAs($this->user)
                    ->getJson('/api/report/dtr_summary/multi_logs?valid_from=2026-07-01&valid_to=2026-07-15');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ------------------------------------------------ timeoff_allocation_report()
    // Branch: country neither 1 nor 4 -> both if/elseif false, no call_sp -> falls through, returns null (200)
    // SKIPPED-SP: country==1 -> call_sp('EVOX_PAYROLL_REPORT'); country==4 -> call_sp('EH_SP_Morocco_DTR_Summary_Report')
    /** @test */
    public function timeoff_allocation_report__load__unknown_country__ok_200()
    {
        $res = $this->actingAs($this->user)
                    ->get('/api/report/timeoff_allocation?country=99');

        $res->assertStatus(200);
    }
}
