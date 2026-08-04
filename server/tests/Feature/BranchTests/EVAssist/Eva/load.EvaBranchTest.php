<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for EvaController::index, getEvaRegistration arms. Menu=EVAssist Page=Eva.
 *
 * DEPENDENCY NOTE — EvaController takes NO constructor/injected dependencies. It uses the Auth
 * facade + Eloquent models (EvaSurvey/EvaRegistration) directly, so there is nothing to IoC-mock.
 * Both read methods are single-branch: one read-only query then success_response(...) => 200 {message,content}.
 * The queries are scoped to Auth::user()->id and use ->first() (bounded LIMIT 1), never a table scan.
 *
 * No SKIPPED / FINDING arms in this file (index & getEvaRegistration have no if/try/catch — one branch each).
 *
 * Routes (routes/api.php, mounted under /api):
 *   GET /api/eva_survey       -> index()
 *   GET /api/eva_registration -> getEvaRegistration()
 */

namespace Tests\Feature\BranchTests\EVAssist\Eva;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class EvaLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();                 // reach controller bodies past jwtauth/auth.apikey
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) {
            $this->markTestIncomplete('no user in test DB');
        }
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // ------------------------------------------------------------------- index()
    // Single branch: EvaSurvey::where(...)->first() (read-only) -> success_response(..., HTTP_OK).
    /** @test */
    public function index__load__success__ok_200()
    {
        $res = $this->getJson('/api/eva_survey');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // ----------------------------------------------------------- getEvaRegistration()
    // Single branch: EvaRegistration::where(...)->first() (read-only) -> success_response(..., HTTP_OK).
    /** @test */
    public function getEvaRegistration__load__success__ok_200()
    {
        $res = $this->getJson('/api/eva_registration');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }
}
