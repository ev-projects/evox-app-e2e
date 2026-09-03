<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Request/Http/Controllers/OvertimeController.php
 *     update (request_mode = dispute), approve (payroll period closed -> dispute),
 *     approve (recompute-payroll arm), insertToOvertimeDispute
 *
 * MENU PATH
 *   Requests -> My Team Requests -> Overtime -> Approve   (PUT /api/request/overtime/approve/{id})
 *   Requests -> My Requests      -> Overtime -> Edit      (PUT /api/request/overtime/{id})
 *
 * COVERAGE AT AUTHORING TIME (line coverage of the named method)
 *   update 47.06 | approve 65.38
 *   Both gaps are the SAME business rule: when the target date falls in a payroll period that has
 *   already been closed, EVOX does not change the request — it files a DISPUTE through
 *   EV_SP_PD_Autoamtion_Overtimes and declines the original. approve./decline./role.
 *   OvertimeBranchTest deliberately skip that arm ("SKIPPED-SP"), so the entire dispute half of
 *   both methods, and insertToOvertimeDispute with it, had never run. The remaining approve() gap
 *   is the payroll recompute, which the existing success test cannot reach because its fixture
 *   overtime has no matching DTR row.
 *
 * HOW THE PAYROLL-PERIOD VERDICT IS CONTROLLED
 *   request_validity_checker() is a GLOBAL helper whose own body calls a stored procedure from the
 *   global namespace, where the CallSpFake seam cannot reach. Tests\Support\RequestValidityFake is
 *   the purpose-built seam for it and is used here. Every test pins the verdict explicitly —
 *   activate('1') for the ordinary route, activate('2') for the closed-period route — so no test in
 *   this file ever falls through to the live stored procedure. tearDown always resets.
 *
 * FINDINGS — none new. Bug #22 (the approval_of_request permission middleware being commented out
 *   on the approve routes) is already registered and is not re-reported here; these tests document
 *   the behaviour as it stands, which is why they pass against current code.
 *
 * SAFETY
 *   DatabaseTransactions — the dispute arm's decline of the original request rolls back.
 *   CallSpFake is ACTIVE, so EV_SP_PD_Autoamtion_Overtimes is intercepted and the dispute table is
 *   never written. Every probe is bounded (orderBy('id','desc'), limit 15).
 */

namespace Tests\Feature\BranchTests\Requests\Overtime;

require_once __DIR__ . '/../../Support/CallSpFake.php';
require_once __DIR__ . '/../../Support/RequestValidityFake.php';

use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Repositories\OvertimeRepositoryInterface;
use App\Modules\User\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\Support\CallSpFake;
use Tests\Support\RequestValidityFake;
use Tests\TestCase;

class OvertimeDisputeBranchTest extends TestCase
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
        CallSpFake::fake('EH_SP_Direct_Supervisor', [[]]); // called by OvertimeResource via is_under_supervisee() during response serialisation
        RequestValidityFake::activate('1');             // "inside an open payroll period"
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

    /** An overtime request owned by somebody other than the approver, so the self-approval gate opens. */
    private function someoneElsesOvertime()
    {
        return Overtime::whereHas('user')->where('user_id', '!=', $this->approver->id)
            ->orderBy('id', 'desc')->first();
    }

    // ══════════════════════════════════════════════════════ update() with request_mode=dispute

    /** @test editing an overtime request for a closed payroll period files a dispute and declines the original */
    public function editing_an_overtime_in_dispute_mode_files_a_dispute_and_declines_the_original()
    {
        CallSpFake::fake('EV_SP_PD_Autoamtion_Overtimes', [[]]);
        $overtime = $this->someoneElsesOvertime();
        if (!$overtime) $this->markTestSkipped('no Overtime owned by somebody other than the probe approver');

        $res = $this->actingAs($this->approver)->putJson("/api/request/overtime/{$overtime->id}", [
            'request_mode'  => 'dispute',
            'user_id'       => $overtime->user_id,
            'date'          => (string) $overtime->date,   // its own date -> the unique rule ignores it
            'type'          => 'pre_overtime',
            'amount'        => '02:00',
            'employee_note' => 'raised as a dispute',
        ]);

        $res->assertStatus(201);
        $this->assertSame(trans('messages.dispute_request_success'), $res->json('message'));

        // the original request is declined rather than edited
        $this->assertSame('declined', Overtime::find($overtime->id)->status);
        $this->assertSame($this->approver->id, Overtime::find($overtime->id)->updated_by);

        // and the dispute is filed pre-approved, in seconds, against the ORIGINAL requester
        $sp = CallSpFake::callsFor('EV_SP_PD_Autoamtion_Overtimes');
        $this->assertCount(1, $sp);
        $this->assertSame($overtime->user_id, (int) $sp[0]['params'][0]);
        $this->assertSame((string) $overtime->date, $sp[0]['params'][1]);
        $this->assertSame(7200, $sp[0]['params'][3]);                    // 02:00 -> seconds
        $this->assertSame('pre_overtime', $sp[0]['params'][4]);
        $this->assertSame('raised as a dispute', $sp[0]['params'][5]);
        $this->assertSame('approved', $sp[0]['params'][7]);
    }

    /** @test editing an overtime request normally does NOT file a dispute */
    public function editing_an_overtime_normally_files_no_dispute()
    {
        $overtime = $this->someoneElsesOvertime();
        if (!$overtime) $this->markTestSkipped('no Overtime owned by somebody other than the probe approver');

        $repo = $this->mockDep(OvertimeRepositoryInterface::class);
        $repo->shouldReceive('find')->once()->andReturn($overtime);
        $repo->shouldReceive('update')->once()->andReturn($overtime);

        $res = $this->actingAs($this->approver)->putJson("/api/request/overtime/{$overtime->id}", [
            'user_id' => $overtime->user_id,
            'date'    => (string) $overtime->date,
            'type'    => 'pre_overtime',
            'amount'  => '02:00',
        ]);

        $res->assertStatus(200);
        $this->assertSame(trans('messages.update_overtime_success'), $res->json('message'));
        $this->assertCount(0, CallSpFake::callsFor('EV_SP_PD_Autoamtion_Overtimes'),
            'normal edit must not trigger dispute automation');
    }

    // ═════════════════════════════════════════════ approve() when the payroll period is closed

    /** @test approving an overtime request whose payroll period is closed files a dispute instead */
    public function approving_an_overtime_for_a_closed_payroll_period_files_a_dispute_instead()
    {
        RequestValidityFake::activate('2');              // the SP verdict for "period already closed"
        CallSpFake::fake('EV_SP_PD_Autoamtion_Overtimes', [[]]);
        $overtime = $this->someoneElsesOvertime();
        if (!$overtime) $this->markTestSkipped('no Overtime owned by somebody other than the probe approver');

        // the approval repository must not be reached at all on this arm
        $repo = $this->mockDep(OvertimeRepositoryInterface::class);
        $repo->shouldNotReceive('approve');

        $res = $this->actingAs($this->approver)->putJson("/api/request/overtime/approve/{$overtime->id}", [
            'user_id'       => $overtime->user_id,
            'date'          => (string) $overtime->date,
            'type'          => 'pre_overtime',
            'amount'        => '02:00',
            'employee_note' => 'approved out of period',
        ]);

        $res->assertStatus(201);
        $this->assertSame(trans('messages.dispute_approve_success'), $res->json('message'));
        $this->assertSame('declined', Overtime::find($overtime->id)->status);

        $sp = CallSpFake::callsFor('EV_SP_PD_Autoamtion_Overtimes');
        $this->assertCount(1, $sp);
        $this->assertSame($overtime->user_id, (int) $sp[0]['params'][0]);
        $this->assertSame('approved', $sp[0]['params'][7]);
        $this->assertSame($this->approver->id, (int) $sp[0]['params'][8]);   // filed by the approver

        // the period was checked for the REQUESTER and the request's own date, not the approver's
        $checks = RequestValidityFake::calls();
        $this->assertCount(1, $checks);
        $this->assertSame($overtime->user_id, (int) $checks[0]['user_id']);
        $this->assertSame((string) $overtime->date, $checks[0]['target_date']);
    }

    // ═══════════════════════════════════════ approve() recompute arm (a matching DTR exists)

    /**
     * A DTR whose owner is not on multi-login and who has no overtime on that date, so the
     * OvertimeRequest uniqueness rule still passes. Bounded to the 15 most recent DTR rows.
     */
    private function dtrForRecompute()
    {
        foreach (Dtr::orderBy('id', 'desc')->limit(15)->get() as $dtr) {
            $user = User::find($dtr->user_id);
            if (!$user || $user->id === $this->approver->id) continue;
            if ($user->hasFeature('multi_login')) continue;
            if (Overtime::where('user_id', $dtr->user_id)->where('date', $dtr->date)->exists()) continue;

            return $dtr;
        }

        return null;
    }

    /** @test approving an overtime that lands on an existing DTR day recomputes that day's payroll */
    public function approving_an_overtime_that_lands_on_a_dtr_day_recomputes_that_days_payroll()
    {
        $dtr = $this->dtrForRecompute();
        if (!$dtr) {
            $this->markTestSkipped('none of the 15 most recent DTR rows belongs to a single-login '
                . 'employee with no overtime already booked on that date');
        }

        $approved = (new Overtime())->forceFill([
            'id'      => null,
            'user_id' => $dtr->user_id,
            'date'    => (string) $dtr->date,
            'amount'  => 7200,
            'type'    => 'pre_overtime',
            'status'  => 'approved',
        ]);

        $repo = $this->mockDep(OvertimeRepositoryInterface::class);
        $repo->shouldReceive('approve')->once()->andReturn($approved);

        $recomputed = [];
        $dtrRepo = $this->mockDep(DtrRepositoryInterface::class);
        $dtrRepo->shouldReceive('compute_payroll_items')->once()
            ->andReturnUsing(function ($passed) use (&$recomputed) {
                $recomputed[] = $passed;
                return null;
            });

        $res = $this->actingAs($this->approver)->putJson('/api/request/overtime/approve/1', [
            'user_id' => $dtr->user_id,
            'date'    => (string) $dtr->date,
            'type'    => 'pre_overtime',
            'amount'  => '02:00',
        ]);

        $res->assertStatus(200);
        $this->assertCount(1, $recomputed);
        $this->assertInstanceOf(Dtr::class, $recomputed[0]);
        $this->assertSame((int) $dtr->id, (int) $recomputed[0]->id);      // the employee's own DTR day
    }

    /** @test approving an overtime with no DTR for that day recomputes nothing */
    public function approving_an_overtime_with_no_dtr_for_that_day_recomputes_nothing()
    {
        $employee = User::where('is_active', 1)->where('id', '!=', $this->approver->id)
            ->orderBy('id', 'desc')->first();
        if (!$employee) $this->markTestSkipped('no second active user in test DB');
        // a multi-login employee skips the recompute block entirely, which would make the
        // "nothing was recomputed" assertion pass for the wrong reason
        if ($employee->hasFeature('multi_login')) {
            $this->markTestSkipped('probe employee is on multi-login — the recompute block is skipped '
                . 'before the DTR lookup, so this test could not distinguish the two reasons');
        }
        if (Overtime::where('user_id', $employee->id)->where('date', '2093-06-15')->exists()) {
            $this->markTestSkipped('the far-future probe date is already booked');
        }

        $approved = (new Overtime())->forceFill([
            'id'      => null,
            'user_id' => $employee->id,
            'date'    => '2093-06-15',            // no DTR exists that far out
            'amount'  => 7200,
            'type'    => 'pre_overtime',
            'status'  => 'approved',
        ]);

        $repo = $this->mockDep(OvertimeRepositoryInterface::class);
        $repo->shouldReceive('approve')->once()->andReturn($approved);

        $dtrRepo = $this->mockDep(DtrRepositoryInterface::class);
        $dtrRepo->shouldNotReceive('compute_payroll_items');

        $res = $this->actingAs($this->approver)->putJson('/api/request/overtime/approve/1', [
            'user_id' => $employee->id,
            'date'    => '2093-06-15',
            'type'    => 'pre_overtime',
            'amount'  => '02:00',
        ]);

        $res->assertStatus(200);
    }
}
