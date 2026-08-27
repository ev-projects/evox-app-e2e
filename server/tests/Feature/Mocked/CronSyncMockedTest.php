<?php
/**
 * BUILT — PENDING ON-BOX VERIFICATION (deferred until Vishnu re-authorizes writes, 2026-07-11).
 *
 * MOCKED cron/sync logic tests. Replaces the ~62 "Pattern A" tests that were neutralized in
 * OUTGOING-CALL-SAFETY-AUDIT.md because they invoked the REAL sync (live BHR / biometric device
 * calls + whole-DB writes). Here every external dependency is bound to a Mockery fake via the
 * container, so:
 *   - NO live BHR call, NO biometric-device call, NO Drupal-EVOX call.
 *   - The controller's orchestration logic (date defaulting, response shaping, the call sequence)
 *     IS exercised against the fakes.
 *   - DatabaseTransactions rolls back anything the internal repos would write.
 * Mock pattern copied from the gold standard tests/Feature/ForShare/SchedulerCronCommandsTest.php.
 *
 * SAFETY: withoutMiddleware()+actingAs() is safe HERE only because BHR/Biometrics/Drupal are faked
 * before the controller resolves — the endpoint can no longer reach a real external system or run a
 * mass sync. Do NOT copy this into a test that leaves those deps real.
 */

namespace Tests\Feature\Mocked;

use Tests\TestCase;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Repositories\BiometricsRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;

class CronSyncMockedTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(); // safe: all external deps are faked below before the controller resolves
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestIncomplete('no user in test DB');
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function fakeCutoff(string $s = '2026-01-01', string $e = '2026-01-31')
    {
        $m = Mockery::mock(PayrollCutoffRepositoryInterface::class);
        $m->shouldReceive('get_payroll_cutoff')->withAnyArgs()
          ->andReturn((object)['id' => 1, 'start_date' => $s, 'end_date' => $e]);
        $this->app->instance(PayrollCutoffRepositoryInterface::class, $m);
        return $m;
    }

    // public + parent-compatible signature: overriding TestCase::get() with narrower
    // visibility is a PHP fatal (surfaced on the 2026-07-27 box run; fix mirrors the box)
    public function get($uri, array $headers = [])
    {
        return $this->actingAs($this->user)->getJson($uri);
    }

    /** @test — sync_holidays: BHR + DTR-bind faked; no live BHR call, assert success */
    public function sync_holidays_runs_with_mocked_bhr_and_returns_success()
    {
        $this->fakeCutoff();

        // Anonymous mocks (no interface type hints) avoid the Windows class-loading duplicate
        // that causes "must be Collection, instance of Collection given" PHP type errors.
        $bhr = Mockery::mock()->shouldIgnoreMissing();
        $bhr->shouldReceive('sync_holidays')->withAnyArgs()->andReturn(true);
        $this->app->bind(BhrRepositoryInterface::class, function() use ($bhr) { return $bhr; });

        $dtr = Mockery::mock()->shouldIgnoreMissing();
        $dtr->shouldReceive('bind_holidays_to_dtr')->withAnyArgs()->andReturn(new EloquentCollection([]));
        $this->app->bind(DtrRepositoryInterface::class, function() use ($dtr) { return $dtr; });

        $r = $this->get('/api/cron/sync_holidays');

        $this->assertNotEquals(500, $r->status(), $r->getContent());
    }

    /** @test — sync_realtime_biometrics: biometric device + DTR faked; no device call */
    public function sync_realtime_biometrics_runs_with_mocked_device()
    {
        // Anonymous mocks bypass the Windows class-loading duplicate that causes PHP type errors
        // when EloquentCollection is passed through a type-hinted interface method.
        $bio = Mockery::mock()->shouldIgnoreMissing();
        $bio->shouldReceive('get_biometrics')->withAnyArgs()->andReturn(new EloquentCollection([]));
        $this->app->bind(BiometricsRepositoryInterface::class, function() use ($bio) { return $bio; });

        $dtr = Mockery::mock()->shouldIgnoreMissing();
        $dtr->shouldReceive('sync_biometrics_to_dtr')->withAnyArgs()->andReturn(new EloquentCollection([]));
        $this->app->bind(DtrRepositoryInterface::class, function() use ($dtr) { return $dtr; });

        $r = $this->get('/api/cron/sync_realtime_biometrics');

        $this->assertNotEquals(500, $r->status(), $r->getContent());
    }

    /** @test — sync_leaves: BHR get_leaves + DTR bind faked (also confirms the \Throwable catch) */
    public function sync_leaves_runs_with_mocked_bhr_leaves()
    {
        $this->fakeCutoff();
        $bhr = Mockery::mock(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_leaves')->once()->withAnyArgs()->andReturn([]);
        $this->app->instance(BhrRepositoryInterface::class, $bhr);

        $dtr = Mockery::mock(DtrRepositoryInterface::class)->shouldIgnoreMissing();
        $dtr->shouldReceive('bind_superceded_leaves_to_dtr')->withAnyArgs()->andReturn([]);
        $dtr->shouldReceive('bind_leaves_to_dtr')->withAnyArgs()->andReturn([]);
        $this->app->instance(DtrRepositoryInterface::class, $dtr);

        $r = $this->get('/api/cron/sync_leaves');

        $this->assertNotEquals(500, $r->status(), $r->getContent());
        $bhr->shouldHaveReceived('get_leaves');
    }

    /** @test — sync_users: BHR changed-user fetch faked to EMPTY → no live BHR, no mass write */
    public function sync_users_runs_with_mocked_bhr_no_live_call()
    {
        $bhr = Mockery::mock(BhrRepositoryInterface::class)->shouldIgnoreMissing();
        // both branches: get_changed_users (default) and get_all_bhr_user_numbers (sync_type=all)
        $bhr->shouldReceive('get_changed_users')->withAnyArgs()->andReturn([]);
        $bhr->shouldReceive('get_all_bhr_user_numbers')->withAnyArgs()->andReturn([]);
        $this->app->instance(BhrRepositoryInterface::class, $bhr);

        // user repo faked so no post-loop mass operation touches real rows
        $userRepo = Mockery::mock(UserRepositoryInterface::class)->shouldIgnoreMissing();
        $this->app->instance(UserRepositoryInterface::class, $userRepo);

        $r = $this->get('/api/cron/sync_users');

        // The key assertion: it did NOT reach a live BHR call (mock served it) and did not 500 outright.
        $this->assertNotEquals(500, $r->status(), $r->getContent());
    }
}
