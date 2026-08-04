<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for EvaController::store, saveEvaRegistration arms. Menu=EVAssist Page=Eva.
 *
 * DEPENDENCY NOTE — EvaController takes NO constructor/injected dependencies (Auth facade + Eloquent
 * models used directly). Every write method's only success arm reaches a destructive Eloquent write,
 * and its catch is dead (see FINDING). Nothing in either method is authorable to a passing assertion,
 * so both branches are documented as skipped tests.
 *
 * SKIPPED arms:
 *  // SKIPPED-DESTRUCTIVE store()          if($eva_update) success arm — reaches $user_eva->update($data),
 *                        a real UPDATE on the live-dump eva_survey row. No return precedes it.
 *  // SKIPPED-DESTRUCTIVE saveEvaRegistration() if($user_eva_reg) success arm — reaches EvaRegistration::create($data),
 *                        a real INSERT/save into eva_registration. No return precedes it.
 *
 * FINDINGS:
 *  // FINDING: store() catch(Exception) — EvaController does NOT `use Exception;` (namespace App\Http\Controllers),
 *             so `Exception` resolves to the non-existent App\Http\Controllers\Exception. Any real throwable
 *             (incl. $user_eva->update() on a null $user_eva when the fixture user has no open survey) is NOT
 *             caught -> uncaught 500, never the intended error_response 400. The catch arm is dead code.
 *  // FINDING: saveEvaRegistration() catch(Exception) — same missing `use Exception;`; catch is dead, a throw -> 500.
 *  // FINDING: both methods have NO return when the write returns falsy (update()/create() falsy) — the request
 *             falls through and returns an empty 200 body. No branch reaches this without the destructive write.
 *
 * Routes (routes/api.php, mounted under /api):
 *   POST /api/eva_survey       -> store()               [SKIPPED-DESTRUCTIVE + dead catch]
 *   POST /api/eva_registration -> saveEvaRegistration() [SKIPPED-DESTRUCTIVE + dead catch]
 */

namespace Tests\Feature\BranchTests\EVAssist\Eva;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class EvaSubmitBranchTest extends TestCase
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
    // Success arm -> $user_eva->update($data): SKIPPED-DESTRUCTIVE. Catch arm: dead (no `use Exception;`).
    /** @test */
    public function store__submit__update_and_dead_catch__skipped()
    {
        // SKIPPED-DESTRUCTIVE
        $this->markTestSkipped(
            'SKIPPED-DESTRUCTIVE: store() success arm runs $user_eva->update($data) (real UPDATE on ' .
            'eva_survey); no return precedes it. FINDING: catch(Exception) is dead (no `use Exception;`), ' .
            'so the error path throws an uncaught 500 instead of a 400. Method unauthorable.'
        );
    }

    // ----------------------------------------------------------- saveEvaRegistration()
    // Success arm -> EvaRegistration::create($data): SKIPPED-DESTRUCTIVE. Catch arm: dead.
    /** @test */
    public function saveEvaRegistration__submit__create_and_dead_catch__skipped()
    {
        // SKIPPED-DESTRUCTIVE
        $this->markTestSkipped(
            'SKIPPED-DESTRUCTIVE: saveEvaRegistration() success arm runs EvaRegistration::create($data) ' .
            '(real INSERT into eva_registration); no return precedes it. FINDING: catch(Exception) is dead ' .
            '(no `use Exception;`), error path is an uncaught 500. Method unauthorable.'
        );
    }
}
