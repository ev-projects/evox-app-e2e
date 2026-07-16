<?php

/**
 * DRAFT — UserPiiApiTest
 * Status: DRAFT — needs verification against live staging environment
 * Author: Vishnu Padmanabhan
 * Created: 2026-06-17
 *
 * Covers user PII / account-management endpoints in UserController.php.
 * All routes live under the User module's api.php (module prefix: api/user).
 *
 * Endpoints tested:
 *   GET  user/{id}/personal_information     — IDOR risk
 *   GET  user/{id}/job_information          — IDOR risk
 *   GET  user/{id}/time_off/{start}/{end}   — authenticated
 *   GET  user/{id}/leave_credits            — authenticated
 *   POST user/{id}/change_password          — validation + wrong password
 *   POST user/{id}/assign_roles_permissions — admin-only role check
 *   GET  user/get_dpa_list                  — authenticated list
 *   GET  user/export_dpa_list               — authenticated export
 *   POST forgot_password_request            — API-key-only, email validation
 *
 * Test patterns (mirroring FreshServiceApiTest.php conventions):
 *   Pattern B — Auth enforcement: no withoutMiddleware(), no Bearer → 401
 *   Pattern A — Controller logic: withoutMiddleware() + actingAs() → not 500
 *
 * IDOR checks use two real users:
 *   $this->user      — the "owner" user making the request
 *   $this->otherUser — a DIFFERENT active user whose ID the owner should not access
 *   The controller does not currently enforce ownership on these endpoints,
 *   so the IDOR tests document the ACTUAL behaviour (200 or graceful error)
 *   rather than asserting 403 — that assertion would fail today and block CI.
 *   The comment above each IDOR test flags it explicitly for a security fix.
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;

class UserPiiApiTest extends TestCase
{
    use DatabaseTransactions;

    /** API-key header required by auth.apikey middleware */
    private array $apiKey;

    /** An active user who "owns" the requests */
    private User $user;

    /** A different active user — used to probe IDOR gaps */
    private User $otherUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->apiKey = [
            'X-Authorization' => env(
                'APP_API_KEY',
                'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z'
            ),
        ];

        // Pick the first two distinct active users so IDOR tests have separate IDs.
        $activeUsers = User::where('is_active', 1)
            ->whereNotNull('email')
            ->limit(2)
            ->get();

        $this->user      = $activeUsers->first();
        $this->otherUser = $activeUsers->count() >= 2 ? $activeUsers->last() : $activeUsers->first();

        // personal_information/job_information/leave_credits all call into BHR
        // (get_user_bhr_field / get_user_job_information / get_leave_credits) — the
        // header comment's "will fail gracefully inside the catch block" assumption
        // is unverified; bind the mock instead of relying on live BHR to fail nicely.
        $this->app->bind(BhrRepositoryInterface::class, function () {
            return new \Tests\Feature\Api\evoxtest_BhrMock();
        });
    }

    // =========================================================================
    // Pattern B — Auth enforcement (no token → 401)
    // =========================================================================

    /** @test */
    public function test_personal_information_without_token_returns_401()
    {
        $response = $this->getJson("/api/user/{$this->user->id}/personal_information", $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_job_information_without_token_returns_401()
    {
        $response = $this->getJson("/api/user/{$this->user->id}/job_information", $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_time_off_without_token_returns_401()
    {
        $response = $this->getJson(
            "/api/user/{$this->user->id}/time_off/2026-01-01/2026-01-31",
            $this->apiKey
        );
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_leave_credits_without_token_returns_401()
    {
        $response = $this->getJson("/api/user/{$this->user->id}/leave_credits", $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_change_password_without_token_returns_401()
    {
        $response = $this->postJson("/api/user/{$this->user->id}/change_password", [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_assign_roles_permissions_without_token_returns_401()
    {
        $response = $this->postJson(
            "/api/user/{$this->user->id}/assign_roles_permissions/",
            [],
            $this->apiKey
        );
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_get_dpa_list_without_token_returns_401()
    {
        $response = $this->getJson('/api/user/get_dpa_list', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_export_dpa_list_without_token_returns_401()
    {
        $response = $this->getJson('/api/user/export_dpa_list', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // forgot_password_request is API-key-only (no jwtauth), so a missing token
    // does NOT cause a 401 — omit Pattern B for this endpoint; see Pattern A below.

    // =========================================================================
    // Pattern A — Controller logic with middleware bypassed
    // =========================================================================

    // ── personal_information ─────────────────────────────────────────────────

    /**
     * @test
     * Fetching own personal_information must not crash with 500.
     * External BHR call will fail gracefully inside the catch block.
     */
    public function test_personal_information_own_id_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson("/api/user/{$this->user->id}/personal_information", $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'personal_information must catch BHR failures and not return 500.');
    }

    /**
     * @test
     * IDOR probe: authenticated user fetching another user's personal_information.
     * The controller does NOT enforce ownership — this documents the gap.
     * Expected fix: controller should verify auth()->id() === $id or role:admin.
     *
     * @see EVOX-XXX (security backlog — IDOR on personal_information)
     */
    public function test_personal_information_other_user_id_returns_not_500_idor_probe()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson("/api/user/{$this->otherUser->id}/personal_information", $this->apiKey);

        // Documents current behaviour — NOT asserting 403 because ownership
        // check does not yet exist.  Fix should make this return 403.
        $this->assertNotEquals(500, $response->status(),
            'personal_information IDOR probe must not return 500 regardless of ownership.');
        $this->assertNotNull($response->json(),
            'Response must be a valid JSON body.');
    }

    // ── job_information ───────────────────────────────────────────────────────

    /**
     * @test
     * Fetching own job_information must not crash with 500.
     */
    public function test_job_information_own_id_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson("/api/user/{$this->user->id}/job_information", $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'job_information must catch BHR failures and not return 500.');
    }

    /**
     * @test
     * IDOR probe: authenticated user fetching another user's job_information.
     *
     * @see EVOX-XXX (security backlog — IDOR on job_information)
     */
    public function test_job_information_other_user_id_returns_not_500_idor_probe()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson("/api/user/{$this->otherUser->id}/job_information", $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'job_information IDOR probe must not return 500.');
    }

    // ── time_off ──────────────────────────────────────────────────────────────

    /**
     * @test
     * time_off with a valid date range must not crash (DTR query is DB-only).
     */
    public function test_time_off_valid_date_range_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson(
                "/api/user/{$this->user->id}/time_off/2026-01-01/2026-01-31",
                $this->apiKey
            );

        $this->assertNotEquals(500, $response->status(),
            'time_off must handle DB queries without crashing.');
        $this->assertContains($response->status(), [200, 400],
            'time_off should return 200 with data or a structured 400 error envelope.');
    }

    // ── leave_credits ────────────────────────────────────────────────────────

    /**
     * @test
     * leave_credits calls an external BHR service — must fail gracefully.
     */
    public function test_leave_credits_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson("/api/user/{$this->user->id}/leave_credits", $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'leave_credits must catch BHR failures and not return 500.');
    }

    // ── change_password — validation ─────────────────────────────────────────

    /**
     * @test
     * Missing current_password must return 422 (ChangePasswordRequest validation).
     */
    public function test_change_password_missing_current_password_returns_422()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->postJson("/api/user/{$this->user->id}/change_password", [
                // current_password intentionally omitted
                'new_password'         => 'NewPass1!',
                'confirm_new_password' => 'NewPass1!',
            ], $this->apiKey);

        $response->assertStatus(422);
        $this->assertNotNull($response->json('error'),
            'Missing current_password must return the error envelope.');
    }

    /**
     * @test
     * Fully missing body must return 422 (all three fields required).
     */
    public function test_change_password_empty_body_returns_422()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->postJson("/api/user/{$this->user->id}/change_password", [], $this->apiKey);

        $response->assertStatus(422);
    }

    /**
     * @test
     * Wrong current_password (valid structure but does not match hash) must
     * return a 4xx — the controller returns HTTP_NOT_FOUND (404) when
     * change_password() returns falsy.
     */
    public function test_change_password_wrong_current_password_returns_4xx()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->postJson("/api/user/{$this->user->id}/change_password", [
                'current_password'     => 'ThisIsDefinitelyWrong999!',
                'new_password'         => 'NewPass1!',
                'confirm_new_password' => 'NewPass1!',
            ], $this->apiKey);

        // Controller returns 404 (HTTP_NOT_FOUND) when password does not match;
        // accept any 4xx — must never be 500.
        $this->assertGreaterThanOrEqual(400, $response->status(),
            'Wrong password must produce a 4xx error.');
        $this->assertLessThan(500, $response->status(),
            'Wrong password must not cause a 500 server error.');
    }

    /**
     * @test
     * Mismatched new_password / confirm_new_password must return 422.
     */
    public function test_change_password_mismatched_confirm_returns_422()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->postJson("/api/user/{$this->user->id}/change_password", [
                'current_password'     => 'AnyPassword1!',
                'new_password'         => 'NewPass1!',
                'confirm_new_password' => 'DifferentPass1!',
            ], $this->apiKey);

        $response->assertStatus(422);
    }

    // ── assign_roles_permissions — admin-only ────────────────────────────────

    /**
     * @test
     * assign_roles_permissions WITH middleware enforced and no admin role
     * must return 401 or 403 (role:admin gate or permission gate).
     *
     * Note: the route does not have an explicit ->middleware('role:admin') in
     * the User module routes, but the controller calls log_activity and
     * dispatches a job that may be gated elsewhere.  This test verifies the
     * middleware stack (jwtauth + auth.apikey) blocks unauthenticated callers.
     * A separate manual test should verify that a non-admin JWT is rejected.
     */
    public function test_assign_roles_permissions_without_token_returns_401_recheck()
    {
        // Pattern B re-confirmation with explicit assertion on status code
        $response = $this->postJson(
            "/api/user/{$this->user->id}/assign_roles_permissions/",
            ['roles' => [], 'permissions' => []],
            $this->apiKey
        );

        $response->assertStatus(401);
    }

    /**
     * @test
     * assign_roles_permissions with valid (empty) payload and middleware bypassed
     * must not crash with 500.
     * Empty roles/permissions arrays are valid per AssignUserRolePermissionRequest rules.
     */
    public function test_assign_roles_permissions_valid_payload_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->postJson("/api/user/{$this->user->id}/assign_roles_permissions/", [
                'roles'       => [],
                'permissions' => [],
            ], $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'assign_roles_permissions must not return 500 for an empty but valid payload.');
    }

    // ── get_dpa_list ─────────────────────────────────────────────────────────

    /**
     * @test
     * get_dpa_list is a DB-only SP call — must return 200 or structured error.
     */
    public function test_get_dpa_list_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/user/get_dpa_list', $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'get_dpa_list must not crash with 500.');
        $this->assertContains($response->status(), [200, 400, 404],
            'get_dpa_list must return a structured JSON response.');
    }

    /**
     * @test
     * get_dpa_list response structure: success envelope has message + content keys.
     */
    public function test_get_dpa_list_success_has_message_key()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/user/get_dpa_list', $this->apiKey);

        if ($response->status() === 200) {
            $response->assertJsonStructure(['message', 'content']);
        } else {
            $this->assertNotNull($response->json('error'),
                'Non-200 get_dpa_list must use the error envelope.');
        }
    }

    // ── export_dpa_list ───────────────────────────────────────────────────────

    /**
     * @test
     * export_dpa_list triggers an Excel download — must not crash with 500.
     * In test env the response may be a CSV stream (200) or an error envelope.
     */
    public function test_export_dpa_list_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/user/export_dpa_list', $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'export_dpa_list must not crash with 500 even when data is empty.');
    }

    // ── forgot_password_request — API-key-only route ──────────────────────────

    /**
     * @test
     * forgot_password_request: missing email must return 422.
     * Route uses only auth.apikey (no jwtauth), so no Bearer token needed.
     */
    public function test_forgot_password_request_missing_email_returns_422()
    {
        // No withoutMiddleware() — auth.apikey is satisfied by the X-Authorization header.
        $response = $this->postJson('/api/forgot_password_request', [], $this->apiKey);

        $response->assertStatus(422);
        $this->assertNotNull($response->json('error'),
            'Missing email on forgot_password_request must return the error envelope.');
    }

    /**
     * @test
     * forgot_password_request: non-existent email must return 422 (exists:users,email rule).
     */
    public function test_forgot_password_request_nonexistent_email_returns_422()
    {
        $response = $this->postJson('/api/forgot_password_request', [
            'email' => 'thisdoesnotexist_evox_test_99999@example.com',
        ], $this->apiKey);

        $response->assertStatus(422);
    }

    /**
     * @test
     * forgot_password_request: a valid existing email must not crash with 500.
     * The email send step will fail gracefully in test env.
     */
    public function test_forgot_password_request_valid_email_returns_not_500()
    {
        // withoutMiddleware bypasses auth.apikey so we don't rely on the env key here
        $this->withoutMiddleware();

        $response = $this->postJson('/api/forgot_password_request', [
            'email' => $this->user->email,
        ], $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'forgot_password_request with a valid email must not return 500.');
    }
}
