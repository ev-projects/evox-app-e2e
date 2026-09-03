<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Payroll/Repositories/DtrRepository.php
 *       ::generate_dtr                 ::apply_schedule_to_dtr      ::remove_schedule_to_dtr
 *       ::save_dtr_policies (protected, entered at :139 / :254 / :362)
 *       ::optimze_schedule_application (private, entered at :239)
 *
 * MENU PATH
 *   Admin -> Schedule -> Assign / Remove schedule   (apply_schedule_to_dtr, remove_schedule_to_dtr)
 *   My Team -> Requests -> Change Schedule (approve/decline)  (both, via ChangeScheduleController)
 *   Cron -> Generate Weekly DTR                     (generate_dtr)
 *
 * COVERAGE BEFORE THIS FILE
 *   generate_dtr                  97.96%
 *   apply_schedule_to_dtr         79.59%
 *   remove_schedule_to_dtr        46.67%
 *   save_dtr_policies             71.43%
 *   optimze_schedule_application   0.00%
 *
 * FIXTURE NOTE
 *   These suites demand an owner with NO user-bound schedule (fxNoSchedule). Dtr::getBestSchedule()
 *   reads the owner's default schedule with no date bound whatsoever, so a schedule that happens to
 *   exist in the staging dump would decide every assertion below instead of the fixture. Every
 *   schedule under test is therefore built here.
 *
 * FINDINGS
 *   none
 */

namespace Tests\Feature\BranchTests\Payroll\DTR;

use Tests\TestCase;
use Tests\Feature\BranchTests\Support\DtrFixtureTrait;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\DtrPayrollItems;
use App\Modules\Payroll\Models\DtrPolicy;
use App\Modules\Payroll\Repositories\DtrRepository;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\Schedule\Models\ScheduleDetail;

class DtrScheduleBranchTest extends TestCase
{
    use DatabaseTransactions, DtrFixtureTrait;

    /** @var DtrRepository */
    private $repo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fxNoSchedule = true;              // must be set before the first fixture call
        $this->repo = $this->app->make(DtrRepository::class);
    }

    /** The user collection generate_dtr expects. */
    private function userCollection()
    {
        $collection = new EloquentCollection();
        $collection->push($this->requireFixtureUser());
        return $collection;
    }

    private function dtrOn($date)
    {
        return Dtr::where('user_id', $this->requireFixtureUser()->id)->where('date', $date)->first();
    }

    private function policyMap(Dtr $dtr)
    {
        return DtrPolicy::where('dtr_id', $dtr->id)->pluck('value', 'policy')->all();
    }

    // =======================================================================================
    // generate_dtr
    // =======================================================================================

    /** @test */
    public function generating_a_date_range_creates_exactly_one_dtr_row_per_employee_per_date()
    {
        $dates = [$this->fixtureDate(0), $this->fixtureDate(1), $this->fixtureDate(2)];

        $result = $this->repo->generate_dtr($this->userCollection(), $dates);

        $this->assertSame(3, $result['total_dtr_count']);
        $this->assertCount(3, $result['dtr']);
        foreach ($dates as $date) {
            $this->assertNotNull($this->dtrOn($date), "no DTR generated for {$date}");
        }
    }

    // The batch insert is ON DUPLICATE KEY UPDATE: re-running the generator over a date the
    // employee already has must not give them a second record for that day.
    /** @test */
    public function regenerating_a_date_that_already_has_a_record_updates_it_instead_of_duplicating_it()
    {
        $existing = $this->makeDtr(0);

        $this->repo->generate_dtr($this->userCollection(), [$this->fixtureDate(0), $this->fixtureDate(1)]);

        $rows = Dtr::where('user_id', $this->requireFixtureUser()->id)
                   ->where('date', $this->fixtureDate(0))->get();
        $this->assertCount(1, $rows);
        $this->assertSame($existing->id, $rows->first()->id);
    }

    /** @test */
    public function generating_writes_the_employees_schedule_onto_each_generated_day_and_copies_its_policies()
    {
        $schedule = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(1),
        ]);
        $this->addSchedulePolicy($schedule, 'allow_late', '1');
        $this->addSchedulePolicy($schedule, 'allow_night_diff', '1');

        $this->repo->generate_dtr($this->userCollection(), [$this->fixtureDate(0)]);

        $dtr = $this->dtrOn($this->fixtureDate(0));
        $this->assertEquals($this->fixtureTs(0, 8 * 3600), $dtr->start_datetime);
        $this->assertEquals($this->fixtureTs(0, 17 * 3600), $dtr->end_datetime);
        $this->assertEquals(3600, $dtr->break_time);
        $this->assertEquals(0, $dtr->is_rest_day);
        $this->assertSame(get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'), $dtr->source_type_tagging);
        $this->assertEquals(['allow_late' => '1', 'allow_night_diff' => '1'], $this->policyMap($dtr));
    }

    // The anchor day is a Monday, so listing 'mon' as a rest day leaves that day with no schedule
    // detail at all: the day is generated, flagged as a rest day, and left without hours.
    /** @test */
    public function generating_a_day_the_schedule_calls_a_rest_day_leaves_it_flagged_and_without_hours()
    {
        $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(1),
            'rest_days'   => ['mon'],
        ]);

        $this->repo->generate_dtr($this->userCollection(), [$this->fixtureDate(0)]);

        $dtr = $this->dtrOn($this->fixtureDate(0));
        $this->assertEquals(1, $dtr->is_rest_day);
        $this->assertNull($dtr->start_datetime);
        $this->assertNull($dtr->end_datetime);
    }

    // An approved rest day work outranks the schedule: the generator applies the requested hours
    // and tags the day as rest day work rather than laying the ordinary schedule over it.
    /** @test */
    public function an_approved_rest_day_work_outranks_the_schedule_when_generating_that_day()
    {
        $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(1),
        ]);
        $this->makeDtr(0);
        RestDayWork::create([
            'user_id'    => $this->requireFixtureUser()->id,
            'date'       => $this->fixtureDate(0),
            'start_time' => 13 * 3600,
            'end_time'   => 19 * 3600,
            'break_time' => 0,
            'status'     => get_constant('REQUEST_STATUS.approved'),
            'created_by' => $this->requireFixtureUser()->id,
            'updated_by' => $this->requireFixtureUser()->id,
        ]);

        $this->repo->generate_dtr($this->userCollection(), [$this->fixtureDate(0)]);

        $dtr = $this->dtrOn($this->fixtureDate(0));
        $this->assertEquals($this->fixtureTs(0, 13 * 3600), $dtr->start_datetime);
        $this->assertEquals($this->fixtureTs(0, 19 * 3600), $dtr->end_datetime);
        $this->assertEquals($this->fixtureTs(0, 13 * 3600), $dtr->time_in);
        $this->assertEquals($this->fixtureTs(0, 19 * 3600), $dtr->time_out);
        $this->assertEquals(1, $dtr->is_rest_day);
        $this->assertSame(get_constant('DTR_SOURCE_TYPE_TAGGING.rest_day_work'), $dtr->source_type_tagging);
    }

    // Generation is all-or-nothing. A schedule saved without its detail row makes getPerDay()
    // throw part-way through the run; the days inserted before the failure must be rolled back
    // rather than left behind half-generated.
    /** @test */
    public function a_failure_part_way_through_generation_rolls_the_whole_batch_back()
    {
        $schedule = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(1),
        ]);
        ScheduleDetail::where('schedule_id', $schedule->id)->delete();   // the 'all' detail is gone

        $threw = false;
        try {
            $this->repo->generate_dtr($this->userCollection(), [$this->fixtureDate(0), $this->fixtureDate(1)]);
        } catch (ModelNotFoundException $e) {
            $threw = true;
        }

        $this->assertTrue($threw, 'generate_dtr swallowed the missing schedule detail');
        $this->assertNull($this->dtrOn($this->fixtureDate(0)));
        $this->assertNull($this->dtrOn($this->fixtureDate(1)));
    }

    // =======================================================================================
    // apply_schedule_to_dtr
    // =======================================================================================

    /** @test */
    public function applying_a_schedule_rewrites_only_the_days_inside_its_validity_window()
    {
        $schedule = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(1),
        ]);
        $this->makeDtr(0);
        $this->makeDtr(1);
        $outside = $this->makeDtr(5);

        $result = $this->repo->apply_schedule_to_dtr($this->requireFixtureUser(), $schedule);

        $this->assertCount(2, $result['updated']);
        $this->assertCount(0, $result['not_updated']);
        $this->assertEquals($this->fixtureTs(0, 8 * 3600), $this->dtrOn($this->fixtureDate(0))->start_datetime);
        $this->assertEquals($this->fixtureTs(1, 8 * 3600), $this->dtrOn($this->fixtureDate(1))->start_datetime);
        $this->assertNull($outside->fresh()->start_datetime, 'a day outside the window was rewritten');
    }

    // The repository accepts either the model or the bare id — the change-schedule approval flow
    // hands it an id.
    /** @test */
    public function applying_a_schedule_accepts_the_employee_id_in_place_of_the_employee()
    {
        $schedule = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(0),
        ]);
        $this->makeDtr(0);

        $result = $this->repo->apply_schedule_to_dtr($this->requireFixtureUser()->id, $schedule);

        $this->assertCount(1, $result['updated']);
        $this->assertEquals($this->fixtureTs(0, 8 * 3600), $this->dtrOn($this->fixtureDate(0))->start_datetime);
    }

    // Hierarchy rule: a temporary schedule, a change schedule and rest day work all outrank the
    // employee's default schedule, so re-applying the default must leave those days alone.
    /** @test */
    public function the_default_schedule_does_not_overwrite_a_day_already_held_by_a_temporary_schedule()
    {
        $schedule = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.default'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(0),
        ]);
        $held = $this->makeDtr(0, ['source_type_tagging' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary')]);

        $result = $this->repo->apply_schedule_to_dtr($this->requireFixtureUser(), $schedule);

        $this->assertCount(1, $result['not_updated']);
        $this->assertCount(0, $result['updated']);
        $this->assertNull($held->fresh()->start_datetime);
        $this->assertSame(get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'), $held->fresh()->source_type_tagging);
    }

    /** @test */
    public function the_default_schedule_does_not_overwrite_a_day_already_held_by_a_change_schedule()
    {
        $schedule = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.default'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(0),
        ]);
        $held = $this->makeDtr(0, ['source_type_tagging' => get_constant('DTR_SOURCE_TYPE_TAGGING.change_schedule')]);

        $result = $this->repo->apply_schedule_to_dtr($this->requireFixtureUser(), $schedule);

        $this->assertCount(1, $result['not_updated']);
        $this->assertNull($held->fresh()->start_datetime);
    }

    // The bypass flag exists for the bulk re-application in ScheduleController and deliberately
    // overrides that hierarchy.
    /** @test */
    public function the_bypass_flag_lets_the_default_schedule_overwrite_a_temporary_day()
    {
        $schedule = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.default'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(0),
        ]);
        $held = $this->makeDtr(0, ['source_type_tagging' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary')]);

        $result = $this->repo->apply_schedule_to_dtr($this->requireFixtureUser(), $schedule, true);

        $this->assertCount(1, $result['updated']);
        $this->assertCount(0, $result['not_updated']);
        $this->assertEquals($this->fixtureTs(0, 8 * 3600), $held->fresh()->start_datetime);
        $this->assertSame(get_constant('DTR_SOURCE_TYPE_TAGGING.default'), $held->fresh()->source_type_tagging);
    }

    // An approved rest day work is applied in place of the schedule, and the day is reported as
    // neither updated nor skipped — it took a different route entirely.
    /** @test */
    public function an_approved_rest_day_work_is_applied_in_place_of_the_schedule()
    {
        $schedule = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(0),
        ]);
        $dtr = $this->makeDtr(0);
        RestDayWork::create([
            'user_id'    => $this->requireFixtureUser()->id,
            'date'       => $this->fixtureDate(0),
            'start_time' => 14 * 3600,
            'end_time'   => 20 * 3600,
            'break_time' => 0,
            'status'     => get_constant('REQUEST_STATUS.approved'),
            'created_by' => $this->requireFixtureUser()->id,
            'updated_by' => $this->requireFixtureUser()->id,
        ]);

        $result = $this->repo->apply_schedule_to_dtr($this->requireFixtureUser(), $schedule);

        $this->assertCount(0, $result['updated']);
        $this->assertEquals($this->fixtureTs(0, 14 * 3600), $dtr->fresh()->start_datetime);
        $this->assertSame(get_constant('DTR_SOURCE_TYPE_TAGGING.rest_day_work'), $dtr->fresh()->source_type_tagging);
    }

    // A rest day work that is still pending does NOT outrank the schedule.
    /** @test */
    public function a_pending_rest_day_work_does_not_displace_the_schedule()
    {
        $schedule = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(0),
        ]);
        $dtr = $this->makeDtr(0);
        RestDayWork::create([
            'user_id'    => $this->requireFixtureUser()->id,
            'date'       => $this->fixtureDate(0),
            'start_time' => 14 * 3600,
            'end_time'   => 20 * 3600,
            'break_time' => 0,
            'status'     => get_constant('REQUEST_STATUS.pending'),
            'created_by' => $this->requireFixtureUser()->id,
            'updated_by' => $this->requireFixtureUser()->id,
        ]);

        $result = $this->repo->apply_schedule_to_dtr($this->requireFixtureUser(), $schedule);

        $this->assertCount(1, $result['updated']);
        $this->assertEquals($this->fixtureTs(0, 8 * 3600), $dtr->fresh()->start_datetime);
    }

    // A schedule with no end date runs from its start date onwards. Anchored in the future so the
    // unbounded query can only see the two days this test just created.
    /** @test */
    public function a_schedule_with_no_end_date_applies_to_every_day_from_its_start_onwards()
    {
        $schedule = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'),
            'valid_from'  => $this->fixtureFutureDate(0),
            'valid_to'    => null,
        ]);
        $first  = $this->makeDtrOnDate($this->fixtureFutureDate(0));
        $second = $this->makeDtrOnDate($this->fixtureFutureDate(30));

        $result = $this->repo->apply_schedule_to_dtr($this->requireFixtureUser(), $schedule);

        $this->assertCount(2, $result['updated']);
        $this->assertEquals(
            (int) add_time_to_timestamp($this->fixtureFutureDate(0), 8 * 3600),
            $first->fresh()->start_datetime
        );
        $this->assertEquals(
            (int) add_time_to_timestamp($this->fixtureFutureDate(30), 8 * 3600),
            $second->fresh()->start_datetime
        );
    }

    // optimze_schedule_application: schedule times are stored against the DTR's calendar date, but
    // they are read back in the employee's own timezone. A start time late enough that the
    // employee's local clock has already rolled over to the next day would otherwise park the shift
    // on the wrong date, so the whole detail is pulled back by a day.
    //
    // The start time is derived from the employee's actual offset — start + offset = 00:30 the
    // following day — so the arm fires for every EVOX country rather than only the +08:00 ones.
    /** @test */
    public function a_shift_whose_local_start_has_already_rolled_into_the_next_day_is_pulled_back_a_day()
    {
        $offset      = $this->fixtureOffset();
        $start_secs  = 86400 - $offset + 1800;                 // local 00:30 of the following day
        $schedule    = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(0),
        ], [
            'start_time' => $start_secs,
            'end_time'   => $start_secs + 4 * 3600,
        ]);
        $dtr = $this->makeDtr(0);

        $this->repo->apply_schedule_to_dtr($this->requireFixtureUser(), $schedule);

        $unshifted = (int) add_time_to_timestamp($this->fixtureDate(0), $start_secs);
        $this->assertEquals($unshifted - 86400, $dtr->fresh()->start_datetime);
        $this->assertEquals($unshifted + 4 * 3600 - 86400, $dtr->fresh()->end_datetime);
    }

    // ...and the counterpart: when the local start still falls on the DTR's own date, the detail is
    // written through untouched.
    /** @test */
    public function a_shift_whose_local_start_is_still_on_the_same_day_is_written_through_untouched()
    {
        $schedule = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(0),
        ], [
            'start_time' => 0,                                  // midnight UTC; every EVOX offset
            'end_time'   => 4 * 3600,                           // is positive, so still the same day
        ]);
        $dtr = $this->makeDtr(0);

        $this->repo->apply_schedule_to_dtr($this->requireFixtureUser(), $schedule);

        $this->assertEquals((int) add_time_to_timestamp($this->fixtureDate(0), 0), $dtr->fresh()->start_datetime);
    }

    // save_dtr_policies wipes the day's policies before copying the schedule's across, so a policy
    // that is no longer on the schedule must not survive the reassignment.
    /** @test */
    public function applying_a_schedule_replaces_the_days_policies_with_the_schedules_own()
    {
        $schedule = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(0),
        ]);
        $this->addSchedulePolicy($schedule, 'allow_late', '1');
        $dtr = $this->makeDtr(0);
        $this->addPolicy($dtr, 'allow_undertime', '1');         // stale: not on the new schedule
        $this->addPolicy($dtr, 'allow_late', '0');              // stale value for a kept policy

        $this->repo->apply_schedule_to_dtr($this->requireFixtureUser(), $schedule);

        $this->assertEquals(['allow_late' => '1'], $this->policyMap($dtr));
    }

    // A schedule with no policies at all leaves the day with none.
    /** @test */
    public function applying_a_schedule_that_carries_no_policies_clears_the_days_policies()
    {
        $schedule = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(0),
        ]);
        $dtr = $this->makeDtr(0);
        $this->addPolicy($dtr, 'allow_late', '1');

        $this->repo->apply_schedule_to_dtr($this->requireFixtureUser(), $schedule);

        $this->assertSame([], $this->policyMap($dtr));
    }

    // Reapplying a schedule recomputes the day's pay: items computed against the old hours are
    // discarded rather than accumulated.
    /** @test */
    public function applying_a_schedule_recomputes_the_days_payroll_items_from_scratch()
    {
        $schedule = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(0),
        ]);
        $dtr = $this->makeDtr(0);
        DtrPayrollItems::create([
            'dtr_id' => $dtr->id,
            'item'   => get_constant('PAYROLL_ITEMS.overtime'),
            'value'  => 99999,
        ]);

        $this->repo->apply_schedule_to_dtr($this->requireFixtureUser(), $schedule);

        $stale = DtrPayrollItems::where('dtr_id', $dtr->id)
                                ->where('value', 99999)->count();
        $this->assertSame(0, $stale, 'the stale overtime item survived the recomputation');
    }

    // =======================================================================================
    // remove_schedule_to_dtr
    // =======================================================================================

    // Removing the schedule that was covering a day does not blank the day: the next best schedule
    // the employee still has takes over, and the day is re-tagged to match it.
    /** @test */
    public function removing_a_schedule_hands_each_day_back_to_the_employees_remaining_schedule()
    {
        $fallback = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.default'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(3),
        ], ['start_time' => 9 * 3600, 'end_time' => 18 * 3600, 'break_time' => 1800]);
        $this->addSchedulePolicy($fallback, 'allow_night_diff', '1');

        $removed = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(0),
        ]);
        $dtr = $this->makeDtr(0, [
            'source_type_tagging' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'),
            'start_datetime'      => $this->fixtureTs(0, 8 * 3600),
            'end_datetime'        => $this->fixtureTs(0, 17 * 3600),
        ]);
        $this->addPolicy($dtr, 'allow_late', '1');

        $removed->delete();                                     // the caller retires it first
        $result = $this->repo->remove_schedule_to_dtr($this->requireFixtureUser(), $removed);

        $this->assertCount(1, $result['updated']);
        $fresh = $dtr->fresh();
        $this->assertEquals($this->fixtureTs(0, 9 * 3600), $fresh->start_datetime);
        $this->assertEquals($this->fixtureTs(0, 18 * 3600), $fresh->end_datetime);
        $this->assertEquals(1800, $fresh->break_time);
        $this->assertEquals(0, $fresh->is_rest_day);
        $this->assertSame(get_constant('DTR_SOURCE_TYPE_TAGGING.default'), $fresh->source_type_tagging);
        // the day's policies now come from the fallback schedule, not the retired one
        $this->assertEquals(['allow_night_diff' => '1'], $this->policyMap($dtr));
    }

    // If the remaining schedule treats that weekday as a rest day, removing the old schedule clears
    // the day's hours outright rather than leaving the retired schedule's times behind.
    /** @test */
    public function removing_a_schedule_clears_the_hours_when_the_remaining_schedule_calls_it_a_rest_day()
    {
        $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.default'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(3),
            'rest_days'   => ['mon'],                           // the anchor day is a Monday
        ]);
        $removed = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(0),
        ]);
        $dtr = $this->makeDtr(0, [
            'start_datetime'       => $this->fixtureTs(0, 8 * 3600),
            'end_datetime'         => $this->fixtureTs(0, 17 * 3600),
            'start_flexy_datetime' => $this->fixtureTs(0, 10 * 3600),
            'end_flexy_datetime'   => $this->fixtureTs(0, 19 * 3600),
            'break_time'           => 3600,
        ]);

        $removed->delete();
        $this->repo->remove_schedule_to_dtr($this->requireFixtureUser(), $removed);

        $fresh = $dtr->fresh();
        $this->assertEquals(1, $fresh->is_rest_day);
        $this->assertNull($fresh->start_datetime);
        $this->assertNull($fresh->end_datetime);
        $this->assertNull($fresh->start_flexy_datetime);
        $this->assertNull($fresh->end_flexy_datetime);
        $this->assertNull($fresh->break_time);
    }

    /** @test */
    public function removing_a_schedule_accepts_the_employee_id_in_place_of_the_employee()
    {
        $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.default'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(3),
        ], ['start_time' => 9 * 3600, 'end_time' => 18 * 3600, 'break_time' => 0]);
        $removed = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(0),
        ]);
        $dtr = $this->makeDtr(0);

        $removed->delete();
        $result = $this->repo->remove_schedule_to_dtr($this->requireFixtureUser()->id, $removed);

        $this->assertCount(1, $result['updated']);
        $this->assertEquals($this->fixtureTs(0, 9 * 3600), $dtr->fresh()->start_datetime);
    }

    // Nothing in the window means nothing to do — and no exception.
    /** @test */
    public function removing_a_schedule_that_covers_no_recorded_days_reports_nothing_updated()
    {
        $removed = $this->makeSchedule([
            'source_type' => get_constant('DTR_SOURCE_TYPE_TAGGING.temporary'),
            'valid_from'  => $this->fixtureDate(0),
            'valid_to'    => $this->fixtureDate(0),
        ]);

        $removed->delete();
        $result = $this->repo->remove_schedule_to_dtr($this->requireFixtureUser(), $removed);

        $this->assertSame([], $result['updated']);
        $this->assertSame([], $result['not_updated']);
    }
}
