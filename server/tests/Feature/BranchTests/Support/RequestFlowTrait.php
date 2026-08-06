<?php

namespace Tests\Feature\BranchTests\Support;

use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;

/**
 * REQUEST-FLOW HELPER — build the data instead of hunting for it.
 *
 * WHY THIS EXISTS
 * The suite carries 791 data-dependent guards (307 markTestSkipped + 484 markTestIncomplete).
 * Almost all of them exist because a test needs a row it did not create — an overtime request, an
 * alter-log, a supervisor who can approve. When the probe misses, the test stops and covers
 * NOTHING. That is why classes with perfectly good tests were reporting 0% coverage: the tests
 * were running and giving up.
 *
 * Worse, the probes are narrow. DtrLogResourceTest inspected the 25 most recent DTRs and gave up if
 * none had a full user+timezone chain — on a database with thousands of rows that qualify.
 *
 * The approval tests hit a second wall: EVOX blocks self-approval, so a test acting as one user and
 * approving that same user's request is refused before it ever reaches the code under test. The
 * existing suites say so in their own skip messages:
 *     "Redesign with supervisor actingAs + employee user_id to reach the approve() branch."
 *
 * THE APPROACH (Vishnu's, 2026-08-06)
 * Run the flow in the order a real person runs it: the EMPLOYEE submits, then the SUPERVISOR
 * approves. Create the request rather than searching for one. The data is then guaranteed, the
 * self-approval gate is satisfied by construction, and the test exercises the real two-party
 * business flow instead of a fragment of it.
 *
 * SAFETY
 *  - Everything is written inside the test transaction. Use DatabaseTransactions in the suite and
 *    every row created here disappears at test end, including on failure.
 *  - Reads are bounded and indexed; no whole-table scans.
 *  - Both parties are required to have non-empty first AND last names. That is not cosmetic:
 *    finding CS-TRIG-1 shows the AFTER INSERT triggers on change_schedules and rest_day_works build
 *    a NOT NULL notification column with CONCAT(first_name,' ',last_name,...), and MySQL CONCAT
 *    returns NULL if any argument is NULL — which fails the trigger and rolls back the request.
 *    Selecting fully-named users keeps that real defect from masquerading as a broken fixture.
 */
trait RequestFlowTrait
{
    /** @var User|null the person who submits */
    protected $flowEmployee;
    /** @var User|null the person who approves */
    protected $flowSupervisor;

    /**
     * Resolve a real supervisor -> employee pair from users_supervisors.
     * Returns false when the database has no usable pair, so the caller can skip with a clear reason.
     */
    protected function resolveSupervisorPair(): bool
    {
        if ($this->flowEmployee && $this->flowSupervisor) {
            return true;
        }

        $named = function ($q, $alias) {
            $q->whereNotNull("$alias.first_name")->where("$alias.first_name", '!=', '')
              ->whereNotNull("$alias.last_name")->where("$alias.last_name", '!=', '')
              ->where("$alias.is_active", 1);
        };

        $pair = DB::table('users_supervisors as us')
            ->join('users as sup', 'sup.id', '=', 'us.supervisor_id')
            ->join('users as emp', 'emp.id', '=', 'us.user_id')
            ->where(function ($q) use ($named) { $named($q, 'sup'); })
            ->where(function ($q) use ($named) { $named($q, 'emp'); })
            // self-supervision would trip the very self-approval gate this helper exists to avoid
            ->whereColumn('us.supervisor_id', '!=', 'us.user_id')
            ->orderBy('us.user_id', 'desc')
            ->select('us.supervisor_id as sup_id', 'us.user_id as emp_id')
            ->first();

        if (!$pair) {
            return false;
        }

        $this->flowSupervisor = User::find($pair->sup_id);
        $this->flowEmployee   = User::find($pair->emp_id);

        return $this->flowSupervisor && $this->flowEmployee;
    }

    /**
     * Resolve a pair or stop the test with a reason that names the cause rather than the symptom.
     * Prefer this over an inline probe: it fails in one place, with one message.
     */
    protected function requireSupervisorPair(): void
    {
        if (!$this->resolveSupervisorPair()) {
            $this->markTestSkipped(
                'no usable supervisor/employee pair in users_supervisors — both parties must be '
                . 'active, differ from one another, and carry non-empty first and last names '
                . '(see CS-TRIG-1 for why the names matter)'
            );
        }
    }

    /** Act as the person who submits the request. */
    protected function asEmployee(): User
    {
        $this->requireSupervisorPair();
        $this->be($this->flowEmployee);
        return $this->flowEmployee;
    }

    /** Act as the person who approves it. */
    protected function asSupervisor(): User
    {
        $this->requireSupervisorPair();
        $this->be($this->flowSupervisor);
        return $this->flowSupervisor;
    }

    /**
     * The full two-party flow: the employee submits, then the supervisor approves.
     *
     * @param callable $submit  fn(User $employee): mixed  — runs authenticated as the employee
     * @param callable $approve fn(User $supervisor, $submitted): mixed — runs as the supervisor
     * @return array [submitResult, approveResult]
     */
    protected function submitThenApprove(callable $submit, callable $approve): array
    {
        $employee   = $this->asEmployee();
        $submitted  = $submit($employee);

        $supervisor = $this->asSupervisor();
        $approved   = $approve($supervisor, $submitted);

        return [$submitted, $approved];
    }

    /**
     * A date far enough in the past that it cannot collide with live schedules or payroll runs,
     * and stable so tests do not drift with the calendar. Never "today".
     */
    protected function flowDate(int $daysBack = 0): string
    {
        return date('Y-m-d', strtotime('1990-06-11 +' . $daysBack . ' days'));
    }
}
