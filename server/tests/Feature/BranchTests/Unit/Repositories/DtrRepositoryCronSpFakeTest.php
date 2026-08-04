<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Repositories\DtrRepository;
use App\Modules\User\Models\User;

/**
 * SP-FAKE SEAM ROLLOUT (2026-07-28) — the cron-side DtrRepository bodies, REAL code, single-user
 * scoped, seam ACTIVE as a tripwire (these methods are SP-free by static scan; if any hidden SP
 * path exists the seam throws instead of hanging — fail fast by design).
 *
 * Cron map covered here:
 *   generate_weekly_dtr  -> generate_dtr( users, dates )        [real writes, rolled back]
 *   sync_holidays        -> bind_holidays_to_dtr( start, end )  [1-day bounded range]
 *   sync_leaves          -> bind_superceded_leaves_to_dtr(...)  [superceded arm + empty-input FINDING]
 *   sync_realtime_bio    -> sync_biometrics_to_dtr( empty )     [entry/exit arm; fixture arm next wave]
 *
 * // FINDING DTR-SUP-1: bind_superceded_leaves_to_dtr with NO superceded rows leaves
 *    $leave_insert_array undefined -> implode(null) -> malformed INSERT -> QueryException.
 *    Every sync_leaves cron run with zero superceded leaves takes this path and only survives
 *    because CronController catches the rethrow. Characterized below.
 */
class DtrRepositoryCronSpFakeTest extends TestCase
{
    use DatabaseTransactions;

    /** @var DtrRepository */
    private $repo;
    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();
        $this->repo = app()->make(DtrRepository::class);
        $this->user = User::where('is_active', 1)->whereNotNull('bhr_num')->first()
                   ?? User::whereNotNull('bhr_num')->first();
        if (!$this->user) $this->markTestIncomplete('no BHR-numbered user in test DB');
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        parent::tearDown();
    }

    // ── generate_dtr ─────────────────────────────────────────────────────────

    public function test_generate_dtr_creates_rows_for_one_user_and_two_dates()
    {
        $dates = ['2094-03-02', '2094-03-03'];   // far future: guaranteed-new rows, rolled back after

        $result = $this->repo->generate_dtr(User::where('id', $this->user->id)->get(), $dates);

        $this->assertSame(2, $result['total_dtr_count']);
        // rows really exist inside the transaction
        $found = Dtr::where('user_id', $this->user->id)->whereIn('date', $dates)->count();
        $this->assertSame(2, $found);
        $this->assertSame([], CallSpFake::calls());   // tripwire: no hidden SP was reached
    }

    public function test_generate_dtr_is_idempotent_on_duplicate_dates()
    {
        $dates = ['2094-03-04'];
        $this->repo->generate_dtr(User::where('id', $this->user->id)->get(), $dates);
        // second run takes the ON DUPLICATE KEY UPDATE arm — no error, still one row
        $this->repo->generate_dtr(User::where('id', $this->user->id)->get(), $dates);

        $this->assertSame(1, Dtr::where('user_id', $this->user->id)->where('date', $dates[0])->count());
    }

    // ── bind_holidays_to_dtr ─────────────────────────────────────────────────

    public function test_bind_holidays_to_dtr_runs_bounded_one_day_range()
    {
        // one-day window: bounded holiday + DTR queries; deletes/inserts are transactional
        $result = $this->repo->bind_holidays_to_dtr('2094-03-02', '2094-03-02');

        $this->assertNotNull($result);
        $this->assertSame([], CallSpFake::calls());
    }

    // ── bind_superceded_leaves_to_dtr ────────────────────────────────────────

    public function test_superceded_leave_is_bound_as_canceled_for_one_user()
    {
        $dtr = Dtr::where('user_id', $this->user->id)->orderBy('id', 'desc')->first();
        if (!$dtr) $this->markTestIncomplete('user has no DTR row');

        $row = (object) [
            'id' => 501,
            'employeeId' => $this->user->bhr_num,
            'start' => $dtr->date,
            'end' => $dtr->date,
            'dates' => (object) [$dtr->date => 1],
            'type' => (object) ['name' => 'Vacation Leave'],
            'status' => (object) ['status' => 'superceded', 'lastChangedByUserId' => 3],
            'notes' => (object) ['employee' => 'e', 'manager' => 'm'],
            'amount' => (object) ['amount' => 1],
        ];

        $processed = $this->repo->bind_superceded_leaves_to_dtr([$row]);

        $this->assertCount(1, $processed);
        $this->assertSame('superceded', $processed[0]['status']);
        $this->assertSame($this->user->emp_num, $processed[0]['employee_no']);
        $this->assertSame([], CallSpFake::calls());   // pure SQL batch — no SP
    }

    public function test_non_superceded_rows_are_ignored_but_empty_batch_throws_finding_dtr_sup_1()
    {
        $row = (object) [
            'id' => 502,
            'employeeId' => $this->user->bhr_num,
            'start' => '2094-03-02', 'end' => '2094-03-02',
            'dates' => (object) ['2094-03-02' => 1],
            'type' => (object) ['name' => 'Vacation Leave'],
            'status' => (object) ['status' => 'approved', 'lastChangedByUserId' => 3],
            'notes' => null, 'amount' => (object) ['amount' => 1],
        ];

        // FINDING DTR-SUP-1: zero superceded rows -> $leave_insert_array never initialized ->
        // malformed INSERT -> exception (characterized as-is; fix = guard the empty batch)
        $this->expectException(\Exception::class);
        $this->repo->bind_superceded_leaves_to_dtr([$row]);
    }

    // ── sync_biometrics_to_dtr ───────────────────────────────────────────────

    public function test_sync_biometrics_with_empty_collection_completes_without_touching_sp()
    {
        $result = $this->repo->sync_biometrics_to_dtr(new \Illuminate\Database\Eloquent\Collection([]));

        $this->assertNotNull($result);
        $this->assertSame([], CallSpFake::calls());
    }
}
