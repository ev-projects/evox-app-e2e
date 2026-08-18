<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Mockery;
use Illuminate\Console\OutputStyle;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\NullOutput;
use App\Console\Commands\syncBhrLeaves;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;

/**
 * =====================================================================================================
 *  SOURCE UNDER TEST
 *      app/Console/Commands/syncBhrLeaves.php :: handle — the leave ORDERING rule (lines 146-153)
 *
 *  MENU PATH
 *      Admin -> Cron -> Sync BHR Leaves   (also the nightly scheduled run, per country)
 *
 *  COVERAGE AT THE TIME OF WRITING
 *      syncBhrLeaves::handle  97.37%
 *
 *  WHAT WAS LEFT. ConsoleSyncCommandsSpFakeTest and ConsoleHandlesFinishTest between them drive every
 *  country arm and every failure arm of this command, but each of them feeds leaves whose lastChanged
 *  values are DISTINCT — so the tie-break inside the sort comparator (`if ($cmp === 0) return
 *  $a->id <=> $b->id;`) had never been evaluated. That single line is the difference between a stable
 *  and an arbitrary order.
 *
 *  WHY IT MATTERS. The leaves are applied to the DTR in the order this sort produces, and later leaves
 *  overwrite earlier ones on the same day. BambooHR stamps a whole batch approved in one action with
 *  the SAME lastChanged, so ties are the normal case, not an edge case: without the id tie-break the
 *  surviving leave on a contested day would depend on the order BambooHR happened to return the batch,
 *  and the same run could bind a different leave twice in a row.
 *
 *  SAFETY. Every collaborator is an IoC interface bound to a Mockery mock; CallSpFake is active so no
 *  stored procedure can reach the database (the Philippine arm calls none); no HTTP. Pure in-memory,
 *  which is why the suite carries no DatabaseTransactions trait — it opens no connection at all.
 * =====================================================================================================
 */
class ConsoleBhrLeaveSortTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    /** Bind a loose Mockery mock for an interface and return it. */
    private function mockDep(string $iface)
    {
        $m = Mockery::mock($iface)->shouldIgnoreMissing();
        $this->app->instance($iface, $m);
        return $m;
    }

    /** Container-build the command and reflection-bind its input/output so handle() runs directly. */
    private function makeCommand(string $class, array $input = [])
    {
        $cmd = $this->app->make($class);
        $cmd->setLaravel($this->app);
        $in = new ArrayInput($input, $cmd->getDefinition());
        $ref = new \ReflectionObject($cmd);
        foreach (['input' => $in, 'output' => new OutputStyle($in, new NullOutput())] as $prop => $val) {
            $p = $ref->getProperty($prop);
            $p->setAccessible(true);
            $p->setValue($cmd, $val);
        }
        return $cmd;
    }

    /** One BambooHR time-off record, as the repository yields it. */
    private function bhrLeaf($id, $lastChanged)
    {
        return (object) ['id' => $id, 'status' => (object) ['lastChanged' => $lastChanged]];
    }

    /**
     * Run the Philippine arm against a fixed cut-off with the given leaves and return the array the
     * command handed to bind_leaves_to_dtr.
     */
    private function bindOrderFor(array $leaves): array
    {
        $cutoff = $this->mockDep(PayrollCutoffRepositoryInterface::class);
        $cutoff->shouldReceive('get_payroll_cutoff')->once()
            ->andReturn((object) ['start_date' => '2026-08-01', 'end_date' => '2026-08-15']);

        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_leaves')->once()->with('2026-08-01', '2026-08-15')->andReturn($leaves);

        $bound = null;
        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldReceive('bind_leaves_to_dtr')->once()
            ->with(Mockery::on(function ($sorted) use (&$bound) { $bound = $sorted; return true; }),
                   2, '2026-08-01', '2026-08-15')
            ->andReturn([]);

        $response = $this->makeCommand(syncBhrLeaves::class, ['country_code' => 'PH'])->handle();
        $this->assertSame(201, $response->getStatusCode());
        $this->assertNotNull($bound, 'the command never reached bind_leaves_to_dtr');

        return array_map(function ($leaf) { return $leaf->id; }, $bound);
    }

    /**
     * @test
     * BUSINESS RULE — leaves are applied oldest change first, so the most recent decision on a day
     * wins. When BambooHR stamps several approvals with the SAME lastChanged — which is what happens
     * when a supervisor approves a batch in one action — the order must fall back to the leave id, so
     * the run is repeatable and two runs of the same batch bind the same leave last.
     */
    public function leaves_stamped_at_the_same_moment_are_applied_in_leave_id_order()
    {
        $order = $this->bindOrderFor([
            $this->bhrLeaf(91, '2026-08-04 10:00:00'),
            $this->bhrLeaf(12, '2026-08-04 10:00:00'),
            $this->bhrLeaf(57, '2026-08-04 10:00:00'),
        ]);

        $this->assertSame([12, 57, 91], $order);
    }

    /**
     * @test
     * BUSINESS RULE — the other arm of the same comparator: when the stamps DIFFER, the stamp decides
     * and the id is irrelevant, even if that puts a high id first. The tie-break must never override
     * a genuinely later change.
     */
    public function a_later_change_is_applied_after_an_earlier_one_whatever_the_leave_ids_are()
    {
        $order = $this->bindOrderFor([
            $this->bhrLeaf(5,  '2026-08-06 09:00:00'),   // newest change, lowest id
            $this->bhrLeaf(80, '2026-08-04 09:00:00'),
            $this->bhrLeaf(44, '2026-08-05 09:00:00'),
        ]);

        $this->assertSame([80, 44, 5], $order);
    }

    /**
     * @test
     * BUSINESS RULE — both rules at once, which is the shape of a real nightly batch: two leaves
     * approved together plus one approved later. The tied pair orders by id, and the later approval
     * still lands last.
     */
    public function a_mixed_batch_orders_by_change_time_first_and_by_leave_id_within_a_tie()
    {
        $order = $this->bindOrderFor([
            $this->bhrLeaf(70, '2026-08-05 08:00:00'),
            $this->bhrLeaf(31, '2026-08-04 08:00:00'),
            $this->bhrLeaf(19, '2026-08-04 08:00:00'),
        ]);

        $this->assertSame([19, 31, 70], $order);
    }
}
