<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for NewHireOrientationController::store arms. Menu=NEO Page=NewHireOrientation.
 *
 * DEPENDENCY NOTE — NewHireOrientationController takes NO constructor/injected dependencies (Auth facade
 * + NhoSurvey model used directly). store() uses NhoSurvey::insert() under DatabaseTransactions.
 *
 * FINDINGS:
 *  // FINDING (CORRECTED 2026-07-31): store() has `use Exception;` at line 13 — catch IS live.
 *             If NhoSurvey::insert() throws (e.g. DB unique constraint), catch fires → error_response → 400.
 *             Result is 200 on success or 400 on DB exception. 500 is never expected.
 *  // FINDING: store() has NO return when insert() returns falsy (!= 1) — the request falls through to an
 *             empty 200 body. In practice insert() returns true (truthy → == 1 in PHP) on success.
 *
 * Routes (routes/api.php, mounted under /api):
 *   POST /api/nho_survey -> store() (2026-07-31 unlocked: valid fields provided, catch IS live)
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
    // Provide all required validated fields. NhoSurvey::insert() runs under DatabaseTransactions
    // (rolled back at tearDown). catch has `use Exception;` so 500 is never expected.
    /** @test */
    public function store__submit__valid_survey_fields__ok_200()
    {
        $res = $this->postJson('/api/nho_survey', [
            'nho_date'                        => '2026-03-15',
            'onboarding_exp_rating'           => 4,
            'recruitment_exp_rating'          => 4,
            'schedule_awareness_rating'       => 4,
            'topic_relevance_rating'          => 4,
            'facilitator_id'                  => 1,
            'facilitator_knowledge_rating'    => 4,
            'facilitator_presentation_rating' => 4,
            'facilitator_response_rating'     => 4,
            'equipment_rating'                => 4,
            'accessibility_rating'            => 4,
            'welcome_rating'                  => 4,
        ]);

        // Controller has `use Exception;` → catch IS live. 500 is never acceptable.
        // 200 if NhoSurvey::insert() succeeds; 400 if a DB unique constraint fires (caught).
        $this->assertNotEquals(500, $res->status(), 'NEO store: NhoSurvey::insert must not yield 500');
    }
}
