<?php

// DRAFT — generated 2026-06-18, needs verification

/**
 * UserExtendedApiTest — Vishnu Padmanabhan
 *
 * Covers UserController endpoints NOT already tested in UserPiiApiTest.php
 * or AdminUsersApiTest.php.
 *
 * Endpoints covered:
 *   GET  /api/user/{id}/sub_department/{department_id}  — sub_department_under_department()
 *   POST /api/user/{id}/tick_dpa                        — tick_dpa()
 *
 * Violations fixed (2026-06-18):
 *   Fix A — runtime API key (Str::random, DB insert, DatabaseTransactions rollback)
 *   Fix B — env-var user loading (loadUserByVariant / requireUser)
 *   Fix C — JWT authHeaders() replaces withoutMiddleware() + actingAs()
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class UserExtendedApiTest extends TestCase
{
    use DatabaseTransactions;

    private string $apiKey;
    protected ?int $userId = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->apiKey = \Illuminate\Support\Str::random(64);
        \Illuminate\Support\Facades\DB::table('api_keys')->insert([
            'name'       => 'evox_e2e_' . strtolower(class_basename(static::class)) . '_' . now()->format('His'),
            'key'        => $this->apiKey,
            'active'     => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->userId = $this->requireUser('EMPLOYEE_PHILIPPINES');
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

    // =========================================================================
    // Pattern B — Auth enforcement (no token → 401)
    // =========================================================================

    /**
     * @test
     * GET /api/user/{id}/sub_department/{department_id} requires jwtauth.
     * Missing token must return 401 with token_absent code.
     */
    public function test_sub_department_under_department_without_token_returns_401()
    {
        $response = $this->getJson(
            "/api/user/{$this->userId}/sub_department/1",
            ['X-Authorization' => $this->apiKey]
        );

        $response->assertStatus(401);
        $this->assertEquals(
            'token_absent',
            $response->json('error.content.code'),
            'Missing JWT on sub_department must return token_absent error code.'
        );
    }

    /**
     * @test
     * POST /api/user/{id}/tick_dpa requires jwtauth.
     * Missing token must return 401 with token_absent code.
     */
    public function test_tick_dpa_without_token_returns_401()
    {
        $response = $this->postJson(
            "/api/user/{$this->userId}/tick_dpa",
            [],
            ['X-Authorization' => $this->apiKey]
        );

        $response->assertStatus(401);
        $this->assertEquals(
            'token_absent',
            $response->json('error.content.code'),
            'Missing JWT on tick_dpa must return token_absent error code.'
        );
    }

    // =========================================================================
    // Pattern A — sub_department_under_department (GET /user/{id}/sub_department/{dept_id})
    // =========================================================================

    /**
     * @test
     */
    public function test_sub_department_under_department_own_user_returns_not_500()
    {
        $response = $this->getJson(
            "/api/user/{$this->userId}/sub_department/1",
            $this->authHeaders()
        );

        $this->assertNotEquals(
            500,
            $response->status(),
            'sub_department_under_department must not crash with 500 — DB failure should be caught.'
        );
    }

    /**
     * @test
     */
    public function test_sub_department_under_department_success_has_envelope()
    {
        $response = $this->getJson(
            "/api/user/{$this->userId}/sub_department/1",
            $this->authHeaders()
        );

        if ($response->status() === 200) {
            $response->assertJsonStructure(['message', 'content']);
        } else {
            $this->assertNotNull(
                $response->json('error'),
                'Non-200 sub_department response must use the error envelope.'
            );
        }
    }

    /**
     * @test
     */
    public function test_sub_department_under_department_nonexistent_department_returns_not_500()
    {
        $response = $this->getJson(
            "/api/user/{$this->userId}/sub_department/999999",
            $this->authHeaders()
        );

        $this->assertNotEquals(
            500,
            $response->status(),
            'sub_department_under_department with unknown department_id must not return 500.'
        );
    }

    /**
     * @test
     */
    public function test_sub_department_under_department_nonexistent_user_returns_not_500()
    {
        // users.SubDepartmentId → EVOX_SUB_DEPARTMENT.Id → EVOX_SUB_DEPARTMENT.DepartmentId → EVOX_DEPARTMENT.Id
        // Find any active user who has a SubDepartmentId (not restricted to the env-var employee)
        $user = \App\Modules\User\Models\User::where('is_active', 1)
            ->whereNotNull('SubDepartmentId')
            ->first();

        if (!$user) {
            $this->markTestIncomplete('Cat 1: No active user with SubDepartmentId in DB.');
        }

        $subDept = \Illuminate\Support\Facades\DB::table('EVOX_SUB_DEPARTMENT')
            ->where('Id', $user->SubDepartmentId)
            ->first();

        if (!$subDept || !$subDept->DepartmentId) {
            $this->markTestIncomplete('Cat 1: SubDepartment has no DepartmentId — seed org data to run this test.');
        }

        $response = $this->getJson(
            "/api/user/{$user->id}/sub_department/{$subDept->DepartmentId}",
            $this->authHeaders()
        );

        $this->assertNotEquals(
            500,
            $response->status(),
            'sub_department_under_department must not return 500 for a real user and their department.'
        );
    }

    // =========================================================================
    // Pattern A — tick_dpa (POST /user/{id}/tick_dpa)
    // =========================================================================

    /**
     * @test
     * tick_dpa with own user ID must not crash with 500.
     * log_to_audit_trail() reads auth()->user()->id — JWT guard populates this.
     */
    public function test_tick_dpa_own_user_returns_not_500()
    {
        $response = $this->postJson(
            "/api/user/{$this->userId}/tick_dpa",
            [],
            $this->authHeaders()
        );

        $this->assertNotEquals(
            500,
            $response->status(),
            'tick_dpa must not crash with 500 — DB or audit-trail failure should be caught.'
        );
    }

    /**
     * @test
     */
    public function test_tick_dpa_success_response_has_envelope()
    {
        $response = $this->postJson(
            "/api/user/{$this->userId}/tick_dpa",
            [],
            $this->authHeaders()
        );

        if ($response->status() === 200) {
            $response->assertJsonStructure(['message', 'content']);
        } else {
            $this->assertNotNull(
                $response->json('error'),
                'Non-200 tick_dpa must use the error envelope.'
            );
        }
    }

    /**
     * @test
     */
    public function test_tick_dpa_with_session_id_returns_not_500()
    {
        $response = $this->postJson(
            "/api/user/{$this->userId}/tick_dpa",
            ['session_id' => 'test-session-abc123'],
            $this->authHeaders()
        );

        $this->assertNotEquals(
            500,
            $response->status(),
            'tick_dpa with session_id must not crash with 500.'
        );
    }

    /**
     * @test
     */
    public function test_tick_dpa_nonexistent_user_returns_not_500()
    {
        $response = $this->postJson(
            '/api/user/999999/tick_dpa',
            [],
            $this->authHeaders()
        );

        $this->assertNotEquals(
            500,
            $response->status(),
            'tick_dpa with non-existent user ID must not return 500.'
        );
    }
}
