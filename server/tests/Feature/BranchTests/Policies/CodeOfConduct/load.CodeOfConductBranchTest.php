<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for CodeOfConductController::index arms. Menu=Policies Page=CodeOfConduct.
 *
 * DEPENDENCY NOTE — CodeOfConductController takes NO constructor/injected dependencies (Auth facade +
 * Eloquent models App\EvaRegistration / App\CodeOfConduct used directly). index() has NO try/catch,
 * so there is no exception arm; both arms are READ-ONLY and run under DatabaseTransactions (no writes).
 *
 * index() branches (routes/api.php, mounted under /api):
 *   GET /api/user_coc -> index()
 *     Branch A: !$eva_reg  -> $coc_get = []            -> success_response 200 {message,content:[]}
 *     Branch B:  $eva_reg  -> $coc_get = CodeOfConduct -> success_response 200 {message,content}
 *
 * Fixtures are picked READ-ONLY and scoped to ->first():
 *   - Branch A acts as an active user with NO eva_registration row (whereNotExists subquery).
 *   - Branch B acts as the user of the first non-deleted eva_registration row.
 *   Either test self-skips if a suitable fixture user is absent in the live-dump DB.
 */

namespace Tests\Feature\BranchTests\Policies\CodeOfConduct;

use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\EvaRegistration;

class CodeOfConductLoadBranchTest extends TestCase
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
    // Branch A: acting user has NO eva_registration -> !$eva_reg is true -> $coc_get = [] -> 200 content:[].
    /** @test */
    public function index__load__no_eva_registration__ok_200_empty()
    {
        $user = User::where('is_active', 1)
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))
                  ->from('eva_registration')
                  ->whereColumn('eva_registration.user_id', 'users.id')
                  ->whereNull('deleted_at');
            })
            ->first();

        if (!$user) {
            $this->markTestIncomplete('no active user without an eva_registration row in test DB');
        }

        $this->actingAs($user);

        $res = $this->getJson('/api/user_coc');

        $res->assertStatus(200)
            ->assertJsonStructure(['message', 'content'])
            ->assertJson(['content' => []]); // Laravel 5.7: assertJson, not assertJsonPath
    }

    // Branch B: acting user HAS an eva_registration -> else arm -> $coc_get = CodeOfConduct lookup -> 200.
    /** @test */
    public function index__load__has_eva_registration__ok_200()
    {
        $reg = EvaRegistration::whereNull('deleted_at')->first();
        $user = $reg ? User::find($reg->user_id) : null;

        if (!$user) {
            $this->markTestIncomplete('no user with a non-deleted eva_registration row in test DB');
        }

        $this->actingAs($user);

        $res = $this->getJson('/api/user_coc');

        $res->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }
}
