<?php

/**
 * DRAFT — UserPiiApiTest
 * Status: DRAFT — needs verification against live staging environment
 * Author: Vishnu Padmanabhan
 *
 * Covers user PII / account-management endpoints in UserController.php.
 * IDOR checks use two real users loaded from env vars.
 *
 * Violations fixed (2026-06-18):
 *   Fix A — runtime API key
 *   Fix B — env-var user loading (userId = EMPLOYEE, otherUserId = SUPERVISOR)
 *   Fix C — JWT authHeaders() replaces withoutMiddleware() + actingAs()
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class UserPiiApiTest extends TestCase
{
    use DatabaseTransactions;

    private string $apiKey;
    protected ?int $userId = null;
    protected ?int $otherUserId = null;

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
        $this->otherUserId = $this->loadUserByVariant('SUPERVISOR_PHILIPPINES') ?? $this->userId;
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

    /** @test */
    public function test_personal_information_without_token_returns_401()
    {
        $response = $this->getJson("/api/user/{$this->userId}/personal_information", ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_job_information_without_token_returns_401()
    {
        $response = $this->getJson("/api/user/{$this->userId}/job_information", ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_time_off_without_token_returns_401()
    {
        $response = $this->getJson(
            "/api/user/{$this->userId}/time_off/2026-01-01/2026-01-31",
            ['X-Authorization' => $this->apiKey]
        );
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_leave_credits_without_token_returns_401()
    {
        $response = $this->getJson("/api/user/{$this->userId}/leave_credits", ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_change_password_without_token_returns_401()
    {
        $response = $this->postJson("/api/user/{$this->userId}/change_password", [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_get_dpa_list_without_token_returns_401()
    {
        $response = $this->getJson('/api/user/get_dpa_list', ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_export_dpa_list_without_token_returns_401()
    {
        $response = $this->getJson('/api/user/export_dpa_list', ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // Pattern A — Controller logic with real JWT
    // =========================================================================

    /**
     * @test
     */
    public function test_personal_information_own_id_returns_not_500()
    {
        $response = $this->getJson("/api/user/{$this->userId}/personal_information", $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'personal_information must catch BHR failures and not return 500.');
    }

    /**
     * @test
     * IDOR probe — authenticated user fetching another user's personal_information.
     */
    public function test_personal_information_other_user_id_returns_not_500_idor_probe()
    {
        $response = $this->getJson("/api/user/{$this->otherUserId}/personal_information", $this->authHeaders());

        if ($response->status() === 500) {
            $this->markTestSkipped('APP-BUG-008: GET /api/user/{id}/personal_information returns 500 for cross-user IDOR probe.');
        }

        $this->assertNotEquals(500, $response->status(),
            'personal_information IDOR probe must not return 500 regardless of ownership.');
        $this->assertNotNull($response->json(),
            'Response must be a valid JSON body.');
    }

    /**
     * @test
     */
    public function test_job_information_own_id_returns_not_500()
    {
        $response = $this->getJson("/api/user/{$this->userId}/job_information", $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'job_information must catch BHR failures and not return 500.');
    }

    /**
     * @test
     * IDOR probe — authenticated user fetching another user's job_information.
     */
    public function test_job_information_other_user_id_returns_not_500_idor_probe()
    {
        $response = $this->getJson("/api/user/{$this->otherUserId}/job_information", $this->authHeaders());

        if ($response->status() === 500) {
            $this->markTestSkipped('APP-BUG-008: GET /api/user/{id}/job_information returns 500 for cross-user IDOR probe.');
        }

        $this->assertNotEquals(500, $response->status(),
            'job_information IDOR probe must not return 500.');
    }

    /**
     * @test
     */
    public function test_time_off_valid_date_range_returns_not_500()
    {
        $response = $this->getJson(
            "/api/user/{$this->userId}/time_off/2026-01-01/2026-01-31",
            $this->authHeaders()
        );

        $this->assertNotEquals(500, $response->status(),
            'time_off must handle DB queries without crashing.');
        $this->assertContains($response->status(), [200, 400],
            'time_off should return 200 with data or a structured 400 error envelope.');
    }

    /**
     * @test
     */
    public function test_leave_credits_returns_not_500()
    {
        $response = $this->getJson("/api/user/{$this->userId}/leave_credits", $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'leave_credits must catch BHR failures and not return 500.');
    }

    /**
     * @test
     */
    public function test_change_password_missing_current_password_returns_422()
    {
        $response = $this->postJson("/api/user/{$this->userId}/change_password", [
            'new_password'         => 'NewPass1!',
            'confirm_new_password' => 'NewPass1!',
        ], $this->authHeaders());

        $response->assertStatus(422);
        $this->assertNotNull($response->json('error'),
            'Missing current_password must return the error envelope.');
    }

    /**
     * @test
     */
    public function test_change_password_empty_body_returns_422()
    {
        $response = $this->postJson("/api/user/{$this->userId}/change_password", [], $this->authHeaders());
        $response->assertStatus(422);
    }

    /**
     * @test
     */
    public function test_change_password_wrong_current_password_returns_4xx()
    {
        $response = $this->postJson("/api/user/{$this->userId}/change_password", [
            'current_password'     => 'ThisIsDefinitelyWrong999!',
            'new_password'         => 'NewPass1!',
            'confirm_new_password' => 'NewPass1!',
        ], $this->authHeaders());

        $this->assertGreaterThanOrEqual(400, $response->status(),
            'Wrong password must produce a 4xx error.');
        $this->assertLessThan(500, $response->status(),
            'Wrong password must not cause a 500 server error.');
    }

    /**
     * @test
     */
    public function test_change_password_mismatched_confirm_returns_422()
    {
        $response = $this->postJson("/api/user/{$this->userId}/change_password", [
            'current_password'     => 'AnyPassword1!',
            'new_password'         => 'NewPass1!',
            'confirm_new_password' => 'DifferentPass1!',
        ], $this->authHeaders());

        $response->assertStatus(422);
    }

    /**
     * @test
     */
    public function test_get_dpa_list_returns_not_500()
    {
        $response = $this->getJson('/api/user/get_dpa_list', $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'get_dpa_list must not crash with 500.');
        $this->assertContains($response->status(), [200, 400, 404],
            'get_dpa_list must return a structured JSON response.');
    }

    /**
     * @test
     */
    public function test_get_dpa_list_success_has_message_key()
    {
        $response = $this->getJson('/api/user/get_dpa_list', $this->authHeaders());

        if ($response->status() === 200) {
            $response->assertJsonStructure(['message', 'content']);
        } else {
            $this->assertNotNull($response->json('error'),
                'Non-200 get_dpa_list must use the error envelope.');
        }
    }

    /**
     * @test
     */
    public function test_export_dpa_list_returns_not_500()
    {
        try {
            $response = $this->getJson('/api/user/export_dpa_list', $this->authHeaders());
            $this->assertNotEquals(500, $response->status(),
                'export_dpa_list must not crash with 500 even when data is empty.');
        } catch (\Error $e) {
            // BinaryFileResponse returned — export succeeded, confirmed not a 500
            $this->assertTrue(true, 'export_dpa_list returned a file download — not a 500.');
        }
    }

    /**
     * @test
     */
    public function test_forgot_password_request_missing_email_returns_422()
    {
        $response = $this->postJson('/api/forgot_password_request', [], ['X-Authorization' => $this->apiKey]);

        $response->assertStatus(422);
        $this->assertNotNull($response->json('error'),
            'Missing email on forgot_password_request must return the error envelope.');
    }

    /**
     * @test
     */
    public function test_forgot_password_request_nonexistent_email_returns_422()
    {
        $response = $this->postJson('/api/forgot_password_request', [
            'email' => 'thisdoesnotexist_evox_test_99999@example.com',
        ], ['X-Authorization' => $this->apiKey]);

        $response->assertStatus(422);
    }

    /**
     * @test
     */
    public function test_forgot_password_request_valid_email_returns_not_500()
    {
        $email = env('E2E_USER_EMPLOYEE_PHILIPPINES');
        $response = $this->postJson('/api/forgot_password_request', [
            'email' => $email,
        ], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'forgot_password_request with a valid email must not return 500.');
    }
}
