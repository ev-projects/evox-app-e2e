<?php

namespace Tests\Feature\BranchTests\Support;

use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\DtrPolicy;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\Schedule\Models\ScheduleDetail;
use App\Modules\Schedule\Models\SchedulePolicy;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * DTR / PAYROLL FIXTURE BUILDER — build the day, don't hunt for it.
 *
 * WHY THIS EXISTS
 * The payroll code paths (schedule application, holiday binding, overtime computation) only branch
 * on a very particular shape of day: a DTR with a schedule, timelogs on both sides of it, a policy
 * row, an approved request attached. Live staging rows almost never line up, so probe-based tests
 * skip and cover nothing — the exact failure mode RequestFlowTrait was written to end. This trait
 * does the same for the payroll side.
 *
 * THE ANCHOR DATE
 * Every fixture day is derived from 1990-06-11, a Monday. It is chosen because:
 *   - it predates EVOX, so no live DTR, holiday, schedule or punch row can collide with it;
 *   - the app runs on UTC (config/app.php), and 1990 UTC has no DST transition, so
 *     add_days_to_timestamp()'s flat +86400 arithmetic is exact — assertions computed by hand from
 *     the source stay true;
 *   - it is fixed, so nothing drifts with the calendar. Never use "today" in a payroll assertion.
 *
 * THE OWNER OFFSET
 * Computation::get_computed_payroll_items() adds the owner's country offset to time_in, time_out,
 * start_datetime and end_datetime BEFORE it computes anything. Fixtures therefore store
 * (wanted - offset) via scheduledDay() so the value the engine actually works on is the value the
 * test designed. fixtureOffset() reads that offset through the same public helper the app uses; it
 * is an environment constant (which country the probe user belongs to), not the logic under test.
 *
 * SAFETY
 *  - Every row is written inside the suite's DatabaseTransactions and disappears at test end.
 *  - Reads are bounded: one indexed user probe and one read of utc_timelog (a five-row lookup).
 *  - Nothing here touches a stored procedure, a queue, the filesystem or an external service.
 */
trait DtrFixtureTrait
{
    /** @var User|null probe result, resolved once per test */
    protected $fxUser;
    /** @var int|null owner offset in seconds */
    protected $fxOffset;

    /**
     * The anchor date. (A property, not a const — traits cannot hold constants on PHP 7.4.)
     *
     * Reverted from 1900-01-01 back to 1990-06-11 on 2026-09-03: 1900-01-01 predates the Unix
     * epoch, so every timestamp this trait stores for that day is negative. dtrs' onupdate_rendertime
     * trigger runs FROM_UNIXTIME()/UNIX_TIMESTAMP(CONVERT_TZ(...)) over time_in/time_out/
     * start_datetime/end_datetime on every UPDATE, and a negative argument there produced
     * "Incorrect datetime value: '-86400'" under this connection's SQL mode — a real, reproducible
     * failure on any test that updates a row on the day rather than only inserting one
     * (DtrRequestApplicationBranchTest). 1990-06-11 is a Monday, is in 1990 (no DST transitions,
     * per config/app.php's UTC setting), and is post-epoch, so the trigger's arithmetic stays valid.
     *
     * The original move away from 1990-06-11 (2026-08-25) was chasing a symptom, not the cause: a
     * crashed test run had left a real (non-transactional) row behind for the probe user on that
     * date, and picking a different literal date "fixed" it only until the next crash did the same
     * thing to the new date (which is exactly what happened — see fixtureUser()/clearFixtureWindows()
     * below). No fixed literal date is actually collision-proof against that failure mode, and,
     * separately, the live database already carries millions of dtrs rows on unrelated historical
     * dates that have nothing to do with this suite, so "predates EVOX" was never a safe assumption
     * either. The real fix is to make the fixture self-healing regardless of what already occupies
     * the anchor window, which is what clearFixtureWindows() does.
     */
    protected $fxAnchor = '1990-06-11';

    /**
     * Set true (before the first fixture call) to demand a user who owns NO user-bound schedule.
     *
     * Dtr::getBestSchedule() reads the owner's default schedule with no date bound at all, so a
     * live schedule on the probe user would silently take over every schedule assertion and make
     * the result depend on staging data. Tests that assert on schedule application therefore ask
     * for a clean owner and build the schedule they mean to test.
     */
    protected $fxNoSchedule = false;

    /**
     * An active, fully-named user whose country has a utc_timelog row.
     * The name and country requirements are not cosmetic: country_zone() / country_timezone_to_offset()
     * dereference utc_timelog->first() with no null guard, and several notification triggers CONCAT
     * first_name with last_name into a NOT NULL column.
     */
    protected function fixtureUser()
    {
        if ($this->fxUser) {
            return $this->fxUser;
        }

        $country_ids = DB::table('utc_timelog')->whereNotNull('country_id')->pluck('country_id')->all();
        if (!$country_ids) {
            return null;
        }

        $query = User::whereIn('country_id', $country_ids)
            ->where('is_active', 1)
            ->whereNotNull('emp_num')->where('emp_num', '!=', '')
            ->whereNotNull('first_name')->where('first_name', '!=', '')
            ->whereNotNull('last_name')->where('last_name', '!=', '');

        if ($this->fxNoSchedule) {
            // indexed anti-join, not a scan
            $query->whereNotExists(function ($q) {
                $q->select(DB::raw(1))
                  ->from('schedules')
                  ->whereRaw('schedules.bind_id = users.id')
                  ->where('schedules.bind_to', 'user')
                  ->whereNull('schedules.deleted_at');
            });
        }

        $this->fxUser = $query->orderBy('id', 'desc')->first();

        if ($this->fxUser) {
            $this->clearFixtureWindows($this->fxUser->id);
        }

        return $this->fxUser;
    }

    /**
     * Remove any dtrs row already sitting in this trait's fixture windows for $userId, hard
     * (bypassing SoftDeletes — dtrs_user_id_date_unique does not exempt deleted_at, so a
     * soft-deleted row still blocks a fresh insert on the same user+date).
     *
     * Both fxAnchor and the far-future anchor are resolved to the SAME real, live user every run
     * (fixtureUser() always picks the highest-id match), so a row a previous run left behind here —
     * a crashed process never reaches DatabaseTransactions' rollback — collides with every run after
     * it until removed. Every date this trait can produce is within a bounded number of days of one
     * of the two anchors, so clearing that bounded window once, up front, makes every later
     * makeDtr()/makeDtrOnDate() call — and any assertion that a date is NOT yet occupied — safe
     * regardless of what a previous run (or the wider database) already left there.
     */
    protected function clearFixtureWindows($userId)
    {
        $windowEnd = function ($anchor) {
            return date('Y-m-d', strtotime($anchor . ' +60 days'));
        };

        Dtr::withTrashed()
            ->where('user_id', $userId)
            ->where(function ($q) use ($windowEnd) {
                $q->whereBetween('date', [$this->fxAnchor, $windowEnd($this->fxAnchor)])
                  ->orWhereBetween('date', ['2094-06-14', $windowEnd('2094-06-14')]);
            })
            ->forceDelete();
    }

    /** Resolve the fixture user, authenticate as them, or stop the test naming the cause. */
    protected function requireFixtureUser()
    {
        $user = $this->fixtureUser();
        if (!$user) {
            $this->markTestSkipped(
                $this->fxNoSchedule
                    ? 'no active, fully-named, utc_timelog-backed user without a user-bound schedule — '
                      . 'a live default schedule would decide the outcome instead of the fixture'
                    : 'no active, fully-named user whose country_id appears in utc_timelog — '
                      . 'country_timezone_to_offset() would dereference null'
            );
        }
        $this->be($user);
        return $user;
    }

    /** Seconds the Computation engine adds to every DTR timestamp for this owner. */
    protected function fixtureOffset()
    {
        if ($this->fxOffset === null) {
            $this->fxOffset = (int) string_offset_to_seconds(
                $this->requireFixtureUser()->country_timezone_to_offset()
            );
        }
        return $this->fxOffset;
    }

    /** Fixture date, $days after the anchor Monday. */
    protected function fixtureDate($days = 0)
    {
        return date('Y-m-d', strtotime($this->fxAnchor . ' +' . (int) $days . ' days'));
    }

    /**
     * A date far in the FUTURE, for the code paths that fetch "from this date onwards" with no end
     * bound. Reaching those arms from the 1990 anchor would drag in the employee's entire DTR
     * history — thousands of rows, every one of them recomputed. Anchored forward, the unbounded
     * query can only ever see the rows this fixture just created.
     */
    protected function fixtureFutureDate($days = 0)
    {
        return date('Y-m-d', strtotime('2094-06-14 +' . (int) $days . ' days'));
    }

    /** A bare DTR row on an explicit date (use with fixtureFutureDate). */
    protected function makeDtrOnDate($date, array $attrs = [])
    {
        $user = $this->requireFixtureUser();

        // Belt-and-braces: clearFixtureWindows() already ran once when the user was first resolved,
        // but this guards any date makeDtrOnDate() is called with directly (outside the two anchor
        // windows) against the same collision.
        Dtr::withTrashed()->where('user_id', $user->id)->where('date', $date)->forceDelete();

        return Dtr::create(array_merge([
            'user_id'             => $user->id,
            'date'                => $date,
            'is_rest_day'         => 0,
            'source_type_tagging' => get_constant('DTR_SOURCE_TYPE_TAGGING.default'),
        ], $attrs));
    }

    /**
     * Timestamp for "H:i:s on fixture day $days", built with the SAME helper the app uses
     * (add_time_to_timestamp). Sharing the arithmetic is deliberate: it removes any chance of the
     * fixture and the code under test disagreeing about what midnight means, while the assertions
     * themselves are on DURATIONS computed by hand, which no offset can move.
     */
    protected function fixtureTs($days, $time)
    {
        return (int) add_time_to_timestamp($this->fixtureDate($days), $time);
    }

    /**
     * A bare DTR row for the fixture user on fixture day $days.
     * Defaults: no schedule, no logs, working day, default tagging.
     */
    protected function makeDtr($days = 0, array $attrs = [])
    {
        return $this->makeDtrOnDate($this->fixtureDate($days), $attrs);
    }

    /**
     * A DTR whose POST-OFFSET timestamps are exactly the times given, so a test can compute the
     * engine's output by hand. $times keys: start, end, in, out (H:i:s), plus optional break
     * (seconds) and dayOffsets for logs that land on the next day.
     *
     * Stored value = wanted - owner offset, because the engine adds the offset back on read.
     */
    protected function scheduledDay($days, array $times, array $attrs = [])
    {
        $offset = $this->fixtureOffset();

        $resolve = function ($spec) use ($days, $offset) {
            if ($spec === null) {
                return null;
            }
            list($dayShift, $time) = is_array($spec) ? $spec : [0, $spec];
            return $this->fixtureTs($days + $dayShift, $time) - $offset;
        };

        return $this->makeDtr($days, array_merge([
            'start_datetime'        => $resolve(isset($times['start']) ? $times['start'] : null),
            'end_datetime'          => $resolve(isset($times['end']) ? $times['end'] : null),
            'start_flexy_datetime'  => $resolve(isset($times['start_flexy']) ? $times['start_flexy'] : null),
            'end_flexy_datetime'    => $resolve(isset($times['end_flexy']) ? $times['end_flexy'] : null),
            'time_in'               => $resolve(isset($times['in']) ? $times['in'] : null),
            'time_out'              => $resolve(isset($times['out']) ? $times['out'] : null),
            'break_time'            => isset($times['break']) ? $times['break'] : 0,
        ], $attrs));
    }

    /** Attach a DTR policy row ('1' switches the policy on, '0' off). */
    protected function addPolicy(Dtr $dtr, $policy, $value = '1')
    {
        return DtrPolicy::create([
            'dtr_id' => $dtr->id,
            'policy' => $policy,
            'value'  => $value,
        ]);
    }

    /**
     * A standard schedule bound to the fixture user, with one 'all' detail.
     * $times are plain clock times stored as seconds-from-midnight, which is what the app stores
     * in schedule_details and what getParsedDetailToDate() adds onto the DTR's date.
     */
    protected function makeSchedule(array $overrides = [], array $detail = [])
    {
        $user = $this->requireFixtureUser();

        $schedule = Schedule::create(array_merge([
            'name'          => 'fixture schedule',
            'bind_to'       => 'user',
            'bind_id'       => $user->id,
            'source_type'   => get_constant('DTR_SOURCE_TYPE_TAGGING.default'),
            'schedule_type' => 'standard',
            'valid_from'    => $this->fixtureDate(0),
            'valid_to'      => $this->fixtureDate(1),
            'rest_days'     => [],
            'created_by'    => $user->id,
            'updated_by'    => $user->id,
        ], $overrides));

        ScheduleDetail::create(array_merge([
            'schedule_id'      => $schedule->id,
            'day'              => 'all',
            // 'name' removed 2026-08-25: schedule_details has no name column (CLAUDE.md standing rule)
            'start_time'       => 8 * 3600,
            'end_time'         => 17 * 3600,
            'start_flexy_time' => null,
            'end_flexy_time'   => null,
            'break_time'       => 3600,
        ], $detail));

        return $schedule->fresh();
    }

    /** Attach a schedule policy that save_dtr_policies() will copy onto every DTR it touches. */
    protected function addSchedulePolicy(Schedule $schedule, $policy, $value = '1')
    {
        return SchedulePolicy::create([
            'schedule_id' => $schedule->id,
            'policy'      => $policy,
            'value'       => $value,
        ]);
    }
}
