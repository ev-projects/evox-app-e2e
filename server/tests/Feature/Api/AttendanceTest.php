<?php

namespace Tests\Feature\Api;

use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;
use App\Modules\Attendance\Services\AttendanceGeoGate;
use Tests\ApiTestCase;

class AttendanceTest extends ApiTestCase
{
    /** @var int */ private $geoIdAllowed = 9001;
    /** @var int */ private $geoIdOther   = 9002;
    /** @var int */ private $callerId;
    /** @var int */ private $employeeAllowedId;
    /** @var int */ private $employeeOtherGeoId;
    /** @var int */ private $departmentId;

    protected function setUp(): void
    {
        parent::setUp();

        // Gary Aure (id=1698): Philippines supervisor, sub-dept 403, EVOX_DEPARTMENT.Id=117.
        // CLAUDE.md forbids fake user inserts — use real users from the dev DB.
        $gary = User::findOrFail(1698);
        $this->callerId      = 1698;
        $this->geoIdAllowed  = (int) $gary->country_id;

        // Glenn Macasarte (id=1593): Philippines employee, same geo as Gary.
        $this->employeeAllowedId = 1593;

        // Gary's EVOX_DEPARTMENT.Id — confirmed in CLAUDE.md (DepartmentId=117).
        $this->departmentId = 117;

        // A real active user with a different country_id whose geo also exists in utc_timelog
        // so the by-geo controller proceeds to the gate check (returns 403, not 404).
        $otherGeoUser = User::where('is_active', 1)
            ->whereNotNull('country_id')
            ->where('country_id', '!=', $this->geoIdAllowed)
            ->whereExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('utc_timelog')
                    ->whereColumn('utc_timelog.country_id', 'users.country_id');
            })
            ->first();
        if (!$otherGeoUser) {
            $this->markTestIncomplete('No active user with a different country_id in utc_timelog found for geo-gate tests.');
        }
        $this->geoIdOther         = (int) $otherGeoUser->country_id;
        $this->employeeOtherGeoId = $otherGeoUser->id;

        // Insert a DTR + summary row for Glenn so happy-path date-range queries return data.
        // Guard against the unique key (user_id, date): Glenn may already have a real
        // production DTR for yesterday — if so, reuse it rather than failing on insert.
        $yesterday = date('Y-m-d', strtotime('-1 day'));

        $alreadyHasDtr = DB::table('dtrs')
            ->where('user_id', $this->employeeAllowedId)
            ->where('date', $yesterday)
            ->exists();

        if (!$alreadyHasDtr) {
            DB::table('dtrs')->insert([
                'user_id'             => $this->employeeAllowedId,
                'date'                => $yesterday,
                'time_in'             => strtotime($yesterday . ' 09:00:00'),
                'time_out'            => strtotime($yesterday . ' 18:00:00'),
                'start_datetime'      => strtotime($yesterday . ' 09:00:00'),
                'end_datetime'        => strtotime($yesterday . ' 18:00:00'),
                'is_rest_day'         => 0,
                'source_type_tagging' => 'default',
                'created_at'          => now(),
                'updated_at'          => now(),
            ]);
        }

        $alreadyHasSummary = DB::table('drt_summary_report')
            ->where('user_id', $this->employeeAllowedId)
            ->where('login_date', $yesterday)
            ->exists();

        if (!$alreadyHasSummary) {
            DB::table('drt_summary_report')->insert([
                'user_id'            => $this->employeeAllowedId,
                'supervisor_id'      => 0,
                'login_date'         => $yesterday,
                'reg_rendered_hours' => 8.00,
                'reg_late'           => 0.00,
                'reg_undertime'      => 0.00,
                'created_at'         => now(),
                'updated_at'         => now(),
            ]);
        }
    }

    /**
     * Centralized auth helper (JWT-based)
     */
    private function auth(int $userId): array
    {
        return $this->authHeaders(
            $this->tokenForUserId($userId)
        );
    }

    // =========================================================
    // AUTH GATE
    // =========================================================

    public function testRejectsRequestWithoutAuth()
    {
        $response = $this->getJson('/api/attendance/by-geo/' . $this->geoIdAllowed);

        $this->assertContains($response->status(), [401, 403]);
    }

    // =========================================================
    // 404s
    // =========================================================

    public function testReturns404ForUnknownGeo()
    {
        $response = $this->withHeaders($this->auth($this->callerId))
            ->getJson('/api/attendance/by-geo/999999');

        $response->assertStatus(404);
    }

    public function testReturns404ForUnknownDepartment()
    {
        $response = $this->withHeaders($this->auth($this->callerId))
            ->getJson('/api/attendance/by-department/999999');

        $response->assertStatus(404);
    }

    public function testReturns404ForUnknownEmployee()
    {
        $response = $this->withHeaders($this->auth($this->callerId))
            ->getJson('/api/attendance/by-employee/999999');

        $response->assertStatus(404);
    }

    // =========================================================
    // 403 GEO GATING
    // =========================================================

    public function testReturns403WhenCallerCannotAccessGeo()
    {
        $response = $this->withHeaders($this->auth($this->callerId))
            ->getJson('/api/attendance/by-geo/' . $this->geoIdOther);

        $response->assertStatus(403);
    }

    public function testReturns403WhenCallerRequestsForeignEmployee()
    {
        $response = $this->withHeaders($this->auth($this->callerId))
            ->getJson('/api/attendance/by-employee/' . $this->employeeOtherGeoId);

        $response->assertStatus(403);
    }

    // =========================================================
    // 422 VALIDATION
    // =========================================================

    public function testReturns422ForMalformedFromDate()
    {
        $response = $this->withHeaders($this->auth($this->callerId))
            ->getJson('/api/attendance/by-geo/' . $this->geoIdAllowed . '?from=not-a-date');

        $response->assertStatus(422);
    }

    public function testReturns422WhenRangeExceeds90Days()
    {
        $response = $this->withHeaders($this->auth($this->callerId))
            ->getJson('/api/attendance/by-geo/' . $this->geoIdAllowed
                . '?from=2025-01-01&to=2025-12-31');

        $response->assertStatus(422);
    }

    // =========================================================
    // 200 HAPPY PATH
    // =========================================================

    public function testByGeoHappyPath()
    {
        $response = $this->withHeaders($this->auth($this->callerId))
            ->getJson('/api/attendance/by-geo/' . $this->geoIdAllowed);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'content' => [
                    'geo',
                    'date_range',
                    'pagination',
                    'employees',
                ],
            ]);
    }

    public function testByDepartmentHappyPath()
    {
        $response = $this->withHeaders($this->auth($this->callerId))
            ->getJson('/api/attendance/by-department/' . $this->departmentId);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'content' => [
                    'department',
                    'date_range',
                    'pagination',
                    'employees',
                ],
            ]);
    }

    public function testByEmployeeHappyPath()
    {
        $response = $this->withHeaders($this->auth($this->callerId))
            ->getJson('/api/attendance/by-employee/' . $this->employeeAllowedId);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'content' => [
                    'employee',
                    'date_range',
                    'daily',
                ],
            ]);
    }

    // =========================================================
    // GEO GATE UNIT
    // =========================================================

    public function testGeoGateRejectsForeignGeoForNonPrivilegedCaller()
    {
        $caller = User::find($this->callerId);
        $gate   = $this->app->make(AttendanceGeoGate::class);

        $this->assertTrue($gate->canAccessGeo($caller, $this->geoIdAllowed));
        $this->assertFalse($gate->canAccessGeo($caller, $this->geoIdOther));
    }

    // =========================================================
    // DEPARTMENT MASTER
    // =========================================================

    public function testDepartmentsMasterRejectsUnauthenticated()
    {
        $response = $this->getJson('/api/masters/departments');

        $this->assertContains($response->status(), [401, 403]);
    }

    public function testDepartmentsMasterReturns200WithCorrectShape()
    {
        $response = $this->withHeaders($this->auth($this->callerId))
            ->getJson('/api/masters/departments');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'content',
            ]);
        $found = collect($response->json('content'))
            ->firstWhere('id', $this->departmentId);

        $this->assertNotNull($found);
        $this->assertArrayHasKey('id', $found);
        $this->assertArrayHasKey('name', $found);
        $this->assertArrayHasKey('geo_id', $found);
    }

    public function testDepartmentsMasterDerivedGeoIdMatchesUserCountry()
    {
        $response = $this->withHeaders($this->auth($this->callerId))
            ->getJson('/api/masters/departments');

        $found = collect($response->json('content'))
            ->firstWhere('id', $this->departmentId);

        $this->assertEquals($this->geoIdAllowed, $found['geo_id']);
    }
}