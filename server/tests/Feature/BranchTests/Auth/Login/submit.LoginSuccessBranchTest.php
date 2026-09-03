<?php
/**
 * COVERAGE WAVE 2026-08-18 — the residue of AuthController::login() / loginMobile() that
 * submit.LoginBranchTest.php could not reach: the SUCCESS arm (which runs the private
 * get_default_payload()), the three termination_date arms of the "user is not active" gate, and
 * the catch arm.
 *
 * Source under test:
 *   server/app/Modules/User/Http/Controllers/AuthController.php  (login, loginMobile,
 *   get_default_payload — private, reached from AuthController.php:104 and :182)
 * Menu -> Page:  Auth -> Login
 * Routes (app/Modules/User/Routes/api.php, mounted under /api):
 *   POST /api/auth/login          -> login()
 *   POST /api/auth/login-mobile   -> loginMobile()
 *
 * Coverage before this file: login 93.94% of lines, loginMobile 88.24%.
 *
 * HOW THE SUCCESS ARM IS MADE SAFE
 *   - Both constructor deps are IoC-mocked: BhrRepositoryInterface (no BambooHR HTTP) and
 *     PayrollCutoffRepositoryInterface (returns a canned cutoff object so PayrollCutoffResource
 *     renders a non-null payload we can assert on).
 *   - Support/CallSpFake.php shadows call_sp() in App\Modules\User\Http\Controllers AND
 *     App\Modules\User\Models, so EV_SP_Get_HR_Users (payload) plus the three SPs that
 *     UserProfileResource triggers while the response serialises are faked. No SP runs.
 *   - The login fixture is a REPLICA of a real active user (so every NOT NULL column, country_id,
 *     LevelId and SubDepartmentID are already valid) with a fresh e-mail/username/emp_num/bhr_num
 *     and a password we set. It is created inside the DatabaseTransactions transaction and rolls
 *     back; no existing row is ever modified.
 *
 * FINDINGS (see file end + the report):
 *   F-AUTH-MOBILE-401  loginMobile() returns 404 where login() returns 401 for a wrong password
 *                      (already registered by the earlier suite; not re-asserted here).
 */

namespace Tests\Feature\BranchTests\Auth\Login;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Carbon\Carbon;
use Exception;
use Mockery;
use Tests\TestCase;
use Tests\Support\CallSpFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\User\Models\User;
use App\Modules\User\Models\UtcTimelog;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;

class LoginSuccessSubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    const PASSWORD = 'SeamPass-2026!';

    /** @var User */
    private $template;
    /** @var \Mockery\MockInterface */
    private $bhr;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();               // past auth.apikey / api.calctime

        CallSpFake::activate();
        $this->fakePayloadStoredProcedures();

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
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    /** The four SPs the login payload reaches: one from the controller, three from UserProfileResource. */
    private function fakePayloadStoredProcedures()
    {
        CallSpFake::fake('EV_SP_Get_HR_Users', [[(object) ['id' => 1, 'full_name' => 'HR One']]]);
        CallSpFake::fake('EH_SP_Get_Department_By_UserId', [[
            (object) ['Id' => 1, 'Name' => 'Delivery', 'SubDepartment' => 'Delivery Ops'],
        ]]);
        CallSpFake::fake('EV_SP_NHO_Validate_User', [[(object) ['Result' => 0]]]);
        CallSpFake::fake('EH_SP_Employee_List', [[], [(object) ['CurrentPage' => 1]]]);
    }

    /**
     * A throwaway login-able copy of a real user. Every column that the payload touches is inherited;
     * only identity, password and the activity flags are overwritten. Rolls back with the test.
     */
    private function loginFixture(array $overrides = [])
    {
        $uniq = substr(uniqid(), -8);
        $user = $this->template->replicate();
        $user->email = 'branchtest+' . $uniq . '@example.invalid';
        $user->username = 'branchtest_' . $uniq;
        $user->emp_num = 'BT' . $uniq;
        $user->bhr_num = 'BT' . $uniq;
        $user->password = Hash::make(self::PASSWORD);
        $user->is_active = 1;
        $user->termination_date = null;
        $user->force_change_password = false;

        foreach ($overrides as $column => $value) {
            $user->{$column} = $value;
        }

        $user->save();

        return $user;
    }

    private function login(User $user, $uri = '/api/auth/login')
    {
        return $this->postJson($uri, [
            'username' => $user->email,
            'password' => self::PASSWORD,
        ]);
    }

    // ==================================================================== login() success

    /**
     * The success arm end to end: a token is minted, the session id is echoed back, and
     * get_default_payload() attaches the profile, the JWT claims, the constants and the settings
     * block (HR list from EV_SP_Get_HR_Users, cutoffs from the payroll repository).
     */
    /** @test */
    public function login__submit__valid_credentials__returns_token_and_the_default_payload()
    {
        $user = $this->loginFixture();

        $res = $this->login($user);

        $res->assertStatus(200);
        $this->assertSame('bearer', $res->json('content.token_type'));
        $this->assertNotEmpty($res->json('content.access_token'));
        $this->assertCount(3, explode('.', $res->json('content.access_token')));   // a real JWT
        $this->assertSame(auth()->factory()->getTTL() * 60, $res->json('content.expires_in'));
        $this->assertNotEmpty($res->json('content.session_id'));

        // get_default_payload() blocks
        $this->assertSame($user->id, $res->json('content.user.id'));
        $this->assertSame($user->email, $res->json('content.user.email'));
        $this->assertEquals($user->id, $res->json('content.payload.sub'));   // JWT subject claim
        $this->assertNotEmpty($res->json('content.constant'));
        $this->assertSame('HR One', $res->json('content.settings.hr_list.0.full_name'));
        $this->assertSame(4242, $res->json('content.settings.current_payroll_cutoff_ph.id'));
        $this->assertNotNull($res->json('content.settings.countries'));

        // the SP is asked for the HR list exactly once per login
        $this->assertCount(1, CallSpFake::callsFor('EV_SP_Get_HR_Users'));
    }

    /** A Philippine user is labelled "philippines" and is served the PH payroll cutoff. */
    /** @test */
    public function login__submit__philippine_user__gets_the_ph_cutoff_and_country_label()
    {
        if (!UtcTimelog::where('country_id', 2)->exists()) {
            $this->markTestSkipped('no Philippines row in UTC_TimeLogs');
        }
        $user = $this->loginFixture(['country_id' => 2]);

        $res = $this->login($user);

        $res->assertStatus(200);
        $this->assertSame('philippines', $res->json('content.settings.country'));
        $this->assertEquals(
            $res->json('content.settings.current_payroll_cutoff_ph'),
            $res->json('content.settings.current_payroll_cutoff')
        );
    }

    /** The other arm of the same ternary: India (country_id 1) is served the India/Morocco cutoff. */
    /** @test */
    public function login__submit__india_user__gets_the_india_cutoff_and_no_country_label()
    {
        if (!UtcTimelog::where('country_id', 1)->exists()) {
            $this->markTestSkipped('no India row in UTC_TimeLogs');
        }
        $user = $this->loginFixture(['country_id' => 1]);

        $res = $this->login($user);

        $res->assertStatus(200);
        $this->assertSame('', $res->json('content.settings.country'));
        $this->assertEquals(
            $res->json('content.settings.current_payroll_cutoff_in_mar'),
            $res->json('content.settings.current_payroll_cutoff')
        );
        $this->assertNotEquals(
            $res->json('content.settings.current_payroll_cutoff_ph'),
            $res->json('content.settings.current_payroll_cutoff')
        );
    }

    // ============================================================ login() is_active gate

    /** Deactivated with no end date on file — treated as already terminated (the F1 fix). */
    /** @test */
    public function login__submit__inactive_user_without_termination_date__rejected_404()
    {
        $user = $this->loginFixture(['is_active' => 0, 'termination_date' => null]);

        $res = $this->login($user);

        $res->assertStatus(404);
        $this->assertSame(trans('messages.user_not_active'), $res->json('error.message'));
    }

    /** Deactivated and the grace day after the end date has passed — rejected. */
    /** @test */
    public function login__submit__inactive_user_past_the_termination_grace_day__rejected_404()
    {
        $user = $this->loginFixture([
            'is_active' => 0,
            'termination_date' => Carbon::today()->subDays(30)->format('Y-m-d'),
        ]);

        $res = $this->login($user);

        $res->assertStatus(404);
        $this->assertSame(trans('messages.user_not_active'), $res->json('error.message'));
    }

    /**
     * The other arm of that gate: deactivated but the end date is still ahead, so the leaver keeps
     * access — the request falls through the gate and gets a normal token + payload.
     */
    /** @test */
    public function login__submit__inactive_user_before_the_termination_date__still_signs_in()
    {
        $user = $this->loginFixture([
            'is_active' => 0,
            'termination_date' => Carbon::today()->addDays(5)->format('Y-m-d'),
        ]);

        $res = $this->login($user);

        $res->assertStatus(200);
        $this->assertNotEmpty($res->json('content.access_token'));
        $this->assertSame($user->id, $res->json('content.user.id'));
    }

    // ==================================================================== login() catch

    /** A BHR outage inside get_default_payload() degrades to the 400 envelope, not a 500. */
    /** @test */
    public function login__submit__bhr_failure_inside_the_payload__error_400()
    {
        $user = $this->loginFixture();
        $this->bhr->shouldReceive('get_user')->andThrow(new Exception('bhr unreachable'));

        $res = $this->login($user);

        $res->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $res->json('error.message'));
        $this->assertSame('bhr unreachable', $res->json('error.content'));
    }

    // ============================================================== loginMobile() arms

    /**
     * The mobile success arm additionally writes a login_logs row (the web login does not) before
     * building the same payload.
     */
    /** @test */
    public function loginMobile__submit__valid_credentials__logs_the_login_and_returns_the_payload()
    {
        $user = $this->loginFixture();
        $before = DB::table('login_logs')->where('user_id', $user->id)->count();

        $res = $this->login($user, '/api/auth/login-mobile');

        $res->assertStatus(200);
        $this->assertNotEmpty($res->json('content.access_token'));
        $this->assertSame($user->id, $res->json('content.user.id'));
        $this->assertSame('HR One', $res->json('content.settings.hr_list.0.full_name'));
        // the mobile-only side effect
        $this->assertSame($before + 1, DB::table('login_logs')->where('user_id', $user->id)->count());
        // ...and unlike login() the mobile payload carries no session id
        $this->assertNull($res->json('content.session_id'));
    }

    /** @test */
    public function loginMobile__submit__inactive_user_without_termination_date__rejected_404()
    {
        $user = $this->loginFixture(['is_active' => 0, 'termination_date' => null]);

        $res = $this->login($user, '/api/auth/login-mobile');

        $res->assertStatus(404);
        $this->assertSame(trans('messages.user_not_active'), $res->json('error.message'));
    }

    /** @test */
    public function loginMobile__submit__inactive_user_before_the_termination_date__still_signs_in()
    {
        $user = $this->loginFixture([
            'is_active' => 0,
            'termination_date' => Carbon::today()->addDays(5)->format('Y-m-d'),
        ]);

        $res = $this->login($user, '/api/auth/login-mobile');

        $res->assertStatus(200);
        $this->assertSame($user->id, $res->json('content.user.id'));
    }

    /** @test */
    public function loginMobile__submit__bhr_failure_inside_the_payload__error_400()
    {
        $user = $this->loginFixture();
        $this->bhr->shouldReceive('get_user')->andThrow(new Exception('bhr unreachable'));

        $res = $this->login($user, '/api/auth/login-mobile');

        $res->assertStatus(400);
        $this->assertSame('bhr unreachable', $res->json('error.content'));
    }
}
