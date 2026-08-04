<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for RestDayWorkController::approve arms (approve, decline, pending, cancel). Menu=Requests Page=RestDayWork.
 *
 * SKIPPED arms:
 *   // SKIPPED-SP approve() request_validity == 2 -> insertToRestDayWorkDispute() -> call_sp + destructive RestDayWork::findOrFail()->update() on real data.
 *   The request_validity != 2 arm is reached SP-free: a >30-days-old target date makes request_validity_checker() short-circuit to false BEFORE its SP call.
 *
 * Routes (module prefix request/rest_day_work/, mounted under /api):
 *   PUT /api/request/rest_day_work/approve/{id} -> approve()
 *   PUT /api/request/rest_day_work/decline/{id} -> decline()
 *   PUT /api/request/rest_day_work/pending/{id} -> pending()
 *   PUT /api/request/rest_day_work/cancel/{id}  -> cancel()
 */

namespace Tests\Feature\BranchTests\Requests\RestDayWork;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;

class RestDayWorkApproveBranchTest extends TestCase
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

    /** IoC-mock EVERY constructor dep. Returns [rest_day_work, dtr, email]. */
    private function mockAllDeps(): array
    {
        return [
            $this->bindMock(RestDayWorkRepositoryInterface::class),
            $this->bindMock(DtrRepositoryInterface::class),
            $this->bindMock(EmailRepositoryInterface::class),
        ];
    }

    private function restDayWorkModel(): RestDayWork
    {
        $m = new RestDayWork();
        $m->user_id       = $this->user->id;
        $m->date          = '2015-06-15';
        $m->start_time    = 32400;
        $m->end_time      = 64800;
        $m->break_time    = 1800;
        $m->employee_note = 'authored branch test';
        $m->approver_note = null;
        $m->status        = 'pending';
        return $m;
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'user_id'       => $this->user->id,
            'date'          => '2099-12-25',
            'start_time'    => '09:00',
            'end_time'      => '18:00',
            'break_time'    => '00:30',
            'employee_note' => 'authored branch test',
        ], $overrides);
    }

    // ================================================================== approve()
    // Branches: (1) request_validity != 2 -> repo->approve + dtr->apply_rest_day_work_to_dtr -> 200;
    //           (2) catch -> error_response HTTP_NOT_FOUND 404.
    // SKIPPED-SP: request_validity == 2 arm.
    // >30-days-old target date -> request_validity_checker() returns false SP-free.

    /** @test */
    public function approve__approve__validity_not_two_success__ok_200()
    {
        [$rdw, $dtr, $email] = $this->mockAllDeps();
        $rdw->shouldReceive('approve')->once()->andReturn($this->restDayWorkModel());
        $dtr->shouldReceive('apply_rest_day_work_to_dtr')->once()->andReturnNull();

        $res = $this->actingAs($this->user)
                    ->putJson('/api/request/rest_day_work/approve/999999', $this->payload(['date' => '2015-06-15']));

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function approve__approve__exception__error_404()
    {
        [$rdw, $dtr, $email] = $this->mockAllDeps();
        $rdw->shouldReceive('approve')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)
                    ->putJson('/api/request/rest_day_work/approve/999999', $this->payload(['date' => '2015-06-15']));

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ================================================================== decline()
    // Branches: try -> repo->decline + dtr->remove_rest_day_from_dtr -> 200; catch -> 404.

    /** @test */
    public function decline__approve__success__ok_200()
    {
        [$rdw, $dtr, $email] = $this->mockAllDeps();
        $rdw->shouldReceive('decline')->once()->andReturn($this->restDayWorkModel());
        $dtr->shouldReceive('remove_rest_day_from_dtr')->once()->andReturnNull();

        $res = $this->actingAs($this->user)
                    ->putJson('/api/request/rest_day_work/decline/999999', $this->payload());

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function decline__approve__exception__error_404()
    {
        [$rdw, $dtr, $email] = $this->mockAllDeps();
        $rdw->shouldReceive('decline')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)
                    ->putJson('/api/request/rest_day_work/decline/999999', $this->payload());

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ================================================================== pending()
    // Branches: try -> repo->pending -> 200; catch -> 404.

    /** @test */
    public function pending__approve__success__ok_200()
    {
        [$rdw, $dtr, $email] = $this->mockAllDeps();
        $rdw->shouldReceive('pending')->once()->andReturn($this->restDayWorkModel());

        $res = $this->actingAs($this->user)->putJson('/api/request/rest_day_work/pending/999999');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function pending__approve__exception__error_404()
    {
        [$rdw, $dtr, $email] = $this->mockAllDeps();
        $rdw->shouldReceive('pending')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)->putJson('/api/request/rest_day_work/pending/999999');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // =================================================================== cancel()
    // Branches: try -> repo->cancel -> 200; catch -> 404.

    /** @test */
    public function cancel__approve__success__ok_200()
    {
        [$rdw, $dtr, $email] = $this->mockAllDeps();
        $rdw->shouldReceive('cancel')->once()->andReturn($this->restDayWorkModel());

        $res = $this->actingAs($this->user)->putJson('/api/request/rest_day_work/cancel/999999');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function cancel__approve__exception__error_404()
    {
        [$rdw, $dtr, $email] = $this->mockAllDeps();
        $rdw->shouldReceive('cancel')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)->putJson('/api/request/rest_day_work/cancel/999999');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
