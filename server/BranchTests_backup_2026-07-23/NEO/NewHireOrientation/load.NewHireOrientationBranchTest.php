<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for NewHireOrientationController::index arms. Menu=NEO Page=NewHireOrientation.
 *
 * DEPENDENCY NOTE — NewHireOrientationController takes NO constructor/injected dependencies (Auth facade
 * + NhoSurvey model used directly), so there is nothing to IoC-mock. index() is read-only:
 *   return NhoSurvey::where('user_id', Auth::user()->id)->first() ?? [];
 * The `?? []` null-coalesce is a 2-arm branch — both arms are covered below with fixture-scoped
 * lookups (->first() and a correlated NOT-IN subquery; no table scan).
 *
 * No SKIPPED / FINDING arms in this file (index has no if/try/catch, no writes).
 *
 * Routes (routes/api.php, mounted under /api):
 *   GET /api/nho_survey -> index()
 */

namespace Tests\Feature\BranchTests\NEO\NewHireOrientation;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\NhoSurvey;

class NewHireOrientationLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();                 // reach controller body past jwtauth/auth.apikey
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // ------------------------------------------------------------------- index()
    // Branch A: NhoSurvey exists for the acting user -> `?? []` short-circuits, returns the model (200).
    /** @test */
    public function index__load__has_record__returns_model()
    {
        $survey = NhoSurvey::first();               // bounded LIMIT 1
        if (!$survey) {
            $this->markTestSkipped('no nho_survey rows in test DB');
        }
        $user = User::find($survey->user_id);
        if (!$user) {
            $this->markTestSkipped('nho_survey row has no matching user');
        }
        $this->actingAs($user);

        $res = $this->getJson('/api/nho_survey');

        $res->assertStatus(200)->assertJsonFragment(['user_id' => $survey->user_id]);
    }

    // Branch B: no NhoSurvey for the acting user -> first() is null -> `?? []` returns [] (empty 200).
    /** @test */
    public function index__load__no_record__returns_empty()
    {
        // Correlated NOT-IN subquery keeps this bounded — no PHP-side scan of nho_survey.
        $user = User::where('is_active', 1)
            ->whereNotIn('id', function ($q) {
                $q->select('user_id')->from('nho_survey');
            })
            ->first();
        if (!$user) {
            $this->markTestSkipped('no user without an nho_survey row in test DB');
        }
        $this->actingAs($user);

        $res = $this->getJson('/api/nho_survey');

        $res->assertStatus(200)->assertExactJson([]);
    }
}
