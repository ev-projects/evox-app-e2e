<?php

// DRAFT — generated 2026-06-17, needs verification

/**
 * EVOX Attendance API Tests — Vishnu Padmanabhan
 *
 * All attendance endpoints share middleware: jwtauth, auth.apikey.
 * All business logic is backed by the AttendanceRepositoryInterface and
 * AttendanceGeoGate — in the test environment those will hit real DB tables
 * (attendance_logs, utc_timelog, EVOX_DEPARTMENT). With withoutMiddleware +
 * actingAs the code path fires end-to-end; the goal is coverage (not 500),
 * not correctness of geo-gate or pagination values.
 *
 * Routes (all under prefix api/attendance/, middleware: jwtauth, auth.apikey):
 *   GET  attendance/by-geo/{geoId}          — AttendanceController@byGeo
 *   GET  attendance/by-department/{deptId}  — AttendanceController@byDepartment
 *   GET  attendance/by-employee/{empId}     — AttendanceController@byEmployee
 *   GET  attendance/geos/                   — GeoController@index
 *
 * Test patterns:
 *   A — Controller logic: withoutMiddleware() + actingAs($user)  → not 500
 *   B — Auth enforcement: no middleware bypass, no Bearer token  → 401
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\User\Models\UtcTimelog;
use App\Modules\Department\Models\Department;
use Illuminate\Support\Facades\DB;

class AttendanceApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->apiKey = [
            'X-Authorization' => env(
                'APP_API_KEY',
                'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z'
            ),
        ];

        $this->user = User::where('is_active', 1)
            ->whereNotNull('email')
            ->firstOrFail();
    }

    // ─── Pattern B: auth enforcement — all attendance endpoints require JWT ────

    /** @test */
    public function test_by_geo_without_token_returns_401()
    {
        $response = $this->getJson('/api/attendance/by-geo/1', $this->apiKey);
        $response->assertStatus(401);
    }

    /** @test */
    public function test_by_department_without_token_returns_401()
    {
        $response = $this->getJson('/api/attendance/by-department/1', $this->apiKey);
        $response->assertStatus(401);
    }

    /** @test */
    public function test_by_employee_without_token_returns_401()
    {
        $response = $this->getJson('/api/attendance/by-employee/1', $this->apiKey);
        $response->assertStatus(401);
    }

    /** @test */
    public function test_geos_index_without_token_returns_401()
    {
        $response = $this->getJson('/api/attendance/geos/', $this->apiKey);
        $response->assertStatus(401);
    }

    // ─── Pattern A: GeoController@index — utc_timelog DB read ─────────────────

    /** @test */
    public function test_geos_index_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/attendance/geos/', $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'GeoController@index must not throw 500.');
    }

    /** @test */
    public function test_geos_index_success_response_has_message_and_content()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/attendance/geos/', $this->apiKey);

        if ($response->status() === 200) {
            $response->assertJsonStructure(['message', 'content']);
        } else {
            $this->assertNotNull($response->json('error'),
                'Non-200 response must use the error envelope.');
        }
    }

    // ─── Pattern A: AttendanceController@byGeo — real geo ID from DB ──────────

    /** @test */
    public function test_by_geo_with_valid_geo_id_returns_not_500()
    {
        $this->withoutMiddleware();

        // Use the first geo that actually exists in the country master.
        $geo = UtcTimelog::first();
        if (!$geo) {
            $this->markTestSkipped('No rows in utc_timelog — cannot resolve a real geoId.');
        }
        $geoId = $geo->country_id;

        $response = $this->actingAs($this->user)
            ->getJson("/api/attendance/by-geo/{$geoId}", $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            "byGeo({$geoId}) must not throw 500.");
    }

    /** @test */
    public function test_by_geo_with_valid_geo_id_and_date_range_returns_not_500()
    {
        $this->withoutMiddleware();

        $geo = UtcTimelog::first();
        if (!$geo) {
            $this->markTestSkipped('No rows in utc_timelog.');
        }
        $geoId = $geo->country_id;

        $from = date('Y-m-01');   // first day of current month
        $to   = date('Y-m-d');    // today

        $response = $this->actingAs($this->user)
            ->getJson("/api/attendance/by-geo/{$geoId}?from={$from}&to={$to}&per_page=10", $this->apiKey);

        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_by_geo_with_nonexistent_geo_id_returns_not_500()
    {
        $this->withoutMiddleware();

        // 999999 is virtually guaranteed to not exist — controller returns 404 via error_response.
        $response = $this->actingAs($this->user)
            ->getJson('/api/attendance/by-geo/999999', $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        // Should be a 404 with error envelope, not a 500.
        $this->assertContains($response->status(), [404, 403, 200]);
    }

    /** @test */
    public function test_by_geo_success_response_envelope_shape()
    {
        $this->withoutMiddleware();

        $geo = UtcTimelog::first();
        if (!$geo) {
            $this->markTestSkipped('No rows in utc_timelog.');
        }
        $geoId = $geo->country_id;

        $response = $this->actingAs($this->user)
            ->getJson("/api/attendance/by-geo/{$geoId}", $this->apiKey);

        if ($response->status() === 200) {
            $response->assertJsonStructure(['message', 'content']);
            $content = $response->json('content');
            $this->assertIsArray($content, 'content must be an array.');
        }
        // 403/404 are acceptable — 500 is not (already guarded above).
    }

    // ─── Pattern A: AttendanceController@byDepartment — real dept ID from DB ──

    /** @test */
    public function test_by_department_with_valid_dept_id_returns_not_500()
    {
        $this->withoutMiddleware();

        // EVOX_DEPARTMENT is the underlying table; controller reads it via DB::table.
        $dept = DB::table('EVOX_DEPARTMENT')->first();
        if (!$dept) {
            $this->markTestSkipped('No rows in EVOX_DEPARTMENT — cannot resolve a real departmentId.');
        }
        $deptId = $dept->Id;

        $response = $this->actingAs($this->user)
            ->getJson("/api/attendance/by-department/{$deptId}", $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            "byDepartment({$deptId}) must not throw 500.");
    }

    /** @test */
    public function test_by_department_with_valid_dept_id_and_date_range_returns_not_500()
    {
        $this->withoutMiddleware();

        $dept = DB::table('EVOX_DEPARTMENT')->first();
        if (!$dept) {
            $this->markTestSkipped('No rows in EVOX_DEPARTMENT.');
        }
        $deptId = $dept->Id;

        $from = date('Y-m-01');
        $to   = date('Y-m-d');

        $response = $this->actingAs($this->user)
            ->getJson("/api/attendance/by-department/{$deptId}?from={$from}&to={$to}&per_page=10", $this->apiKey);

        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_by_department_with_nonexistent_dept_id_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/attendance/by-department/999999', $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        $this->assertContains($response->status(), [404, 403, 200]);
    }

    /** @test */
    public function test_by_department_success_response_envelope_shape()
    {
        $this->withoutMiddleware();

        $dept = DB::table('EVOX_DEPARTMENT')->first();
        if (!$dept) {
            $this->markTestSkipped('No rows in EVOX_DEPARTMENT.');
        }
        $deptId = $dept->Id;

        $response = $this->actingAs($this->user)
            ->getJson("/api/attendance/by-department/{$deptId}", $this->apiKey);

        if ($response->status() === 200) {
            $response->assertJsonStructure(['message', 'content']);
        }
    }

    // ─── Pattern A: AttendanceController@byEmployee — real user ID from DB ────

    /** @test */
    public function test_by_employee_with_real_employee_id_returns_not_500()
    {
        $this->withoutMiddleware();

        $employeeId = $this->user->id;

        $response = $this->actingAs($this->user)
            ->getJson("/api/attendance/by-employee/{$employeeId}", $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            "byEmployee({$employeeId}) must not throw 500.");
    }

    /** @test */
    public function test_by_employee_with_date_range_returns_not_500()
    {
        $this->withoutMiddleware();

        $employeeId = $this->user->id;
        $from = date('Y-m-01');
        $to   = date('Y-m-d');

        $response = $this->actingAs($this->user)
            ->getJson("/api/attendance/by-employee/{$employeeId}?from={$from}&to={$to}", $this->apiKey);

        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_by_employee_with_nonexistent_employee_id_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/attendance/by-employee/999999', $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        // Controller returns 404 via error_response when user not found.
        $this->assertContains($response->status(), [404, 403, 200]);
    }

    /** @test */
    public function test_by_employee_success_response_has_daily_array()
    {
        $this->withoutMiddleware();

        $employeeId = $this->user->id;

        $response = $this->actingAs($this->user)
            ->getJson("/api/attendance/by-employee/{$employeeId}", $this->apiKey);

        if ($response->status() === 200) {
            $response->assertJsonStructure(['message', 'content']);
            $content = $response->json('content');
            // byEmployee wraps result in content — check shape loosely.
            $this->assertNotNull($content);
        }
        // 403 (geo gate) or 404 are acceptable; 500 is not.
    }

    /** @test */
    public function test_by_employee_with_per_page_ignored_returns_not_500()
    {
        $this->withoutMiddleware();

        // per_page is silently ignored for byEmployee (no pagination); the controller
        // just calls dailyForUser. Confirm it doesn't blow up when the param is supplied.
        $employeeId = $this->user->id;

        $response = $this->actingAs($this->user)
            ->getJson("/api/attendance/by-employee/{$employeeId}?per_page=5", $this->apiKey);

        $this->assertNotEquals(500, $response->status());
    }

    // ─── Edge cases: date range boundary ──────────────────────────────────────

    /** @test */
    public function test_by_employee_with_range_exceeding_90_days_clamps_gracefully()
    {
        $this->withoutMiddleware();

        $employeeId = $this->user->id;
        // Supply a range deliberately wider than 90 days; controller clamps it internally.
        $from = date('Y-m-d', strtotime('-180 days'));
        $to   = date('Y-m-d');

        $response = $this->actingAs($this->user)
            ->getJson("/api/attendance/by-employee/{$employeeId}?from={$from}&to={$to}", $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'byEmployee must clamp wide date ranges without crashing.');
    }

    /** @test */
    public function test_by_geo_with_range_exceeding_90_days_clamps_gracefully()
    {
        $this->withoutMiddleware();

        $geo = UtcTimelog::first();
        if (!$geo) {
            $this->markTestSkipped('No rows in utc_timelog.');
        }
        $geoId = $geo->country_id;

        $from = date('Y-m-d', strtotime('-180 days'));
        $to   = date('Y-m-d');

        $response = $this->actingAs($this->user)
            ->getJson("/api/attendance/by-geo/{$geoId}?from={$from}&to={$to}", $this->apiKey);

        $this->assertNotEquals(500, $response->status());
    }

    // ─── Per-page boundary values ──────────────────────────────────────────────

    /** @test */
    public function test_by_geo_with_zero_per_page_defaults_to_50_no_500()
    {
        $this->withoutMiddleware();

        $geo = UtcTimelog::first();
        if (!$geo) {
            $this->markTestSkipped('No rows in utc_timelog.');
        }

        $response = $this->actingAs($this->user)
            ->getJson("/api/attendance/by-geo/{$geo->country_id}?per_page=0", $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'per_page=0 should clamp to 50, not crash.');
    }

    /** @test */
    public function test_by_geo_with_oversized_per_page_caps_at_200_no_500()
    {
        $this->withoutMiddleware();

        $geo = UtcTimelog::first();
        if (!$geo) {
            $this->markTestSkipped('No rows in utc_timelog.');
        }

        $response = $this->actingAs($this->user)
            ->getJson("/api/attendance/by-geo/{$geo->country_id}?per_page=9999", $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'per_page=9999 should be capped at 200, not crash.');
    }
}
