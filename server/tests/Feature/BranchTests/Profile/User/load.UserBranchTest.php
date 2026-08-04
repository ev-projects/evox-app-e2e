<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for UserController::load arms. Menu=Profile Page=User.
 *
 * Covers the read/get endpoints: personal_information, job_information, time_off, leave_credits, get_dpa_list.
 * Each try/catch method gets one success test + one exception (catch) test. Constructor-injected deps
 * (UserRepositoryInterface, BhrRepositoryInterface, DtrRepositoryInterface) are IoC-mocked per test so no
 * real repo/DB/BHR/SP call fires. success_response => 200 {message,content}; error_response default => 400
 * {error:{message,content}} EXCEPT get_dpa_list which passes JsonResponse::HTTP_NOT_FOUND => 404.
 *
 * // FINDING: IDOR — personal_information / job_information / time_off / leave_credits validate only that
 *    {id} is an int (`'id' => 'int'`) then fetch & return THAT user's PII with NO ownership / supervisee
 *    check. Any authenticated user can read any other user's PII by changing {id}. Tests assert the CURRENT
 *    (vulnerable) 200 behavior; they intentionally do NOT assert a fix.
 *
 * SKIPPED arms: none in this file (all load arms are cleanly mockable and return before any call_sp/external).
 *
 * Routes (module api.php mounted under /api):
 *   GET /api/user/{id}/personal_information            -> personal_information()
 *   GET /api/user/{id}/job_information                 -> job_information()
 *   GET /api/user/{id}/time_off/{start_date}/{end_date}-> time_off()
 *   GET /api/user/{id}/leave_credits                   -> leave_credits()
 *   GET /api/user/get_dpa_list                         -> get_dpa_list()
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

class UserLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();                       // reach controller body past jwt/apikey
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestIncomplete('no user in test DB');
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** Bind a Mockery mock for an interface into the IoC container. */
    private function mockDep(string $iface): \Mockery\MockInterface
    {
        $m = Mockery::mock($iface);
        $this->app->instance($iface, $m);
        return $m;
    }

    // ==================================================== personal_information()
    /** @test */
    public function personal_information__load__valid_id__success_200()
    {
        // FINDING: IDOR — no ownership/supervisee check; any auth user can read any {id}'s PII.
        $user = $this->mockDep(UserRepositoryInterface::class);
        $user->shouldReceive('show')->once()->andReturn((object) ['bhr_num' => 123]);
        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_user_bhr_field')->once()
            ->andReturn((object) ['mobilePhone' => '0917', 'jobTitle' => 'Engineer']);

        $res = $this->getJson("/api/user/{$this->user->id}/personal_information");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function personal_information__load__exception__error_400()
    {
        $user = $this->mockDep(UserRepositoryInterface::class);
        $user->shouldReceive('show')->once()->andThrow(new Exception('boom'));

        $res = $this->getJson("/api/user/{$this->user->id}/personal_information");

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ========================================================= job_information()
    /** @test */
    public function job_information__load__valid_id__success_200()
    {
        // FINDING: IDOR — job data for any {id} is returned without an ownership check.
        $user = $this->mockDep(UserRepositoryInterface::class);
        $user->shouldReceive('show')->once()->andReturn((object) ['bhr_num' => 123]);
        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        // called twice (employee_status then job_info); empty arrays serialize cleanly.
        $bhr->shouldReceive('get_user_job_information')->twice()->andReturn([]);

        $res = $this->getJson("/api/user/{$this->user->id}/job_information");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function job_information__load__exception__error_400()
    {
        $user = $this->mockDep(UserRepositoryInterface::class);
        $user->shouldReceive('show')->once()->andThrow(new Exception('boom'));

        $res = $this->getJson("/api/user/{$this->user->id}/job_information");

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // =============================================================== time_off()
    /** @test */
    public function time_off__load__valid_id__success_200()
    {
        // FINDING: IDOR — time-off records for any {id} are returned without an ownership check.
        $userModel = Mockery::mock();
        $query = Mockery::mock();
        $query->shouldReceive('get')->once()->andReturn(new EloquentCollection([]));
        $userModel->shouldReceive('dtr')->once()->andReturn($query);

        $user = $this->mockDep(UserRepositoryInterface::class);
        $user->shouldReceive('show')->once()->andReturn($userModel);
        $dtr = $this->mockDep(DtrRepositoryInterface::class);
        $dtr->shouldReceive('get_leaves_from_dtr')->once()->andReturn(new EloquentCollection([]));

        $res = $this->getJson("/api/user/{$this->user->id}/time_off/2026-07-01/2026-07-15");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function time_off__load__exception__error_400()
    {
        $user = $this->mockDep(UserRepositoryInterface::class);
        $user->shouldReceive('show')->once()->andThrow(new Exception('boom'));

        $res = $this->getJson("/api/user/{$this->user->id}/time_off/2026-07-01/2026-07-15");

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // =========================================================== leave_credits()
    /** @test */
    public function leave_credits__load__valid_id__success_200()
    {
        // FINDING: IDOR — leave credits for any {id} are returned without an ownership check.
        $user = $this->mockDep(UserRepositoryInterface::class);
        $user->shouldReceive('show')->once()->andReturn((object) ['bhr_num' => 123]);
        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_leave_credits')->once()->andReturn([]);

        $res = $this->getJson("/api/user/{$this->user->id}/leave_credits");

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function leave_credits__load__exception__error_400()
    {
        $user = $this->mockDep(UserRepositoryInterface::class);
        $user->shouldReceive('show')->once()->andReturn((object) ['bhr_num' => 123]);
        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_leave_credits')->once()->andThrow(new Exception('boom'));

        $res = $this->getJson("/api/user/{$this->user->id}/leave_credits");

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ============================================================ get_dpa_list()
    /** @test */
    public function get_dpa_list__load__ok__success_200()
    {
        $user = $this->mockDep(UserRepositoryInterface::class);
        $user->shouldReceive('get_dpa_list')->once()->andReturn([]);

        $res = $this->getJson('/api/user/get_dpa_list');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function get_dpa_list__load__exception__error_404()
    {
        // error_response(..., JsonResponse::HTTP_NOT_FOUND) => 404 (NOT the 400 default).
        $user = $this->mockDep(UserRepositoryInterface::class);
        $user->shouldReceive('get_dpa_list')->once()->andThrow(new Exception('boom'));

        $res = $this->getJson('/api/user/get_dpa_list');

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
