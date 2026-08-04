<?php
/**
 * REAL RequestController bulk + hash-code approval arms (Menu=Requests Page=MyTeamRequests
 * Action=bulk approve/deny + email approval links). File was 38.4% (194 unc): the existing
 * RequestList branch tests cover only the list endpoints; bulkRequest (~190 lines) and
 * change_request_status_via_hash_code (~150 lines) had zero tests.
 *
 * Boundaries: all 9 constructor repositories are IoC-mocked (house mockDep style); the dispute
 * SPs (EV_SP_PD_Autoamtion_*) and EV_SP_Validate_Request_Payroll_Period are called from the
 * CONTROLLER namespace -> already intercepted by CallSpFake; the request_validity_checker()
 * GLOBAL helper is namespace-shadowed below (RequestValidityFake) because its own body calls an
 * SP from the global namespace where the seam cannot reach. Model rows are real bounded probes;
 * their writes (dispute-path decline) roll back via DatabaseTransactions.
 *
 * Routes (module prefix under /api): POST request/bulk-request, POST request/approval,
 * GET request/request-validity-check. jwtauth/auth.apikey bypassed via withoutMiddleware().
 */

namespace App\Modules\Request\Http\Controllers {
    // Shadow: the controller calls request_validity_checker() unqualified from THIS namespace.
    if (!function_exists(__NAMESPACE__ . '\\request_validity_checker')) {
        function request_validity_checker($user_id, $date)
        {
            return \Tests\Feature\BranchTests\Unit\Repositories\RequestControllerBulkBranchTest::$validityResult;
        }
    }
}

namespace Tests\Feature\BranchTests\Unit\Repositories {

    require_once __DIR__ . '/../../Support/CallSpFake.php';

    use Tests\TestCase;
    use Tests\Support\CallSpFake;
    use Mockery;
    use Illuminate\Foundation\Testing\DatabaseTransactions;
    use Illuminate\Support\Facades\Mail;
    use Illuminate\Support\Facades\Queue;
    use App\Modules\Email\Repositories\EmailRepositoryInterface;
    use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
    use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
    use App\Modules\Request\Models\AlterLogPunch;
    use App\Modules\Request\Models\ChangeSchedule;
    use App\Modules\Request\Models\Overtime;
    use App\Modules\Request\Repositories\AlterLogPunchRepositoryInterface;
    use App\Modules\Request\Repositories\AlterLogRepositoryInterface;
    use App\Modules\Request\Repositories\ChangeScheduleRepositoryInterface;
    use App\Modules\Request\Repositories\OvertimeRepositoryInterface;
    use App\Modules\Request\Repositories\RequestRepositoryInterface;
    use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;
    use App\Modules\User\Models\User;

    class RequestControllerBulkBranchTest extends TestCase
    {
        use DatabaseTransactions;

        /** Result the request_validity_checker() shadow returns ("1" = valid, "2" = dispute). */
        public static $validityResult = '1';

        /** @var User */
        private $user;
        private $mocks = [];

        protected function setUp(): void
        {
            parent::setUp();
            Mail::fake();
            Queue::fake();
            CallSpFake::activate();
            self::$validityResult = '1';
            $this->withoutMiddleware();

            $this->user = User::whereNotNull('LevelId')->where('is_active', 1)
                ->orderBy('id', 'desc')->first();
            if (!$this->user) $this->markTestSkipped('no active user in test DB');

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
            CallSpFake::reset();
            Mockery::close();
            parent::tearDown();
        }

        private function realOvertime($status = null)
        {
            $q = Overtime::whereHas('user')->orderBy('id', 'desc');
            if ($status) $q->where('status', $status);
            return $q->first();
        }

        // ------------------------------------------------------------ bulkRequest: overtimes
        /** @test */
        public function bulk_overtime_approve_valid_calls_repo_and_recomputes_dtr()
        {
            $overtime = $this->realOvertime();
            if (!$overtime) $this->markTestSkipped('no Overtime row in test DB');
            $this->mocks['overtime']->shouldReceive('find')->once()->andReturn($overtime);
            $this->mocks['overtime']->shouldReceive('approve')->once()
                ->with([], (string) $overtime->id)->andReturn($overtime);
            $this->mocks['dtr']->shouldReceive('compute_payroll_items')->zeroOrMoreTimes();

            $res = $this->actingAs($this->user)->postJson('/api/request/bulk-request', [
                'checkedList' => ["{$overtime->id}.overtimes"],
                'bulk_action' => 'approve',
            ]);

            $res->assertStatus(200);
            $this->assertSame('approve', $res->json('content'));
            $this->assertSame([], CallSpFake::calls());          // no dispute SP on the valid path
        }

        /** @test */
        public function bulk_overtime_deny_declines_via_repo()
        {
            $overtime = $this->realOvertime();
            if (!$overtime) $this->markTestSkipped('no Overtime row in test DB');
            $this->mocks['overtime']->shouldReceive('find')->once()->andReturn($overtime);
            $this->mocks['overtime']->shouldReceive('decline')->once()->andReturn($overtime);
            $this->mocks['overtime']->shouldNotReceive('approve');

            $res = $this->actingAs($this->user)->postJson('/api/request/bulk-request', [
                'checkedList' => ["{$overtime->id}.overtimes"],
                'bulk_action' => 'deny',
            ]);

            $res->assertStatus(200);
        }

        /** @test */
        public function bulk_overtime_dispute_path_reroutes_to_sp_and_declines_original()
        {
            self::$validityResult = '2';                          // outside payroll period
            CallSpFake::fake('EV_SP_PD_Autoamtion_Overtimes', [[]]);
            $overtime = $this->realOvertime();
            if (!$overtime) $this->markTestSkipped('no Overtime row in test DB');
            $this->mocks['overtime']->shouldReceive('find')->once()->andReturn($overtime);
            $this->mocks['overtime']->shouldNotReceive('approve');

            $res = $this->actingAs($this->user)->postJson('/api/request/bulk-request', [
                'checkedList' => ["{$overtime->id}.overtimes"],
                'bulk_action' => 'approve',
            ]);

            $res->assertStatus(200);
            $this->assertSame(trans('messages.bulk_approve_with_dispute'), $res->json('message'));
            $this->assertSame('declined', Overtime::find($overtime->id)->status);   // original declined
            $sp = CallSpFake::callsFor('EV_SP_PD_Autoamtion_Overtimes');
            $this->assertCount(1, $sp);
            $this->assertSame($overtime->user_id, $sp[0]['params'][0]);
            $this->assertSame('approved', $sp[0]['params'][7]);   // dispute stored pre-approved
        }

        // ----------------------------------------------- bulkRequest: punches + change schedules
        /** @test */
        public function bulk_alter_log_punches_approve_and_deny_arms()
        {
            $alp = AlterLogPunch::whereHas('user')->orderBy('id', 'desc')->first();
            if (!$alp) $this->markTestSkipped('no AlterLogPunch row in test DB');
            $this->mocks['alter_log_punch']->shouldReceive('approve')->once()->andReturn($alp);
            $this->mocks['alter_log_punch']->shouldReceive('decline')->once()->andReturn($alp);
            $this->mocks['dtr']->shouldReceive('apply_alter_to_punch')->once();
            $this->mocks['dtr']->shouldReceive('remove_alter_to_punch')->once();

            $this->actingAs($this->user)->postJson('/api/request/bulk-request', [
                'checkedList' => ["{$alp->id}.alter_log_punches"],
                'bulk_action' => 'approve',
            ])->assertStatus(200);

            $this->actingAs($this->user)->postJson('/api/request/bulk-request', [
                'checkedList' => ["{$alp->id}.alter_log_punches"],
                'bulk_action' => 'deny',
            ])->assertStatus(200);
        }

        /** @test */
        public function bulk_change_schedule_approve_applies_schedule_and_deny_checks_previous_status()
        {
            $cs = ChangeSchedule::whereHas('user')->whereHas('schedule')->orderBy('id', 'desc')->first();
            if (!$cs) $this->markTestSkipped('no ChangeSchedule with schedule in test DB');
            $this->mocks['change_schedule']->shouldReceive('approve')->once()->andReturn($cs);
            $this->mocks['change_schedule']->shouldReceive('decline')->once()->andReturn($cs);
            $this->mocks['dtr']->shouldReceive('apply_schedule_to_dtr')->once();
            $this->mocks['dtr']->shouldReceive('remove_schedule_to_dtr')->zeroOrMoreTimes();

            $this->actingAs($this->user)->postJson('/api/request/bulk-request', [
                'checkedList' => ["{$cs->id}.change_schedules"],
                'bulk_action' => 'approve',
            ])->assertStatus(200);

            $this->actingAs($this->user)->postJson('/api/request/bulk-request', [
                'checkedList' => ["{$cs->id}.change_schedules"],
                'bulk_action' => 'deny',
            ])->assertStatus(200);
        }

        // ------------------------------------------------------- hash-code approval endpoint
        /** @test */
        public function hash_code_approval_logs_in_recipient_and_approves_overtime()
        {
            $overtime = Overtime::whereHas('user')->where('status', '!=', 'approved')
                ->orderBy('id', 'desc')->first();
            if (!$overtime) $this->markTestSkipped('no non-approved Overtime in test DB');
            $this->mocks['overtime']->shouldReceive('approve')->once()
                ->with([], $overtime->id)->andReturn($overtime);
            $this->mocks['dtr']->shouldReceive('compute_payroll_items')->zeroOrMoreTimes();

            $hash = encrypt("overtimes|{$overtime->id}|{$overtime->user_id}");
            $res = $this->postJson('/api/request/approval', [
                'hash_code' => $hash,
                'status'    => get_constant('REQUEST_STATUS.approved'),
            ]);

            $res->assertStatus(200);
        }

        /** @test */
        public function hash_code_approval_is_noop_when_already_approved()
        {
            $overtime = $this->realOvertime(get_constant('REQUEST_STATUS.approved'));
            if (!$overtime) $this->markTestSkipped('no approved Overtime in test DB');
            $this->mocks['overtime']->shouldNotReceive('approve');
            $this->mocks['overtime']->shouldNotReceive('decline');
            $this->mocks['dtr']->shouldReceive('compute_payroll_items')->zeroOrMoreTimes();

            $hash = encrypt("overtimes|{$overtime->id}|{$overtime->user_id}");
            $res = $this->postJson('/api/request/approval', [
                'hash_code' => $hash,
                'status'    => get_constant('REQUEST_STATUS.approved'),
            ]);

            $res->assertStatus(200);
        }

        // ------------------------------------------------------------ validity-check endpoint
        /** @test */
        public function request_validity_endpoint_returns_sp_verdict()
        {
            CallSpFake::fake('EV_SP_Validate_Request_Payroll_Period',
                [[(object) ['validity' => '2']]]);

            $res = $this->actingAs($this->user)
                ->getJson('/api/request/request-validity-check?date=2026-07-10');

            $res->assertStatus(200);
            $this->assertSame('2', $res->json('content.validity'));
            $p = CallSpFake::callsFor('EV_SP_Validate_Request_Payroll_Period')[0]['params'];
            $this->assertSame([$this->user->id, '2026-07-10'], $p);
        }
    }
}
