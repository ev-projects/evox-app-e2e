<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Request/Repositories/OvertimeRepository.php
 *     store, update, destroy, find, where, decline
 *
 * MENU PATH
 *   Requests -> My Requests / My Team Requests -> Overtime (overtimes)
 *
 * COVERAGE AT AUTHORING TIME (line coverage of the named method)
 *   store 78.95 | update 90.48 | destroy 92.86 | find 50 | where 50 | decline 40
 *   decline() is the worst-covered method in the whole approval workflow: it is the only one of the
 *   five request repositories whose decline() carries an if/else (re-fetch the row when no payload
 *   was supplied, run the nested update() when one was), and neither branch had ever executed.
 *   where() had only run with an empty filter array, so all seven of its filter arms were unrun.
 *
 * WHAT THIS FILE ADDS
 *   Both decline arms, every where() filter arm, find()'s "no such row" arm, and the rethrow arm of
 *   each method. The controller-level suites (approve./decline./delete.OvertimeBranchTest,
 *   role.OvertimeApprovalRoleTest) mock this repository at the IoC seam and never enter it.
 *
 * FINDINGS
 *   FINDING_REQ_AUTH_FATAL — an ordinary employee acting on ANOTHER employee's request does not get
 *     "not authorized": it gets a fatal PHP error. get_authenticated_user() calls
 *     $auth->users_handled(...)->findOrFail($id), and User::users_handled() returns a plain array []
 *     for every level that is not Admin / *Head / Board / Client / HR / Payroll, so ->findOrFail()
 *     is called on an array. That is an \Error, which neither the helper's catch(Exception) nor the
 *     repository's catch(Exception) intercepts, so the repository's DB::beginTransaction() is also
 *     left open. Root cause (users_handled() returning []) is already registered as REQ-UH-1 for a
 *     different call site; this is the ownership gate shared by update/destroy/find/cancel across
 *     all five request repositories. Characterised below.
 *
 * OBSERVATION (not filed as a defect — no button can produce the payload)
 *   Unlike its four siblings, update() does not fall back to the stored value: a payload without
 *   date/amount/type writes null/0/null over them. OvertimeRequest makes all three required, so the
 *   HTTP route cannot reach it, and approve()/decline() skip update() entirely on an empty payload.
 *
 * SAFETY
 *   DatabaseTransactions; tearDown drains any transaction level the fatal above leaves open. No
 *   stored procedure on any path — approver-level users short-circuit is_under_supervisee() before
 *   direct_supervisor_temp() (which is SP-backed) is ever reached. Every where() call carries
 *   show_owned so it cannot scan the table.
 */

namespace Tests\Feature\BranchTests\Unit\Repositories;

use App\EvoxLevels;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Repositories\OvertimeRepository;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\Feature\BranchTests\Support\DeadConnectionTrait;
use Tests\TestCase;

class OvertimeRepositoryCompleteTest extends TestCase
{
    use DatabaseTransactions, DeadConnectionTrait;

    /** @var OvertimeRepository */
    private $repo;
    /** @var int */
    private $baseTxnLevel;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->repo = new OvertimeRepository();
        $this->baseTxnLevel = DB::transactionLevel();
    }

    protected function tearDown(): void
    {
        // FINDING_REQ_AUTH_FATAL leaves the repository's beginTransaction() open — rebalance so the
        // DatabaseTransactions rollback still lands on the level it opened.
        while (DB::transactionLevel() > $this->baseTxnLevel) {
            DB::rollBack();
        }
        parent::tearDown();
    }

    private function ownedOvertime()
    {
        return Overtime::whereHas('user')->orderBy('id', 'desc')->first();
    }

    private function approverUser()
    {
        $levelIds = EvoxLevels::whereIn('Name', ['Admin', 'DivisionHead', 'Department Head'])->pluck('LevelId');
        if ($levelIds->isEmpty()) return null;

        return User::whereIn('LevelId', $levelIds)->where('is_active', 1)->orderBy('id', 'desc')->first();
    }

    private function adminUser()
    {
        $levelIds = EvoxLevels::where('Name', 'Admin')->pluck('LevelId');
        if ($levelIds->isEmpty()) return null;

        return User::whereIn('LevelId', $levelIds)->where('is_active', 1)->orderBy('id', 'desc')->first();
    }

    private function anyActiveUser()
    {
        return User::where('is_active', 1)->whereNotNull('LevelId')->orderBy('id', 'desc')->first();
    }

    /**
     * An active user whose level is NOT one of the levels users_handled() understands, so
     * users_handled() returns a plain array. level_type() folds anything containing "HR"/"Payroll"
     * into those two names, which is why the filter is applied to the folded name.
     */
    private function nonPrivilegedUser()
    {
        $privileged = ['Admin', 'SubDepartment Head', 'Department Head', 'Division Head',
                       'DivisionHead', 'Board', 'Client', 'HR', 'Payroll'];

        $plainLevelIds = [];
        foreach (EvoxLevels::all() as $level) {
            $name = $level->Name;
            if (stristr($name, 'HR') !== false)           $name = 'HR';
            elseif (stristr($name, 'Payroll') !== false)  $name = 'Payroll';
            if (!in_array($name, $privileged, true))      $plainLevelIds[] = $level->LevelId;
        }
        if (!$plainLevelIds) return null;

        return User::whereIn('LevelId', $plainLevelIds)->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
    }

    private function idsOf($resourceCollection)
    {
        $ids = [];
        foreach ($resourceCollection->collection as $row) {
            $ids[] = (int) $row->id;
        }
        return $ids;
    }

    // ═══════════════════════════════════════════════════════════════════ decline()  (was 40%)

    /** @test declining with no edits re-reads the request and marks it declined */
    public function declining_with_no_payload_re_reads_the_request_and_declines_it()
    {
        $approver = $this->approverUser();
        $overtime = $this->ownedOvertime();
        if (!$approver || !$overtime) $this->markTestSkipped('missing approver-level user or Overtime fixture');
        $this->be($approver);

        $out = $this->repo->decline([], $overtime->id);

        $this->assertSame(get_constant('REQUEST_STATUS.declined'), $out->status);
        $this->assertSame($approver->id, $out->updated_by);
        $this->assertSame(get_constant('REQUEST_STATUS.declined'), Overtime::find($overtime->id)->status);
    }

    /** @test declining with a payload saves the approver's reason before marking it declined */
    public function declining_with_a_payload_saves_the_reason_before_declining()
    {
        $admin = $this->adminUser();
        if (!$admin) $this->markTestSkipped('no Admin-level user in test DB');
        // the Admin-level users_handled() filters on bhr_num, so the owner must carry one
        $overtime = Overtime::whereHas('user', function ($q) { $q->whereNotNull('bhr_num'); })
            ->orderBy('id', 'desc')->first();
        if (!$overtime) $this->markTestSkipped('no Overtime owned by a bhr-numbered user');
        $this->be($admin);

        $out = $this->repo->decline([
            'date'          => (string) $overtime->date,      // keep the date: update() nulls it if omitted
            'type'          => 'pre_overtime',
            'amount'        => '02:00',
            'approver_note' => 'declined - the shift was already covered',
        ], $overtime->id);

        $this->assertSame(get_constant('REQUEST_STATUS.declined'), $out->status);

        $saved = Overtime::find($overtime->id);
        $this->assertSame('declined - the shift was already covered', $saved->approver_note);
        $this->assertSame((string) $overtime->date, (string) $saved->date);
        $this->assertSame($admin->id, $saved->updated_by);
    }

    /** @test declining an overtime request that is not in the database is reported, not swallowed */
    public function declining_an_unknown_overtime_rethrows_to_the_caller()
    {
        $approver = $this->approverUser();
        if (!$approver) $this->markTestSkipped('no approver-level user in test DB');
        $this->be($approver);

        $this->expectException(ModelNotFoundException::class);
        $this->repo->decline([], -1);
    }

    // ═══════════════════════════════════════════════════════════════════════════ find()

    /**
     * @test reading an overtime request returns the row, and returns null for an unknown id
     *
     * OvertimeRepository::find() is the only one of the five that does NOT dereference the model,
     * so unlike its siblings (FINDING_AL_FIND_NULL and friends) it hands back null rather than
     * raising. Both arms are asserted here so the difference is pinned.
     */
    public function reading_an_overtime_returns_the_row_and_null_for_an_unknown_id()
    {
        $overtime = $this->ownedOvertime();
        if (!$overtime) $this->markTestSkipped('no Overtime with an owning user in test DB');
        $this->be($overtime->user);

        $this->assertEquals($overtime->id, $this->repo->find($overtime->id)->id);
        $this->assertNull($this->repo->find(-1));
    }

    /** @test a database failure while reading an overtime request reaches the caller */
    public function a_database_failure_while_reading_an_overtime_reaches_the_caller()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->assertRethrowsDeadConnection(function () {
            return $this->repo->find(1);
        });
    }

    // ═══════════════════════════════════════════════════════════ store() / update() / destroy()

    /** @test a database failure while storing an overtime request rolls back and reaches the caller */
    public function a_database_failure_while_storing_an_overtime_reaches_the_caller()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->assertRethrowsDeadConnection(function () use ($user) {
            return $this->repo->store([
                'user_id'       => $user->id,
                'date'          => '2026-07-10',
                'amount'        => '02:00',
                'type'          => 'pre_overtime',
                'employee_note' => 'dead-connection probe',
            ]);
        });
    }

    /** @test updating an overtime request that is not in the database rolls back and rethrows */
    public function updating_an_unknown_overtime_rethrows_to_the_caller()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->expectException(ModelNotFoundException::class);
        $this->repo->update(['date' => '2026-07-10', 'amount' => '02:00', 'type' => 'pre_overtime'], -1);
    }

    /** @test deleting an overtime request that is not in the database rolls back and rethrows */
    public function deleting_an_unknown_overtime_rethrows_to_the_caller()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->expectException(ModelNotFoundException::class);
        $this->repo->destroy(-1);
    }

    /**
     * DEFECT (FINDING_REQ_AUTH_FATAL): the ownership gate fatals instead of refusing. See the file
     * header. This test pins the CURRENT behaviour — an \Error, not the "not authorized" Exception
     * the helper was written to throw. When users_handled() is fixed to return a query builder (or
     * get_authenticated_user() learns to handle the array), this fails and should be flipped to
     * expect an Exception whose message is trans('messages.user_not_authorized').
     *
     * @test an ordinary employee editing somebody else's overtime hits a fatal, not a refusal
     */
    public function an_employee_editing_somebody_elses_overtime_fatals_FINDING_REQ_AUTH_FATAL()
    {
        $employee = $this->nonPrivilegedUser();
        if (!$employee) $this->markTestSkipped('no active user on a non-privileged level in test DB');
        $overtime = Overtime::whereHas('user')->where('user_id', '!=', $employee->id)
            ->orderBy('id', 'desc')->first();
        if (!$overtime) $this->markTestSkipped('no Overtime owned by somebody other than the probe employee');
        $this->be($employee);

        // Pinned to the exact fatal: users_handled() returns [] for a non-privileged level, and
        // get_authenticated_user() calls findOrFail() on that array. Any OTHER \Error here would be a
        // different defect wearing this test's name.
        $this->expectException(\Error::class);
        $this->expectExceptionMessage('Call to a member function findOrFail() on array');
        $this->repo->update([
            'date'   => (string) $overtime->date,
            'amount' => '02:00',
            'type'   => 'pre_overtime',
        ], $overtime->id);
    }

    // ═══════════════════════════════════════════════════════════════════ where()  (was 50%)

    /** @test show_owned restricts the list to the signed-in employee's own overtime requests */
    public function show_owned_restricts_the_list_to_the_callers_own_overtime()
    {
        $overtime = $this->ownedOvertime();
        if (!$overtime) $this->markTestSkipped('no Overtime with an owning user in test DB');
        $this->be($overtime->user);

        $ids = $this->idsOf($this->repo->where(['show_owned' => true]));

        $this->assertContains((int) $overtime->id, $ids);
        $this->assertCount(Overtime::where('user_id', $overtime->user_id)->count(), $ids);
    }

    /** @test a status filter narrows the owned list to that status only */
    public function a_status_filter_narrows_the_owned_list_to_that_status_only()
    {
        $overtime = $this->ownedOvertime();
        if (!$overtime) $this->markTestSkipped('no Overtime with an owning user in test DB');
        $this->be($overtime->user);

        $this->repo->cancel($overtime->id);                          // pin the probe row's status

        $canceled = $this->repo->where([
            'show_owned' => true, 'request_status' => get_constant('REQUEST_STATUS.canceled'),
        ]);
        $pending = $this->repo->where([
            'show_owned' => true, 'request_status' => get_constant('REQUEST_STATUS.pending'),
        ]);

        $this->assertContains((int) $overtime->id, $this->idsOf($canceled));
        $this->assertNotContains((int) $overtime->id, $this->idsOf($pending));
    }

    /** @test both dates supplied filters on the closed range, one date supplied filters open-ended */
    public function the_three_date_filter_arms_each_bound_the_list_differently()
    {
        $overtime = $this->ownedOvertime();
        if (!$overtime) $this->markTestSkipped('no Overtime with an owning user in test DB');
        $this->be($overtime->user);

        $on    = (string) $overtime->date;
        $after = date('Y-m-d', strtotime($on . ' +1 day'));
        $prior = date('Y-m-d', strtotime($on . ' -1 day'));

        $this->assertContains((int) $overtime->id, $this->idsOf($this->repo->where(
            ['show_owned' => true, 'valid_from' => $prior, 'valid_to' => $after]
        )));
        $this->assertNotContains((int) $overtime->id, $this->idsOf($this->repo->where(
            ['show_owned' => true, 'valid_from' => $after, 'valid_to' => $after]
        )));

        $this->assertContains((int) $overtime->id,
            $this->idsOf($this->repo->where(['show_owned' => true, 'valid_from' => $on])));
        $this->assertNotContains((int) $overtime->id,
            $this->idsOf($this->repo->where(['show_owned' => true, 'valid_from' => $after])));

        $this->assertContains((int) $overtime->id,
            $this->idsOf($this->repo->where(['show_owned' => true, 'valid_to' => $on])));
        $this->assertNotContains((int) $overtime->id,
            $this->idsOf($this->repo->where(['show_owned' => true, 'valid_to' => $prior])));
    }

    /** @test the department filter keeps only requests raised by that department's employees */
    public function the_department_filter_keeps_only_that_departments_requests()
    {
        $overtime = $this->ownedOvertime();
        if (!$overtime) $this->markTestSkipped('no Overtime with an owning user in test DB');
        if (!$overtime->user->department_id) $this->markTestSkipped('probe owner has no department');
        $this->be($overtime->user);

        $own   = $this->idsOf($this->repo->where(
            ['show_owned' => true, 'department_id' => $overtime->user->department_id]
        ));
        $other = $this->idsOf($this->repo->where(
            ['show_owned' => true, 'department_id' => -1]      // no department carries this id
        ));

        $this->assertContains((int) $overtime->id, $own);
        $this->assertSame([], $other);
    }

    /** @test the free-text user filter matches on the numeric user id */
    public function the_user_filter_matches_on_the_numeric_user_id()
    {
        $overtime = $this->ownedOvertime();
        if (!$overtime) $this->markTestSkipped('no Overtime with an owning user in test DB');
        if ((string) $overtime->user->emp_num === '0') {
            $this->markTestSkipped('owner employee number is 0 — the no-match probe cannot be trusted');
        }
        $this->be($overtime->user);

        $mine   = $this->idsOf($this->repo->where(['show_owned' => true, 'user' => $overtime->user_id]));
        $nobody = $this->idsOf($this->repo->where(['show_owned' => true, 'user' => 'zzq-no-such-employee']));

        $this->assertContains((int) $overtime->id, $mine);
        $this->assertSame([], $nobody);
    }

    /** @test a database failure while listing overtime requests reaches the caller */
    public function a_database_failure_while_listing_overtime_reaches_the_caller()
    {
        $user = $this->anyActiveUser();
        if (!$user) $this->markTestSkipped('no active user in test DB');
        $this->be($user);

        $this->assertRethrowsDeadConnection(function () {
            return $this->repo->where(['show_owned' => true]);
        });
    }
}
