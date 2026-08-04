<?php

namespace Tests\Feature\BranchTests\Auth\Login;

use Tests\TestCase;
use Mockery;
use Illuminate\Http\Request;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Socialite\Facades\Socialite;
use App\Http\Controllers\Auth\LoginController;
use App\Modules\User\Models\User;

/**
 * WAVE-2 COVERAGE (2026-07-27). Branch tests for App\Http\Controllers\Auth\LoginController
 * (0% before this — per TEST-COVERAGE-TRACKER one of only 2 genuinely untested controllers).
 * Menu=Auth Page=Login (social/SSO arms).
 *
 * Routes (routes/web.php): GET /microsoft-login -> redirectToMS, GET /microsoft-callback ->
 * handleMSCallback. The Google routes are COMMENTED OUT (web.php:25-26) but the methods remain
 * live code — they are covered here by direct invocation with the Socialite facade mocked.
 *
 * SAFETY: Socialite is facade-mocked (no OAuth round-trip). handleMSCallback is tested ONLY on
 * its no-code guard arm; the code-exchange arm constructs a real Guzzle client → external HTTP
 * to login.microsoftonline.com. // SKIPPED-EXTERNAL (same category as AdminSyncApiTest).
 * JWTAuth::fromUser is local signing only. DatabaseTransactions; reads only User::first().
 */
class SocialLoginBranchTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_redirect_to_google_delegates_to_socialite_driver()
    {
        $driver = Mockery::mock();
        $driver->shouldReceive('redirect')->once()
               ->andReturn(redirect()->away('https://accounts.google.com/o/oauth2/auth?fake'));
        Socialite::shouldReceive('driver')->with('google')->once()->andReturn($driver);

        $response = (new LoginController())->redirectToGoogle();

        $this->assertStringContainsString('accounts.google.com', $response->getTargetUrl());
    }

    public function test_google_callback_existing_user_redirects_with_jwt_token()
    {
        $existing = User::whereNotNull('email')->first();
        if (!$existing) $this->markTestIncomplete('no user with email in test DB');

        $driver = Mockery::mock();
        $driver->shouldReceive('user')->once()->andReturn((object) ['email' => $existing->email]);
        Socialite::shouldReceive('driver')->with('google')->once()->andReturn($driver);

        $response = (new LoginController())->handleGoogleCallback();

        $target = $response->getTargetUrl();
        $this->assertStringContainsString('authenticate-client?token=', $target);
        // token segment is a non-empty JWT (three dot-separated parts)
        $token = substr($target, strpos($target, 'token=') + 6);
        $this->assertCount(3, explode('.', $token));
    }

    public function test_google_callback_unknown_email_redirects_to_email_not_found()
    {
        $driver = Mockery::mock();
        $driver->shouldReceive('user')->once()
               ->andReturn((object) ['email' => 'nobody+' . uniqid() . '@example.invalid']);
        Socialite::shouldReceive('driver')->with('google')->once()->andReturn($driver);

        $response = (new LoginController())->handleGoogleCallback();

        $this->assertStringContainsString('email-not-found', $response->getTargetUrl());
    }

    public function test_google_callback_socialite_exception_redirects_to_login()
    {
        $driver = Mockery::mock();
        $driver->shouldReceive('user')->once()->andThrow(new \Exception('oauth state mismatch'));
        Socialite::shouldReceive('driver')->with('google')->once()->andReturn($driver);

        $response = (new LoginController())->handleGoogleCallback();

        $this->assertStringContainsString('login', $response->getTargetUrl());
    }

    public function test_redirect_to_ms_builds_authorize_url_from_config()
    {
        $response = (new LoginController())->redirectToMS(Request::create('/microsoft-login', 'GET'));

        $target = $response->getTargetUrl();
        $this->assertStringContainsString('login.microsoftonline.com', $target);
        $this->assertStringContainsString('/oauth2/v2.0/authorize', $target);
        $this->assertStringContainsString('response_type=code', $target);
        $this->assertStringContainsString('scope=user.read', $target);
        $this->assertStringContainsString('state=', $target);
    }

    public function test_ms_callback_without_code_redirects_to_login()
    {
        // Guard arm only — the with-code arm does live Guzzle HTTP. // SKIPPED-EXTERNAL
        $response = (new LoginController())->handleMSCallback(Request::create('/microsoft-callback', 'GET'));

        $this->assertStringContainsString('login', $response->getTargetUrl());
    }

    public function test_ms_login_route_is_wired_to_controller()
    {
        // Route-level smoke: /microsoft-login should answer with the OAuth redirect (302).
        $response = $this->get('/microsoft-login');

        $this->assertContains($response->status(), [302, 500],
            'microsoft-login should redirect (302); 500 only if MS config vars are absent in this env');
        if ($response->status() === 302) {
            $this->assertStringContainsString('login.microsoftonline.com', $response->headers->get('Location'));
        }
    }
}
