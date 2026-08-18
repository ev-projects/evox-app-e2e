<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Request/Http/Controllers/RequestController.php
 *     requestlist (my_requests pagination), bulkRequest (alter_logs + rest_day_works switch arms
 *     and the unrecognised-type arm), change_request_status_via_hash_code (every table except the
 *     overtimes-approve arm), insertToAlterLogDispute, insertToRestDayWorkDispute
 *
 * MENU PATH
 *   Requests -> My Requests                          (GET  /api/request/request-list)
 *   Requests -> My Team Requests -> bulk approve/deny (POST /api/request/bulk-request)
 *   E-mail approval link                              (POST /api/request/approval)
 *
 * COVERAGE AT AUTHORING TIME (line coverage of the named method)
 *   requestlist 96.88 | bulkRequest 56.14 | change_request_status_via_hash_code 42.59
 *   insertToAlterLogDispute 0 | insertToRestDayWorkDispute 0
 *   RequestControllerBulkBranchTest covers the overtimes, alter_log_punches and change_schedules
 *   arms of bulkRequest and the overtimes-approve arm of the hash-code endpoint. The two dispute
 *   helpers sat at ZERO because the only way in is a bulk approve on an alteration or a rest day
 *   work whose payroll period has already closed — an arm no suite could reach until the
 *   RequestValidityFake seam existed. The hash-code endpoint's decline arms, and its rest_day_works
 *   / alter_logs / change_schedules cases, were likewise untested: those are the links an approver
 *   clicks straight out of an e-mail, with no UI in front of them.
 *
 * SEAMS
 *   All nine constructor repositories are IoC-mocked (house mockDep style) so the switch arms are
 *   observed at their real boundaries. CallSpFake intercepts the dispute stored procedures, which
 *   the controller calls from its own namespace. RequestValidityFake pins the payroll-period
 *   verdict; note bulkRequest compares it with === "2", so the fake must answer with the STRING.
 *
 * FINDINGS — none new. Bug #22 (approval_of_request middleware commented out) is already registered.
 *
 * SAFETY
 *   DatabaseTransactions — the dispute arms really do decline the original request, and that write
 *   rolls back. Nothing else is written. All probes are bounded (orderBy('id','desc')->first()).
 *   The hash-code endpoint logs the recipient out before its response is serialised, which is why
 *   the resources' is_under_supervisee() short-circuits on a null user instead of reaching
 *   EH_SP_Direct_Supervisor — no stored procedure runs on any path in this file.
 */

namespace Tests\Feature\BranchTests\Requests\RequestList;

require_once __DIR__ . '/../../Support/CallSpFake.php';
require_once __DIR__ . '/../../Support/RequestValidityFake.php';

use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\Request\Repositories\AlterLogPunchRepositoryInterface;
use App\Modules\Request\Repositories\AlterLogRepositoryInterface;
use App\Modules\Request\Repositories\ChangeScheduleRepositoryInterface;
use App\Modules\Request\Repositories\OvertimeRepositoryInterface;
use App\Modules\Request\Repositories\RequestRepositoryInterface;
use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;
use App\Modules\User\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\Support\CallSpFake;
use Tests\Support\RequestValidityFake;
use Tests\TestCase;

class RequestControllerCompleteBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;
    private $mocks = [];

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        CallSpFake::activate();
        RequestValidityFake::activate('1');            // "inside an open payroll period"
        $this->withoutMiddleware();

        $this->user = User::whereNotNull('LevelId')->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$this->user) $this->markTestSkipped('no active user with a LevelId in test DB');

        foreach ([
            'payroll_cutoff'  => PayrollCutoffRepositoryInterface::class,
            'overtime'        => OvertimeRepositoryInterface::class,
            'request'         => RequestRepositoryInterface::class,
            'rest_day_work'   => RestDayWorkRepositoryInterface::class,
            'alter_log'       => AlterLogRepositoryInterface::class,
            'alter_log_punch' => AlterLogPunchRepositoryInterface::class,
            'change_schedule' => ChangeScheduleRepositoryInterface::class,
            'dtr'             => DtrRepositoryInterface::class,
            'email'           => EmailRepositoryInterface::class,
        ] as $key => $iface) {
            $m = Mockery::mock($iface)->shouldIgnoreMissing();
            $this->app->instance($iface, $m);
            $this->mocks[$key] = $m;
        }
    }

    protected function tearDown(): void
    {
        RequestValidityFake::reset();
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    /** A request row whose owner can be rendered by the resources (they read the owner's UTC zone). */
    private function renderable($model, $statusNot = null)
    {
        $q = $model::whereHas('user')->orderBy('id', 'desc');
        if ($statusNot) $q->where('status', '!=', $statusNot);
        $row = $q->first();

        if ($row && $row->user && $row->user->country_zone()) return $row;

        return null;
    }

    private function bulk(array $checkedList, string $action)
    {
        return $this->actingAs($this->user)->postJson('/api/request/bulk-request', [
            'checkedList' => $checkedList,
            'bulk_action' => $action,
        ]);
    }

    // ══════════════════════════════════════════════════════════ bulkRequest: alter_logs

    /** @test bulk-approving an alteration approves it and reapplies it to the employee's DTR */
    public function bulk_approving_an_alteration_reapplies_it_to_the_dtr()
    {
        $alterLog = AlterLog::whereHas('user')->orderBy('id', 'desc')->first();
        if (!$alterLog) $this->markTestSkipped('no AlterLog with an owning user in test DB');

        $this->mocks['alter_log']->shouldReceive('find')->once()->andReturn($alterLog);
        $this->mocks['alter_log']->shouldReceive('approve')->once()
            ->with([], (string) $alterLog->id)->andReturn($alterLog);
        $this->mocks['alter_log']->shouldNotReceive('decline');
        $this->mocks['dtr']->shouldReceive('apply_alter_log_to_dtr')->once()->with($alterLog);
        $this->mocks['dtr']->shouldNotReceive('remove_alter_log_from_dtr');

        $res = $this->bulk(["{$alterLog->id}.alter_logs"], 'approve');

        $res->assertStatus(200);
        $this->assertSame(trans('messages.bulk_request_update'), $res->json('message'));
        $this->assertSame('approve', $res->json('content'));
        $this->assertSame([], CallSpFake::calls());          // no dispute on the in-period path
    }

    /** @test bulk-denying an alteration declines it and strips it back out of the DTR */
    public function bulk_denying_an_alteration_strips_it_out_of_the_dtr()
    {
        $alterLog = AlterLog::whereHas('user')->orderBy('id', 'desc')->first();
        if (!$alterLog) $this->markTestSkipped('no AlterLog with an owning user in test DB');

        $this->mocks['alter_log']->shouldReceive('find')->once()->andReturn($alterLog);
        $this->mocks['alter_log']->shouldReceive('decline')->once()
            ->with([], (string) $alterLog->id)->andReturn($alterLog);
        $this->mocks['alter_log']->shouldNotReceive('approve');
        $this->mocks['dtr']->shouldReceive('remove_alter_log_from_dtr')->once()->with($alterLog);

        $res = $this->bulk(["{$alterLog->id}.alter_logs"], 'deny');

        $res->assertStatus(200);
        $this->assertSame('deny', $res->json('content'));
    }

    /** @test bulk-approving an alteration in a closed payroll period files a dispute and declines the original */
    public function bulk_approving_an_out_of_period_alteration_files_a_dispute()
    {
        RequestValidityFake::activate('2');
        CallSpFake::fake('EV_SP_PD_Autoamtion_AlterLog', [[]]);

        $alterLog = AlterLog::whereHas('user')->where('status', '!=', 'declined')
            ->orderBy('id', 'desc')->first();
        if (!$alterLog) $this->markTestSkipped('no non-declined AlterLog with an owning user in test DB');

        $this->mocks['alter_log']->shouldReceive('find')->once()->andReturn($alterLog);
        $this->mocks['alter_log']->shouldNotReceive('approve');

        $res = $this->bulk(["{$alterLog->id}.alter_logs"], 'approve');

        $res->assertStatus(200);
        $this->assertSame(trans('messages.bulk_approve_with_dispute'), $res->json('message'));
        $this->assertSame('declined', AlterLog::find($alterLog->id)->status);
        $this->assertSame($this->user->id, AlterLog::find($alterLog->id)->updated_by);

        // insertToAlterLogDispute(): the dispute carries the ORIGINAL request's times, filed approved
        $sp = CallSpFake::callsFor('EV_SP_PD_Autoamtion_AlterLog');
        $this->assertCount(1, $sp);
        $this->assertSame($alterLog->user_id, $sp[0]['params'][0]);
        $this->assertSame($alterLog->date, $sp[0]['params'][1]);
        $this->assertSame($alterLog->new_time_in, $sp[0]['params'][4]);
        $this->assertSame($alterLog->new_time_out, $sp[0]['params'][5]);
        $this->assertSame('approved', $sp[0]['params'][8]);
        $this->assertSame($this->user->id, $sp[0]['params'][9]);
    }

    /** @test bulk-denying an out-of-period alteration declines it WITHOUT filing a dispute */
    public function bulk_denying_an_out_of_period_alteration_files_no_dispute()
    {
        RequestValidityFake::activate('2');

        $alterLog = AlterLog::whereHas('user')->where('status', '!=', 'declined')
            ->orderBy('id', 'desc')->first();
        if (!$alterLog) $this->markTestSkipped('no non-declined AlterLog with an owning user in test DB');

        $this->mocks['alter_log']->shouldReceive('find')->once()->andReturn($alterLog);
        $this->mocks['alter_log']->shouldNotReceive('decline');

        $res = $this->bulk(["{$alterLog->id}.alter_logs"], 'deny');

        $res->assertStatus(200);
        // has_dispute is true, but the "with dispute" wording is reserved for approvals
        $this->assertSame(trans('messages.bulk_request_update'), $res->json('message'));
        $this->assertSame('declined', AlterLog::find($alterLog->id)->status);
        $this->assertSame([], CallSpFake::calls());
    }

    // ═══════════════════════════════════════════════════════ bulkRequest: rest_day_works

    /** @test bulk-approving a rest day work applies it to the employee's DTR */
    public function bulk_approving_a_rest_day_work_applies_it_to_the_dtr()
    {
        $rdw = RestDayWork::whereHas('user')->orderBy('id', 'desc')->first();
        if (!$rdw) $this->markTestSkipped('no RestDayWork with an owning user in test DB');

        $this->mocks['rest_day_work']->shouldReceive('find')->once()->andReturn($rdw);
        $this->mocks['rest_day_work']->shouldReceive('approve')->once()
            ->with([], (string) $rdw->id)->andReturn($rdw);
        $this->mocks['rest_day_work']->shouldNotReceive('decline');
        $this->mocks['dtr']->shouldReceive('apply_rest_day_work_to_dtr')->once()->with($rdw);

        $res = $this->bulk(["{$rdw->id}.rest_day_works"], 'approve');

        $res->assertStatus(200);
        $this->assertSame('approve', $res->json('content'));
        $this->assertSame([], CallSpFake::calls());
    }

    /** @test bulk-denying a rest day work removes it from the employee's DTR */
    public function bulk_denying_a_rest_day_work_removes_it_from_the_dtr()
    {
        $rdw = RestDayWork::whereHas('user')->orderBy('id', 'desc')->first();
        if (!$rdw) $this->markTestSkipped('no RestDayWork with an owning user in test DB');

        $this->mocks['rest_day_work']->shouldReceive('find')->once()->andReturn($rdw);
        $this->mocks['rest_day_work']->shouldReceive('decline')->once()
            ->with([], (string) $rdw->id)->andReturn($rdw);
        $this->mocks['rest_day_work']->shouldNotReceive('approve');
        $this->mocks['dtr']->shouldReceive('remove_rest_day_from_dtr')->once()->with($rdw);

        $res = $this->bulk(["{$rdw->id}.rest_day_works"], 'deny');

        $res->assertStatus(200);
        $this->assertSame('deny', $res->json('content'));
    }

    /** @test bulk-approving a rest day work in a closed payroll period files a dispute and declines the original */
    public function bulk_approving_an_out_of_period_rest_day_work_files_a_dispute()
    {
        RequestValidityFake::activate('2');
        CallSpFake::fake('EV_SP_PD_Autoamtion_RestDay', [[]]);

        $rdw = RestDayWork::whereHas('user')->where('status', '!=', 'declined')
            ->orderBy('id', 'desc')->first();
        if (!$rdw) $this->markTestSkipped('no non-declined RestDayWork with an owning user in test DB');

        $this->mocks['rest_day_work']->shouldReceive('find')->once()->andReturn($rdw);
        $this->mocks['rest_day_work']->shouldNotReceive('approve');

        $res = $this->bulk(["{$rdw->id}.rest_day_works"], 'approve');

        $res->assertStatus(200);
        $this->assertSame(trans('messages.bulk_approve_with_dispute'), $res->json('message'));
        $this->assertSame('declined', RestDayWork::find($rdw->id)->status);

        // insertToRestDayWorkDispute(): times are absolute timestamps and the end never precedes the start
        $sp = CallSpFake::callsFor('EV_SP_PD_Autoamtion_RestDay');
        $this->assertCount(1, $sp);
        $this->assertSame($rdw->user_id, $sp[0]['params'][0]);
        $this->assertSame($rdw->date, $sp[0]['params'][1]);
        $this->assertGreaterThan($sp[0]['params'][2], $sp[0]['params'][3]);
        $this->assertSame($rdw->break_time, $sp[0]['params'][4]);
        $this->assertSame('approved', $sp[0]['params'][7]);
        $this->assertSame($this->user->id, $sp[0]['params'][8]);
    }

    // ═══════════════════════════════════════════════════ bulkRequest: unrecognised type

    /** @test a bulk entry naming a table the workflow does not handle is skipped, not an error */
    public function a_bulk_entry_for_an_unhandled_request_type_is_skipped()
    {
        $this->mocks['overtime']->shouldNotReceive('find');
        $this->mocks['alter_log']->shouldNotReceive('find');
        $this->mocks['rest_day_work']->shouldNotReceive('find');

        $res = $this->bulk(['1.leaves'], 'approve');

        $res->assertStatus(200);
        $this->assertSame(trans('messages.bulk_request_update'), $res->json('message'));
        $this->assertSame([], CallSpFake::calls());
    }

    // ══════════════════════════════════════════════ e-mail approval link: hash-code endpoint

    private function hashCall($table, $id, $recipientId, $status)
    {
        return $this->postJson('/api/request/approval', [
            'hash_code' => encrypt("{$table}|{$id}|{$recipientId}"),
            'status'    => $status,
        ]);
    }

    /** @test the e-mail link can decline an overtime request and reports that it changed */
    public function the_email_link_declines_an_overtime_request()
    {
        $overtime = $this->renderable(Overtime::class, 'declined');
        if (!$overtime) $this->markTestSkipped('no non-declined Overtime with a renderable owner in test DB');

        $this->mocks['overtime']->shouldReceive('decline')->once()
            ->with([], $overtime->id)->andReturn($overtime);
        $this->mocks['overtime']->shouldNotReceive('approve');

        $res = $this->hashCall('overtimes', $overtime->id, $overtime->user_id,
            get_constant('REQUEST_STATUS.declined'));

        $res->assertStatus(200);
        $this->assertTrue($res->json('content.is_changed'));
    }

    /** @test the e-mail link approves a rest day work request and applies it to the DTR */
    public function the_email_link_approves_a_rest_day_work_request()
    {
        $rdw = $this->renderable(RestDayWork::class, 'approved');
        if (!$rdw) $this->markTestSkipped('no non-approved RestDayWork with a renderable owner in test DB');

        $this->mocks['rest_day_work']->shouldReceive('approve')->once()
            ->with([], $rdw->id)->andReturn($rdw);
        $this->mocks['dtr']->shouldReceive('apply_rest_day_work_to_dtr')->once()->with($rdw);
        $this->mocks['dtr']->shouldNotReceive('remove_rest_day_from_dtr');

        $res = $this->hashCall('rest_day_works', $rdw->id, $rdw->user_id,
            get_constant('REQUEST_STATUS.approved'));

        $res->assertStatus(200);
        $this->assertTrue($res->json('content.is_changed'));
    }

    /** @test the e-mail link declines a rest day work request and removes it from the DTR */
    public function the_email_link_declines_a_rest_day_work_request()
    {
        $rdw = $this->renderable(RestDayWork::class, 'declined');
        if (!$rdw) $this->markTestSkipped('no non-declined RestDayWork with a renderable owner in test DB');

        $this->mocks['rest_day_work']->shouldReceive('decline')->once()
            ->with([], $rdw->id)->andReturn($rdw);
        $this->mocks['dtr']->shouldReceive('remove_rest_day_from_dtr')->once()->with($rdw);
        $this->mocks['dtr']->shouldNotReceive('apply_rest_day_work_to_dtr');

        $res = $this->hashCall('rest_day_works', $rdw->id, $rdw->user_id,
            get_constant('REQUEST_STATUS.declined'));

        $res->assertStatus(200);
        $this->assertTrue($res->json('content.is_changed'));
    }

    /** @test the e-mail link approves an alteration and applies it to the DTR */
    public function the_email_link_approves_an_alteration()
    {
        $alterLog = $this->renderable(AlterLog::class, 'approved');
        if (!$alterLog) $this->markTestSkipped('no non-approved AlterLog with a renderable owner in test DB');

        $this->mocks['alter_log']->shouldReceive('approve')->once()
            ->with([], $alterLog->id)->andReturn($alterLog);
        $this->mocks['dtr']->shouldReceive('apply_alter_log_to_dtr')->once()->with($alterLog);
        $this->mocks['dtr']->shouldNotReceive('remove_alter_log_from_dtr');

        $res = $this->hashCall('alter_logs', $alterLog->id, $alterLog->user_id,
            get_constant('REQUEST_STATUS.approved'));

        $res->assertStatus(200);
        $this->assertTrue($res->json('content.is_changed'));
    }

    /** @test the e-mail link declines an alteration and removes it from the DTR */
    public function the_email_link_declines_an_alteration()
    {
        $alterLog = $this->renderable(AlterLog::class, 'declined');
        if (!$alterLog) $this->markTestSkipped('no non-declined AlterLog with a renderable owner in test DB');

        $this->mocks['alter_log']->shouldReceive('decline')->once()
            ->with([], $alterLog->id)->andReturn($alterLog);
        $this->mocks['dtr']->shouldReceive('remove_alter_log_from_dtr')->once()->with($alterLog);
        $this->mocks['dtr']->shouldNotReceive('apply_alter_log_to_dtr');

        $res = $this->hashCall('alter_logs', $alterLog->id, $alterLog->user_id,
            get_constant('REQUEST_STATUS.declined'));

        $res->assertStatus(200);
        $this->assertTrue($res->json('content.is_changed'));
    }

    /** @test the e-mail link approves a change schedule and writes the new schedule onto the DTRs */
    public function the_email_link_approves_a_change_schedule()
    {
        $cs = ChangeSchedule::whereHas('user')->whereHas('schedule')
            ->where('status', '!=', 'approved')->orderBy('id', 'desc')->first();
        if (!$cs || !$cs->user->country_zone()) {
            $this->markTestSkipped('no non-approved ChangeSchedule with a schedule and a renderable owner');
        }

        $this->mocks['change_schedule']->shouldReceive('approve')->once()
            ->with([], $cs->id)->andReturn($cs);
        $this->mocks['dtr']->shouldReceive('apply_schedule_to_dtr')->once();
        $this->mocks['dtr']->shouldNotReceive('remove_schedule_to_dtr');

        $res = $this->hashCall('change_schedules', $cs->id, $cs->user_id,
            get_constant('REQUEST_STATUS.approved'));

        $res->assertStatus(200);
        $this->assertTrue($res->json('content.is_changed'));
    }

    /** @test the e-mail link declines a change schedule and takes the schedule back off the DTRs */
    public function the_email_link_declines_a_change_schedule()
    {
        $cs = ChangeSchedule::whereHas('user')->whereHas('schedule')
            ->where('status', '!=', 'declined')->orderBy('id', 'desc')->first();
        if (!$cs || !$cs->user->country_zone()) {
            $this->markTestSkipped('no non-declined ChangeSchedule with a schedule and a renderable owner');
        }

        $this->mocks['change_schedule']->shouldReceive('decline')->once()
            ->with([], $cs->id)->andReturn($cs);
        $this->mocks['dtr']->shouldReceive('remove_schedule_to_dtr')->once();
        $this->mocks['dtr']->shouldNotReceive('apply_schedule_to_dtr');

        $res = $this->hashCall('change_schedules', $cs->id, $cs->user_id,
            get_constant('REQUEST_STATUS.declined'));

        $res->assertStatus(200);
        $this->assertTrue($res->json('content.is_changed'));
    }

    /** @test asking the e-mail link for the status a request already has changes nothing */
    public function the_email_link_reports_no_change_when_the_status_already_matches()
    {
        $rdw = RestDayWork::whereHas('user')->where('status', 'approved')
            ->orderBy('id', 'desc')->first();
        if (!$rdw || !$rdw->user->country_zone()) {
            $this->markTestSkipped('no already-approved RestDayWork with a renderable owner in test DB');
        }

        $this->mocks['rest_day_work']->shouldNotReceive('approve');
        $this->mocks['rest_day_work']->shouldNotReceive('decline');
        $this->mocks['dtr']->shouldNotReceive('apply_rest_day_work_to_dtr');

        $res = $this->hashCall('rest_day_works', $rdw->id, $rdw->user_id,
            get_constant('REQUEST_STATUS.approved'));

        $res->assertStatus(200);
        $this->assertFalse($res->json('content.is_changed'));
    }

    // ═══════════════════════════════════════════════════ requestlist: page-count rounding

    private function myRequestsPage($totalCount, $perPage)
    {
        CallSpFake::fake('EH_SP_OverAll_MyRequest', [
            [],
            [],
            [(object) [
                'TotalCount'           => $totalCount,
                'Total_Count_Per_Page' => $perPage,
                'CurrentPage'          => 1,
            ]],
        ]);

        return $this->actingAs($this->user)->getJson(
            '/api/request/request-list?url=my_requests&status=pending&request_type=all&page=1'
        );
    }

    /** @test a part-full final page still counts as a page */
    public function a_part_full_final_page_of_my_requests_is_counted()
    {
        $res = $this->myRequestsPage(25, 10);

        $res->assertStatus(200);
        $this->assertSame(25, $res->json('content.result.total'));
        $this->assertSame(10, $res->json('content.result.per_page'));
        // last_page comes out of floor(), so compare by value rather than by type
        $this->assertEquals(3, $res->json('content.result.last_page'));   // 2 full pages + 5 leftovers
    }

    /** @test an exactly-full last page is not rounded up to a phantom extra page */
    public function an_exactly_full_final_page_of_my_requests_is_not_rounded_up()
    {
        $res = $this->myRequestsPage(20, 10);

        $res->assertStatus(200);
        $this->assertSame(20, $res->json('content.result.total'));
        $this->assertEquals(2, $res->json('content.result.last_page'));
    }
}
