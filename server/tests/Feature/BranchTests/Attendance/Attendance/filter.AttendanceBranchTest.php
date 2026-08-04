<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for AttendanceController::filter arms. Menu=Attendance Page=Attendance.
 *
 * Read-only geo-gated attendance endpoints. All constructor deps IoC-mocked:
 *   AttendanceRepositoryInterface (byGeo/byDepartment/byEmployee/dailyForUser) and the concrete
 *   AttendanceGeoGate service (canAccessGeo/canAccessDepartment/canAccessEmployee). Existence checks
 *   hit real, scoped, read-only rows (UtcTimelog::where(country_id)->first(), DB::table('EVOX_DEPARTMENT')
 *   ->where('Id')->first(), User::find(id)) — never a whole-table scan. Exception arm forced via a mocked
 *   gate method ->andThrow. No call_sp / external / write anywhere in this controller.
 *
 * Status codes verified against the code:
 *   success_response => 200 {message,content};
 *   *_not_found      => error_response(..., HTTP_NOT_FOUND=404) {error:{message,content}};
 *   forbidden_*      => error_response(..., HTTP_FORBIDDEN=403);
 *   catch(Exception) => error_response(..., HTTP_INTERNAL_SERVER_ERROR=500);
 *   FormRequest failedValidation => error_response(..., HTTP_UNPROCESSABLE_ENTITY=422).
 *
 * No SKIPPED-SP / SKIPPED-EXTERNAL / SKIPPED-DESTRUCTIVE arms exist (endpoints are read-only).
 * // FINDING: AttendanceController::resolveRange() 90-day clamp (lines 241-243) is UNREACHABLE via the
 *   endpoint — AttendanceRangeRequest::withValidator() rejects any >90-day range with 422 before the
 *   controller body runs, so the defensive clamp is dead code. Not separately branch-tested.
 *   resolvePerPage() min/max caps are private-helper branches exercised inside the success paths; they
 *   do not change the response status, so they are not separately enumerated (SPEC: public methods).
 *
 * Routes (module prefix attendance/, mounted under /api; ids constrained to [0-9]+):
 *   GET /api/attendance/by-geo/{geoId}                 -> byGeo()
 *   GET /api/attendance/by-department/{departmentId}   -> byDepartment()
 *   GET /api/attendance/by-employee/{employeeId}       -> byEmployee()
 */

namespace Tests\Feature\BranchTests\Attendance\Attendance;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\DB;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\User\Models\UtcTimelog;
use App\Modules\Attendance\Repositories\AttendanceRepositoryInterface;
use App\Modules\Attendance\Services\AttendanceGeoGate;

class AttendanceFilterBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    /** @var UtcTimelog */
    private $geo;

    /** @var object */
    private $department;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();               // reach controller bodies past jwtauth/auth.apikey
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestIncomplete('no user in test DB');

        // Scoped, read-only fixtures (->first(), no table scan).
        $this->geo        = UtcTimelog::first();
        $this->department = DB::table('EVOX_DEPARTMENT')->first();
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** Bind a Mockery mock into the container. */
    private function mockDep(string $class): \Mockery\MockInterface
    {
        $m = Mockery::mock($class);
        $this->app->instance($class, $m);
        return $m;
    }

    /** Bind both constructor deps; return [repoMock, gateMock]. */
    private function mockDeps(): array
    {
        return [
            $this->mockDep(AttendanceRepositoryInterface::class),
            $this->mockDep(AttendanceGeoGate::class),
        ];
    }

    private function emptyPaginator(): LengthAwarePaginator
    {
        return new LengthAwarePaginator([], 0, 50, 1);
    }

    // =====================================================================  byGeo()
    // Branch: geo row not found -> error_response(HTTP_NOT_FOUND) 404
    /** @test */
    public function byGeo__filter__geo_not_found__not_found_404()
    {
        $this->mockDeps(); // never invoked: returns before gate/repo

        $res = $this->actingAs($this->user)->getJson('/api/attendance/by-geo/987654321');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: geo exists but gate denies -> error_response(HTTP_FORBIDDEN) 403
    /** @test */
    public function byGeo__filter__forbidden__forbidden_403()
    {
        if (!$this->geo) $this->markTestIncomplete('no utc_timelog geo row');
        [$repo, $gate] = $this->mockDeps();
        $gate->shouldReceive('canAccessGeo')->once()->andReturn(false);

        $res = $this->actingAs($this->user)->getJson("/api/attendance/by-geo/{$this->geo->country_id}");

        $res->assertStatus(403)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: geo exists + gate allows -> success_response 200
    /** @test */
    public function byGeo__filter__success__ok_200()
    {
        if (!$this->geo) $this->markTestIncomplete('no utc_timelog geo row');
        [$repo, $gate] = $this->mockDeps();
        $gate->shouldReceive('canAccessGeo')->once()->andReturn(true);
        $repo->shouldReceive('byGeo')->once()->andReturn($this->emptyPaginator());

        $res = $this->actingAs($this->user)->getJson("/api/attendance/by-geo/{$this->geo->country_id}");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch: catch(Exception) -> error_response(HTTP_INTERNAL_SERVER_ERROR) 500
    /** @test */
    public function byGeo__filter__exception__error_500()
    {
        if (!$this->geo) $this->markTestIncomplete('no utc_timelog geo row');
        [$repo, $gate] = $this->mockDeps();
        $gate->shouldReceive('canAccessGeo')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)->getJson("/api/attendance/by-geo/{$this->geo->country_id}");

        $res->assertStatus(500)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: FormRequest validation fails (bad from format) -> failedValidation 422
    /** @test */
    public function byGeo__filter__invalid_from__unprocessable_422()
    {
        $this->mockDeps(); // controller body never reached

        $res = $this->actingAs($this->user)->getJson('/api/attendance/by-geo/1?from=NOT-A-DATE');

        $res->assertStatus(422)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ===============================================================  byDepartment()
    // Branch: department row not found -> error_response(HTTP_NOT_FOUND) 404
    /** @test */
    public function byDepartment__filter__department_not_found__not_found_404()
    {
        $this->mockDeps();

        $res = $this->actingAs($this->user)->getJson('/api/attendance/by-department/987654321');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: department exists but gate denies -> error_response(HTTP_FORBIDDEN) 403
    /** @test */
    public function byDepartment__filter__forbidden__forbidden_403()
    {
        if (!$this->department) $this->markTestIncomplete('no EVOX_DEPARTMENT row');
        [$repo, $gate] = $this->mockDeps();
        $gate->shouldReceive('canAccessDepartment')->once()->andReturn(false);

        $res = $this->actingAs($this->user)->getJson("/api/attendance/by-department/{$this->department->Id}");

        $res->assertStatus(403)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: department exists + gate allows -> success_response 200
    /** @test */
    public function byDepartment__filter__success__ok_200()
    {
        if (!$this->department) $this->markTestIncomplete('no EVOX_DEPARTMENT row');
        [$repo, $gate] = $this->mockDeps();
        $gate->shouldReceive('canAccessDepartment')->once()->andReturn(true);
        $repo->shouldReceive('byDepartment')->once()->andReturn($this->emptyPaginator());

        $res = $this->actingAs($this->user)->getJson("/api/attendance/by-department/{$this->department->Id}");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch: catch(Exception) -> error_response(HTTP_INTERNAL_SERVER_ERROR) 500
    /** @test */
    public function byDepartment__filter__exception__error_500()
    {
        if (!$this->department) $this->markTestIncomplete('no EVOX_DEPARTMENT row');
        [$repo, $gate] = $this->mockDeps();
        $gate->shouldReceive('canAccessDepartment')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)->getJson("/api/attendance/by-department/{$this->department->Id}");

        $res->assertStatus(500)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: FormRequest validation fails (bad to format) -> failedValidation 422
    /** @test */
    public function byDepartment__filter__invalid_to__unprocessable_422()
    {
        $this->mockDeps();

        $res = $this->actingAs($this->user)->getJson('/api/attendance/by-department/1?to=NOT-A-DATE');

        $res->assertStatus(422)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // =================================================================  byEmployee()
    // Branch: employee not found -> error_response(HTTP_NOT_FOUND) 404
    /** @test */
    public function byEmployee__filter__employee_not_found__not_found_404()
    {
        $this->mockDeps();

        $res = $this->actingAs($this->user)->getJson('/api/attendance/by-employee/987654321');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: employee exists but gate denies -> error_response(HTTP_FORBIDDEN) 403
    /** @test */
    public function byEmployee__filter__forbidden__forbidden_403()
    {
        [$repo, $gate] = $this->mockDeps();
        $gate->shouldReceive('canAccessEmployee')->once()->andReturn(false);

        $res = $this->actingAs($this->user)->getJson("/api/attendance/by-employee/{$this->user->id}");

        $res->assertStatus(403)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: employee exists + gate allows -> success_response 200
    /** @test */
    public function byEmployee__filter__success__ok_200()
    {
        [$repo, $gate] = $this->mockDeps();
        $gate->shouldReceive('canAccessEmployee')->once()->andReturn(true);
        $repo->shouldReceive('dailyForUser')->once()->andReturn([]);

        $res = $this->actingAs($this->user)->getJson("/api/attendance/by-employee/{$this->user->id}");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch: catch(Exception) -> error_response(HTTP_INTERNAL_SERVER_ERROR) 500
    /** @test */
    public function byEmployee__filter__exception__error_500()
    {
        [$repo, $gate] = $this->mockDeps();
        $gate->shouldReceive('canAccessEmployee')->once()->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)->getJson("/api/attendance/by-employee/{$this->user->id}");

        $res->assertStatus(500)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: FormRequest validation fails (per_page > 200) -> failedValidation 422
    /** @test */
    public function byEmployee__filter__invalid_per_page__unprocessable_422()
    {
        $this->mockDeps();

        $res = $this->actingAs($this->user)->getJson("/api/attendance/by-employee/{$this->user->id}?per_page=9999");

        $res->assertStatus(422)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
