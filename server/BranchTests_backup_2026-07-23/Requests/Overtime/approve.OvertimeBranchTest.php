<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for OvertimeController::approve,decline,pending,cancel arms. Menu=Requests Page=Overtime.
 *
 * SKIPPED arms (dispute / stored-procedure — forbidden by SPEC):
 *   // SKIPPED-SP approve() request_validity == 2 -> insertToOvertimeDispute() -> call_sp + destructive Overtime::findOrFail->update.
 *      The else (valid) arm is reached by passing a date >30 days old so request_validity_checker()
 *      short-circuits to false WITHOUT firing EV_SP_Validate_Request_Payroll_Period.
 * Coverage note: approve()/decline() inner `if (!$has_multi)` depends on the fixture user's real
 *   multi_login feature flag (a DB read that cannot be forced without mutation); dtr->compute_payroll_items
 *   is mocked zeroOrMoreTimes so whichever arm the flag selects, the test passes.
 *
 * Routes (module prefix request/overtime, mounted under /api) — all catch arms use HTTP_NOT_FOUND 404:
 *   PUT /api/request/overtime/approve/{id} -> approve() success=200, catch=404
 *   PUT /api/request/overtime/decline/{id} -> decline() success=200, catch=404
 *   PUT /api/request/overtime/pending/{id} -> pending() success=200, catch=404
 *   PUT /api/request/overtime/cancel/{id}  -> cancel()  success=200, catch=404
 */

namespace Tests\Feature\BranchTests\Requests\Overtime;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Repositories\OvertimeRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;

class OvertimeApproveBranchTest extends TestCase
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

    protected function bindMock(string $iface): \Mockery\MockInterface
    {
        $m = Mockery::mock($iface);
        $this->app->instance($iface, $m);
        return $m;
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'user_id'       => $this->user->id,
            'date'          => '2001-01-05',   // >30 days old -> request_validity_checker() returns false, no SP
            'type'          => 'pre_overtime',
            'amount'        => '02:00',
            'employee_note' => 'branch test note',
            'session_id'    => 1,
        ], $overrides);
    }

    private function makeOvertime(): Overtime
    {
        return (new Overtime())->forceFill([
            'id'            => null,
            'user_id'       => $this->user->id,
            'date'          => '2001-01-05',
            'amount'        => 3600,
            'type'          => 'pre_overtime',
            'employee_note' => 'note',
            'approver_note' => 'note',
            'status'        => 'approved',
        ]);
    }

    // -------------------------------------------------------------- approve()
    // else arm: request_validity != 2 -> repo->approve -> success_response 200
    /** @test */
    public function approve__approve__valid__success_200()
    {
        $overtime = $this->bindMock(OvertimeRepositoryInterface::class);
        $overtime->shouldReceive('approve')->once()->andReturn($this->makeOvertime());
        $dtr = $this->bindMock(DtrRepositoryInterface::class);
        $dtr->shouldReceive('compute_payroll_items')->zeroOrMoreTimes()->andReturnNull();

        $res = $this->putJson('/api/request/overtime/approve/1', $this->validPayload());

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // catch arm: repo->approve throws -> error_response HTTP_NOT_FOUND 404
    /** @test */
    public function approve__approve__exception__error_404()
    {
        $overtime = $this->bindMock(OvertimeRepositoryInterface::class);
        $overtime->shouldReceive('approve')->once()->andThrow(new Exception('boom'));

        $res = $this->putJson('/api/request/overtime/approve/1', $this->validPayload());

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // -------------------------------------------------------------- decline()
    // try arm: repo->decline (invoked twice in body) -> success_response 200
    /** @test */
    public function decline__approve__success__success_200()
    {
        $overtime = $this->bindMock(OvertimeRepositoryInterface::class);
        $overtime->shouldReceive('decline')->andReturn($this->makeOvertime());
        $dtr = $this->bindMock(DtrRepositoryInterface::class);
        $dtr->shouldReceive('compute_payroll_items')->zeroOrMoreTimes()->andReturnNull();

        $res = $this->putJson('/api/request/overtime/decline/1', $this->validPayload());

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // catch arm: repo->decline throws -> error_response HTTP_NOT_FOUND 404
    /** @test */
    public function decline__approve__exception__error_404()
    {
        $overtime = $this->bindMock(OvertimeRepositoryInterface::class);
        $overtime->shouldReceive('decline')->once()->andThrow(new Exception('boom'));

        $res = $this->putJson('/api/request/overtime/decline/1', $this->validPayload());

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // -------------------------------------------------------------- pending()
    // try arm: repo->pending -> success_response 200
    /** @test */
    public function pending__approve__success__success_200()
    {
        $overtime = $this->bindMock(OvertimeRepositoryInterface::class);
        $overtime->shouldReceive('pending')->once()->andReturn($this->makeOvertime());

        $res = $this->putJson('/api/request/overtime/pending/1');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // catch arm: repo->pending throws -> error_response HTTP_NOT_FOUND 404
    /** @test */
    public function pending__approve__exception__error_404()
    {
        $overtime = $this->bindMock(OvertimeRepositoryInterface::class);
        $overtime->shouldReceive('pending')->once()->andThrow(new Exception('boom'));

        $res = $this->putJson('/api/request/overtime/pending/1');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // -------------------------------------------------------------- cancel()
    // try arm: repo->cancel -> success_response 200
    /** @test */
    public function cancel__approve__success__success_200()
    {
        $overtime = $this->bindMock(OvertimeRepositoryInterface::class);
        $overtime->shouldReceive('cancel')->once()->andReturn($this->makeOvertime());

        $res = $this->putJson('/api/request/overtime/cancel/1');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // catch arm: repo->cancel throws -> error_response HTTP_NOT_FOUND 404
    /** @test */
    public function cancel__approve__exception__error_404()
    {
        $overtime = $this->bindMock(OvertimeRepositoryInterface::class);
        $overtime->shouldReceive('cancel')->once()->andThrow(new Exception('boom'));

        $res = $this->putJson('/api/request/overtime/cancel/1');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
