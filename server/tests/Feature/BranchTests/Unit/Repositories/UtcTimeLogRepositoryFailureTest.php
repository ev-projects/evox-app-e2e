<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Feature\BranchTests\Support\DeadConnectionTrait;
use App\Modules\User\Models\User;
use App\Modules\User\Models\UtcTimelog;
use App\Modules\User\Repositories\UtcTimeLogRepository;

/**
 * =====================================================================================================
 *  SOURCE FILE UNDER TEST
 *      app/Modules/User/Repositories/UtcTimeLogRepository.php :: check_adjustment  (87.10% before this)
 *
 *  MENU PATH
 *      Profile -> UTC Time Log -> Sync Adjustment
 *      (GET /api/utc/sync_adjustment -> UtctimelogController::sync_adjustment -> check_adjustment)
 *
 *  WHAT WAS LEFT
 *      The success arm is covered by ZeroCoverageModelsReposTest
 *      (utc_adjustment_check_walks_the_year_and_records_dst_windows) and the controller's own arms are
 *      covered by Profile/UtcTimeLog/load.UtcTimeLogBranchTest with the repository mocked. The residue
 *      is the catch arm — the three lines that decide what a payroll administrator sees when the sync
 *      dies halfway through: DB::rollback(), log_error($e), throw $e.
 *
 *  WHY THAT ARM MATTERS
 *      check_adjustment() walks every configured country across a whole year and REWRITES
 *      time_difference_adjusted / start_adjustment / end_adjustment on each utc_timelog row. Those
 *      three columns decide what time every employee's punches are displayed in, for every geography.
 *      A half-applied sync would leave some countries on the new DST window and some on the old one,
 *      with no error shown. The catch arm is what prevents that, and it had never executed.
 *
 *  HOW THE FAILURE IS PRODUCED
 *      Support/DeadConnectionTrait swaps ELOQUENT's connection resolver for one that throws on first
 *      use, inside a try/finally. The DB facade is untouched, so the DatabaseTransactions transaction
 *      this suite opened is unaffected and the repository's own DB::beginTransaction()/rollback()
 *      still work — which is exactly what lets the rollback be observed. Nothing is written, no
 *      utc_timelog row is poisoned, and the resolver is restored even when an assertion fails.
 *
 *      Ordering note: the authenticated user is resolved in setUp() because log_error() ->
 *      log_to_file() reads auth()->user() from inside the catch arm and must not need the database.
 *
 *  FINDINGS RAISED HERE
 *      none — the arm behaves correctly.
 * =====================================================================================================
 */
class UtcTimeLogRepositoryFailureTest extends TestCase
{
    use DatabaseTransactions, DeadConnectionTrait;

    /** @var UtcTimeLogRepository */
    private $repo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = new UtcTimeLogRepository();

        $user = User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$user) $this->markTestSkipped('no active user in test DB — the catch arm logs auth()->user()');
        $this->be($user);
    }

    /** The three columns the sync rewrites, for every configured country. */
    private function dstWindows()
    {
        return UtcTimelog::orderBy('country_id')
            ->get(['country_id', 'time_difference', 'time_difference_adjusted',
                   'start_adjustment', 'end_adjustment'])
            ->toArray();
    }

    /**
     * @test
     * BUSINESS RULE — a database failure during the DST sync must reach the caller. The controller
     * turns a thrown exception into a 400 the administrator can see; swallowing it would report
     * "synced" over a table that was never touched.
     */
    public function a_database_failure_during_the_dst_sync_is_reported_to_the_caller()
    {
        $caught = $this->assertRethrowsDeadConnection(function () {
            $this->repo->check_adjustment();
        });

        // rethrown verbatim, not wrapped in a generic "something went wrong"
        $this->assertInstanceOf(\RuntimeException::class, $caught);
        $this->assertSame('DEAD-CONNECTION (test seam)', $caught->getMessage());
    }

    /**
     * @test
     * BUSINESS RULE — and it must reach the caller with NOTHING half-applied: the catch arm rolls its
     * own transaction back, so every country's DST window is exactly as it was before the sync ran.
     * The transaction level returning to its starting value is the proof that DB::rollback() executed
     * — had the catch arm skipped it, the sync's transaction would still be open.
     */
    public function a_failed_dst_sync_leaves_every_countrys_window_exactly_as_it_found_it()
    {
        $before = $this->dstWindows();
        if (!$before) $this->markTestSkipped('utc_timelog is empty — there is no window to protect');
        $level = DB::transactionLevel();

        $this->assertRethrowsDeadConnection(function () {
            $this->repo->check_adjustment();
        });

        $this->assertSame(
            $level,
            DB::transactionLevel(),
            'the catch arm left its transaction open — DB::rollback() did not run'
        );
        $this->assertEquals($before, $this->dstWindows());
    }
}
