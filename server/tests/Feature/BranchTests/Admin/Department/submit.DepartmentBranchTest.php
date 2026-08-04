<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for DepartmentController::{assign_handlers,set_active_on_sched} arms. Menu=Admin Page=Department.
 *
 * SKIPPED arms: none in this file. set_active_on_sched() arms (previously SKIPPED-DESTRUCTIVE) are now
 *   authored against a SELF-CREATED throwaway department fixture: every write the controller performs
 *   (departments_on_schedule()->update(...) / ->create(...)) is scoped by that fixture's department_id,
 *   touches ONLY rows the test itself inserted, and is rolled back by DatabaseTransactions. Verified from
 *   knowledge/database-schema.sql: departments needs only department_name (unique) + nullable columns;
 *   department_without_schedule_employees is (id, department_id FK nullable, is_active default 1,
 *   created_at/updated_at nullable). knowledge/database-triggers.sql has NO trigger on either table.
 *
 * FINDINGS:
 *  // FINDING: set_active_on_sched() catch(Exception) cannot be reached with a bogus id: Department::find($id) returns
 *             null and the next call $department->departments_on_schedule() raises \Error ("call to a member function on
 *             null"), which does NOT extend Exception -> propagates as an uncaught 500, never the intended 404.
 *             The catch IS reachable AFTER the write, via the mocked DepartmentRepositoryInterface::all() throwing
 *             while success_response's content (DepartmentListResource::collection(...)) is built — covered below.
 */

namespace Tests\Feature\BranchTests\Admin\Department;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use App\Modules\User\Models\User;
use App\Classes\EvoxActivityLogger;
use App\Modules\Department\Models\Department;
use App\Modules\Department\Models\DepartmentOnSchedule;
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
        // MOCK-FIX: the controller calls $this->department->assign_handlers($id, $request->get('user_id')),
        // and DepartmentRepositoryInterface::assign_handlers($id, array $users_array) type-hints the 2nd
        // param as a NON-NULLABLE array. An empty body -> $request->get('user_id') is null -> the mock
        // (Mockery enforces the interface signature) raises a TypeError (\Error), which catch(Exception)
        // does NOT catch -> uncaught 500 BEFORE the intended arm ever runs. Sending user_id as an empty
        // array satisfies the type hint (and `user_id.*` has no elements, so the exists rule is a no-op),
        // letting the try arm run: repo returns null -> DepartmentResource(null) is null-guarded -> 200.
        $this->department->shouldReceive('assign_handlers')
            ->once()
            ->andReturnNull();

        $response = $this->postJson('/api/department/assign_handlers/99999', ['user_id' => []]);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    public function test_assignHandlers__submit__exception__error_404()
    {
        // catch arm: repository throws after the (benign) log_activity -> error_response(..., HTTP_NOT_FOUND).
        // MOCK-FIX: user_id must be an array (see success test) or the null-vs-`array` TypeError fires at the
        // mock call and 500s before the mocked andThrow is reached.
        $this->department->shouldReceive('assign_handlers')
            ->once()
            ->andThrow(new \Exception('boom'));

        $response = $this->postJson('/api/department/assign_handlers/99999', ['user_id' => []]);

        $response->assertStatus(404)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // --------------------------------------------------- set_active_on_sched()

    /**
     * Creates a throwaway department (unique name; rolled back by DatabaseTransactions)
     * so every write in set_active_on_sched() touches ONLY rows this test created.
     */
    private function makeDepartmentFixture()
    {
        return Department::create([
            'department_name' => 'BT-SCHED-' . uniqid('', true),
            'description'     => 'branch-test fixture (rolled back by DatabaseTransactions)',
        ]);
    }

    /** @test */
    public function test_setActiveOnSched__submit__existing_row__toggled_ok_200()
    {
        // if($department_has_set) TRUE arm: hasOne row exists -> update(['is_active' => !current]).
        // Both the department and its schedule row are fixture-created; the UPDATE is scoped to
        // department_id = fixture id, so no live row is touched.
        $dept = $this->makeDepartmentFixture();
        $dept->departments_on_schedule()->create(['is_active' => true]);

        // success_response content = DepartmentListResource::collection($this->department->all())
        // -> repository is IoC-mocked; empty collection avoids any whole-table departments scan.
        $this->department->shouldReceive('all')->once()->andReturn(new EloquentCollection([]));

        $response = $this->postJson('/api/department/' . $dept->id . '/switch_active_schedule');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);

        // Scoped read (fixture id only): is_active 1 -> toggled to 0.
        $row = DepartmentOnSchedule::where('department_id', $dept->id)->first();
        $this->assertNotNull($row);
        $this->assertEquals(0, $row->is_active);
    }

    /** @test */
    public function test_setActiveOnSched__submit__no_row__created_ok_200()
    {
        // else arm: no hasOne row for the fixture -> departments_on_schedule()->create(['is_active' => true]).
        $dept = $this->makeDepartmentFixture();

        $this->department->shouldReceive('all')->once()->andReturn(new EloquentCollection([]));

        $response = $this->postJson('/api/department/' . $dept->id . '/switch_active_schedule');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);

        // Scoped read (fixture id only): row created with is_active = true.
        $row = DepartmentOnSchedule::where('department_id', $dept->id)->first();
        $this->assertNotNull($row);
        $this->assertEquals(1, $row->is_active);
    }

    /** @test */
    public function test_setActiveOnSched__submit__exception__error_404()
    {
        // catch arm: reached AFTER the (rolled-back, fixture-scoped) write, when the mocked
        // repository all() throws while building the success_response content (see header FINDING —
        // a bogus id can NOT reach this catch, it raises \Error/500 instead).
        $dept = $this->makeDepartmentFixture();

        $this->department->shouldReceive('all')->once()->andThrow(new \Exception('boom'));

        $response = $this->postJson('/api/department/' . $dept->id . '/switch_active_schedule');

        $response->assertStatus(404)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
