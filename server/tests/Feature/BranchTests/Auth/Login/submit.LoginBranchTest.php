<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for AuthController::login / loginMobile /
 * logout submit arms + the pre-call validation arms of authenticateClient / authenticateMSClient.
 * Menu=Auth Page=Login.
 *
 * Source of truth (LATEST only):
 *   ...\coverage-max\latest-code\server\app\Modules\User\Http\Controllers\AuthController.php
 * Routes (module prefix `auth`, mounted under /api):
 *   POST /api/auth/login                 -> login()
 *   POST /api/auth/login-mobile          -> loginMobile()
 *   POST /api/auth/logout                -> logout()
 *   GET  /api/auth/authenticate-client   -> authenticateClient()      (documented-only, see below)
 *   GET  /api/auth/authenticate-ms-client-> authenticateMSClient()    (documented-only, see below)
 *
 * Response shapes (verified against app/Helpers/api_response_helper.php):
 *   success_response => 200 {message, content}
 *   error_response   => {error:{message, content}} at the passed status.
 * Both constructor deps (PayrollCutoffRepositoryInterface, BhrRepositoryInterface) are IoC-mocked
 * in setUp so no real repo resolves; every covered (pre-SP) arm short-circuits before they are used.
 *
 * // FINDING: 401-vs-404 INCONSISTENCY on the identical "existing user + wrong password" arm.
 *   login()       bad password -> error_response(..., HTTP_UNAUTHORIZED = 401)   [line 78]
 *   loginMobile() bad password -> error_response(..., HTTP_NOT_FOUND    = 404)   [line 149]
 *   Same branch, two different status codes. Tests below assert the ACTUAL code each returns.
 *
 * SKIPPED arms (project safety rules: no call_sp, no external OAuth/HTTP, no destructive writes,
 * DatabaseTransactions only, cannot mutate the live-dump DB):
 *   - login()/loginMobile() SUCCESS arm -> get_default_payload() -> call_sp('EV_SP_Get_HR_Users')
 *     + $this->bhr->get_user()/get_profile_picture() (real SP + external BHR).  // SKIPPED-SP / SKIPPED-EXTERNAL
 *   - login()/loginMobile() INACTIVE-user arm (`if(!auth()->user()->is_active)` + termination_date)
 *     -> only reachable AFTER auth()->attempt() SUCCEEDS (needs a real known-good password + JWT)
 *     and the fixture user is active; cannot force is_active=0 without a DB mutation.  // SKIPPED-DESTRUCTIVE
 *   - login()/loginMobile() catch(Exception) arm -> every statement in the try before the SP path
 *     either cannot throw (request/filter_var/exists/auth()->attempt) or lies past call_sp; the two
 *     IoC-mocked repos are only touched inside get_default_payload (post-SP). No clean pre-SP
 *     trigger exists without reaching call_sp/success. Catch is reachable in principle but not
 *     safely triggerable here.  // SKIPPED (unreachable without SP/success)
 *   - logout() catch(Exception) arm -> body only calls log_* helpers + auth()->logout(); under
 *     PHP 7.4 a null user yields notices (not Exceptions), so no clean trigger.  // SKIPPED (not triggerable)
 *   - authenticateClient(): has NO safely-coverable pre-SP validation branch. `$user=auth()->user();
 *     auth()->logout(); if(!$token=auth()->login($user))` -> for a valid active fixture user
 *     auth()->login() ALWAYS returns a token, so the 404 arm is effectively dead
 *     (// FINDING: dead branch — the only way past it leads straight into get_default_payload()->
 *     call_sp). The inactive arm needs is_active=0 (DB mutation). Success -> call_sp.  // SKIPPED-SP
 *   - authenticateMSClient(): the FIRST executable statement after reading config is
 *     ms_get_access_token(...) (real Microsoft OAuth HTTP call); EVERY branch (403 token fail,
 *     404 me/user-not-found, login fail, inactive, success) sits AFTER that external call, so there
 *     is NO pre-external validation branch to cover.  // SKIPPED-EXTERNAL (whole method)
 */

namespace Tests\Feature\BranchTests\Auth\Login;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;

class LoginSubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();            // reach controller bodies past jwtauth/auth.apikey/api.calctime
        $this->user = User::where('is_active', 1)->first();
        if (!$this->user) {
            $this->markTestIncomplete('no active user in test DB');
        }
        // IoC-mock BOTH constructor deps so no real repo is resolved. Covered arms never call
        // them (they short-circuit before get_default_payload); no expectations are set.
        $this->app->instance(PayrollCutoffRepositoryInterface::class, Mockery::mock(PayrollCutoffRepositoryInterface::class));
        $this->app->instance(BhrRepositoryInterface::class, Mockery::mock(BhrRepositoryInterface::class));
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // ==================================================================== login()

    // Branch: empty username/password -> `if (empty(...))` -> error_response 422 (before any DB/auth)
    /** @test */
    public function login__submit__empty_credentials__error_422()
    {
        $res = $this->postJson('/api/auth/login', ['username' => '', 'password' => '']);

        $res->assertStatus(422)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: username IS an e-mail (credIsEmail=true) that does not exist -> 404 user_email_not_found
    /** @test */
    public function login__submit__email_not_found__error_404()
    {
        $res = $this->postJson('/api/auth/login', [
            'username' => 'no-such-user-987654@example.invalid',
            'password' => 'whatever',
        ]);

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: username is NOT an e-mail (credIsEmail=false) and does not exist -> 404 user_name_not_found
    /** @test */
    public function login__submit__username_not_found__error_404()
    {
        $res = $this->postJson('/api/auth/login', [
            'username' => 'no_such_username_987654',
            'password' => 'whatever',
        ]);

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: existing e-mail + wrong password -> auth()->attempt() false -> 401 user_password_incorrect
    // (uses the fixture user's real e-mail so exists() passes; auth()->attempt returns false so no
    // token/SP is ever reached). // FINDING: login() returns 401 here; loginMobile() returns 404.
    /** @test */
    public function login__submit__bad_password__error_401()
    {
        $res = $this->postJson('/api/auth/login', [
            'username' => $this->user->email,
            'password' => 'definitely-not-the-real-password-xyz',
        ]);

        $res->assertStatus(401)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ============================================================== loginMobile()

    // Branch: empty username/password -> error_response 422
    /** @test */
    public function loginMobile__submit__empty_credentials__error_422()
    {
        $res = $this->postJson('/api/auth/login-mobile', ['username' => '', 'password' => '']);

        $res->assertStatus(422)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: e-mail that does not exist -> 404 user_email_not_found
    /** @test */
    public function loginMobile__submit__email_not_found__error_404()
    {
        $res = $this->postJson('/api/auth/login-mobile', [
            'username' => 'no-such-user-987654@example.invalid',
            'password' => 'whatever',
        ]);

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: non-e-mail username that does not exist -> 404 user_name_not_found
    /** @test */
    public function loginMobile__submit__username_not_found__error_404()
    {
        $res = $this->postJson('/api/auth/login-mobile', [
            'username' => 'no_such_username_987654',
            'password' => 'whatever',
        ]);

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // Branch: existing e-mail + wrong password -> auth()->attempt() false -> 404 (HTTP_NOT_FOUND).
    // // FINDING: identical arm to login() but loginMobile() passes HTTP_NOT_FOUND (404) instead of 401.
    /** @test */
    public function loginMobile__submit__bad_password__error_404()
    {
        $res = $this->postJson('/api/auth/login-mobile', [
            'username' => $this->user->email,
            'password' => 'definitely-not-the-real-password-xyz',
        ]);

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // =================================================================== logout()

    // Branch: try succeeds -> log_* helpers (DB writes roll back under DatabaseTransactions; no SP,
    // no external) + auth()->logout() -> success_response 200 {message,content}.
    // (catch arm SKIPPED — not cleanly triggerable, see file docblock.)
    /** @test */
    public function logout__submit__success__ok_200()
    {
        // logout() ends in auth()->logout() -> (jwt guard) requireToken()->invalidate(), which needs
        // a PARSEABLE JWT on the request. actingAs() sets the user object but NOT a token, so
        // requireToken() throws JWTException -> catch -> error_response(HTTP_BAD_REQUEST=400).
        // Mint a real token for the SAME existing active fixture user (no DB mutation — invalidate()
        // only blacklists in the JWT store) and pass it as the Bearer header. The guard then resolves
        // the user (log_to_audit_trail's auth()->user()->id works) AND requireToken() succeeds -> 200.
        $token = auth()->login($this->user);

        $res = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
                    ->postJson('/api/auth/logout', ['session_id' => 1]);

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // ====================================================== authenticateClient()
    // authenticateMSClient()
    // No safely-coverable pre-SP / pre-external validation branch exists for either method
    // (see file docblock: authenticateClient() 404 arm is dead + success hits call_sp;
    //  authenticateMSClient() has no branch before ms_get_access_token()). Documented-only,
    // intentionally no executed test.  // SKIPPED-SP / SKIPPED-EXTERNAL
}
