<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Payroll/Repositories/DtrRepository.php
 *       ::get_dtr_logs   ::compute_payroll_items   ::get_leaves_from_dtr
 *
 * MENU PATH
 *   My Team -> Schedule            (get_dtr_logs, the team_schedule link)
 *   Reports -> DTR Logs / export   (get_dtr_logs, the default ordering)
 *   every approve/decline and every schedule change   (compute_payroll_items)
 *
 * COVERAGE BEFORE THIS FILE
 *   get_dtr_logs          68.97% of lines
 *   compute_payroll_items 64.29% of lines
 *   get_leaves_from_dtr   40.00% of lines
 *
 * WHAT THESE RULES MEAN
 *   get_dtr_logs serves two screens from one query and orders them differently on purpose: the team
 *   schedule grid reads chronologically (a day at a time, shift by shift) while the reports read by
 *   employee. The day view widens the window to catch night shifts whose clock times fall outside
 *   the requested dates but whose shift belongs to them.
 *   compute_payroll_items is the write side of the pay calculation: it must REPLACE a day's items,
 *   never accumulate, or every re-approval would double an employee's hours.
 *
 * FINDINGS
 *   none
 */

namespace Tests\Feature\BranchTests\Payroll\DTR;

use Tests\TestCase;
use Tests\Feature\BranchTests\Support\DtrFixtureTrait;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\DtrPayrollItems;
use App\Modules\Payroll\Models\Leave;
use App\Modules\Payroll\Repositories\DtrRepository;

class DtrLogsAndItemsBranchTest extends TestCase
{
    use DatabaseTransactions, DtrFixtureTrait;

    /** @var DtrRepository */
    private $repo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = $this->app->make(DtrRepository::class);
    }

    private function userCollection()
    {
        $collection = new EloquentCollection();
        $collection->push($this->requireFixtureUser());
        return $collection;
    }

    private function dtrIds($collection)
    {
        return $collection->pluck('id')->all();
    }

    // =======================================================================================
    // get_dtr_logs — the reports view
    // =======================================================================================

    /** @test */
    public function the_reports_view_returns_every_day_inside_the_requested_dates_and_no_others()
    {
        $inside_first  = $this->makeDtr(0);
        $inside_second = $this->makeDtr(1);
        $outside       = $this->makeDtr(5);

        $result = $this->repo->get_dtr_logs($this->userCollection(), $this->fixtureDate(0), $this->fixtureDate(1));

        $ids = $this->dtrIds($result);
        $this->assertContains($inside_first->id, $ids);
        $this->assertContains($inside_second->id, $ids);
        $this->assertNotContains($outside->id, $ids);
    }

    /** @test */
    public function the_reports_view_orders_a_persons_days_oldest_first()
    {
        $later   = $this->makeDtr(2);
        $earlier = $this->makeDtr(0);

        $result = $this->repo->get_dtr_logs($this->userCollection(), $this->fixtureDate(0), $this->fixtureDate(2));

        $ids = $this->dtrIds($result);
        $this->assertSame(
            [$earlier->id, $later->id],
            array_values(array_intersect($ids, [$earlier->id, $later->id]))
        );
    }

    // =======================================================================================
    // get_dtr_logs — the team schedule grid
    // =======================================================================================

    // The week/month grid asks only for the dates themselves.
    /** @test */
    public function the_team_schedule_grid_returns_the_requested_dates_when_showing_a_week()
    {
        request()->merge(['link' => 'team_schedule', 'page' => 'week']);
        $inside  = $this->makeDtr(0);
        $outside = $this->makeDtr(5);

        $result = $this->repo->get_dtr_logs($this->userCollection(), $this->fixtureDate(0), $this->fixtureDate(1));

        $ids = $this->dtrIds($result);
        $this->assertContains($inside->id, $ids);
        $this->assertNotContains($outside->id, $ids);
    }

    // The single-day view widens the net: a night shift whose calendar date is the day BEFORE but
    // whose hours run into the requested day must still appear on that day's grid.
    /** @test */
    public function the_team_schedule_day_view_also_catches_a_night_shift_started_the_day_before()
    {
        request()->merge(['link' => 'team_schedule', 'page' => 'day']);

        $on_the_day = $this->makeDtr(1);
        $night_before = $this->makeDtr(0, [
            'start_datetime' => $this->fixtureTs(1, 2 * 3600),   // hours land inside the window...
            'end_datetime'   => $this->fixtureTs(1, 10 * 3600),  // ...although the date does not
        ]);
        $unrelated = $this->makeDtr(5);

        $result = $this->repo->get_dtr_logs(
            $this->userCollection(),
            $this->fixtureDate(1) . ' 00:00:00',
            $this->fixtureDate(1) . ' 23:59:59'
        );

        $ids = $this->dtrIds($result);
        $this->assertContains($on_the_day->id, $ids);
        $this->assertContains($night_before->id, $ids, 'the night shift was dropped from the day view');
        $this->assertNotContains($unrelated->id, $ids);
    }

    // ...and the week view deliberately does NOT: it bands strictly by date.
    /** @test */
    public function the_team_schedule_week_view_ignores_hours_and_bands_strictly_by_date()
    {
        request()->merge(['link' => 'team_schedule', 'page' => 'week']);

        $night_before = $this->makeDtr(0, [
            'start_datetime' => $this->fixtureTs(1, 2 * 3600),
            'end_datetime'   => $this->fixtureTs(1, 10 * 3600),
        ]);
        $on_the_day = $this->makeDtr(1);

        $result = $this->repo->get_dtr_logs($this->userCollection(), $this->fixtureDate(1), $this->fixtureDate(1));

        $ids = $this->dtrIds($result);
        $this->assertContains($on_the_day->id, $ids);
        $this->assertNotContains($night_before->id, $ids);
    }

    /** @test */
    public function asking_for_a_range_with_no_records_returns_an_empty_list_rather_than_failing()
    {
        $result = $this->repo->get_dtr_logs($this->userCollection(), $this->fixtureDate(40), $this->fixtureDate(41));

        $this->assertCount(0, $result);
    }

    // =======================================================================================
    // compute_payroll_items
    // =======================================================================================

    // A plain 08:00-17:00 day with a one hour break, clocked exactly on time.
    //   the break is centred: break start = 08:00 + ((9h / 2) - (1h / 2)) = 12:00, break end = 13:00
    //   rendered   = (12:00 - 08:00) + (17:00 - 13:00) = 4h + 4h = 28800s
    // With no late/undertime/night-diff policy switched on and no overtime request, that single
    // item is the whole of the day's pay.
    /** @test */
    public function a_full_day_worked_on_time_computes_eight_rendered_hours_and_nothing_else()
    {
        $dtr = $this->scheduledDay(0, [
            'start' => '08:00:00', 'end' => '17:00:00',
            'in'    => '08:00:00', 'out' => '17:00:00',
            'break' => 3600,
        ]);

        $items = $this->repo->compute_payroll_items($dtr);

        $this->assertCount(1, $items);
        $this->assertSame(get_constant('PAYROLL_ITEMS.rendered_hours'), $items[0]->item);
        $this->assertEquals(28800, $items[0]->value);
    }

    // The written side of the same rule, and the one that matters most: recomputing REPLACES.
    /** @test */
    public function recomputing_a_day_replaces_its_items_instead_of_adding_to_them()
    {
        $dtr = $this->scheduledDay(0, [
            'start' => '08:00:00', 'end' => '17:00:00',
            'in'    => '08:00:00', 'out' => '17:00:00',
            'break' => 3600,
        ]);
        DtrPayrollItems::create([
            'dtr_id' => $dtr->id,
            'item'   => get_constant('PAYROLL_ITEMS.overtime'),
            'value'  => 99999,
        ]);

        $this->repo->compute_payroll_items(Dtr::find($dtr->id));
        $this->repo->compute_payroll_items(Dtr::find($dtr->id));

        $stored = DtrPayrollItems::where('dtr_id', $dtr->id)->get();
        $this->assertCount(1, $stored, 'items accumulated across recomputations');
        $this->assertSame(get_constant('PAYROLL_ITEMS.rendered_hours'), $stored->first()->item);
        $this->assertEquals(28800, $stored->first()->value);
    }

    // A day with a schedule but no clock times earns nothing, and any items left from a previous
    // computation are cleared out.
    /** @test */
    public function a_day_with_no_clock_times_computes_nothing_and_clears_what_was_there()
    {
        $dtr = $this->scheduledDay(0, ['start' => '08:00:00', 'end' => '17:00:00', 'break' => 3600]);
        DtrPayrollItems::create([
            'dtr_id' => $dtr->id,
            'item'   => get_constant('PAYROLL_ITEMS.rendered_hours'),
            'value'  => 28800,
        ]);

        $items = $this->repo->compute_payroll_items(Dtr::find($dtr->id));

        $this->assertCount(0, $items);
        $this->assertSame(0, DtrPayrollItems::where('dtr_id', $dtr->id)->count());
    }

    // =======================================================================================
    // get_leaves_from_dtr
    // =======================================================================================

    /** @test */
    public function the_leaves_for_a_set_of_days_are_returned_and_days_outside_the_set_are_not()
    {
        $wanted   = $this->makeDtr(0);
        $unwanted = $this->makeDtr(1);
        $mine = Leave::create([
            'dtr_id' => $wanted->id, 'type' => 'Vacation Leave', 'status' => 'approved',
            'amount' => 1, 'updated_by' => $this->requireFixtureUser()->id,
        ]);
        $theirs = Leave::create([
            'dtr_id' => $unwanted->id, 'type' => 'Sick Leave', 'status' => 'approved',
            'amount' => 1, 'updated_by' => $this->requireFixtureUser()->id,
        ]);

        $result = $this->repo->get_leaves_from_dtr(Dtr::whereIn('id', [$wanted->id])->get());

        $this->assertSame([$mine->id], $result->pluck('id')->all());
        $this->assertNotContains($theirs->id, $result->pluck('id')->all());
    }

    /** @test */
    public function a_set_of_days_with_no_leave_on_any_of_them_returns_an_empty_list()
    {
        $dtr = $this->makeDtr(0);

        $result = $this->repo->get_leaves_from_dtr(Dtr::whereIn('id', [$dtr->id])->get());

        $this->assertCount(0, $result);
    }

    /** @test */
    public function an_empty_set_of_days_returns_an_empty_list_of_leaves()
    {
        $result = $this->repo->get_leaves_from_dtr(new EloquentCollection());

        $this->assertCount(0, $result);
    }
}
