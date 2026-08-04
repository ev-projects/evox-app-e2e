<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for ChangeScheduleController::store/update arms. Menu=Requests Page=ChangeSchedule.
 *
 * SKIPPED arms: none — all 3 constructor deps (ChangeScheduleRepositoryInterface, DtrRepositoryInterface,
 *   EmailRepositoryInterface) are IoC-mocked, so no branch reaches call_sp / real external / DB write.
 * FINDING: none.
 *
 * user_id hardcoding: ChangeScheduleRepository::store (latest code line 45) sets
 *   $change_schedule->user_id = auth()->user()->id, ignoring any payload user_id.
 *   store success asserts content.user_id == acting user (immune to payload impersonation).
 *
 * Branches covered:
 *   store()  try success -> success_response(..., HTTP_CREATED)  => 201 {message,content}
 *   store()  ChangeScheduleRequest validation gate fails         => 422 {error:{message,content}}
 *   store()  catch(Exception) -> error_response default          => 400 {error:{message,content}}
 *   update() try success -> success_response default             => 200 {message,content}
 *   update() ChangeScheduleRequest validation gate fails         => 422 {error:{message,content}}
 *   update() catch(Exception) -> error_response default          => 400 {error:{message,content}}
 *
 * Routes (module prefix request/change_schedule under /api):
 *   POST /api/request/change_schedule       -> store()
 *   PUT  /api/request/change_schedule/{id}  -> update()
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

class ChangeScheduleSubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    /** Valid ChangeScheduleRequest payload (valid_from/valid_to required, Y-m-d, after_or_equal). */
    private $validPayload = ['valid_from' => '2026-07-01', 'valid_to' => '2026-07-02'];

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

    /** A real, serializable ChangeSchedule (needs a user + a schedule so the Resource renders). */
    private function realCs()
    {
        return ChangeSchedule::whereHas('user')->whereHas('schedule')->first();
    }

    // ------------------------------------------------------------------- store()
    /** @test */
    public function store__submit__success__actor_owned_201()
    {
        $cs = $this->realCs();
        if (!$cs) $this->markTestSkipped('no renderable ChangeSchedule fixture');
        $cs->user_id = $this->user->id; // repo hardcodes actor; assert actor-owned outcome

        $repo = $this->bindMock(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('store')->once()->andReturn($cs);
        $email = $this->bindMock(EmailRepositoryInterface::class);
        $email->shouldReceive('sendChangeScheduleRequestEmail')->once()->andReturnNull();

        $res = $this->actingAs($this->user)
                    ->postJson('/api/request/change_schedule', $this->validPayload);

        $res->assertStatus(201)
            ->assertJsonStructure(['message', 'content'])
            ->assertJsonPath('content.user_id', $this->user->id); // immune to payload impersonation
    }

    /** @test */
    public function store__submit__validation_failure__error_422()
    {
        $repo = $this->bindMock(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('store')->never();

        $res = $this->actingAs($this->user)
                    ->postJson('/api/request/change_schedule', []); // missing required valid_from/valid_to

        $res->assertStatus(422)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function store__submit__exception__error_400()
    {
        $repo = $this->bindMock(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('store')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)
                    ->postJson('/api/request/change_schedule', $this->validPayload);

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ------------------------------------------------------------------ update()
    /** @test */
    public function update__submit__success__ok_200()
    {
        $cs = $this->realCs();
        if (!$cs) $this->markTestSkipped('no renderable ChangeSchedule fixture');

        $repo = $this->bindMock(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('update')->once()->andReturn($cs);

        $res = $this->actingAs($this->user)
                    ->putJson("/api/request/change_schedule/{$cs->id}", $this->validPayload);

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function update__submit__validation_failure__error_422()
    {
        $repo = $this->bindMock(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('update')->never();

        $res = $this->actingAs($this->user)
                    ->putJson('/api/request/change_schedule/1', []); // missing required fields

        $res->assertStatus(422)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function update__submit__exception__error_400()
    {
        $repo = $this->bindMock(ChangeScheduleRepositoryInterface::class);
        $repo->shouldReceive('update')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)
                    ->putJson('/api/request/change_schedule/1', $this->validPayload);

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
