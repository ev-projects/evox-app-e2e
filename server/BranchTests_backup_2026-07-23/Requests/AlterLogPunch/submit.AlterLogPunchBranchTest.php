<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for AlterLogPunchController::store + update arms.
 * Menu=Requests Page=AlterLogPunch.
 *
 * FINDING: store() and update() type-hint the raw Illuminate\Http\Request, NOT the AlterLogRequest
 *   FormRequest that is imported at the top of the controller (line 15). There is therefore NO
 *   validation gate on these write endpoints - any/no payload reaches the repository. StoreScheduleRequest
 *   (line 20) and AlterLogRequest (line 15) are both imported but never used.
 *
 * SKIPPED arms: none in this file (store real-DB count() branches are covered read-only via fixtures;
 *   the mocked repository write methods never touch real data).
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

class AlterLogPunchSubmitBranchTest extends TestCase
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

    // store() B1: on_conflict returns a non-empty message -> error_response (default 400)
    public function store__submit__conflict__error_400()
    {
        $this->alterRepo->shouldReceive('on_conflict')->andReturn('Schedule conflict detected');

        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log_punch/', [
            'date'    => '1900-01-01',
            'user_id' => $this->user->id,
        ]);

        $response->assertStatus(400)
                 ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // store() B3: no conflict AND no pending record for this date/user (count == 0) -> create branch, 201
    public function store__submit__no_pending_creates__created_201()
    {
        if (is_null($this->fixture)) {
            $this->markTestSkipped('No AlterLogPunch fixture available.');
        }

        $this->alterRepo->shouldReceive('on_conflict')->andReturn('');
        $this->alterRepo->shouldReceive('store')->andReturn($this->fixture);

        // '1900-01-01' + fixture user guarantees the real pending count() query returns 0.
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log_punch/', [
            'date'    => '1900-01-01',
            'user_id' => $this->user->id,
        ]);

        $response->assertStatus(201)
                 ->assertJsonStructure(['message', 'content']);
    }

    // store() B2: no conflict AND an existing pending record for this date/user (count > 0) -> update branch, 200
    public function store__submit__has_pending_updates__ok_200()
    {
        $pending = AlterLogPunch::where('status', 'pending')->first();
        if (is_null($pending)) {
            $this->markTestSkipped('No pending AlterLogPunch fixture available for the count>0 branch.');
        }

        $this->alterRepo->shouldReceive('on_conflict')->andReturn('');
        $this->alterRepo->shouldReceive('update')->andReturn($pending);

        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log_punch/', [
            'date'    => $pending->date,
            'user_id' => $pending->user_id,
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['message', 'content']);
    }

    // store() B4: repository throws -> catch -> error_response (default 400)
    public function store__submit__exception__error_400()
    {
        $this->alterRepo->shouldReceive('on_conflict')->andThrow(new \Exception('boom'));

        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log_punch/', [
            'date'    => '1900-01-01',
            'user_id' => $this->user->id,
        ]);

        $response->assertStatus(400)
                 ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // update() B1: repository update succeeds -> success_response 200
    public function update__submit__success__ok_200()
    {
        if (is_null($this->fixture)) {
            $this->markTestSkipped('No AlterLogPunch fixture available.');
        }

        $this->alterRepo->shouldReceive('update')->andReturn($this->fixture);

        $response = $this->actingAs($this->user)->putJson('/api/request/alter_log_punch/' . $this->fixture->id, [
            'employee_note' => 'test',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['message', 'content']);
    }

    // update() B2: repository throws -> catch -> error_response (default 400)
    public function update__submit__exception__error_400()
    {
        $this->alterRepo->shouldReceive('update')->andThrow(new \Exception('boom'));

        $response = $this->actingAs($this->user)->putJson('/api/request/alter_log_punch/1', [
            'employee_note' => 'test',
        ]);

        $response->assertStatus(400)
                 ->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
