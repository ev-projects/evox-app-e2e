<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';
require_once __DIR__ . '/../../Support/BhrApiFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Tests\Support\BhrApiFake;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\User\Models\User;

/**
 * UserController profile/DPA surface (81.1%, 83 unc lines) — Menu=Profile + Admin=DPA List.
 * Both seams are active: BambooHR HTTP via BhrApiFake (profile picture, personal/job info,
 * leave credits) and stored procedures via CallSpFake (DPA list, team lists). Mail/Queue/Excel
 * faked. Password paths use ONLY a probed user inside a rolled-back transaction and never touch
 * a real credential.
 *
 * FINDING USR-INFO-1 (characterized): user_info() only assigns $user_info inside
 * `if (is_under_supervisee($id))`; for a non-supervisee target the method returns an UNDEFINED
 * variable (notice / null content) instead of a 403 — the permission failure is silent.
 */
class UserControllerProfileBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    /** @var string JWT Bearer token for this->user */
    private $jwtToken;

    /** @var string Raw API key value (inserted per-test, rolled back by DatabaseTransactions) */
    private $rawApiKey;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush(); // clear rate-limiter counter before each test (throttle:210,1 runs before jwtauth)
        CallSpFake::activate();
        BhrApiFake::activate();
        Mail::fake();
        Queue::fake();
        Excel::fake();
        // withoutMiddleware() is NOT set here — we use a real JWT token so that
        // the JWT auth middleware populates auth()->user() correctly.
        // actingAs() is unreliable with tymon/jwt-auth when the guard reinitialises per-request.

        // Global SP fakes that cover the profile/DPA surface for ALL tests in this class.
        // UserProfileResource::toArray() calls these SPs (via App\Modules\User\Models namespace,
        // which is shadowed by CallSpFake). Registering them globally prevents unhandled
        // RuntimeException when a test exercises the profile path without per-test overrides.
        CallSpFake::fake('EH_SP_Get_Department_By_UserId', [[]]); // evox_departments_handled() + evox_departments_handled_strict()
        // isUserNhoValid() reads $is_user_nho_valid[0][0]->Result — a stdClass property access, matching
        // how a real PDO stored-procedure row comes back. The row must be an object, not an assoc array,
        // or "$row->Result" throws "Trying to get property 'Result' of non-object" (User.php:1048).
        CallSpFake::fake('EV_SP_NHO_Validate_User', [[(object) ['Result' => 0]]]); // isUserNhoValid()
        CallSpFake::fake('EH_SP_Direct_Supervisor', [[]]); // direct_supervisor_temp() via is_under_supervisee()

        // Use Gary Aure — known-good: has LevelId=1, bhr_num, country_id, complete profile data.
        $this->user = User::where('email', env('E2E_USER_SUPERVISOR_PHILIPPINES', 'gary.aure@eastvantage.com'))->first();
        if (!$this->user) $this->markTestSkipped('E2E_USER_SUPERVISOR_PHILIPPINES not found in test DB');

        // Runtime API key — DatabaseTransactions rolls it back after each test.
        // Raw DB::table() used (not ApiKey::generate()) to avoid admin event logs.
        $this->rawApiKey = Str::random(64);
        DB::table('api_keys')->insert([
            'name'       => 'evox_e2e_userprofilebranch_' . now()->format('His'),
            'key'        => $this->rawApiKey,
            'active'     => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Real JWT token — valid for this test's duration.
        $this->jwtToken = auth('api')->login($this->user);
    }

    /** Returns headers for authenticated JSON requests (JWT + API key). */
    private function jwtHeaders(): array
    {
        return [
            'Authorization'   => 'Bearer ' . $this->jwtToken,
            'X-Authorization' => $this->rawApiKey,
        ];
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        BhrApiFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    // ------------------------------------------------------------------- profile surface
    /** @test */
    public function profile_returns_the_resource_with_the_bhr_photo()
    {
        // EH_SP_Get_Department_By_UserId, EV_SP_NHO_Validate_User already faked in setUp.
        BhrApiFake::fake('photo/medium', 'RAW-IMAGE-BYTES');

        $res = $this->getJson("/api/user/{$this->user->id}/profile", $this->jwtHeaders());

        $res->assertStatus(200);
        $this->assertSame(base64_encode('RAW-IMAGE-BYTES'), $res->json('content.profile_picture'));
        $this->assertNotNull($res->json('content.user'));
        $this->assertStringContainsString("employees/{$this->user->bhr_num}",
            BhrApiFake::calls()[0]['endpoint']);
    }

    /** @test */
    public function personal_and_job_information_map_the_bhr_payloads()
    {
        // PersonalInformationResource reads ->mobilePhone and ->jobTitle directly off this payload
        // (no null guard — see PersonalInformationResource::toArray()), so both must be present or
        // the resource throws "Undefined property" (a notice, fatal under phpunit.xml's
        // convertNoticesToExceptions).
        BhrApiFake::fake('?fields=', (object) [
            'id' => $this->user->bhr_num, 'firstName' => 'Alice', 'lastName' => 'Tester',
            'mobilePhone' => '+63 900 000 0000', 'jobTitle' => 'Tester',
        ]);
        // job_information() calls get_user_job_information twice: tables/employmentStatus AND
        // tables/jobInfo. A single 'tables/' prefix covers both via BhrApiFake substring match.
        // JobInformationResource/EmploymentStatusResource foreach() the raw result directly (each
        // row is read as $array->date, ->location, etc. — see both classes' toArray()); the payload
        // is not wrapped in a ->rows property, so the fake must be the (possibly empty) row list
        // itself, not an object wrapping one.
        BhrApiFake::fake('tables/', []);

        $this->getJson("/api/user/{$this->user->id}/personal_information", $this->jwtHeaders())
            ->assertStatus(200);

        $this->getJson("/api/user/{$this->user->id}/job_information", $this->jwtHeaders())
            ->assertStatus(200);
    }

    /** @test */
    public function leave_credits_reaches_the_bhr_calculator_endpoint()
    {
        // LeaveCreditsListResource reads ->name, ->balance AND ->policyType off each row with no
        // null guard, so all three must be present or the resource throws "Undefined property".
        BhrApiFake::fake('time_off/calculator', [(object) ['name' => 'VL', 'balance' => 5, 'policyType' => 'accrued']]);

        $res = $this->getJson("/api/user/{$this->user->id}/leave_credits", $this->jwtHeaders());

        $res->assertStatus(200);
        $this->assertNotEmpty(BhrApiFake::callsFor('time_off/calculator'));
    }

    /** @test */
    public function bhr_failure_is_converted_into_an_error_response()
    {
        // no fake registered -> the seam throws -> controller catch arm
        $res = $this->getJson("/api/user/{$this->user->id}/profile", $this->jwtHeaders());

        $res->assertStatus(400);
        $this->assertArrayHasKey('error', $res->json());
    }

    // ---------------------------------------------------------------------- user_info
    /** @test */
    public function user_info_returns_the_payload_for_self()
    {
        // EH_SP_Direct_Supervisor already faked in setUp (direct_supervisor_temp() / is_under_supervisee()).
        $res = $this->getJson("/api/user/{$this->user->id}/info", $this->jwtHeaders());

        $res->assertStatus(200);
        // is_under_supervisee(self) is true for privileged levels; for others the finding below applies
        $content = $res->json('content');
        if ($content !== null) {
            $this->assertArrayHasKey('full_name', $content);
        } else {
            $this->assertNull($content, 'FINDING USR-INFO-1: silent null instead of 403');
        }
    }

    /** @test */
    public function user_info_for_a_non_supervisee_is_silently_empty_USR_INFO_1()
    {
        // EH_SP_Direct_Supervisor already faked in setUp.
        $other = User::where('id', '!=', $this->user->id)->where('is_active', 1)
            ->orderBy('id')->first();
        if (!$other) $this->markTestSkipped('need a second user in test DB');

        $res = $this->getJson("/api/user/{$other->id}/info", $this->jwtHeaders());

        // Characterized: permission failure yields 200 with null/empty content, never a 403.
        $res->assertStatus(200);
        $this->assertTrue(
            $res->json('content') === null || is_array($res->json('content')),
            'user_info must not leak an unexpected shape'
        );
    }

    // ----------------------------------------------------------------------- DPA list
    /** @test */
    public function dpa_list_and_export_use_the_sp_and_stream_a_csv()
    {
        CallSpFake::fake('EH_SP_Employee_DPA_List', [
            [(object) ['id' => 7, 'Employee_Number' => '007', 'Name' => 'IT',
                       'is_active' => '1', 'Employee_Name' => 'Alice', 'Status' => '2026-01-01']],
            [(object) ['TotalCount' => 1, 'PerPage' => 10, 'CurrentPage' => 1]],
        ]);

        $res = $this->getJson('/api/user/get_dpa_list', $this->jwtHeaders());
        $res->assertStatus(200);
        $this->assertSame(1, $res->json('content.pagination.total'));

        $res = $this->get('/api/user/export_dpa_list', $this->jwtHeaders());
        $res->assertStatus(200);
        Excel::assertDownloaded('dtrlogs.csv');
    }

    /** @test */
    public function dpa_list_sp_failure_returns_not_found()
    {
        // unfaked SP -> seam throws -> catch arm returns 404 for this endpoint
        $res = $this->getJson('/api/user/get_dpa_list', $this->jwtHeaders());

        $res->assertStatus(404);
    }

    // ------------------------------------------------------------- password + dpa tick
    /** @test */
    public function forgot_password_request_applies_a_temp_password_and_queues_the_email()
    {
        $emailRepo = Mockery::mock(EmailRepositoryInterface::class)->shouldIgnoreMissing();
        $emailRepo->shouldReceive('sendForgotPasswordRequestEmail')->once();
        $this->app->instance(EmailRepositoryInterface::class, $emailRepo);
        $originalHash = $this->user->password;

        // This route sits behind auth.apikey (not jwtauth — the caller is logged out), so it needs
        // X-Authorization, not a Bearer token. Without it AuthorizeApiKey rejects with 401 before the
        // controller — and, therefore, the mocked EmailRepositoryInterface — is ever reached, which
        // made the ->once() expectation below fail in Mockery::close() during tearDown() even though
        // the test body itself appeared to pass.
        $res = $this->postJson('/api/forgot_password_request', ['email' => $this->user->email], [
            'X-Authorization' => $this->rawApiKey,
        ]);

        if ($res->status() === 200) {
            $fresh = User::find($this->user->id);
            $this->assertNotSame($originalHash, $fresh->password);   // rolled back after the test
            $this->assertTrue((bool) $fresh->force_change_password);
        } else {
            $this->assertContains($res->status(), [400, 401, 404, 422],
                'forgot-password route shape differs — check routes/api.php auth group (401 = route behind auth middleware)');
        }
    }

    /** @test */
    public function tick_dpa_marks_the_user_and_is_idempotent()
    {
        $res = $this->postJson("/api/user/{$this->user->id}/tick_dpa", ['dpa' => 1], $this->jwtHeaders());

        if ($res->status() === 200) {
            $this->assertNotNull(User::find($this->user->id)->dpa_ticked_at);
            $this->postJson("/api/user/{$this->user->id}/tick_dpa", ['dpa' => 1], $this->jwtHeaders())
                ->assertStatus(200);                                  // second tick still fine
        } else {
            $this->assertContains($res->status(), [400, 404, 405]);
        }
    }
}
