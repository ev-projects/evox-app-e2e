<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for DepartmentController::{all,all_with_announcements,find,department_handlers,users,default_schedule,get_department_all} arms. Menu=Admin Page=Department.
 *
 * SKIPPED arms:
 *  // SKIPPED-SP  get_department_all() success arm — is_valid($me->LevelId) TRUE && LevelId != 0 reaches
 *                call_sp("EH_SP_Get_Department_By_UserId"); only the two `return []` arms (is_valid FALSE, and LevelId == 0)
 *                are authorable without hitting the SP. Its catch wraps the SP body and is not reachable on a non-SP path
 *                (Auth::user()/is_valid do not throw for the fixtures used) -> exception arm skipped with the SP.
 *
 * FINDINGS:
 *  // FINDING: department_handlers() try body only builds success_response([]) and can never throw -> catch(Exception) is
 *             dead code; no exception arm is authorable. Covered by a single 200 test.
 *  // FINDING: users() reads via Eloquent (User::where(...)->get()) with NO constructor dependency to mock. Forcing the
 *             catch needs a live DB failure; DB::shouldReceive() cannot intercept Eloquent's already-bound connection
 *             resolver, so the catch is not cleanly forcible in-test without breaking the shared connection. Success arm
 *             covered with a bogus (bounded) department_id; exception arm skipped.
 */

namespace Tests\Feature\BranchTests\Admin\Department;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Department\Repositories\DepartmentRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;

class DepartmentLoadBranchTest extends TestCase
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

    // ------------------------------------------------------------------- all()

    /** @test */
    public function test_all__load__success__ok_200()
    {
        // try arm: empty collection -> EvoxDepartmentListResource::collection renders [].
        $this->department->shouldReceive('all')
            ->once()
            ->andReturn(new EloquentCollection([]));

        $response = $this->getJson('/api/department/all');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_all__load__exception__error_404()
    {
        // catch arm: error_response(..., HTTP_NOT_FOUND).
        $this->department->shouldReceive('all')
            ->once()
            ->andThrow(new \Exception('boom'));

        $response = $this->getJson('/api/department/all');

        $response->assertStatus(404)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ------------------------------------------------ all_with_announcements()

    public function test_allWithAnnouncements__load__success__ok_200()
    {
        // try arm: empty collection -> EvoxDepartmentListResource::collection renders [].
        $this->department->shouldReceive('all_with_announcements')
            ->once()
            ->andReturn(new EloquentCollection([]));

        $response = $this->getJson('/api/department/all_with_announcements');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    public function test_allWithAnnouncements__load__exception__error_404()
    {
        // catch arm: error_response(..., HTTP_NOT_FOUND).
        $this->department->shouldReceive('all_with_announcements')
            ->once()
            ->andThrow(new \Exception('boom'));

        $response = $this->getJson('/api/department/all_with_announcements');

        $response->assertStatus(404)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ------------------------------------------------------------------ find()

    /** @test */
    public function test_find__load__success__ok_200()
    {
        // try arm: null resource -> DepartmentResource(null)->toArray() returns null; success_response 200.
        $this->department->shouldReceive('find')
            ->once()
            ->with('99999')
            ->andReturnNull();

        $response = $this->getJson('/api/department/99999');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_find__load__exception__error_404()
    {
        // catch arm: error_response(..., HTTP_NOT_FOUND).
        $this->department->shouldReceive('find')
            ->once()
            ->with('99999')
            ->andThrow(new \Exception('boom'));

        $response = $this->getJson('/api/department/99999');

        $response->assertStatus(404)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ---------------------------------------------------- department_handlers()

    public function test_departmentHandlers__load__success__ok_200()
    {
        // Only observable arm: try body returns success_response([]) unconditionally. Catch is dead (see FINDING).
        $response = $this->getJson('/api/department/99999/department_handlers');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    // ----------------------------------------------------------------- users()

    /** @test */
    public function test_users__load__success__ok_200()
    {
        // try arm: bogus (bounded) department_id -> empty result set -> UserListResource::collection renders [].
        $response = $this->getJson('/api/department/99999999/users');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }
    // users() exception arm — see FINDING: catch not cleanly forcible without breaking the shared DB connection.

    // ------------------------------------------------------- default_schedule()

    public function test_defaultSchedule__load__success__ok_200()
    {
        // try arm: find()->defaultSchedule()->first() == null -> ScheduleResource(null) -> null; success_response 200.
        $rel = Mockery::mock();
        $rel->shouldReceive('first')->once()->andReturnNull();
        $dept = Mockery::mock();
        $dept->shouldReceive('defaultSchedule')->once()->andReturn($rel);

        $this->department->shouldReceive('find')
            ->once()
            ->with('99999')
            ->andReturn($dept);

        $response = $this->getJson('/api/department/99999/default_schedule');

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'content']);
    }

    public function test_defaultSchedule__load__exception__error_404()
    {
        // catch arm: repository find() throws -> error_response(..., HTTP_NOT_FOUND).
        $this->department->shouldReceive('find')
            ->once()
            ->with('99999')
            ->andThrow(new \Exception('boom'));

        $response = $this->getJson('/api/department/99999/default_schedule');

        $response->assertStatus(404)
            ->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ----------------------------------------------------- get_department_all()

    public function test_getDepartmentAll__load__level_invalid__empty_200()
    {
        // is_valid($me->LevelId) FALSE arm: LevelId null -> falls through to `return []`. No SP reached.
        $u = new User();          // LevelId unset -> null
        $this->actingAs($u);

        $response = $this->getJson('/api/department/get_department_all');

        $response->assertStatus(200);
    }

    public function test_getDepartmentAll__load__level_zero__empty_200()
    {
        // is_valid TRUE but $me->LevelId == 0 arm: inner `LevelId != 0` FALSE -> falls through to `return []`. No SP reached.
        $u = new User();
        $u->LevelId = 0;
        $this->actingAs($u);

        $response = $this->getJson('/api/department/get_department_all');

        $response->assertStatus(200);
    }

    // get_department_all() success (LevelId != 0)  // SKIPPED-SP — reaches call_sp("EH_SP_Get_Department_By_UserId"); see header.
}
