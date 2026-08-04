<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for AlterLogController::store/update arms. Menu=Requests Page=AlterLog.
 *
 * SKIPPED arms:
 *   // SKIPPED-SP store()  request_mode === 'dispute' -> insertToAlterLogDispute() -> call_sp('EV_SP_PD_Autoamtion_AlterLog')
 *   // SKIPPED-SP update() request_mode === 'dispute' -> insertToAlterLogDispute() -> call_sp('EV_SP_PD_Autoamtion_AlterLog') + AlterLog::update write
 *   Both dispute arms reach a stored-procedure call (and update() also writes 'declined' to a real row),
 *   so per SPEC they are covered only up to the point BEFORE the SP; the else (non-dispute) arms are tested.
 * FINDING: none.
 *
 * Note: store()/update() DO type-hint the AlterLogRequest FormRequest (unlike AlterLogPunchController),
 *   so there IS a validation gate. Required: date (Y-m-d, unique per user), user_id (exists:users,id),
 *   new_time_in/new_time_out (Y-m-d H:i:s), employee_note (string). A far-past unique date ('1900-01-01')
 *   is used so the unique rule passes without colliding with real rows.
 *
 * Branches covered:
 *   store()  else (non-dispute) success -> success_response(..., HTTP_CREATED)  => 201 {message,content}
 *   store()  AlterLogRequest validation gate fails                             => 422 {error:{message,content}}
 *   store()  catch(Exception) -> error_response default                        => 400 {error:{message,content}}
 *   update() else (non-dispute) success -> success_response default            => 200 {message,content}
 *   update() AlterLogRequest validation gate fails                            => 422 {error:{message,content}}
 *   update() catch(Exception) -> error_response default                       => 400 {error:{message,content}}
 *
 * Routes (module prefix request/alter_log under /api):
 *   POST /api/request/alter_log       -> store()
 *   PUT  /api/request/alter_log/{id}  -> update()
 */

namespace Tests\Feature\BranchTests\Requests\AlterLog;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Repositories\AlterLogRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;

class AlterLogSubmitBranchTest extends TestCase
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

    /** A real, serializable AlterLog (needs a user so AlterLogResource renders). */
    private function realAlterLog()
    {
        return AlterLog::whereHas('user')->first();
    }

    /** Valid AlterLogRequest payload (non-dispute: no request_mode key => else arm). */
    private function validPayload(): array
    {
        return [
            'date'          => '1900-01-01',            // far-past & unique per user => passes unique rule
            'user_id'       => $this->user->id,
            'new_time_in'   => '1900-01-01 08:00:00',
            'new_time_out'  => '1900-01-01 17:00:00',
            'employee_note' => 'branch test note',
        ];
    }

    // ------------------------------------------------------------------- store()
    // Branch: request_mode === 'dispute' -> insertToAlterLogDispute -> call_sp  // SKIPPED-SP

    /** @test */
    public function store__submit__success__created_201()
    {
        $al = $this->realAlterLog();
        if (!$al) $this->markTestIncomplete('no renderable AlterLog fixture');

        $repo = $this->mockDep(AlterLogRepositoryInterface::class);
        $repo->shouldReceive('store')->once()->andReturn($al);
        $email = $this->mockDep(EmailRepositoryInterface::class);
        $email->shouldReceive('sendAlterLogRequestEmail')->once()->andReturnNull();

        $res = $this->actingAs($this->user)
                    ->postJson('/api/request/alter_log', $this->validPayload());

        $res->assertStatus(201)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function store__submit__validation_failure__error_422()
    {
        $repo = $this->mockDep(AlterLogRepositoryInterface::class);
        $repo->shouldReceive('store')->never();

        $res = $this->actingAs($this->user)
                    ->postJson('/api/request/alter_log', []); // missing required date/user_id/new_time_*/employee_note

        $res->assertStatus(422)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function store__submit__exception__error_400()
    {
        $repo = $this->mockDep(AlterLogRepositoryInterface::class);
        $repo->shouldReceive('store')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)
                    ->postJson('/api/request/alter_log', $this->validPayload());

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ------------------------------------------------------------------ update()
    // Branch: request_mode === 'dispute' -> insertToAlterLogDispute -> call_sp + real update  // SKIPPED-SP

    /** @test */
    public function update__submit__success__ok_200()
    {
        $al = $this->realAlterLog();
        if (!$al) $this->markTestIncomplete('no renderable AlterLog fixture');

        $repo = $this->mockDep(AlterLogRepositoryInterface::class);
        $repo->shouldReceive('update')->once()->andReturn($al);

        $res = $this->actingAs($this->user)
                    ->putJson("/api/request/alter_log/{$al->id}", $this->validPayload());

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function update__submit__validation_failure__error_422()
    {
        $repo = $this->mockDep(AlterLogRepositoryInterface::class);
        $repo->shouldReceive('update')->never();

        $res = $this->actingAs($this->user)
                    ->putJson('/api/request/alter_log/1', []); // missing required fields

        $res->assertStatus(422)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /** @test */
    public function update__submit__exception__error_400()
    {
        $repo = $this->mockDep(AlterLogRepositoryInterface::class);
        $repo->shouldReceive('update')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)
                    ->putJson('/api/request/alter_log/1', $this->validPayload());

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
