<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Request/Http/Controllers/RestDayWorkController.php
 *     update (request_mode = dispute), approve (payroll period closed -> dispute),
 *     insertToRestDayWorkDispute (including the overnight-shift day rollover)
 *
 * MENU PATH
 *   Requests -> My Team Requests -> Rest Day Work -> Approve  (PUT /api/request/rest_day_work/approve/{id})
 *   Requests -> My Requests      -> Rest Day Work -> Edit     (PUT /api/request/rest_day_work/{id})
 *
 * COVERAGE AT AUTHORING TIME (line coverage of the named method)
 *   update 47.06 | approve 57.14 | insertToRestDayWorkDispute 95.24
 *   As with overtime, the whole dispute half of update() and approve() was skipped by the existing
 *   branch tests because it runs a stored procedure. insertToRestDayWorkDispute's one uncovered
 *   line is the overnight guard: when the shift starts at or after the time it ends, the end
 *   timestamp belongs to the NEXT day and has to be pushed forward 24 hours. Get that wrong and a
 *   22:00-06:00 rest-day shift is filed as a negative eight-hour shift.
 *
 * HOW THE PAYROLL-PERIOD VERDICT IS CONTROLLED
 *   Tests\Support\RequestValidityFake, the purpose-built seam for request_validity_checker(). Every
 *   test pins the verdict explicitly — '1' for the ordinary route, '2' for the closed-period route —
 *   so nothing here ever falls through to the live payroll-period stored procedure.
 *
 * FINDINGS — none new.
 *
 * SAFETY
 *   DatabaseTransactions; CallSpFake ACTIVE so EV_SP_PD_Autoamtion_RestDay never reaches the
 *   dispute table. Timestamp assertions are made on DIFFERENCES, never on absolute epoch values,
 *   so they hold whatever country offset the acting user carries and whatever day the suite runs.
 */

namespace Tests\Feature\BranchTests\Requests\RestDayWork;

require_once __DIR__ . '/../../Support/CallSpFake.php';
require_once __DIR__ . '/../../Support/RequestValidityFake.php';

use App\Modules\Request\Models\RestDayWork;
use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;
use App\Modules\User\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\Support\CallSpFake;
use Tests\Support\RequestValidityFake;
use Tests\TestCase;

class RestDayWorkDisputeBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $approver;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        CallSpFake::activate();
        RequestValidityFake::activate('1');
        $this->withoutMiddleware();

        $this->approver = User::whereNotNull('LevelId')->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$this->approver) $this->markTestSkipped('no active user with a LevelId in test DB');
    }

    protected function tearDown(): void
    {
        RequestValidityFake::reset();
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    private function mockDep(string $iface)
    {
        $m = Mockery::mock($iface);
        $this->app->instance($iface, $m);
        return $m;
    }

    private function someoneElsesRestDayWork()
    {
        return RestDayWork::whereHas('user')->where('user_id', '!=', $this->approver->id)
            ->orderBy('id', 'desc')->first();
    }

    private function disputePayload(RestDayWork $rdw, array $overrides = [])
    {
        return array_merge([
            'request_mode'  => 'dispute',
            'user_id'       => $rdw->user_id,
            'date'          => (string) $rdw->date,      // its own date -> the unique rule ignores it
            'start_time'    => '08:00',
            'end_time'      => '17:00',
            'break_time'    => '01:00',
            'employee_note' => 'raised as a dispute',
        ], $overrides);
    }

    // ══════════════════════════════════════════════════════ update() with request_mode=dispute

    /** @test editing a rest day work request in dispute mode files a dispute and declines the original */
    public function editing_a_rest_day_work_in_dispute_mode_files_a_dispute_and_declines_the_original()
    {
        CallSpFake::fake('EV_SP_PD_Autoamtion_RestDay', [[]]);
        $rdw = $this->someoneElsesRestDayWork();
        if (!$rdw) $this->markTestSkipped('no RestDayWork owned by somebody other than the probe approver');

        $res = $this->actingAs($this->approver)
            ->putJson("/api/request/rest_day_work/{$rdw->id}", $this->disputePayload($rdw));

        $res->assertStatus(201);
        $this->assertSame(trans('messages.dispute_request_success'), $res->json('message'));

        $this->assertSame('declined', RestDayWork::find($rdw->id)->status);
        $this->assertSame($this->approver->id, RestDayWork::find($rdw->id)->updated_by);

        $sp = CallSpFake::callsFor('EV_SP_PD_Autoamtion_RestDay');
        $this->assertCount(1, $sp);
        $this->assertSame($rdw->user_id, (int) $sp[0]['params'][0]);
        $this->assertSame((string) $rdw->date, $sp[0]['params'][1]);
        // an 08:00-17:00 day shift is nine hours and stays on the same day
        $this->assertSame(9 * 3600, $sp[0]['params'][3] - $sp[0]['params'][2]);
        $this->assertSame(3600, $sp[0]['params'][4]);                   // 01:00 break -> seconds
        $this->assertSame('approved', $sp[0]['params'][7]);
    }

    /** @test a rest day shift that ends the next morning is filed with the end pushed a day forward */
    public function an_overnight_rest_day_shift_is_filed_with_the_end_time_on_the_following_day()
    {
        CallSpFake::fake('EV_SP_PD_Autoamtion_RestDay', [[]]);
        $rdw = $this->someoneElsesRestDayWork();
        if (!$rdw) $this->markTestSkipped('no RestDayWork owned by somebody other than the probe approver');

        $res = $this->actingAs($this->approver)->putJson(
            "/api/request/rest_day_work/{$rdw->id}",
            $this->disputePayload($rdw, ['start_time' => '22:00', 'end_time' => '06:00'])
        );

        $res->assertStatus(201);

        $sp    = CallSpFake::callsFor('EV_SP_PD_Autoamtion_RestDay');
        $start = $sp[0]['params'][2];
        $end   = $sp[0]['params'][3];

        $this->assertGreaterThan($start, $end, 'the overnight guard did not push the end past the start');
        $this->assertSame(8 * 3600, $end - $start);          // 22:00 -> 06:00 is eight hours, not minus sixteen
        $this->assertSame(get_constant('TIMESTAMP.day'), $end - ($start - 16 * 3600));
    }

    /** @test editing a rest day work request normally does NOT file a dispute */
    public function editing_a_rest_day_work_normally_files_no_dispute()
    {
        $rdw = $this->someoneElsesRestDayWork();
        if (!$rdw) $this->markTestSkipped('no RestDayWork owned by somebody other than the probe approver');

        $repo = $this->mockDep(RestDayWorkRepositoryInterface::class);
        $repo->shouldReceive('find')->once()->andReturn($rdw);
        $repo->shouldReceive('update')->once()->andReturn($rdw);

        $payload = $this->disputePayload($rdw);
        unset($payload['request_mode']);

        $res = $this->actingAs($this->approver)->putJson("/api/request/rest_day_work/{$rdw->id}", $payload);

        $res->assertStatus(200);
        $this->assertSame(trans('messages.update_rest_day_work_success'), $res->json('message'));
        $this->assertSame([], CallSpFake::calls());
    }

    // ═════════════════════════════════════════════ approve() when the payroll period is closed

    /** @test approving a rest day work request whose payroll period is closed files a dispute instead */
    public function approving_a_rest_day_work_for_a_closed_payroll_period_files_a_dispute_instead()
    {
        RequestValidityFake::activate('2');
        CallSpFake::fake('EV_SP_PD_Autoamtion_RestDay', [[]]);
        $rdw = $this->someoneElsesRestDayWork();
        if (!$rdw) $this->markTestSkipped('no RestDayWork owned by somebody other than the probe approver');

        // neither the approval repository nor the DTR writer may be reached on this arm
        $repo = $this->mockDep(RestDayWorkRepositoryInterface::class);
        $repo->shouldNotReceive('approve');

        $payload = $this->disputePayload($rdw);
        unset($payload['request_mode']);          // the dispute is triggered by the period, not the mode

        $res = $this->actingAs($this->approver)
            ->putJson("/api/request/rest_day_work/approve/{$rdw->id}", $payload);

        $res->assertStatus(201);
        $this->assertSame(trans('messages.dispute_approve_success'), $res->json('message'));
        $this->assertSame('declined', RestDayWork::find($rdw->id)->status);

        $sp = CallSpFake::callsFor('EV_SP_PD_Autoamtion_RestDay');
        $this->assertCount(1, $sp);
        $this->assertSame($rdw->user_id, (int) $sp[0]['params'][0]);
        $this->assertSame('approved', $sp[0]['params'][7]);
        $this->assertSame($this->approver->id, (int) $sp[0]['params'][8]);
    }
}
