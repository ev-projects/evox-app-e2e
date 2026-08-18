<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Schedule/Repositories/ScheduleRepository.php — the catch(Exception) arm of
 *   store(), update(), destroy(), list(), copy_schedule_to_user(), replicate_schedule(),
 *   replicate_schedule_policy(), replicate_schedule_holiday_policy() and the three protected
 *   writers save_schedule_details() / save_schedule_policies() / save_schedule_holiday_policies().
 *
 * MENU PATH   Schedule -> Schedule (create/edit/delete a schedule) and
 *             Schedule -> Assign Schedule (the replicate/copy paths).
 *
 * WHAT THESE ARMS ARE FOR: every writer in this repository opens its own transaction and the catch
 * arm is the only thing that rolls it back. Left untested, a half-written schedule (row saved,
 * details missing) could ship unnoticed. Each test below asserts BOTH halves of the contract: the
 * failure is re-thrown to the caller (never swallowed) AND nothing partial survives.
 *
 * HOW THE FAILURE IS INJECTED: an Eloquent model event (Schedule::creating / ::updating / ::deleting,
 * ScheduleDetail::saving, SchedulePolicy::saving) is registered to throw. That stands in for the
 * real-world cause — the database refusing a write mid-transaction — without needing DDL, a broken
 * connection or a PHP-version-specific notice, and it behaves identically on PHP 7.4 (CI) and 8.x.
 * Listeners are registered AFTER the fixtures are built and die with the test's application
 * instance, so they cannot leak into another test.
 *
 * SAFETY: DatabaseTransactions; every fixture is created by this suite; no SP, no external call, no
 * DDL, no whole-table read. Transaction levels stay balanced — each repository method rolls back
 * exactly the savepoint it opened.
 *
 * FINDINGS: none in this file (see ScheduleRepositoryAssignArmsTest for the two Schedule findings).
 */

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Exception;
use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\Schedule\Models\ScheduleDetail;
use App\Modules\Schedule\Models\SchedulePolicy;
use App\Modules\Schedule\Repositories\ScheduleRepository;
use App\Modules\User\Models\User;

class ScheduleRepositoryRollbackArmsTest extends TestCase
{
    use DatabaseTransactions;

    const INJECTED = 'injected storage failure';

    /** @var ScheduleRepository */
    private $repo;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->repo = new ScheduleRepository();

        // country_id must resolve to a utc_timelog row — save_schedule_details() converts the shift
        // through the actor's offset and cannot run for a user whose country has no timezone row.
        $this->user = User::where('is_active', 1)
            ->whereNotNull('LevelId')
            ->whereIn('country_id', function ($q) {
                $q->select('country_id')->from('utc_timelog')->whereNotNull('country_id');
            })
            ->orderBy('id', 'desc')
            ->first();

        if (!$this->user) {
            $this->markTestSkipped('no active user with a resolvable country timezone in test DB');
        }

        $this->be($this->user);
    }

    private function payload(array $overrides = [], $policyValue = 1)
    {
        $policies = [];
        foreach (array_merge(
            array_values(config('constants.SCHEDULE_POLICIES')),
            array_values(config('constants.SCHEDULE_HOLIDAY_POLICIES'))
        ) as $policy) {
            $policies[$policy] = $policyValue;
        }

        return array_merge([
            'name'              => 'ZZ Rollback Arms ' . uniqid(),
            'source_type'       => 'template',
            'schedule_type'     => 'standard',
            'bind_to'           => null,
            'bind_id'           => null,
            'work_days'         => array_slice(config('constants.DAYS'), 0, 5),
            'schedule_details'  => ['all' => [
                'start_time' => '09:00', 'end_time' => '18:00', 'break_time' => '01:00',
            ]],
            'schedule_policies' => $policies,
        ], $overrides);
    }

    /** Runs $work and returns the exception it must have thrown. */
    private function failureFrom(callable $work)
    {
        $caught = null;
        try {
            $work();
        } catch (Exception $e) {
            $caught = $e;
        }

        $this->assertNotNull($caught, 'the repository must re-throw, never swallow, a write failure');

        return $caught;
    }

    // ==================================================================== store()

    /** @test */
    public function a_schedule_that_cannot_be_saved_leaves_no_row_behind()
    {
        $payload = $this->payload();

        Schedule::creating(function () {
            throw new Exception(self::INJECTED);
        });

        $error = $this->failureFrom(function () use ($payload) {
            $this->repo->store($payload);
        });

        $this->assertSame(self::INJECTED, $error->getMessage());
        $this->assertSame(0, Schedule::where('name', $payload['name'])->count());
    }

    /** @test */
    public function a_schedule_whose_shift_details_fail_to_save_is_rolled_back_whole()
    {
        $payload = $this->payload();

        ScheduleDetail::saving(function () {
            throw new Exception(self::INJECTED);
        });

        $error = $this->failureFrom(function () use ($payload) {
            $this->repo->store($payload);
        });

        $this->assertSame(self::INJECTED, $error->getMessage());
        // The schedule row itself was already INSERTed before the details failed — the catch arm's
        // rollback is the only thing that removes it. A schedule with no shift must never survive.
        $this->assertSame(0, Schedule::where('name', $payload['name'])->count());
    }

    /** @test */
    public function a_schedule_whose_policies_fail_to_save_is_rolled_back_whole()
    {
        $payload = $this->payload();
        $policies = array_values(config('constants.SCHEDULE_POLICIES'));

        SchedulePolicy::saving(function ($policy) use ($policies) {
            if (in_array($policy->policy, $policies)) {
                throw new Exception(self::INJECTED);
            }
        });

        $error = $this->failureFrom(function () use ($payload) {
            $this->repo->store($payload);
        });

        $this->assertSame(self::INJECTED, $error->getMessage());
        $this->assertSame(0, Schedule::where('name', $payload['name'])->count());
    }

    /** @test */
    public function a_schedule_whose_holiday_policies_fail_to_save_is_rolled_back_whole()
    {
        $payload = $this->payload();
        $holidayPolicies = array_values(config('constants.SCHEDULE_HOLIDAY_POLICIES'));

        // Only the holiday family throws, so save_schedule_policies() succeeds first and it is
        // save_schedule_holiday_policies()'s own catch arm that fires.
        SchedulePolicy::saving(function ($policy) use ($holidayPolicies) {
            if (in_array($policy->policy, $holidayPolicies)) {
                throw new Exception(self::INJECTED);
            }
        });

        $error = $this->failureFrom(function () use ($payload) {
            $this->repo->store($payload);
        });

        $this->assertSame(self::INJECTED, $error->getMessage());
        // The three non-holiday policies were committed by save_schedule_policies() one step
        // earlier; store()'s rollback has to take those back out along with the schedule row.
        $this->assertSame(0, Schedule::where('name', $payload['name'])->count());
    }

    // =================================================================== update()

    /** @test */
    public function a_failed_update_keeps_the_schedule_exactly_as_it_was()
    {
        $schedule = $this->repo->store($this->payload());
        $originalName = $schedule->name;
        $originalDetails = $schedule->schedule_details()->count();

        Schedule::updating(function () {
            throw new Exception(self::INJECTED);
        });

        $error = $this->failureFrom(function () use ($schedule) {
            $this->repo->update($this->payload([
                'name'          => 'ZZ Rollback Renamed',
                'schedule_type' => 'flexible',
            ]), $schedule->id);
        });

        $this->assertSame(self::INJECTED, $error->getMessage());

        $fresh = Schedule::find($schedule->id);
        $this->assertNotNull($fresh, 'a failed update must not lose the schedule');
        $this->assertSame($originalName, $fresh->name);
        $this->assertSame('standard', $fresh->schedule_type);
        $this->assertSame($originalDetails, $fresh->schedule_details()->count());
    }

    /** @test */
    public function updating_a_schedule_that_no_longer_exists_reports_the_failure()
    {
        $error = $this->failureFrom(function () {
            $this->repo->update($this->payload(), 999999999);
        });

        $this->assertInstanceOf(\Illuminate\Database\Eloquent\ModelNotFoundException::class, $error);
    }

    // ================================================================== destroy()

    /** @test */
    public function a_failed_delete_restores_the_schedule_with_its_details_and_policies()
    {
        $schedule = $this->repo->store($this->payload());
        $detailCount = $schedule->schedule_details()->count();
        $policyCount = $schedule->schedule_policies()->count();
        $this->assertGreaterThan(0, $detailCount);
        $this->assertGreaterThan(0, $policyCount);

        // destroy() deletes details and policies BEFORE deleting the schedule, so without the
        // rollback a failed delete would strip a schedule that is still live.
        Schedule::deleting(function () {
            throw new Exception(self::INJECTED);
        });

        $error = $this->failureFrom(function () use ($schedule) {
            $this->repo->destroy($schedule->id);
        });

        $this->assertSame(self::INJECTED, $error->getMessage());

        $fresh = Schedule::find($schedule->id);
        $this->assertNotNull($fresh);
        $this->assertSame($detailCount, $fresh->schedule_details()->count());
        $this->assertSame($policyCount, $fresh->schedule_policies()->count());
    }

    /** @test */
    public function deleting_a_schedule_that_no_longer_exists_reports_the_failure()
    {
        $error = $this->failureFrom(function () {
            $this->repo->destroy(999999999);
        });

        $this->assertInstanceOf(\Illuminate\Database\Eloquent\ModelNotFoundException::class, $error);
    }

    // ===================================================================== list()

    /** @test */
    public function listing_the_schedules_of_an_unknown_employee_is_reported_not_answered_empty()
    {
        $error = $this->failureFrom(function () {
            $this->repo->list(999999999);
        });

        $this->assertStringContainsString('999999999', $error->getMessage());
        $this->assertStringContainsString('not found', $error->getMessage());
    }

    // =================================================== copy_schedule_to_user()

    /** @test */
    public function a_failed_copy_gives_the_employee_no_schedule_at_all()
    {
        $source = $this->repo->store($this->payload());
        $before = Schedule::where('bind_to', 'user')->where('bind_id', $this->user->id)->count();

        Schedule::creating(function () {
            throw new Exception(self::INJECTED);
        });

        $error = $this->failureFrom(function () use ($source) {
            $this->repo->copy_schedule_to_user($source, $this->user);
        });

        $this->assertSame(self::INJECTED, $error->getMessage());
        $this->assertSame(
            $before,
            Schedule::where('bind_to', 'user')->where('bind_id', $this->user->id)->count()
        );
    }

    // ======================================================= replicate_schedule()

    /** @test */
    public function a_failed_schedule_replication_leaves_the_target_shift_untouched()
    {
        $source = $this->repo->store($this->payload([
            'source_type'      => 'temporary',
            'schedule_type'    => 'flexible',
            'valid_from'       => '2031-07-01',
            'valid_to'         => '2031-07-31',
            'schedule_details' => ['all' => [
                'start_time' => '14:00', 'end_time' => '23:00', 'break_time' => '01:00',
                'start_flexy_time' => '13:00', 'end_flexy_time' => '15:00',
            ]],
        ]));
        $target = $this->repo->store($this->payload());
        $targetDetailCount = $target->schedule_details()->count();

        Schedule::updating(function () {
            throw new Exception(self::INJECTED);
        });

        $error = $this->failureFrom(function () use ($target, $source) {
            $this->repo->replicate_schedule($target, $source);
        });

        $this->assertSame(self::INJECTED, $error->getMessage());

        $fresh = Schedule::find($target->id);
        $this->assertSame('standard', $fresh->schedule_type, 'the target must keep its own type');
        $this->assertNull($fresh->valid_from);
        $this->assertSame($targetDetailCount, $fresh->schedule_details()->count());
    }

    // ================================================ replicate_schedule_policy()

    /** @test */
    public function a_failed_policy_replication_leaves_the_target_policies_untouched()
    {
        $source = $this->repo->store($this->payload([], 0));
        $target = $this->repo->store($this->payload([], 1));
        $policies = array_values(config('constants.SCHEDULE_POLICIES'));

        SchedulePolicy::saving(function ($policy) use ($policies) {
            if (in_array($policy->policy, $policies)) {
                throw new Exception(self::INJECTED);
            }
        });

        $error = $this->failureFrom(function () use ($target, $source) {
            $this->repo->replicate_schedule_policy($target, $source);
        });

        $this->assertSame(self::INJECTED, $error->getMessage());

        // The method deletes the old policy rows before writing the new ones — without the
        // rollback the target would be left with no schedule policy at all.
        $values = Schedule::find($target->id)->schedule_policies()->pluck('value', 'policy')->all();
        foreach ($policies as $policy) {
            $this->assertArrayHasKey($policy, $values);
            $this->assertEquals(1, $values[$policy]);
        }
    }

    // ======================================== replicate_schedule_holiday_policy()

    /** @test */
    public function a_failed_holiday_policy_replication_leaves_the_target_policies_untouched()
    {
        $source = $this->repo->store($this->payload([], 0));
        $target = $this->repo->store($this->payload([], 1));
        $holidayPolicies = array_values(config('constants.SCHEDULE_HOLIDAY_POLICIES'));

        SchedulePolicy::saving(function ($policy) use ($holidayPolicies) {
            if (in_array($policy->policy, $holidayPolicies)) {
                throw new Exception(self::INJECTED);
            }
        });

        $error = $this->failureFrom(function () use ($target, $source) {
            $this->repo->replicate_schedule_holiday_policy($target, $source);
        });

        $this->assertSame(self::INJECTED, $error->getMessage());

        $values = Schedule::find($target->id)->schedule_policies()->pluck('value', 'policy')->all();
        foreach ($holidayPolicies as $policy) {
            $this->assertArrayHasKey($policy, $values);
            $this->assertEquals(1, $values[$policy]);
        }
    }
}
