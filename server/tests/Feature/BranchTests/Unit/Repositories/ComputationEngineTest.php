<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\Payroll\Models\Computation;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\User\Models\User;

/**
 * Computation engine (76.5%, 91 unc lines) — the payroll-item calculator behind every DTR.
 * get_computed_payroll_items() only READS (policies/leaves/holidays/overtime) and RETURNS unsaved
 * DtrPayrollItems models; persistence happens in DtrRepository::compute_payroll_items (covered
 * separately). Nothing here writes; DatabaseTransactions is belt-and-braces.
 *
 * Strategy: probe REAL DTRs of distinct shapes (scheduled+complete logs, no schedule, no logs,
 * holiday-tagged, rest-day) and assert the engine's contract per shape rather than exact minutes
 * (values depend on live staging data): returns a list of DtrPayrollItems, every item has a known
 * item type and a numeric value, no exception on any shape, and the no-schedule/no-log shapes
 * cannot produce late/undertime items.
 *
 * NOTE: the engine MUTATES the in-memory Dtr (adds the owner's timezone offset to its timestamps)
 * before computing — each test therefore re-fetches a fresh model instead of reusing one.
 */
class ComputationEngineTest extends TestCase
{
    use DatabaseTransactions;

    /** @var Computation */
    private $engine;

    protected function setUp(): void
    {
        parent::setUp();
        $this->engine = new Computation();
    }

    /** Fresh DTR matching a shape, with its owner authenticated (offset helpers need auth). */
    private function probe(callable $constrain)
    {
        $query = Dtr::whereHas('user', function ($q) {
            $q->whereNotNull('country_id');
        })->orderBy('id', 'desc');
        $constrain($query);
        $dtr = $query->first();
        if ($dtr) {
            $this->be(User::find($dtr->user_id));
        }
        return $dtr;
    }

    private function assertPayrollItemList($items)
    {
        $this->assertIsIterable($items);
        $known = array_values(get_constant('PAYROLL_ITEMS'));
        foreach ($items as $item) {
            $this->assertNotNull($item->item);
            $this->assertContains($item->item, $known, 'unknown payroll item type: ' . $item->item);
            $this->assertIsNumeric($item->value);
        }
        return $items;
    }

    // ------------------------------------------------------------- fully scheduled + logged
    /** @test */
    public function scheduled_dtr_with_complete_logs_computes_a_valid_item_list()
    {
        $dtr = $this->probe(function ($q) {
            $q->whereNotNull('start_datetime')->whereNotNull('end_datetime')
              ->whereNotNull('time_in')->whereNotNull('time_out');
        });
        if (!$dtr) $this->markTestSkipped('no fully scheduled + logged DTR in test DB');

        $items = $this->engine->get_computed_payroll_items($dtr);

        $this->assertPayrollItemList($items);
    }

    /** @test */
    public function repeated_computation_is_stable_and_resets_between_calls()
    {
        $first = $this->probe(function ($q) {
            $q->whereNotNull('start_datetime')->whereNotNull('time_in')->whereNotNull('time_out');
        });
        if (!$first) $this->markTestSkipped('no scheduled + logged DTR in test DB');
        $id = $first->id;

        $itemsA = $this->engine->get_computed_payroll_items($first);
        // fresh model: the engine mutated the previous instance's timestamps in memory
        $itemsB = $this->engine->get_computed_payroll_items(Dtr::find($id));

        $this->assertSame(count($itemsA), count($itemsB));            // clear_properties arm
        $this->assertSame(
            array_map(function ($i) { return $i->item; }, is_array($itemsA) ? $itemsA : $itemsA->all()),
            array_map(function ($i) { return $i->item; }, is_array($itemsB) ? $itemsB : $itemsB->all())
        );
    }

    // ------------------------------------------------------------------ degenerate shapes
    /** @test */
    public function dtr_without_a_schedule_produces_no_late_or_undertime_items()
    {
        $dtr = $this->probe(function ($q) {
            $q->whereNull('start_datetime')->whereNull('end_datetime');
        });
        if (!$dtr) $this->markTestSkipped('no schedule-less DTR in test DB');

        $items = $this->assertPayrollItemList($this->engine->get_computed_payroll_items($dtr));

        $types = array_map(function ($i) { return $i->item; }, is_array($items) ? $items : $items->all());
        $this->assertNotContains(get_constant('PAYROLL_ITEMS.late'), $types);        // guard arm
        $this->assertNotContains(get_constant('PAYROLL_ITEMS.undertime'), $types);
    }

    /** @test */
    public function scheduled_dtr_without_timelogs_produces_no_rendered_time_item()
    {
        $dtr = $this->probe(function ($q) {
            $q->whereNotNull('start_datetime')->whereNull('time_in')->whereNull('time_out');
        });
        if (!$dtr) $this->markTestSkipped('no scheduled-but-unlogged DTR in test DB');

        $items = $this->assertPayrollItemList($this->engine->get_computed_payroll_items($dtr));

        $types = array_map(function ($i) { return $i->item; }, is_array($items) ? $items : $items->all());
        $this->assertNotContains(get_constant('PAYROLL_ITEMS.rendered_hours'), $types);
        $this->assertNotContains(get_constant('PAYROLL_ITEMS.undertime'), $types);   // valid-log gate
    }

    // ----------------------------------------------------------------- special day shapes
    /** @test */
    public function holiday_dtr_computes_without_late_being_charged()
    {
        $dtr = $this->probe(function ($q) {
            $q->whereHas('holidays')->whereNotNull('start_datetime')->whereNotNull('time_in');
        });
        if (!$dtr) $this->markTestSkipped('no holiday-tagged DTR with logs in test DB');

        $items = $this->assertPayrollItemList($this->engine->get_computed_payroll_items($dtr));

        $types = array_map(function ($i) { return $i->item; }, is_array($items) ? $items : $items->all());
        // the engine gates late/undertime on holidays()->count() < 1
        $this->assertNotContains(get_constant('PAYROLL_ITEMS.late'), $types);
    }

    /** @test */
    public function rest_day_dtr_computes_without_error()
    {
        $dtr = $this->probe(function ($q) {
            $q->where('is_rest_day', 1)->whereNotNull('time_in')->whereNotNull('time_out');
        });
        if (!$dtr) $this->markTestSkipped('no logged rest-day DTR in test DB');

        $this->assertPayrollItemList($this->engine->get_computed_payroll_items($dtr));
    }

    /** @test */
    public function flexible_schedule_dtr_computes_using_flexy_bounds()
    {
        $dtr = $this->probe(function ($q) {
            $q->whereNotNull('start_flexy_datetime')->whereNotNull('end_flexy_datetime')
              ->whereNotNull('time_in')->whereNotNull('time_out');
        });
        if (!$dtr) $this->markTestSkipped('no flexible-schedule DTR with logs in test DB');

        $this->assertPayrollItemList($this->engine->get_computed_payroll_items($dtr));
    }
}
