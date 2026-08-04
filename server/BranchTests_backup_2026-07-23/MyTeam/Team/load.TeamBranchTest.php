<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for TeamController::load arms. Menu=MyTeam Page=Team.
 *
 * Covers all()/find() read endpoints. Each has exactly two arms: try-success -> success_response 200
 * {message,content}; catch(Exception) -> error_response(..., HTTP_NOT_FOUND) 404 {error:{message,content}}.
 * Both constructor deps (TeamRepositoryInterface, DepartmentRepositoryInterface) are IoC-mocked so no
 * real repo/DB/SP call fires. find() success returns null from the repo so TeamResource's is_null guard
 * short-circuits (content=null) and no team_handlers()/team_users() relation query is issued.
 *
 * SKIPPED: none. FINDING: none.
 *
 * Routes (mounted under /api):
 *   GET /api/team/all      -> all()
 *   GET /api/team/{id}     -> find()   (registered after /all, so /team/{n} resolves here)
 */

namespace Tests\Feature\BranchTests\MyTeam\Team;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Collection as BaseCollection;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Team\Repositories\TeamRepositoryInterface;
use App\Modules\Department\Repositories\DepartmentRepositoryInterface;

class TeamLoadBranchTest extends TestCase
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
        if (!$this->user) $this->markTestSkipped('no user in test DB');
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** Mock the Team repo (returned) and bind a Department repo mock so the controller resolves. */
    private function mockTeam(): \Mockery\MockInterface
    {
        $team = Mockery::mock(TeamRepositoryInterface::class);
        $this->app->instance(TeamRepositoryInterface::class, $team);
        $this->app->instance(DepartmentRepositoryInterface::class, Mockery::mock(DepartmentRepositoryInterface::class));
        return $team;
    }

    // ------------------------------------------------------------------- all()
    /** @test */
    public function all__load__success__ok_200()
    {
        $this->mockTeam()->shouldReceive('all')->once()->andReturn(new BaseCollection([]));

        $this->getJson('/api/team/all')
             ->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function all__load__exception__error_404()
    {
        $this->mockTeam()->shouldReceive('all')->once()->andThrow(new Exception('boom'));

        $this->getJson('/api/team/all')
             ->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ------------------------------------------------------------------- find()
    /** @test */
    public function find__load__success__ok_200()
    {
        // null -> TeamResource is_null guard -> content null, no relation queries
        $this->mockTeam()->shouldReceive('find')->once()->andReturn(null);

        $this->getJson('/api/team/1')
             ->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function find__load__exception__error_404()
    {
        $this->mockTeam()->shouldReceive('find')->once()->andThrow(new Exception('boom'));

        $this->getJson('/api/team/1')
             ->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
