<?php
/**
 * BUILT — PENDING ON-BOX VERIFICATION (deferred until Vishnu re-authorizes writes, 2026-07-11).
 *
 * MOCKED test for CronController::generate_weekly_dtr — the endpoint the outgoing-call safety audit
 * left "skip-only" because, called with NO id, it fans out over `get_all_active_users()` and
 * generates DTR for EVERY user (mass write). This test exercises the logic SAFELY:
 *   - Passes `?id=<one real user>` so the controller takes its single-user branch
 *     (`User::where("id", id)->get()`) instead of `get_all_active_users()`.
 *   - Fakes `DtrRepositoryInterface::generate_dtr` so NO DTR row is actually generated/written —
 *     the fake just captures what it was asked to generate and returns a stub result.
 *   - Fakes BHR / Drupal-EVOX / Biometrics so nothing external can fire during controller resolution.
 *   - Asserts `get_all_active_users()` is NEVER called (proves the whole-DB path can't run here).
 *   - DatabaseTransactions rolls back anything incidental.
 *
 * Mock pattern mirrors CronSyncMockedTest / the gold-standard SchedulerCronCommandsTest.
 * SAFETY: withoutMiddleware()+actingAs() is safe HERE only because generate_dtr + the externals are
 * faked and the request is id-scoped before the controller resolves.
 */

namespace Tests\Feature\Mocked;

use Tests\TestCase;
use Mockery;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Collection;
use App\Modules\User\Models\User;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Repositories\BiometricsRepositoryInterface;
use App\Modules\Payroll\Repositories\DrupalEvoxRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;

class GenerateWeeklyDtrMockedTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(); // safe: generate_dtr + externals are faked and the call is id-scoped
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestSkipped('no user in test DB');

        // Fake the externals so controller resolution can never reach a live system.
        foreach ([BhrRepositoryInterface::class, DrupalEvoxRepositoryInterface::class,
                  BiometricsRepositoryInterface::class] as $iface) {
            $this->app->instance($iface, Mockery::mock($iface));
        }
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** @test — id-scoped generate_weekly_dtr: generate_dtr faked, only the one user, never all-users */
    public function id_scoped_generate_weekly_dtr_runs_for_one_user_without_writing_dtr()
    {
        $captured = null;

        // Fake DTR repo: capture the user collection it's told to generate for; write nothing.
        $dtr = Mockery::mock(DtrRepositoryInterface::class);
        $dtr->shouldReceive('generate_dtr')
            ->once()
            ->andReturnUsing(function ($users, $dates) use (&$captured) {
                $captured = $users;
                return ['generated' => is_countable($users) ? count($users) : 0, 'mocked' => true];
            });
        $this->app->instance(DtrRepositoryInterface::class, $dtr);

        // Fake user repo: prove the whole-DB path (get_all_active_users) is NEVER taken.
        $userRepo = Mockery::mock(UserRepositoryInterface::class);
        $userRepo->shouldReceive('get_all_active_users')->never();
        $this->app->instance(UserRepositoryInterface::class, $userRepo);

        $response = $this->actingAs($this->user)
                         ->getJson('/api/cron/generate_weekly_dtr?id=' . $this->user->id);

        $response->assertStatus(201);

        // It generated for exactly the one id-scoped user, not the whole active set.
        $this->assertNotNull($captured, 'generate_dtr was not invoked');
        $count = $captured instanceof Collection ? $captured->count()
               : (is_countable($captured) ? count($captured) : 0);
        $this->assertEquals(1, $count, 'generate_weekly_dtr must scope to the single ?id user');
        $this->assertEquals($this->user->id, optional($captured->first())->id);
    }
}
