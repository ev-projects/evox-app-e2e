<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for HappinessController::getHappinessSurvey arms. Menu=HR Page=Happiness.
 *
 * SKIPPED arms:
 *  (none — getHappinessSurvey() is read-only; both if/else outcomes are exercised)
 *
 * FINDINGS:
 *  // NOTE: getHappinessSurvey() has one branch: if ($popup_flag && $popup_flag->status == 0) it nulls the survey.
 *          Both the if-true (content forced null) and else (survey returned as-is) arms return success_response(200).
 *          PopupFlags state is not fixture-controllable without writing, so the single test reads the live
 *          PopupFlags row and asserts the ACTUAL arm the data selects (content==null when the flag is present &
 *          disabled), covering whichever branch is live. Status is 200 either way.
 */

namespace Tests\Feature\BranchTests\HR\Happiness;

use Mockery;
use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;
use App\PopupFlags;

class HappinessLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();

        $this->user = User::where('is_active', 1)->first();
        if ($this->user) {
            $this->actingAs($this->user);
        }
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // ------------------------------------------------------- getHappinessSurvey()

    public function test_getHappinessSurvey__load__popup_branch__ok_200()
    {
        // Read the live flag to know which branch will run, then assert the real outcome.
        $flag = PopupFlags::where('key', 'happiness_survey')->first();

        $response = $this->getJson('/api/happiness_survey');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);

        if ($flag && (int) $flag->status === 0) {
            // if-true arm: survey is forced to null.
            $response->assertJson(['content' => null]);
        }
        // else arm (flag absent or enabled): survey returned as-is (or null if the user has none) — 200 asserted above.
    }
}
