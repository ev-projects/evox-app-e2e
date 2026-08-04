<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for OvertimeController::store,update arms. Menu=Requests Page=Overtime.
 *
 * SKIPPED arms (dispute / stored-procedure — forbidden by SPEC):
 *   // SKIPPED-SP store()  request_mode === 'dispute' -> insertToOvertimeDispute() -> call_sp('EV_SP_PD_Autoamtion_Overtimes')
 *   // SKIPPED-SP update() request_mode === 'dispute' -> insertToOvertimeDispute() -> call_sp + destructive Overtime::findOrFail->update on real data
 * Covered branches: store/update else (normal) arm + each catch(Exception) arm.
 *
 * Routes (module prefix request/overtime, mounted under /api):
 *   POST /api/request/overtime      -> store()  success=HTTP_CREATED 201, catch=error_response default 400
 *   PUT  /api/request/overtime/{id} -> update() success=200,             catch=error_response default 400
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

class OvertimeSubmitBranchTest extends TestCase
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
            'date'          => '2001-01-05',
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

    // -------------------------------------------------------------- store()
    // else arm: request_mode != 'dispute' -> repo->store + email -> success_response HTTP_CREATED 201
    /** @test */
    public function store__submit__normal__success_201()
    {
        $overtime = $this->bindMock(OvertimeRepositoryInterface::class);
        $overtime->shouldReceive('store')->once()->andReturn($this->makeOvertime());
        $email = $this->bindMock(EmailRepositoryInterface::class);
        $email->shouldReceive('sendOvertimeRequestEmail')->once()->andReturnNull();

        $res = $this->postJson('/api/request/overtime', $this->validPayload());

        $res->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    // catch arm: repo->store throws -> error_response default 400
    /** @test */
    public function store__submit__exception__error_400()
    {
        $overtime = $this->bindMock(OvertimeRepositoryInterface::class);
        $overtime->shouldReceive('store')->once()->andThrow(new Exception('boom'));

        $res = $this->postJson('/api/request/overtime', $this->validPayload());

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // -------------------------------------------------------------- update()
    // else arm: request_mode != 'dispute' -> repo->find + repo->update -> success_response 200
    /** @test */
    public function update__submit__normal__success_200()
    {
        $overtime = $this->bindMock(OvertimeRepositoryInterface::class);
        $overtime->shouldReceive('find')->once()->andReturn($this->makeOvertime());
        $overtime->shouldReceive('update')->once()->andReturn($this->makeOvertime());

        $res = $this->putJson('/api/request/overtime/1', $this->validPayload());

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // catch arm: repo throws -> error_response default 400
    /** @test */
    public function update__submit__exception__error_400()
    {
        $overtime = $this->bindMock(OvertimeRepositoryInterface::class);
        $overtime->shouldReceive('find')->once()->andThrow(new Exception('boom'));

        $res = $this->putJson('/api/request/overtime/1', $this->validPayload());

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
