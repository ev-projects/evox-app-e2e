<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for DepartmentController::{assign_handlers,set_active_on_sched} arms. Menu=Admin Page=Department.
 *
 * SKIPPED arms:
 *  // SKIPPED-DESTRUCTIVE  set_active_on_sched() — both arms of the if/else perform real writes on live data
 *                         ($department->departments_on_schedule()->update([...]) / ->create([...])) via Eloquent on
 *                         Department::find($id) (no injected dependency to mock). Every path through the try executes a
 *                         write, so no non-destructive arm is authorable.
 *
 * FINDINGS:
 *  // FINDING: set_active_on_sched() catch(Exception) cannot be reached with a bogus id: Department::find($id) returns
 *             null and the next call $department->departments_on_schedule() raises \Error ("call to a member function on
 *             null"), which does NOT extend Exception -> propagates as an uncaught 500, never the intended 404.
 */

namespace Tests\Feature\BranchTests\Admin\Department;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Classes\EvoxActivityLogger;
use App\Modules\Department\Repositories\DepartmentRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;

class DepartmentSubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var \Mockery\MockInterface */
    protected $department;
    /** @var \Mockery\MockInterface */
    protected $userRepo;
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();

        // IoC-mock BOTH constructor-injected dependencies.
        $this->department = Mockery::mock(DepartmentRepositoryInterface::class);
        $this->userRepo   = Mockery::mock(UserRepositoryInterface::class);
        $this->app->instance(DepartmentRepositoryInterface::class, $this->department);
        $this->app->instance(UserRepositoryInterface::class, $this->userRepo);

        // Neutralise log_activity() so it performs no real activity-log write.
        $this->makeLoggerBenign();

        $this->user = User::where('is_active', 1)->first();
        if ($this->user) {
            $this->actingAs($this->user);
        }
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function makeLoggerBenign(): void
    {
        $logger = Mockery::mock(EvoxActivityLogger::class);
        $logger->shouldReceive('useLog')->andReturnSelf();
        $logger->shouldReceive('withProperties')->andReturnSelf();
        $logger->shouldReceive('log')->andReturnNull();
        $this->app->instance(EvoxActivityLogger::class, $logger);
    }

    // -------------------------------------------------------- assign_handlers()

    public function test_assignHandlers__submit__success__ok_200()
    {
        // try arm: no user_id in body -> FormRequest `user_id.*` rule does not apply -> validation passes.
        // repository returns null -> DepartmentResource(null)->toArray() returns null; success_response 200.
        $this->department->shouldReceive('assign_handlers')
            ->once()
            ->andReturnNull();

        $response = $this->postJson('/api/department/assign_handlers/99999', []);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    public function test_assignHandlers__submit__exception__error_404()
    {
        // catch arm: repository throws after the (benign) log_activity -> error_response(..., HTTP_NOT_FOUND).
        $this->department->shouldReceive('assign_handlers')
            ->once()
            ->andThrow(new \Exception('boom'));

        $response = $this->postJson('/api/department/assign_handlers/99999', []);

        $response->assertStatus(404)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // set_active_on_sched()  // SKIPPED-DESTRUCTIVE — every arm writes live data; catch unreachable (see header FINDING).
}
