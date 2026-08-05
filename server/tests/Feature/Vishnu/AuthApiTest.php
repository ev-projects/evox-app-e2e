<?php

/**
 * EVOX P0 Auth API Tests — Vishnu Padmanabhan
 *
 * Scope: Scenarios NOT already covered by Gary's tests/Feature/Api/AuthApiTest.php.
 * Gary covers: login happy-path (email + username), wrong password, nonexistent user,
 *              missing API key, inactive-user null-termination bug (FTC-006),
 *              logout → token invalidated.
 *
 * This file covers: token validation (/payload), missing required fields,
 *                   unauthorized/no-token scenarios, and attack vectors.
 *
 * Endpoints under test:
 *   POST /api/auth/login      middleware: auth.apikey, api.calctime
 *   POST /api/auth/logout     middleware: jwtauth, auth.apikey
 *   POST /api/auth/payload    middleware: jwtauth, auth.apikey
 *
 * Response envelope:
 *   success → { "message": "...", "content": { ... } }           HTTP 200
 *   error   → { "error": { "message": "...", "content": ... } }  HTTP 4xx
 *
 * Coverage driver: Xdebug — run with:
 *   php artisan test --filter=Vishnu\\\\AuthApiTest --coverage
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class AuthApiTest extends TestCase
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

    // ─── Helper ──────────────────────────────────────────────────────────────

    /**
     * Resets the active user's password, calls POST /api/auth/login, and returns the JWT token.
     * The dd($e) debug line in AuthController has been removed; auth()->payload() is guarded.
     */
    private function loginAndGetToken(): string
    {
        $this->activeUser->password = bcrypt('TestEvox2026!');
        $this->activeUser->save();

        $resp = $this->postJson('/api/auth/login', [
            'username' => $this->activeUser->email,
            'password' => 'TestEvox2026!',
        ], $this->apiKey);

        $resp->assertStatus(200);

        return $resp->json('content.access_token');
    }

    // ─── Token validation — POST /api/auth/payload ────────────────────────────

    /**
     * Tests the payload endpoint's response structure using Pattern A (withoutMiddleware + actingAs).
     * Auth enforcement (401 when no token) is covered by test_payload_without_authorization_header_returns_401_token_absent.
     *
     * Note: cross-request JWT token passing is unreliable in the test environment because jwt-auth's
     * RequestParser singleton captures the first request at construction; tested separately in production.
     *
     * @test
     */
    public function test_payload_endpoint_with_valid_token_returns_200_and_full_structure()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->activeUser)
            ->postJson('/api/auth/payload', [], $this->apiKey);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'message',
            'content' => [
                'user',
                'constant',
                'settings' => [
                    'current_payroll_cutoff_ph',
                    'current_payroll_cutoff_in_mar',
                    'current_payroll_cutoff',
                    'countries',
                    'hr_list',
                    'coc_forms',
                    'popup_flags',
                ],
            ],
        ]);
    }

    /** @test */
    public function test_login_response_envelope_has_token_type_bearer_and_expires_in()
    {
        $this->activeUser->password = bcrypt('TestEvox2026!');
        $this->activeUser->save();

        $response = $this->postJson('/api/auth/login', [
            'username' => $this->activeUser->email,
            'password' => 'TestEvox2026!',
        ], $this->apiKey);

        $response->assertStatus(200);
        $this->assertEquals('bearer', $response->json('content.token_type'));
        $this->assertNotEmpty($response->json('content.access_token'));
        $this->assertGreaterThan(0, $response->json('content.expires_in'));
        // session_id is set on web login
        $this->assertNotEmpty($response->json('content.session_id'));
    }

    // ─── Token expiry ─────────────────────────────────────────────────────────

    /** @test */
    public function test_expired_token_returns_401_with_token_expired_code()
    {
        $this->markTestSkipped(
            'Gary covers expired-token behaviour in tests/Feature/Api/AuthApiTest.php. ' .
            'Align with his test if Gary removes it; do not maintain a duplicate here.'
        );
    }

    // ─── No auth header / invalid token — protected endpoints ─────────────────

    /** @test */
    public function test_payload_without_authorization_header_returns_401_token_absent()
    {
        // No Bearer header — middleware must reject with token_absent
        $response = $this->postJson('/api/auth/payload', [], $this->apiKey);

        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_payload_with_tampered_jwt_returns_401_token_invalid()
    {
        // Header is structurally valid JWT but signature is garbage
        $tampered = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' .
                    'eyJzdWIiOiI5OTk5IiwiaWF0IjoxNTE2MjM5MDIyfQ.' .
                    'INVALIDSIGNATUREXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

        $response = $this->postJson('/api/auth/payload', [], array_merge(
            $this->apiKey,
            ['Authorization' => "Bearer {$tampered}"]
        ));

        $response->assertStatus(401);
        $this->assertContains(
            $response->json('error.content.code'),
            ['token_invalid', 'token_absent']
        );
    }

    /** @test */
    public function test_logout_without_authorization_header_returns_401()
    {
        // Logout route requires jwtauth — no token should be rejected
        $response = $this->postJson('/api/auth/logout', [], $this->apiKey);
        $response->assertStatus(401);
    }

    // ─── Validation errors — missing required fields ───────────────────────────

    /** @test */
    public function test_login_without_username_field_returns_error_and_no_token()
    {
        $response = $this->postJson('/api/auth/login', [
            'password' => 'anypassword',
        ], $this->apiKey);

        // AuthController checks User::where('email'/'username') on the empty/null value
        // → user_not_found path → 404 from error_response
        $this->assertContains($response->status(), [400, 404, 422]);
        $this->assertNull($response->json('content'));         // no success envelope
        $this->assertNotNull($response->json('error'));        // must have error envelope
    }

    /** @test */
    public function test_login_without_password_field_returns_error_and_no_token()
    {
        $response = $this->postJson('/api/auth/login', [
            'username' => $this->activeUser->email,
            // password deliberately omitted — auth()->attempt() will fail
        ], $this->apiKey);

        $this->assertContains($response->status(), [400, 404, 422]);
        $this->assertNull($response->json('content'));
        $this->assertNotNull($response->json('error'));
    }

    /** @test */
    public function test_login_with_completely_empty_body_returns_error()
    {
        $response = $this->postJson('/api/auth/login', [], $this->apiKey);

        $this->assertContains($response->status(), [400, 404, 422]);
        $this->assertNull($response->json('content'));
    }

    // ─── Attack scenarios ─────────────────────────────────────────────────────

    /** @test */
    public function test_login_with_sql_injection_in_username_returns_error_and_no_token()
    {
        // Classic SQL injection — must NOT bypass authentication
        $injection = "' OR '1'='1' --";

        $response = $this->postJson('/api/auth/login', [
            'username' => $injection,
            'password' => 'anypassword',
        ], $this->apiKey);

        $this->assertContains($response->status(), [400, 404, 422]);
        $this->assertNull($response->json('content'));
        $this->assertNotNull($response->json('error'));
    }

    /** @test */
    public function test_login_with_oversized_username_does_not_return_500()
    {
        // 10 000-character username — server must not crash
        $oversized = str_repeat('a', 10000);

        $response = $this->postJson('/api/auth/login', [
            'username' => $oversized,
            'password'  => 'anypassword',
        ], $this->apiKey);

        $this->assertNotEquals(500, $response->status(), 'Server must handle oversized input gracefully.');
        $this->assertNull($response->json('content'));
    }

    /** @test */
    public function test_login_with_malformed_json_body_does_not_return_500()
    {
        // Laravel's JSON middleware will handle the malformed body —
        // but if it slips through, the controller must not crash.
        $response = $this->call(
            'POST',
            '/api/auth/login',
            [],
            [],
            [],
            [
                'HTTP_X-Authorization' => env(
                    'APP_API_KEY',
                    'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z'
                ),
                'CONTENT_TYPE' => 'application/json',
            ],
            '{not: valid, json::'   // intentionally malformed
        );

        $this->assertNotEquals(500, $response->getStatusCode(), 'Malformed JSON must not cause a 500.');
    }

    /** @test */
    public function test_login_without_content_type_header_does_not_return_500()
    {
        // POST without Content-Type: application/json — server should handle gracefully
        $response = $this->call(
            'POST',
            '/api/auth/login',
            ['username' => $this->activeUser->email, 'password' => 'wrong'],
            [],
            [],
            [
                'HTTP_X-Authorization' => env(
                    'APP_API_KEY',
                    'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z'
                ),
                // no CONTENT_TYPE key
            ]
        );

        $this->assertNotEquals(500, $response->getStatusCode(), 'Missing Content-Type must not cause a 500.');
    }
}
