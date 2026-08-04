<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for RestDayWorkController::submit arms (store, update). Menu=Requests Page=RestDayWork.
 *
 * SKIPPED arms:
 *   // SKIPPED-SP store() request_mode==='dispute' pass-through -> insertToRestDayWorkDispute() -> call_sp('EV_SP_PD_Autoamtion_RestDay').
 *   // SKIPPED-SP update() request_mode==='dispute' -> insertToRestDayWorkDispute() -> call_sp + destructive RestDayWork::findOrFail()->update() on real data.
 *   (The dispute-mode "target is not a rest day" GUARD arm in store() IS covered — it returns BEFORE any SP.)
 *
 * Routes (module prefix request/rest_day_work/, mounted under /api):
 *   POST /api/request/rest_day_work/     -> store()
 *   PUT  /api/request/rest_day_work/{id} -> update()
 */

namespace Tests\Feature\BranchTests\Requests\RestDayWork;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;

class RestDayWorkSubmitBranchTest extends TestCase
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

    /** IoC-mock EVERY constructor dep. Returns [rest_day_work, dtr, email]. */
    private function mockAllDeps(): array
    {
        return [
            $this->mockDep(RestDayWorkRepositoryInterface::class),
            $this->mockDep(DtrRepositoryInterface::class),
            $this->mockDep(EmailRepositoryInterface::class),
        ];
    }

    private function restDayWorkModel(): RestDayWork
    {
        $m = new RestDayWork();
        $m->user_id       = $this->user->id;
        $m->date          = '2099-12-25';
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

    // ==================================================================== store()
    // Branches: (1) dispute + Dtr is_rest_day==0 -> guard 400 (before SP);
    //           (2) normal + Dtr is_rest_day==0 -> guard 400;
    //           (3) normal + no blocking Dtr -> repo->store + email -> 201;
    //           (4) catch -> error_response default 400.

    /** @test */
    public function store__submit__dispute_target_not_restday__error_400()
    {
        $this->mockAllDeps();
        Dtr::create(['user_id' => $this->user->id, 'date' => '2099-12-25', 'is_rest_day' => 0]);

        $res = $this->actingAs($this->user)
                    ->postJson('/api/request/rest_day_work/', $this->payload(['request_mode' => 'dispute']));

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function store__submit__normal_target_not_restday__error_400()
    {
        $this->mockAllDeps();
        Dtr::create(['user_id' => $this->user->id, 'date' => '2099-12-25', 'is_rest_day' => 0]);

        $res = $this->actingAs($this->user)
                    ->postJson('/api/request/rest_day_work/', $this->payload(['request_mode' => 'request']));

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function store__submit__normal_success__created_201()
    {
        [$rdw, $dtr, $email] = $this->mockAllDeps();
        $rdw->shouldReceive('store')->once()->andReturn($this->restDayWorkModel());
        $email->shouldReceive('sendRestDayWorkRequestEmail')->once()->andReturnNull();

        $res = $this->actingAs($this->user)
                    ->postJson('/api/request/rest_day_work/', $this->payload(['request_mode' => 'request']));

        $res->assertStatus(JsonResponse::HTTP_CREATED)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function store__submit__exception__error_400()
    {
        [$rdw, $dtr, $email] = $this->mockAllDeps();
        $rdw->shouldReceive('store')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)
                    ->postJson('/api/request/rest_day_work/', $this->payload(['request_mode' => 'request']));

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // =================================================================== update()
    // Branches: (1) normal mode -> repo->find + repo->update -> 200;
    //           (2) catch -> error_response default 400.
    // SKIPPED-SP: dispute mode arm (call_sp + destructive update on real data).

    /** @test */
    public function update__submit__normal_success__ok_200()
    {
        [$rdw, $dtr, $email] = $this->mockAllDeps();
        $rdw->shouldReceive('find')->once()->andReturn($this->restDayWorkModel());
        $rdw->shouldReceive('update')->once()->andReturn($this->restDayWorkModel());

        $res = $this->actingAs($this->user)
                    ->putJson('/api/request/rest_day_work/999999', $this->payload(['request_mode' => 'request']));

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function update__submit__exception__error_400()
    {
        [$rdw, $dtr, $email] = $this->mockAllDeps();
        $rdw->shouldReceive('find')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)
                    ->putJson('/api/request/rest_day_work/999999', $this->payload(['request_mode' => 'request']));

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
