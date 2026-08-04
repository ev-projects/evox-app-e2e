<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for PayrollCutoffController::store/update arms. Menu=Payroll Page=Cutoff.
 *
 * Constructor dep PayrollCutoffRepository (concrete, empty ctor) is IoC-mocked per test so the
 * repo's DB::beginTransaction/save/update never fire (no destructive write on real data).
 * store() success passes HTTP_CREATED -> asserts 201; its catch(Exception) uses error_response
 * default -> 400. update() success -> 200; its catch -> error_response default 400.
 * All assert {message,content} on success and {error:{message,content}} on error.
 *
 * NOTE: PayrollCutoffRequest FormRequest validation is NOT bypassed by withoutMiddleware, so the
 * payload uses far-past dates (1990-01-*) to satisfy required|date|date_format:Y-m-d,
 * after_or_equal, and the read-only unique_payroll_cutoff overlap rule (no cutoff exists that far
 * back). log_activity() only INSERTs an activity-log row rolled back by DatabaseTransactions.
 *
 * SKIPPED: none. FINDING: none.
 *
 * Routes (module prefix payroll/cutoff, mounted under /api):
 *   POST /api/payroll/cutoff/       -> store()
 *   PUT  /api/payroll/cutoff/{id}   -> update()
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

class CutoffSubmitBranchTest extends TestCase
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

    private function mockRepo(): \Mockery\MockInterface
    {
        $m = Mockery::mock(PayrollCutoffRepository::class);
        $this->app->instance(PayrollCutoffRepository::class, $m);
        return $m;
    }

    /** Valid PayrollCutoffRequest payload: far-past, non-overlapping range. */
    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'name'       => 'branch test cutoff',
            'start_date' => '1990-01-01',
            'end_date'   => '1990-01-15',
        ], $overrides);
    }

    /** A real PayrollCutoff instance so PayrollCutoffResource can serialize. */
    private function makeCutoff(): PayrollCutoff
    {
        return (new PayrollCutoff())->forceFill([
            'id'         => 1,
            'name'       => 'branch test cutoff',
            'start_date' => '1990-01-01',
            'end_date'   => '1990-01-15',
        ]);
    }

    // --------------------------------------------------------------------- store()
    // Branch A: try succeeds -> repo->store -> success_response HTTP_CREATED 201
    /** @test */
    public function store__submit__success__created_201()
    {
        $repo = $this->mockRepo();
        $repo->shouldReceive('store')->once()->andReturn($this->makeCutoff());

        $res = $this->postJson('/api/payroll/cutoff', $this->validPayload());

        $res->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    // Branch B: repo->store throws -> catch(Exception) -> error_response default 400
    /** @test */
    public function store__submit__exception__error_400()
    {
        $repo = $this->mockRepo();
        $repo->shouldReceive('store')->once()->andThrow(new Exception('boom'));

        $res = $this->postJson('/api/payroll/cutoff', $this->validPayload());

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // -------------------------------------------------------------------- update()
    // Branch A: try succeeds -> repo->update -> success_response 200
    /** @test */
    public function update__submit__success__ok_200()
    {
        $repo = $this->mockRepo();
        $repo->shouldReceive('update')->once()->andReturn($this->makeCutoff());

        $res = $this->putJson('/api/payroll/cutoff/1', $this->validPayload());

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch B: repo->update throws -> catch(Exception) -> error_response default 400
    /** @test */
    public function update__submit__exception__error_400()
    {
        $repo = $this->mockRepo();
        $repo->shouldReceive('update')->once()->andThrow(new Exception('boom'));

        $res = $this->putJson('/api/payroll/cutoff/1', $this->validPayload());

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
