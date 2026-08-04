<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for ChangeScheduleController::find arm. Menu=Requests Page=ChangeSchedule.
 *
 * SKIPPED arms: none — ChangeScheduleRepositoryInterface is IoC-mocked; no branch reaches call_sp / real external.
 * FINDING: none.
 *
 * Branches covered:
 *   find() try success -> success_response default                     => 200 {message,content}
 *   find() catch(Exception) -> error_response(..., HTTP_NOT_FOUND)      => 404 {error:{message,content}}
 *
 * Route: GET /api/request/change_schedule/{id} -> find()
 */

namespace Tests\Feature\BranchTests\Requests\ChangeSchedule;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Repositories\ChangeScheduleRepositoryInterface;

class ChangeScheduleLoadBranchTest extends TestCase
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

    private function realCs()
    {
        return ChangeSchedule::whereHas('user')->whereHas('schedule')->first();
    }

    // -------------------------------------------------------------------- find()
    /** @test */
    public function find__load__success__ok_200()
    {
        $cs = $this->realCs();
        if (!$cs) $this->markTestIncomplete('no renderable ChangeSchedule fixture');

        $repo = $this->mockDep(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('find')->once()->andReturn($cs);

        $res = $this->actingAs($this->user)
                    ->getJson("/api/request/change_schedule/{$cs->id}");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function find__load__exception__error_404()
    {
        $repo = $this->mockDep(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('find')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)
                    ->getJson('/api/request/change_schedule/1');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
