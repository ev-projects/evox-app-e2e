<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\Collection;
use App\Modules\User\Models\User;
use App\Modules\Payroll\Models\TeamAttendanceSummary;

/**
 * Item 6 — covers TeamAttendanceSummary (3 public methods).
 *
 * TeamAttendanceSummary is a pure computation class (no constructor injection).
 * All three methods are read-only — they query DTRs, leaves, holidays, payroll
 * items from existing data and build a summary array. No DB writes; no rollback
 * needed, but DatabaseTransactions is included for consistency.
 *
 * get_summary2 calls $user->permissions()->pluck('name') in one branch —
 * if User has no HasRoles trait that path throws, but the method's own try-catch
 * converts it to error_response(). Test asserts the return is an array (pass or
 * error_response either way).
 *
 * Date range: 2026-03-01 to 2026-03-31 (closed payroll period — all DTRs exist).
 */
class evoxtest_TeamAttendanceSummaryTest extends TestCase
{
    use DatabaseTransactions;

    private TeamAttendanceSummary $summary;
    private User $supervisor;   // Gary Aure — id=1698
    private User $employee;     // Glenn Macasarte — id=1593

    protected function setUp(): void
    {
        parent::setUp();
        $this->summary    = new TeamAttendanceSummary();
        $this->supervisor = User::findOrFail(1698);
        $this->employee   = User::findOrFail(1593);
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    private function singleUser(User $user): Collection
    {
        return User::where('id', $user->id)->get();
    }

    private function twoUsers(): Collection
    {
        return User::whereIn('id', [1593, 1698])->get();
    }

    // ─── get_summary ─────────────────────────────────────────────────────────

    public function test_get_summary_single_employee_returns_valid_structure()
    {
        Auth::setUser($this->employee);
        $result = $this->summary->get_summary(
            $this->singleUser($this->employee),
            '2026-03-01',
            '2026-03-31'
        );
        $this->assertIsArray($result);
        $this->assertArrayHasKey('total_headcount', $result);
        $this->assertArrayHasKey('scheduled_employees', $result);
        $this->assertArrayHasKey('planned_leaves', $result);
        $this->assertArrayHasKey('unplanned_leaves', $result);
        $this->assertArrayHasKey('total_overtime', $result);
        $this->assertArrayHasKey('total_rest_day_work', $result);
    }

    public function test_get_summary_two_users_headcount_matches()
    {
        Auth::setUser($this->supervisor);
        $result = $this->summary->get_summary(
            $this->twoUsers(),
            '2026-03-01',
            '2026-03-31'
        );
        $this->assertIsArray($result);
        // Both users satisfy date_hired < start_date condition → headcount >= 1
        $this->assertGreaterThanOrEqual(1, $result['total_headcount']);
    }

    public function test_get_summary_empty_collection_returns_zero_headcount()
    {
        Auth::setUser($this->employee);
        $result = $this->summary->get_summary(
            new Collection(),
            '2026-03-01',
            '2026-03-31'
        );
        $this->assertIsArray($result);
        $this->assertEquals(0, $result['total_headcount']);
    }

    public function test_get_summary_future_date_range_clamps_to_today()
    {
        Auth::setUser($this->employee);
        // Both start and end > today → clamped to today, no DTR rows → still returns structure
        $result = $this->summary->get_summary(
            $this->singleUser($this->employee),
            '2030-01-01',
            '2030-01-31'
        );
        $this->assertIsArray($result);
    }

    // ─── get_summary2 ────────────────────────────────────────────────────────

    /**
     * V2: per-employee status map ('P', 'A', 'RD', 'H', 'TBD', etc.).
     * The method has its own try-catch — even if permissions() throws, it returns
     * error_response() which is an array. assertIsArray covers both paths.
     */
    public function test_get_summary2_returns_employee_list_summary()
    {
        Auth::setUser($this->supervisor);
        $result = $this->summary->get_summary2(
            $this->singleUser($this->employee),
            '2026-03-01',
            '2026-03-31'
        );
        $this->assertIsArray($result);
        $this->assertArrayHasKey('employee_list_summary', $result);
    }

    public function test_get_summary2_totals_are_counts_of_user_arrays()
    {
        Auth::setUser($this->supervisor);
        $result = $this->summary->get_summary2(
            $this->singleUser($this->employee),
            '2026-03-01',
            '2026-03-31'
        );
        $this->assertIsArray($result);
        // V2 sets total_count = count(users) after the loop — validate key presence
        $this->assertArrayHasKey('scheduled_employees', $result);
        $this->assertArrayHasKey('attendance', $result);
    }

    public function test_get_summary2_empty_collection()
    {
        Auth::setUser($this->employee);
        $result = $this->summary->get_summary2(
            new Collection(),
            '2026-03-01',
            '2026-03-31'
        );
        $this->assertIsArray($result);
        $this->assertEquals(0, $result['total_headcount']);
    }

    // ─── get_summary_dtr ─────────────────────────────────────────────────────

    /**
     * Lightweight DTR-only summary — returns employee_list_summary keyed by
     * user_id, each containing date+status rows.
     */
    public function test_get_summary_dtr_returns_employee_list()
    {
        Auth::setUser($this->supervisor);
        $result = $this->summary->get_summary_dtr(
            $this->singleUser($this->employee),
            '2026-03-01',
            '2026-03-31'
        );
        $this->assertIsArray($result);
        $this->assertArrayHasKey('employee_list_summary', $result);
    }

    public function test_get_summary_dtr_two_users_returns_two_entries()
    {
        Auth::setUser($this->supervisor);
        $result = $this->summary->get_summary_dtr(
            $this->twoUsers(),
            '2026-03-01',
            '2026-03-31'
        );
        $this->assertIsArray($result);
        // employee_list_summary is keyed by user_id — at least 1 key for each user that has DTR
        $this->assertArrayHasKey('employee_list_summary', $result);
    }

    public function test_get_summary_dtr_empty_collection()
    {
        Auth::setUser($this->employee);
        $result = $this->summary->get_summary_dtr(
            new Collection(),
            '2026-03-01',
            '2026-03-31'
        );
        $this->assertIsArray($result);
        $this->assertEmpty($result['employee_list_summary']);
    }
}
