<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for HappinessController::addHappinessSurvey arms. Menu=HR Page=Happiness.
 *
 * SKIPPED arms:
 *  // SKIPPED-DESTRUCTIVE addHappinessSurvey() try success arm — HappinessSurvey::create($data), a real INSERT on
 *                        live-dump data. Its if($happiness_survey_post) true/else outcomes both sit AFTER create(),
 *                        so both are skipped. Only the exception path (before create) is exercised.
 *
 * FINDINGS:
 *  // FINDING: HappinessController (namespace App\Http\Controllers) never does `use Exception;`. addHappinessSurvey()'s
 *             `catch(Exception $e)` resolves to the non-existent App\Http\Controllers\Exception, so a real \Exception
 *             thrown in the try is NOT caught -> uncaught -> HTTP 500, never the intended error_response() 400. Same
 *             dead-catch bug as HrController. The 400 catch arm is DEAD; the test asserts the real 500.
 *  // FINDING: addHappinessSurvey() has no implicit-else return — if create() returns falsy, no `return` runs and the
 *             method returns null (HTTP 200 empty body). Reaching it requires the destructive create(), so it is skipped.
 */

namespace Tests\Feature\BranchTests\HR\Happiness;

use Mockery;
use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;

class HappinessSubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();
        // NOTE: deliberately NO actingAs() — see the exception test below.
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // ---------------------------------------------------- addHappinessSurvey()

    public function test_addHappinessSurvey__submit__exception__uncaught_500()
    {
        // With no authenticated user, the try's `$data['user_id'] = Auth::user()->id;` dereferences null (a \Error,
        // Throwable) BEFORE the destructive create(). The namespaced catch(Exception) is DEAD anyway (no
        // `use Exception;`), so nothing is caught -> uncaught -> 500. See FINDINGs in file header.
        $response = $this->postJson('/api/happiness_survey', [
            'focused_motivated'      => 5,
            'growing_professionally' => 5,
            'happiness_suggestion'   => 'branch test',
        ]);

        $response->assertStatus(500);
        // create() success (if-true) and falsy (implicit-else) arms: SKIPPED-DESTRUCTIVE; see file header.
    }
}
