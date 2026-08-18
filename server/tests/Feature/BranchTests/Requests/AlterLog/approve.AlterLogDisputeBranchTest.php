<?php
/**
 * SOURCE FILE UNDER TEST
 *   app/Modules/Request/Http/Controllers/AlterLogController.php :: approve()                (57.14% before this file)
 *                                                              :: insertToAlterLogDispute() (0% before this file)
 *
 * MENU PATH
 *   Requests -> Alter Log -> Approve. PUT /api/request/alter_log/approve/{id}.
 *
 * WHAT THIS FILE ADDS
 *   approve.AlterLogBranchTest already owns the ordinary approval, the 422 validation gate and the
 *   catch arm. The two arms it declared unreachable are covered here:
 *     1. the self-approval refusal (lines 147-149) — an authorization rule, previously untested
 *     2. the payroll-dispute route (lines 153-167) plus the whole of insertToAlterLogDispute()
 *
 *   Reaching arm 2 needs request_validity_checker() to answer 2. That helper resolves the answer via
 *   call_sp("EV_SP_Validate_Request_Payroll_Period"), a GLOBAL-to-GLOBAL call that CallSpFake
 *   explicitly cannot shadow — which is why the arm was marked SKIPPED-SP. It is opened here with a
 *   new sibling seam, tests/Feature/BranchTests/Support/RequestValidityFake.php, which shadows the
 *   helper inside App\Modules\Request\Http\Controllers and passes through to the real helper unless a
 *   test activates it. No stored procedure runs in either arm.
 *
 * WHY A USER CARES
 *   Self-approval: an employee who could approve their own alteration request could rewrite their own
 *   time in and time out and be paid for hours they did not work. That refusal is the control.
 *   Payroll dispute: once a payroll period has closed an approval must NOT quietly edit the DTR — the
 *   money for that period is already out. Instead the change is pushed into the payroll dispute
 *   automation and the original request is DECLINED, so the audit trail shows the adjustment came
 *   through dispute rather than through a late approval.
 *
 * ARMS COVERED — both sides of every conditional
 *   - requester approving their own request                              -> refused, 403, repo untouched
 *   - approver approving someone else's, payroll period CLOSED (2)       -> dispute route, 201
 *       * the original alter log is set to declined and stamped with the approver
 *       * the dispute payload reaches the automation SP with status "approved" and the approver's id
 *       * the normal repository approve() and the DTR write are NOT called
 *   - the same request with the payroll period OPEN (not 2)              -> normal approval, 200
 *     (the else arm, asserted here against the same fixture so the two routes are contrasted)
 *   - optional current_time_in / current_time_out absent vs present      -> the null and the
 *     epoch-conversion halves of the six ternaries inside insertToAlterLogDispute()
 *
 * SAFETY
 *   DatabaseTransactions. The alter log this suite approves is CREATED by the suite, so no live
 *   request is ever declined; it is written and rolled back inside the test transaction. Both parties
 *   are resolved with non-empty first AND last names because EV_TR_ON_INSERT_AlterLog builds a
 *   NOT NULL notification column with CONCAT(first_name,' ',last_name,...) and MySQL CONCAT returns
 *   NULL if any argument is NULL (see CS-TRIG-1). EV_SP_PD_Autoamtion_AlterLog is intercepted by
 *   CallSpFake and never executes. Every probe is bounded to one row.
 *
 * FINDINGS
 *   AL-DISPUTE-SILENT-1 (characterized below, not fixed): on the dispute route the original request is
 *     updated to status 'declined' and the response says "dispute request success" with an EMPTY
 *     content body. The requester's screen therefore shows their alteration DECLINED with no reference
 *     to the dispute that replaced it, and the caller gets no dispute id back to follow up with.
 */

namespace Tests\Feature\BranchTests\Requests\AlterLog;

require_once __DIR__ . '/../../Support/CallSpFake.php';
require_once __DIR__ . '/../../Support/RequestValidityFake.php';

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\Support\CallSpFake;
use Tests\Support\RequestValidityFake;
use Tests\TestCase;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Repositories\AlterLogRepositoryInterface;
use App\Modules\User\Models\User;

class AlterLogDisputeApproveBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** The stored procedure the payroll dispute automation runs. */
    const DISPUTE_SP = 'EV_SP_PD_Autoamtion_AlterLog';

    /** A date far enough in the past that it cannot collide with a live request or payroll run. */
    const TARGET_DATE = '1990-06-11';

    /** @var User the person whose time is being altered */
    private $employee;

    /** @var User the person doing the approving */
    private $approver;

    /** @var AlterLog the request under approval — created by this suite, never a live row */
    private $alterLog;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        CallSpFake::activate();                     // no stored procedure can reach the database
        $this->withoutMiddleware();                 // past jwtauth / auth.apikey to the controller body

        $this->employee = $this->namedActiveUser();
        if (!$this->employee) {
            $this->markTestSkipped('no active user with non-empty first and last names (see CS-TRIG-1)');
        }

        // The approver additionally needs a country that maps to a utc_timelog row, because
        // insertToAlterLogDispute() calls User::country_timezone_to_offset(), which dereferences
        // that relation with no null guard.
        $this->approver = $this->namedActiveUserWithTimezone($this->employee->id);
        if (!$this->approver) {
            $this->markTestSkipped('no second named active user whose country_id maps to a utc_timelog row');
        }

        $this->alterLog = $this->createPendingAlterLog();
    }

    protected function tearDown(): void
    {
        RequestValidityFake::reset();
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    /** An active user carrying both names — required by the alter_logs insert trigger. */
    private function namedActiveUser(): ?User
    {
        return User::where('is_active', 1)
            ->whereNotNull('first_name')->where('first_name', '!=', '')
            ->whereNotNull('last_name')->where('last_name', '!=', '')
            ->orderBy('id', 'desc')
            ->first();
    }

    /** Same, plus a country_id that resolves in utc_timelog, and not the given user. */
    private function namedActiveUserWithTimezone(int $notUserId): ?User
    {
        $id = DB::table('users as u')
            ->join('utc_timelog as t', 't.country_id', '=', 'u.country_id')
            ->where('u.is_active', 1)
            ->where('u.id', '!=', $notUserId)
            ->whereNotNull('u.first_name')->where('u.first_name', '!=', '')
            ->whereNotNull('u.last_name')->where('u.last_name', '!=', '')
            ->whereNotNull('t.timezone')->where('t.timezone', '!=', '')
            ->orderBy('u.id', 'desc')
            ->value('u.id');

        return $id ? User::find($id) : null;
    }

    /** A pending alter log owned by the employee, written inside the test transaction. */
    private function createPendingAlterLog(): AlterLog
    {
        AlterLog::where('user_id', $this->employee->id)->where('date', self::TARGET_DATE)->forceDelete();

        return AlterLog::create([
            'user_id'       => $this->employee->id,
            'date'          => self::TARGET_DATE,
            'new_time_in'   => strtotime(self::TARGET_DATE . ' 08:00:00'),
            'new_time_out'  => strtotime(self::TARGET_DATE . ' 17:00:00'),
            'employee_note' => 'branch test — payroll dispute route',
            'status'        => 'pending',
            'created_by'    => $this->employee->id,
        ]);
    }

    /** A payload that satisfies every AlterLogRequest rule for the fixture row. */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'date'          => self::TARGET_DATE,
            'user_id'       => $this->employee->id,
            'new_time_in'   => self::TARGET_DATE . ' 09:00:00',
            'new_time_out'  => self::TARGET_DATE . ' 18:00:00',
            'employee_note' => 'branch test — payroll dispute route',
        ], $overrides);
    }

    private function mockDep(string $iface): \Mockery\MockInterface
    {
        $m = Mockery::mock($iface);
        $this->app->instance($iface, $m);

        return $m;
    }

    // ==========================================================  the self-approval refusal

    /**
     * The authorization control. An employee sending their own user_id must be refused before any
     * validity check, any repository call and any DTR write — otherwise they could sign off their own
     * corrected punches.
     *
     * @test
     */
    public function an_employee_cannot_approve_their_own_alteration_request()
    {
        // Both downstream routes are armed: if the guard were removed the closed-period answer would
        // send this straight into the dispute automation. Neither may be reached.
        RequestValidityFake::activate(2);
        $repo = $this->mockDep(AlterLogRepositoryInterface::class);
        $dtr  = $this->mockDep(DtrRepositoryInterface::class);
        $this->mockDep(EmailRepositoryInterface::class);
        $repo->shouldReceive('approve')->never();
        $dtr->shouldReceive('apply_alter_log_to_dtr')->never();

        $res = $this->actingAs($this->employee)
                    ->putJson('/api/request/alter_log/approve/' . $this->alterLog->id, $this->payload());

        $res->assertStatus(403);
        $this->assertSame('You cannot approve your own request.', $res->json('error.message'));

        $this->assertSame(
            'pending',
            AlterLog::find($this->alterLog->id)->status,
            'a refused self-approval must leave the request pending'
        );
        $this->assertCount(0, RequestValidityFake::calls(), 'the refusal happens before the payroll-period check');
        $this->assertCount(0, CallSpFake::callsFor(self::DISPUTE_SP), 'and before the dispute automation');
    }

    /**
     * The other side of the same guard, using the SAME payload and the SAME row: a different person
     * approving is allowed through to the normal approval route.
     *
     * @test
     */
    public function a_different_person_approving_the_same_request_is_allowed_through()
    {
        RequestValidityFake::activate(1);            // payroll period still open -> ordinary approval
        $repo = $this->mockDep(AlterLogRepositoryInterface::class);
        $dtr  = $this->mockDep(DtrRepositoryInterface::class);
        $this->mockDep(EmailRepositoryInterface::class);
        $repo->shouldReceive('approve')->once()->andReturn($this->alterLog);
        $dtr->shouldReceive('apply_alter_log_to_dtr')->once()->andReturnNull();

        $res = $this->actingAs($this->approver)
                    ->putJson('/api/request/alter_log/approve/' . $this->alterLog->id, $this->payload());

        $res->assertStatus(200);
        $this->assertSame(trans('messages.approve_alter_log_success'), $res->json('message'));

        $checks = RequestValidityFake::calls();
        $this->assertCount(1, $checks, 'the payroll period is checked exactly once');
        $this->assertSame((int) $this->employee->id, (int) $checks[0]['user_id'], 'checked for the requester, not the approver');
        $this->assertSame(self::TARGET_DATE, $checks[0]['target_date']);

        $this->assertCount(0, CallSpFake::callsFor(self::DISPUTE_SP), 'an open period must not touch the dispute automation');
    }

    // ==========================================================  the payroll-dispute route

    /**
     * The closed-period route. The alteration must NOT be applied to the DTR; it is pushed into the
     * payroll dispute automation instead and the original request is declined, so the audit trail
     * shows an adjustment made through dispute rather than a late approval against closed payroll.
     *
     * @test
     */
    public function approving_against_a_closed_payroll_period_routes_to_dispute_and_declines_the_original()
    {
        RequestValidityFake::activate(2);            // 2 = payroll period already closed
        CallSpFake::fake(self::DISPUTE_SP, [[]]);

        $repo = $this->mockDep(AlterLogRepositoryInterface::class);
        $dtr  = $this->mockDep(DtrRepositoryInterface::class);
        $this->mockDep(EmailRepositoryInterface::class);
        $repo->shouldReceive('approve')->never();
        $dtr->shouldReceive('apply_alter_log_to_dtr')->never();

        $res = $this->actingAs($this->approver)
                    ->putJson('/api/request/alter_log/approve/' . $this->alterLog->id, $this->payload([
                        'current_time_in'  => self::TARGET_DATE . ' 08:30:00',
                        'current_time_out' => self::TARGET_DATE . ' 17:30:00',
                        'approver_note'    => 'period closed — routed to dispute',
                    ]));

        $res->assertStatus(201);
        $this->assertSame(trans('messages.dispute_approve_success'), $res->json('message'));
        // FINDING AL-DISPUTE-SILENT-1: the caller gets no dispute reference back.
        $this->assertSame([], $res->json('content'), 'the dispute route returns an empty body — no dispute id');

        $row = AlterLog::find($this->alterLog->id);
        $this->assertSame('declined', $row->status, 'the original request is declined once the dispute is raised');
        $this->assertSame((int) $this->approver->id, (int) $row->updated_by, 'the decline is stamped with the approver');

        $calls = CallSpFake::callsFor(self::DISPUTE_SP);
        $this->assertCount(1, $calls, 'the dispute automation is invoked exactly once');
        $params = $calls[0]['params'];
        $this->assertSame((int) $this->employee->id, (int) $params[0], 'the dispute is raised for the requester');
        $this->assertSame(self::TARGET_DATE, $params[1], 'for the date being altered');
        $this->assertSame('approved', $params[8], 'the dispute itself is filed already approved');
        $this->assertSame((int) $this->approver->id, (int) $params[9], 'and attributed to the approver');
        $this->assertNotNull($params[2], 'the supplied current time in is carried into the dispute');
        $this->assertNotNull($params[4], 'the requested new time in is carried into the dispute');
        $this->assertTrue(
            is_numeric($params[4]) && (int) $params[4] > 0,
            'times reach the automation as epoch seconds, not as date strings'
        );
    }

    /**
     * The other half of the six ternaries inside insertToAlterLogDispute(): when the optional
     * current-time fields are not supplied they must arrive as NULL rather than as epoch 0, which the
     * automation would read as 1 January 1970.
     *
     * @test
     */
    public function a_dispute_raised_without_the_optional_current_times_sends_nulls_not_epoch_zero()
    {
        RequestValidityFake::activate(2);
        CallSpFake::fake(self::DISPUTE_SP, [[]]);

        $this->mockDep(AlterLogRepositoryInterface::class);
        $this->mockDep(DtrRepositoryInterface::class);
        $this->mockDep(EmailRepositoryInterface::class);

        $res = $this->actingAs($this->approver)
                    ->putJson('/api/request/alter_log/approve/' . $this->alterLog->id, $this->payload());

        $res->assertStatus(201);

        $params = CallSpFake::callsFor(self::DISPUTE_SP)[0]['params'];
        $this->assertNull($params[2], 'no current time in was supplied — the automation must receive null');
        $this->assertNull($params[3], 'no current time out was supplied — the automation must receive null');
        $this->assertNull($params[7], 'no approver note was supplied — the automation must receive null');
        $this->assertNotNull($params[6], 'the employee note is required and must always be carried');
    }
}
