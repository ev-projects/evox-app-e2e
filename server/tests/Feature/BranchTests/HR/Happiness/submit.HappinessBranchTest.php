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
 *  // DEFECT FIXED (found 2026-09-03): HappinessController now imports `use Exception;`, so
 *             addHappinessSurvey()'s `catch(Exception $e)` is live again. A missing-auth request now hits the
 *             intended error_response() 400 arm instead of the uncaught-500 the dead catch previously produced.
 *             Test updated to assert the current, correct behaviour.
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
        // With no authenticated user, the try's `$data['user_id'] = Auth::user()->id;` dereferences null
        // (an "Undefined property" notice under PHP 7.4, turned into a fatal ErrorException by this
        // suite's convertNoticesToExceptions) BEFORE the destructive create(). catch(Exception $e) now
        // resolves correctly (HappinessController imports Exception — see DEFECT FIXED in file header),
        // so this IS caught -> the controller's own error_response() 400, not an uncaught 500.
        $response = $this->postJson('/api/happiness_survey', [
            'focused_motivated'      => 5,
            'growing_professionally' => 5,
            'happiness_suggestion'   => 'branch test',
        ]);

        $response->assertStatus(400);
        // create() success (if-true) and falsy (implicit-else) arms: SKIPPED-DESTRUCTIVE; see file header.
    }
}
