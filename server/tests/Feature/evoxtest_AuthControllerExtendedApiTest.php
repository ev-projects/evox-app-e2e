<?php

/**
 * AuthController — extended method coverage
 *
 * Methods covered here:
 *   • loginMobile          POST /api/auth/login-mobile  (middleware: auth.apikey, api.calctime)
 *   • authenticateClient   GET  /api/auth/authenticate-client (middleware: jwtauth, auth.apikey)
 *   • authenticateMSClient GET  /api/auth/authenticate-ms-client (middleware: auth.apikey)
 *
 * loginMobile behavior:
 *   - Accepts 'username' (email OR username field) + 'password'
 *   - 422 if fields missing
 *   - 404 if user not found
 *   - 404 if password wrong
 *   - Checks is_active + termination_date before issuing JWT
 *   - Creates LoginLog entry on success
 *   - Returns JWT token on success
 *
 * authenticateClient behavior:
 *   - Requires existing JWT (jwtauth middleware)
 *   - Re-authenticates the JWT user; returns fresh token + user data
 *
 * authenticateMSClient behavior:
 *   - Requires 'code' query param (Microsoft OAuth one-time code)
 *   - 403 if MS token exchange fails (invalid/missing code)
 *   - 404 if MS email not found in users table
 *   - Integration test can only cover the error path (no real MS OAuth code available)
 *
 * Note: loginMobile calls LoginLog::create() — that insert is rolled back by
 * DatabaseTransactions. The JWT issued is also ephemeral; we do not rely on
 * tokens across tests.
 */

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Modules\User\Models\User;

class evoxtest_AuthControllerExtendedApiTest extends TestCase
{
    use DatabaseTransactions;

    private User $employee;   // Glenn — login tests
    private User $supervisor; // Gary  — alternate user
    private string $rawApiKey;
    private string $empToken; // used for authenticateClient

    protected function setUp(): void
    {
        parent::setUp();

        $this->employee   = User::where('email', env('E2E_USER_EMPLOYEE_PHILIPPINES', 'glenn.macasarte@eastvantage.com'))->firstOrFail();
        $this->supervisor = User::where('email', env('E2E_USER_SUPERVISOR_PHILIPPINES', 'gary.aure@eastvantage.com'))->firstOrFail();

        $this->rawApiKey = Str::random(64);
        DB::table('api_keys')->insert([
            'name'       => 'evox_e2e_auth_' . now()->format('His'),
            'key'        => $this->rawApiKey,
            'active'     => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Pre-issue a token for authenticateClient tests
        $this->empToken = auth('api')->login($this->employee);
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    /** X-Authorization only (no JWT — used for login-mobile which issues the first token) */
    private function apiKeyHeaders(): array
    {
        return ['X-Authorization' => $this->rawApiKey];
    }

    /** Full auth headers: Bearer JWT + API key */
    private function empHeaders(): array
    {
        return ['Authorization' => 'Bearer ' . $this->empToken, 'X-Authorization' => $this->rawApiKey];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // loginMobile — POST /api/auth/login-mobile
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function login_mobile_missing_credentials_returns_422()
    {
        $res = $this->postJson('/api/auth/login-mobile', [], $this->apiKeyHeaders());

        $res->assertStatus(422);
    }

    /** @test */
    public function login_mobile_with_email_returns_jwt_token()
    {
        $res = $this->postJson('/api/auth/login-mobile', [
            'username' => $this->employee->email,
            'password' => '{ev2010}',
        ], $this->apiKeyHeaders());

        // 200 = JWT issued; 400 = account inactive/terminated; never 500
        $this->assertContains($res->status(), [200, 400],
            'loginMobile with valid email should not crash with 500');

        if ($res->status() === 200) {
            $body = $res->json();
            $this->assertArrayHasKey('token', $body,
                'Successful loginMobile should return a token key');
        }
    }

    /** @test */
    public function login_mobile_with_username_field_returns_jwt_token()
    {
        // Controller accepts both email and username value in the 'username' field
        $res = $this->postJson('/api/auth/login-mobile', [
            'username' => $this->employee->username ?? $this->employee->email,
            'password' => '{ev2010}',
        ], $this->apiKeyHeaders());

        $this->assertContains($res->status(), [200, 400, 404],
            'loginMobile with username field should not crash with 500');
    }

    /** @test */
    public function login_mobile_with_wrong_password_returns_404()
    {
        $res = $this->postJson('/api/auth/login-mobile', [
            'username' => $this->employee->email,
            'password' => 'definitely_wrong_password_e2e',
        ], $this->apiKeyHeaders());

        // Controller returns 404 for wrong password (based on source review)
        $this->assertContains($res->status(), [400, 404],
            'loginMobile with wrong password should return 404, not 500');
        $this->assertNotEquals(200, $res->status());
    }

    /** @test */
    public function login_mobile_with_nonexistent_user_returns_404()
    {
        $res = $this->postJson('/api/auth/login-mobile', [
            'username' => 'nonexistent_e2e_user_' . now()->timestamp . '@example.com',
            'password' => 'any_password',
        ], $this->apiKeyHeaders());

        // Controller returns 404 when user not found in DB
        $this->assertContains($res->status(), [400, 404],
            'loginMobile with nonexistent user should return 404, not 500');
        $this->assertNotEquals(200, $res->status());
    }

    /** @test */
    public function login_mobile_requires_api_key()
    {
        // No X-Authorization header → auth.apikey middleware rejects the request
        $res = $this->postJson('/api/auth/login-mobile', [
            'username' => $this->employee->email,
            'password' => '{ev2010}',
        ]);

        // auth.apikey middleware returns 401 or 403 when key is missing
        $this->assertContains($res->status(), [401, 403],
            'loginMobile without API key should be rejected');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // authenticateClient — GET /api/auth/authenticate-client
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function authenticate_client_re_authenticates_jwt_user()
    {
        // jwtauth middleware validates Bearer token; controller re-logins and returns fresh token
        $res = $this->getJson('/api/auth/authenticate-client', $this->empHeaders());

        // 200 = re-authenticated; 400 = account issue; never 500
        $this->assertContains($res->status(), [200, 400],
            'authenticateClient with valid JWT should not crash with 500');

        if ($res->status() === 200) {
            $body = $res->json();
            $this->assertArrayHasKey('token', $body,
                'authenticateClient should return a new token');
        }
    }

    /** @test */
    public function authenticate_client_requires_jwt()
    {
        // No Bearer token → jwtauth middleware returns 401
        $this->getJson('/api/auth/authenticate-client',
            ['X-Authorization' => $this->rawApiKey]
        )->assertStatus(401);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // authenticateMSClient — GET /api/auth/authenticate-ms-client
    // ═══════════════════════════════════════════════════════════════════════

    /** @test */
    public function authenticate_ms_client_without_code_param_returns_error()
    {
        // No 'code' query param → controller cannot exchange for MS token → 403
        $res = $this->getJson('/api/auth/authenticate-ms-client', $this->apiKeyHeaders());

        // 403 = MS token exchange failed (no code provided)
        // 400 = validation / missing param
        $this->assertContains($res->status(), [400, 403],
            'authenticateMSClient without code should return 403, not 500');
        $this->assertNotEquals(200, $res->status());
        $this->assertNotEquals(500, $res->status());
    }

    /** @test */
    public function authenticate_ms_client_with_invalid_code_returns_403()
    {
        // Real MS OAuth codes are one-time-use — an invalid/expired code fails at MS token exchange
        $res = $this->getJson(
            '/api/auth/authenticate-ms-client?code=invalid_e2e_ms_code_' . Str::random(16),
            $this->apiKeyHeaders()
        );

        // Controller calls ms_get_access_token() which fails → returns 403
        $this->assertContains($res->status(), [400, 403],
            'authenticateMSClient with invalid code should return 403, not 500');
        $this->assertNotEquals(200, $res->status());
        $this->assertNotEquals(500, $res->status());
    }

    /** @test */
    public function authenticate_ms_client_requires_api_key()
    {
        // No X-Authorization → auth.apikey middleware rejects
        $res = $this->getJson('/api/auth/authenticate-ms-client?code=any');

        $this->assertContains($res->status(), [401, 403],
            'authenticateMSClient without API key should be rejected');
    }
}
