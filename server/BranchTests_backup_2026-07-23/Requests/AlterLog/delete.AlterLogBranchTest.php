<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for AlterLogController::destroy arm. Menu=Requests Page=AlterLog.
 *
 * SKIPPED arms: none. destroy() delegates the actual delete to AlterLogRepositoryInterface::destroy(),
 *   which is IoC-mocked here, so no real row is deleted (not-destructive). No dispute/SP/external branch.
 * FINDING: none.
 *
 * Branches covered:
 *   destroy() try success -> success_response default             => 200 {message,content}
 *   destroy() catch(Exception) -> error_response default          => 400 {error:{message,content}}
 *
 * Routes (module prefix request/alter_log under /api):
 *   DELETE /api/request/alter_log/{id}  -> destroy()
 */

namespace Tests\Feature\BranchTests\Requests\AlterLog;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Request\Repositories\AlterLogRepositoryInterface;

class AlterLogDeleteBranchTest extends TestCase
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

    // ----------------------------------------------------------------- destroy()
    /** @test */
    public function destroy__delete__success__ok_200()
    {
        $repo = $this->bindMock(AlterLogRepositoryInterface::class);
        $repo->shouldReceive('destroy')->once()->andReturn(true); // mocked: no real delete fires

        $res = $this->actingAs($this->user)
                    ->deleteJson('/api/request/alter_log/1');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function destroy__delete__exception__error_400()
    {
        $repo = $this->bindMock(AlterLogRepositoryInterface::class);
        $repo->shouldReceive('destroy')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)
                    ->deleteJson('/api/request/alter_log/1');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
