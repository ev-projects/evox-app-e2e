<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for UtctimelogController::sync_adjustment arms. Menu=Profile Page=UtcTimeLog.
 *
 * Top-level module controller App\Modules\User\Http\Controllers\UtctimelogController. Route mounted
 * under /api inside prefix utc, middleware jwtauth + auth.apikey (disabled here via withoutMiddleware()).
 * Sole constructor dep is the CONCRETE App\Modules\User\Repositories\UtcTimeLogRepository, IoC-mocked
 * per test so no real check_adjustment()/SP runs. success_response => 200 {message,content}
 * (content defaults to []). error_response default => 400 {error:{message,content}}.
 *
 * Route (module api.php mounted under /api):
 *   GET /api/utc/sync_adjustment -> sync_adjustment()
 *
 * No SKIPPED arms — both branches (try success / catch) are reachable with the repo mocked, so the
 * real repository->check_adjustment() (which would hit the live-dump DB) is never invoked.
 */

namespace Tests\Feature\BranchTests\Profile\UtcTimeLog;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UtcTimeLogRepository;

class UtcTimeLogLoadBranchTest extends TestCase
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
        if (!$this->user) {
            $this->markTestSkipped('no user in test DB');
        }
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    protected function bindMock(string $class): \Mockery\MockInterface
    {
        $m = Mockery::mock($class);
        $this->app->instance($class, $m);
        return $m;
    }

    // ========================================================== sync_adjustment()
    // Branch: try succeeds -> check_adjustment() returns -> success_response 200 {message,content}.
    /** @test */
    public function sync_adjustment__load__success__ok_200()
    {
        $repo = $this->bindMock(UtcTimeLogRepository::class);
        $repo->shouldReceive('check_adjustment')->once()->andReturn(true);

        $res = $this->getJson('/api/utc/sync_adjustment');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch: check_adjustment() throws -> catch(Exception) -> error_response default 400.
    /** @test */
    public function sync_adjustment__load__exception__error_400()
    {
        $repo = $this->bindMock(UtcTimeLogRepository::class);
        $repo->shouldReceive('check_adjustment')->once()->andThrow(new Exception('boom'));

        $res = $this->getJson('/api/utc/sync_adjustment');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
