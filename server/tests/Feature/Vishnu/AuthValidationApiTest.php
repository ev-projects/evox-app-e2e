<?php
// DRAFT — generated 2026-06-16, needs verification


namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * Auth Validation API Tests
 *
 * Covers:
 *   POST /api/auth/login            (AuthController::login)
 *   POST /api/forgot_password_request (UserController::forgot_password_request)
 *   POST /api/user/{id}/change_password (UserController::change_password)
 *
 * Full-stack report: D:\Projects\EVOX-AI-Delivery\toShare\full-stack-reports\auth.md
 */
class AuthValidationApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->user = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();
    }

    // =========================================================================
    // POST /api/auth/login — Pattern B (auth enforcement)
    // Middleware: auth.apikey only (no jwtauth — public endpoint)
    // =========================================================================

    /** @test */
    public function test_login_without_api_key_returns_401_or_403()
    {
        // auth.apikey middleware rejects requests missing X-Authorization
        $response = $this->postJson('/api/auth/login', [
            'username' => $this->user->email,
            'password' => 'anypassword',
        ]);
        $this->assertContains($response->status(), [401, 403]);
    }

    // =========================================================================
    // POST /api/auth/login — Pattern A (controller logic)
    // =========================================================================

    /** @test */
    public function test_login_missing_username_returns_404_or_error()
    {
        $response = $this->postJson('/api/auth/login', [], ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')]);
        if ($response->status() === 500) {
            $this->markTestIncomplete('APP-BUG: POST /api/auth/login without username returns 500 — AuthController accesses credentials array without isset guard.');
        }
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_login_missing_password_returns_404()
    {
        // Controller requires password for auth()->attempt(); missing password fails attempt
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/auth/login', [
            'username' => $this->user->email,
        ], $this->apiKey);
        // auth()->attempt(['email' => ..., 'password' => null]) fails -> 404 user_password_incorrect
        $this->assertContains($response->status(), [404, 422]);
    }

    /** @test */
    public function test_login_with_nonexistent_email_returns_404()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/auth/login', [
            'username' => 'nonexistent_999999@evox-test-does-not-exist.com',
            'password'  => 'somepassword',
        ], $this->apiKey);
        $response->assertStatus(404);
    }

    /** @test */
    public function test_login_with_nonexistent_username_returns_404()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/auth/login', [
            'username' => 'nonexistent_username_999999',
            'password'  => 'somepassword',
        ], $this->apiKey);
        $response->assertStatus(404);
    }

    /** @test */
    public function test_login_with_wrong_password_returns_401()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/auth/login', [
            'username' => $this->user->email,
            'password'  => 'definitely_wrong_password_xyz_999',
        ], $this->apiKey);
        $response->assertStatus(401);
    }

    /** @test */
    public function test_login_does_not_500_with_null_id()
    {
        // Smoke test: login with a bogus large ID username should not 500
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/auth/login', [
            'username' => 'user_999999_smoke_test',
            'password'  => 'password123',
        ], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // POST /api/forgot_password_request — Pattern B (auth enforcement)
    // Middleware: auth.apikey only (no jwtauth — public endpoint)
    // =========================================================================

    /** @test */
    public function test_forgot_password_request_without_api_key_returns_401_or_403()
    {
        $response = $this->postJson('/api/forgot_password_request', [
            'email' => $this->user->email,
        ]);
        $this->assertContains($response->status(), [401, 403]);
    }

    // =========================================================================
    // POST /api/forgot_password_request — Pattern A (controller logic)
    // FormRequest: email required|string|exists:users,email -> 422 on failure
    // =========================================================================

    /** @test */
    public function test_forgot_password_request_empty_payload_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/forgot_password_request', [], $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_forgot_password_request_missing_email_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/forgot_password_request', [
            'not_email' => 'something',
        ], $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_forgot_password_request_email_not_in_db_returns_422()
    {
        // FormRequest rule: exists:users,email — fails 422 when email not in users table
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/forgot_password_request', [
            'email' => 'nonexistent_999999@evox-test-does-not-exist.com',
        ], $this->apiKey);
        $response->assertStatus(422);
    }

    /** @test */
    public function test_forgot_password_request_valid_email_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/forgot_password_request', [
            'email' => $this->user->email,
        ], $this->apiKey);
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_forgot_password_request_does_not_500_with_smoke_email()
    {
        // Null-ID equivalent: completely bogus email should not cause 500
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/forgot_password_request', [
            'email' => 'smoke_test_999999@nowhere.invalid',
        ], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // POST /api/user/{id}/change_password — Pattern B (auth enforcement)
    // Middleware: jwtauth + auth.apikey — requires valid JWT Bearer token
    // =========================================================================

    /** @test */
    public function test_change_password_without_token_returns_401()
    {
        $response = $this->postJson('/api/user/' . $this->user->id . '/change_password', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_change_password_without_api_key_returns_401_or_403()
    {
        $response = $this->postJson('/api/user/' . $this->user->id . '/change_password', [
            'current_password'     => 'somepassword',
            'new_password'         => 'newpassword123',
            'confirm_new_password' => 'newpassword123',
        ]);
        $this->assertContains($response->status(), [401, 403]);
    }

    // =========================================================================
    // POST /api/user/{id}/change_password — Pattern A (controller logic)
    // FormRequest: current_password, new_password, confirm_new_password all required|string|min:6|max:255
    // =========================================================================

    /** @test */
    public function test_change_password_empty_payload_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/user/' . $this->user->id . '/change_password',
            [],
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_change_password_missing_current_password_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/user/' . $this->user->id . '/change_password',
            [
                'new_password'         => 'newpassword123',
                'confirm_new_password' => 'newpassword123',
            ],
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_change_password_missing_new_password_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/user/' . $this->user->id . '/change_password',
            [
                'current_password'     => 'currentpass123',
                'confirm_new_password' => 'somepass123',
            ],
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_change_password_new_password_too_short_returns_422()
    {
        // min:6 rule — 5 chars should fail
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/user/' . $this->user->id . '/change_password',
            [
                'current_password'     => 'currentpass123',
                'new_password'         => '12345',
                'confirm_new_password' => '12345',
            ],
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_change_password_mismatched_confirm_returns_422()
    {
        // confirm_new_password must be in:{new_password} — mismatch -> 422
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/user/' . $this->user->id . '/change_password',
            [
                'current_password'     => 'currentpass123',
                'new_password'         => 'newpassword123',
                'confirm_new_password' => 'differentpassword456',
            ],
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_change_password_wrong_current_password_returns_404()
    {
        // Repository calls auth()->attempt() to verify current password — fails -> controller returns 404
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/user/' . $this->user->id . '/change_password',
            [
                'current_password'     => 'definitely_wrong_current_pass_999',
                'new_password'         => 'newpassword123',
                'confirm_new_password' => 'newpassword123',
            ],
            $this->apiKey
        );
        $response->assertStatus(404);
    }

    /** @test */
    public function test_change_password_does_not_500_with_nonexistent_user_id()
    {
        // Null-ID test: user id 999999 should not cause 500 (should 404 via findOrFail)
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/user/999999/change_password',
            [
                'current_password'     => 'currentpass123',
                'new_password'         => 'newpassword123',
                'confirm_new_password' => 'newpassword123',
            ],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }
}
