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
 * SP-FAKE SEAM EXEMPLAR (2026-07-28) — the pattern Vishnu asked for: REAL repository code
 * (every line/branch counts toward coverage), stored procedures FAKED at the boundary, and
 * everything scoped to ONE user — no whole-DB iteration, no live SP, no hang possible.
 *
 * Target: DtrRepository::bind_leaves_to_dtr — the BUG-079 method that froze runs 2 and 3
 * when tests hit its real SP. With the seam it is finally fully testable:
 *   arm 1: approved leave + existing DTR  -> SP called with built leave_data, row in result
 *   arm 2: non-approved status           -> guard rejects, no SP, empty result
 *   arm 3: unknown BHR number            -> user lookup null, row skipped, no SP
 *   arm 4: no DTR in the date range      -> inner throw -> per-row catch -> continue
 *   arm 5: amount rounding               -> 0.3 day -> 0.5 (the <=0.5 branch)
 * Every test asserts BOTH the return shape AND what the SP was (or wasn't) asked to do.
 */
class DtrRepositorySpFakeTest extends TestCase
{
    use DatabaseTransactions;

    /** @var DtrRepository */
    private $repo;
    /** @var User */
    private $bhrUser;
    /** @var Dtr */
    private $dtr;

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();
        $this->repo = app()->make(DtrRepository::class);

        // ONE user with a BHR number and at least one DTR row — bounded probe, no table scan
        $this->dtr = Dtr::select('dtrs.*')
            ->join('users', 'dtrs.user_id', '=', 'users.id')
            ->whereNotNull('users.bhr_num')
            ->orderBy('dtrs.id', 'desc')
            ->first();
        if (!$this->dtr) $this->markTestIncomplete('no DTR row with a BHR-numbered user in test DB');
        $this->bhrUser = User::find($this->dtr->user_id);
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        parent::tearDown();
    }

    /** BHR-shaped leave row for this user/date. */
    private function bhrLeave(array $overrides = [])
    {
        $date = $this->dtr->date;
        $base = [
            'id' => 101,
            'employeeId' => $this->bhrUser->bhr_num,
            'start' => $date,
            'end' => $date,
            'dates' => (object) [$date => 1],
            'type' => (object) ['name' => 'Vacation Leave'],
            'status' => (object) ['status' => 'approved', 'lastChangedByUserId' => 7],
            'notes' => (object) ['employee' => 'emp note', 'manager' => 'mgr note'],
            'amount' => (object) ['amount' => 1],
        ];
        return (object) array_merge($base, $overrides);
    }

    public function test_approved_leave_binds_and_calls_sp_with_built_leave_data()
    {
        CallSpFake::fake('InsertOrUpdateLeaves', [[]]);

        $result = $this->repo->bind_leaves_to_dtr([$this->bhrLeave()]);

        // processed row returned with the user's real identifiers
        $this->assertCount(1, $result);
        $this->assertSame('Vacation Leave', $result[0]['leave_type']);
        $this->assertSame('approved', $result[0]['status']);
        $this->assertSame($this->bhrUser->emp_num, $result[0]['employee_no']);

        // the SP received exactly the leave_data the repo built (params: dtr_id, type, status,
        // amount, employee_note, manager_note, approved_by)
        $calls = CallSpFake::callsFor('InsertOrUpdateLeaves');
        $this->assertNotEmpty($calls);
        $p = $calls[0]['params'];
        $this->assertSame($this->dtr->id, $p[0]);
        $this->assertSame('Vacation Leave', $p[1]);
        $this->assertSame('approved', $p[2]);
        $this->assertEquals(1, $p[3]);          // full-day amount
        $this->assertSame(7, $p[6]);            // approved_by = lastChangedByUserId
    }

    public function test_non_approved_status_is_guard_rejected_without_sp()
    {
        $leave = $this->bhrLeave(['status' => (object) ['status' => 'pending', 'lastChangedByUserId' => 0]]);

        $result = $this->repo->bind_leaves_to_dtr([$leave]);

        $this->assertSame([], $result);
        $this->assertSame([], CallSpFake::calls());   // SP boundary never touched
    }

    public function test_unknown_bhr_number_skips_row_without_sp()
    {
        CallSpFake::fake('InsertOrUpdateLeaves', [[]]);
        $leave = $this->bhrLeave(['employeeId' => 'ZZ-NO-SUCH-BHR-' . uniqid()]);

        $result = $this->repo->bind_leaves_to_dtr([$leave]);

        $this->assertSame([], $result);
        $this->assertSame([], CallSpFake::callsFor('InsertOrUpdateLeaves'));
    }

    public function test_no_dtr_in_range_hits_per_row_catch_and_continues()
    {
        CallSpFake::fake('InsertOrUpdateLeaves', [[]]);
        // far-future range: user exists, zero DTR rows -> inner throw -> catch -> continue
        $leave = $this->bhrLeave(['start' => '2093-01-01', 'end' => '2093-01-02',
                                  'dates' => (object) ['2093-01-01' => 1]]);

        $result = $this->repo->bind_leaves_to_dtr([$leave]);

        $this->assertSame([], $result);
        $this->assertSame([], CallSpFake::callsFor('InsertOrUpdateLeaves'));
    }

    public function test_half_day_amount_rounds_up_to_half()
    {
        CallSpFake::fake('InsertOrUpdateLeaves', [[]]);
        $leave = $this->bhrLeave(['dates' => (object) [$this->dtr->date => 0.3]]);

        $this->repo->bind_leaves_to_dtr([$leave]);

        $calls = CallSpFake::callsFor('InsertOrUpdateLeaves');
        $this->assertNotEmpty($calls);
        $this->assertEquals(0.5, $calls[0]['params'][3]);   // 0 < amount <= 0.5 -> 0.5
    }

    public function test_date_bounds_filter_skips_out_of_range_dtrs()
    {
        CallSpFake::fake('InsertOrUpdateLeaves', [[]]);

        // bounds that exclude the DTR's date -> per-DTR skip arm; row still processed (no throw)
        $result = $this->repo->bind_leaves_to_dtr([$this->bhrLeave()], null, '2094-01-01', '2094-01-02');

        $this->assertCount(1, $result);
        $this->assertSame([], CallSpFake::callsFor('InsertOrUpdateLeaves'));
    }
}
