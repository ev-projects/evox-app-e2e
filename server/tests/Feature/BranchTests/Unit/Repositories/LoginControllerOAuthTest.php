<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use App\Http\Controllers\Auth\LoginController;
use App\Modules\User\Models\User;

/**
 * Auth\LoginController (0% covered, 72 unc lines) — the Microsoft/Google OAuth entry points.
 * FIRST tests for this file.
 *
 * SAFETY: no real OAuth traffic. The Socialite FACADE is mocked for the Google arms; the
 * Microsoft arms tested here are the ones that never touch the network — redirectToMS (pure
 * config → URL build) and handleMSCallback's missing-code guard. handleMSCallback's token
 * exchange is NOT exercised: it does `new Client()` inline (not container-resolved), so driving
 * it would make a REAL request to login.microsoftonline.com. Documented as FINDING AUTH-DI-1.
 *
 * Nothing is written; no account is ever authenticated with real credentials (no lockout risk).
 */
class LoginControllerOAuthTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // ------------------------------------------------------------------ redirectToMS
    /** @test */
    public function redirect_to_microsoft_builds_the_authorize_url_from_config()
    {
        config([
            'services.microsoft.tenant_id' => 'tenant-xyz',
            'services.microsoft.client_id' => 'client-abc',
            'services.microsoft.redirect'  => 'https://evox.test/microsoft-callback',
        ]);

        $res = $this->get('/microsoft-login');

        $res->assertStatus(302);
        $target = $res->headers->get('Location');
        $this->assertStringContainsString('login.microsoftonline.com/tenant-xyz', $target);
        $this->assertStringContainsString('client_id=client-abc', $target);
        $this->assertStringContainsString('response_type=code', $target);
        $this->assertStringContainsString('scope=user.read', $target);
        $this->assertStringContainsString('state=', $target);          // random state arm
    }

    // -------------------------------------------------------------- handleMSCallback
    /** @test */
    public function ms_callback_without_a_code_redirects_back_to_login()
    {
        $res = $this->get('/microsoft-callback');                       // no ?code=

        $res->assertStatus(302);
        $this->assertStringContainsString('login', $res->headers->get('Location'));
    }

    // ---------------------------------------------------------- handleGoogleCallback
    /** @test */
    public function google_callback_with_a_known_email_redirects_with_a_jwt()
    {
        $user = User::whereNotNull('email')->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$user) $this->markTestSkipped('no active user with an email in test DB');

        Socialite::shouldReceive('driver->user')
            ->once()
            ->andReturn((object) ['email' => $user->email]);

        $res = (new LoginController())->handleGoogleCallback();

        $this->assertSame(302, $res->getStatusCode());
        $target = $res->headers->get('Location');
        $this->assertStringContainsString('authenticate-client?token=', $target);  // JWT arm
    }

    /** @test */
    public function google_callback_with_an_unknown_email_redirects_to_email_not_found()
    {
        Socialite::shouldReceive('driver->user')
            ->once()
            ->andReturn((object) ['email' => 'no-such-user-' . uniqid() . '@evox.test']);

        $res = (new LoginController())->handleGoogleCallback();

        $this->assertSame(302, $res->getStatusCode());
        $this->assertStringContainsString('email-not-found', $res->headers->get('Location'));
    }

    /** @test */
    public function google_callback_provider_failure_falls_back_to_login()
    {
        Socialite::shouldReceive('driver->user')
            ->once()
            ->andThrow(new \Exception('oauth provider unavailable'));

        $res = (new LoginController())->handleGoogleCallback();

        $this->assertSame(302, $res->getStatusCode());
        $this->assertStringContainsString('login', $res->headers->get('Location'));   // catch arm
    }
}
