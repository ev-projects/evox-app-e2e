<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Schedule/Repositories/ScheduleRepository.php
 *     - assign()                              (public entry, both bind_to arms)
 *     - assign_to_user()                      (protected, reached via assign(); was 45% lines)
 *     - assign_to_department()                (protected, reached via assign(); was 47.62% lines)
 *     - replicate_schedule_policy()           (was 0% — never called by any test)
 *     - replicate_schedule_holiday_policy()   (was 66.67%)
 *     - replicate_schedule()                  (was 80.65%)
 *     - save_schedule_policies() / save_schedule_holiday_policies() (protected, via the above)
 *
 * MENU PATH   Schedule -> Assign Schedule (POST /api/schedule/assign/) and
 *             Schedule -> Assign Department Schedule (same endpoint, bind_to=department).
 *
 * WHY THE REPOSITORY AND NOT THE ROUTE: ScheduleController::assign() loops EVERY user of the
 * department and calls DtrRepository::apply_schedule_to_dtr() per user, which rewrites DTR rows in
 * bulk. That is the one path the branch-test spec forbids driving against the dump. assign() itself
 * is public API, so every arm below is exercised through it with bounded, self-made fixtures.
 *
 * FIXTURE SAFETY: the acting user is picked as one who has NO default/temporary schedule, and the
 * department as one with NO default schedule, so every row this suite updates is a row this suite
 * created. Nothing in the dump is mutated. All writes roll back (DatabaseTransactions).
 *
 * FINDINGS
 *   FINDING BE-SCHED-ACTION-KEY  assign() with bind_to='department' dereferences $data['action']
 *     (ScheduleRepository.php:427, :453) without isset(). 'action' is NOT in AssignScheduleRequest's
 *     rules, so an API client may legitimately omit it; the request then dies on an undefined-index
 *     error that surfaces to the caller as a generic 400 instead of performing the documented
 *     default behaviour (full schedule update). EVOX's own web UI always sends action, so this is
 *     API-surface only. Characterised by
 *     assign__department_without_an_action_key_fails_instead_of_defaulting_to_update_FINDING_BE_SCHED_ACTION_KEY.
 *   FINDING BE-SCHED-DEAD-GUARD  replicate_schedule(), replicate_schedule_policy() and
 *     replicate_schedule_holiday_policy() all guard with `is_valid($schedule) && is_valid($schedule_to_copy)`
 *     on parameters typed `Schedule $schedule`. is_valid() returns true for EVERY object (empty() is
 *     never true for an object) and the type declaration makes null impossible, so the false arm of
 *     those three guards can never execute. Documented by
 *     replicate_guards_can_never_take_their_false_arm_FINDING_BE_SCHED_DEAD_GUARD — that test asserts
 *     today's behaviour (a brand-new, empty Schedule still passes the guard).
 */

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Modules\Department\Models\EvoxDepartment;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\Schedule\Repositories\ScheduleRepository;
use App\Modules\User\Models\User;

class ScheduleRepositoryAssignArmsTest extends TestCase
{
    use DatabaseTransactions;

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

        // A user who owns NO schedule of any kind, so every arm below acts on rows this test made.
        // The country_id filter is load-bearing: save_schedule_details() converts shift times with
        // time_to_seconds(..., true, 'subtract'), which reads the actor's utc_timelog offset and
        // fails outright for a user whose country has no utc_timelog row.
        $this->user = User::where('is_active', 1)
            ->whereNotNull('LevelId')
            ->whereIn('country_id', function ($q) {
                $q->select('country_id')->from('utc_timelog')->whereNotNull('country_id');
            })
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))
                  ->from('schedules')
                  ->whereRaw('schedules.bind_id = users.id')
                  ->where('schedules.bind_to', 'user')
                  ->whereNull('schedules.deleted_at');
            })
            ->orderBy('id', 'desc')
            ->first();

        if (!$this->user) {
            $this->markTestSkipped('no active, levelled user without an existing schedule in test DB');
        }

        // Acting as the assignee themselves takes get_authenticated_user()'s self branch, so no
        // Admin level is required and no other account is touched.
        $this->be($this->user);
    }

    /** Full, valid assign payload. Every policy starts at 1 so later flips are unambiguous. */
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
            'name'              => 'ZZ Assign Arms ' . uniqid(),
            'source_type'       => 'default',
            'schedule_type'     => 'standard',
            'bind_to'           => 'user',
            'bind_id'           => (string) $this->user->id,
            'valid_from'        => '2031-03-01',
            'valid_to'          => null,
            'action'            => '',
            'work_days'         => array_slice(config('constants.DAYS'), 0, 5),
            'schedule_details'  => ['all' => [
                'start_time' => '09:00', 'end_time' => '18:00', 'break_time' => '01:00',
            ]],
            'schedule_policies' => $policies,
        ], $overrides);
    }

    /** A department that owns no default schedule, so the "existing" arm only ever sees our row. */
    private function departmentWithoutDefaultScheduleOrSkip()
    {
        $id = DB::table('EVOX_DEPARTMENT')
            ->whereNotIn('Id', function ($q) {
                // whereNotNull('bind_id') matters: a single NULL inside a NOT IN () list makes the
                // whole predicate unknown and the outer query returns nothing.
                $q->select('bind_id')
                  ->from('schedules')
                  ->where('bind_to', 'department')
                  ->where('source_type', 'default')
                  ->whereNotNull('bind_id')
                  ->whereNull('deleted_at');
            })
            ->orderBy('Id', 'desc')
            ->value('Id');

        if (!$id) {
            $this->markTestSkipped('every EVOX_DEPARTMENT row already owns a default schedule');
        }

        return EvoxDepartment::where('Id', $id)->first();
    }

    private function policyValues(Schedule $schedule)
    {
        return $schedule->schedule_policies()->pluck('value', 'policy')->all();
    }

    // ============================================================== assign_to_user()

    /** @test */
    public function assigning_a_default_schedule_twice_updates_the_same_row_instead_of_creating_a_second_one()
    {
        // INSERT arm: the user has no default schedule yet.
        $first = $this->repo->assign($this->payload());

        $this->assertSame('user', $first->bind_to);
        $this->assertEquals($this->user->id, $first->bind_id);
        $this->assertSame('default', $first->source_type);
        $this->assertSame(1, $this->user->defaultSchedule()->count());

        // UPDATE arm: a default schedule now exists, so the second assign must reuse its id.
        $second = $this->repo->assign($this->payload([
            'schedule_details' => ['all' => [
                'start_time' => '13:00', 'end_time' => '22:00', 'break_time' => '01:00',
            ]],
        ]));

        $this->assertSame($first->id, $second->id, 'a second default schedule must never be created');
        $this->assertSame(1, $this->user->defaultSchedule()->count());
        $this->assertSame(
            time_to_seconds('13:00', true, 'subtract'),
            (int) $second->schedule_details()->where('day', 'all')->first()->start_time,
            'the update arm must rewrite the schedule details, not keep the old shift'
        );
    }

    /** @test */
    public function a_temporary_schedule_is_reused_only_when_both_of_its_dates_match()
    {
        $window = ['source_type' => 'temporary', 'valid_from' => '2031-04-01', 'valid_to' => '2031-04-07'];

        $first = $this->repo->assign($this->payload($window));
        $this->assertSame('temporary', $first->source_type);

        // Same from/to -> the existing temporary schedule is updated in place.
        $same = $this->repo->assign($this->payload($window));
        $this->assertSame($first->id, $same->id);

        // A different window is a different assignment -> INSERT arm, a second row.
        $other = $this->repo->assign($this->payload([
            'source_type' => 'temporary', 'valid_from' => '2031-05-01', 'valid_to' => '2031-05-07',
        ]));
        $this->assertNotSame($first->id, $other->id);
        $this->assertSame(2, $this->user->temporarySchedules()->count());
    }

    // ======================================================== assign_to_department()

    /** @test */
    public function the_first_department_assignment_creates_the_schedule_and_the_next_one_updates_it()
    {
        $department = $this->departmentWithoutDefaultScheduleOrSkip();

        $created = $this->repo->assign($this->payload([
            'bind_to' => 'department',
            'bind_id' => (string) $department->Id,
            'action'  => 'update',
        ]));

        // INSERT arm (department owns no default schedule yet).
        $this->assertSame('department', $created->bind_to);
        $this->assertEquals($department->Id, $created->bind_id);
        $this->assertSame(1, $department->defaultSchedule()->count());

        // Unrecognised action -> switch default arm -> whole schedule updated on the SAME row.
        $updated = $this->repo->assign($this->payload([
            'bind_to'          => 'department',
            'bind_id'          => (string) $department->Id,
            'action'           => 'no_such_action',
            'schedule_details' => ['all' => [
                'start_time' => '22:00', 'end_time' => '07:00', 'break_time' => '01:00',
            ]],
        ]));

        $this->assertSame($created->id, $updated->id);
        $this->assertSame(
            time_to_seconds('22:00', true, 'subtract'),
            (int) $updated->schedule_details()->where('day', 'all')->first()->start_time
        );
    }

    /** @test */
    public function an_empty_action_falls_through_to_a_full_department_schedule_update()
    {
        $department = $this->departmentWithoutDefaultScheduleOrSkip();
        $base = ['bind_to' => 'department', 'bind_id' => (string) $department->Id];

        $created = $this->repo->assign($this->payload($base + ['action' => 'update']));

        // action = '' -> is_valid() false -> the else branch, i.e. the same full update.
        $updated = $this->repo->assign($this->payload($base + [
            'action'           => '',
            'schedule_details' => ['all' => [
                'start_time' => '06:00', 'end_time' => '15:00', 'break_time' => '00:30',
            ]],
        ]));

        $this->assertSame($created->id, $updated->id);
        $this->assertSame(
            time_to_seconds('06:00', true, 'subtract'),
            (int) $updated->schedule_details()->where('day', 'all')->first()->start_time
        );
    }

    /** @test */
    public function assigning_only_the_holiday_policy_leaves_the_shift_and_the_other_policies_alone()
    {
        $department = $this->departmentWithoutDefaultScheduleOrSkip();
        $base = ['bind_to' => 'department', 'bind_id' => (string) $department->Id];

        $created = $this->repo->assign($this->payload($base + ['action' => 'update']));
        $detailCountBefore = $created->schedule_details()->count();

        $result = $this->repo->assign($this->payload($base + [
            'action'           => 'assign_schedule_holiday_policy',
            'schedule_details' => ['all' => [
                'start_time' => '23:00', 'end_time' => '08:00', 'break_time' => '01:00',
            ]],
        ], 0));

        $values = $this->policyValues($result);

        foreach (config('constants.SCHEDULE_HOLIDAY_POLICIES') as $policy) {
            $this->assertEquals(0, $values[$policy], "$policy must be overwritten by the holiday push");
        }
        foreach (config('constants.SCHEDULE_POLICIES') as $policy) {
            $this->assertEquals(1, $values[$policy], "$policy must NOT be touched by the holiday push");
        }
        $this->assertSame($detailCountBefore, $result->schedule_details()->count());
        $this->assertSame(
            time_to_seconds('09:00', true, 'subtract'),
            (int) $result->schedule_details()->where('day', 'all')->first()->start_time,
            'a policy-only push must leave the shift times untouched'
        );
    }

    /** @test */
    public function assigning_only_the_schedule_policy_leaves_the_shift_and_the_holiday_policies_alone()
    {
        $department = $this->departmentWithoutDefaultScheduleOrSkip();
        $base = ['bind_to' => 'department', 'bind_id' => (string) $department->Id];

        $created = $this->repo->assign($this->payload($base + ['action' => 'update']));

        $result = $this->repo->assign($this->payload($base + [
            'action'           => 'assign_schedule_policy',
            'schedule_details' => ['all' => [
                'start_time' => '23:00', 'end_time' => '08:00', 'break_time' => '01:00',
            ]],
        ], 0));

        $values = $this->policyValues($result);

        foreach (config('constants.SCHEDULE_POLICIES') as $policy) {
            $this->assertEquals(0, $values[$policy], "$policy must be overwritten by the policy push");
        }
        foreach (config('constants.SCHEDULE_HOLIDAY_POLICIES') as $policy) {
            $this->assertEquals(1, $values[$policy], "$policy must NOT be touched by the policy push");
        }
        $this->assertSame(
            time_to_seconds('09:00', true, 'subtract'),
            (int) $result->schedule_details()->where('day', 'all')->first()->start_time
        );
        $this->assertSame($created->id, $result->id);
    }

    /** @test */
    public function a_bind_to_that_is_neither_user_nor_department_assigns_nothing()
    {
        $before = Schedule::where('bind_id', $this->user->id)->where('bind_to', 'user')->count();

        $result = $this->repo->assign($this->payload(['bind_to' => 'client']));

        $this->assertNull($result, 'only user and department bindings may create a schedule');
        $this->assertSame(
            $before,
            Schedule::where('bind_id', $this->user->id)->where('bind_to', 'user')->count()
        );
    }

    /**
     * FINDING BE-SCHED-ACTION-KEY — 'action' is optional per AssignScheduleRequest but
     * assign_to_department() reads it unguarded, so omitting it aborts the assignment. The
     * documented fallback (full update) is never reached. Flip this assertion when the isset()
     * guard is added.
     *
     * @test
     */
    public function assign__department_without_an_action_key_fails_instead_of_defaulting_to_update_FINDING_BE_SCHED_ACTION_KEY()
    {
        $department = $this->departmentWithoutDefaultScheduleOrSkip();
        $base = ['bind_to' => 'department', 'bind_id' => (string) $department->Id];

        // Give the department a schedule so the "existing" arm — the one that reads action — runs.
        $this->repo->assign($this->payload($base + ['action' => 'update']));

        $payload = $this->payload($base);
        unset($payload['action']);

        $caught = null;
        try {
            $this->repo->assign($payload);
        } catch (\Exception $e) {
            $caught = $e;
        }

        $this->assertNotNull($caught, 'today the missing key aborts the assignment');
        $this->assertStringContainsString('action', $caught->getMessage());
    }

    // =========================================================== replicate_* methods

    /** @test */
    public function replicating_the_schedule_policy_copies_that_family_and_only_that_family()
    {
        $source = $this->repo->store($this->payload([
            'source_type' => 'template', 'bind_to' => null, 'bind_id' => null,
        ], 0));
        $target = $this->repo->store($this->payload([
            'source_type' => 'template', 'bind_to' => null, 'bind_id' => null,
        ], 1));

        $result = $this->repo->replicate_schedule_policy($target, $source);

        $values = $this->policyValues($result);
        foreach (config('constants.SCHEDULE_POLICIES') as $policy) {
            $this->assertEquals(0, $values[$policy], "$policy must be taken from the source schedule");
        }
        foreach (config('constants.SCHEDULE_HOLIDAY_POLICIES') as $policy) {
            $this->assertEquals(1, $values[$policy], "$policy belongs to the holiday family and must stay");
        }
        $this->assertCount(
            count(config('constants.SCHEDULE_POLICIES')) + count(config('constants.SCHEDULE_HOLIDAY_POLICIES')),
            $values,
            'the old policy rows must be deleted, not duplicated'
        );
    }

    /** @test */
    public function replicating_the_holiday_policy_copies_that_family_and_only_that_family()
    {
        $source = $this->repo->store($this->payload([
            'source_type' => 'template', 'bind_to' => null, 'bind_id' => null,
        ], 0));
        $target = $this->repo->store($this->payload([
            'source_type' => 'template', 'bind_to' => null, 'bind_id' => null,
        ], 1));

        $result = $this->repo->replicate_schedule_holiday_policy($target, $source);

        $values = $this->policyValues($result);
        foreach (config('constants.SCHEDULE_HOLIDAY_POLICIES') as $policy) {
            $this->assertEquals(0, $values[$policy]);
        }
        foreach (config('constants.SCHEDULE_POLICIES') as $policy) {
            $this->assertEquals(1, $values[$policy]);
        }
    }

    /** @test */
    public function replicating_a_whole_schedule_copies_the_shift_the_dates_and_both_policy_families()
    {
        $source = $this->repo->store($this->payload([
            'source_type'      => 'temporary',
            'bind_to'          => null,
            'bind_id'          => null,
            'valid_from'       => '2031-06-01',
            'valid_to'         => '2031-06-30',
            'schedule_type'    => 'flexible',
            'schedule_details' => ['all' => [
                'start_time' => '14:00', 'end_time' => '23:00', 'break_time' => '01:00',
                'start_flexy_time' => '13:00', 'end_flexy_time' => '15:00',
            ]],
        ], 0));
        $target = $this->repo->store($this->payload([
            'source_type' => 'template', 'bind_to' => null, 'bind_id' => null,
        ], 1));

        $result = $this->repo->replicate_schedule($target, $source);

        $this->assertSame('flexible', $result->schedule_type);
        $this->assertEquals($source->valid_from, $result->valid_from);
        $this->assertEquals($source->valid_to, $result->valid_to);
        $this->assertEquals($source->rest_days, $result->rest_days);

        $detail = $result->schedule_details()->where('day', 'all')->first();
        $this->assertNotNull($detail, 'the replicated schedule must carry the source shift');
        $this->assertEquals(
            (int) $source->schedule_details()->where('day', 'all')->first()->start_time,
            (int) $detail->start_time
        );

        foreach ($this->policyValues($result) as $policy => $value) {
            $this->assertEquals(0, $value, "$policy must come from the source schedule");
        }
    }

    /**
     * FINDING BE-SCHED-DEAD-GUARD — `is_valid($schedule)` on a parameter typed `Schedule` can never
     * be false: is_valid() returns true for every object and the type declaration rules out null.
     * The three replicate_* methods therefore carry a guard whose false arm is unreachable. This
     * test pins today's behaviour: even a blank, never-saved Schedule passes the guard and the body
     * runs. It will fail (and should be rewritten) if the guard is ever replaced with a real check.
     *
     * @test
     */
    public function replicate_guards_can_never_take_their_false_arm_FINDING_BE_SCHED_DEAD_GUARD()
    {
        $this->assertTrue(is_valid(new Schedule()), 'is_valid() is true for any object, blank or not');

        $source = $this->repo->store($this->payload([
            'source_type' => 'template', 'bind_to' => null, 'bind_id' => null,
        ], 0));
        $target = $this->repo->store($this->payload([
            'source_type' => 'template', 'bind_to' => null, 'bind_id' => null,
        ], 1));

        // Guard true on both sides is the only reachable combination, so the copy always happens.
        $result = $this->repo->replicate_schedule_policy($target, $source);
        $values = $this->policyValues($result);
        foreach (config('constants.SCHEDULE_POLICIES') as $policy) {
            $this->assertEquals(0, $values[$policy]);
        }
    }
}
