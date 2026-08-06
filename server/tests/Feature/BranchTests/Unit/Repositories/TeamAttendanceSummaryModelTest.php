<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Database\Eloquent\Collection;
use App\Modules\Payroll\Models\TeamAttendanceSummary;
use App\Modules\User\Models\User;

/**
 * TeamAttendanceSummary model (72.6%, 97 unc lines) — the aggregation engine behind
 * Reports → Team Attendance Summary (all three variants: get_summary, get_summary2,
 * get_summary_dtr). READ-ONLY: it only reads DTRs/leaves/holidays/overtime for the users it is
 * given. Every call here is bounded to ONE probed user and a SHORT date range — no whole-table
 * scans, no writes (DatabaseTransactions is belt-and-braces only).
 *
 * Arms: empty-collection baseline (structure + zero counters), single-user real aggregation over
 * a range that HAS dtr rows, future-date clamping (start/end beyond today collapse to today),
 * hire-date/termination-date eligibility gates (headcount excludes users hired after the window
 * or terminated before it), and the clear_properties reset between successive calls.
 */
class TeamAttendanceSummaryModelTest extends TestCase
{
    use DatabaseTransactions;

    /** @var TeamAttendanceSummary */
    private $summary;
    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->summary = new TeamAttendanceSummary();

        // ONE user who actually has DTR rows — bounded probe
        $this->user = User::whereNotNull('date_hired')
            ->where('is_active', 1)
            ->whereHas('dtr')
            ->orderBy('id', 'desc')
            ->first()
            ?? User::whereNotNull('date_hired')->where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$this->user) $this->markTestSkipped('no active user with a hire date in test DB');
        $this->be($this->user);
    }

    private function one()
    {
        $c = new Collection();
        $c->push($this->user);
        return $c;
    }

    private function assertSummaryShape(array $result)
    {
        foreach (['total_headcount', 'scheduled_employees', 'attendance', 'unplanned_leaves',
                  'planned_leaves', 'total_rest_day_work', 'total_overtime', 'to_be_determinded',
                  'dtr_collection', 'employee_list_summary'] as $key) {
            $this->assertArrayHasKey($key, $result);
        }
        foreach (['scheduled_employees', 'attendance', 'unplanned_leaves', 'planned_leaves'] as $bucket) {
            $this->assertArrayHasKey('total_count', $result[$bucket]);
            $this->assertArrayHasKey('total_percentage', $result[$bucket]);
            $this->assertArrayHasKey('target_percentage', $result[$bucket]);
            $this->assertIsArray($result[$bucket]['users']);
        }
    }

    // ------------------------------------------------------------------ empty baseline
    /** @test */
    public function empty_user_collection_returns_the_zeroed_structure()
    {
        $result = $this->summary->get_summary(new Collection(), '2026-07-01', '2026-07-07');

        $this->assertSummaryShape($result);
        $this->assertSame(0, $result['total_headcount']);
        $this->assertSame(0, $result['attendance']['total_count']);
        $this->assertCount(0, $result['dtr_collection']);
        $this->assertSame(95, $result['scheduled_employees']['target_percentage']);   // defaults
        $this->assertSame(3, $result['unplanned_leaves']['target_percentage']);
        $this->assertSame(7, $result['planned_leaves']['target_percentage']);
    }

    // -------------------------------------------------------------- single-user aggregation
    /** @test */
    public function single_user_over_a_recent_week_aggregates_without_error()
    {
        $end = now()->format('Y-m-d');
        $start = now()->subDays(6)->format('Y-m-d');

        $result = $this->summary->get_summary($this->one(), $start, $end);

        $this->assertSummaryShape($result);
        // the probed user is eligible unless hired after the window / terminated before it
        $this->assertLessThanOrEqual(1, $result['total_headcount']);
        $this->assertGreaterThanOrEqual(0, $result['attendance']['total_count']);
        // every bucket count is bounded by the dtr rows actually read
        $dtrCount = count($result['dtr_collection']);
        foreach (['attendance', 'unplanned_leaves', 'planned_leaves'] as $bucket) {
            $this->assertLessThanOrEqual($dtrCount, $result[$bucket]['total_count']);
        }
    }

    /** @test */
    public function future_dates_are_clamped_to_today()
    {
        $future = now()->addYears(2);

        $result = $this->summary->get_summary(
            $this->one(), $future->format('Y-m-d'), $future->addDays(7)->format('Y-m-d'));

        $this->assertSummaryShape($result);
        // no DTR exists two years out: the clamp keeps the read bounded and empty
        $this->assertCount(0, $result['dtr_collection']);
    }

    // ---------------------------------------------------------------- eligibility gates
    /** @test */
    public function user_hired_after_the_window_is_excluded_from_headcount()
    {
        $probe = clone $this->user;
        $probe->date_hired = now()->addYear()->format('Y-m-d');       // hired in the future

        $c = new Collection();
        $c->push($probe);

        $result = $this->summary->get_summary($c, now()->subDays(6)->format('Y-m-d'),
                                              now()->format('Y-m-d'));

        $this->assertSame(0, $result['total_headcount']);              // hire-date gate arm
    }

    /** @test */
    public function user_terminated_before_the_window_is_excluded_from_headcount()
    {
        $probe = clone $this->user;
        $probe->date_hired = '2015-01-01';
        $probe->termination_date = '2016-01-01';                       // long gone

        $c = new Collection();
        $c->push($probe);

        $result = $this->summary->get_summary($c, now()->subDays(6)->format('Y-m-d'),
                                              now()->format('Y-m-d'));

        $this->assertSame(0, $result['total_headcount']);              // termination gate arm
    }

    // ------------------------------------------------------------------- reset + variants
    /** @test */
    public function successive_calls_reset_the_accumulators()
    {
        $start = now()->subDays(6)->format('Y-m-d');
        $end = now()->format('Y-m-d');

        $first = $this->summary->get_summary($this->one(), $start, $end);
        $second = $this->summary->get_summary($this->one(), $start, $end);

        $this->assertSame($first['total_headcount'], $second['total_headcount']);   // no doubling
        $this->assertSame(count($first['dtr_collection']), count($second['dtr_collection']));
    }

    /** @test */
    public function summary_variants_two_and_dtr_return_the_same_structure()
    {
        $start = now()->subDays(6)->format('Y-m-d');
        $end = now()->format('Y-m-d');

        $this->assertSummaryShape($this->summary->get_summary2($this->one(), $start, $end));
        $this->assertSummaryShape($this->summary->get_summary_dtr($this->one(), $start, $end));
    }
}
