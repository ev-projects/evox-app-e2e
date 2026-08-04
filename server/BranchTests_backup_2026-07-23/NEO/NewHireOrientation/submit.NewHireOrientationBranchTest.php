<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for NewHireOrientationController::store arms. Menu=NEO Page=NewHireOrientation.
 *
 * DEPENDENCY NOTE — NewHireOrientationController takes NO constructor/injected dependencies (Auth facade
 * + NhoSurvey model used directly). store()'s only success arm reaches a destructive Eloquent write and
 * its catch is dead (see FINDING), so the whole method is documented as a skipped test.
 *
 * SKIPPED arms:
 *  // SKIPPED-DESTRUCTIVE store() if($nho == 1) success arm — reaches NhoSurvey::insert($data), a real
 *                        INSERT into the live-dump nho_survey table. No return precedes it.
 *
 * FINDINGS:
 *  // FINDING: store() catch(Exception) — the controller does NOT `use Exception;` (namespace
 *             App\Http\Controllers), so `Exception` resolves to the non-existent
 *             App\Http\Controllers\Exception. Any real throwable is NOT caught -> uncaught 500, never the
 *             intended error_response 400. The catch arm is dead code.
 *  // FINDING: store() has NO return when insert() returns falsy (!= 1) — the request falls through to an
 *             empty 200 body. No branch reaches this without first executing the destructive insert.
 *
 * Routes (routes/api.php, mounted under /api):
 *   POST /api/nho_survey -> store() [SKIPPED-DESTRUCTIVE + dead catch]
 */

namespace Tests\Feature\BranchTests\NEO\NewHireOrientation;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class NewHireOrientationSubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if ($this->user) {
            $this->actingAs($this->user);
        }
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // -------------------------------------------------------------------- store()
    // Success arm -> NhoSurvey::insert($data): SKIPPED-DESTRUCTIVE. Catch arm: dead (no `use Exception;`).
    /** @test */
    public function store__submit__insert_and_dead_catch__skipped()
    {
        // SKIPPED-DESTRUCTIVE
        $this->markTestSkipped(
            'SKIPPED-DESTRUCTIVE: store() success arm runs NhoSurvey::insert($data) (real INSERT into ' .
            'nho_survey); no return precedes it. FINDING: catch(Exception) is dead (no `use Exception;`), ' .
            'so the error path throws an uncaught 500 instead of a 400. Method unauthorable.'
        );
    }
}
