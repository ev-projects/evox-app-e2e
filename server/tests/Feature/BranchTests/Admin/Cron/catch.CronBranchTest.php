<?php

namespace Tests\Feature\BranchTests\Admin\Cron;

use Tests\TestCase;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Role;
use App\Modules\User\Models\User;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Request\Repositories\OvertimeRepositoryInterface;
use App\Modules\Schedule\Repositories\ScheduleRepositoryInterface;
use App\Modules\Payroll\Repositories\BiometricsRepositoryInterface;
use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;
use App\Modules\Request\Repositories\ChangeScheduleRepositoryInterface;
use App\Modules\Request\Repositories\AlterLogRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;

/**
 * WAVE-2 CATCH-ARM PASS (2026-07-27). Menu=Admin Page=Cron action=catch.
 * Companion to submit.CronBranchTest (which covers the guard/success arms with IoC mocks):
 * this file covers the SIX catch blocks of CronController — the arms the 07-22 report shows
 * uncovered — by making each endpoint's FIRST injected-repo call THROW.
 *
 * Seam per endpoint (all pre-SP, all pre-external — the throw fires before anything live):
 *   initial_sync_of_users -> bhr->get_all_bhr_user_numbers   throws -> catch L113
 *   sync_users            -> bhr->get_all_bhr_user_numbers   throws -> catch (post Role guard)
 *   generate_weekly_dtr   -> dtr->generate_dtr (id-scoped!)  throws -> catch L268
 *   sync_realtime_biometrics -> biometrics->get_biometrics   throws -> catch L297
 *   sync_holidays         -> payroll_cutoff->get_payroll_cutoff throws -> catch L329
 *   sync_leaves           -> payroll_cutoff->get_payroll_cutoff throws -> catch L362 (\Throwable arm)
 * All return error_response(messages.error_default) = 400.
 * SAFETY: identical IoC-mock wall as submit.CronBranchTest (nothing external can resolve);
 * generate_weekly_dtr is ?id-scoped so the whole-DB user path is never taken.
 */
class CronCatchBranchTest extends TestCase
{
    use DatabaseTransactions;

    private $user;
    private $bhr; private $payrollCutoff; private $userRepo; private $dtr; private $biometrics;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestIncomplete('no user in test DB');
        $this->actingAs($this->user);

        $this->bhr           = Mockery::mock(BhrRepositoryInterface::class);
        $this->payrollCutoff = Mockery::mock(PayrollCutoffRepositoryInterface::class);
        $this->userRepo      = Mockery::mock(UserRepositoryInterface::class);
        $this->dtr           = Mockery::mock(DtrRepositoryInterface::class);
        $this->biometrics    = Mockery::mock(BiometricsRepositoryInterface::class);

        $this->app->instance(BhrRepositoryInterface::class, $this->bhr);
        $this->app->instance(PayrollCutoffRepositoryInterface::class, $this->payrollCutoff);
        $this->app->instance(UserRepositoryInterface::class, $this->userRepo);
        $this->app->instance(DtrRepositoryInterface::class, $this->dtr);
        $this->app->instance(BiometricsRepositoryInterface::class, $this->biometrics);
        foreach ([OvertimeRepositoryInterface::class, RestDayWorkRepositoryInterface::class,
                  ChangeScheduleRepositoryInterface::class, AlterLogRepositoryInterface::class,
                  ScheduleRepositoryInterface::class, EmailRepositoryInterface::class] as $iface) {
            $this->app->instance($iface, Mockery::mock($iface));
        }
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function assertCaught($response)
    {
        $response->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $response->json('error.message'));
        $this->assertSame('forced repo failure', $response->json('error.content'));
    }

    public function test_initial_sync_of_users_catch_arm()
    {
        $this->bhr->shouldReceive('get_all_bhr_user_numbers')->once()
                  ->andThrow(new \Exception('forced repo failure'));

        $this->assertCaught($this->getJson('/api/cron/initial_sync_of_users'));
    }

    public function test_sync_users_catch_arm()
    {
        try { Role::findByName('admin'); } catch (\Throwable $e) {
            $this->markTestIncomplete('admin role missing in test DB (controller would 500 pre-seam)');
        }
        $this->bhr->shouldReceive('get_changed_users')->once()
                  ->andThrow(new \Exception('forced repo failure'));

        $this->assertCaught($this->getJson('/api/cron/sync_users'));
    }

    public function test_generate_weekly_dtr_catch_arm_id_scoped()
    {
        // ?id keeps the single-user branch (User::where) — get_all_active_users never called.
        $this->userRepo->shouldReceive('get_all_active_users')->never();
        $this->dtr->shouldReceive('generate_dtr')->once()
                  ->andThrow(new \Exception('forced repo failure'));

        $this->assertCaught($this->getJson('/api/cron/generate_weekly_dtr?id=' . $this->user->id));
    }

    public function test_sync_realtime_biometrics_catch_arm()
    {
        $this->biometrics->shouldReceive('get_biometrics')->once()
                         ->andThrow(new \Exception('forced repo failure'));

        $this->assertCaught($this->getJson('/api/cron/sync_realtime_biometrics'));
    }

    public function test_sync_holidays_catch_arm()
    {
        // no-args path resolves the cutoff first — that's the seam.
        $this->payrollCutoff->shouldReceive('get_payroll_cutoff')->once()
                            ->andThrow(new \Exception('forced repo failure'));

        $this->assertCaught($this->getJson('/api/cron/sync_holidays'));
    }

    public function test_sync_leaves_throwable_catch_arm()
    {
        // sync_leaves is the one catch(\Throwable) in the controller — force an \Error
        // (TypeError) to prove the wider net actually catches non-Exception throwables.
        $this->payrollCutoff->shouldReceive('get_payroll_cutoff')->once()
                            ->andThrow(new \TypeError('forced repo failure'));

        $r = $this->getJson('/api/cron/sync_leaves');

        $r->assertStatus(400);
        $this->assertSame(trans('messages.error_default'), $r->json('error.message'));
    }
}
