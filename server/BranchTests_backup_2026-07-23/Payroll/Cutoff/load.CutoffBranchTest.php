<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for PayrollCutoffController::get_filter_for_dtr/all/find arms. Menu=Payroll Page=Cutoff.
 *
 * Constructor dep PayrollCutoffRepository (concrete, empty ctor) is IoC-mocked per test so no
 * real repo/DB/SP call fires. Success asserts {message,content} at 200; each catch(Exception)
 * arm returns error_response(..., HTTP_NOT_FOUND) so the exception tests assert 404
 * {error:{message,content}}.
 *
 * SKIPPED: none. FINDING: none.
 *
 * Routes (module prefix payroll/cutoff, mounted under /api):
 *   GET /api/payroll/cutoff/get_filter_for_dtr/{user_id} -> get_filter_for_dtr()
 *   GET /api/payroll/cutoff/all                           -> all()
 *   GET /api/payroll/cutoff/{id}                          -> find()
 */

namespace Tests\Feature\BranchTests\Payroll\Cutoff;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Payroll\Models\PayrollCutoff;
use App\Modules\Payroll\Repositories\PayrollCutoffRepository;

class CutoffLoadBranchTest extends TestCase
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

    /** Bind a Mockery mock for the repository into the container. */
    private function mockRepo(): \Mockery\MockInterface
    {
        $m = Mockery::mock(PayrollCutoffRepository::class);
        $this->app->instance(PayrollCutoffRepository::class, $m);
        return $m;
    }

    /** A real PayrollCutoff instance so PayrollCutoffResource can serialize (Carbon::parse end_date). */
    private function makeCutoff(): PayrollCutoff
    {
        return (new PayrollCutoff())->forceFill([
            'id'         => 1,
            'name'       => 'branch test cutoff',
            'start_date' => '1990-01-01',
            'end_date'   => '1990-01-15',
        ]);
    }

    // -------------------------------------------------------- get_filter_for_dtr()
    // Branch A: try succeeds -> repo->get_filter_for_dtr -> success_response 200
    /** @test */
    public function get_filter_for_dtr__load__success__ok_200()
    {
        $repo = $this->mockRepo();
        $repo->shouldReceive('get_filter_for_dtr')->once()->andReturn([]);

        $res = $this->getJson('/api/payroll/cutoff/get_filter_for_dtr/1');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch B: repo throws -> catch(Exception) -> error_response HTTP_NOT_FOUND 404
    /** @test */
    public function get_filter_for_dtr__load__exception__error_404()
    {
        $repo = $this->mockRepo();
        $repo->shouldReceive('get_filter_for_dtr')->once()->andThrow(new Exception('boom'));

        $res = $this->getJson('/api/payroll/cutoff/get_filter_for_dtr/1');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ------------------------------------------------------------------------ all()
    // Branch A: try succeeds -> repo->all -> PayrollCutoffResource::collection -> success_response 200
    /** @test */
    public function all__load__success__ok_200()
    {
        $repo = $this->mockRepo();
        $repo->shouldReceive('all')->once()->andReturn(collect([$this->makeCutoff()]));

        $res = $this->getJson('/api/payroll/cutoff/all');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch B: repo throws -> catch(Exception) -> error_response HTTP_NOT_FOUND 404
    /** @test */
    public function all__load__exception__error_404()
    {
        $repo = $this->mockRepo();
        $repo->shouldReceive('all')->once()->andThrow(new Exception('boom'));

        $res = $this->getJson('/api/payroll/cutoff/all');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ----------------------------------------------------------------------- find()
    // Branch A: try succeeds -> repo->find -> new PayrollCutoffResource -> success_response 200
    /** @test */
    public function find__load__success__ok_200()
    {
        $repo = $this->mockRepo();
        $repo->shouldReceive('find')->once()->andReturn($this->makeCutoff());

        $res = $this->getJson('/api/payroll/cutoff/1');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch B: repo throws -> catch(Exception) -> error_response HTTP_NOT_FOUND 404
    /** @test */
    public function find__load__exception__error_404()
    {
        $repo = $this->mockRepo();
        $repo->shouldReceive('find')->once()->andThrow(new Exception('boom'));

        $res = $this->getJson('/api/payroll/cutoff/1');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
