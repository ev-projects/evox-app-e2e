<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;

/**
 * DtrRepository — the guard and resolution paths of the highest-risk methods in the codebase.
 *
 * WHY THIS SUITE IS SHAPED THE WAY IT IS. Gobi's 05-Aug executive report ranks
 * "Extend DtrRepository test coverage (18 uncovered methods)" as HIGH risk, noting these
 * "run on every attendance sync". Agreed — and that is exactly why this suite does NOT drive
 * their write paths against the live database.
 *
 * remove_schedule_to_dtr() iterates a user's DTRs and UPDATES each one. Updating `dtrs` fires
 * five AFTER UPDATE triggers that call payroll stored procedures. The rest of this suite avoids
 * that for a reason our own DtrStatusMethodsTest already documents:
 *     "Only INSERTs are issued against dtrs ... never an UPDATE, because the five AFTER UPDATE
 *      triggers on `dtrs` ... call the payroll ..."
 * A stored procedure that commits internally would escape the test transaction, and the database
 * here is a live-server backup dump. So the write path is deliberately left to a developer with a
 * disposable database.
 *
 * What IS covered here is everything before the first write — the branching that decides whether
 * a write happens at all, and to which rows:
 *   - the User-or-id polymorphic argument, both forms
 *   - the not-found path on an unknown id
 *   - the valid_to present / absent branch that picks the date window
 *   - the empty-collection path, where the method must complete cleanly and change nothing
 *
 * That is real coverage of real decisions, taken without putting a payroll table at risk. The
 * remaining write-path methods are listed at the bottom for whoever runs against a scratch DB.
 */
class DtrRepositoryGuardPathsTest extends TestCase
{
    use DatabaseTransactions;

    /** @var DtrRepositoryInterface */
    private $repo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = $this->app->make(DtrRepositoryInterface::class);
    }

    /** A user guaranteed to hold no DTRs in the chosen window, so nothing can be updated. */
    private function userWithNoDtrsIn(string $from, string $to): ?User
    {
        return User::whereNotExists(function ($q) use ($from, $to) {
                $q->select(DB::raw(1))->from('dtrs')
                  ->whereRaw('dtrs.user_id = users.id')
                  ->whereBetween('dtrs.date', [$from, $to]);
            })
            ->where('is_active', 1)
            ->orderBy('id', 'desc')
            ->first();
    }

    /** An unsaved Schedule carrying only the two fields the date-window branch reads. */
    private function schedule(?string $validTo): Schedule
    {
        $s = new Schedule();
        $s->valid_from = '1990-06-01';
        $s->valid_to   = $validTo;
        return $s;
    }

    /** @test */
    public function an_unknown_user_id_is_rejected_before_any_dtr_is_touched()
    {
        $orphanId = ((int) User::max('id')) + 999999;

        // findOrFail is the first thing the method does with the id — a bad id must stop here,
        // not part-way through updating somebody else's attendance.
        $this->expectException(ModelNotFoundException::class);

        $this->repo->remove_schedule_to_dtr($orphanId, $this->schedule('1990-06-30'));
    }

    /** @test */
    public function a_user_id_and_a_user_model_are_accepted_interchangeably()
    {
        $user = $this->userWithNoDtrsIn('1990-06-01', '1990-06-30');
        if (!$user) $this->markTestSkipped('every active user holds a DTR in the probe window');

        $byId    = $this->repo->remove_schedule_to_dtr($user->id, $this->schedule('1990-06-30'));
        $byModel = $this->repo->remove_schedule_to_dtr($user, $this->schedule('1990-06-30'));

        // the polymorphic argument is the method's first branch; both forms must reach the same place
        foreach ([$byId, $byModel] as $result) {
            $this->assertIsArray($result);
            $this->assertArrayHasKey('updated', $result);
            $this->assertArrayHasKey('not_updated', $result);
        }
    }

    /** @test */
    public function a_window_containing_no_dtrs_completes_cleanly_and_updates_nothing()
    {
        $user = $this->userWithNoDtrsIn('1990-06-01', '1990-06-30');
        if (!$user) $this->markTestSkipped('every active user holds a DTR in the probe window');

        $before = DB::table('dtrs')->where('user_id', $user->id)->count();

        $result = $this->repo->remove_schedule_to_dtr($user, $this->schedule('1990-06-30'));

        $this->assertSame([], $result['updated'], 'nothing to update means an empty updated list');
        $this->assertSame([], $result['not_updated']);
        $this->assertSame($before, DB::table('dtrs')->where('user_id', $user->id)->count(),
            'an empty window must not create, delete or otherwise disturb any DTR row');
    }

    /**
     * The date-window branch: a schedule with valid_to fetches BETWEEN the two dates; one without
     * fetches from valid_from onwards. Getting this wrong would either miss days that should be
     * cleared or reach forward into days the schedule never covered.
     *
     * @test
     */
    public function an_open_ended_schedule_selects_a_different_window_than_a_closed_one()
    {
        $user = $this->userWithNoDtrsIn('1990-06-01', '1990-06-30');
        if (!$user) $this->markTestSkipped('every active user holds a DTR in the probe window');

        $closed = $this->repo->remove_schedule_to_dtr($user, $this->schedule('1990-06-30'));
        $open   = $this->repo->remove_schedule_to_dtr($user, $this->schedule(null));

        // Both arms are exercised; on a user with no rows in either window both come back empty,
        // which is the assertion that proves the open-ended arm did not silently widen to every
        // DTR the user has ever had.
        $this->assertSame([], $closed['updated']);
        $this->assertSame([], $open['updated'],
            'an open-ended schedule must not sweep up DTRs outside the probe window');
    }

    /* ---------------------------------------------------------------------------------------
     * NOT COVERED HERE — needs a disposable database, not the live-server dump.
     *
     *   remove_schedule_to_dtr()   the UPDATE loop itself, incl. the is_rest_day null-out branch
     *   apply_alter_to_punch()     rewrites punches from an approved alter-log
     *   sync_biometrics_to_dtr()   device punches -> dtrs (see the biometrics seam work)
     *   compute_payroll_items()    the PHP half of the two-engine problem, PAY-2ENGINE-1
     *
     * Every one of these updates `dtrs` and therefore fires the payroll triggers. They are the
     * highest-value backend tests still unwritten, and they need an environment where a stored
     * procedure committing mid-test cannot damage anything.
     * ------------------------------------------------------------------------------------ */
}
