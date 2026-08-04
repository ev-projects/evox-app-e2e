<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for OvertimeController::find arms. Menu=Requests Page=Overtime.
 *
 * No SKIPPED arms. Covered: try (success) + catch(Exception).
 * Route: GET /api/request/overtime/{id} -> find() success=200, catch=error_response HTTP_NOT_FOUND 404
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

class OvertimeLoadBranchTest extends TestCase
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

    // ---------------------------------------------------------------- find()
    // try arm: repo->find -> success_response 200
    /** @test */
    public function find__load__success__success_200()
    {
        $overtime = $this->mockDep(OvertimeRepositoryInterface::class);
        $overtime->shouldReceive('find')->once()->andReturn($this->makeOvertime());

        $res = $this->getJson('/api/request/overtime/1');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // catch arm: repo->find throws -> error_response HTTP_NOT_FOUND 404
    /** @test */
    public function find__load__exception__error_404()
    {
        $overtime = $this->mockDep(OvertimeRepositoryInterface::class);
        $overtime->shouldReceive('find')->once()->andThrow(new Exception('boom'));

        $res = $this->getJson('/api/request/overtime/1');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
