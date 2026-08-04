<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for TeamController::filter arms. Menu=MyTeam Page=Team.
 *
 * Covers list_via_department($department_id) and list_via_team_handler($user_id) (GET-by-param reads).
 * Each has two arms: try-success -> success_response 200 {message,content}; catch(Exception) ->
 * error_response(..., HTTP_NOT_FOUND) 404 {error:{message,content}}. Both constructor deps are IoC-mocked.
 * Repo returns an empty collection on success -> TeamListResource::collection serializes cleanly, no DB.
 *
 * SKIPPED: none. FINDING: none.
 *
 * Routes (mounted under /api):
 *   GET /api/department/{department_id}/teams       -> list_via_department()
 *   GET /api/user/{user_id}/teams_handled           -> list_via_team_handler()
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

class TeamFilterBranchTest extends TestCase
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

    private function mockTeam(): \Mockery\MockInterface
    {
        $team = Mockery::mock(TeamRepositoryInterface::class);
        $this->app->instance(TeamRepositoryInterface::class, $team);
        $this->app->instance(DepartmentRepositoryInterface::class, Mockery::mock(DepartmentRepositoryInterface::class));
        return $team;
    }

    // ------------------------------------------------ list_via_department()
    /** @test */
    public function list_via_department__filter__success__ok_200()
    {
        $this->mockTeam()->shouldReceive('list_via_department')->once()->andReturn(new BaseCollection([]));

        $this->getJson('/api/department/1/teams')
             ->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function list_via_department__filter__exception__error_404()
    {
        $this->mockTeam()->shouldReceive('list_via_department')->once()->andThrow(new Exception('boom'));

        $this->getJson('/api/department/1/teams')
             ->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ------------------------------------------------ list_via_team_handler()
    /** @test */
    public function list_via_team_handler__filter__success__ok_200()
    {
        $this->mockTeam()->shouldReceive('list_via_team_handler')->once()->andReturn(new BaseCollection([]));

        $this->getJson('/api/user/1/teams_handled')
             ->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function list_via_team_handler__filter__exception__error_404()
    {
        $this->mockTeam()->shouldReceive('list_via_team_handler')->once()->andThrow(new Exception('boom'));

        $this->getJson('/api/user/1/teams_handled')
             ->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
