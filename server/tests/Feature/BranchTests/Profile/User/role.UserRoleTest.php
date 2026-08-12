<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. ROLE-MATRIX branch tests for UserController admin-only / PII arms.
 * Menu=Profile Page=User.
 *
 * Exercises the AUTHORIZATION branch of each endpoint acting as DIFFERENT role accounts
 * (resolved by email from _ROLE-ACCOUNTS.md; a test self-skips if the account is absent).
 * Constructor-injected deps (UserRepositoryInterface, BhrRepositoryInterface, DtrRepositoryInterface)
 * are IoC-mocked so no real repo / DB / BHR / call_sp fires. withoutMiddleware() reaches the controller
 * body past jwt/apikey, so these tests assert what the CONTROLLER BODY itself enforces (nothing, in most
 * cases) rather than route middleware. success_response => 200 {message,content};
 * error_response default => 400 {error:{message,content}}; get_dpa_list catch passes HTTP_NOT_FOUND => 404.
 *
 * CONFIRMED FINDINGS (asserted as CURRENT reality; tests do NOT assert a fix):
 *  // FINDING [missing-gate]: get_dpa_list() / export_dpa_list() (admin "view all DPA" screens) have NO role gate
 *     in-method and NO role:* middleware on the route. A ph_employee reaches the same all-users DPA data as admin.
 *  // FINDING [IDOR]: personal_information() / time_off() / leave_credits() validate only that {id} is an int,
 *     then return THAT user's PII with NO ownership / supervisee check. Acting as ph_employee glenn, requesting
 *     ph_supervisor gary's {id} returns 200 with gary's PII exactly like requesting glenn's own {id}.
 *
 * Routes (module api.php mounted under /api):
 *   GET  /api/user/get_dpa_list                    -> get_dpa_list()
 *   GET  /api/user/export_dpa_list                 -> export_dpa_list()
 *   GET  /api/user/{id}/personal_information        -> personal_information()
 *   GET  /api/user/{id}/time_off/{start}/{end}      -> time_off()
 *   GET  /api/user/{id}/leave_credits               -> leave_credits()
 */

namespace Tests\Feature\BranchTests\Profile\User;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;

class UserRoleTest extends TestCase
{
    use DatabaseTransactions;

    // Role accounts (see _ROLE-ACCOUNTS.md). Resolve by email; skip if absent.
    const ADMIN        = 'dummyman@ops.eastvantage.com';        // Admin
    const PH_EMPLOYEE  = 'glenn.macasarte@eastvantage.com';     // PH Employee (self)
    const PH_SUPERVISOR = 'gary.aure@eastvantage.com';          // PH Supervisor (other user, glenn's supervisor)

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware(); // reach controller body past jwt/apikey; asserts IN-METHOD authz only
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** Resolve a role account by email or skip the test. */
    private function actor(string $email): User
    {
        $u = User::where('email', $email)->first();
        if (!$u) {
            $this->markTestIncomplete("role account absent: {$email}");
        }
        $this->actingAs($u);
        return $u;
    }

    /** Bind a Mockery mock for an interface into the IoC container. */
    private function mockDep(string $iface): \Mockery\MockInterface
    {
        $m = Mockery::mock($iface);
        $this->app->instance($iface, $m);
        return $m;
    }

    // =========================================================== get_dpa_list()
    // Admin "view all DPA". No in-method gate; no role:* middleware on route.

    /** @test  admin allowed to view the all-users DPA list. */
    public function get_dpa_list__role__admin__allowed_200()
    {
        $this->actor(self::ADMIN);
        $repo = $this->mockDep(UserRepositoryInterface::class);
        $repo->shouldReceive('get_dpa_list')->once()->andReturn([]);

        $res = $this->getJson('/api/user/get_dpa_list');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test  FINDING: ph_employee reaches the SAME all-users DPA list (no admin gate). */
    public function get_dpa_list__role__ph_employee__no_gate_allowed_200()
    {
        $this->actor(self::PH_EMPLOYEE);
        $repo = $this->mockDep(UserRepositoryInterface::class);
        $repo->shouldReceive('get_dpa_list')->once()->andReturn([]);

        $res = $this->getJson('/api/user/get_dpa_list');

        // FINDING: employee not scoped/blocked — identical access to admin.
        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // ======================================================== export_dpa_list()
    // No try/catch, no gate; both roles reach Excel::download of the all-users DPA export.

    /** @test  admin allowed to export the all-users DPA list. */
    public function export_dpa_list__role__admin__allowed_200()
    {
        $this->actor(self::ADMIN);
        $repo = $this->mockDep(UserRepositoryInterface::class);
        // export_dpa_list -> dpa_list() -> get_dpa_list(); ['data'=>[]] yields an empty (safe) export.
        $repo->shouldReceive('get_dpa_list')->once()->andReturn(['data' => []]);

        $res = $this->get('/api/user/export_dpa_list');

        $res->assertStatus(200);
    }

    /** @test  FINDING: ph_employee reaches the SAME all-users DPA export (no admin gate). */
    public function export_dpa_list__role__ph_employee__no_gate_allowed_200()
    {
        $this->actor(self::PH_EMPLOYEE);
        $repo = $this->mockDep(UserRepositoryInterface::class);
        $repo->shouldReceive('get_dpa_list')->once()->andReturn(['data' => []]);

        $res = $this->get('/api/user/export_dpa_list');

        // FINDING: employee can export every user's DPA status exactly like admin.
        $res->assertStatus(200);
    }

    // =================================================== personal_information() [IDOR]

    /** @test  ph_employee requesting their OWN {id} — allowed (baseline). */
    public function personal_information__role__ph_employee_own__allowed_200()
    {
        $glenn = $this->actor(self::PH_EMPLOYEE);

        $repo = $this->mockDep(UserRepositoryInterface::class);
        $repo->shouldReceive('show')->once()->andReturn((object) ['bhr_num' => 111]);
        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_user_bhr_field')->once()
            ->andReturn((object) ['mobilePhone' => '0917', 'jobTitle' => 'Engineer']);

        $res = $this->getJson("/api/user/{$glenn->id}/personal_information");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test  FINDING [IDOR]: ph_employee requesting ANOTHER user's {id} — still 200 (no ownership check). */
    public function personal_information__role__ph_employee_cross_user__idor_allowed_200()
    {
        $this->actor(self::PH_EMPLOYEE);                          // acting as glenn
        $victim = User::where('email', self::PH_SUPERVISOR)->first(); // gary (a different user)
        if (!$victim) {
            $this->markTestIncomplete('cross-user victim account (gary) absent');
        }

        $repo = $this->mockDep(UserRepositoryInterface::class);
        $repo->shouldReceive('show')->once()->andReturn((object) ['bhr_num' => 222]);
        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_user_bhr_field')->once()
            ->andReturn((object) ['mobilePhone' => '0999', 'jobTitle' => 'Supervisor']);

        // glenn requests gary's PII; ownership is NOT enforced => 200 (IDOR confirmed).
        $res = $this->getJson("/api/user/{$victim->id}/personal_information");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // ================================================================ time_off() [IDOR]

    /** @test  ph_employee requesting their OWN {id} — allowed (baseline). */
    public function time_off__role__ph_employee_own__allowed_200()
    {
        $glenn = $this->actor(self::PH_EMPLOYEE);

        $userModel = Mockery::mock();
        $query = Mockery::mock();
        $query->shouldReceive('get')->once()->andReturn(new EloquentCollection([]));
        $userModel->shouldReceive('dtr')->once()->andReturn($query);

        $repo = $this->mockDep(UserRepositoryInterface::class);
        $repo->shouldReceive('show')->once()->andReturn($userModel);
        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldReceive('get_leaves_from_dtr')->once()->andReturn(new EloquentCollection([]));

        $res = $this->getJson("/api/user/{$glenn->id}/time_off/2026-07-01/2026-07-15");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test  FINDING [IDOR]: ph_employee requesting ANOTHER user's {id} time-off — still 200. */
    public function time_off__role__ph_employee_cross_user__idor_allowed_200()
    {
        $this->actor(self::PH_EMPLOYEE);                          // acting as glenn
        $victim = User::where('email', self::PH_SUPERVISOR)->first();
        if (!$victim) {
            $this->markTestIncomplete('cross-user victim account (gary) absent');
        }

        $userModel = Mockery::mock();
        $query = Mockery::mock();
        $query->shouldReceive('get')->once()->andReturn(new EloquentCollection([]));
        $userModel->shouldReceive('dtr')->once()->andReturn($query);

        $repo = $this->mockDep(UserRepositoryInterface::class);
        $repo->shouldReceive('show')->once()->andReturn($userModel);
        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldReceive('get_leaves_from_dtr')->once()->andReturn(new EloquentCollection([]));

        $res = $this->getJson("/api/user/{$victim->id}/time_off/2026-07-01/2026-07-15");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // ============================================================ leave_credits() [IDOR]

    /** @test  ph_employee requesting their OWN {id} — allowed (baseline). */
    public function leave_credits__role__ph_employee_own__allowed_200()
    {
        $glenn = $this->actor(self::PH_EMPLOYEE);

        $repo = $this->mockDep(UserRepositoryInterface::class);
        $repo->shouldReceive('show')->once()->andReturn((object) ['bhr_num' => 111]);
        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_leave_credits')->once()->andReturn([]);

        $res = $this->getJson("/api/user/{$glenn->id}/leave_credits");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test  FINDING [IDOR]: ph_employee requesting ANOTHER user's {id} leave credits — still 200. */
    public function leave_credits__role__ph_employee_cross_user__idor_allowed_200()
    {
        $this->actor(self::PH_EMPLOYEE);                          // acting as glenn
        $victim = User::where('email', self::PH_SUPERVISOR)->first();
        if (!$victim) {
            $this->markTestIncomplete('cross-user victim account (gary) absent');
        }

        $repo = $this->mockDep(UserRepositoryInterface::class);
        $repo->shouldReceive('show')->once()->andReturn((object) ['bhr_num' => 222]);
        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_leave_credits')->once()->andReturn([]);

        $res = $this->getJson("/api/user/{$victim->id}/leave_credits");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }
}
