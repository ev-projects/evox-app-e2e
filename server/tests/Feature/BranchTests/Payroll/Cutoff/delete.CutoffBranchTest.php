<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for PayrollCutoffController::destroy arms. Menu=Payroll Page=Cutoff.
 *
 * Constructor dep PayrollCutoffRepository (concrete, empty ctor) is IoC-mocked per test so the
 * repo's real DB::beginTransaction/findOrFail/delete never fire (no destructive delete on real
 * data). Success returns the mocked bool -> success_response 200; catch(Exception) uses
 * error_response default -> 400. log_activity() only INSERTs an activity-log row rolled back by
 * DatabaseTransactions.
 *
 * SKIPPED: none. FINDING: none.
 *
 * Routes (module prefix payroll/cutoff, mounted under /api):
 *   DELETE /api/payroll/cutoff/{id} -> destroy()
 */

namespace Tests\Feature\BranchTests\Payroll\Cutoff;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Payroll\Repositories\PayrollCutoffRepository;

class CutoffDeleteBranchTest extends TestCase
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

    private function mockRepo(): \Mockery\MockInterface
    {
        $m = Mockery::mock(PayrollCutoffRepository::class);
        $this->app->instance(PayrollCutoffRepository::class, $m);
        return $m;
    }

    // ------------------------------------------------------------------- destroy()
    // Branch A: try succeeds -> repo->destroy -> success_response 200
    /** @test */
    public function destroy__delete__success__ok_200()
    {
        $repo = $this->mockRepo();
        $repo->shouldReceive('destroy')->once()->andReturn(true);

        $res = $this->deleteJson('/api/payroll/cutoff/1');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch B: repo->destroy throws -> catch(Exception) -> error_response default 400
    /** @test */
    public function destroy__delete__exception__error_400()
    {
        $repo = $this->mockRepo();
        $repo->shouldReceive('destroy')->once()->andThrow(new Exception('boom'));

        $res = $this->deleteJson('/api/payroll/cutoff/1');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
