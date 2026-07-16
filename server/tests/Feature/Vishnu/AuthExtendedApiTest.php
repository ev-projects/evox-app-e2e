<?php

/**
 * DRAFT — needs verification against staging behaviour.
 *
 * EVOX Auth Extended API Tests — Vishnu Padmanabhan
 * Status: DRAFT — needs verification
 *
 * Covers three AuthController methods NOT tested in AuthApiTest.php:
 *
 *   loginMobile         POST /api/auth/login-mobile
 *                       Middleware: auth.apikey, api.calctime
 *                       Same credential logic as login() but writes a LoginLog row
 *                       and does NOT include session_id in the response.
 *
 *   authenticateClient  GET  /api/auth/authenticate-client
 *                       Middleware: jwtauth, auth.apikey
 *                       Re-issues a fresh JWT for an already-authenticated user
 *                       (used after Google OAuth hands back a bearer token).
 *                       No request body — auth()->user() is set by jwtauth.
 *
 *   authenticateMSClient GET /api/auth/authenticate-ms-client
 *                       Middleware: auth.apikey only (no jwtauth)
 *                       Exchanges a Microsoft OAuth ?code= for an EVOX JWT.
 *                       Calls ms_get_access_token() + ms_call_api() externally.
 *                       In the test environment the external MS call will fail
 *                       gracefully (catch block returns error_response, not 500).
 *
 * Test patterns:
 *   A — Controller logic: withoutMiddleware() + actingAs()
 *   B — Auth/API-key enforcement: real middleware, no Bearer token → 401
 *
 * Response envelopes:
 *   success → { "message": "...", "content": { ... } }          HTTP 200
 *   error   → { "error": { "message": "...", "content": ... } } HTTP 4xx
 *
 * Run this file with:
 *   php artisan test --filter=Vishnu\\\\AuthExtendedApiTest
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\User\Models\LoginLog;

class AuthExtendedApiTest extends TestCase
{
    use DatabaseTransactions;

    /** @var array HTTP header carrying the application API key */
    private array $apiKey;

    /** @var User An active user guaranteed to exist in the test database */
    private User $activeUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->apiKey = [
            'X-Authorization' => env(
                'APP_API_KEY',
                'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z'
            ),
        ];

        $this->activeUser = User::where('is_active', 1)
            ->whereNotNull('email')
            ->firstOrFail();
    }

    // =========================================================================
    // loginMobile — POST /api/auth/login-mobile
    // Middleware: auth.apikey, api.calctime  (NO jwtauth)
    // =========================================================================

    // ─── Pattern B: API-key enforcement ──────────────────────────────────────

    /**
     * Without the X-Authorization header the auth.apikey middleware must reject
     * the request before the controller runs.
     *
     * @test
     */
    public function test_login_mobile_without_api_key_returns_401()
    {
        // No X-Authorization header — auth.apikey must block
        $response = $this->postJson('/api/auth/login-mobile', [
            'username' => 'any@example.com',
            'password' => 'anypassword',
        ]);

        // auth.apikey returns 401 when the key is absent or wrong
        $response->assertStatus(401);
    }

    // ─── Pattern A: Controller logic (withoutMiddleware) ──────────────────────

    /**
     * Empty body → AuthController checks empty credentials → 422 via error_response.
     *
     * @test
     */
    public function test_login_mobile_with_empty_body_returns_422()
    {
        $this->withoutMiddleware();

        $response = $this->postJson('/api/auth/login-mobile', [], $this->apiKey);

        $response->assertStatus(422);
        $this->assertNotNull($response->json('error'),
            'Empty-body loginMobile must return the error envelope.');
        $this->assertNull($response->json('content'));
    }

    /**
     * Missing password field → empty() check triggers 422.
     *
     * @test
     */
    public function test_login_mobile_without_password_returns_422()
    {
        $this->withoutMiddleware();

        $response = $this->postJson('/api/auth/login-mobile', [
            'username' => $this->activeUser->email,
            // password deliberately omitted
        ], $this->apiKey);

        $response->assertStatus(422);
        $this->assertNotNull($response->json('error'));
    }

    /**
     * Missing username field → empty() check triggers 422.
     *
     * @test
     */
    public function test_login_mobile_without_username_returns_422()
    {
        $this->withoutMiddleware();

        $response = $this->postJson('/api/auth/login-mobile', [
            'password' => 'anypassword',
            // username deliberately omitted
        ], $this->apiKey);

        $response->assertStatus(422);
        $this->assertNotNull($response->json('error'));
    }

    /**
     * Wrong password → auth()->attempt() fails → 404 from error_response
     * (loginMobile uses HTTP_NOT_FOUND for wrong-password, unlike login() which uses 401).
     *
     * @test
     */
    public function test_login_mobile_with_wrong_password_returns_4xx_error_envelope()
    {
        $this->withoutMiddleware();

        $response = $this->postJson('/api/auth/login-mobile', [
            'username' => $this->activeUser->email,
            'password' => 'definitly-wrong-password-!',
        ], $this->apiKey);

        // loginMobile returns 404 for wrong password (unlike login which uses 401)
        $this->assertContains($response->status(), [401, 404]);
        $this->assertNotNull($response->json('error'));
        $this->assertNull($response->json('content'));
    }

    /**
     * Valid credentials → 200, access_token present, NO session_id
     * (mobile login intentionally omits session_id).
     * Also verifies a LoginLog row was written.
     *
     * @test
     */
    public function test_login_mobile_with_valid_credentials_returns_200_and_token_without_session_id()
    {
        $this->withoutMiddleware();

        // Set a known password so we can authenticate
        $this->activeUser->password = bcrypt('TestEvox2026Mobile!');
        $this->activeUser->save();

        $logCountBefore = LoginLog::where('user_id', $this->activeUser->id)->count();

        $response = $this->postJson('/api/auth/login-mobile', [
            'username' => $this->activeUser->email,
            'password' => 'TestEvox2026Mobile!',
        ], $this->apiKey);

        $response->assertStatus(200);
        $this->assertNotEmpty($response->json('content.access_token'),
            'loginMobile must return an access_token on success.');
        $this->assertEquals('bearer', $response->json('content.token_type'));
        $this->assertGreaterThan(0, $response->json('content.expires_in'));

        // Mobile login does NOT include session_id
        $this->assertArrayNotHasKey('session_id', $response->json('content'),
            'loginMobile must NOT include session_id — that is web-only.');

        // A LoginLog row must have been written
        $logCountAfter = LoginLog::where('user_id', $this->activeUser->id)->count();
        $this->assertGreaterThan($logCountBefore, $logCountAfter,
            'loginMobile must write a LoginLog entry on success.');
    }

    /**
     * loginMobile response must include the default payload keys (user, constant, settings).
     *
     * @test
     */
    public function test_login_mobile_success_response_includes_user_and_settings()
    {
        $this->withoutMiddleware();

        $this->activeUser->password = bcrypt('TestEvox2026Mobile!');
        $this->activeUser->save();

        $response = $this->postJson('/api/auth/login-mobile', [
            'username' => $this->activeUser->email,
            'password' => 'TestEvox2026Mobile!',
        ], $this->apiKey);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'message',
            'content' => [
                'access_token',
                'token_type',
                'expires_in',
                'user',
                'constant',
                'settings',
            ],
        ]);
    }

    /**
     * Oversized username must not cause a 500 in loginMobile.
     *
     * @test
     */
    public function test_login_mobile_with_oversized_username_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->postJson('/api/auth/login-mobile', [
            'username' => str_repeat('x', 10000),
            'password' => 'anypassword',
        ], $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'loginMobile must handle oversized input without crashing.');
    }

    // =========================================================================
    // authenticateClient — GET /api/auth/authenticate-client
    // Middleware: jwtauth, auth.apikey
    // Requires an existing valid JWT — re-issues a new token for the same user.
    // =========================================================================

    // ─── Pattern B: JWT enforcement ───────────────────────────────────────────

    /**
     * No Bearer token → jwtauth middleware rejects with 401 token_absent.
     *
     * @test
     */
    public function test_authenticate_client_without_token_returns_401_token_absent()
    {
        $response = $this->getJson('/api/auth/authenticate-client', $this->apiKey);

        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /**
     * Tampered JWT → jwtauth middleware rejects with 401 token_invalid.
     *
     * @test
     */
    public function test_authenticate_client_with_tampered_token_returns_401()
    {
        $tampered = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' .
                    'eyJzdWIiOiI5OTk5IiwiaWF0IjoxNTE2MjM5MDIyfQ.' .
                    'INVALIDSIGNATUREXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

        $response = $this->getJson('/api/auth/authenticate-client', array_merge(
            $this->apiKey,
            ['Authorization' => "Bearer {$tampered}"]
        ));

        $response->assertStatus(401);
        $this->assertContains(
            $response->json('error.content.code'),
            ['token_invalid', 'token_absent', 'token_expired']
        );
    }

    // ─── Pattern A: Controller logic (withoutMiddleware + actingAs) ───────────

    /**
     * With an authenticated user (simulated via actingAs), authenticateClient
     * should re-issue a fresh JWT and return 200 with the standard token envelope.
     *
     * The controller calls auth()->logout() then auth()->login($user), which
     * invalidates the old token and issues a new one — both are no-ops in test
     * when middleware is bypassed (no real JWT is present), but the DB user is
     * set via actingAs so auth()->user() resolves correctly.
     *
     * @test
     */
    public function test_authenticate_client_with_authenticated_user_returns_200_and_token()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->activeUser)
            ->getJson('/api/auth/authenticate-client', $this->apiKey);

        $response->assertStatus(200);
        $this->assertNotEmpty($response->json('content.access_token'),
            'authenticateClient must return a new access_token on success.');
        $this->assertEquals('bearer', $response->json('content.token_type'));
    }

    /**
     * authenticateClient response must include user, constant, settings.
     *
     * @test
     */
    public function test_authenticate_client_response_includes_default_payload_keys()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->activeUser)
            ->getJson('/api/auth/authenticate-client', $this->apiKey);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'message',
            'content' => [
                'access_token',
                'token_type',
                'expires_in',
                'user',
                'constant',
                'settings',
            ],
        ]);
    }

    // =========================================================================
    // authenticateMSClient — GET /api/auth/authenticate-ms-client
    // Middleware: auth.apikey only (NO jwtauth)
    // Requires ?code= from Microsoft OAuth redirect.
    // External MS call (ms_get_access_token / ms_call_api) will fail in test env.
    // =========================================================================

    // ─── Pattern B: API-key enforcement ──────────────────────────────────────

    /**
     * Without the X-Authorization header the auth.apikey middleware must block
     * before any MS call is attempted.
     *
     * Note: this route has NO jwtauth — so 401 comes from auth.apikey, not JWT.
     *
     * @test
     */
    public function test_authenticate_ms_client_without_api_key_returns_401()
    {
        // No X-Authorization header
        $response = $this->getJson('/api/auth/authenticate-ms-client?code=fake-code');

        $response->assertStatus(401);
    }

    // ─── Pattern A: Controller logic (withoutMiddleware) ──────────────────────

    /**
     * Missing ?code= parameter → ms_get_access_token() receives null code →
     * token_request will be falsy → controller returns 403 "Microsoft login failed".
     * Must not throw 500.
     *
     * @test
     */
    public function test_authenticate_ms_client_without_code_returns_error_not_500()
    {
        $this->withoutMiddleware();

        // No code query parameter — ms_get_access_token will fail gracefully
        $response = $this->getJson('/api/auth/authenticate-ms-client', $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'authenticateMSClient must not throw 500 when ?code is absent.');
        $this->assertNotNull($response->json('error'),
            'A missing MS code must return the error envelope, not a success response.');
    }

    /**
     * With a fake ?code= value → ms_get_access_token() calls the real MS token
     * endpoint which fails in the test environment → catch block fires or
     * controller returns the "Microsoft login failed" error_response.
     * Must not return 500.
     *
     * @test
     */
    public function test_authenticate_ms_client_with_invalid_code_returns_graceful_error_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->getJson(
            '/api/auth/authenticate-ms-client?code=invalid-oauth-code-for-testing',
            $this->apiKey
        );

        // External MS call will fail → controller returns 403 or 404, never 500
        $this->assertNotEquals(500, $response->status(),
            'authenticateMSClient must catch MS API failures and return error_response, not 500.');

        // Must use the error envelope
        $this->assertNotNull($response->json('error'),
            'Failed MS authentication must return the error envelope.');

        // Must NOT return a success envelope (no token should be issued)
        $this->assertNull($response->json('content'),
            'No content/token must be returned when MS authentication fails.');
    }

    /**
     * Skipped: Valid MS OAuth flow requires a live Microsoft tenant.
     * Happy-path (200 + token) is only verifiable in staging with a real ?code=.
     * Document the expected shape here so staging verification knows what to check.
     *
     * Expected 200 response keys: access_token, token_type, expires_in
     * (note: get_default_payload is commented out in authenticateMSClient —
     *  user/constant/settings are NOT included in the MS login response).
     *
     * @test
     */
    public function test_authenticate_ms_client_happy_path_skipped_requires_live_ms_tenant()
    {
        $this->markTestSkipped(
            'Requires a live Microsoft OAuth code from a real tenant. ' .
            'Verify on staging: GET /api/auth/authenticate-ms-client?code=<real-code> ' .
            'Expected response: { message, content: { access_token, token_type, expires_in } }. ' .
            'Note: user/constant/settings are NOT returned (get_default_payload is commented out).'
        );
    }
}
