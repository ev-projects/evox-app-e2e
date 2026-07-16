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
 * Endpoints intentionally EXCLUDED (already covered):
 *   GET  /api/user/{id}/personal_information  — UserPiiApiTest
 *   GET  /api/user/{id}/job_information       — UserPiiApiTest
 *   GET  /api/user/{id}/time_off              — UserPiiApiTest
 *   GET  /api/user/{id}/leave_credits         — UserPiiApiTest
 *   POST /api/user/{id}/change_password       — UserPiiApiTest
 *
 * Route middleware (both endpoints): jwtauth, auth.apikey
 *
 * Test patterns:
 *   Pattern B — Auth enforcement: no withoutMiddleware(), no Bearer token → 401
 *   Pattern A — Controller logic: withoutMiddleware() + actingAs() → not 500
 *
 * Implementation notes:
 *   sub_department_under_department() — does User::find($id) then calls
 *     $user->evox_sub_departments_handled($department_id). DB-only, will fail
 *     gracefully (unknown department returns empty array, not 500).
 *
 *   tick_dpa() — no FormRequest, calls $this->user->tick_dpa($id) repository
 *     method and log_to_audit_trail(). log_to_audit_trail() reads auth()->user()->id
 *     so the test MUST use actingAs() to populate the auth guard even with
 *     withoutMiddleware().
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class UserExtendedApiTest extends TestCase
{
    use DatabaseTransactions;

    /** API-key header required by auth.apikey middleware */
    private array $apiKey;

    /** An active, email-bearing user used for all requests */
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
            "/api/user/{$this->user->id}/sub_department/1",
            $this->apiKey
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
            "/api/user/{$this->user->id}/tick_dpa",
            [],
            $this->apiKey
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
     * sub_department_under_department with own user ID and department 1.
     * The method calls $user->evox_sub_departments_handled($department_id) —
     * this is a DB call that returns an array (possibly empty). Must not 500.
     */
    public function test_sub_department_under_department_own_user_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson(
                "/api/user/{$this->user->id}/sub_department/1",
                $this->apiKey
            );

        $this->assertNotEquals(
            500,
            $response->status(),
            'sub_department_under_department must not crash with 500 — DB failure should be caught.'
        );
    }

    /**
     * @test
     * sub_department_under_department success envelope must have message + content keys.
     */
    public function test_sub_department_under_department_success_has_envelope()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson(
                "/api/user/{$this->user->id}/sub_department/1",
                $this->apiKey
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
     * sub_department_under_department with a non-existent department ID (999999).
     * User::find($id) succeeds; evox_sub_departments_handled returns empty array.
     * Must return 200 with empty content or graceful error — never 500.
     */
    public function test_sub_department_under_department_nonexistent_department_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson(
                "/api/user/{$this->user->id}/sub_department/999999",
                $this->apiKey
            );

        $this->assertNotEquals(
            500,
            $response->status(),
            'sub_department_under_department with unknown department_id must not return 500.'
        );
    }

    /**
     * @test
     * sub_department_under_department with a non-existent user ID (999999).
     * User::find(999999) returns null; the controller must catch the resulting
     * error and return a graceful error envelope rather than 500.
     */
    public function test_sub_department_under_department_nonexistent_user_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson(
                '/api/user/999999/sub_department/1',
                $this->apiKey
            );

        $this->assertNotEquals(
            500,
            $response->status(),
            'sub_department_under_department with null user must not return 500.'
        );
    }

    // =========================================================================
    // Pattern A — tick_dpa (POST /user/{id}/tick_dpa)
    // =========================================================================

    /**
     * @test
     * tick_dpa with own user ID must not crash with 500.
     * The repository method updates the dpa field in DB; log_to_audit_trail
     * reads auth()->user()->id — actingAs() ensures this is populated.
     */
    public function test_tick_dpa_own_user_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->postJson(
                "/api/user/{$this->user->id}/tick_dpa",
                [],
                $this->apiKey
            );

        $this->assertNotEquals(
            500,
            $response->status(),
            'tick_dpa must not crash with 500 — DB or audit-trail failure should be caught.'
        );
    }

    /**
     * @test
     * tick_dpa success response must use the standard success envelope.
     * The controller returns success_response() wrapping a UserProfileResource.
     */
    public function test_tick_dpa_success_response_has_envelope()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->postJson(
                "/api/user/{$this->user->id}/tick_dpa",
                [],
                $this->apiKey
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
     * tick_dpa with session_id in the payload must not crash.
     * The controller reads $request->session_id for audit trail logging.
     */
    public function test_tick_dpa_with_session_id_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->postJson(
                "/api/user/{$this->user->id}/tick_dpa",
                ['session_id' => 'test-session-abc123'],
                $this->apiKey
            );

        $this->assertNotEquals(
            500,
            $response->status(),
            'tick_dpa with session_id must not crash with 500.'
        );
    }

    /**
     * @test
     * tick_dpa with a non-existent user ID (999999) must return a graceful
     * error envelope — the repository should handle the missing record without
     * throwing a 500.
     */
    public function test_tick_dpa_nonexistent_user_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->postJson(
                '/api/user/999999/tick_dpa',
                [],
                $this->apiKey
            );

        $this->assertNotEquals(
            500,
            $response->status(),
            'tick_dpa with non-existent user ID must not return 500.'
        );
    }
}
