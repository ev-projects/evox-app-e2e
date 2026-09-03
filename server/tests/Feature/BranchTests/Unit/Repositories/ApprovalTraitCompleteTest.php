<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use App\EvoxLevels;
use App\Modules\Request\Models\WorkFromHome;
use App\Modules\Request\Traits\ApprovalTrait;
use App\Modules\User\Models\User;

/**
 * Menu=Requests  Page=(every request page)  Actions=Approve / Decline / Cancel / Reset-to-Pending
 *
 * ApprovalTrait IS the approval state machine shared by Overtime, AlterLog, RestDayWork,
 * ChangeSchedule, AlterLogPunch and WorkFromHome. It was 0% covered — all 8 members
 * (approve/decline/pending/cancel/isApproved/isDeclined/isCanceled/isPending) plus the two
 * note setters never executed.
 *
 * CARRIER MODEL: WorkFromHome. It is the ONLY ApprovalTrait model whose table carries no
 * AFTER-UPDATE trigger (overtimes / alter_logs / rest_day_works / change_schedules /
 * alter_log_punches each fire heavy summary-report triggers on a status change). The trait code
 * executed is byte-identical for every carrier, so coverage and behaviour are the same while the
 * live-dump DB stays untouched by trigger cascades. Every write runs inside DatabaseTransactions.
 *
 * Arms driven per method:
 *   approve()  permitted-by-level (Admin/DivisionHead/Department Head short-circuits the gate)
 *              permitted-by-direct-supervisor (EH_SP_Direct_Supervisor faked, params asserted)
 *              NOT permitted (SP reports another supervisor) -> "cannot be changed" log arm
 *              catch/rollback/rethrow arm
 *   decline()  permitted arm, NOT-permitted arm (+ FINDING APPR-TXN-1), catch arm
 *   pending()  !isPending() arm, isPending() early-exit arm (+ FINDING APPR-PENDING-UNGATED),
 *              catch arm
 *   cancel()   owner arm; non-owner arm proves the else-branch is DEAD (FINDING APPR-CANCEL-DEAD)
 *              and characterises FINDING APPR-NE-LEAK in the exception text
 *   isApproved/isDeclined/isCanceled/isPending  both arms each
 *   set_employee_note/set_approver_note  valid + invalid arms
 *
 * The catch arms are driven WITHOUT touching the database: ApprovalProbeRequest points at an
 * unconfigured connection, so Model::save() throws InvalidArgumentException while the trait's
 * DB::beginTransaction()/DB::rollback() pair still runs on the default connection.
 */
class ApprovalTraitCompleteTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $approver;      // Admin / DivisionHead / Department Head — gate short-circuits to true
    /** @var User */
    private $employee;      // plain level, no 'admin' role — gate must consult the supervisor SP
    /** @var int */
    private $baseTxnLevel;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseTxnLevel = DB::transactionLevel();

        $headLevelIds = EvoxLevels::whereIn('Name', ['Admin', 'DivisionHead', 'Department Head'])
            ->pluck('LevelId');
        if ($headLevelIds->isEmpty()) {
            $this->markTestSkipped('no Admin/DivisionHead/Department Head level row in test DB');
        }

        $this->approver = User::whereIn('LevelId', $headLevelIds)
            ->whereHas('level')
            ->where('is_active', 1)
            ->orderBy('id', 'desc')
            ->first();

        // Spatie User::roles() removed — whereNotIn('LevelId', $headLevelIds) already excludes
        // Admin/DivisionHead/DepartmentHead users; no separate Spatie role filter needed.
        $this->employee = User::whereNotIn('LevelId', $headLevelIds)
            ->whereNotNull('LevelId')
            ->whereHas('level')
            ->where('is_active', 1)
            ->orderBy('id', 'desc')
            ->first();

        if (!$this->approver) $this->markTestSkipped('no active head-level user in test DB');
        if (!$this->employee) $this->markTestSkipped('no active non-admin employee in test DB');
    }

    protected function tearDown(): void
    {
        // FINDING APPR-TXN-1 leaves a transaction open — rebalance before the base rollback.
        while (DB::transactionLevel() > $this->baseTxnLevel) {
            DB::rollBack();
        }
        CallSpFake::reset();
        parent::tearDown();
    }

    /** A persisted request owned by $owner, sitting at $status. Rolled back by the trait. */
    private function request(User $owner, $status)
    {
        $wfh = new WorkFromHome();
        $wfh->user_id       = $owner->id;
        $wfh->valid_from    = '2026-08-10';
        $wfh->valid_to      = '2026-08-10';
        $wfh->employee_note = 'approval-trait branch test';
        $wfh->status        = $status;
        $wfh->created_by    = $owner->id;
        $wfh->updated_by    = null;
        $wfh->save();

        return $wfh;
    }

    /** The status column as the database actually holds it. */
    private function storedStatus(WorkFromHome $wfh)
    {
        return DB::table('work_from_homes')->where('id', $wfh->id)->value('status');
    }

    /** Unsaved carrier whose save() cannot reach any database — drives every catch arm. */
    private function probe($userId, $status)
    {
        $p = new ApprovalProbeRequest();
        $p->user_id = $userId;
        $p->status  = $status;

        return $p;
    }

    // =================================================================== approve()

    /** @test Head-level approver: level_type() short-circuits is_under_supervisee() to true. */
    public function approve_by_head_level_user_moves_request_to_approved_and_stamps_updated_by()
    {
        $wfh = $this->request($this->employee, get_constant('REQUEST_STATUS.pending'));
        $this->be($this->approver);

        $returned = $wfh->approve();

        $this->assertSame($wfh, $returned, 'approve() returns the instance for chaining');
        $this->assertSame(get_constant('REQUEST_STATUS.approved'), $wfh->status);
        $this->assertSame($this->approver->id, $wfh->updated_by);
        $this->assertEquals(get_constant('REQUEST_STATUS.approved'), $this->storedStatus($wfh));
        $this->assertTrue($wfh->isApproved());
        $this->assertFalse($wfh->isPending());
        $this->assertSame($this->baseTxnLevel, DB::transactionLevel(), 'approve() commits its own transaction');
    }

    /** @test Non-head approver is allowed only when EH_SP_Direct_Supervisor names him. */
    public function approve_by_direct_supervisor_calls_supervisor_sp_with_the_owner_id()
    {
        $wfh = $this->request($this->approver, get_constant('REQUEST_STATUS.pending'));
        $this->be($this->employee);

        CallSpFake::activate();
        CallSpFake::fake('EH_SP_Direct_Supervisor', [
            [ (object) ['SupervisorId' => $this->employee->id] ],
        ]);

        $wfh->approve();

        $calls = CallSpFake::callsFor('EH_SP_Direct_Supervisor');
        $this->assertCount(1, $calls, 'the gate consults the supervisor SP exactly once');
        $this->assertEquals([$this->approver->id], $calls[0]['params'],
            'the SP is asked about the REQUEST OWNER, not the logged-in approver');

        $this->assertSame(get_constant('REQUEST_STATUS.approved'), $wfh->status);
        $this->assertSame($this->employee->id, $wfh->updated_by);
        $this->assertEquals(get_constant('REQUEST_STATUS.approved'), $this->storedStatus($wfh));
    }

    /** @test Not the owner's supervisor: status must stay put and the "cannot be changed" arm runs. */
    public function approve_by_unrelated_employee_leaves_the_request_untouched()
    {
        $wfh = $this->request($this->approver, get_constant('REQUEST_STATUS.pending'));
        $this->be($this->employee);

        CallSpFake::activate();
        CallSpFake::fake('EH_SP_Direct_Supervisor', [[]]);   // SP returns no supervisor row

        $wfh->approve();

        $this->assertSame(get_constant('REQUEST_STATUS.pending'), $wfh->status, 'status not advanced');
        $this->assertNull($wfh->updated_by, 'no approver stamped on a rejected attempt');
        $this->assertEquals(get_constant('REQUEST_STATUS.pending'), $this->storedStatus($wfh));
        $this->assertTrue($wfh->isPending());
        $this->assertSame($this->baseTxnLevel, DB::transactionLevel(),
            'approve() commits even on the not-permitted arm');
    }

    /** @test Persist failure rolls the trait transaction back and rethrows the original exception. */
    public function approve_rolls_back_and_rethrows_when_the_write_fails()
    {
        $this->be($this->approver);                       // head level -> gate passes
        $probe = $this->probe($this->employee->id, get_constant('REQUEST_STATUS.pending'));

        $thrown = null;
        try {
            $probe->approve();
        } catch (\InvalidArgumentException $e) {
            $thrown = $e;
        }

        $this->assertNotNull($thrown, 'approve() rethrows the persistence failure');
        $this->assertContains('not configured', $thrown->getMessage());
        $this->assertFalse($probe->exists, 'nothing was persisted');
        $this->assertSame($this->baseTxnLevel, DB::transactionLevel(), 'the trait rolled its transaction back');
    }

    // =================================================================== decline()

    /** @test */
    public function decline_by_head_level_user_moves_request_to_declined_and_stamps_updated_by()
    {
        $wfh = $this->request($this->employee, get_constant('REQUEST_STATUS.pending'));
        $this->be($this->approver);

        $returned = $wfh->decline();

        $this->assertNull($returned, 'FINDING APPR-RET-1: decline() returns nothing, unlike approve()/pending()');
        $this->assertSame(get_constant('REQUEST_STATUS.declined'), $wfh->status);
        $this->assertSame($this->approver->id, $wfh->updated_by);
        $this->assertEquals(get_constant('REQUEST_STATUS.declined'), $this->storedStatus($wfh));
        $this->assertTrue($wfh->isDeclined());
        $this->assertFalse($wfh->isApproved());
        $this->assertSame($this->baseTxnLevel, DB::transactionLevel());
    }

    /**
     * @test
     * FINDING APPR-TXN-1: decline() calls DB::commit() INSIDE the permitted branch only. When the
     * gate says no, the transaction opened at the top of the method is never committed nor rolled
     * back, so the connection is left one level deeper for the rest of the request.
     */
    public function decline_by_unrelated_employee_is_a_noop_and_leaks_an_open_transaction_FINDING_APPR_TXN_1()
    {
        $wfh = $this->request($this->approver, get_constant('REQUEST_STATUS.pending'));
        $this->be($this->employee);

        CallSpFake::activate();
        CallSpFake::fake('EH_SP_Direct_Supervisor', [[]]);

        $wfh->decline();

        $this->assertSame(get_constant('REQUEST_STATUS.pending'), $wfh->status);
        $this->assertNull($wfh->updated_by);
        $this->assertEquals(get_constant('REQUEST_STATUS.pending'), $this->storedStatus($wfh));
        $this->assertSame($this->baseTxnLevel + 1, DB::transactionLevel(),
            'FINDING APPR-TXN-1: the not-permitted arm never commits or rolls back');
    }

    /** @test */
    public function decline_rolls_back_and_rethrows_when_the_write_fails()
    {
        $this->be($this->approver);
        $probe = $this->probe($this->employee->id, get_constant('REQUEST_STATUS.pending'));

        $thrown = null;
        try {
            $probe->decline();
        } catch (\InvalidArgumentException $e) {
            $thrown = $e;
        }

        $this->assertNotNull($thrown, 'decline() rethrows the persistence failure');
        $this->assertFalse($probe->exists);
        $this->assertSame($this->baseTxnLevel, DB::transactionLevel());
    }

    // =================================================================== pending()

    /**
     * @test
     * FINDING APPR-PENDING-UNGATED: unlike approve()/decline()/cancel(), pending() has NO
     * authorisation gate. Any authenticated user can reset any request — even one he neither owns
     * nor supervises — back to pending, and is stamped as the updater.
     */
    public function pending_reopens_an_approved_request_for_any_authenticated_user_FINDING_APPR_PENDING_UNGATED()
    {
        $wfh = $this->request($this->approver, get_constant('REQUEST_STATUS.approved'));
        $this->be($this->employee);                       // neither owner nor supervisor

        $returned = $wfh->pending();

        $this->assertSame($wfh, $returned, 'pending() returns the instance');
        $this->assertSame(get_constant('REQUEST_STATUS.pending'), $wfh->status);
        $this->assertSame($this->employee->id, $wfh->updated_by,
            'FINDING APPR-PENDING-UNGATED: an unrelated employee reopened the request');
        $this->assertEquals(get_constant('REQUEST_STATUS.pending'), $this->storedStatus($wfh));
        $this->assertTrue($wfh->isPending());
        $this->assertSame($this->baseTxnLevel, DB::transactionLevel());
    }

    /** @test isPending() early-exit arm: an already-pending request is not re-stamped. */
    public function pending_on_an_already_pending_request_changes_nothing()
    {
        $wfh = $this->request($this->employee, get_constant('REQUEST_STATUS.pending'));
        $this->be($this->approver);

        $returned = $wfh->pending();

        $this->assertSame($wfh, $returned);
        $this->assertSame(get_constant('REQUEST_STATUS.pending'), $wfh->status);
        $this->assertNull($wfh->updated_by, 'the early-exit arm must not stamp updated_by');
        $this->assertEquals(get_constant('REQUEST_STATUS.pending'), $this->storedStatus($wfh));
        $this->assertSame($this->baseTxnLevel, DB::transactionLevel());
    }

    /** @test */
    public function pending_rolls_back_and_rethrows_when_the_write_fails()
    {
        $this->be($this->employee);
        $probe = $this->probe($this->employee->id, get_constant('REQUEST_STATUS.approved'));

        $thrown = null;
        try {
            $probe->pending();
        } catch (\InvalidArgumentException $e) {
            $thrown = $e;
        }

        $this->assertNotNull($thrown, 'pending() rethrows the persistence failure');
        $this->assertFalse($probe->exists);
        $this->assertSame($this->baseTxnLevel, DB::transactionLevel());
    }

    // ==================================================================== cancel()

    /** @test The owner may cancel his own request: get_authenticated_user() returns him. */
    public function cancel_by_the_owner_moves_request_to_canceled_and_stamps_updated_by()
    {
        $wfh = $this->request($this->employee, get_constant('REQUEST_STATUS.pending'));
        $this->be($this->employee);

        $wfh->cancel();

        $this->assertSame(get_constant('REQUEST_STATUS.canceled'), $wfh->status);
        $this->assertSame($this->employee->id, $wfh->updated_by);
        $this->assertEquals(get_constant('REQUEST_STATUS.canceled'), $this->storedStatus($wfh));
        $this->assertTrue($wfh->isCanceled());
        $this->assertFalse($wfh->isPending());
        $this->assertSame($this->baseTxnLevel, DB::transactionLevel());
    }

    /**
     * @test
     * FINDING APPR-CANCEL-DEAD: cancel()'s `else` ("Request's status cannot be changed") branch is
     * unreachable. get_authenticated_user() never returns a falsy value — it returns a User or
     * throws — so an unauthorised cancel surfaces as an exception, not as the quiet log line the
     * code was written for.
     * FINDING APPR-NE-LEAK: that exception text concatenates an internal debug counter and the raw
     * requested user id onto the translated message, leaking them to the caller.
     */
    public function cancel_by_a_non_owner_throws_instead_of_taking_the_else_branch_FINDING_APPR_CANCEL_DEAD()
    {
        $this->be($this->employee);
        $foreignUserId = 2147483647;                       // no such user
        $wfh = new WorkFromHome();
        $wfh->user_id = $foreignUserId;
        $wfh->status  = get_constant('REQUEST_STATUS.pending');

        $thrown = null;
        try {
            $wfh->cancel();
        } catch (\Exception $e) {
            $thrown = $e;
        }

        $this->assertNotNull($thrown, 'FINDING APPR-CANCEL-DEAD: the guard throws, it never returns false');
        $this->assertSame(
            trans('messages.user_not_authorized') . '0' . $foreignUserId,
            $thrown->getMessage(),
            'FINDING APPR-NE-LEAK: debug counter + raw user id are appended to the message'
        );
        $this->assertSame(get_constant('REQUEST_STATUS.pending'), $wfh->status, 'status untouched');
        $this->assertFalse($wfh->exists, 'nothing was persisted');
        $this->assertSame($this->baseTxnLevel, DB::transactionLevel(), 'cancel() rolled its transaction back');
    }

    // ============================================================ status predicates

    /** @test Each predicate is true for exactly its own status and false for the other three. */
    public function status_predicates_are_mutually_exclusive()
    {
        $matrix = [
            get_constant('REQUEST_STATUS.approved') => ['isApproved', true],
            get_constant('REQUEST_STATUS.declined') => ['isDeclined', true],
            get_constant('REQUEST_STATUS.canceled') => ['isCanceled', true],
            get_constant('REQUEST_STATUS.pending')  => ['isPending',  true],
        ];

        foreach ($matrix as $status => $spec) {
            $wfh = new WorkFromHome();
            $wfh->status = $status;

            foreach (['isApproved', 'isDeclined', 'isCanceled', 'isPending'] as $predicate) {
                $expected = ($predicate === $spec[0]);
                $this->assertSame($expected, $wfh->$predicate(),
                    "$predicate() on status [$status]");
            }
        }

        // Unknown status: every predicate takes its false arm.
        $unknown = new WorkFromHome();
        $unknown->status = 'archived';
        $this->assertFalse($unknown->isApproved());
        $this->assertFalse($unknown->isDeclined());
        $this->assertFalse($unknown->isCanceled());
        $this->assertFalse($unknown->isPending());
    }

    // ================================================================= note setters

    /** @test A blank/absent note is normalised to NULL rather than stored as an empty string. */
    public function note_setters_keep_valid_text_and_null_out_blank_input()
    {
        $wfh = new WorkFromHome();

        $wfh->set_employee_note('please approve, client call ran late');
        $wfh->set_approver_note('approved, coordinated with the team lead');
        $this->assertSame('please approve, client call ran late', $wfh->employee_note);
        $this->assertSame('approved, coordinated with the team lead', $wfh->approver_note);

        $wfh->set_employee_note('');
        $wfh->set_approver_note(null);
        $this->assertNull($wfh->employee_note);
        $this->assertNull($wfh->approver_note);
    }
}

/**
 * Carrier used only to drive ApprovalTrait's catch arms. Its connection is deliberately not
 * configured, so Model::save() throws before a single query is built — the trait's
 * DB::beginTransaction()/DB::rollback() pair still runs on the real default connection.
 */
class ApprovalProbeRequest extends Model
{
    use ApprovalTrait;

    protected $connection = 'evox_unconfigured_connection_for_branch_tests';
    protected $table      = 'approval_trait_probe';
    protected $guarded    = [];
    public    $timestamps = false;
}
