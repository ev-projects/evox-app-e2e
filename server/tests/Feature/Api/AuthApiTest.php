<?php

/**
 * EVOX-31 — PHPUnit P0: Auth API Endpoint Tests
 * Source: AuthController, login.md
 */

namespace Tests\Feature\Api;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class AuthApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
    }

    // ─── POST /api/auth/login ─────────────────────────────────────────────────

    /** @test */
    public function test_login_with_valid_email_returns_token()
    {
        $user = User::where('is_active', 1)
            ->whereNotNull('email')
            ->first();
        $this->assertNotNull($user, 'No active users in test database');

        // Reset to known password
        $user->password = bcrypt('TestEvox2026!');
        $user->save();

        $response = $this->postJson('/api/auth/login', [
            'username' => $user->email,
            'password' => 'TestEvox2026!',
        ], $this->apiKey);

        $response->assertStatus(200);
        $this->assertArrayHasKey('access_token', $response->json('content'));
        $this->assertEquals('bearer', $response->json('content.token_type'));
    }

    /** @test */
    public function test_login_with_wrong_password_returns_error()
    {
        $user = User::where('is_active', 1)->whereNotNull('email')->first();
        $this->assertNotNull($user);

        $response = $this->postJson('/api/auth/login', [
            'username' => $user->email,
            'password' => 'definitelywrongpassword999',
        ], $this->apiKey);

        $this->assertContains($response->status(), [400, 401, 404]);
        $this->assertArrayNotHasKey('access_token', $response->json('content') ?? []);
    }

    /** @test */
    public function test_login_with_nonexistent_email_returns_error()
    {
        $response = $this->postJson('/api/auth/login', [
            'username' => 'nobody_does_not_exist_999@example.com',
            'password' => 'anypassword',
        ], $this->apiKey);

        $this->assertContains($response->status(), [400, 401, 404]);
    }

    /** @test */
    public function test_login_with_valid_username_not_email_returns_token()
    {
        $user = User::where('is_active', 1)
            ->whereNotNull('username')
            ->first();
        $this->assertNotNull($user);

        $user->password = bcrypt('TestEvox2026!');
        $user->save();

        $response = $this->postJson('/api/auth/login', [
            'username' => $user->username,
            'password' => 'TestEvox2026!',
        ], $this->apiKey);

        $response->assertStatus(200);
        $this->assertArrayHasKey('access_token', $response->json('content'));
    }

    /** @test */
    public function test_login_without_api_key_is_rejected()
    {
        $response = $this->postJson('/api/auth/login', [
            'username' => 'test@example.com',
            'password' => 'anypassword',
        ]);
        // Without API key, should be rejected
        $this->assertContains($response->status(), [400, 401, 403, 404]);
    }

    // ─── FTC-006 BUG: inactive user with null termination_date ───────────────

    /** @test */
    public function test_inactive_user_with_null_termination_date_cannot_login()
    {
        // BUG: carbon::parse(null)->addDay() may allow login — this test catches it
        $user = User::where('is_active', 0)
            ->whereNull('termination_date')
            ->first();

        if (!$user) {
            $this->markTestIncomplete('No inactive users with null termination_date in test database.');
        }

        $user->password = bcrypt('TestEvox2026!');
        $user->save();

        $response = $this->postJson('/api/auth/login', [
            'username' => $user->email ?? $user->username,
            'password' => 'TestEvox2026!',
        ], $this->apiKey);

        // Must NOT return 200 with a token — inactive users must be rejected
        if ($response->status() === 200 && isset($response->json('content')['access_token'])) {
            $this->fail(
                'BUG CONFIRMED: Inactive user with null termination_date can login. ' .
                'Fix AuthController.php:75-80 — add null-check before Carbon::parse(null)->addDay().'
            );
        }
        $this->assertNotEquals(200, $response->status());
    }

    // ─── POST /api/auth/logout ────────────────────────────────────────────────

    /** @test */
    public function test_logout_invalidates_token()
    {
        $user = User::where('is_active', 1)->whereNotNull('email')->first();
        $this->assertNotNull($user);
        $user->password = bcrypt('TestEvox2026!');
        $user->save();

        // Login
        $loginResponse = $this->postJson('/api/auth/login', [
            'username' => $user->email,
            'password' => 'TestEvox2026!',
        ], $this->apiKey);
        $loginResponse->assertStatus(200);
        $token = $loginResponse->json('content.access_token');

        // Logout
        $logoutResponse = $this->postJson('/api/auth/logout', [], array_merge(
            $this->apiKey,
            ['Authorization' => "Bearer {$token}"]
        ));
        $logoutResponse->assertStatus(200);

        // Using the same token again should fail
        $reUseResponse = $this->postJson('/api/auth/payload', [], array_merge(
            $this->apiKey,
            ['Authorization' => "Bearer {$token}"]
        ));
        $this->assertContains($reUseResponse->status(), [401, 400]);
    }
}
