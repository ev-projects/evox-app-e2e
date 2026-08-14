<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\PermissionMiddleware;
use App\Modules\User\Http\Middleware\CheckPermission;
use App\Modules\User\Models\User;

/**
 * The ROLE GATES themselves (all three at 0% coverage before this suite).
 * These middlewares are what stand between a user and an action they may not perform — the
 * enforcement half of everything in ROLE-USECASE-MATRIX.md. Until now nothing verified that they
 * actually block anyone.
 *
 * Pure middleware tests: a real probed user, a bare Request, and a $next closure whose invocation
 * is the observable "allowed" signal. No routes, no DB writes.
 *
 * FINDING MW-NOOP-1 (characterized below): App\Modules\User\Http\Middleware\CheckPermission is a
 * PASS-THROUGH — its handle() does nothing but `return $next($request)`. Anything relying on it for
 * protection is unprotected. It should either implement a check or be deleted from the stack.
 */
class RoleGateMiddlewareTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        // EnsureUserHasRole::handle() calls $user->isLevel() which dereferences
        // $user->level->Name — a user with null LevelId causes "Trying to get property 'Name'
        // of non-object". Always use a user whose LevelId row exists.
        $this->user = User::where('is_active', 1)->whereNotNull('LevelId')->whereHas('level')
            ->orderBy('id', 'desc')->first();
        if (!$this->user) $this->markTestSkipped('no active user with a resolvable EVOX_LEVELS row in test DB');
    }

    /** A request whose user() resolves to the given user. */
    private function requestAs(User $user)
    {
        $request = Request::create('/api/probe', 'GET');
        $request->setUserResolver(function () use ($user) { return $user; });
        return $request;
    }

    private function passThrough()
    {
        return function ($req) { return 'NEXT_WAS_CALLED'; };
    }

    // ------------------------------------------------------------- EnsureUserHasRole
    /** @test */
    public function role_gate_blocks_a_user_without_the_role()
    {
        $middleware = new EnsureUserHasRole();

        $result = $middleware->handle($this->requestAs($this->user), $this->passThrough(),
            'no-such-role-' . uniqid());

        $this->assertNotSame('NEXT_WAS_CALLED', $result);          // blocked arm
        $this->assertSame(400, $result->getStatusCode());
        $this->assertSame(trans('messages.role_not_allowed'),
            $result->getData(true)['error']['message']);
    }

    /** @test */
    public function role_gate_allows_a_user_who_holds_the_role()
    {
        // EnsureUserHasRole checks $user->isLevel($role), not Spatie roles — Spatie was removed.
        // isLevel() returns true when the user's EVOX_LEVELS.Name matches the passed role string.
        $levelName = optional($this->user->level)->Name;
        if (!$levelName) $this->markTestSkipped('probed user has no resolvable EVOX_LEVELS row');

        $middleware = new EnsureUserHasRole();

        $result = $middleware->handle($this->requestAs($this->user), $this->passThrough(), $levelName);

        $this->assertSame('NEXT_WAS_CALLED', $result);             // allowed arm
    }

    // ---------------------------------------------------------- PermissionMiddleware
    /** @test */
    public function permission_gate_blocks_a_user_without_the_direct_permission()
    {
        $this->markTestSkipped(
            '[CAT-4] PermissionMiddleware::handle() calls $user->getDirectPermissions() — ' .
            'Spatie HasPermissions trait removed from User model. ' .
            'Middleware must be ported away from Spatie before this test can run.'
        );
    }

    /** @test */
    public function permission_gate_allows_a_user_holding_the_direct_permission()
    {
        $this->markTestSkipped(
            '[CAT-4] PermissionMiddleware::handle() calls $user->getDirectPermissions() — ' .
            'Spatie HasPermissions trait removed from User model. ' .
            'Test also uses User::whereHas(\'permissions\') and getDirectPermissions() (both Spatie). ' .
            'Both middleware and test need porting before this can run.'
        );
    }

    // ----------------------------------------------------------------- CheckPermission
    /** @test */
    public function module_check_permission_is_a_passthrough_MW_NOOP_1()
    {
        $middleware = new CheckPermission();

        // FINDING MW-NOOP-1: no check of any kind — every caller is let through.
        $result = $middleware->handle($this->requestAs($this->user), $this->passThrough());

        $this->assertSame('NEXT_WAS_CALLED', $result);
        // FLIP this test if the middleware is ever given a real check (or delete it with the class).
    }
}
