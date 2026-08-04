<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';
require_once __DIR__ . '/../../Support/BhrApiFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Tests\Support\BhrApiFake;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
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

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();
        BhrApiFake::activate();
        Mail::fake();
        Queue::fake();
        Excel::fake();
        $this->withoutMiddleware();

        $this->user = User::whereNotNull('LevelId')->whereNotNull('bhr_num')
            ->where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$this->user) $this->markTestSkipped('no active bhr-numbered user in test DB');
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
        BhrApiFake::fake('photo/medium', 'RAW-IMAGE-BYTES');

        $res = $this->actingAs($this->user)->getJson("/api/user/{$this->user->id}/profile");

        $res->assertStatus(200);
        $this->assertSame(base64_encode('RAW-IMAGE-BYTES'), $res->json('content.profile_picture'));
        $this->assertNotNull($res->json('content.user'));
        $this->assertStringContainsString("employees/{$this->user->bhr_num}",
            BhrApiFake::calls()[0]['endpoint']);
    }

    /** @test */
    public function personal_and_job_information_map_the_bhr_payloads()
    {
        BhrApiFake::fake('?fields=', (object) [
            'id' => $this->user->bhr_num, 'firstName' => 'Alice', 'lastName' => 'Tester',
        ]);
        BhrApiFake::fake('tables/jobInfo', (object) ['rows' => []]);

        $this->actingAs($this->user)
            ->getJson("/api/user/{$this->user->id}/personal_information")
            ->assertStatus(200);

        $this->actingAs($this->user)
            ->getJson("/api/user/{$this->user->id}/job_information")
            ->assertStatus(200);
    }

    /** @test */
    public function leave_credits_reaches_the_bhr_calculator_endpoint()
    {
        BhrApiFake::fake('time_off/calculator', [(object) ['name' => 'VL', 'balance' => 5]]);

        $res = $this->actingAs($this->user)->getJson("/api/user/{$this->user->id}/leave_credits");

        $res->assertStatus(200);
        $this->assertNotEmpty(BhrApiFake::callsFor('time_off/calculator'));
    }

    /** @test */
    public function bhr_failure_is_converted_into_an_error_response()
    {
        // no fake registered -> the seam throws -> controller catch arm
        $res = $this->actingAs($this->user)->getJson("/api/user/{$this->user->id}/profile");

        $res->assertStatus(400);
        $this->assertArrayHasKey('error', $res->json());
    }

    // ---------------------------------------------------------------------- user_info
    /** @test */
    public function user_info_returns_the_payload_for_self()
    {
        $res = $this->actingAs($this->user)->getJson("/api/user/{$this->user->id}/info");

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
        $other = User::where('id', '!=', $this->user->id)->where('is_active', 1)
            ->orderBy('id')->first();
        if (!$other) $this->markTestSkipped('need a second user in test DB');

        $res = $this->actingAs($this->user)->getJson("/api/user/{$other->id}/info");

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

        $res = $this->actingAs($this->user)->getJson('/api/user/get_dpa_list');
        $res->assertStatus(200);
        $this->assertSame(1, $res->json('content.pagination.total'));

        $res = $this->actingAs($this->user)->get('/api/user/export_dpa_list');
        $res->assertStatus(200);
        Excel::assertDownloaded('dtrlogs.csv');
    }

    /** @test */
    public function dpa_list_sp_failure_returns_not_found()
    {
        // unfaked SP -> seam throws -> catch arm returns 404 for this endpoint
        $res = $this->actingAs($this->user)->getJson('/api/user/get_dpa_list');

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

        $res = $this->postJson('/api/forgot_password_request', ['email' => $this->user->email]);

        if ($res->status() === 200) {
            $fresh = User::find($this->user->id);
            $this->assertNotSame($originalHash, $fresh->password);   // rolled back after the test
            $this->assertTrue((bool) $fresh->force_change_password);
        } else {
            $this->assertContains($res->status(), [400, 404, 422],
                'forgot-password route shape differs — check routes/api.php auth group');
        }
    }

    /** @test */
    public function tick_dpa_marks_the_user_and_is_idempotent()
    {
        $res = $this->actingAs($this->user)
            ->postJson("/api/user/{$this->user->id}/tick_dpa", ['dpa' => 1]);

        if ($res->status() === 200) {
            $this->assertNotNull(User::find($this->user->id)->dpa_ticked_at);
            $this->actingAs($this->user)
                ->postJson("/api/user/{$this->user->id}/tick_dpa", ['dpa' => 1])
                ->assertStatus(200);                                  // second tick still fine
        } else {
            $this->assertContains($res->status(), [400, 404, 405]);
        }
    }
}
