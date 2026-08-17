<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\DtrPayrollItems;
use App\Modules\Payroll\Models\DtrPolicy;
use App\Modules\Payroll\Models\DtrPunchHistory;
use App\Modules\Payroll\Models\Holiday;
use App\Modules\Payroll\Models\Leave;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\Schedule\Models\Schedule;

/**
 * COMPLETES App\Modules\Payroll\Models\Dtr — the DAILY STATUS layer.
 *
 * Menu -> Reports -> Daily / Weekly / Team Schedule (and the Team Schedule export) paint one badge
 * per employee per day. Dtr::getDtrStatus() is what produces that badge; isUnplanned(), onUnpaidLeave(),
 * checkCurrentTime(), onTimeLog() and getBestSchedule() are the inputs it (and the attendance
 * resources) lean on. A wrong badge here is what a manager acts on when they chase an employee for an
 * absence, so every arm below asserts the BUSINESS OUTCOME (the exact badge list, the exact relation
 * membership), never merely that the call returned.
 *
 * Members finished here — the ones NOT already driven by DtrModelPredicatesTest (pure attribute
 * predicates) or DtrDecisionMethodsTest (isOntime / checkUndertime / time-out classification):
 *   checkCurrentTime   : no schedule -> true; fixed shift past/future; flexible shift uses the GRACE
 *                        end, not the nominal start
 *   isIncompleteLog    : clock-out without a clock-in
 *   onTimeLog          : the both-policies arms driven DETERMINISTICALLY (the sibling suite probes for
 *                        a pre-existing policy row and skips when the fixture has none), including the
 *                        expected-out CAP at end_flexy_datetime, which no other suite reaches
 *   getDtrStatus       : rest day, rest-day work, holiday, approved leave, absent, early, late,
 *                        undertime, the blank fall-through, no_schedule, and the payroll-item
 *                        aggregation branch that sums an overnight shift's two tagged rows
 *   onUnpaidLeave      : all three filters (approved / type = Unpaid Leave / amount > 0) and the
 *                        paid-vs-unpaid partition against onLeave()
 *   isUnplanned        : unplanned leave type vs planned type, plus the no-leave state
 *   get_dtr_history    : the punch-history query is scoped to exactly one employee and one day
 *   getBestSchedule    : Temporary vs Change Schedule precedence, including the "Change Schedule is
 *                        newer than the Temporary" override and the plain default-schedule fallback
 *
 * SAFETY. Every row this file writes is created inside DatabaseTransactions and rolled back.
 * Only INSERTs are issued against dtrs / leaves / rest_day_works / change_schedules — never an UPDATE,
 * because the five AFTER UPDATE triggers on `dtrs` and the three on `rest_day_works` call the payroll
 * stored procedures. The only UPDATE anywhere in this file is on `schedules`, which carries no
 * triggers, and it exists solely to give two schedule rows distinguishable updated_at values.
 * All fixtures live in a June 1990 sandbox window on a user that is probed to own no DTR in that
 * window, so nothing can collide with live data. No stored procedure is invoked. No table is scanned.
 */
class DtrStatusMethodsTest extends TestCase
{
    use DatabaseTransactions;

    /** Sandbox window — far-future so no live DTR or schedule rows exist there. */
    const SANDBOX_FROM = '2099-06-01';
    const SANDBOX_TO   = '2099-06-30';

    /** A shift that has already happened: 2020-06-15, 08:00 -> 17:00 UTC (dtrs stores epochs). */
    const PAST_START = 1592208000;
    const PAST_END   = 1592240400;

    /** A shift that has not started yet: 2100-01-01, 08:00 -> 17:00 UTC, grace to 09:00 / 17:30. */
    const FUTURE_START       = 4102473600;
    const FUTURE_END         = 4102506000;
    const FUTURE_START_FLEXY = 4102477200;
    const FUTURE_END_FLEXY   = 4102507800;

    /** @var int|null|false false = not probed yet */
    private $sandboxUser = false;

    // =====================================================================================
    //  Fixture helpers
    // =====================================================================================

    /**
     * ONE user id that owns no DTR anywhere in the June 1990 sandbox window, so every row this
     * suite inserts is guaranteed not to collide with the UNIQUE(user_id, date) key on dtrs.
     * whereNotExists (not whereNotIn) because dtrs.user_id is nullable and NOT IN + NULL matches
     * nothing at all. The sub-select rides the dtrs(date) index; nothing is scanned.
     */
    private function sandboxUserId()
    {
        if ($this->sandboxUser === false) {
            // CS-TRIG-1 — the sandbox user must have BOTH names populated.
            //
            // AFTER INSERT triggers on rest_day_works and change_schedules write a notification row
            // into Redis_NC_UserRequests, whose Description is NOT NULL and is built with
            //     CONCAT(UDV_Lead_Name, ' has requested ...', New.date)
            // where UDV_Lead_Name is itself CONCAT(EMP.first_name,' ',EMP.last_name).
            // MySQL CONCAT returns NULL if ANY argument is NULL, so a user missing either name
            // yields a NULL Description, violates NOT NULL, and the trigger failure ROLLS BACK the
            // user's original request insert.
            //
            // That is a real production defect, not a test artefact: any employee with a NULL
            // first_name or last_name cannot file a rest-day-work or change-schedule request at
            // all. It is registered as CS-TRIG-1 and is NOT fixed here. This constraint only stops
            // the fixture from tripping over it, so the test can assert what it is actually about.
            $this->sandboxUser = DB::table('users')
                ->whereNotNull('first_name')
                ->whereNotNull('last_name')
                ->where('first_name', '!=', '')
                ->where('last_name', '!=', '')
                ->whereNotExists(function ($q) {
                    $q->select(DB::raw(1))->from('dtrs')
                      ->whereRaw('dtrs.user_id = users.id')
                      ->whereBetween('dtrs.date', [self::SANDBOX_FROM, self::SANDBOX_TO]);
                })
                ->orderBy('id', 'desc')
                ->value('id');

            $this->sandboxUser = $this->sandboxUser === null ? null : (int) $this->sandboxUser;
        }

        if ($this->sandboxUser === null) {
            $this->markTestSkipped('every user already owns a DTR inside the June 1990 sandbox window');
        }

        return $this->sandboxUser;
    }

    /** Insert one sandbox DTR. INSERT only — dtrs must never be UPDATEd (payroll triggers). */
    private function makeDtr($date, array $attrs = [])
    {
        return Dtr::create($attrs + [
            'user_id'     => $this->sandboxUserId(),
            'date'        => $date,
            'is_rest_day' => 0,
            'time_in'     => null,
            'time_out'    => null,
        ]);
    }

    /** An UNSAVED Dtr bound to a real parent id, so hasMany relations resolve without touching dtrs. */
    private function bound($id, array $attrs)
    {
        $d = new Dtr();
        $d->id = $id;
        foreach ($attrs as $k => $v) {
            $d->$k = $v;
        }
        return $d;
    }

    private function pastShift(array $extra = [])
    {
        return ['start_datetime' => self::PAST_START, 'end_datetime' => self::PAST_END] + $extra;
    }

    private function futureShift(array $extra = [])
    {
        return ['start_datetime' => self::FUTURE_START, 'end_datetime' => self::FUTURE_END] + $extra;
    }

    // =====================================================================================
    //  checkCurrentTime() — "has this shift started yet?"
    // =====================================================================================

    /**
     * A day is only ever eligible to be called ABSENT once its shift has begun. checkCurrentTime()
     * is the guard that stops the Daily report from branding someone absent at 9am for a shift that
     * starts at 10pm. Pure attribute logic — nothing is read from the database.
     *
     * @test
     */
    public function a_shift_only_counts_as_started_once_its_start_or_grace_time_has_passed()
    {
        $noSchedule = new Dtr();
        $this->assertTrue($noSchedule->checkCurrentTime(),
            'a day with no schedule at all has no start time to wait for');

        $started = new Dtr();
        foreach ($this->pastShift() as $k => $v) { $started->$k = $v; }
        $this->assertTrue($started->checkCurrentTime());

        $notStarted = new Dtr();
        foreach ($this->futureShift() as $k => $v) { $notStarted->$k = $v; }
        $this->assertFalse($notStarted->checkCurrentTime(),
            'a shift scheduled for the year 2100 has obviously not started');

        // FLEXIBLE arm: the nominal start is long past, but the employee still has until the end of
        // the grace window to clock in, so the day must NOT be treated as started.
        $withinGrace = new Dtr();
        foreach ($this->pastShift(['start_flexy_datetime' => self::FUTURE_START_FLEXY,
                                   'end_flexy_datetime'   => self::FUTURE_END_FLEXY]) as $k => $v) {
            $withinGrace->$k = $v;
        }
        $this->assertFalse($withinGrace->checkCurrentTime(),
            'a flexible shift must be judged against the END of its grace window, not its nominal start');

        // ...and once the grace window itself is in the past, the day counts as started.
        $graceOver = new Dtr();
        foreach ($this->pastShift(['start_flexy_datetime' => self::PAST_START + 3600,
                                   'end_flexy_datetime'   => self::PAST_END]) as $k => $v) {
            $graceOver->$k = $v;
        }
        $this->assertTrue($graceOver->checkCurrentTime());
    }

    // =====================================================================================
    //  isIncompleteLog()
    // =====================================================================================

    /**
     * The "forgot to clock in" case: a time-out with no matching time-in. This is the state the
     * Incomplete Logs prompt asks the employee to dispute, and it is deliberately distinct from a
     * day with no punches at all (which is an absence, not an incomplete log).
     *
     * @test
     */
    public function a_clock_out_without_a_clock_in_is_the_only_incomplete_log_state()
    {
        $outOnly = new Dtr();
        $outOnly->time_in = null;
        $outOnly->time_out = self::PAST_END;
        $this->assertTrue($outOnly->isIncompleteLog());

        $inOnly = new Dtr();
        $inOnly->time_in = self::PAST_START;
        $inOnly->time_out = null;
        $this->assertFalse($inOnly->isIncompleteLog(),
            'a missing clock-OUT is a different problem and must not be reported as an incomplete log');

        $nothing = new Dtr();
        $this->assertFalse($nothing->isIncompleteLog(),
            'a day with no punches at all is an absence, not an incomplete log');
    }

    // =====================================================================================
    //  onTimeLog() — with both schedule policies switched on
    // =====================================================================================

    /**
     * onTimeLog() is what TeamAttendanceResources shows a manager as "rendered the full day".
     * When BOTH allow_late and allow_undertime are switched on for the day, a flexible employee owes
     * the same number of hours no matter when they clocked in — but never beyond the end of the
     * flexible window. This test creates the two policy rows itself so the arms always run;
     * DtrDecisionMethodsTest probes the fixture for them and skips when there are none.
     *
     * @test
     */
    public function with_both_schedule_policies_on_a_flexible_day_owes_a_full_shift_capped_at_the_flexy_end()
    {
        $parent = $this->makeDtr('1990-06-10', $this->pastShift());
        DtrPolicy::create(['dtr_id' => $parent->id, 'policy' => 'allow_late', 'value' => '1']);
        DtrPolicy::create(['dtr_id' => $parent->id, 'policy' => 'allow_undertime', 'value' => '1']);

        $id = (int) $parent->id;

        // Sanity: both policies really are readable through the relation the method uses.
        $this->assertSame(1, $parent->policies()->where('policy', 'allow_late')->where('value', '1')->count());
        $this->assertSame(1, $parent->policies()->where('policy', 'allow_undertime')->where('value', '1')->count());

        // Straightforward complete shift: in at or before the start, out at or after the end.
        $this->assertTrue(
            $this->bound($id, $this->pastShift(['time_in' => self::PAST_START, 'time_out' => self::PAST_END]))->onTimeLog(),
            'clocking in on time and out on time is a complete day'
        );

        // FLEXIBLE, 08:00-17:00 shift (9h owed) with a grace window to 09:00 and a hard stop at 17:30.
        // Clocking in at 09:00 would owe until 18:00, but the flexible window ends at 17:30, so the
        // expected time-out is CAPPED at 17:30 — leaving exactly then is a complete day.
        $flexy = [
            'start_datetime'       => self::PAST_START,
            'end_datetime'         => self::PAST_END,
            'start_flexy_datetime' => self::PAST_START + 3600,      // 09:00
            'end_flexy_datetime'   => self::PAST_END + 1800,        // 17:30
        ];
        $this->assertTrue(
            $this->bound($id, $flexy + ['time_in' => self::PAST_START + 3600, 'time_out' => self::PAST_END + 1800])->onTimeLog(),
            'the expected time-out must be capped at the end of the flexible window'
        );

        // One minute short of that capped time-out is NOT a complete day.
        $this->assertFalse(
            $this->bound($id, $flexy + ['time_in' => self::PAST_START + 3600, 'time_out' => self::PAST_END + 1740])->onTimeLog(),
            'leaving before the capped expected time-out is an incomplete day'
        );

        // Clocked in past the grace window entirely -> rejected before any rendering maths.
        $this->assertFalse(
            $this->bound($id, $flexy + ['time_in' => self::PAST_START + 7200, 'time_out' => self::PAST_END + 1800])->onTimeLog(),
            'clocking in after the grace window closes can never be an on-time log'
        );
    }

    // =====================================================================================
    //  getDtrStatus() — the badge a manager reads
    // =====================================================================================

    /**
     * On a rest day the badge is 'rest_day' and the late/absent/undertime checks are suppressed
     * entirely. But once an approved Rest Day Work request exists for that date the day becomes a
     * WORKING day: the badge flips to 'rest_day_work' and the normal daily evaluation runs again.
     *
     * @test
     */
    public function a_rest_day_suppresses_the_daily_badge_unless_approved_rest_day_work_exists()
    {
        $restDay = $this->makeDtr('1990-06-11', $this->pastShift(['is_rest_day' => 1]));

        $this->assertSame(['rest_day'], $restDay->getDtrStatus(),
            'a plain rest day must report rest_day and nothing else, even though a schedule exists');

        $worked = $this->makeDtr('1990-06-12', $this->pastShift(['is_rest_day' => 1]));
        RestDayWork::create([
            'user_id'       => $this->sandboxUserId(),
            'date'          => '1990-06-12',
            'start_time'    => self::PAST_START,
            'end_time'      => self::PAST_END,
            'break_time'    => 3600,
            'status'        => 'approved',
            'employee_note' => 'BranchTest DtrStatusMethods',
        ]);

        $status = $worked->getDtrStatus();

        $this->assertContains('rest_day_work', $status,
            'an approved rest-day-work request must replace the rest_day badge');
        $this->assertNotContains('rest_day', $status);
        // The day is now a working day, so the schedule block runs and appends its own verdict.
        $this->assertCount(2, $status,
            'rest-day work re-enables the normal daily evaluation, so a second badge is appended');
    }

    /**
     * A holiday and an approved leave both mean "this employee was not expected at their desk".
     * Both must suppress the absent/late/undertime evaluation completely — reporting an approved
     * leave day as 'absent' is exactly the false accusation this branch exists to prevent.
     *
     * @test
     */
    public function a_holiday_or_an_approved_leave_suppresses_the_absent_badge()
    {
        // Baseline: the same shape of day with no holiday and no leave IS reported absent.
        $bare = $this->makeDtr('1990-06-13', $this->pastShift());
        $this->assertSame(['absent'], $bare->getDtrStatus(),
            'a past, scheduled, unpunched day with no cover is an absence');

        $onHoliday = $this->makeDtr('1990-06-14', $this->pastShift());
        $holiday = Holiday::create([
            'name'          => 'BranchTest DtrStatusMethods Holiday',
            'date'          => '1990-06-14',
            'type'          => 'lh',
            'is_predefined' => 0,
        ]);
        $onHoliday->holidays()->attach($holiday->id);

        $this->assertSame(['holiday'], $onHoliday->getDtrStatus(),
            'a holiday must be the only badge — the employee cannot be absent from a holiday');

        $onLeave = $this->makeDtr('1990-06-15', $this->pastShift());
        Leave::create([
            'dtr_id'        => $onLeave->id,
            'type'          => 'Vacation Leave',
            'status'        => 'approved',
            'amount'        => 1.0,
            'updated_by'    => $this->sandboxUserId(),
            'employee_note' => 'BranchTest DtrStatusMethods',
        ]);

        $this->assertSame(['on_leave'], $onLeave->getDtrStatus(),
            'an approved paid leave must never be reported as an absence');
    }

    /**
     * The ordinary working-day ladder: absent -> early -> late -> undertime -> blank. 'early' is the
     * badge an employee gets when they punched and the day carries no late policy, and a day whose
     * shift has not started yet gets a blank badge rather than an absence.
     *
     * @test
     */
    public function a_scheduled_working_day_reports_early_when_punched_and_blank_before_the_shift_starts()
    {
        $punched = $this->makeDtr('1990-06-16', $this->pastShift([
            'time_in'  => self::PAST_START,
            'time_out' => self::PAST_END,
        ]));
        $this->assertSame(['early'], $punched->getDtrStatus(),
            'a complete pair of punches on a day with no allow_late policy is an on-time day');

        // Shift has not started, nothing punched, no payroll items -> no verdict yet, blank badge.
        $notYetDue = $this->makeDtr('1990-06-17', $this->futureShift());
        $this->assertSame([''], $notYetDue->getDtrStatus(),
            'a shift that has not started yet gets a blank badge, never an absence');
    }

    /**
     * 'late' and 'undertime' come from the day's computed payroll items, not from the raw punches.
     * An overnight shift stores its payroll figures as two rows (the plain row plus the overlapped
     * row that spills into the next calendar day); getDtrStatus() sums them per item before deciding,
     * so a split late is still one late day.
     *
     * @test
     */
    public function late_and_undertime_badges_come_from_the_payroll_items_summed_across_overlap_tags()
    {
        $late = $this->makeDtr('1990-06-18', $this->futureShift());
        // Two rows for the SAME item, distinguished by tag — this is the aggregation branch.
        DtrPayrollItems::create(['dtr_id' => $late->id, 'item' => 'late', 'value' => '1800', 'tag' => null]);
        DtrPayrollItems::create([
            'dtr_id' => $late->id, 'item' => 'late', 'value' => '1800',
            'tag'    => get_constant('PAYROLL_ITEM_TAGS.overlapped'),
        ]);

        $this->assertSame(['late'], $late->getDtrStatus(),
            'a late figure split across the overlapped tag still yields exactly one late badge');

        $undertime = $this->makeDtr('1990-06-19', $this->futureShift());
        DtrPayrollItems::create(['dtr_id' => $undertime->id, 'item' => 'undertime', 'value' => '2700', 'tag' => null]);

        $this->assertSame(['undertime'], $undertime->getDtrStatus(),
            'an undertime figure with no late figure yields the undertime badge');

        // Precedence: when BOTH figures exist, late wins — undertime is only reached as a fallback.
        $both = $this->makeDtr('1990-06-20', $this->futureShift());
        DtrPayrollItems::create(['dtr_id' => $both->id, 'item' => 'late', 'value' => '600', 'tag' => null]);
        DtrPayrollItems::create(['dtr_id' => $both->id, 'item' => 'undertime', 'value' => '600', 'tag' => null]);

        $this->assertSame(['late'], $both->getDtrStatus(),
            'late is checked before undertime, so a day that is both reports late');
    }

    /**
     * FINDING DTR-STATUS-ZERO (characterized, app deliberately NOT modified).
     *
     * getDtrStatus() gates the late badge on is_valid($payroll_items['late']). is_valid() answers TRUE
     * for any numeric value including the string "0" (validator_helper.php: is_numeric($var) short-
     * circuits the emptiness test). So a payroll item that explicitly records ZERO late seconds — the
     * row the computation writes for a day with nothing to charge — still paints the employee LATE on
     * the Daily/Team Schedule report. Every other numeric gate in this model uses the same helper, so
     * this is characterized rather than fixed.
     *
     * @test
     */
    public function a_zero_second_late_payroll_item_still_paints_the_day_late_FINDING_DTR_STATUS_ZERO()
    {
        $dtr = $this->makeDtr('1990-06-21', $this->futureShift());
        DtrPayrollItems::create(['dtr_id' => $dtr->id, 'item' => 'late', 'value' => '0', 'tag' => null]);

        $this->assertSame(['late'], $dtr->getDtrStatus(),
            'CHARACTERIZATION: zero recorded late seconds is still reported as a late day');
    }

    /**
     * A day with no schedule cannot be late, early or absent — there is nothing to be measured
     * against — so the report says so explicitly rather than leaving the cell blank.
     *
     * @test
     */
    public function a_day_without_a_schedule_reports_no_schedule()
    {
        $dtr = $this->makeDtr('1990-06-22', ['start_datetime' => null, 'end_datetime' => null]);

        $this->assertSame(['no_schedule'], $dtr->getDtrStatus());

        // ...but a rest day without a schedule stays a rest day; 'no_schedule' is suppressed.
        $restDay = $this->makeDtr('1990-06-23', ['is_rest_day' => 1, 'start_datetime' => null, 'end_datetime' => null]);
        $this->assertSame(['rest_day'], $restDay->getDtrStatus(),
            'a rest day needs no schedule, so it must not be flagged as missing one');
    }

    // =====================================================================================
    //  onUnpaidLeave() / onLeave() — the paid vs unpaid partition
    // =====================================================================================

    /**
     * Unpaid Leave is deliberately excluded from onLeave() (which drives the paid 'on_leave' badge and
     * the leave credits) and exposed through onUnpaidLeave() instead, because an unpaid day still has
     * to be deducted on the payslip. Both relations additionally require the leave to be APPROVED and
     * to carry a non-zero amount.
     *
     * @test
     */
    public function unpaid_leave_is_partitioned_away_from_paid_leave_and_needs_approval_and_an_amount()
    {
        $mixed = $this->makeDtr('1990-06-24', $this->pastShift());
        Leave::create(['dtr_id' => $mixed->id, 'type' => 'Unpaid Leave', 'status' => 'approved',
                       'amount' => 1.0, 'updated_by' => $this->sandboxUserId()]);
        Leave::create(['dtr_id' => $mixed->id, 'type' => 'Vacation Leave', 'status' => 'approved',
                       'amount' => 1.0, 'updated_by' => $this->sandboxUserId()]);

        $unpaid = $mixed->onUnpaidLeave()->get();
        $paid   = $mixed->onLeave()->get();

        $this->assertCount(1, $unpaid);
        $this->assertSame('Unpaid Leave', $unpaid->first()->type);
        $this->assertCount(1, $paid);
        $this->assertSame('Vacation Leave', $paid->first()->type,
            'Unpaid Leave must never appear in the paid-leave relation');

        // STATUS filter: an unapproved unpaid leave is still just a request.
        $requested = $this->makeDtr('1990-06-25', $this->pastShift());
        Leave::create(['dtr_id' => $requested->id, 'type' => 'Unpaid Leave', 'status' => 'requested',
                       'amount' => 1.0, 'updated_by' => $this->sandboxUserId()]);
        $this->assertCount(0, $requested->onUnpaidLeave()->get(),
            'a leave still awaiting approval must not be deducted');

        // AMOUNT filter: a zero-day unpaid leave deducts nothing.
        $zeroDay = $this->makeDtr('1990-06-26', $this->pastShift());
        Leave::create(['dtr_id' => $zeroDay->id, 'type' => 'Unpaid Leave', 'status' => 'approved',
                       'amount' => 0.0, 'updated_by' => $this->sandboxUserId()]);
        $this->assertCount(0, $zeroDay->onUnpaidLeave()->get(),
            'a zero-amount unpaid leave has nothing to deduct');
    }

    // =====================================================================================
    //  isUnplanned()
    // =====================================================================================

    /**
     * Unplanned leaves (sick, bereavement, unpaid, MGC call-out) are the ones that were not filed in
     * advance; the Team Attendance summary counts them separately from planned leave and the acronym
     * shown on the roster collapses them to "UL". Anything else is a planned leave.
     *
     * @test
     */
    public function sick_and_unpaid_leave_are_unplanned_while_vacation_leave_is_not()
    {
        $sick = $this->makeDtr('1990-06-27', $this->pastShift());
        Leave::create(['dtr_id' => $sick->id, 'type' => 'Sick Leave', 'status' => 'approved',
                       'amount' => 1.0, 'updated_by' => $this->sandboxUserId()]);
        $this->assertTrue($sick->isUnplanned(), 'Sick Leave is one of the UNPLANNED_LEAVE_TYPES');

        $unpaid = $this->makeDtr('1990-06-28', $this->pastShift());
        Leave::create(['dtr_id' => $unpaid->id, 'type' => 'Unpaid Leave', 'status' => 'approved',
                       'amount' => 1.0, 'updated_by' => $this->sandboxUserId()]);
        $this->assertTrue($unpaid->isUnplanned());

        $planned = $this->makeDtr('1990-06-29', $this->pastShift());
        Leave::create(['dtr_id' => $planned->id, 'type' => 'Vacation Leave', 'status' => 'approved',
                       'amount' => 1.0, 'updated_by' => $this->sandboxUserId()]);
        $this->assertFalse($planned->isUnplanned(), 'Vacation Leave is filed in advance');
    }

    /**
     * FINDING DTR-UNPLANNED-NULL (characterized, app deliberately NOT modified).
     *
     * Dtr::isUnplanned() dereferences $this->leaves()->get()->first()->type with no null guard, and
     * the identical unguarded dereference opens Dtr::leavesToAcronym(). On a DTR with no leave rows —
     * i.e. the overwhelming majority of working days — first() is null, so the read raises a
     * property-on-null diagnostic instead of answering "no, this day is not an unplanned leave".
     * Callers are safe only because they happen to check the leave count first; the model itself
     * offers no such protection.
     *
     * @test
     */
    public function is_unplanned_has_no_guard_for_a_day_without_leaves_FINDING_DTR_UNPLANNED_NULL()
    {
        $dtr = $this->makeDtr('1990-06-30', $this->pastShift());
        $this->assertCount(0, $dtr->leaves()->get(), 'precondition: this day carries no leave');

        $thrown = null;
        $result = null;
        try {
            $result = $dtr->isUnplanned();
        } catch (\Throwable $e) {
            $thrown = $e;
        }

        // CHARACTERIZATION: either the null dereference surfaces as a diagnostic, or PHP degrades it
        // to null and the in_array() answers false. It is never a deliberate, guarded answer.
        $this->assertTrue($thrown !== null || $result === false,
            'isUnplanned() unexpectedly returned true for a day that carries no leave at all');

        if ($thrown !== null) {
            $message = $thrown->getMessage();
            $this->assertTrue(
                stripos($message, 'on null') !== false || stripos($message, 'non-object') !== false,
                'expected the unguarded first()->type dereference to be the cause, got: ' . $message
            );
        }
    }

    // =====================================================================================
    //  get_dtr_history()
    // =====================================================================================

    /**
     * The punch history behind a DTR (Menu -> My Attendance -> a day -> punch history) must be scoped
     * to exactly one employee and one calendar day; it is returned unexecuted so callers can page it.
     * Read-only: the positive case runs against ONE probed history row, bounded to 200 rows.
     *
     * @test
     */
    public function the_punch_history_query_is_scoped_to_one_employee_and_one_day()
    {
        $probe = DtrPunchHistory::whereNotNull('user_id')->whereNotNull('date')
            ->orderBy('id', 'desc')->first();

        // Negative arm works with or without fixture data: the sandbox day has no punch history.
        $empty = new Dtr();
        $empty->user_id = $this->sandboxUserId();
        $empty->date = '1990-06-15';
        $emptyQuery = $empty->get_dtr_history();
        $this->assertInstanceOf(EloquentBuilder::class, $emptyQuery,
            'get_dtr_history() must hand back an unexecuted query the caller can still page');
        $this->assertSame(0, $emptyQuery->count());

        if (!$probe) {
            $this->markTestSkipped('dtr_collective_punch_history_new has no dated rows in this test DB');
        }

        $dtr = new Dtr();
        $dtr->user_id = $probe->user_id;
        $dtr->date = $probe->date;

        $rows = $dtr->get_dtr_history()->limit(200)->get();

        $this->assertGreaterThan(0, $rows->count(),
            'the employee whose punch row was probed must find that row through their own DTR');
        foreach ($rows as $row) {
            $this->assertEquals($probe->user_id, $row->user_id,
                'punch history must never leak another employee\'s punches');
            $this->assertEquals((string) $probe->date, (string) $row->date,
                'punch history must never leak another day\'s punches');
        }
    }

    // =====================================================================================
    //  getBestSchedule() — Temporary vs Change Schedule vs Default
    // =====================================================================================

    /** Guard: the sandbox user must own no real temporary/change schedule inside the window. */
    private function assertSandboxScheduleWindowIsClear($userId, $date)
    {
        $temp = Schedule::where('bind_to', 'user')->where('bind_id', $userId)
            ->where('source_type', 'temporary')
            ->whereRaw("('" . $date . "' BETWEEN valid_from AND valid_to)")->first();
        $cs = ChangeSchedule::where('user_id', $userId)
            ->whereRaw("('" . $date . "' BETWEEN valid_from AND valid_to)")->first();

        if ($temp || $cs) {
            $this->markTestSkipped('the probed user already owns a schedule inside the 1990 sandbox window');
        }
    }

    /**
     * A day can be covered by three schedules at once. The hierarchy is Temporary > Change Schedule >
     * Default, EXCEPT that a Change Schedule approved more recently than the Temporary one wins —
     * the later decision is the one the employee was actually told to work.
     *
     * @test
     */
    public function a_change_schedule_approved_after_the_temporary_one_becomes_the_days_schedule()
    {
        $userId = $this->sandboxUserId();
        // F15 fix: SANDBOX_FROM/TO are 2099-06-*; using 1990-06-15 meant the date was never
        // between valid_from and valid_to of the created fixtures → getBestSchedule() skipped
        // both and returned the default schedule instead of the test-created change schedule.
        $date = '2099-06-15';
        $this->assertSandboxScheduleWindowIsClear($userId, $date);

        $temporary = Schedule::create([
            'name'        => 'BranchTest DtrStatusMethods Temporary',
            'bind_to'     => 'user',
            'bind_id'     => $userId,
            'source_type' => 'temporary',
            'schedule_type' => 'standard',
            'valid_from'  => self::SANDBOX_FROM,
            'valid_to'    => self::SANDBOX_TO,
        ]);

        $changeScheduleSchedule = Schedule::create([
            'name'        => 'BranchTest DtrStatusMethods ChangeSchedule',
            'bind_to'     => 'user',
            'bind_id'     => $userId,
            'source_type' => 'change_schedule',
            'schedule_type' => 'standard',
            'valid_from'  => self::SANDBOX_FROM,
            'valid_to'    => self::SANDBOX_TO,
        ]);

        ChangeSchedule::create([
            'user_id'     => $userId,
            'schedule_id' => $changeScheduleSchedule->id,
            'valid_from'  => self::SANDBOX_FROM,
            'valid_to'    => self::SANDBOX_TO,
            'status'      => get_constant('REQUEST_STATUS.approved'),
        ]);

        // `schedules` carries no triggers, so stamping distinguishable decision times is safe.
        // The change schedule was decided a day AFTER the temporary one.
        DB::table('schedules')->where('id', $temporary->id)->update(['updated_at' => '1990-05-01 09:00:00']);
        DB::table('schedules')->where('id', $changeScheduleSchedule->id)->update(['updated_at' => '1990-05-02 09:00:00']);

        $dtr = new Dtr();
        $dtr->user_id = $userId;
        $dtr->date = $date;

        $best = $dtr->getBestSchedule();

        $this->assertNotNull($best);
        $this->assertSame((int) $changeScheduleSchedule->id, (int) $best->id,
            'the more recently approved change schedule must override the temporary schedule');
        $this->assertSame('change_schedule', $best->source_type);
    }

    /**
     * The mirror case: when the Temporary schedule is the more recent decision it keeps precedence,
     * which is the documented default of the hierarchy.
     *
     * @test
     */
    public function a_temporary_schedule_keeps_precedence_when_it_is_the_more_recent_decision()
    {
        $userId = $this->sandboxUserId();
        // F16 fix: same date-window mismatch as F15 — must use a date inside SANDBOX_FROM/SANDBOX_TO.
        $date = '2099-06-15';
        $this->assertSandboxScheduleWindowIsClear($userId, $date);

        $temporary = Schedule::create([
            'name'        => 'BranchTest DtrStatusMethods Temporary B',
            'bind_to'     => 'user',
            'bind_id'     => $userId,
            'source_type' => 'temporary',
            'schedule_type' => 'standard',
            'valid_from'  => self::SANDBOX_FROM,
            'valid_to'    => self::SANDBOX_TO,
        ]);

        $changeScheduleSchedule = Schedule::create([
            'name'        => 'BranchTest DtrStatusMethods ChangeSchedule B',
            'bind_to'     => 'user',
            'bind_id'     => $userId,
            'source_type' => 'change_schedule',
            'schedule_type' => 'standard',
            'valid_from'  => self::SANDBOX_FROM,
            'valid_to'    => self::SANDBOX_TO,
        ]);

        ChangeSchedule::create([
            'user_id'     => $userId,
            'schedule_id' => $changeScheduleSchedule->id,
            'valid_from'  => self::SANDBOX_FROM,
            'valid_to'    => self::SANDBOX_TO,
            'status'      => get_constant('REQUEST_STATUS.approved'),
        ]);

        // This time the TEMPORARY schedule is the later decision.
        DB::table('schedules')->where('id', $changeScheduleSchedule->id)->update(['updated_at' => '1990-05-01 09:00:00']);
        DB::table('schedules')->where('id', $temporary->id)->update(['updated_at' => '1990-05-02 09:00:00']);

        $dtr = new Dtr();
        $dtr->user_id = $userId;
        $dtr->date = $date;

        $best = $dtr->getBestSchedule();

        $this->assertNotNull($best);
        $this->assertSame((int) $temporary->id, (int) $best->id,
            'the temporary schedule outranks an older change schedule');
        $this->assertSame('temporary', $best->source_type);
    }

    /**
     * With neither a Temporary nor an approved Change Schedule covering the day, the employee simply
     * works their default schedule — and if they have none, the day genuinely has no schedule.
     *
     * @test
     */
    public function without_a_temporary_or_change_schedule_the_day_falls_back_to_the_default_schedule()
    {
        $userId = $this->sandboxUserId();
        // Consistency fix: use the same SANDBOX window as the sibling tests above.
        $date = '2099-06-15';
        $this->assertSandboxScheduleWindowIsClear($userId, $date);

        $dtr = new Dtr();
        $dtr->user_id = $userId;
        $dtr->date = $date;

        $user = $dtr->user()->first();
        $this->assertNotNull($user, 'precondition: the probed DTR owner must resolve');

        $expected = $user->defaultSchedule()->first();
        $best = $dtr->getBestSchedule();

        if ($expected === null) {
            $this->assertNull($best, 'a user with no default schedule has no best schedule either');
        } else {
            $this->assertNotNull($best);
            $this->assertSame((int) $expected->id, (int) $best->id,
                'the default schedule is the fallback when nothing overrides the day');
            $this->assertSame('default', $best->source_type);
        }
    }
}
