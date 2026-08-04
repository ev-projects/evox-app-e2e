<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for TeamController::delete arm. Menu=MyTeam Page=Team.
 *
 * Covers destroy($id). Two arms: try-success -> success_response 200 {message,content}; catch(Exception)
 * -> error_response(..., HTTP_NOT_FOUND) 404 {error:{message,content}}. The repo is IoC-mocked, so
 * destroy() performs NO real delete; the pre-try log_activity() insert rolls back under DatabaseTransactions.
 * Repo returns null on success -> TeamResource is_null guard -> content null (no relation queries).
 *
 * SKIPPED: none (the delete is mocked, not a real destructive delete). FINDING: none.
 *
 * Route (mounted under /api):
 *   DELETE /api/team/{id}   -> destroy()
 */

namespace Tests\Feature\BranchTests\MyTeam\Team;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Team\Repositories\TeamRepositoryInterface;
use App\Modules\Department\Repositories\DepartmentRepositoryInterface;

class TeamDeleteBranchTest extends TestCase
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

    // ------------------------------------------------------------------- destroy()
    /** @test */
    public function destroy__delete__success__ok_200()
    {
        $this->mockTeam()->shouldReceive('destroy')->once()->andReturn(null);

        $this->deleteJson('/api/team/1')
             ->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function destroy__delete__exception__error_404()
    {
        $this->mockTeam()->shouldReceive('destroy')->once()->andThrow(new Exception('boom'));

        $this->deleteJson('/api/team/1')
             ->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
