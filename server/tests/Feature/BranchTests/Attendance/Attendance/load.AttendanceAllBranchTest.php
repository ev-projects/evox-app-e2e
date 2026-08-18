<?php
/**
 * SOURCE FILE UNDER TEST
 *   app/Modules/Attendance/Http/Controllers/AttendanceController.php :: byAll()   (0% before this file)
 *
 * MENU PATH
 *   Attendance -> Attendance (employee roster) — GET /api/attendance/all, the paginated roster feed
 *   consumed by the external attendance integration. The sibling by-geo / by-department / by-employee
 *   endpoints are already covered by filter.AttendanceBranchTest; byAll() had never been called.
 *
 * WHY A USER CARES
 *   byAll() is the ONLY attendance endpoint that deliberately returns no daily rows. Lines 62-65
 *   overwrite `_attendance_rows` with an empty array for every employee before the resource renders,
 *   so a consumer gets the roster and pagination but zero attendance data — it must page through
 *   by-geo or by-employee for that. If that blanking ever stopped happening the endpoint would start
 *   emitting every employee's punches in one unpaginated-by-date payload.
 *
 * ARMS COVERED — both sides of every conditional
 *   - success arm: repository paginator rendered, pagination block echoed, daily blanked   -> 200
 *   - catch(Exception) arm: repository throws                                              -> 500
 *   - FormRequest gate (AttendanceByGeoRequest / AttendanceRangeRequest) rejects per_page   -> 422
 *   - default pagination (no query string) vs explicit pagination — both asserted on the values the
 *     controller's private resolvePerPage()/resolvePage() hand to the repository
 *
 * SAFETY
 *   AttendanceRepositoryInterface and the concrete AttendanceGeoGate are both IoC-mocked, so no query
 *   runs against the live dump; the only real read is ONE user row used as the paginator item and the
 *   acting user. Nothing is written and no stored procedure is reachable.
 *
 * FINDINGS
 *   ATT-ALL-NOGATE-1 (characterized below, not fixed): byAll() is the only endpoint in this controller
 *     that never consults AttendanceGeoGate. byGeo/byDepartment/byEmployee all refuse a caller outside
 *     their geo; /api/attendance/all hands back every active employee in every country to any caller
 *     who passes jwtauth + auth.apikey. Asserted as today's behaviour — the gate mock is set to
 *     receive nothing, so a future geo filter fails this test first.
 */

namespace Tests\Feature\BranchTests\Attendance\Attendance;

use Exception;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\TestCase;
use App\Modules\Attendance\Repositories\AttendanceRepositoryInterface;
use App\Modules\Attendance\Services\AttendanceGeoGate;
use App\Modules\User\Models\User;

class AttendanceAllLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();                 // past jwtauth / auth.apikey to the controller body
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) {
            $this->markTestSkipped('no user row in test DB to act as');
        }
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function mockDep(string $class): \Mockery\MockInterface
    {
        $m = Mockery::mock($class);
        $this->app->instance($class, $m);

        return $m;
    }

    /** Bind both constructor deps; returns [repositoryMock, geoGateMock]. */
    private function mockDeps(): array
    {
        return [
            $this->mockDep(AttendanceRepositoryInterface::class),
            $this->mockDep(AttendanceGeoGate::class),
        ];
    }

    /** One real user as the single paginator item, inside a 3-page result of 7 employees. */
    private function paginatorOfOne(int $perPage, int $page): LengthAwarePaginator
    {
        return new LengthAwarePaginator([$this->user], 7, $perPage, $page);
    }

    // =====================================================================  byAll() success

    /**
     * The roster arm. The pagination block must echo the repository's paginator exactly, and every
     * employee must come back with an EMPTY daily array — byAll() blanks it on purpose.
     *
     * @test
     */
    public function the_roster_returns_pagination_and_blanks_every_employees_daily_rows()
    {
        [$repo, $gate] = $this->mockDeps();
        $repo->shouldReceive('byAll')->once()->with(50, 1)->andReturn($this->paginatorOfOne(50, 1));
        // FINDING ATT-ALL-NOGATE-1: byAll() consults no geo gate at all.
        $gate->shouldReceive('canAccessGeo')->never();
        $gate->shouldReceive('canAccessDepartment')->never();
        $gate->shouldReceive('canAccessEmployee')->never();

        $res = $this->getJson('/api/attendance/all');

        $res->assertStatus(200);
        $this->assertSame(trans('messages.attendance_fetch_success'), $res->json('message'));
        $this->assertSame(7, $res->json('content.pagination.total'));
        $this->assertSame(50, $res->json('content.pagination.per_page'));
        $this->assertSame(1, $res->json('content.pagination.current_page'));
        $this->assertSame(1, $res->json('content.pagination.last_page'), '7 employees at 50 per page is one page');

        $this->assertCount(1, $res->json('content.employees'));
        $this->assertSame($this->user->id, $res->json('content.employees.0.id'));
        $this->assertSame(
            [],
            $res->json('content.employees.0.daily'),
            'the roster endpoint must not carry attendance rows — callers page by-geo or by-employee for those'
        );
    }

    /**
     * The other side of the pagination defaults: an explicit page size and page number are passed
     * through to the repository unchanged, and last_page is recomputed from them.
     *
     * @test
     */
    public function an_explicit_page_size_and_page_number_are_passed_through_to_the_repository()
    {
        [$repo, $gate] = $this->mockDeps();
        $repo->shouldReceive('byAll')->once()->with(3, 2)->andReturn($this->paginatorOfOne(3, 2));

        $res = $this->getJson('/api/attendance/all?per_page=3&page=2');

        $res->assertStatus(200);
        $this->assertSame(3, $res->json('content.pagination.per_page'));
        $this->assertSame(2, $res->json('content.pagination.current_page'));
        $this->assertSame(3, $res->json('content.pagination.last_page'), '7 employees at 3 per page is three pages');
    }

    /**
     * The largest page the validator allows. 200 is the documented ceiling and must reach the
     * repository as-is rather than being clamped down.
     *
     * @test
     */
    public function the_maximum_allowed_page_size_reaches_the_repository_unclamped()
    {
        [$repo, $gate] = $this->mockDeps();
        $repo->shouldReceive('byAll')->once()->with(200, 1)->andReturn($this->paginatorOfOne(200, 1));

        $this->getJson('/api/attendance/all?per_page=200')->assertStatus(200);
    }

    // =====================================================================  byAll() rejection arms

    /**
     * One over the ceiling is refused by AttendanceRangeRequest before the controller body runs —
     * the database protection is in the validator, not in the controller's defensive clamp.
     *
     * @test
     */
    public function a_page_size_above_the_ceiling_is_refused_before_the_repository_is_touched()
    {
        [$repo, $gate] = $this->mockDeps();
        $repo->shouldReceive('byAll')->never();

        $res = $this->getJson('/api/attendance/all?per_page=201');

        $res->assertStatus(422)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    /**
     * The shared range rules apply to this endpoint too even though it reads no dates: a malformed
     * `from` is rejected with 422 and never reaches the roster query.
     *
     * @test
     */
    public function a_malformed_from_date_is_refused_before_the_repository_is_touched()
    {
        [$repo, $gate] = $this->mockDeps();
        $repo->shouldReceive('byAll')->never();

        $this->getJson('/api/attendance/all?from=NOT-A-DATE')->assertStatus(422);
    }

    /**
     * Catch arm. A repository fault must surface as a handled 500 envelope, not as a raw framework
     * stack trace leaking to the integration consumer.
     *
     * @test
     */
    public function a_repository_fault_is_reported_as_a_handled_server_error()
    {
        [$repo, $gate] = $this->mockDeps();
        $repo->shouldReceive('byAll')->once()->andThrow(new Exception('roster query exploded'));

        $res = $this->getJson('/api/attendance/all');

        $res->assertStatus(500)->assertJsonStructure(['error' => ['message', 'content']]);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
        $this->assertSame('roster query exploded', $res->json('error.content'), 'the fault message is carried in content');
    }
}
