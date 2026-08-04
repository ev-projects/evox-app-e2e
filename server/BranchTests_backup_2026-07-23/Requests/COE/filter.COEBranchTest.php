<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for COEController::getUsers arms. Menu=Requests Page=COE.
 *
 * No SKIPPED arms. getUsers is read-only (User query scoped by a keyword -> no unbounded table scan).
 * Covered branches:
 *   - when(LevelId != 5) TRUE  -> country_id filter applied -> response()->json 200
 *   - when(LevelId != 5) FALSE (LevelId == 5) -> no country filter -> response()->json 200
 *   - catch(Exception) -> error_response default 400
 *
 * The LevelId==5 / !=5 branches are forced by overriding LevelId on the acting user IN MEMORY only
 * (no save -> non-destructive). Keyword is scoped to the fixture user's first_name to avoid a full scan.
 *
 * Route: GET /api/request/coe/user/?keyword=... -> getUsers(Request)
 */

namespace Tests\Feature\BranchTests\Requests\COE;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Auth;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Coe\Repositories\COERepositoryInterface;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;

class COEFilterBranchTest extends TestCase
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
        // IoC-mock constructor deps so COEController resolves without touching real Bhr/COE impls.
        $this->bindMock(BhrRepositoryInterface::class);
        $this->bindMock(COERepositoryInterface::class);
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestSkipped('no user in test DB');
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    protected function bindMock(string $iface): \Mockery\MockInterface
    {
        $m = Mockery::mock($iface);
        $this->app->instance($iface, $m);
        return $m;
    }

    private function keyword(): string
    {
        return (string) ($this->user->first_name ?? 'a');
    }

    // ---------------------------------------------------------------- getUsers()
    // when(LevelId != 5) FALSE branch: LevelId == 5 -> no country filter -> 200
    /** @test */
    public function getUsers__filter__level5_no_country_filter__ok_200()
    {
        $this->user->LevelId = 5; // in-memory only
        $this->actingAs($this->user);

        $res = $this->getJson('/api/request/coe/user/?keyword=' . urlencode($this->keyword()));

        $res->assertStatus(200);
    }

    // when(LevelId != 5) TRUE branch: LevelId != 5 -> country_id filter applied -> 200
    /** @test */
    public function getUsers__filter__level_not5_country_filter__ok_200()
    {
        $this->user->LevelId = 1; // in-memory only
        $this->actingAs($this->user);

        $res = $this->getJson('/api/request/coe/user/?keyword=' . urlencode($this->keyword()));

        $res->assertStatus(200);
    }

    // catch arm: auth()->user() throws -> error_response default 400
    /** @test */
    public function getUsers__filter__exception__error_400()
    {
        Auth::shouldReceive('user')->andThrow(new Exception('boom'));

        $res = $this->getJson('/api/request/coe/user/?keyword=x');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
