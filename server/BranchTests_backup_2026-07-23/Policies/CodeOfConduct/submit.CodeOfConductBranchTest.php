<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for CodeOfConductController::store arms. Menu=Policies Page=CodeOfConduct.
 *
 * DEPENDENCY NOTE — CodeOfConductController takes NO constructor/injected dependencies (Auth facade +
 * App\CodeOfConduct model used directly). Both success arms of store() reach a real destructive Eloquent
 * write, and the catch is dead (see FINDING). Nothing is authorable to a passing non-destructive
 * assertion, so both write arms are documented as skipped tests.
 *
 * store() branches (routes/api.php, mounted under /api):
 *   POST /api/acknowledge_coc -> store()
 *     Branch A: $user_coc && is_acknowledged===1 -> $user_coc->save()  [SKIPPED-DESTRUCTIVE]  (real UPDATE)
 *     Branch B: else                             -> CodeOfConduct::create() [SKIPPED-DESTRUCTIVE] (real INSERT)
 *     catch(Exception)                           -> [dead, see FINDING]
 *
 * FINDINGS:
 *  // FINDING: store() catch(Exception) — CodeOfConductController does NOT `use Exception;`
 *             (namespace App\Http\Controllers), so `Exception` resolves to the non-existent
 *             App\Http\Controllers\Exception. A real throwable is NOT caught -> uncaught 500,
 *             never the intended error_response. The catch arm is dead code and unreachable.
 *  // FINDING: no return precedes either write, so neither branch can be exercised without the
 *             destructive save()/create() on the live-dump code_of_conduct table.
 */

namespace Tests\Feature\BranchTests\Policies\CodeOfConduct;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class CodeOfConductSubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();
        $user = User::where('is_active', 1)->first() ?? User::first();
        if ($user) {
            $this->actingAs($user);
        }
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // -------------------------------------------------------------------- store()
    // Branch A: existing acknowledged record -> $user_coc->save(): SKIPPED-DESTRUCTIVE.
    /** @test */
    public function store__submit__already_acknowledged_update_save__skipped_destructive()
    {
        // SKIPPED-DESTRUCTIVE
        $this->markTestSkipped(
            'SKIPPED-DESTRUCTIVE: store() Branch A (if $user_coc && is_acknowledged===1) runs ' .
            '$user_coc->save() — a real UPDATE on the live-dump code_of_conduct row; no return precedes it.'
        );
    }

    // Branch B: no/unacknowledged record -> CodeOfConduct::create(): SKIPPED-DESTRUCTIVE.
    /** @test */
    public function store__submit__create_new_acknowledgement__skipped_destructive()
    {
        // SKIPPED-DESTRUCTIVE
        $this->markTestSkipped(
            'SKIPPED-DESTRUCTIVE: store() Branch B (else) runs CodeOfConduct::create() — a real INSERT ' .
            'into code_of_conduct; no return precedes it. FINDING: catch(Exception) is dead (no ' .
            '`use Exception;`), so the error path is an uncaught 500 rather than error_response. Unauthorable.'
        );
    }
}
