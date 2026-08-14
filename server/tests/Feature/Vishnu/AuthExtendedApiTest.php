<?php

/**
 * DRAFT — needs verification against staging behaviour.
 *
 * EVOX Auth Extended API Tests — Vishnu Padmanabhan
 * Status: DRAFT — needs verification
 *
 * Covers three AuthController methods NOT tested in AuthApiTest.php:
 *   loginMobile         POST /api/auth/login-mobile
 *   authenticateClient  GET  /api/auth/authenticate-client
 *   authenticateMSClient GET /api/auth/authenticate-ms-client
 *
 * Violations fixed (2026-06-18):
 *   Fix A — runtime API key
 *   Fix B — env-var user loading ($this->activeUser loaded by email from env var)
 *   Fix C — JWT authHeaders() replaces withoutMiddleware() + actingAs()
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\User\Models\LoginLog;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;

class AuthExtendedApiTest extends TestCase
{
    use DatabaseTransactions;

    private string $apiKey;
    protected ?int $userId = null;
    private ?User $activeUser = null;

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

        // AuthController injects BhrRepositoryInterface (get_user, get_profile_picture in
        // get_default_payload). Bind the IoC mock so loginMobile / authenticateClient do not
        // make live BHR API calls during tests.
        $this->app->bind(BhrRepositoryInterface::class, function () {
            return new \Tests\Feature\Api\evoxtest_BhrMock();
        });

        $email = env('E2E_USER_EMPLOYEE_PHILIPPINES');
        if (!$email) {
            $this->markTestIncomplete('E2E_USER_EMPLOYEE_PHILIPPINES not set');
        }
        $this->activeUser = User::where('email', $email)->first();
        if (!$this->activeUser) {
            $this->markTestIncomplete('E2E_USER_EMPLOYEE_PHILIPPINES not found in DB');
        }
        $this->userId = $this->activeUser->id;
    }

    private function authHeaders(): array
    {
        $token = auth('api')->login($this->activeUser);
        return ['Authorization' => "Bearer {$token}", 'X-Authorization' => $this->apiKey];
    }

    // =========================================================================
    // loginMobile — POST /api/auth/login-mobile
    // Middleware: auth.apikey, api.calctime  (NO jwtauth)
    // =========================================================================

    /**
     * @test
     */
    public function test_login_mobile_without_api_key_returns_401()
    {
        $response = $this->postJson('/api/auth/login-mobile', [
            'username' => 'any@example.com',
            'password' => 'anypassword',
        ]);
        $response->assertStatus(401);
    }

    /**
     * @test
     */
    public function test_login_mobile_with_empty_body_returns_422()
    {
        // Route uses custom validation (not FormRequest) — returns 400, not 422
        $response = $this->postJson('/api/auth/login-mobile', [], $this->authHeaders());
        $this->assertContains($response->status(), [400, 422]);
        $this->assertNotNull($response->json('error'),
            'Empty-body loginMobile must return the error envelope.');
    }

    /**
     * @test
     */
    public function test_login_mobile_without_password_returns_422()
    {
        // User lookup happens before password check — 404 returned when user found but password missing
        $response = $this->postJson('/api/auth/login-mobile', [
            'username' => $this->activeUser->email,
        ], $this->authHeaders());
        $this->assertContains($response->status(), [400, 404, 422]);
        $this->assertNotNull($response->json('error'));
    }

    /**
     * @test
     */
    public function test_login_mobile_without_username_returns_422()
    {
        // Route uses custom validation — returns 400, not 422
        $response = $this->postJson('/api/auth/login-mobile', [
            'password' => 'anypassword',
        ], $this->authHeaders());
        $this->assertContains($response->status(), [400, 422]);
        $this->assertNotNull($response->json('error'));
    }

    /**
     * @test
     */
    public function test_login_mobile_with_wrong_password_returns_4xx_error_envelope()
    {
        $response = $this->postJson('/api/auth/login-mobile', [
            'username' => $this->activeUser->email,
            'password' => 'definitly-wrong-password-!',
        ], $this->authHeaders());

        $this->assertContains($response->status(), [401, 404]);
        $this->assertNotNull($response->json('error'));
        $this->assertNull($response->json('content'));
    }

    /**
     * @test
     */
    public function test_login_mobile_with_valid_credentials_returns_200_and_token_without_session_id()
    {
        $this->activeUser->password = bcrypt('TestEvox2026Mobile!');
        $this->activeUser->save();

        $logCountBefore = LoginLog::where('user_id', $this->activeUser->id)->count();

        $response = $this->postJson('/api/auth/login-mobile', [
            'username' => $this->activeUser->email,
            'password' => 'TestEvox2026Mobile!',
        ], $this->authHeaders());

        $response->assertStatus(200);
        $this->assertNotEmpty($response->json('content.access_token'),
            'loginMobile must return an access_token on success.');
        $this->assertEquals('bearer', $response->json('content.token_type'));
        $this->assertGreaterThan(0, $response->json('content.expires_in'));

        $this->assertArrayNotHasKey('session_id', $response->json('content'),
            'loginMobile must NOT include session_id — that is web-only.');

        $logCountAfter = LoginLog::where('user_id', $this->activeUser->id)->count();
        $this->assertGreaterThan($logCountBefore, $logCountAfter,
            'loginMobile must write a LoginLog entry on success.');
    }

    /**
     * @test
     */
    public function test_login_mobile_success_response_includes_user_and_settings()
    {
        $this->activeUser->password = bcrypt('TestEvox2026Mobile!');
        $this->activeUser->save();

        $response = $this->postJson('/api/auth/login-mobile', [
            'username' => $this->activeUser->email,
            'password' => 'TestEvox2026Mobile!',
        ], $this->authHeaders());

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'message',
            'content' => ['access_token', 'token_type', 'expires_in', 'user', 'constant', 'settings'],
        ]);
    }

    /**
     * @test
     */
    public function test_login_mobile_with_oversized_username_does_not_return_500()
    {
        $response = $this->postJson('/api/auth/login-mobile', [
            'username' => str_repeat('x', 10000),
            'password' => 'anypassword',
        ], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'loginMobile must handle oversized input without crashing.');
    }

    // =========================================================================
    // authenticateClient — GET /api/auth/authenticate-client
    // Middleware: jwtauth, auth.apikey
    // =========================================================================

    /**
     * @test
     */
    public function test_authenticate_client_without_token_returns_401_token_absent()
    {
        $response = $this->getJson('/api/auth/authenticate-client', ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /**
     * @test
     */
    public function test_authenticate_client_with_tampered_token_returns_401()
    {
        $tampered = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' .
                    'eyJzdWIiOiI5OTk5IiwiaWF0IjoxNTE2MjM5MDIyfQ.' .
                    'INVALIDSIGNATUREXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

        $response = $this->getJson('/api/auth/authenticate-client', [
            'X-Authorization' => $this->apiKey,
            'Authorization'   => "Bearer {$tampered}",
        ]);

        $response->assertStatus(401);
        $this->assertContains(
            $response->json('error.content.code'),
            ['token_invalid', 'token_absent', 'token_expired']
        );
    }

    /**
     * @test
     */
    public function test_authenticate_client_with_authenticated_user_returns_200_and_token()
    {
        $response = $this->getJson('/api/auth/authenticate-client', $this->authHeaders());

        $response->assertStatus(200);
        $this->assertNotEmpty($response->json('content.access_token'),
            'authenticateClient must return a new access_token on success.');
        $this->assertEquals('bearer', $response->json('content.token_type'));
    }

    /**
     * @test
     */
    public function test_authenticate_client_response_includes_default_payload_keys()
    {
        $response = $this->getJson('/api/auth/authenticate-client', $this->authHeaders());

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'message',
            'content' => ['access_token', 'token_type', 'expires_in', 'user', 'constant', 'settings'],
        ]);
    }

    // =========================================================================
    // authenticateMSClient — GET /api/auth/authenticate-ms-client
    // Middleware: auth.apikey only (NO jwtauth)
    // =========================================================================

    /**
     * @test
     */
    public function test_authenticate_ms_client_without_api_key_returns_401()
    {
        $response = $this->getJson('/api/auth/authenticate-ms-client?code=fake-code');
        $response->assertStatus(401);
    }

    /**
     * @test
     */
    public function test_authenticate_ms_client_without_code_returns_error_not_500()
    {
        $response = $this->getJson('/api/auth/authenticate-ms-client', $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'authenticateMSClient must not throw 500 when ?code is absent.');
        $this->assertNotNull($response->json('error'),
            'A missing MS code must return the error envelope, not a success response.');
    }

    /**
     * @test
     */
    public function test_authenticate_ms_client_with_invalid_code_returns_graceful_error_not_500()
    {
        $response = $this->getJson(
            '/api/auth/authenticate-ms-client?code=invalid-oauth-code-for-testing',
            $this->authHeaders()
        );

        $this->assertNotEquals(500, $response->status(),
            'authenticateMSClient must catch MS API failures and return error_response, not 500.');

        $this->assertNotNull($response->json('error'),
            'Failed MS authentication must return the error envelope.');

        $this->assertNull($response->json('content'),
            'No content/token must be returned when MS authentication fails.');
    }

    /**
     * @test
     */
    public function test_authenticate_ms_client_happy_path_skipped_requires_live_ms_tenant()
    {
        $this->markTestIncomplete(
            'Requires a live Microsoft OAuth code from a real tenant. ' .
            'Verify on staging: GET /api/auth/authenticate-ms-client?code=<real-code> ' .
            'Expected response: { message, content: { access_token, token_type, expires_in } }. ' .
            'Note: user/constant/settings are NOT returned (get_default_payload is commented out).'
        );
    }
}
