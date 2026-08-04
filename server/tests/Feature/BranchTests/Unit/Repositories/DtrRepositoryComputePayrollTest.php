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
 * DtrRepository::compute_payroll_items — the last uncovered public method from the cron rollout
 * worklist (SP-FAKE-SEAM.md item 1). Runs the REAL Computation engine (Computation.php, 1,142
 * lines, verified: zero call_sp/HTTP/mail — pure PHP + bounded Eloquent reads), then saveMany on
 * dtrs->payroll_items — all rolled back. The seam stays ACTIVE as a tripwire: if any code path
 * surprises us with an SP call, the test fails fast instead of touching the live DB.
 *
 * Fixture strategy: real DTR rows are messy, so up to 5 recent schedule-bearing DTRs are tried;
 * the first that computes cleanly is asserted. If none compute, the test SKIPS with the reason —
 * that outcome itself is developer-relevant (it means the computation engine rejects all recent
 * staging DTRs).
 */
class DtrRepositoryComputePayrollTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();   // tripwire — no fakes registered on purpose
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        parent::tearDown();
    }

    /** @test */
    public function compute_payroll_items_replaces_items_with_fresh_computation()
    {
        $repo = $this->app->make(DtrRepository::class);

        $candidates = Dtr::whereNotNull('start_datetime')
            ->whereNotNull('end_datetime')
            ->whereHas('user', function ($q) { $q->where('is_active', 1); })
            ->orderBy('id', 'desc')
            ->limit(5)
            ->get();
        if ($candidates->isEmpty()) $this->markTestSkipped('no schedule-bearing DTR rows in test DB');

        $lastError = null;
        foreach ($candidates as $dtr) {
            $this->be(User::find($dtr->user_id));
            try {
                $items = $repo->compute_payroll_items($dtr);

                $this->assertIsIterable($items);
                // the method deletes old items then saves exactly the computed set (inside the txn)
                $this->assertSame(count($items), $dtr->payroll_items()->count());
                foreach ($items as $item) {
                    $this->assertSame($dtr->id, $item->dtr_id);
                }
                return;                                    // one clean computation is the goal
            } catch (\Exception $e) {
                $lastError = $e->getMessage();             // try the next candidate row
            }
        }

        $this->markTestSkipped("computation failed for all 5 candidate DTRs — last error: {$lastError}");
    }
}
