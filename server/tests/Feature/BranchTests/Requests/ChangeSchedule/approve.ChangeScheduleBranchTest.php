<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for ChangeScheduleController::approve/decline/pending/cancel arms. Menu=Requests Page=ChangeSchedule.
 *
 * SKIPPED arms: none — all 3 constructor deps (ChangeScheduleRepositoryInterface, DtrRepositoryInterface,
 *   EmailRepositoryInterface) are IoC-mocked. approve()'s dtr->apply_schedule_to_dtr and decline()'s
 *   dtr->remove_schedule_to_dtr are mocked, so no real external / DTR mutation fires. decline()'s
 *   ChangeSchedule::findOrFail($id) is a read-only lookup scoped to a single id (no table scan).
 * FINDING: none.
 *
 * Branches covered:
 *   approve()  try success -> repo->approve + dtr->apply -> success_response default => 200
 *   approve()  ChangeScheduleRequest validation gate fails                           => 422
 *   approve()  catch(Exception) -> error_response(..., HTTP_NOT_FOUND)               => 404
 *   decline()  previous status == "approved" (if-true) -> dtr->remove called         => 200
 *   decline()  previous status != "approved" (if-false) -> dtr->remove skipped       => 200
 *   decline()  ChangeScheduleRequest validation gate fails                           => 422
 *   decline()  findOrFail miss -> ModelNotFound -> catch -> HTTP_NOT_FOUND           => 404
 *   decline()  repo->decline throws (after findOrFail hit) -> catch -> NOT_FOUND     => 404
 *   pending()  try success -> success_response default                              => 200
 *   pending()  catch(Exception) -> error_response(..., HTTP_NOT_FOUND)              => 404
 *   cancel()   try success -> success_response default                              => 200
 *   cancel()   catch(Exception) -> error_response(..., HTTP_NOT_FOUND)              => 404
 *
 * Routes (module prefix request/change_schedule under /api):
 *   PUT /api/request/change_schedule/approve/{id}  -> approve()
 *   PUT /api/request/change_schedule/decline/{id}  -> decline()
 *   PUT /api/request/change_schedule/pending/{id}  -> pending()
 *   PUT /api/request/change_schedule/cancel/{id}   -> cancel()
 */

namespace Tests\Feature\BranchTests\Requests\ChangeSchedule;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Repositories\ChangeScheduleRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;

class ChangeScheduleApproveBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    /**
     * Valid ChangeScheduleRequest payload (used by approve()/decline(), both type-hint ChangeScheduleRequest).
     * ChangeScheduleRequest::rules(StoreScheduleRequest $request) method-injects a FormRequest; Laravel 5.7
     * resolves it via container->call(), firing afterResolving -> validateResolved(), so StoreScheduleRequest's
     * whole rule set (name/source_type/schedule_type + inherited ScheduleRequest schedule_details.all.* for a
     * standard schedule) is CASCADE-validated against this payload. valid_from/valid_to alone => 422 before the
     * mocked controller body runs (breaking the 200/404 success/exception arms), so all StoreScheduleRequest
     * required fields must be present too.
     */
    private $validPayload = [
        'valid_from'       => '2026-07-01',
        'valid_to'         => '2026-07-02',
        'name'             => 'Branch CS Schedule',
        'source_type'      => 'template',
        'schedule_type'    => 'standard',
        'schedule_details' => ['all' => ['start_time' => '09:00', 'end_time' => '18:00', 'break_time' => '00:30']],
    ];

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

    private function realCs()
    {
        return ChangeSchedule::whereHas('user')->whereHas('schedule')->first();
    }

    // ----------------------------------------------------------------- approve()
    /** @test */
    public function approve__approve__success__ok_200()
    {
        $cs = $this->realCs();
        if (!$cs) $this->markTestIncomplete('no renderable ChangeSchedule fixture');

        $repo = $this->mockDep(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('approve')->once()->andReturn($cs);
        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldReceive('apply_schedule_to_dtr')->once()->andReturnNull(); // mocked: no real DTR write

        $res = $this->actingAs($this->user)
                    ->putJson("/api/request/change_schedule/approve/{$cs->id}", $this->validPayload);

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function approve__approve__validation_failure__error_422()
    {
        $repo = $this->mockDep(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('approve')->never();

        $res = $this->actingAs($this->user)
                    ->putJson('/api/request/change_schedule/approve/1', []); // missing required fields

        $res->assertStatus(422)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function approve__approve__exception__error_404()
    {
        $repo = $this->mockDep(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('approve')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)
                    ->putJson('/api/request/change_schedule/approve/1', $this->validPayload);

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ----------------------------------------------------------------- decline()
    /** @test */
    public function decline__approve__previously_approved__ok_200()
    {
        $cs = ChangeSchedule::whereHas('user')->whereHas('schedule')->where('status', 'approved')->first();
        if (!$cs) $this->markTestIncomplete('no approved ChangeSchedule fixture');

        $repo = $this->mockDep(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('decline')->once()->andReturn($cs);
        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldReceive('remove_schedule_to_dtr')->once()->andReturnNull(); // if-true arm executes (mocked)

        $res = $this->actingAs($this->user)
                    ->putJson("/api/request/change_schedule/decline/{$cs->id}", $this->validPayload);

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function decline__approve__not_previously_approved__ok_200()
    {
        $cs = ChangeSchedule::whereHas('user')->whereHas('schedule')->where('status', '!=', 'approved')->first();
        if (!$cs) $this->markTestIncomplete('no non-approved ChangeSchedule fixture');

        $repo = $this->mockDep(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('decline')->once()->andReturn($cs);
        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldReceive('remove_schedule_to_dtr')->never(); // if-false arm: never called

        $res = $this->actingAs($this->user)
                    ->putJson("/api/request/change_schedule/decline/{$cs->id}", $this->validPayload);

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function decline__approve__validation_failure__error_422()
    {
        $repo = $this->mockDep(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('decline')->never();

        $res = $this->actingAs($this->user)
                    ->putJson('/api/request/change_schedule/decline/1', []); // missing required fields

        $res->assertStatus(422)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function decline__approve__not_found__error_404()
    {
        $this->mockDep(ChangeScheduleRepositoryInterface::class); // decline() never reached
        $this->mockDep(DtrRepositoryInterface::class);

        $res = $this->actingAs($this->user)
                    ->putJson('/api/request/change_schedule/decline/999999999', $this->validPayload);

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function decline__approve__repo_exception__error_404()
    {
        $cs = $this->realCs(); // findOrFail must hit so we reach repo->decline
        if (!$cs) $this->markTestIncomplete('no renderable ChangeSchedule fixture');

        $repo = $this->mockDep(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('decline')->once()->andThrow(new Exception('boom'));
        $this->mockDep(DtrRepositoryInterface::class);

        $res = $this->actingAs($this->user)
                    ->putJson("/api/request/change_schedule/decline/{$cs->id}", $this->validPayload);

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ----------------------------------------------------------------- pending()
    /** @test */
    public function pending__approve__success__ok_200()
    {
        $cs = $this->realCs();
        if (!$cs) $this->markTestIncomplete('no renderable ChangeSchedule fixture');

        $repo = $this->mockDep(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('pending')->once()->andReturn($cs);

        $res = $this->actingAs($this->user)
                    ->putJson("/api/request/change_schedule/pending/{$cs->id}");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function pending__approve__exception__error_404()
    {
        $repo = $this->mockDep(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('pending')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)
                    ->putJson('/api/request/change_schedule/pending/1');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ------------------------------------------------------------------ cancel()
    /** @test */
    public function cancel__approve__success__ok_200()
    {
        $cs = $this->realCs();
        if (!$cs) $this->markTestIncomplete('no renderable ChangeSchedule fixture');

        $repo = $this->mockDep(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('cancel')->once()->andReturn($cs);

        $res = $this->actingAs($this->user)
                    ->putJson("/api/request/change_schedule/cancel/{$cs->id}");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function cancel__approve__exception__error_404()
    {
        $repo = $this->mockDep(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('cancel')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)
                    ->putJson('/api/request/change_schedule/cancel/1');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
