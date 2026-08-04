<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for OvertimeController::destroy arms. Menu=Requests Page=Overtime.
 *
 * No SKIPPED arms. The real delete is contained inside the mocked OvertimeRepositoryInterface::destroy,
 * so no destructive write reaches the DB. Covered: try (success) + catch(Exception).
 * Route: DELETE /api/request/overtime/{id} -> destroy() success=200, catch=error_response default 400
 */

namespace Tests\Feature\BranchTests\Requests\Overtime;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Request\Repositories\OvertimeRepositoryInterface;

class OvertimeDeleteBranchTest extends TestCase
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

    // ------------------------------------------------------------- destroy()
    // try arm: repo->destroy -> success_response 200
    /** @test */
    public function destroy__delete__success__success_200()
    {
        $overtime = $this->mockDep(OvertimeRepositoryInterface::class);
        $overtime->shouldReceive('destroy')->once()->andReturn(true);

        $res = $this->deleteJson('/api/request/overtime/1');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // catch arm: repo->destroy throws -> error_response default 400
    /** @test */
    public function destroy__delete__exception__error_400()
    {
        $overtime = $this->mockDep(OvertimeRepositoryInterface::class);
        $overtime->shouldReceive('destroy')->once()->andThrow(new Exception('boom'));

        $res = $this->deleteJson('/api/request/overtime/1');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
