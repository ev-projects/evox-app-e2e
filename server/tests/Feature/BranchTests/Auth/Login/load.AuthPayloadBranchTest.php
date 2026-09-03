<?php
/**
 * COVERAGE WAVE 2026-08-18 — AuthController::authenticateClient(), authenticateMSClient() and
 * payload(). All three were previously documented as "no safely coverable arm" because
 * authenticateMSClient() has NO branch before the live Microsoft OAuth call and the other two run
 * straight into the SP-backed get_default_payload().
 *
 * Both walls are now seams:
 *   Support/CallSpFake.php          — call_sp() in App\Modules\User\Http\Controllers + ...\Models
 *   Support/UserModuleHelperFake.php — ms_get_access_token() / ms_call_api() in the controller
 *                                      namespace. Once active they NEVER touch the network; an
 *                                      un-stubbed MS call throws instead of dialling Microsoft.
 *
 * Source under test:
 *   server/app/Modules/User/Http/Controllers/AuthController.php
 *   (authenticateClient, authenticateMSClient, payload, and the private get_default_payload
 *    reached from AuthController.php:225 and :335)
 * Menu -> Page:  Auth -> Login (SSO + session payload)
 * Routes (app/Modules/User/Routes/api.php, mounted under /api):
 *   GET  /api/auth/authenticate-client
 *   GET  /api/auth/authenticate-ms-client
 *   POST /api/auth/payload
 *
 * Coverage before this file: authenticateClient 68.75%, authenticateMSClient 45.71%, payload 66.67%.
 *
 * Every route here needs a PARSEABLE JWT on the request, not just an authenticated user:
 * get_default_payload() calls auth()->payload() and authenticateClient() calls auth()->logout(),
 * and both go through JWTGuard::requireToken(). actingAs() sets the user but no token, so a real
 * throwaway token is minted for the fixture and sent as a Bearer header (same technique as the
 * logout test in submit.LoginBranchTest.php).
 *
 * FINDINGS raised by this file:
 *   F-AUTH-MS-NOPAYLOAD  authenticateMSClient() returns ONLY the token triple — it never calls
 *                        get_default_payload(), unlike login/loginMobile/authenticateClient. A
 *                        client signing in through Microsoft therefore gets no user/settings block
 *                        and must fetch /api/auth/payload separately. Characterised below.
 *   F-AUTH-CLIENT-DEAD   authenticateClient()'s `if (!$token = auth()->login($user))` 404 arm is
 *                        unreachable: auth()->login() returns a signed token for any User instance.
 *                        Same for the identical line in authenticateMSClient(). Not testable.
 */

namespace Tests\Feature\BranchTests\Auth\Login;

require_once __DIR__ . '/../../Support/CallSpFake.php';
require_once __DIR__ . '/../../Support/UserModuleHelperFake.php';

use Carbon\Carbon;
use Exception;
use Mockery;
use Tests\TestCase;
use Tests\Support\CallSpFake;
use Tests\Support\UserModuleHelperFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;

class AuthPayloadLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $template;
    /** @var \Mockery\MockInterface */
    private $bhr;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();

        CallSpFake::activate();
        CallSpFake::fake('EV_SP_Get_HR_Users', [[(object) ['id' => 1, 'full_name' => 'HR One']]]);
        CallSpFake::fake('EH_SP_Get_Department_By_UserId', [[
            (object) ['Id' => 1, 'Name' => 'Delivery', 'SubDepartment' => 'Delivery Ops'],
        ]]);
        CallSpFake::fake('EV_SP_NHO_Validate_User', [[(object) ['Result' => 0]]]);

        UserModuleHelperFake::activate();

        $this->template = User::whereNotNull('bhr_num')
            ->whereNotNull('country_id')
            ->whereNotNull('LevelId')
            ->whereNotNull('SubDepartmentID')
            ->where('is_active', 1)
            ->orderBy('id', 'desc')
            ->first();

        if (!$this->template) {
            $this->markTestSkipped('no fully-populated active user to replicate in test DB');
        }

        $this->bhr = Mockery::mock(BhrRepositoryInterface::class);
        $this->bhr->shouldReceive('get_user')->andReturn(null)->byDefault();
        $this->bhr->shouldReceive('get_profile_picture')->andReturn(null)->byDefault();
        $this->app->instance(BhrRepositoryInterface::class, $this->bhr);

        $payroll = Mockery::mock(PayrollCutoffRepositoryInterface::class);
        $payroll->shouldReceive('get_payroll_cutoff')->andReturn((object) [
            'id' => 4242, 'name' => 'Seam Cutoff',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-15',
        ])->byDefault();
        $this->app->instance(PayrollCutoffRepositoryInterface::class, $payroll);
    }

    protected function tearDown(): void
    {
        UserModuleHelperFake::reset();
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    /** Throwaway login-able copy of a real user; created inside the transaction, rolled back after. */
    private function fixture(array $overrides = [])
    {
        $uniq = substr(uniqid(), -8);
        $user = $this->template->replicate();
        $user->email = 'msbranch+' . $uniq . '@example.invalid';
        $user->username = 'msbranch_' . $uniq;
        $user->emp_num = 'MB' . $uniq;
        $user->bhr_num = 'MB' . $uniq;
        $user->password = Hash::make('SeamPass-2026!');
        $user->is_active = 1;
        $user->termination_date = null;

        foreach ($overrides as $column => $value) {
            $user->{$column} = $value;
        }

        $user->save();

        return $user;
    }

    private function asUser(User $user)
    {
        return $this->withHeaders(['Authorization' => 'Bearer ' . auth()->login($user)]);
    }

    // ========================================================== authenticateClient()

    /**
     * The Google/SSO hand-off: the caller arrives with a token, the controller re-issues a fresh one
     * and answers with the full default payload (profile + constants + settings).
     */
    /** @test */
    public function authenticateClient__load__active_user__reissues_a_token_with_the_full_payload()
    {
        $user = $this->fixture();

        $res = $this->asUser($user)->getJson('/api/auth/authenticate-client');

        $res->assertStatus(200);
        $this->assertSame(trans('messages.login_success'), $res->json('message'));
        $this->assertSame('bearer', $res->json('content.token_type'));
        $this->assertCount(3, explode('.', $res->json('content.access_token')));
        $this->assertSame($user->id, $res->json('content.user.id'));
        $this->assertSame('HR One', $res->json('content.settings.hr_list.0.full_name'));
        $this->assertSame(4242, $res->json('content.settings.current_payroll_cutoff_ph.id'));
    }

    /** A deactivated account with no end date on file cannot complete the SSO hand-off. */
    /** @test */
    public function authenticateClient__load__inactive_user__rejected_404()
    {
        $user = $this->fixture(['is_active' => 0, 'termination_date' => null]);

        $res = $this->asUser($user)->getJson('/api/auth/authenticate-client');

        $res->assertStatus(404);
        $this->assertSame(trans('messages.user_not_active'), $res->json('error.message'));
    }

    /** Other arm: still inside the notice period, so the hand-off completes. */
    /** @test */
    public function authenticateClient__load__inactive_but_not_yet_terminated__still_reissues()
    {
        $user = $this->fixture([
            'is_active' => 0,
            'termination_date' => Carbon::today()->addDays(5)->format('Y-m-d'),
        ]);

        $res = $this->asUser($user)->getJson('/api/auth/authenticate-client');

        $res->assertStatus(200);
        $this->assertSame($user->id, $res->json('content.user.id'));
    }

    /** @test */
    public function authenticateClient__load__payload_failure__error_400()
    {
        $user = $this->fixture();
        $this->bhr->shouldReceive('get_user')->andThrow(new Exception('bhr unreachable'));

        $res = $this->asUser($user)->getJson('/api/auth/authenticate-client');

        $res->assertStatus(400);
        $this->assertSame('bhr unreachable', $res->json('error.content'));
    }

    // ======================================================== authenticateMSClient()

    /** The authorization code is exchanged with the tenant, then Graph /me identifies the user. */
    /** @test */
    public function authenticateMSClient__load__known_ms_account__signs_the_user_in()
    {
        $user = $this->fixture();
        UserModuleHelperFake::msAccessToken((object) ['access_token' => 'ms-access-token']);
        UserModuleHelperFake::msApiResult((object) ['mail' => $user->email]);

        $res = $this->getJson('/api/auth/authenticate-ms-client?code=auth-code-123');

        $res->assertStatus(200);
        $this->assertSame(trans('messages.login_success'), $res->json('message'));
        $this->assertSame('bearer', $res->json('content.token_type'));
        $this->assertCount(3, explode('.', $res->json('content.access_token')));

        // the authorization code from the query string is what gets exchanged
        $exchange = UserModuleHelperFake::callsFor('ms_get_access_token');
        $this->assertCount(1, $exchange);
        $this->assertSame('auth-code-123', $exchange[0]['args'][1]['code']);
        $this->assertSame('authorization_code', $exchange[0]['args'][1]['grant_type']);
        $this->assertSame('User.Read', $exchange[0]['args'][1]['scope']);

        // Graph is read with the freshly issued token
        $graph = UserModuleHelperFake::callsFor('ms_call_api');
        $this->assertSame(['ms-access-token', 'GET', 'me'],
            [$graph[0]['args'][0], $graph[0]['args'][1], $graph[0]['args'][2]]);
    }

    /**
     * F-AUTH-MS-NOPAYLOAD — characterises today's behaviour: unlike login()/loginMobile()/
     * authenticateClient(), the Microsoft arm never calls get_default_payload(), so the response
     * carries no user, constant or settings block. Flip these assertions if that is ever fixed.
     */
    /** @test */
    public function authenticateMSClient__load__success_response_omits_the_default_payload_FINDING_F_AUTH_MS_NOPAYLOAD()
    {
        $user = $this->fixture();
        UserModuleHelperFake::msAccessToken((object) ['access_token' => 'ms-access-token']);
        UserModuleHelperFake::msApiResult((object) ['mail' => $user->email]);

        $res = $this->getJson('/api/auth/authenticate-ms-client?code=auth-code-123');

        $res->assertStatus(200);
        $this->assertNull($res->json('content.user'));
        $this->assertNull($res->json('content.settings'));
        $this->assertNull($res->json('content.constant'));
        $this->assertSame([], CallSpFake::callsFor('EV_SP_Get_HR_Users'));
    }

    /** The tenant refused the code exchange outright. */
    /** @test */
    public function authenticateMSClient__load__token_exchange_returns_nothing__error_403()
    {
        UserModuleHelperFake::msAccessToken(null);

        $res = $this->getJson('/api/auth/authenticate-ms-client?code=bad-code');

        $res->assertStatus(403);
        $this->assertSame('Microsoft login failed, please try again. 1', $res->json('error.message'));
    }

    /** Second half of the same guard: a response body that carries no access_token. */
    /** @test */
    public function authenticateMSClient__load__token_response_without_access_token__error_403()
    {
        UserModuleHelperFake::msAccessToken((object) ['error' => 'invalid_grant']);

        $res = $this->getJson('/api/auth/authenticate-ms-client?code=expired-code');

        $res->assertStatus(403);
        $this->assertSame('Microsoft login failed, please try again. 1', $res->json('error.message'));
        $this->assertSame([], UserModuleHelperFake::callsFor('ms_call_api'));   // Graph never called
    }

    /** The code was exchanged but Graph would not identify the caller. */
    /** @test */
    public function authenticateMSClient__load__graph_me_call_fails__error_404()
    {
        UserModuleHelperFake::msAccessToken((object) ['access_token' => 'ms-access-token']);
        UserModuleHelperFake::msApiResult(null);

        $res = $this->getJson('/api/auth/authenticate-ms-client?code=auth-code-123');

        $res->assertStatus(404);
        $this->assertSame('Microsoft login failed, please try again. 2', $res->json('error.message'));
    }

    /** A valid Microsoft identity that has no EVOX account. */
    /** @test */
    public function authenticateMSClient__load__ms_account_not_in_evox__error_404()
    {
        UserModuleHelperFake::msAccessToken((object) ['access_token' => 'ms-access-token']);
        UserModuleHelperFake::msApiResult((object) ['mail' => 'nobody+' . uniqid() . '@example.invalid']);

        $res = $this->getJson('/api/auth/authenticate-ms-client?code=auth-code-123');

        $res->assertStatus(404);
        $this->assertSame(trans('messages.user_email_not_found'), $res->json('error.message'));
    }

    /** @test */
    public function authenticateMSClient__load__deactivated_evox_account__rejected_404()
    {
        $user = $this->fixture(['is_active' => 0, 'termination_date' => null]);
        UserModuleHelperFake::msAccessToken((object) ['access_token' => 'ms-access-token']);
        UserModuleHelperFake::msApiResult((object) ['mail' => $user->email]);

        $res = $this->getJson('/api/auth/authenticate-ms-client?code=auth-code-123');

        $res->assertStatus(404);
        $this->assertSame(trans('messages.user_not_active'), $res->json('error.message'));
    }

    /** Other arm: deactivated but still inside the notice period, so Microsoft sign-in succeeds. */
    /** @test */
    public function authenticateMSClient__load__deactivated_before_termination_date__signs_in()
    {
        $user = $this->fixture([
            'is_active' => 0,
            'termination_date' => Carbon::today()->addDays(5)->format('Y-m-d'),
        ]);
        UserModuleHelperFake::msAccessToken((object) ['access_token' => 'ms-access-token']);
        UserModuleHelperFake::msApiResult((object) ['mail' => $user->email]);

        $res = $this->getJson('/api/auth/authenticate-ms-client?code=auth-code-123');

        $res->assertStatus(200);
        $this->assertNotEmpty($res->json('content.access_token'));
    }

    /** A transport failure during the code exchange degrades to the 400 envelope, not a 500. */
    /** @test */
    public function authenticateMSClient__load__token_exchange_throws__error_400()
    {
        UserModuleHelperFake::msAccessTokenThrows(new Exception('curl timeout to login.microsoftonline.com'));

        $res = $this->getJson('/api/auth/authenticate-ms-client?code=auth-code-123');

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
        $this->assertSame('curl timeout to login.microsoftonline.com', $res->json('error.content'));
    }

    // ===================================================================== payload()

    /** The page-refresh endpoint: no credentials exchanged, just the default payload rebuilt. */
    /** @test */
    public function payload__load__authenticated__returns_the_default_payload()
    {
        $user = $this->fixture();

        $res = $this->asUser($user)->postJson('/api/auth/payload');

        $res->assertStatus(200);
        $this->assertSame(trans('messages.payload_success'), $res->json('message'));
        $this->assertSame($user->id, $res->json('content.user.id'));
        $this->assertEquals($user->id, $res->json('content.payload.sub'));
        $this->assertNotEmpty($res->json('content.constant'));
        $this->assertSame('HR One', $res->json('content.settings.hr_list.0.full_name'));
        $this->assertSame(4242, $res->json('content.settings.current_payroll_cutoff_ph.id'));
        // payload() mints nothing — it only describes the session it was called with
        $this->assertNull($res->json('content.access_token'));
    }

    /** @test */
    public function payload__load__bhr_failure__error_400()
    {
        $user = $this->fixture();
        $this->bhr->shouldReceive('get_user')->andThrow(new Exception('bhr unreachable'));

        $res = $this->asUser($user)->postJson('/api/auth/payload');

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
        $this->assertSame('bhr unreachable', $res->json('error.content'));
    }
}
