<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for AlterLogController::find arm. Menu=Requests Page=AlterLog.
 *
 * SKIPPED arms: none. find() has no dispute/SP/external branch; AlterLogRepositoryInterface is IoC-mocked.
 * FINDING: none.
 *
 * Branches covered:
 *   find() try success -> success_response default                     => 200 {message,content}
 *   find() catch(Exception) -> error_response(..., HTTP_NOT_FOUND)     => 404 {error:{message,content}}
 *
 * Routes (module prefix request/alter_log under /api):
 *   GET /api/request/alter_log/{id}  -> find()
 */

namespace Tests\Feature\BranchTests\Requests\AlterLog;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Repositories\AlterLogRepositoryInterface;

class AlterLogLoadBranchTest extends TestCase
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

    private function realAlterLog()
    {
        return AlterLog::whereHas('user')->first();
    }

    // -------------------------------------------------------------------- find()
    /** @test */
    public function find__load__success__ok_200()
    {
        $al = $this->realAlterLog();
        if (!$al) $this->markTestSkipped('no renderable AlterLog fixture');

        $repo = $this->bindMock(AlterLogRepositoryInterface::class);
        $repo->shouldReceive('find')->once()->andReturn($al);

        $res = $this->actingAs($this->user)
                    ->getJson("/api/request/alter_log/{$al->id}");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function find__load__exception__error_404()
    {
        $repo = $this->bindMock(AlterLogRepositoryInterface::class);
        $repo->shouldReceive('find')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)
                    ->getJson('/api/request/alter_log/1');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
