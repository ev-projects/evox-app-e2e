<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for DepartmentController::destroy arms. Menu=Admin Page=Department.
 *
 * No SKIPPED arms: destroy() delegates the actual delete to the mocked DepartmentRepositoryInterface /
 * UserRepositoryInterface, so no real row is ever deleted — every branch is authorable safely against the mocks.
 */

namespace Tests\Feature\BranchTests\Admin\Department;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Department\Repositories\DepartmentRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;

class DepartmentDeleteBranchTest extends TestCase
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

        // IoC-mock BOTH constructor-injected dependencies (no real deletion happens).
        $this->department = Mockery::mock(DepartmentRepositoryInterface::class);
        $this->userRepo   = Mockery::mock(UserRepositoryInterface::class);
        $this->app->instance(DepartmentRepositoryInterface::class, $this->department);
        $this->app->instance(UserRepositoryInterface::class, $this->userRepo);

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

    // --------------------------------------------------------------- destroy()

    public function test_destroy__delete__deleted_true__ok_200()
    {
        // if($deleted) TRUE arm: repository reports a delete -> destroy_department_users() IS called; success 200.
        $this->department->shouldReceive('destroy_department')
            ->once()
            ->with('99999')
            ->andReturn(true);
        $this->userRepo->shouldReceive('destroy_department_users')
            ->once()
            ->with('99999')
            ->andReturnNull();

        $response = $this->deleteJson('/api/department/99999');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    public function test_destroy__delete__deleted_false__ok_200()
    {
        // if($deleted) FALSE arm: nothing deleted -> destroy_department_users() is NOT called; success 200.
        $this->department->shouldReceive('destroy_department')
            ->once()
            ->with('99999')
            ->andReturn(false);
        $this->userRepo->shouldReceive('destroy_department_users')->never();

        $response = $this->deleteJson('/api/department/99999');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    public function test_destroy__delete__exception__error_404()
    {
        // catch arm: error_response(..., HTTP_NOT_FOUND).
        $this->department->shouldReceive('destroy_department')
            ->once()
            ->with('99999')
            ->andThrow(new \Exception('boom'));

        $response = $this->deleteJson('/api/department/99999');

        $response->assertStatus(404)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
