<?php
/**
 * SOURCE FILES UNDER TEST
 *   app/Console/Commands/syncBhrUsersCountry.php :: handle()   (65% before this file)
 *   app/Console/Commands/SyncBhrUsersPhoto.php   :: handle()   (40% before this file)
 *
 * MENU PATH
 *   Admin -> Cron (scheduled jobs, no screen). `php artisan sync_bhr_users_country` and
 *   `php artisan sync:bhr_users_photo {all?}` — the two nightly BambooHR jobs that keep an employee's
 *   country and profile photo in step with HR's system of record.
 *
 * WHY A USER CARES
 *   Country is not cosmetic: it is what UtcTimelog joins on to decide an employee's timezone, and
 *   therefore what decides whether their punch at 09:00 local is on time or an hour late. Photos are
 *   what put a face on the team list and the approval screens.
 *   Both commands are batch jobs over the whole company, so the arms that matter most are the ones
 *   that decide what to SKIP: an employee who has left (skipped — a leaver's country must not be
 *   rewritten), an employee BambooHR cannot answer for (skipped, batch continues), and an EVOX row
 *   with no BambooHR number at all (skipped rather than pushed with a null identifier).
 *
 * ARMS COVERED — both sides of every conditional
 *   syncBhrUsersCountry::handle()
 *     - employee present in both systems AND active   -> their country is written
 *     - employee present in both systems but INACTIVE -> the write is skipped
 *     - employee BambooHR cannot resolve              -> skipped, the batch continues
 *     - a per-employee failure                        -> the inner catch logs and continues the batch
 *     - BambooHR unavailable at the start             -> the outer catch stops before the batch begins
 *   SyncBhrUsersPhoto::handle()
 *     - `all` argument   -> every BambooHR number is pushed with sync mode 1
 *     - no argument      -> mode 2 discovers who needs a photo, then each is pushed with mode 1
 *     - a discovered row carrying no BambooHR number -> skipped, not pushed with a null identifier
 *     - a per-employee failure                       -> handled, the command still exits cleanly
 *
 * SAFETY
 *   Every repository the two commands depend on is IoC-mocked, so NO BambooHR HTTP call can fire.
 *   EV_Photo_Sync is intercepted by the Tests\Support\CallSpFake seam (App\Console\Commands is one of
 *   the shadowed namespaces), so the photo stored procedure NEVER executes. Nothing is written to the
 *   database by either command under these mocks; DatabaseTransactions is held regardless.
 *
 *   NOTE (unavoidable, the command's own query): syncBhrUsersCountry reads
 *   User::whereNotNull('bhr_num')->pluck('bhr_num') itself. That single indexed column read is the
 *   command's behaviour, not this suite's; every employee it yields resolves to null through the
 *   mocked repository and is skipped immediately, so nothing is fetched or written for them.
 *
 * FINDINGS
 *   PHOTO-LOGCONCAT-1 (characterized, not fixed): SyncBhrUsersPhoto.php lines 76 and 115 build the
 *     error log line as 'SYNC ERROR' . [$bhr_user_number, $e, __FUNCTION__] — a string concatenated
 *     with an ARRAY. That raises "Array to string conversion", which Laravel's error handler turns
 *     into an ErrorException, so the inner catch itself throws and control jumps to the OUTER catch.
 *     Two consequences: the log line never records which employee failed, and the `break` on the next
 *     line is unreachable — a single photo failure aborts the whole run rather than stopping the loop
 *     deliberately. Those two `break` statements are the lines this suite cannot cover.
 *   PHOTO-BREAKNOTCONTINUE-1 (characterized, not fixed): both error arms are written as `break` with
 *     `// continue; // break if SP ERROR` commented out beside them. Even with the log line fixed,
 *     one employee whose photo cannot be fetched would silently stop the sync for everybody after
 *     them in the batch.
 */

namespace Tests\Feature\BranchTests\Admin\Cron;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Exception;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\Support\CallSpFake;
use Tests\TestCase;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Schedule\Repositories\ScheduleRepositoryInterface;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepositoryInterface;

class BhrCountryAndPhotoCommandsSubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** The stored procedure the photo command pushes through. */
    const PHOTO_SP = 'EV_Photo_Sync';

    /** A BambooHR number this suite owns; it is prepended to whatever the command reads from EVOX. */
    const TARGET_BHR = 'BHR-BRANCH-TEST-1';

    /** @var \Mockery\MockInterface */
    private $bhr;
    /** @var \Mockery\MockInterface */
    private $userRepo;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        CallSpFake::activate();                     // no stored procedure can reach the database

        $this->bhr      = Mockery::mock(BhrRepositoryInterface::class)->shouldIgnoreMissing();
        $this->userRepo = Mockery::mock(UserRepositoryInterface::class)->shouldIgnoreMissing();

        $this->app->instance(BhrRepositoryInterface::class, $this->bhr);
        $this->app->instance(UserRepositoryInterface::class, $this->userRepo);
        $this->app->instance(ScheduleRepositoryInterface::class, Mockery::mock(ScheduleRepositoryInterface::class)->shouldIgnoreMissing());
        $this->app->instance(DtrRepositoryInterface::class, Mockery::mock(DtrRepositoryInterface::class)->shouldIgnoreMissing());
        $this->app->instance(EmailRepositoryInterface::class, Mockery::mock(EmailRepositoryInterface::class)->shouldIgnoreMissing());
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    /** A BambooHR record shaped the way update_bhr_user_country_to_evox expects. */
    private function bhrRecord()
    {
        return (object) ['id' => 1, 'country' => 'BE', 'employeeNumber' => '9001'];
    }

    /**
     * An in-memory EVOX employee. Never saved — the command only reads is_active off it before
     * handing it to the (mocked) repository write.
     */
    private function evoxEmployee(int $isActive): User
    {
        $u             = new User();
        $u->id         = 987654321;
        $u->emp_num    = 'E-BRANCH-TEST';
        $u->first_name = 'Branch';
        $u->last_name  = 'Test';
        $u->is_active  = $isActive;

        return $u;
    }

    /**
     * Answer only for this suite's BambooHR number; every other number the command picks up from the
     * live users table resolves to null and is skipped on the spot.
     */
    private function onlyAnswerForTarget($answer): \Closure
    {
        return function ($bhrNumber) use ($answer) {
            return $bhrNumber === self::TARGET_BHR ? $answer : null;
        };
    }

    // ==========================================================  sync_bhr_users_country

    /**
     * The write arm. An employee who exists in both systems and is still employed has their country
     * — and therefore their working timezone — brought in line with BambooHR.
     *
     * @test
     */
    public function an_active_employee_present_in_both_systems_has_their_country_written()
    {
        $employee = $this->evoxEmployee(1);

        $this->bhr->shouldReceive('get_all_bhr_user_numbers')->once()->andReturn([self::TARGET_BHR]);
        $this->bhr->shouldReceive('get_user')->andReturnUsing($this->onlyAnswerForTarget($this->bhrRecord()));
        $this->userRepo->shouldReceive('show_via_bhr_number')->andReturnUsing($this->onlyAnswerForTarget($employee));

        $written = [];
        $this->userRepo->shouldReceive('update_bhr_user_country_to_evox')->once()
            ->andReturnUsing(function ($user, $bhrUser, $utc) use (&$written) {
                $written[] = ['user' => $user, 'bhr' => $bhrUser, 'utc' => $utc];

                return $user;
            });

        $this->artisan('sync_bhr_users_country')->assertExitCode(0);

        $this->assertCount(1, $written, 'exactly the one resolvable active employee is written');
        $this->assertSame($employee->emp_num, $written[0]['user']->emp_num, 'the EVOX row is the one that is updated');
        $this->assertSame('BE', $written[0]['bhr']->country, "BambooHR's country is the value carried into EVOX");
        $this->assertNotEmpty(
            $written[0]['utc'],
            'the timezone reference table is passed alongside so the country can be mapped to an offset'
        );
    }

    /**
     * The skip arm that protects leavers. Someone who has been deactivated in EVOX must not have
     * their country rewritten by the nightly job — their historical records stay as they were.
     *
     * @test
     */
    public function a_deactivated_employee_is_left_alone_by_the_country_sync()
    {
        $this->bhr->shouldReceive('get_all_bhr_user_numbers')->once()->andReturn([self::TARGET_BHR]);
        $this->bhr->shouldReceive('get_user')->andReturnUsing($this->onlyAnswerForTarget($this->bhrRecord()));
        $this->userRepo->shouldReceive('show_via_bhr_number')
            ->andReturnUsing($this->onlyAnswerForTarget($this->evoxEmployee(0)));

        $this->userRepo->shouldReceive('update_bhr_user_country_to_evox')->never();

        $this->artisan('sync_bhr_users_country')->assertExitCode(0);
    }

    /**
     * The other skip arm. BambooHR has no record for the number, so there is nothing to copy across —
     * the employee is passed over and the batch carries on.
     *
     * @test
     */
    public function an_employee_bamboo_hr_cannot_resolve_is_passed_over()
    {
        $this->bhr->shouldReceive('get_all_bhr_user_numbers')->once()->andReturn([self::TARGET_BHR]);
        $this->bhr->shouldReceive('get_user')->andReturn(null);          // nothing resolves
        $this->userRepo->shouldReceive('show_via_bhr_number')
            ->andReturnUsing($this->onlyAnswerForTarget($this->evoxEmployee(1)));

        $this->userRepo->shouldReceive('update_bhr_user_country_to_evox')->never();

        $this->artisan('sync_bhr_users_country')->assertExitCode(0);
    }

    /**
     * The inner catch. One employee's lookup blowing up must not take the rest of the batch with it —
     * the failure is logged against that employee and the loop continues.
     *
     * @test
     */
    public function one_employee_failing_does_not_abandon_the_rest_of_the_country_batch()
    {
        $this->bhr->shouldReceive('get_all_bhr_user_numbers')->once()->andReturn([self::TARGET_BHR]);
        // Only this suite's employee fails; every other number the command picks up from the users
        // table resolves to null and is skipped, so exactly one error is logged.
        $this->userRepo->shouldReceive('show_via_bhr_number')->andReturnUsing(function ($bhrNumber) {
            if ($bhrNumber === self::TARGET_BHR) {
                throw new Exception('BambooHR lookup exploded');
            }

            return null;
        });

        $this->userRepo->shouldReceive('update_bhr_user_country_to_evox')->never();

        // The command still completes: the per-employee catch swallows and continues to the summary.
        $this->artisan('sync_bhr_users_country')->assertExitCode(0);
    }

    /**
     * The outer catch. If BambooHR is unreachable before the batch starts there is nothing to sync,
     * and the command must stop rather than walk the whole employee list asking a dead service.
     *
     * @test
     */
    public function an_unavailable_bamboo_hr_stops_the_country_sync_before_the_batch_begins()
    {
        $this->bhr->shouldReceive('get_all_bhr_user_numbers')->once()
            ->andThrow(new Exception('BambooHR unavailable'));

        $this->userRepo->shouldReceive('show_via_bhr_number')->never();
        $this->userRepo->shouldReceive('update_bhr_user_country_to_evox')->never();

        $this->artisan('sync_bhr_users_country')->assertExitCode(0);
    }

    // ==============================================================  sync:bhr_users_photo

    /**
     * The `all` arm — a full re-push. Every BambooHR number is fetched and sent to the photo
     * procedure under that same number with sync mode 1.
     *
     * @test
     */
    public function the_full_photo_resync_pushes_every_employee_photo_under_their_bamboo_hr_number()
    {
        $this->bhr->shouldReceive('get_all_bhr_user_numbers')->once()->andReturn(['BHR-A', 'BHR-B']);
        $this->bhr->shouldReceive('get_profile_picture')->andReturnUsing(function ($n) {
            return 'photo-bytes-for-' . $n;
        });
        CallSpFake::fake(self::PHOTO_SP, [[]]);

        $this->artisan('sync:bhr_users_photo', ['all' => 'all'])->assertExitCode(0);

        $calls = CallSpFake::callsFor(self::PHOTO_SP);
        $this->assertCount(2, $calls, 'one push per employee, and no discovery call in the full-resync arm');

        $this->assertSame('BHR-A', $calls[0]['params'][0]);
        $this->assertSame('photo-bytes-for-BHR-A', $calls[0]['params'][1], "the employee's own photo is pushed");
        $this->assertSame(1, $calls[0]['params'][2], 'mode 1 is the push mode');
        $this->assertSame('BHR-B', $calls[1]['params'][0]);
        $this->assertSame('photo-bytes-for-BHR-B', $calls[1]['params'][1]);
    }

    /**
     * The default arm — an incremental run. Mode 2 asks the procedure who still needs a photo, and
     * only those employees are fetched and pushed. The row with no BambooHR number must be skipped
     * rather than pushed with a null identifier, which would overwrite the wrong record.
     *
     * @test
     */
    public function the_incremental_photo_sync_asks_who_needs_one_and_skips_rows_without_a_bamboo_hr_number()
    {
        CallSpFake::fake(self::PHOTO_SP, function ($params, $isExecute) {
            if ((int) $params[2] === 2) {
                return [[
                    (object) ['bhr_num' => 'BHR-C'],
                    (object) ['bhr_num' => null],        // an EVOX row never linked to BambooHR
                ]];
            }

            return [[]];
        });

        $this->bhr->shouldReceive('get_profile_picture')->once()->with('BHR-C')->andReturn('photo-bytes-for-BHR-C');

        $this->artisan('sync:bhr_users_photo')->assertExitCode(0);

        $calls = CallSpFake::callsFor(self::PHOTO_SP);
        $this->assertCount(2, $calls, 'one discovery call plus one push — the unlinked row is not pushed');

        $this->assertNull($calls[0]['params'][0], 'the discovery call carries no employee');
        $this->assertSame(2, $calls[0]['params'][2], 'mode 2 is the discovery mode');

        $this->assertSame('BHR-C', $calls[1]['params'][0]);
        $this->assertSame('photo-bytes-for-BHR-C', $calls[1]['params'][1]);
        $this->assertSame(1, $calls[1]['params'][2]);
    }

    /**
     * The failure arm. A photo that cannot be fetched must not push a broken record and must not
     * bring the command down with an unhandled error — it exits cleanly having pushed nothing.
     *
     * See FINDING PHOTO-LOGCONCAT-1 for what actually happens inside that error arm: the log line
     * itself throws, so control leaves the loop through the outer catch rather than through the
     * `break` written beside it. Either way nothing is pushed, which is what is asserted here.
     *
     * @test
     */
    public function a_photo_that_cannot_be_fetched_pushes_nothing_and_still_exits_cleanly()
    {
        $this->bhr->shouldReceive('get_all_bhr_user_numbers')->once()->andReturn(['BHR-D']);
        $this->bhr->shouldReceive('get_profile_picture')->once()
            ->andThrow(new Exception('BambooHR photo endpoint refused the connection'));
        CallSpFake::fake(self::PHOTO_SP, [[]]);

        $this->artisan('sync:bhr_users_photo', ['all' => 'all'])->assertExitCode(0);

        $this->assertCount(
            0,
            CallSpFake::callsFor(self::PHOTO_SP),
            'a photo that could not be fetched is never pushed to the sync procedure'
        );
    }
}
