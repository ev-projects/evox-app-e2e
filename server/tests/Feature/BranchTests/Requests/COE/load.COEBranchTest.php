<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for COEController::all arms. Menu=Requests Page=COE.
 *
 * No SKIPPED arms. Covered: try (success) + catch(Exception).
 * Route: GET /api/request/coe -> all()
 *   try  -> success_response 200 {message,content}
 *   catch(Exception) -> error_response HTTP_NOT_FOUND 404 {error:{message,content}}
 */

namespace Tests\Feature\BranchTests\Requests\COE;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use App\Modules\User\Models\User;
use App\Modules\Coe\Repositories\COERepositoryInterface;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;

class COELoadBranchTest extends TestCase
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

    private function mockDep(string $iface): \Mockery\MockInterface
    {
        $m = Mockery::mock($iface);
        $this->app->instance($iface, $m);
        return $m;
    }

    // ---------------------------------------------------------------- all()
    // try arm: repo->all -> COEResource::collection -> success_response 200
    /** @test */
    public function all__load__success__success_200()
    {
        $this->mockDep(BhrRepositoryInterface::class);
        $coe = $this->mockDep(COERepositoryInterface::class);
        $coe->shouldReceive('all')->once()->andReturn(new EloquentCollection([]));

        $res = $this->getJson('/api/request/coe');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // catch arm: repo->all throws -> error_response HTTP_NOT_FOUND 404
    /** @test */
    public function all__load__exception__error_404()
    {
        $this->mockDep(BhrRepositoryInterface::class);
        $coe = $this->mockDep(COERepositoryInterface::class);
        $coe->shouldReceive('all')->once()->andThrow(new Exception('boom'));

        $res = $this->getJson('/api/request/coe');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
