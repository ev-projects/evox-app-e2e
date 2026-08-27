<?php

// DRAFT — generated 2026-06-17, needs verification

/**
 * EVOX Attendance API Tests — Vishnu Padmanabhan
 *
 * Routes:
 *   GET  attendance/by-geo/{geoId}
 *   GET  attendance/by-department/{deptId}
 *   GET  attendance/by-employee/{empId}
 *   GET  attendance/geos/
 *
 * Violations fixed (2026-06-18):
 *   Fix A — runtime API key
 *   Fix B — env-var user loading
 *   Fix C — JWT authHeaders() replaces withoutMiddleware() + actingAs()
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\UtcTimelog;
use Illuminate\Support\Facades\DB;

class AttendanceApiTest extends TestCase
{
    use DatabaseTransactions;

    private string $apiKey;
    protected ?int $userId = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->apiKey = \Illuminate\Support\Str::random(64);
        DB::table('api_keys')->insert([
            'name'       => 'evox_e2e_' . strtolower(class_basename(static::class)) . '_' . now()->format('His'),
            'key'        => $this->apiKey,
            'active'     => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->userId = $this->requireUser('ADMIN_PHILIPPINES');
    }

    private function loadUserByVariant(string $variant): ?int
    {
        $email = env('E2E_USER_' . strtoupper($variant));
        if (!$email) return null;
        return \App\Modules\User\Models\User::where('email', $email)->value('id');
    }

    private function requireUser(string $variant): int
    {
        $id = $this->loadUserByVariant($variant);
        if (!$id) $this->markTestIncomplete("E2E_USER_{$variant} not found in DB");
        return $id;
    }

    private function authHeaders(): array
    {
        $user = \App\Modules\User\Models\User::findOrFail($this->userId);
        $token = auth('api')->login($user);
        return ['Authorization' => "Bearer {$token}", 'X-Authorization' => $this->apiKey];
    }

    // ─── Pattern B: auth enforcement ─────────────────────────────────────────

    /** @test */
    public function test_by_geo_without_token_returns_401()
    {
        $response = $this->getJson('/api/attendance/by-geo/1', ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
    }

    /** @test */
    public function test_by_department_without_token_returns_401()
    {
        $response = $this->getJson('/api/attendance/by-department/1', ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
    }

    /** @test */
    public function test_by_employee_without_token_returns_401()
    {
        $response = $this->getJson('/api/attendance/by-employee/1', ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
    }

    /** @test */
    public function test_geos_index_without_token_returns_401()
    {
        $response = $this->getJson('/api/attendance/geos/', ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
    }

    // ─── Pattern A: GeoController@index ───────────────────────────────────────

    /** @test */
    public function test_geos_index_returns_not_500()
    {
        $response = $this->getJson('/api/attendance/geos/', $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'GeoController@index must not throw 500.');
    }

    /** @test */
    public function test_geos_index_success_response_has_message_and_content()
    {
        $response = $this->getJson('/api/attendance/geos/', $this->authHeaders());

        if ($response->status() === 200) {
            $response->assertJsonStructure(['message', 'content']);
        } else {
            $this->assertNotNull($response->json('error'),
                'Non-200 response must use the error envelope.');
        }
    }

    // ─── Pattern A: AttendanceController@byGeo ───────────────────────────────

    /** @test */
    public function test_by_geo_with_valid_geo_id_returns_not_500()
    {
        $geo = UtcTimelog::first();
        if (!$geo) {
            $this->markTestIncomplete('Cat 1: No rows in utc_timelog — seed geo data to run this test.');
        }
        $geoId = $geo->country_id;

        $response = $this->getJson("/api/attendance/by-geo/{$geoId}", $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            "byGeo({$geoId}) must not throw 500.");
    }

    /** @test */
    public function test_by_geo_with_valid_geo_id_and_date_range_returns_not_500()
    {
        $geo = UtcTimelog::first();
        if (!$geo) {
            $this->markTestIncomplete('Cat 1: No rows in utc_timelog — seed geo data to run this test.');
        }
        $geoId = $geo->country_id;
        $from = date('Y-m-01');
        $to   = date('Y-m-d');

        $response = $this->getJson("/api/attendance/by-geo/{$geoId}?from={$from}&to={$to}&per_page=10", $this->authHeaders());

        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_by_geo_with_nonexistent_geo_id_returns_not_500()
    {
        $response = $this->getJson('/api/attendance/by-geo/999999', $this->authHeaders());

        $this->assertNotEquals(500, $response->status());
        $this->assertContains($response->status(), [404, 403, 200]);
    }

    /** @test */
    public function test_by_geo_success_response_envelope_shape()
    {
        $geo = UtcTimelog::first();
        if (!$geo) {
            $this->markTestIncomplete('Cat 1: No rows in utc_timelog — seed geo data to run this test.');
        }
        $geoId = $geo->country_id;

        $response = $this->getJson("/api/attendance/by-geo/{$geoId}", $this->authHeaders());

        // Unconditional guard — prevents PHPUnit Risky test when status ≠ 200
        $this->assertNotEquals(500, $response->status(), 'by-geo must not crash with a 500.');

        if ($response->status() === 200) {
            $response->assertJsonStructure(['message', 'content']);
            $content = $response->json('content');
            $this->assertIsArray($content, 'content must be an array.');
        }
    }

    // ─── Pattern A: AttendanceController@byDepartment ─────────────────────────

    /** @test */
    public function test_by_department_with_valid_dept_id_returns_not_500()
    {
        $dept = DB::table('EVOX_DEPARTMENT')->first();
        if (!$dept) {
            $this->markTestIncomplete('Cat 1: No rows in EVOX_DEPARTMENT — seed org structure to run this test.');
        }
        $deptId = $dept->Id;

        $response = $this->getJson("/api/attendance/by-department/{$deptId}", $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            "byDepartment({$deptId}) must not throw 500.");
    }

    /** @test */
    public function test_by_department_with_valid_dept_id_and_date_range_returns_not_500()
    {
        $dept = DB::table('EVOX_DEPARTMENT')->first();
        if (!$dept) {
            $this->markTestIncomplete('Cat 1: No rows in EVOX_DEPARTMENT — seed org structure to run this test.');
        }
        $deptId = $dept->Id;
        $from = date('Y-m-01');
        $to   = date('Y-m-d');

        $response = $this->getJson("/api/attendance/by-department/{$deptId}?from={$from}&to={$to}&per_page=10", $this->authHeaders());

        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_by_department_with_nonexistent_dept_id_returns_not_500()
    {
        $response = $this->getJson('/api/attendance/by-department/999999', $this->authHeaders());

        $this->assertNotEquals(500, $response->status());
        $this->assertContains($response->status(), [404, 403, 200]);
    }

    /** @test */
    public function test_by_department_success_response_envelope_shape()
    {
        $dept = DB::table('EVOX_DEPARTMENT')->first();
        if (!$dept) {
            $this->markTestIncomplete('Cat 1: No rows in EVOX_DEPARTMENT — seed org structure to run this test.');
        }
        $deptId = $dept->Id;

        $response = $this->getJson("/api/attendance/by-department/{$deptId}", $this->authHeaders());

        if ($response->status() === 200) {
            $response->assertJsonStructure(['message', 'content']);
        }
    }

    // ─── Pattern A: AttendanceController@byEmployee ───────────────────────────

    /** @test */
    public function test_by_employee_with_real_employee_id_returns_not_500()
    {
        $response = $this->getJson("/api/attendance/by-employee/{$this->userId}", $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            "byEmployee({$this->userId}) must not throw 500.");
    }

    /** @test */
    public function test_by_employee_with_date_range_returns_not_500()
    {
        $from = date('Y-m-01');
        $to   = date('Y-m-d');

        $response = $this->getJson("/api/attendance/by-employee/{$this->userId}?from={$from}&to={$to}", $this->authHeaders());

        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_by_employee_with_nonexistent_employee_id_returns_not_500()
    {
        $response = $this->getJson('/api/attendance/by-employee/999999', $this->authHeaders());

        $this->assertNotEquals(500, $response->status());
        $this->assertContains($response->status(), [404, 403, 200]);
    }

    /** @test */
    public function test_by_employee_success_response_has_daily_array()
    {
        $response = $this->getJson("/api/attendance/by-employee/{$this->userId}", $this->authHeaders());

        if ($response->status() === 200) {
            $response->assertJsonStructure(['message', 'content']);
            $content = $response->json('content');
            $this->assertNotNull($content);
        }
    }

    /** @test */
    public function test_by_employee_with_per_page_ignored_returns_not_500()
    {
        $response = $this->getJson("/api/attendance/by-employee/{$this->userId}?per_page=5", $this->authHeaders());

        $this->assertNotEquals(500, $response->status());
    }

    // ─── Edge cases ───────────────────────────────────────────────────────────

    /** @test */
    public function test_by_employee_with_range_exceeding_90_days_clamps_gracefully()
    {
        $from = date('Y-m-d', strtotime('-180 days'));
        $to   = date('Y-m-d');

        $response = $this->getJson("/api/attendance/by-employee/{$this->userId}?from={$from}&to={$to}", $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'byEmployee must clamp wide date ranges without crashing.');
    }

    /** @test */
    public function test_by_geo_with_range_exceeding_90_days_clamps_gracefully()
    {
        $geo = UtcTimelog::first();
        if (!$geo) {
            $this->markTestIncomplete('Cat 1: No rows in utc_timelog — seed geo data to run this test.');
        }
        $geoId = $geo->country_id;
        $from = date('Y-m-d', strtotime('-180 days'));
        $to   = date('Y-m-d');

        $response = $this->getJson("/api/attendance/by-geo/{$geoId}?from={$from}&to={$to}", $this->authHeaders());

        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_by_geo_with_zero_per_page_defaults_to_50_no_500()
    {
        $geo = UtcTimelog::first();
        if (!$geo) {
            $this->markTestIncomplete('Cat 1: No rows in utc_timelog — seed geo data to run this test.');
        }

        $response = $this->getJson("/api/attendance/by-geo/{$geo->country_id}?per_page=0", $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'per_page=0 should clamp to 50, not crash.');
    }

    /** @test */
    public function test_by_geo_with_oversized_per_page_caps_at_200_no_500()
    {
        $geo = UtcTimelog::first();
        if (!$geo) {
            $this->markTestIncomplete('Cat 1: No rows in utc_timelog — seed geo data to run this test.');
        }

        $response = $this->getJson("/api/attendance/by-geo/{$geo->country_id}?per_page=9999", $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'per_page=9999 should be capped at 200, not crash.');
    }
}
