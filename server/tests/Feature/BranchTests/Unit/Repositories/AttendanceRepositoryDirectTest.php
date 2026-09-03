<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Attendance/Repositories/AttendanceRepository.php — __construct(), byAll(),
 *   byGeo(), byDepartment(), dailyForUser() and all four catch(Exception) arms.
 *   app/Modules/Attendance/Http/Controllers/AttendanceController.php — byAll() gating (finding only).
 *
 * MENU PATH   Attendance -> Attendance (the read-only Attendance API used by the CTO integration):
 *               GET /api/attendance/all
 *               GET /api/attendance/by-geo/{geoId}
 *               GET /api/attendance/by-department/{departmentId}
 *               GET /api/attendance/by-employee/{employeeId}
 *
 * COMPLEMENTS BranchTests/Attendance/Attendance/filter.AttendanceBranchTest.php, which drives the
 * controller with the repository IoC-mocked — so the repository's own SQL was never executed:
 * byAll() and __construct() sat at 0%. This suite runs the REAL queries against the dump, bounded
 * to at most five rows per call, and asserts the filtering contract each endpoint promises.
 *
 * HOW THE CATCH ARMS ARE REACHED: the default database connection name is pointed at a connection
 * that is not configured, so the first query in the method throws InvalidArgumentException from
 * Illuminate's DatabaseManager — the shape a database outage or a bad deploy config takes. The name
 * is restored in a finally block before any assertion runs, so the suite's own transaction (and
 * DatabaseTransactions' rollback) is never disturbed. No method here opens a transaction, so no
 * rollback bookkeeping is involved.
 *
 * SAFETY: DatabaseTransactions; read-only suite — not a single write. Every fixture probe is a
 * single-row ->first()/->value() and every repository call is paginated to <= 5 rows. No SP, no
 * external call, no DDL.
 *
 * FINDINGS
 *   FINDING BE-ATT-ALL-UNGATED  GET /api/attendance/all (AttendanceController::byAll) never
 *     consults AttendanceGeoGate, while by-geo, by-department and by-employee all do and can answer
 *     403. AttendanceRepository::byAll() likewise takes no caller and no geo/department filter — it
 *     returns every active employee in the company. Any holder of a valid JWT + API key can
 *     therefore read the full employee list, including geos their own account is barred from on the
 *     sibling endpoints. Characterised by
 *     byAll__all_employees_endpoint_never_consults_the_geo_gate_FINDING_BE_ATT_ALL_UNGATED, which
 *     also shows the same caller being refused by the gated endpoint.
 */

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Exception;
use Mockery;
use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\Attendance\Repositories\AttendanceRepository;
use App\Modules\Attendance\Repositories\AttendanceRepositoryInterface;
use App\Modules\Attendance\Services\AttendanceGeoGate;
use App\Modules\User\Models\User;

class AttendanceRepositoryDirectTest extends TestCase
{
    use DatabaseTransactions;

    const MISSING_ID = 999999999;

    /** @var AttendanceRepository */
    private $repo;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();

        $this->repo = new AttendanceRepository();

        $this->user = User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$this->user) {
            $this->markTestSkipped('no active user in test DB');
        }
        // Resolved in memory so the error-path logging never needs the (broken) connection.
        $this->be($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** One active, joinable employee row — the joins in this repository are INNER, so all three
     *  of sub-department, department and an active flag must be present for a row to appear. */
    private function joinableEmployeeOrSkip()
    {
        $row = DB::table('users')
            ->join('EVOX_SUB_DEPARTMENT as sd', 'sd.Id', '=', 'users.SubDepartmentID')
            ->join('EVOX_DEPARTMENT as d', 'd.Id', '=', 'sd.DepartmentId')
            ->where('users.is_active', 1)
            ->whereNull('users.deleted_at')
            ->whereNotNull('users.country_id')
            ->orderBy('users.id', 'desc')
            ->select('users.id', 'users.country_id', 'sd.DepartmentId as department_id')
            ->first();

        if (!$row) {
            $this->markTestSkipped('no active employee with a sub-department/department in test DB');
        }

        return $row;
    }

    /** Runs $work with the default database connection pointed at nothing. */
    private function failureFromBrokenDatabase(callable $work)
    {
        $original = config('database.default');
        config(['database.default' => 'zz_not_configured']);

        $caught = null;
        try {
            $work();
        } catch (Exception $e) {
            $caught = $e;
        } finally {
            config(['database.default' => $original]);
        }

        $this->assertNotNull($caught,
            'a database outage must reach the caller, never be answered as an empty attendance list');

        return $caught;
    }

    // =================================================================== byAll()

    /** @test */
    public function the_all_employees_page_lists_only_live_employees_with_their_department_columns()
    {
        $this->joinableEmployeeOrSkip();

        $page = $this->repo->byAll(2, 1);

        $this->assertInstanceOf(LengthAwarePaginator::class, $page);
        $this->assertSame(2, $page->perPage());
        $this->assertSame(1, $page->currentPage());
        $this->assertGreaterThan(0, $page->total());
        $this->assertLessThanOrEqual(2, count($page->items()));

        foreach ($page->items() as $employee) {
            $attributes = $employee->getAttributes();
            $this->assertEquals(1, $employee->is_active, 'a deactivated employee must never be listed');
            $this->assertNull($employee->deleted_at, 'a deleted employee must never be listed');
            // The department columns the AttendanceResource depends on are projected by the join.
            foreach (['country_name', 'sub_department_id', 'sub_department_name', 'department_id', 'department_name'] as $column) {
                $this->assertArrayHasKey($column, $attributes);
            }
        }
    }

    /** @test */
    public function the_all_employees_page_hands_out_a_different_slice_per_page()
    {
        $first = $this->repo->byAll(2, 1);
        if ($first->lastPage() < 2) {
            $this->markTestSkipped('fewer than three active employees in test DB — no second page');
        }

        $second = $this->repo->byAll(2, 2);

        $this->assertSame(2, $second->currentPage());
        $this->assertEmpty(
            array_intersect(
                collect($first->items())->pluck('id')->all(),
                collect($second->items())->pluck('id')->all()
            ),
            'page two must not repeat page one'
        );
    }

    /** @test */
    public function a_database_outage_while_listing_all_employees_is_reported_not_hidden()
    {
        $error = $this->failureFromBrokenDatabase(function () {
            $this->repo->byAll(2, 1);
        });

        $this->assertInstanceOf(\InvalidArgumentException::class, $error);
    }

    // =================================================================== byGeo()

    /** @test */
    public function a_geo_page_contains_employees_of_that_geo_only()
    {
        $fixture = $this->joinableEmployeeOrSkip();

        $page = $this->repo->byGeo((int) $fixture->country_id, 5, 1);

        $this->assertGreaterThan(0, $page->total(), 'the fixture employee must be counted');
        foreach ($page->items() as $employee) {
            $this->assertEquals($fixture->country_id, $employee->country_id);
            $this->assertEquals(1, $employee->is_active);
        }
    }

    /** @test */
    public function a_geo_with_no_employees_answers_an_empty_page_rather_than_everyone()
    {
        $page = $this->repo->byGeo(self::MISSING_ID, 5, 1);

        $this->assertSame(0, $page->total());
        $this->assertCount(0, $page->items());
    }

    /** @test */
    public function a_database_outage_while_listing_a_geo_is_reported_not_hidden()
    {
        $error = $this->failureFromBrokenDatabase(function () {
            $this->repo->byGeo(1, 5, 1);
        });

        $this->assertInstanceOf(\InvalidArgumentException::class, $error);
    }

    // ============================================================ byDepartment()

    /** @test */
    public function a_department_page_contains_employees_of_that_department_only()
    {
        $fixture = $this->joinableEmployeeOrSkip();

        $page = $this->repo->byDepartment((int) $fixture->department_id, 5, 1);

        $this->assertGreaterThan(0, $page->total());
        foreach ($page->items() as $employee) {
            // department_id is the EVOX_DEPARTMENT id projected by the join, not users.department_id.
            $this->assertEquals($fixture->department_id, $employee->department_id);
            $this->assertEquals(1, $employee->is_active);
        }
    }

    /** @test */
    public function a_department_with_no_employees_answers_an_empty_page()
    {
        $page = $this->repo->byDepartment(self::MISSING_ID, 5, 1);

        $this->assertSame(0, $page->total());
    }

    /** @test */
    public function a_database_outage_while_listing_a_department_is_reported_not_hidden()
    {
        $error = $this->failureFromBrokenDatabase(function () {
            $this->repo->byDepartment(1, 5, 1);
        });

        $this->assertInstanceOf(\InvalidArgumentException::class, $error);
    }

    // ============================================================ dailyForUser()

    /** @test */
    public function a_worked_day_is_reported_as_present_with_both_punches_in_utc()
    {
        $row = DB::table('dtrs')
            ->leftJoin('drt_summary_report as s', function ($join) {
                $join->on('dtrs.user_id', '=', 's.user_id')
                     ->on('dtrs.date', '=', 's.login_date');
            })
            ->whereNotNull('dtrs.time_in')
            ->whereNotNull('dtrs.time_out')
            ->whereNull('dtrs.deleted_at')
            ->where(function ($q) {
                // Exclude leave days: on_leave outranks every other status in deriveStatus().
                $q->whereNull('s.on_leave')->orWhere('s.on_leave', '<=', 0);
            })
            ->orderBy('dtrs.id', 'desc')
            ->select('dtrs.user_id', 'dtrs.date', 'dtrs.time_in', 'dtrs.time_out')
            ->first();

        if (!$row) {
            $this->markTestSkipped('no completed, non-leave DTR day in test DB');
        }

        $days = $this->repo->dailyForUser((int) $row->user_id, $row->date, $row->date);

        $this->assertNotEmpty($days);

        $day = null;
        foreach ($days as $candidate) {
            if ($candidate['time_in'] === (int) $row->time_in) {
                $day = $candidate;
                break;
            }
        }
        $this->assertNotNull($day, 'the probed DTR day must appear in its own date range');

        // The response contract the CTO integration consumes — key set and order are part of it.
        $this->assertSame([
            'date', 'time_in', 'time_out', 'time_in_iso', 'time_out_iso', 'is_rest_day',
            'on_leave', 'is_holiday', 'rendered_hours', 'late_hours', 'undertime_hours',
            'overtime_hours', 'status',
        ], array_keys($day));

        $this->assertSame('present', $day['status'], 'in and out punches make the day present');
        $this->assertSame((int) $row->time_out, $day['time_out']);
        $this->assertSame(gmdate('c', (int) $row->time_in), $day['time_in_iso']);
        $this->assertSame(gmdate('c', (int) $row->time_out), $day['time_out_iso']);
        $this->assertFalse($day['on_leave']);
        $this->assertTrue(is_bool($day['is_rest_day']), 'is_rest_day is cast to a real boolean');
    }

    /** @test */
    public function a_range_with_no_timelogs_answers_an_empty_series()
    {
        $days = $this->repo->dailyForUser((int) $this->user->id, '2093-01-01', '2093-01-31');

        $this->assertSame([], $days);
    }

    /** @test */
    public function a_database_outage_while_reading_one_employees_days_is_reported_not_hidden()
    {
        $error = $this->failureFromBrokenDatabase(function () {
            $this->repo->dailyForUser((int) $this->user->id, '2026-01-01', '2026-01-31');
        });

        $this->assertInstanceOf(\InvalidArgumentException::class, $error);
    }

    // ============================================================ FINDING: gating

    /**
     * FINDING BE-ATT-ALL-UNGATED — /api/attendance/all is the only Attendance endpoint that never
     * asks AttendanceGeoGate whether the caller may see these employees. The same caller, on the
     * same request cycle, is refused by /api/attendance/by-geo/{id}. Today's behaviour is pinned
     * below; when the gate is added to byAll(), this test will fail on the shouldNotReceive()
     * expectations and should be rewritten to assert a 403.
     *
     * @test
     */
    public function byAll__all_employees_endpoint_never_consults_the_geo_gate_FINDING_BE_ATT_ALL_UNGATED()
    {
        $repo = Mockery::mock(AttendanceRepositoryInterface::class);
        $repo->shouldReceive('byAll')->once()->andReturn(new LengthAwarePaginator([], 0, 50, 1));
        $this->app->instance(AttendanceRepositoryInterface::class, $repo);

        $gate = Mockery::mock(AttendanceGeoGate::class);
        $gate->shouldNotReceive('canAccessGeo');
        $gate->shouldNotReceive('canAccessDepartment');
        $gate->shouldNotReceive('canAccessEmployee');
        $this->app->instance(AttendanceGeoGate::class, $gate);

        $unfiltered = $this->actingAs($this->user)->getJson('/api/attendance/all');

        $unfiltered->assertStatus(200)->assertJsonStructure(['message', 'content']);

        // Same caller, gated sibling endpoint: the gate IS consulted and can refuse.
        $gate->shouldReceive('canAccessGeo')->once()->andReturn(false);
        $geoId = DB::table('utc_timelog')->orderBy('country_id')->value('country_id');
        if (!$geoId) {
            $this->markTestSkipped('no utc_timelog geo row to contrast against');
        }

        $gated = $this->actingAs($this->user)->getJson('/api/attendance/by-geo/' . $geoId);

        $gated->assertStatus(403);
    }
}
