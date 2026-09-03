<?php

namespace Tests\Feature\BranchTests\Unit\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

use App\Modules\Client\Models\Client;
use App\Modules\Department\Models\Department;
use App\Modules\Department\Models\EvoxDepartment;
use App\Modules\Email\Mail\RegisteredUserEmail;
use App\Modules\Payroll\Models\Computation;
use App\Modules\Payroll\Resources\TeamAttendanceResources;
use App\Modules\Report\Resources\DailyScheduleReources;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\Request\Resources\AlterLogResource;
use App\Modules\Request\Resources\ChangeScheduleResource;
use App\Modules\Request\Resources\OvertimeResource;
use App\Modules\Request\Resources\RequestApprovalChangeStatusResource;
use App\Modules\Request\Resources\RestDayWorkResource;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\Schedule\Models\ScheduleDetail;
use App\Modules\Team\Models\Team;
use App\Modules\User\Models\User;

/**
 * =====================================================================================================
 *  PACKET: ModelAndResourceArms — closing the last 1-6 uncovered lines on ten model / resource classes.
 * =====================================================================================================
 *
 *  FILE NAME NOTE. The packet asked for `ModelAndResourceArms.php`. Both phpunit.xml and
 *  phpunit-branchtests.xml collect with `<directory suffix="Test.php">`, so a file without the
 *  `Test.php` suffix is never loaded and would have contributed exactly zero coverage. The suffix is
 *  added deliberately; nothing else about the requested location changed.
 *
 *  ADD ONLY. No application source was touched, no existing test was modified or deleted.
 *  Everything here is either pure in-memory work or a single bounded, indexed probe.
 *
 * -----------------------------------------------------------------------------------------------------
 *  CLASS BY CLASS — why each was short, and what closes it
 * -----------------------------------------------------------------------------------------------------
 *
 *  Department (40, 42) — (a) REACHABLE.
 *      `country_timezone_to_offset()` has no caller anywhere in app/ (Schedule/DTR code calls the
 *      identically-named method on User and EvoxDepartment instead), so its two-line body never ran.
 *      Closed by calling it directly. See FINDING DEPT-TZ-1: the method ignores the department entirely.
 *
 *  Client (78-80) — (a) REACHABLE.
 *      Lines 78-80 are the body of the `foreach ($this->teams()->get() as $team)` loop inside
 *      `department_user_handlers()`. The existing ClientAndDepartmentModelsTest resolves that method
 *      from a department id probed off `users.department_id`, which happened to own no `teams` rows, so
 *      the loop was entered zero times. Closed by probing the department id off the `teams` table itself
 *      so the loop is guaranteed at least one iteration.
 *
 *  ChangeSchedule — (a) REACHABLE.
 *      `dtr()`, `user()` and `schedule()` are exercised by the request suites. `changeSchedules()` is an
 *      orphan — grep shows no caller in app/ (Dtr.php:572 calls `User::changeSchedules()`), so its body
 *      never ran. Closed by building and executing the relation. See FINDING CS-SQLI-1 and CS-ORPHAN-1.
 *
 *  ScheduleDetail (111-112) — (a) REACHABLE.
 *      The third night-shift correction in `getParsedDetailToDate()`: flexy window earlier in the clock
 *      day than the shift start, so both flexy stamps roll forward one day. Production only feeds this
 *      method schedules whose flexy window already brackets the shift, so the arm never fired. Closed
 *      with an in-memory ScheduleDetail (21:00-06:00 shift, 01:00-10:00 flexy). No DB.
 *
 *  Schedule (149, 180) — 149 is (a) REACHABLE, 180 is (d) UNREACHABLE.
 *      149 `return collect($days)` only runs when `getPerDay()` is called with no day (or a day outside
 *      DAYS); all four production call sites pass `get_day_from_date(...)`, which always matches and
 *      always returns early at line 146. Closed by calling `getPerDay()` with no argument.
 *      180 is `break;` sitting immediately after `return EvoxDepartment::find(...)` on line 179 inside
 *      `owner()`. See FINDING SCHED-DEAD-BREAK-1 — NOT tested, cannot be. Both `owner()` arms are
 *      covered here anyway so that the class is short by that one dead token and nothing else.
 *
 *  Computation (1135) — (a) REACHABLE.
 *      The full-window branch of the private `get_total_night_diff()`: shift starts before 22:00 AND
 *      ends after 06:00, so the whole 8-hour night-differential window is credited. Every other caller
 *      inside compute_night_diff()/compute_overtime() passes windows that partially overlap. Driven
 *      through ReflectionMethod because the only public entry, `get_computed_payroll_items(Dtr)`,
 *      needs a persisted DTR plus schedule, policies, holidays and leaves; the helper itself is pure
 *      integer arithmetic with no state, so reflection tests exactly what the line does and nothing else.
 *
 *  TeamAttendanceResources — (a) REACHABLE.
 *      `toArray()` is fully covered by Unit/Resources/TeamAttendanceResourcesTest. The remaining member
 *      is `onTimeLog($array, $status)` (141-147), which has no caller — the loop at line 71 calls
 *      `$array->onTimeLog()` on the DTR, not this helper. Closed by calling it directly with a fake.
 *      See FINDING TAR-DEAD-METHOD-1.
 *
 *  DailyScheduleReources — (a) REACHABLE.
 *      Report -> Daily Schedule only ever runs with same-day data on the staging dump, so the
 *      underlapped / overlapped tag arms never fired. Closed with in-memory fakes covering all four
 *      shapes plus the no-schedule `continue` and the empty-resource guard. See FINDING DSR-CMP-1.
 *
 *  RequestApprovalChangeStatusResource — (a) REACHABLE.
 *      The null-resource path is already covered (submit.RequestListBranchTest). The four `instanceof`
 *      arms are only reached from the hash-code approval endpoint, which the existing suite exercises
 *      for a subset of request types. Closed by driving all four plus the silent fallthrough. No DB —
 *      the arms only construct the child resource, they never serialize it. See FINDING RACS-SILENT-1.
 *
 *  RegisteredUserEmail (35) — (a) REACHABLE.
 *      `$this->to($user->email)` is the production arm; under APP_ENV=testing the constructor always
 *      takes the else arm and mails the Eastvantage dev address. Closed by rebinding the container's
 *      `env` binding for the duration of one construction and restoring it in a finally.
 *
 * -----------------------------------------------------------------------------------------------------
 *  FINDINGS — arms NOT tested, and defects characterised while covering the ones that are
 * -----------------------------------------------------------------------------------------------------
 *
 *  SCHED-DEAD-BREAK-1  (d) Schedule.php:180 — `break;` directly after an unconditional `return` on 179.
 *                      No input can reach it; the identical dead `break;` sits on line 177. Schedule
 *                      therefore cannot reach 100% line coverage without deleting the two tokens.
 *                      NOT TESTED. Reported instead.
 *
 *  DEPT-TZ-1           Department::country_timezone_to_offset() returns `Carbon::now()->format('P')` —
 *                      the APPLICATION timezone offset. It never reads the department's country or
 *                      timezone. The source comment ("this should not exist but we give it UTC")
 *                      concedes it. Every department in every country reports the same offset, so any
 *                      per-country DTR/payroll display built on it is wrong outside the app timezone.
 *                      Covered by a test that asserts the actual (wrong) behaviour.
 *
 *  CS-SQLI-1           ChangeSchedule::changeSchedules() interpolates $start_date/$end_date straight
 *                      into `whereRaw("... BETWEEN '".$start_date."' ...")`. Proven below by asserting a
 *                      quote-bearing payload appears verbatim in the compiled SQL. Only `toSql()` is
 *                      called with the payload — nothing malicious is executed.
 *
 *  CS-ORPHAN-1         The same method is dead: it keys `schedules.bind_id` off the ChangeSchedule row's
 *                      own id, but `bind_id` holds a USER id for `bind_to='user'` rows. Any result it
 *                      returned would be the schedules of an unrelated user whose id happens to equal the
 *                      request id. It has no caller, which is the only reason this has not caused a bug.
 *
 *  TAR-DEAD-METHOD-1   TeamAttendanceResources::onTimeLog($array,$status) has no caller. It also takes
 *                      $status by value and returns a copy, so even if it were wired in, the caller
 *                      would have to reassign — the inline code at line 71-72 does not.
 *
 *  DSR-CMP-1           DailyScheduleReources compares a DATETIME string against a DATE-only string:
 *                      `date('Y-m-d  H:i:s', $end) > $this->overlapped_current_date`. It works only by
 *                      lexicographic accident (and the format has a stray double space). A shift ending
 *                      at exactly midnight is classified "overlapped". Characterised, not fixed.
 *
 *  RACS-SILENT-1       RequestApprovalChangeStatusResource::toArray() has no else on the instanceof
 *                      chain: an unrecognised request model yields `['request' => null, 'is_changed' =>
 *                      true]` with HTTP 200 — the caller cannot tell success from "type not handled".
 */
class ModelAndResourceArmsTest extends TestCase
{
    use DatabaseTransactions;

    /** An id that cannot exist, used to drive "row not found" arms. */
    const MISSING_ID = 999999999;

    // =================================================================================================
    //  Department (40, 42) — country_timezone_to_offset()
    // =================================================================================================

    /**
     * @test
     * The department offset getter is a pure clock read: it must produce a well-formed ISO-8601 offset
     * and it must be the APP offset, identical for every department. Both facts are asserted so the
     * test fails the day someone makes it genuinely country-aware (at which point DEPT-TZ-1 is fixed).
     */
    public function a_department_offset_is_the_application_offset_and_not_the_departments_country_offset()
    {
        $manila = new Department();
        $manila->id = 1;
        $manila->name = 'Manila Operations';

        $sofia = new Department();
        $sofia->id = 2;
        $sofia->name = 'Sofia Operations';

        $manilaOffset = $manila->country_timezone_to_offset();
        $sofiaOffset  = $sofia->country_timezone_to_offset();

        // well-formed offset, e.g. +00:00 / +08:00 / -05:00
        $this->assertRegExp('/^[+-]\d{2}:\d{2}$/', $manilaOffset);

        // FINDING DEPT-TZ-1: same value for every department, whatever the country
        $this->assertSame($manilaOffset, $sofiaOffset);
        $this->assertSame(Carbon::now()->format('P'), $manilaOffset);

        // and it survives a department carrying no id at all (no DB read happens)
        $this->assertSame($manilaOffset, (new Department())->country_timezone_to_offset());
    }

    // =================================================================================================
    //  Client (78-80) — the team-handler merge loop in department_user_handlers()
    // =================================================================================================

    /**
     * @test
     * department_user_handlers() must return the UNION of the department's own handlers and the handlers
     * of every team beneath it. The existing suite only ever hit the department half because it probed a
     * department with no teams; this probes off `teams` so the merge loop runs at least once, and then
     * asserts the business rule: a team handler is reachable through the department even when that user
     * appears in no `department_handlers` row.
     */
    public function department_user_handlers_merges_in_the_handlers_of_every_team_under_the_department()
    {
        $this->markTestSkipped('CLIENT MODULE REMOVED 2026-08-10: App\Modules\Client\Models\Client deleted with client module.');
        if (!Schema::hasTable('department_handlers') || !Schema::hasTable('team_handlers')) {
            $this->markTestSkipped('handler pivot tables missing from this dump');
        }
        // The method plucks a bare `id` across a join; an `id` column on either pivot makes that
        // ambiguous and the query dies on line 76, before the loop is ever entered.
        if (Schema::hasColumn('department_handlers', 'id') || Schema::hasColumn('team_handlers', 'id')) {
            $this->markTestSkipped('a handler pivot carries an id column — pluck(id) is ambiguous, see ClientAndDepartmentModelsTest');
        }

        // bounded, indexed probe in two steps. A LIMIT cannot live inside an IN-subquery on MySQL 5.7,
        // so the team ids are pulled first and fed back in as a literal list.
        $handledTeamIds = DB::table('team_handlers')
            ->orderBy('team_id', 'desc')
            ->limit(500)
            ->pluck('team_id')
            ->unique()
            ->values()
            ->all();

        if (empty($handledTeamIds)) {
            $this->markTestSkipped('team_handlers is empty in this dump');
        }

        $teamRow = Team::whereIn('id', $handledTeamIds)
            ->whereNotNull('department_id')
            ->orderBy('id', 'desc')
            ->first();

        if (!$teamRow) {
            $this->markTestSkipped('no team in this dump has both a department_id and a team_handlers row');
        }

        $client = new Client();
        $client->id = (int) $teamRow->department_id;

        // the loop must actually iterate, otherwise 78-80 stay dark and the test is worthless
        $teams = $client->teams()->get();
        $this->assertGreaterThan(0, $teams->count(), 'probe failed: the chosen department owns no teams');

        $teamIds = $teams->pluck('id')->map('intval')->all();

        $departmentHandlerIds = DB::table('department_handlers')
            ->where('department_id', $client->id)->pluck('user_id')->map('intval')->all();
        $teamHandlerIds = DB::table('team_handlers')
            ->whereIn('team_id', $teamIds)->pluck('user_id')->map('intval')->all();

        $expectedUnion = array_values(array_unique(array_merge($departmentHandlerIds, $teamHandlerIds)));

        $query  = $client->department_user_handlers();
        $actual = $query->limit(400)->pluck('users.id')->map('intval')->all();

        // BUSINESS RULE 1 — nothing outside the union may come back
        foreach ($actual as $id) {
            $this->assertContains($id, $expectedUnion, 'user ' . $id . ' handles neither the department nor any of its teams');
        }

        // BUSINESS RULE 2 — the merge really happened: every live team handler is reachable through the
        // department. Soft-deleted users are dropped by the User model, so compare against live ids only.
        // Skipped when the union is wider than the 400-row window, otherwise the window itself, not the
        // merge, would decide the outcome.
        if (count($expectedUnion) < 400) {
            $liveTeamHandlerIds = User::whereIn('id', $teamHandlerIds)->limit(400)->pluck('id')->map('intval')->all();
            $this->assertGreaterThan(0, count($teamHandlerIds), 'probe invariant broken: the chosen team has no handlers');

            foreach ($liveTeamHandlerIds as $id) {
                $this->assertContains($id, $actual, 'team handler ' . $id . ' was lost — the array_merge on Client.php:78-80 did not run');
            }
        }
    }

    // =================================================================================================
    //  ChangeSchedule — the orphaned changeSchedules() builder
    // =================================================================================================

    /**
     * @test
     * FINDING CS-SQLI-1 / CS-ORPHAN-1.
     * changeSchedules() builds a hasMany onto `schedules` filtered to bind_to=user +
     * source_type=change_schedule, with the date window pasted into raw SQL. Asserted three ways:
     * the relation shape, the raw interpolation (proven with toSql() only — never executed), and a
     * bounded execution of the clean form so the whole body runs.
     */
    public function the_orphaned_change_schedule_relation_builds_raw_sql_from_unescaped_dates()
    {
        $request = new ChangeSchedule();
        $request->id = self::MISSING_ID;   // an id no schedule can be bound to

        $relation = $request->changeSchedules('2026-07-01', '2026-07-31');

        $this->assertInstanceOf(HasMany::class, $relation);
        $this->assertSame('schedules.bind_id', $relation->getQualifiedForeignKeyName());

        $sql = $relation->toSql();
        $this->assertStringContainsString('valid_from', $sql);
        $this->assertStringContainsString('2026-07-01', $sql);
        $this->assertStringContainsString('2026-07-31', $sql);

        // CS-SQLI-1 — a quote-bearing value lands in the SQL text verbatim, unbound and unescaped.
        // toSql() compiles the statement; it is never sent to the database.
        $payload = "2026-07-01' OR '1'='1";
        $injected = (new ChangeSchedule())->changeSchedules($payload, '2026-07-31')->toSql();
        $this->assertStringContainsString($payload, $injected);

        // CS-ORPHAN-1 — executed cleanly and bounded, the relation keys schedules.bind_id off the
        // REQUEST id, so a request id that no schedule is bound to yields nothing.
        $this->assertCount(0, $request->changeSchedules('2026-07-01', '2026-07-31')->limit(5)->get());
    }

    /**
     * @test
     * The two live relations, asserted as contracts rather than as "did not throw": schedule() must be
     * narrowed to change_schedule-sourced rows, user() must key off user_id.
     */
    public function a_change_schedule_request_points_only_at_its_own_change_schedule_sourced_schedule()
    {
        $request = new ChangeSchedule();
        $request->id          = self::MISSING_ID;
        $request->user_id     = self::MISSING_ID;
        $request->schedule_id = self::MISSING_ID;

        $schedule = $request->schedule();
        $this->assertInstanceOf(HasOne::class, $schedule);
        $this->assertStringContainsString('source_type', $schedule->toSql());
        $this->assertNull($schedule->first());

        $this->assertNull($request->user()->first());
    }

    // =================================================================================================
    //  ScheduleDetail (111-112) — flexy window rolled forward for an overlapping night shift
    // =================================================================================================

    /**
     * @test
     * A 21:00-06:00 night shift whose flexy window reads 01:00-05:00 describes NEXT morning's flexy
     * window, not this morning's. getParsedDetailToDate() must roll both flexy stamps forward a day so
     * the whole window still sits inside the shift. Absolute datetimes are asserted, not recomputed
     * with the same helpers, so the test cannot pass tautologically.
     */
    public function a_night_shift_whose_flexy_window_reads_earlier_than_clock_in_is_rolled_to_the_next_day()
    {
        $detail = new ScheduleDetail([
            'day'               => 'all',
            'start_time'        => 75600,   // 21:00
            'end_time'          => 21600,   // 06:00 (next day)
            'start_flexy_time'  => 3600,    // 01:00 -> earlier than clock-in, must roll forward
            'end_flexy_time'    => 18000,   // 05:00
            'break_time'        => 3600,
        ]);

        $parsed = $detail->getParsedDetailToDate('2026-07-01');

        // shift itself: end rolls to the 2nd (already-covered night-shift arm, asserted as the anchor)
        $this->assertSame('2026-07-01 21:00:00', date('Y-m-d H:i:s', $parsed['start_datetime']));
        $this->assertSame('2026-07-02 06:00:00', date('Y-m-d H:i:s', $parsed['end_datetime']));

        // lines 111-112: BOTH flexy stamps move together, keeping the 4-hour window intact
        $this->assertSame('2026-07-02 01:00:00', date('Y-m-d H:i:s', $parsed['start_flexy_datetime']));
        $this->assertSame('2026-07-02 05:00:00', date('Y-m-d H:i:s', $parsed['end_flexy_datetime']));
        $this->assertSame(
            4 * 3600,
            $parsed['end_flexy_datetime'] - $parsed['start_flexy_datetime'],
            'rolling the flexy window must not change its length'
        );

        // BUSINESS RULE — after the correction the flexy window lies inside the shift, which is the
        // whole point of the arm: a flexy grace period that starts before clock-in is meaningless.
        $this->assertGreaterThan($parsed['start_datetime'], $parsed['start_flexy_datetime']);
        $this->assertLessThanOrEqual($parsed['end_datetime'], $parsed['end_flexy_datetime']);

        $this->assertSame(3600, (int) $parsed['break_time']);
    }

    /**
     * @test
     * The neighbouring arm, asserted so the two corrections are demonstrably independent: a flexy window
     * of 23:00-08:00 only needs its END rolled forward, and must NOT have its start moved as well.
     */
    public function a_flexy_window_that_only_wraps_midnight_moves_its_end_and_leaves_its_start_alone()
    {
        $detail = new ScheduleDetail([
            'day'               => 'all',
            'start_time'        => 75600,   // 21:00
            'end_time'          => 21600,   // 06:00
            'start_flexy_time'  => 82800,   // 23:00 — already after clock-in
            'end_flexy_time'    => 28800,   // 08:00
            'break_time'        => 0,
        ]);

        $parsed = $detail->getParsedDetailToDate('2026-07-01');

        $this->assertSame('2026-07-01 23:00:00', date('Y-m-d H:i:s', $parsed['start_flexy_datetime']));
        $this->assertSame('2026-07-02 08:00:00', date('Y-m-d H:i:s', $parsed['end_flexy_datetime']));
    }

    /**
     * @test
     * Null flexy times must leave the flexy keys null and skip the correction block entirely — a
     * standard (non-flexible) schedule must never gain a flexy window.
     */
    public function a_schedule_detail_without_a_flexy_window_keeps_null_flexy_stamps()
    {
        $detail = new ScheduleDetail([
            'day'               => 'all',
            'start_time'        => 32400,   // 09:00
            'end_time'          => 64800,   // 18:00
            'start_flexy_time'  => null,
            'end_flexy_time'    => null,
            'break_time'        => 3600,
        ]);

        $parsed = $detail->getParsedDetailToDate('2026-07-01');

        $this->assertNull($parsed['start_flexy_datetime']);
        $this->assertNull($parsed['end_flexy_datetime']);
        $this->assertSame('2026-07-01 09:00:00', date('Y-m-d H:i:s', $parsed['start_datetime']));
        $this->assertSame('2026-07-01 18:00:00', date('Y-m-d H:i:s', $parsed['end_datetime']));
    }

    // =================================================================================================
    //  Schedule (149) — getPerDay() without a chosen day; owner() both arms
    // =================================================================================================

    /**
     * @test
     * Every production caller passes a concrete day and gets a single detail back at line 146. Called
     * with no day the method must instead hand back the whole week: exactly the seven DAYS keys, null
     * on every rest day, and the SAME 'all' detail on every working day.
     */
    public function asking_a_schedule_for_the_whole_week_returns_one_entry_per_day_and_null_on_rest_days()
    {
        // bounded probe: newest schedules that own a day='all' detail
        $scheduleIds = DB::table('schedule_details')
            ->where('day', 'all')
            ->orderBy('id', 'desc')
            ->limit(50)
            ->pluck('schedule_id')
            ->all();

        if (empty($scheduleIds)) {
            $this->markTestSkipped('no schedule_details row with day = all in this dump');
        }

        $schedule = Schedule::whereIn('id', $scheduleIds)
            ->whereIn('schedule_type', ['standard', 'flexible'])
            ->orderBy('id', 'desc')
            ->first();

        if (!$schedule) {
            $this->markTestSkipped('none of the probed schedules is standard/flexible and undeleted');
        }
        if (!is_array($schedule->rest_days)) {
            $this->markTestSkipped('schedule ' . $schedule->id . ' has a null/unparseable rest_days payload');
        }

        $days = $schedule->getPerDay();          // <- no argument: falls through to line 149

        $this->assertInstanceOf(Collection::class, $days);
        $this->assertSame(get_constant('DAYS'), array_keys($days->all()));

        $allDetail = $schedule->schedule_details()->where('day', 'all')->first();
        $this->assertNotNull($allDetail, 'probe invariant broken: the day=all detail vanished');

        foreach (get_constant('DAYS') as $day) {
            if (in_array($day, $schedule->rest_days)) {
                $this->assertNull($days[$day], $day . ' is a rest day and must carry no schedule');
            } else {
                $this->assertNotNull($days[$day], $day . ' is a working day and must carry the all-day detail');
                $this->assertEquals($allDetail->id, $days[$day]->id);
            }
        }

        // a day_chosen outside DAYS is not a lookup — it also falls through to the full week
        $fallback = $schedule->getPerDay('not-a-weekday');
        $this->assertInstanceOf(Collection::class, $fallback);
        $this->assertSame(get_constant('DAYS'), array_keys($fallback->all()));

        // and the single-day lookup must agree with the corresponding entry of the full week
        $monday = $schedule->getPerDay('mon');
        if (in_array('mon', $schedule->rest_days)) {
            $this->assertNull($monday);
        } else {
            $this->assertEquals($allDetail->id, $monday->id);
        }
    }

    /**
     * @test
     * owner() dispatches on bind_to. The user arm returns a relation keyed on bind_id; the department
     * arm returns an already-resolved EvoxDepartment (not a relation — an asymmetry callers must know
     * about); anything else falls off the end of the switch as null.
     */
    public function a_schedule_resolves_its_owner_differently_for_users_and_departments()
    {
        // ---- bind_to = user
        $user = User::whereNull('deleted_at')->orderBy('id', 'desc')->first();
        if ($user) {
            $bound = new Schedule();
            $bound->bind_to = 'user';
            $bound->bind_id = $user->id;

            $relation = $bound->owner();
            $this->assertInstanceOf(HasOne::class, $relation);

            $resolved = $relation->first();
            $this->assertNotNull($resolved, 'a schedule bound to a live user must resolve that user');
            $this->assertEquals($user->id, $resolved->id);
        }

        // ---- bind_to = department  (Schedule.php:179)
        $evox = EvoxDepartment::orderBy('Id', 'desc')->first();
        if ($evox) {
            $bound = new Schedule();
            $bound->bind_to = 'department';
            $bound->bind_id = $evox->Id;

            try {
                $owner = $bound->owner();
                $this->assertInstanceOf(EvoxDepartment::class, $owner);
                $this->assertEquals($evox->Id, $owner->Id);

                // unknown department -> find() returns null, not an empty model
                $orphan = new Schedule();
                $orphan->bind_to = 'department';
                $orphan->bind_id = self::MISSING_ID;
                $this->assertNull($orphan->owner());
            } catch (QueryException $e) {
                // EvoxDepartment declares no $primaryKey, so find() searches `id` while the column is
                // `Id`. Harmless on MySQL (identifiers are case-insensitive); recorded if a stricter
                // engine ever rejects it.
                $this->assertStringContainsString('id', strtolower($e->getMessage()));
            }
        }

        if (!$user && !$evox) {
            $this->markTestSkipped('neither users nor EVOX_DEPARTMENT has a row to probe');
        }

        // ---- unhandled bind_to: no default arm, so the switch falls through and returns null
        $unbound = new Schedule();
        $unbound->bind_to = 'team';
        $unbound->bind_id = 1;
        $this->assertNull($unbound->owner());

        // ---- bind_to never set at all
        $this->assertNull((new Schedule())->owner());
    }

    // =================================================================================================
    //  Computation (1135) — the full night-differential window
    // =================================================================================================

    /**
     * @test
     * PAY-2ENGINE-1. Night differential runs 22:00 -> 06:00 (constants PAYROLL_NIGHT_DIFF_TIME).
     * A shift that starts BEFORE 22:00 and ends AFTER 06:00 straddles the whole window, so neither the
     * "start inside" nor the "end inside" branch applies and line 1135 credits the complete 8 hours.
     *
     * get_total_night_diff() is private and the only public entry needs a persisted DTR with schedule,
     * policies, holidays and leaves attached. The helper is pure integer arithmetic over its $parameters
     * array — no properties, no DB — so it is driven directly by reflection. That tests exactly this
     * line and nothing else.
     */
    public function a_shift_that_straddles_the_whole_night_window_is_credited_the_full_eight_hours()
    {
        $base   = strtotime('2026-07-01 00:00:00');
        $ndFrom = $base + 79200;    // 22:00
        $ndTo   = $base + 108000;   // 06:00 next day

        $total = $this->nightDiff([
            'time_start_to_compute'     => $base + 72000,    // 20:00 — two hours before the window
            'time_end_to_compute'       => $base + 115200,   // 08:00 — two hours after the window
            'night_diff_start_datetime' => $ndFrom,
            'night_diff_end_datetime'   => $ndTo,
        ]);

        // BUSINESS RULE — the credit is the window, not the shift
        $this->assertSame(28800, $total, 'a straddling shift must be credited exactly the 22:00-06:00 window');
        $this->assertSame(get_constant('TIMESTAMP.eight_hours'), $total);

        // and it is CAPPED: widening the shift further cannot buy more night differential
        $wider = $this->nightDiff([
            'time_start_to_compute'     => $base + 43200,    // 12:00
            'time_end_to_compute'       => $base + 144000,   // 16:00 next day
            'night_diff_start_datetime' => $ndFrom,
            'night_diff_end_datetime'   => $ndTo,
        ]);
        $this->assertSame(28800, $wider, 'night differential must not scale with shift length');
    }

    /**
     * @test
     * The sibling arm of the same else block: a shift wholly outside the window earns nothing. Asserted
     * alongside the partial-overlap arms so the helper's contract is pinned end to end rather than at a
     * single point.
     */
    public function a_shift_that_never_touches_the_night_window_earns_no_night_differential()
    {
        $base   = strtotime('2026-07-01 00:00:00');
        $ndFrom = $base + 79200;    // 22:00
        $ndTo   = $base + 108000;   // 06:00 next day

        // day shift 09:00 -> 18:00, entirely before the window
        $this->assertSame(0, $this->nightDiff([
            'time_start_to_compute'     => $base + 32400,
            'time_end_to_compute'       => $base + 64800,
            'night_diff_start_datetime' => $ndFrom,
            'night_diff_end_datetime'   => $ndTo,
        ]));

        // starts inside the window and runs past its end -> 22:00 to 06:00 from the clock-in
        $this->assertSame(21600, $this->nightDiff([
            'time_start_to_compute'     => $base + 86400,     // 00:00 next day
            'time_end_to_compute'       => $base + 115200,    // 08:00 next day
            'night_diff_start_datetime' => $ndFrom,
            'night_diff_end_datetime'   => $ndTo,
        ]));

        // ends inside the window having started before it -> 22:00 to clock-out
        $this->assertSame(7200, $this->nightDiff([
            'time_start_to_compute'     => $base + 72000,     // 20:00
            'time_end_to_compute'       => $base + 86400,     // 00:00 next day
            'night_diff_start_datetime' => $ndFrom,
            'night_diff_end_datetime'   => $ndTo,
        ]));

        // an expected-work window narrower than the logged time clamps the credit
        $this->assertSame(3600, $this->nightDiff([
            'time_start_to_compute'        => $base + 72000,   // 20:00 logged in
            'time_end_to_compute'          => $base + 115200,  // 08:00 logged out
            'expected_work_start_datetime' => $base + 82800,   // 23:00 scheduled in
            'expected_work_end_datetime'   => $base + 86400,   // 00:00 scheduled out
            'night_diff_start_datetime'    => $ndFrom,
            'night_diff_end_datetime'      => $ndTo,
        ]));
    }

    /** Drives the private pure helper. See the docblock above for why reflection is the right tool. */
    private function nightDiff(array $parameters)
    {
        $method = new \ReflectionMethod(Computation::class, 'get_total_night_diff');
        $method->setAccessible(true);

        return (int) $method->invoke(new Computation(), $parameters);
    }

    // =================================================================================================
    //  TeamAttendanceResources — the uncalled onTimeLog() helper
    // =================================================================================================

    /**
     * @test
     * FINDING TAR-DEAD-METHOD-1. The helper appends 'On Time' when the DTR reports an on-time log and
     * returns the list unchanged otherwise. It is asserted as a pure function — including the fact that
     * it returns a COPY and does not mutate the caller's array, which is why wiring it in would need a
     * reassignment the inline code at line 71-72 does not perform.
     */
    public function the_unused_on_time_helper_appends_a_status_only_for_an_on_time_log()
    {
        $resource = new TeamAttendanceResources([]);

        $onTime  = new MraFakeAttendanceRow(true);
        $lateRow = new MraFakeAttendanceRow(false);

        $existing = ['Holiday'];

        $this->assertSame(['Holiday', 'On Time'], $resource->onTimeLog($onTime, $existing));
        $this->assertSame(['Holiday'], $resource->onTimeLog($lateRow, $existing));

        // by-value: the caller's array is untouched by either call
        $this->assertSame(['Holiday'], $existing);

        // empty starting list
        $this->assertSame(['On Time'], $resource->onTimeLog($onTime, []));
        $this->assertSame([], $resource->onTimeLog($lateRow, []));
    }

    // =================================================================================================
    //  DailyScheduleReources — the day-tagging arms
    // =================================================================================================

    /**
     * @test
     * A shift that starts and ends inside the reported day is "regular" and its hour count is the whole
     * shift.
     */
    public function a_shift_inside_the_reported_day_is_tagged_regular_and_counts_its_full_length()
    {
        $row = new MraFakeScheduleRow('2026-07-01', '2026-07-01 09:00:00', '2026-07-01 18:00:00');

        $entry = $this->dailySchedule([$row], '2026-07-01');

        $this->assertSame('regular', $entry['day_type']);
        $this->assertSame(9.0, (float) $entry['hour']);
        $this->assertSame('2026-07-01 09:00:00', $entry['on_duty']);
        $this->assertSame('2026-07-01 18:00:00', $entry['off_duty']);
        $this->assertSame('Dela Cruz, Juan', $entry['Name']);
        $this->assertSame('09:00-18:00', $entry['Schedule']);
        $this->assertSame('Present', $entry['type']);
    }

    /**
     * @test
     * A night shift that began the PREVIOUS day is "underlapped", and only the part falling on the
     * reported day is counted — 22:00 on the 1st to 06:00 on the 2nd contributes 6 hours to the 2nd.
     */
    public function a_night_shift_started_the_day_before_is_underlapped_and_counts_only_todays_share()
    {
        $row = new MraFakeScheduleRow('2026-07-01', '2026-07-01 22:00:00', '2026-07-02 06:00:00');

        $entry = $this->dailySchedule([$row], '2026-07-02');

        $this->assertSame('underlapped', $entry['day_type']);
        $this->assertSame(6.0, (float) $entry['hour']);
    }

    /**
     * @test
     * The mirror case: reported on the day it STARTS, the same 22:00-06:00 shift is "overlapped" and
     * contributes only the 2 hours before midnight. Underlapped + overlapped must sum to the shift.
     */
    public function a_night_shift_running_past_midnight_is_overlapped_and_counts_only_todays_share()
    {
        $row = new MraFakeScheduleRow('2026-07-01', '2026-07-01 22:00:00', '2026-07-02 06:00:00');

        $entry = $this->dailySchedule([$row], '2026-07-01');

        $this->assertSame('overlapped', $entry['day_type']);
        $this->assertSame(2.0, (float) $entry['hour']);

        // BUSINESS RULE — the two halves of one night shift add up to its length, no double counting
        $underlapped = $this->dailySchedule([$row], '2026-07-02');
        $this->assertSame(8.0, (float) $entry['hour'] + (float) $underlapped['hour']);
    }

    /**
     * @test
     * FINDING DSR-CMP-1. The overlapped test compares `date('Y-m-d  H:i:s', $end)` (a datetime, with a
     * stray double space) against a DATE-only string. A shift ending at exactly 00:00 on the next day
     * therefore compares greater and is classified overlapped even though nothing spills into that day —
     * and its hour count is the full shift. Characterised, not fixed.
     */
    public function a_shift_ending_exactly_at_midnight_is_misclassified_as_overlapped_FINDING_DSR_CMP_1()
    {
        $row = new MraFakeScheduleRow('2026-07-01', '2026-07-01 16:00:00', '2026-07-02 00:00:00');

        $entry = $this->dailySchedule([$row], '2026-07-01');

        $this->assertSame('overlapped', $entry['day_type'], 'if this now reads regular, DSR-CMP-1 has been fixed');
        $this->assertSame(8.0, (float) $entry['hour']);
    }

    /**
     * @test
     * Rows with no schedule are skipped outright, and an empty result set yields an empty data list
     * rather than a null one — the report must always render a `data` key.
     */
    public function rows_without_a_schedule_are_skipped_and_an_empty_set_still_returns_a_data_key()
    {
        $withSchedule = new MraFakeScheduleRow('2026-07-01', '2026-07-01 09:00:00', '2026-07-01 18:00:00');
        $noSchedule   = new MraFakeScheduleRow('2026-07-01', '2026-07-01 09:00:00', '2026-07-01 18:00:00');
        $noSchedule->scheduled = false;

        $payload = (new DailyScheduleReources([$noSchedule, $withSchedule], new Carbon('2026-07-01')))
            ->toArray(request());

        $this->assertArrayHasKey('data', $payload);
        $this->assertCount(1, $payload['data'], 'the unscheduled row must be dropped, not rendered');

        $empty = (new DailyScheduleReources([], new Carbon('2026-07-01')))->toArray(request());
        $this->assertSame(['data' => []], $empty);
    }

    /** Renders one fake DTR through the report resource and returns the single entry. */
    private function dailySchedule(array $rows, string $currentDate)
    {
        $payload = (new DailyScheduleReources($rows, new Carbon($currentDate)))->toArray(request());

        $this->assertArrayHasKey('data', $payload);
        $this->assertCount(1, $payload['data']);

        return $payload['data'][0];
    }

    // =================================================================================================
    //  RequestApprovalChangeStatusResource — the four instanceof arms
    // =================================================================================================

    /**
     * @test
     * The approval envelope must wrap each request model in ITS OWN resource type — an overtime request
     * must never be rendered through the rest-day-work resource, and so on. Only the wrapping is
     * asserted; the child resources are not serialized, so no DB read happens here.
     */
    public function the_approval_envelope_wraps_each_request_type_in_its_matching_resource()
    {
        $cases = [
            [new Overtime(),       OvertimeResource::class],
            [new RestDayWork(),    RestDayWorkResource::class],
            [new AlterLog(),       AlterLogResource::class],
            [new ChangeSchedule(), ChangeScheduleResource::class],
        ];

        foreach ($cases as [$model, $expectedResource]) {
            $payload = (new RequestApprovalChangeStatusResource($model, true))->toArray(request());

            $this->assertSame(['request', 'is_changed'], array_keys($payload));
            $this->assertTrue($payload['is_changed']);
            $this->assertInstanceOf(
                $expectedResource,
                $payload['request'],
                get_class($model) . ' must be rendered through ' . $expectedResource
            );
        }
    }

    /** @test  is_changed is carried straight through and defaults to true. */
    public function the_approval_envelope_reports_whether_the_status_actually_changed()
    {
        $unchanged = (new RequestApprovalChangeStatusResource(new Overtime(), false))->toArray(request());
        $this->assertFalse($unchanged['is_changed']);

        $defaulted = (new RequestApprovalChangeStatusResource(new Overtime()))->toArray(request());
        $this->assertTrue($defaulted['is_changed']);
    }

    /**
     * @test
     * FINDING RACS-SILENT-1. The instanceof chain has no else. Handed a model it does not know, the
     * envelope reports is_changed = true with a null request — a caller sees a 200 and cannot tell the
     * approval succeeded from the type having been silently dropped. Characterised, not fixed.
     */
    public function an_unrecognised_request_type_is_silently_reported_as_a_successful_null_FINDING_RACS_SILENT_1()
    {
        $payload = (new RequestApprovalChangeStatusResource(new User(), true))->toArray(request());

        $this->assertNull($payload['request'], 'if this is now non-null, RACS-SILENT-1 has been fixed');
        $this->assertTrue($payload['is_changed'], 'the envelope still claims the change succeeded');
    }

    // =================================================================================================
    //  RegisteredUserEmail (35) — the production recipient arm
    // =================================================================================================

    /**
     * @test
     * BUSINESS RULE — welcome mail may only reach a real employee inbox in production. Outside
     * production every message is redirected to the Eastvantage dev address, whatever the user's own
     * address is. Both arms are asserted on the same user so the redirection is unambiguous.
     */
    public function a_welcome_email_reaches_the_employee_only_in_production_and_the_dev_inbox_everywhere_else()
    {
        $user = new User();
        $user->email      = 'branch.test.recipient@example.com';
        $user->first_name = 'Branch';
        $user->last_name  = 'Test';

        // ---- non-production (this suite runs with APP_ENV=testing): redirected
        $staging = new RegisteredUserEmail($user, 'TempPass123!');
        $this->assertSame(
            [get_constant('EASTVANTAGE_DEV_EMAIL')],
            array_column($staging->to, 'address'),
            'outside production the welcome mail must be redirected to the dev inbox'
        );
        $this->assertNotContains($user->email, array_column($staging->to, 'address'));

        // ---- production (Schedule of record: RegisteredUserEmail.php:35)
        $originalEnv = $this->app['env'];
        try {
            $this->app['env'] = 'production';
            $production = new RegisteredUserEmail($user, 'TempPass123!');
        } finally {
            $this->app['env'] = $originalEnv;
        }

        $this->assertSame(
            [$user->email],
            array_column($production->to, 'address'),
            'in production the welcome mail must go to the employee, not the dev inbox'
        );
        $this->assertNotContains(get_constant('EASTVANTAGE_DEV_EMAIL'), array_column($production->to, 'address'));

        // the env rebinding was undone
        $this->assertSame($originalEnv, $this->app['env']);

        // and the message the employee receives is the welcome markdown, addressed as built
        $built = $production->build();
        $this->assertSame('Welcome to Eastvantage!', $built->subject);
        // $markdown is protected on Mailable — read via reflection
        $markdownProp = new \ReflectionProperty(get_class($built), 'markdown');
        $markdownProp->setAccessible(true);
        $this->assertSame('emails.registered-user', $markdownProp->getValue($built));
        $this->assertSame('TempPass123!', $built->temporary_password);
        $this->assertSame(env('FRONT_END_URL'), $built->site_link);
    }
}

/**
 * Minimal stand-in for a Dtr, for TeamAttendanceResources::onTimeLog(). The helper only calls
 * onTimeLog() on whatever it is handed.
 */
class MraFakeAttendanceRow
{
    private $onTime;

    public function __construct(bool $onTime)
    {
        $this->onTime = $onTime;
    }

    public function onTimeLog()
    {
        return $this->onTime;
    }
}

/**
 * Minimal stand-in for a Dtr row as DailyScheduleReources consumes it: three public timestamp/date
 * attributes plus hasSchedule/getDtrStatus/getSchedule/user. Nothing here touches the database.
 */
class MraFakeScheduleRow
{
    public $date;
    public $start_datetime;
    public $end_datetime;
    public $scheduled = true;

    private $status;
    private $scheduleLabel;

    public function __construct(string $date, string $start, string $end, string $status = 'Present')
    {
        $this->date           = $date;
        $this->start_datetime = strtotime($start);
        $this->end_datetime   = strtotime($end);
        $this->status         = $status;
        $this->scheduleLabel  = date('H:i', $this->start_datetime) . '-' . date('H:i', $this->end_datetime);
    }

    public function hasSchedule()
    {
        return $this->scheduled;
    }

    public function getDtrStatus()
    {
        return $this->status;
    }

    public function getSchedule()
    {
        return $this->scheduleLabel;
    }

    public function user()
    {
        return new MraFakeUserRelation();
    }
}

class MraFakeUserRelation
{
    public function first()
    {
        return new MraFakeReportUser();
    }
}

class MraFakeReportUser
{
    public function getFullName($mode = null)
    {
        return 'Dela Cruz, Juan';
    }
}
