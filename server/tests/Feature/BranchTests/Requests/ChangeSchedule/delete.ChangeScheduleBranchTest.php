<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for ChangeScheduleController::destroy arm. Menu=Requests Page=ChangeSchedule.
 *
 * SKIPPED arms: none — ChangeScheduleRepositoryInterface is IoC-mocked, so destroy()'s real
 *   DB delete never fires (mock returns a bool); no branch reaches call_sp / real external / real delete.
 * FINDING: none.
 *
 * Branches covered:
 *   destroy() try success -> success_response(..., destroy() bool)   => 200 {message,content}
 *   destroy() catch(Exception) -> error_response default             => 400 {error:{message,content}}
 *
 * Route: DELETE /api/request/change_schedule/{id} -> destroy()
 */

namespace Tests\Feature\BranchTests\Requests\ChangeSchedule;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Request\Repositories\ChangeScheduleRepositoryInterface;

class ChangeScheduleDeleteBranchTest extends TestCase
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
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function mockDep(string $iface): \Mockery\MockInterface
    {
        $m = Mockery::mock($iface);
        $this->app->instance($iface, $m);
        return $m;
    }

    // ----------------------------------------------------------------- destroy()
    /** @test */
    public function destroy__delete__success__ok_200()
    {
        // repo is mocked -> real DB delete never fires (SKIPPED-DESTRUCTIVE avoided via mock)
        $repo = $this->mockDep(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('destroy')->once()->andReturn(true);

        $res = $this->actingAs($this->user)
                    ->deleteJson('/api/request/change_schedule/1');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function destroy__delete__exception__error_400()
    {
        $repo = $this->mockDep(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('destroy')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)
                    ->deleteJson('/api/request/change_schedule/1');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
