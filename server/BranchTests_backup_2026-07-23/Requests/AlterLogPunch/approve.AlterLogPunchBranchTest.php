<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for AlterLogPunchController::approve + decline + pending + cancel arms.
 * Menu=Requests Page=AlterLogPunch.
 *
 * FINDING: approve()/decline() type-hint the raw Illuminate\Http\Request, NOT the imported AlterLogRequest
 *   FormRequest - there is no validation gate on these approval endpoints.
 * Note: approve()/decline()/pending()/cancel() all return HTTP_NOT_FOUND (404) from their catch arms
 *   (verified against each error_response(...) call). approve() B1 (on_conflict) uses the DEFAULT 400.
 *
 * SKIPPED arms: none. The DTR side-effect calls (apply_alter_to_punch / remove_alter_to_punch) are
 *   IoC-mocked and never reach real data.
 */

namespace Tests\Feature\BranchTests\Requests\AlterLogPunch;

use Tests\TestCase;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;
use App\Modules\Request\Models\AlterLogPunch;
use App\Modules\Request\Repositories\AlterLogPunchRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;

class AlterLogPunchApproveBranchTest extends TestCase
{
    use DatabaseTransactions;

    private $alterRepo;
    private $dtrRepo;
    private $emailRepo;
    private $user;
    private $fixture;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();

        $this->user = User::where('is_active', 1)->first();
        $this->fixture = AlterLogPunch::first();

        $this->alterRepo = Mockery::mock(AlterLogPunchRepositoryInterface::class);
        $this->dtrRepo   = Mockery::mock(DtrRepositoryInterface::class);
        $this->emailRepo = Mockery::mock(EmailRepositoryInterface::class);

        $this->app->instance(AlterLogPunchRepositoryInterface::class, $this->alterRepo);
        $this->app->instance(DtrRepositoryInterface::class, $this->dtrRepo);
        $this->app->instance(EmailRepositoryInterface::class, $this->emailRepo);

        $this->withoutMiddleware();
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function skipIfNoFixture()
    {
        if (is_null($this->fixture)) {
            $this->markTestSkipped('No AlterLogPunch fixture available.');
        }
    }

    // approve() B1: on_conflict returns a non-empty message -> error_response (DEFAULT 400)
    public function approve__approve__conflict__error_400()
    {
        $this->alterRepo->shouldReceive('on_conflict')->andReturn('Schedule conflict detected');

        $response = $this->actingAs($this->user)->putJson('/api/request/alter_log_punch/approve/1', []);

        $response->assertStatus(400)
                 ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // approve() B2: no conflict -> approve + apply_alter_to_punch -> success_response 200
    public function approve__approve__success__ok_200()
    {
        $this->skipIfNoFixture();

        $this->alterRepo->shouldReceive('on_conflict')->andReturn('');
        $this->alterRepo->shouldReceive('approve')->andReturn($this->fixture);
        $this->dtrRepo->shouldReceive('apply_alter_to_punch')->andReturn(null);

        $response = $this->actingAs($this->user)->putJson('/api/request/alter_log_punch/approve/' . $this->fixture->id, []);

        $response->assertStatus(200)
                 ->assertJsonStructure(['message', 'content']);
    }

    // approve() B3: repository throws -> catch -> error_response 404 (HTTP_NOT_FOUND)
    public function approve__approve__exception__error_404()
    {
        $this->alterRepo->shouldReceive('on_conflict')->andThrow(new \Exception('boom'));

        $response = $this->actingAs($this->user)->putJson('/api/request/alter_log_punch/approve/1', []);

        $response->assertStatus(404)
                 ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // decline() B1: decline + remove_alter_to_punch -> success_response 200
    public function decline__approve__success__ok_200()
    {
        $this->skipIfNoFixture();

        $this->alterRepo->shouldReceive('decline')->andReturn($this->fixture);
        $this->dtrRepo->shouldReceive('remove_alter_to_punch')->andReturn(null);

        $response = $this->actingAs($this->user)->putJson('/api/request/alter_log_punch/decline/' . $this->fixture->id, []);

        $response->assertStatus(200)
                 ->assertJsonStructure(['message', 'content']);
    }

    // decline() B2: repository throws -> catch -> error_response 404 (HTTP_NOT_FOUND)
    public function decline__approve__exception__error_404()
    {
        $this->alterRepo->shouldReceive('decline')->andThrow(new \Exception('boom'));

        $response = $this->actingAs($this->user)->putJson('/api/request/alter_log_punch/decline/1', []);

        $response->assertStatus(404)
                 ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // pending() B1: repository pending succeeds -> success_response 200
    public function pending__approve__success__ok_200()
    {
        $this->skipIfNoFixture();

        $this->alterRepo->shouldReceive('pending')->andReturn($this->fixture);

        $response = $this->actingAs($this->user)->putJson('/api/request/alter_log_punch/pending/' . $this->fixture->id, []);

        $response->assertStatus(200)
                 ->assertJsonStructure(['message', 'content']);
    }

    // pending() B2: repository throws -> catch -> error_response 404 (HTTP_NOT_FOUND)
    public function pending__approve__exception__error_404()
    {
        $this->alterRepo->shouldReceive('pending')->andThrow(new \Exception('boom'));

        $response = $this->actingAs($this->user)->putJson('/api/request/alter_log_punch/pending/1', []);

        $response->assertStatus(404)
                 ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // cancel() B1: repository cancel succeeds -> success_response 200
    public function cancel__approve__success__ok_200()
    {
        $this->skipIfNoFixture();

        $this->alterRepo->shouldReceive('cancel')->andReturn($this->fixture);

        $response = $this->actingAs($this->user)->putJson('/api/request/alter_log_punch/cancel/' . $this->fixture->id, []);

        $response->assertStatus(200)
                 ->assertJsonStructure(['message', 'content']);
    }

    // cancel() B2: repository throws -> catch -> error_response 404 (HTTP_NOT_FOUND)
    public function cancel__approve__exception__error_404()
    {
        $this->alterRepo->shouldReceive('cancel')->andThrow(new \Exception('boom'));

        $response = $this->actingAs($this->user)->putJson('/api/request/alter_log_punch/cancel/1', []);

        $response->assertStatus(404)
                 ->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
