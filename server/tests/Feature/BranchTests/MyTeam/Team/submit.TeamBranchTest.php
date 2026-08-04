<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for TeamController::submit arms. Menu=MyTeam Page=Team.
 *
 * Covers store(TeamRequest) and update(TeamRequest,$id). Each has two arms: try-success ->
 * success_response 200 {message,content}; catch(Exception) -> error_response(..., HTTP_NOT_FOUND) 404
 * {error:{message,content}}. The repo is IoC-mocked, so store()/update() perform NO real DB write; the
 * pre-try log_activity() insert rolls back under DatabaseTransactions. Repo returns null on success so
 * TeamResource's is_null guard yields content=null (no relation queries).
 *
 * TeamRequest FormRequest validation is NOT bypassed by withoutMiddleware(), so validPayload() derives a
 * real, rule-satisfying fixture: a non-deleted user with a department who is not yet in any team_users row
 * (satisfies exists+unique on team_users.*), plus an existing user id for team_handlers.* and that user's
 * department_id for the exists:departments rule. TeamRequest::messages() also resolves each team_users id
 * via User::find(...)->getFullName(), so ids must be real. If no eligible fixture exists the test skips.
 *
 * SKIPPED: none (writes are mocked, not real). FINDING: none.
 *
 * Routes (mounted under /api):
 *   POST /api/team/         -> store()
 *   PUT  /api/team/{id}     -> update()
 */

namespace Tests\Feature\BranchTests\MyTeam\Team;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Team\Models\Team;
use App\Modules\Team\Repositories\TeamRepositoryInterface;
use App\Modules\Department\Repositories\DepartmentRepositoryInterface;

class TeamSubmitBranchTest extends TestCase
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
        if (!$this->user) $this->markTestIncomplete('no user in test DB');
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

    /** Build a TeamRequest-valid payload from real fixtures (scoped ->first(), no table scans). */
    private function validPayload(): array
    {
        $user = User::query()
            ->whereNull('deleted_at')
            ->whereNotNull('department_id')
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))->from('team_users')
                  ->whereColumn('team_users.user_id', 'users.id');
            })
            ->first();
        if (!$user) $this->markTestIncomplete('no eligible team-less user fixture for TeamRequest');

        $handler = User::where('id', '!=', $user->id)->first() ?? $user;

        return [
            'name'          => 'branch test team',
            'department_id' => $user->department_id,
            'team_handlers' => [$handler->id],
            'team_users'    => [$user->id],
        ];
    }

    private function existingTeamId(): int
    {
        $team = Team::first();
        return $team ? $team->id : 1;
    }

    // ------------------------------------------------------------------- store()
    /** @test */
    public function store__submit__success__ok_200()
    {
        $this->mockTeam()->shouldReceive('store')->once()->andReturn(null);

        $this->postJson('/api/team/', $this->validPayload())
             ->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function store__submit__exception__error_404()
    {
        $this->mockTeam()->shouldReceive('store')->once()->andThrow(new Exception('boom'));

        $this->postJson('/api/team/', $this->validPayload())
             ->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ------------------------------------------------------------------- update()
    /** @test */
    public function update__submit__success__ok_200()
    {
        $this->mockTeam()->shouldReceive('update')->once()->andReturn(null);

        $this->putJson('/api/team/' . $this->existingTeamId(), $this->validPayload())
             ->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function update__submit__exception__error_404()
    {
        $this->mockTeam()->shouldReceive('update')->once()->andThrow(new Exception('boom'));

        $this->putJson('/api/team/' . $this->existingTeamId(), $this->validPayload())
             ->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
