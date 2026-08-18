<?php
/**
 * SOURCE UNDER TEST: app/Modules/Department/Http/Controllers/DepartmentController.php
 * MENU PATH:         Admin -> Departments
 * MEASURED COVERAGE AT AUTHORING (lines-%): department_handlers 60, users 80,
 *   assign_handlers 90, get_department_all 85.71.
 *
 * FINDINGS: none new. department_handlers()' catch(Exception) is unreachable dead code — its try
 *   body only builds success_response(trans(...), []) and nothing in it can throw; that is already
 *   recorded in load.DepartmentBranchTest.php and is not re-reported here.
 *
 * NET-NEW COMPLEMENT to Admin\Department\{load,submit}.DepartmentBranchTest.php. Those files cover
 * every arm reachable without the stored procedure, plus the assign_handlers array path. This file
 * adds the two arms they could not reach:
 *   - get_department_all()'s SP arm, now drivable through CallSpFake (it was SKIPPED-SP), including
 *     the Name / DepartmentName / neither column-name fallbacks and the empty-result arm;
 *   - assign_handlers()' scalar-to-array coercion of user_id.
 * No stored procedure executes: App\Modules\Department\Http\Controllers is shadowed by CallSpFake.
 */

namespace Tests\Feature\BranchTests\Admin\Department;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Classes\EvoxActivityLogger;
use App\Modules\User\Models\User;
use App\Modules\Department\Repositories\DepartmentRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;

class DepartmentSpFakeIntegrationTest extends TestCase
{
    use DatabaseTransactions;

    /** @var \Mockery\MockInterface */
    private $departmentRepo;
    /** @var \Mockery\MockInterface */
    private $userRepo;
    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        CallSpFake::activate();
        $this->withoutMiddleware();

        $this->departmentRepo = Mockery::mock(DepartmentRepositoryInterface::class);
        $this->userRepo       = Mockery::mock(UserRepositoryInterface::class);
        $this->app->instance(DepartmentRepositoryInterface::class, $this->departmentRepo);
        $this->app->instance(UserRepositoryInterface::class, $this->userRepo);

        $this->makeLoggerBenign();

        // get_department_all() only reaches the SP when the caller has a non-zero level.
        $this->user = User::where('is_active', 1)->whereNotNull('LevelId')
            ->where('LevelId', '!=', 0)->orderBy('id', 'desc')->first();
        if (!$this->user) {
            $this->markTestSkipped('no active user with a non-zero LevelId in test DB');
        }
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
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

    // ========================================================= get_department_all()

    // The SP rows are flattened to {id, department_name}. The source column is Name on some result
    // shapes and DepartmentName on others, so both are accepted; when both are present
    // DepartmentName wins because it is applied second.
    /** @test */
    public function departments_are_flattened_accepting_either_name_column()
    {
        CallSpFake::fake('EH_SP_Get_Department_By_UserId', [[
            (object) ['Id' => 1, 'Name' => 'Operations'],
            (object) ['Id' => 2, 'DepartmentName' => 'Finance'],
            (object) ['Id' => 3, 'Name' => 'ignored', 'DepartmentName' => 'Legal'],
        ]]);

        $res = $this->getJson('/api/department/get_department_all');

        $res->assertStatus(200);
        $this->assertSame(
            [
                ['id' => 1, 'department_name' => 'Operations'],
                ['id' => 2, 'department_name' => 'Finance'],
                ['id' => 3, 'department_name' => 'Legal'],
            ],
            $res->json('content')
        );

        // The SP is always asked for the caller's own departments, page 1, unfiltered.
        $this->assertSame(
            [$this->user->id, null, 0, 1],
            CallSpFake::callsFor('EH_SP_Get_Department_By_UserId')[0]['params']
        );
    }

    // A row carrying neither name column yields a null department_name rather than fataling.
    /** @test */
    public function a_department_row_with_no_name_column_yields_a_null_department_name()
    {
        CallSpFake::fake('EH_SP_Get_Department_By_UserId', [[(object) ['Id' => 9]]]);

        $res = $this->getJson('/api/department/get_department_all');

        $res->assertStatus(200);
        $this->assertSame([['id' => 9, 'department_name' => null]], $res->json('content'));
    }

    // Empty result set: the mapper is skipped and an empty list is returned.
    /** @test */
    public function a_caller_with_no_departments_gets_an_empty_list()
    {
        CallSpFake::fake('EH_SP_Get_Department_By_UserId', [[]]);

        $res = $this->getJson('/api/department/get_department_all');

        $res->assertStatus(200);
        $this->assertSame([], $res->json('content'));
    }

    // Unlike its App\Http\Controllers siblings, this controller DOES import Exception, so a stored
    // procedure failure is handled and reported as 404 rather than escaping as a 500.
    /** @test */
    public function a_stored_procedure_failure_is_reported_as_a_handled_not_found()
    {
        // EH_SP_Get_Department_By_UserId intentionally NOT faked -> CallSpFake throws.
        $res = $this->getJson('/api/department/get_department_all');

        $res->assertStatus(404);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
    }

    // ============================================================ assign_handlers()

    // A single handler posted as a scalar (not a list) is coerced to a one-element array before it
    // reaches the repository, whose signature requires an array.
    /** @test */
    public function a_single_handler_posted_as_a_scalar_is_coerced_to_a_one_element_list()
    {
        $captured = null;
        $this->departmentRepo->shouldReceive('assign_handlers')
            ->once()
            ->andReturnUsing(function ($id, array $userIds) use (&$captured) {
                $captured = [$id, $userIds];
                return null;
            });

        $res = $this->postJson('/api/department/assign_handlers/99999', ['user_id' => $this->user->id]);

        $res->assertStatus(200);
        $this->assertSame('99999', $captured[0]);
        $this->assertSame([$this->user->id], $captured[1]);   // scalar wrapped, JSON type preserved
    }

    // Omitting user_id entirely still hands the repository an array — the `?? []` default — so the
    // department's handler list is cleared rather than the call blowing up on a null.
    /** @test */
    public function omitting_user_id_hands_the_repository_an_empty_list()
    {
        $captured = null;
        $this->departmentRepo->shouldReceive('assign_handlers')
            ->once()
            ->andReturnUsing(function ($id, array $userIds) use (&$captured) {
                $captured = $userIds;
                return null;
            });

        $res = $this->postJson('/api/department/assign_handlers/99999', []);

        $res->assertStatus(200);
        $this->assertSame([], $captured);
    }
}
