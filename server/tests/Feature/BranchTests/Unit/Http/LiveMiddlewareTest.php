<?php

namespace Tests\Feature\BranchTests\Unit\Http;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\RedirectIfAuthenticated;
use App\Http\Middleware\Authenticate;
use App\Modules\User\Models\User;

/**
 * Three zero-coverage middleware classes, one method each — covering one completes the whole CLASS.
 *
 *   EnsureUserHasRole          0/1   the role gate. LIVE: 'role:admin' on POST /api/register
 *   RedirectIfAuthenticated    0/1   LIVE: the 'guest' group in routes/web.php
 *   Authenticate               0/1   LIVE: the 'auth' alias, used on 92 route groups
 *
 * WITHDRAWN 2026-08-06 — this suite originally also covered ForgotPasswordController,
 * ResetPasswordController and VerificationController. Those are Laravel's default auth
 * scaffolding: they have ZERO route references and Auth::routes() is never called, so no
 * request can reach them. Testing them raised the class count while protecting nobody —
 * the same mistake as the checkUndertime tests deleted earlier the same day. Gobi's
 * dead-code analysis flagged them independently; verified here before removing.
 *
 * Each middleware below was checked to be reachable BEFORE writing its test, which is the
 * order that should have been followed the first time.
 *
 * These decide WHO GETS IN, which makes them worth asserting precisely rather than smoke-testing.
 * Middleware is exercised directly with a real Request and a closure standing in for the rest of
 * the pipeline — no HTTP round trip, no routes involved, nothing written.
 */
class LiveMiddlewareTest extends TestCase
{
    use DatabaseTransactions;

    /** A request whose user() resolves to whatever we hand it. */
    private function requestAs($user = null): Request
    {
        $request = Request::create('/api/anything', 'GET');
        $request->setUserResolver(function () use ($user) { return $user; });
        return $request;
    }

    /** The "rest of the pipeline" — records that it was reached. */
    private function next(&$reached)
    {
        return function ($request) use (&$reached) {
            $reached = true;
            return response('passed through', 200);
        };
    }

    // ─────────────────────────────── EnsureUserHasRole

    /** @test */
    public function a_user_holding_the_required_role_is_passed_through_to_the_route()
    {
        $user = new class {
            public $askedFor = null;
            public function hasRole($role) { $this->askedFor = $role; return true; }
        };
        $reached = false;

        $response = (new EnsureUserHasRole())->handle($this->requestAs($user), $this->next($reached), 'Admin');

        $this->assertTrue($reached, 'the request must continue down the pipeline');
        $this->assertSame('passed through', $response->getContent());
        $this->assertSame('Admin', $user->askedFor,
            'the role named on the route is the role checked — not a hardcoded one');
    }

    /** @test */
    public function a_user_without_the_required_role_is_stopped_before_the_route_runs()
    {
        $user = new class {
            public function hasRole($role) { return false; }
        };
        $reached = false;

        $response = (new EnsureUserHasRole())->handle($this->requestAs($user), $this->next($reached), 'Admin');

        $this->assertFalse($reached, 'the route must NOT run for a user lacking the role');
        $this->assertInstanceOf(JsonResponse::class, $response);
        $body = $response->getData(true);
        $this->assertArrayHasKey('error', $body);
        $this->assertNotEmpty($body['error']['message'], 'the refusal must say why');
    }

    /**
     * The middleware reads $request->user()->hasRole() with no null check. Route middleware normally
     * runs behind 'auth', so a null user should be impossible — this asserts what happens if that
     * ordering is ever changed, so a reordering shows up here rather than as a production 500.
     *
     * @test
     */
    public function an_unauthenticated_request_reaching_the_role_gate_fails_loudly()
    {
        $reached = false;

        $this->expectException(\Throwable::class);

        (new EnsureUserHasRole())->handle($this->requestAs(null), $this->next($reached), 'Admin');
    }

    // ─────────────────────────────── RedirectIfAuthenticated

    /** @test */
    public function a_guest_reaching_a_guest_only_page_is_allowed_through()
    {
        $reached = false;

        $response = (new RedirectIfAuthenticated())->handle($this->requestAs(), $this->next($reached));

        $this->assertTrue($reached);
        $this->assertSame('passed through', $response->getContent());
    }

    /** @test */
    public function a_signed_in_user_is_bounced_off_the_guest_pages_to_home()
    {
        $user = User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$user) $this->markTestSkipped('no active user to authenticate as');
        $this->be($user);

        $reached = false;
        $response = (new RedirectIfAuthenticated())->handle($this->requestAs($user), $this->next($reached));

        $this->assertFalse($reached, 'an authenticated user must not reach a guest-only route');
        $this->assertInstanceOf(RedirectResponse::class, $response);
        $this->assertStringEndsWith('/home', $response->getTargetUrl());
    }

    // ─────────────────────────────── Authenticate

    /** @test */
    public function an_unauthenticated_web_request_is_sent_to_the_named_login_route()
    {
        $middleware = $this->app->make(Authenticate::class);

        // redirectTo() is protected — this is the documented way Laravel exposes it to a test
        $method = new \ReflectionMethod(Authenticate::class, 'redirectTo');
        $method->setAccessible(true);

        $target = $method->invoke($middleware, $this->requestAs());

        $this->assertSame(route('login'), $target);
        $this->assertNotEmpty($target, 'a blank redirect target would loop the browser');
    }

}
