<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Carbon\Carbon;
use DateTime;
use DateTimeZone;
use Tests\TestCase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\Leave;
use App\Modules\Payroll\Resources\DtrLogResource;
use App\Modules\Payroll\Resources\DtrResource;
use App\Modules\Department\Models\EvoxSubDepartment;
use App\Modules\User\Models\User;
use App\Modules\User\Models\UtcTimelog;

/**
 * =====================================================================================================
 *  SOURCE FILES UNDER TEST
 *      app/Modules/Payroll/Resources/DtrLogResource.php :: toArray   (77.08% before this file)
 *      app/Modules/Payroll/Resources/DtrResource.php    :: toArray   (76.70% before this file)
 *      (both read app/Helpers/date_helper.php :: timestamp_to_time / timestamp_to_datetime)
 *
 *  MENU PATH
 *      Reports    -> DTR Logs            (DtrLogResource — one row per employee-day)
 *      My Profile -> My DTR              (DtrResource — the day card the employee acts on)
 *      My Team    -> Team DTR            (DtrResource — same card seen by the supervisor)
 *
 *  WHY WAVE 2 SKIPPED THESE, AND WHAT CHANGED
 *  Both resources emit an owner-point-of-view block built with the THREE-ARGUMENT form of the
 *  timestamp helpers. Those helpers compare two offsets for the owner's country:
 *      (a) the offset RIGHT NOW              -> User::country_timezone_to_offset(), i.e. Carbon::now($tz)
 *      (b) the offset AT THE PUNCH INSTANT   -> Carbon::createFromTimestamp($ts)->setTimezone($tz)
 *  so which arm runs depends on whether the country is in the same DST state today as it was on the
 *  day of the punch — i.e. on the calendar date the suite happens to run. Both are pinned here:
 *      (a) Carbon::setTestNow() freezes "now" (restored in tearDown, including after a failure);
 *      (b) every punch is a FIXED 1990 epoch, never "today".
 *  Every expected value is then derived with PHP's own DateTime/DateTimeZone — never by calling the
 *  helper under test — so the assertions are exact and independent.
 *
 *  FINDINGS RAISED HERE
 *      DATE-TS-TIME-OWNER-1  timestamp_to_time()'s owner arm double-converts: line 410 wraps
 *                            $target_date_offset (ALREADY seconds, from string_offset_to_seconds() on
 *                            line 407) in string_offset_to_seconds() a second time. That function
 *                            returns 0 for a non-string, so the arm adds ZERO and the owner is shown
 *                            the raw UTC clock instead of their own. It fires whenever the owner's
 *                            country is in a different DST state now than it was at the punch — i.e.
 *                            for European employees for roughly half of every year. The identical bug
 *                            was already fixed in timestamp_to_datetime() (see the "F11-F14 fix"
 *                            comment on date_helper.php line 262-264), which is why DtrResource's
 *                            owner_POV is right on the same instant that DtrLogResource's user_POV is
 *                            wrong. Sibling copies still carrying it: timestamp_to_datetime_small()
 *                            line 315 and timestamp_to_time() line 413's counterpart in
 *                            seconds_to_time()/seconds_to_time_POV() line 152.
 *      RES-DTR-RAWTIME-STRAY-1  DtrResource's raw_time block is written
 *                            `'start_datetime' => $this->start_datetime , true ,` — the stray `true`
 *                            is not a value of any key, it is a fourth array element. The block ships
 *                            two extra positional booleans (keys 0 and 1) in every DTR payload.
 *      RES-DTR-LEAVE-FIRST-1  (observed, not tested — needs two leaves on one day, which the request
 *                            flow does not produce) DtrLogResource gates on onLeave() (approved, paid,
 *                            amount > 0) but then reads the payroll item name and amount from
 *                            leaves()->first(), which is simply the lowest-id leave of the day. With a
 *                            denied leave stored first, the day would be tagged with the denied row's
 *                            type and amount.
 *
 *  SAFETY
 *      NOTHING IS WRITTEN. Every DTR here is an unsaved in-memory model carrying an id no row holds,
 *      so holidays()/leaves()/policies()/alter_log() resolve to empty sets by construction and the
 *      two tests that need real child rows adopt an EXISTING dtr id found through a bounded, indexed
 *      probe. DatabaseTransactions is carried because the suite convention requires it and because
 *      the probes read through Eloquent. No stored procedure, no filesystem, no outward call.
 * =====================================================================================================
 */
class PayrollDtrResourceResidueTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * An id no dtrs row can hold, so every relation off the in-memory DTR resolves to an empty set.
     * (dtrs.id is a signed INT; this is its maximum, and the live sequence is five digits.)
     */
    const UNUSED_DTR_ID = 2147483647;

    /** The DTR's calendar date. 1990 predates EVOX, so no alter_log / overtime / rest-day-work row
     *  for the probe employee can collide with it and turn `requests` into live data. */
    const FIXTURE_DATE = '1990-01-15';

    /** @var Request */
    private $request;

    protected function setUp(): void
    {
        parent::setUp();
        $this->request = Request::create('/api/probe', 'GET');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();                 // release the frozen clock even if an assertion failed
        parent::tearDown();
    }

    // =================================================================================================
    //  Fixed instants and offset arithmetic — all derived from PHP, never from the helper under test
    // =================================================================================================

    /** 1990-01-15 09:00:00 UTC — northern winter. */
    private function winterInstant()
    {
        return gmmktime(9, 0, 0, 1, 15, 1990);
    }

    /** 1990-07-16 09:00:00 UTC — northern summer. */
    private function summerInstant()
    {
        return gmmktime(9, 0, 0, 7, 16, 1990);
    }

    /** The zone's UTC offset in seconds at a given instant, straight from the tz database. */
    private function offsetAt($timezone, $timestamp)
    {
        $moment = new DateTime('@' . $timestamp);
        $moment->setTimezone(new DateTimeZone($timezone));

        return $moment->getOffset();
    }

    /** The wall clock a person standing in $timezone reads at that instant. */
    private function wallClockAt($timezone, $timestamp, $format)
    {
        $moment = new DateTime('@' . $timestamp);
        $moment->setTimezone(new DateTimeZone($timezone));

        return $moment->format($format);
    }

    /** Freeze Carbon::now() on an exact instant. Restored by tearDown(). */
    private function freezeClockAt($timestamp)
    {
        Carbon::setTestNow(Carbon::createFromTimestampUTC($timestamp));
    }

    // =================================================================================================
    //  Probes — bounded, indexed, read-only
    // =================================================================================================

    /**
     * Every configured country zone whose timezone PHP actually knows AND whose country_id appears
     * only once — country_zone() resolves the row with an unordered ->first(), so a country holding
     * two rows could hand the resource a different row than the test read.
     */
    private function knownZones()
    {
        $valid = timezone_identifiers_list();
        $rows  = UtcTimelog::whereNotNull('timezone')->whereNotNull('country_id')->get();
        $counts = $rows->groupBy('country_id')->map(function ($group) {
            return $group->count();
        });

        return $rows->filter(function ($zone) use ($valid, $counts) {
            return in_array($zone->timezone, $valid, true) && $counts[$zone->country_id] === 1;
        })->values();
    }

    /**
     * An employee of $countryId the resources can render end to end: fully named (getFullName()
     * and emp_num are emitted verbatim) and with a sub-department that either is absent or really
     * resolves — DtrLogResource dereferences EvoxSubDepartment::first()->Name with no null guard.
     *
     * $wantSubDepartment true  -> the "department => Name" arm of that ternary
     *                    false -> the "department => null" arm
     */
    private function ownerIn($countryId, $wantSubDepartment = null)
    {
        $candidates = User::where('country_id', $countryId)
            ->where('is_active', 1)
            ->whereNotNull('emp_num')->where('emp_num', '!=', '')
            ->whereNotNull('first_name')->where('first_name', '!=', '')
            ->whereNotNull('last_name')->where('last_name', '!=', '')
            ->orderBy('id', 'desc')->limit(25)->get();

        foreach ($candidates as $user) {
            $hasSub = is_valid($user->SubDepartmentID)
                && EvoxSubDepartment::where('Id', $user->SubDepartmentID)->first() !== null;

            // a sub-department id pointing at nothing would fatal inside the resource
            if (is_valid($user->SubDepartmentID) && !$hasSub) {
                continue;
            }
            if ($wantSubDepartment === null || $hasSub === $wantSubDepartment) {
                return $user;
            }
        }

        return null;
    }

    /** The first renderable owner in ANY configured country, with their zone. */
    private function anyOwnerWithZone()
    {
        foreach ($this->knownZones() as $zone) {
            $owner = $this->ownerIn($zone->country_id);
            if ($owner) {
                return [$owner, $zone];
            }
        }

        return [null, null];
    }

    /**
     * An owner whose country really changes offset between the two fixed instants (a DST country),
     * with the winter offset non-zero so "offset applied" and "offset dropped" cannot look alike.
     */
    private function dstOwnerWithZone()
    {
        foreach ($this->knownZones() as $zone) {
            $winter = $this->offsetAt($zone->timezone, $this->winterInstant());
            $summer = $this->offsetAt($zone->timezone, $this->summerInstant());
            if ($winter === $summer || $winter === 0) {
                continue;
            }
            $owner = $this->ownerIn($zone->country_id);
            if ($owner) {
                return [$owner, $zone];
            }
        }

        return [null, null];
    }

    /** An unsaved DTR whose every relation is empty by construction. */
    private function memoryDtr(User $owner, array $attributes = [])
    {
        $dtr = new Dtr();
        $dtr->setRawAttributes(array_merge([
            'id'                   => self::UNUSED_DTR_ID,
            'user_id'              => $owner->id,
            'date'                 => self::FIXTURE_DATE,
            'time_in'              => null,
            'time_out'             => null,
            'start_datetime'       => null,
            'end_datetime'         => null,
            'start_flexy_datetime' => null,
            'end_flexy_datetime'   => null,
            'break_time'           => 0,
            'is_rest_day'          => 0,
            'source_type_tagging'  => 'default',
        ], $attributes));

        return $dtr;
    }

    // =================================================================================================
    //  DtrLogResource — the owner point-of-view block
    // =================================================================================================

    /**
     * @test
     * BUSINESS RULE — the DTR Logs report shows each punch twice: once on the application clock (the
     * top-level keys, for the payroll officer) and once on the EMPLOYEE's own clock (user_POV). When
     * the employee's country is in the same DST state today as it was on the day of the punch, the
     * point-of-view block must read as that employee's local wall clock.
     */
    public function a_log_row_renders_the_owners_punches_on_the_owners_own_clock()
    {
        list($owner, $zone) = $this->anyOwnerWithZone();
        if (!$owner) $this->markTestSkipped('no fully-named active employee in a utc_timelog country');

        $timeIn  = $this->winterInstant();
        $timeOut = $timeIn + 8 * 3600;
        $this->freezeClockAt($timeIn);        // now == the punch instant, so the two offsets agree

        $out = (new DtrLogResource($this->memoryDtr($owner, [
            'time_in'              => $timeIn,
            'time_out'             => $timeOut,
            'start_datetime'       => $timeIn,
            'end_datetime'         => $timeOut,
            'start_flexy_datetime' => $timeIn + 1800,
            'end_flexy_datetime'   => $timeOut + 1800,
        ])))->toArray($this->request);

        $tz = $zone->timezone;
        $this->assertSame($this->wallClockAt($tz, $timeIn, 'H:i:s'), $out['user_POV']['time_in']);
        $this->assertSame($this->wallClockAt($tz, $timeOut, 'H:i:s'), $out['user_POV']['time_out']);
        $this->assertSame($this->wallClockAt($tz, $timeIn, 'H:i:s'), $out['user_POV']['start_datetime']);
        $this->assertSame($this->wallClockAt($tz, $timeOut, 'H:i:s'), $out['user_POV']['end_datetime']);
        $this->assertSame($this->wallClockAt($tz, $timeIn + 1800, 'H:i:s'), $out['user_POV']['start_flexy_datetime']);
        $this->assertSame($this->wallClockAt($tz, $timeOut + 1800, 'H:i:s'), $out['user_POV']['end_flexy_datetime']);

        // and the un-converted block stays on the application clock (UTC): nobody is authenticated,
        // so the viewer arm of timestamp_to_time() cannot fire either
        $this->assertSame(gmdate('H:i:s', $timeIn), $out['time_in']);
        $this->assertSame(gmdate('H:i:s', $timeOut), $out['time_out']);

        // the row also names the zone it was converted for
        $this->assertSame($zone->country_time_zone, $out['timezone']);
        $this->assertSame($owner->emp_num, $out['emp_num']);
        $this->assertSame($owner->getFullName(), $out['full_name']);
        $this->assertSame($owner->id, $out['user_id']);
        $this->assertSame(self::FIXTURE_DATE, $out['date']);
    }

    /**
     * @test
     * FINDING DATE-TS-TIME-OWNER-1 (characterisation — assert what it does TODAY).
     *
     * Same employee, same punch, but the clock is frozen in the OTHER half of the year, so the
     * country's offset now differs from its offset at the punch. timestamp_to_time() takes its
     * mismatch arm and adds string_offset_to_seconds($target_date_offset) — a SECOND conversion of a
     * value that is already an integer number of seconds, which returns 0. The employee is therefore
     * shown the raw UTC clock: an 09:00 UTC punch reads 09:00 to a Sofia employee who actually
     * punched at 11:00 local. Flip these to wallClockAt() when line 410 drops the extra wrapper.
     */
    public function an_owner_whose_country_changed_offset_since_the_punch_is_shown_utc_FINDING_DATE_TS_TIME_OWNER_1()
    {
        list($owner, $zone) = $this->dstOwnerWithZone();
        if (!$owner) {
            $this->markTestSkipped(
                'no configured country both observes DST between the two fixed 1990 instants and has '
                . 'a renderable employee — the mismatch arm cannot be reached from this dump'
            );
        }

        $timeIn  = $this->winterInstant();
        $timeOut = $timeIn + 3600;
        $this->freezeClockAt($this->summerInstant());     // summer "now" vs a winter punch

        $out = (new DtrLogResource($this->memoryDtr($owner, [
            'time_in'  => $timeIn,
            'time_out' => $timeOut,
        ])))->toArray($this->request);

        $this->assertSame(gmdate('H:i:s', $timeIn), $out['user_POV']['time_in']);
        $this->assertSame(gmdate('H:i:s', $timeOut), $out['user_POV']['time_out']);

        // and that is NOT what the employee's clock said — the offset was silently dropped
        $this->assertNotSame(
            $this->wallClockAt($zone->timezone, $timeIn, 'H:i:s'),
            $out['user_POV']['time_in'],
            'the owner offset survived the double conversion — DATE-TS-TIME-OWNER-1 is fixed, flip this test'
        );
    }

    /**
     * @test
     * BUSINESS RULE — the proof that DATE-TS-TIME-OWNER-1 is a defect in ONE helper and not an
     * artefact of the test clock: on the SAME instant, for the SAME owner, DtrResource's owner_POV
     * (timestamp_to_datetime, where the double conversion was already removed) reports the employee's
     * real local time while DtrLogResource's user_POV reports UTC.
     */
    public function the_day_card_converts_the_same_punch_that_the_log_row_leaves_in_utc_FINDING_DATE_TS_TIME_OWNER_1()
    {
        list($owner, $zone) = $this->dstOwnerWithZone();
        if (!$owner) {
            $this->markTestSkipped(
                'no configured country both observes DST between the two fixed 1990 instants and has '
                . 'a renderable employee — the mismatch arm cannot be reached from this dump'
            );
        }

        $timeIn = $this->winterInstant();
        $this->freezeClockAt($this->summerInstant());
        $dtr = $this->memoryDtr($owner, ['time_in' => $timeIn, 'time_out' => $timeIn + 3600]);

        $card = (new DtrResource($dtr))->toArray($this->request);
        $log  = (new DtrLogResource($dtr))->toArray($this->request);

        // corrected helper: the employee's own date AND time
        $this->assertSame(
            $this->wallClockAt($zone->timezone, $timeIn, 'Y-m-d H:i:s'),
            $card['owner_POV']['time_in']
        );
        // uncorrected helper: UTC, on the very same run
        $this->assertSame(gmdate('H:i:s', $timeIn), $log['user_POV']['time_in']);
        $this->assertNotSame(
            substr($card['owner_POV']['time_in'], 11),
            $log['user_POV']['time_in'],
            'both helpers now agree — DATE-TS-TIME-OWNER-1 is fixed, flip this test'
        );
    }

    // =================================================================================================
    //  DtrLogResource — the remaining conditionals
    // =================================================================================================

    /**
     * @test
     * BUSINESS RULE — a break is reported as a duration only when one was actually taken; a zero or
     * absent break must serialise as null so the report renders a blank cell rather than "00:00".
     */
    public function a_log_row_reports_a_break_only_when_one_was_taken()
    {
        list($owner) = $this->anyOwnerWithZone();
        if (!$owner) $this->markTestSkipped('no fully-named active employee in a utc_timelog country');
        $this->freezeClockAt($this->winterInstant());

        $withBreak = (new DtrLogResource($this->memoryDtr($owner, ['break_time' => 3600])))
            ->toArray($this->request);
        $this->assertSame('01:00', $withBreak['break_time']);

        $zeroBreak = (new DtrLogResource($this->memoryDtr($owner, ['break_time' => 0])))
            ->toArray($this->request);
        $this->assertNull($zeroBreak['break_time']);

        $noBreak = (new DtrLogResource($this->memoryDtr($owner, ['break_time' => null])))
            ->toArray($this->request);
        $this->assertNull($noBreak['break_time']);
    }

    /**
     * @test
     * BUSINESS RULE — the report names the employee's sub-department when they belong to one, so the
     * payroll officer can group the rows.
     */
    public function a_log_row_names_the_sub_department_of_an_employee_who_belongs_to_one()
    {
        $owner = null;
        foreach ($this->knownZones() as $zone) {
            $owner = $this->ownerIn($zone->country_id, true);
            if ($owner) break;
        }
        if (!$owner) $this->markTestSkipped('no renderable employee with a resolvable SubDepartmentID');
        $this->freezeClockAt($this->winterInstant());

        $expected = EvoxSubDepartment::where('Id', $owner->SubDepartmentID)->first()->Name;

        $out = (new DtrLogResource($this->memoryDtr($owner)))->toArray($this->request);

        $this->assertSame($expected, $out['department']);
    }

    /**
     * @test
     * BUSINESS RULE — the other arm: an employee attached to no sub-department is reported with an
     * explicit null, not with a fabricated label.
     */
    public function a_log_row_leaves_the_department_null_for_an_employee_without_one()
    {
        $owner = null;
        foreach ($this->knownZones() as $zone) {
            $owner = $this->ownerIn($zone->country_id, false);
            if ($owner) break;
        }
        if (!$owner) $this->markTestSkipped('no renderable employee without a SubDepartmentID');
        $this->freezeClockAt($this->winterInstant());

        $out = (new DtrLogResource($this->memoryDtr($owner)))->toArray($this->request);

        $this->assertNull($out['department']);
    }

    /**
     * @test
     * BUSINESS RULE — a day with no summary row and no leave carries an EMPTY payroll_items map. The
     * report distinguishes "nothing to declare" from "late/undertime/overtime declared", and an empty
     * map is what makes the row render as a plain worked day.
     */
    public function a_day_with_no_summary_row_and_no_leave_declares_no_payroll_items()
    {
        list($owner) = $this->anyOwnerWithZone();
        if (!$owner) $this->markTestSkipped('no fully-named active employee in a utc_timelog country');
        $this->freezeClockAt($this->winterInstant());

        $out = (new DtrLogResource($this->memoryDtr($owner)))->toArray($this->request);

        $this->assertSame([], $out['payroll_items']);
        $this->assertSame([], $out['holidays']);
    }

    /**
     * @test
     * BUSINESS RULE — the summary row drives the payroll item map, and each item is published as a
     * H:i:s duration. A column that is zero must publish as an empty string, not as "00:00:00":
     * the DTR Logs table prints the value verbatim and would otherwise show a zero late for every
     * punctual employee.
     */
    public function summary_columns_are_published_as_durations_and_a_zero_column_as_an_empty_string()
    {
        list($owner) = $this->anyOwnerWithZone();
        if (!$owner) $this->markTestSkipped('no fully-named active employee in a utc_timelog country');

        // indexed lookup on the owning employee only — never a scan of the summary table
        $late = DB::table('drt_summary_report')
            ->where('user_id', $owner->id)
            ->where('reg_late', '>', 0)->where('reg_late', '<', 24)
            ->orderBy('login_date', 'desc')->first();
        if (!$late) $this->markTestSkipped('the probe employee has no summary row carrying a late');

        // the resource's foreach keeps the LAST row it sees; only assert when the day is unambiguous
        $sameDay = DB::table('drt_summary_report')
            ->where('user_id', $owner->id)->where('login_date', $late->login_date)->count();
        if ($sameDay !== 1) $this->markTestSkipped('that employee-day carries more than one summary row');

        $this->freezeClockAt($this->winterInstant());

        $out = (new DtrLogResource($this->memoryDtr($owner, ['date' => $late->login_date])))
            ->toArray($this->request);

        // the helper formats seconds-since-midnight; gmdate does the same arithmetic independently
        $this->assertSame(
            gmdate('H:i:s', (int) round($late->reg_late * 3600)),
            $out['payroll_items']['late']
        );
        $this->assertArrayHasKey('undertime', $out['payroll_items']);
        $this->assertArrayHasKey('overtime', $out['payroll_items']);
        $this->assertArrayHasKey('night_diff', $out['payroll_items']);
        $this->assertArrayHasKey('rendered_hours', $out['payroll_items']);

        if ((float) $late->reg_undertime > 0) {
            $this->assertSame(
                gmdate('H:i:s', (int) round($late->reg_undertime * 3600)),
                $out['payroll_items']['undertime']
            );
        } else {
            $this->assertSame('', $out['payroll_items']['undertime']);
        }
    }

    /**
     * @test
     * BUSINESS RULE — an approved paid leave publishes itself as a payroll item under the leave's own
     * short code (Sick Leave -> sl, Vacation Leave -> vl) carrying the day fraction taken, which is
     * what the payroll export bills against the leave credit.
     */
    public function an_approved_paid_leave_publishes_its_day_fraction_under_the_leave_code()
    {
        $codes = ['Sick Leave' => 'sl', 'Vacation Leave' => 'vl'];

        $leave = null;
        $subject = null;
        foreach (Leave::whereIn('type', array_keys($codes))
                     ->where('status', 'approved')->where('amount', '>', 0)
                     ->whereNotNull('dtr_id')
                     ->orderBy('id', 'desc')->limit(50)->get() as $candidate) {
            // one leave on the day, so leaves()->first() is unambiguously this row
            if (Leave::where('dtr_id', $candidate->dtr_id)->count() !== 1) {
                continue;
            }
            $dtr = Dtr::find($candidate->dtr_id);
            if ($dtr && $this->ownerIsRenderable($dtr->user_id)) {
                $leave = $candidate;
                $subject = $dtr;
                break;
            }
        }
        if (!$leave) $this->markTestSkipped('no single approved paid leave on a renderable employee-day');

        $this->freezeClockAt($this->winterInstant());
        // keep the real id (the leave hangs off it) but move the day out of the summary table's reach
        $subject->setRawAttributes(array_merge($subject->getAttributes(), ['date' => self::FIXTURE_DATE]));

        $out = (new DtrLogResource($subject))->toArray($this->request);

        $this->assertSame([$codes[$leave->type] => $leave->amount], $out['payroll_items']);
    }

    /** True when the resources can render this employee end to end (see ownerIn()). */
    private function ownerIsRenderable($userId)
    {
        $user = User::find($userId);
        if (!$user || !is_valid($user->first_name) || !is_valid($user->last_name)) {
            return false;
        }
        $zone = UtcTimelog::where('country_id', $user->country_id)->first();
        // an unknown tz string would make Carbon::setTimezone() throw inside the helper
        if (!$zone || !in_array($zone->timezone, timezone_identifiers_list(), true)) {
            return false;
        }
        if (is_valid($user->SubDepartmentID)
            && !EvoxSubDepartment::where('Id', $user->SubDepartmentID)->first()) {
            return false;
        }

        return true;
    }

    /**
     * @test
     * BUSINESS RULE — the two resources publish holiday TYPE differently on purpose: the log report
     * upper-cases it (LH / SH, the payroll column headings) while the day card keeps the stored
     * lower-case code the front-end switches on. A change to either breaks one of the two screens.
     */
    public function the_log_report_upper_cases_holiday_types_while_the_day_card_keeps_them_as_stored()
    {
        $subject = null;
        foreach (DB::table('dtr_holidays')->orderBy('dtr_id', 'desc')->limit(50)->get() as $link) {
            $dtr = Dtr::find($link->dtr_id);
            if ($dtr && $this->ownerIsRenderable($dtr->user_id)) {
                $subject = $dtr;
                break;
            }
        }
        if (!$subject) $this->markTestSkipped('no dtr_holidays row bound to a renderable employee-day');

        $this->freezeClockAt($this->winterInstant());
        $subject->setRawAttributes(array_merge($subject->getAttributes(), ['date' => self::FIXTURE_DATE]));

        $holidays = $subject->holidays()->get();
        $this->assertGreaterThan(0, $holidays->count(), 'probe returned a dtr with no holiday attached');

        $log  = (new DtrLogResource($subject))->toArray($this->request);
        $card = (new DtrResource($subject))->toArray($this->request);

        foreach ($holidays as $holiday) {
            $this->assertSame($holiday->name, $log['holidays'][$holiday->id]['name']);
            $this->assertSame(strtoupper($holiday->type), $log['holidays'][$holiday->id]['type']);
            $this->assertSame($holiday->type, $card['holidays'][$holiday->id]['type']);
        }
    }

    // =================================================================================================
    //  DtrResource — attendance status, both arms of every branch
    // =================================================================================================

    /** @test BUSINESS RULE — a scheduled day the employee never logged into is ABSENT. */
    public function a_scheduled_day_with_no_punch_at_all_is_absent()
    {
        list($owner) = $this->anyOwnerWithZone();
        if (!$owner) $this->markTestSkipped('no fully-named active employee in a utc_timelog country');

        $start = $this->winterInstant();
        $this->freezeClockAt($start + 4 * 3600);

        $out = (new DtrResource($this->memoryDtr($owner, [
            'start_datetime' => $start,
            'end_datetime'   => $start + 9 * 3600,
        ])))->toArray($this->request);

        $this->assertSame('Absent', $out['attendance_status']['name']);
        $this->assertSame('absent', $out['attendance_status']['slug']);
    }

    /** @test BUSINESS RULE — a rest day outranks absence: no schedule is owed, so nothing is missed. */
    public function a_rest_day_is_reported_as_a_rest_day_and_never_as_absent()
    {
        list($owner) = $this->anyOwnerWithZone();
        if (!$owner) $this->markTestSkipped('no fully-named active employee in a utc_timelog country');

        $start = $this->winterInstant();
        $this->freezeClockAt($start + 4 * 3600);

        $out = (new DtrResource($this->memoryDtr($owner, [
            'start_datetime' => $start,
            'end_datetime'   => $start + 9 * 3600,
            'is_rest_day'    => 1,
        ])))->toArray($this->request);

        $this->assertSame('Rest Day', $out['attendance_status']['name']);
        $this->assertSame('rest_day', $out['attendance_status']['slug']);
    }

    /** @test BUSINESS RULE — a day with both punches is PRESENT. */
    public function a_day_with_both_punches_is_reported_as_present()
    {
        list($owner) = $this->anyOwnerWithZone();
        if (!$owner) $this->markTestSkipped('no fully-named active employee in a utc_timelog country');

        $start = $this->winterInstant();
        $this->freezeClockAt($start + 4 * 3600);

        $out = (new DtrResource($this->memoryDtr($owner, [
            'start_datetime' => $start,
            'end_datetime'   => $start + 9 * 3600,
            'time_in'        => $start,
            'time_out'       => $start + 9 * 3600,
        ])))->toArray($this->request);

        $this->assertSame('Present', $out['attendance_status']['name']);
        $this->assertSame('present', $out['attendance_status']['slug']);
    }

    /**
     * @test
     * BUSINESS RULE — a day with neither a schedule nor a punch has NO status. It is not absent (the
     * employee owed nothing) and not present; the card renders it blank.
     */
    public function an_unscheduled_day_with_no_punch_carries_no_status_at_all()
    {
        list($owner) = $this->anyOwnerWithZone();
        if (!$owner) $this->markTestSkipped('no fully-named active employee in a utc_timelog country');
        $this->freezeClockAt($this->winterInstant());

        $out = (new DtrResource($this->memoryDtr($owner)))->toArray($this->request);

        $this->assertSame('', $out['attendance_status']['name']);
        $this->assertSame('', $out['attendance_status']['slug']);
    }

    // =================================================================================================
    //  DtrResource — the Carbon::now() gates that drive the punch buttons
    // =================================================================================================

    /**
     * @test
     * BUSINESS RULE — with_in_time is what enables the Time In / Time Out buttons: from two hours
     * before the shift starts until three hours after it ends. Inside that window it is true.
     */
    public function the_punch_window_is_open_from_two_hours_before_the_shift_until_three_hours_after()
    {
        list($owner) = $this->anyOwnerWithZone();
        if (!$owner) $this->markTestSkipped('no fully-named active employee in a utc_timelog country');

        $start = $this->winterInstant();
        $end   = $start + 9 * 3600;
        $dtr   = $this->memoryDtr($owner, ['start_datetime' => $start, 'end_datetime' => $end]);

        $this->freezeClockAt($start - 7199);                   // one second inside the early edge
        $early = (new DtrResource($dtr))->toArray($this->request);
        $this->assertTrue($early['with_in_time']);
        $this->assertTrue($early['with_in_time_extended']);

        $this->freezeClockAt($end + 10799);                    // one second inside the late edge
        $late = (new DtrResource($dtr))->toArray($this->request);
        $this->assertTrue($late['with_in_time']);
    }

    /**
     * @test
     * BUSINESS RULE — the other arm: outside that window the buttons must be closed. Three hours
     * after the shift ends the ordinary window shuts, while the EXTENDED window (six hours) stays
     * open — that is the grace period the late-punch correction screen relies on, and the two flags
     * must not move together.
     */
    public function the_ordinary_punch_window_shuts_three_hours_after_the_shift_while_the_extended_one_stays_open()
    {
        list($owner) = $this->anyOwnerWithZone();
        if (!$owner) $this->markTestSkipped('no fully-named active employee in a utc_timelog country');

        $start = $this->winterInstant();
        $end   = $start + 9 * 3600;
        $dtr   = $this->memoryDtr($owner, ['start_datetime' => $start, 'end_datetime' => $end]);

        $this->freezeClockAt($end + 4 * 3600);                 // past +3h, inside +6h
        $grace = (new DtrResource($dtr))->toArray($this->request);
        $this->assertFalse($grace['with_in_time']);
        $this->assertTrue($grace['with_in_time_extended']);

        $this->freezeClockAt($end + 7 * 3600);                 // past both
        $closed = (new DtrResource($dtr))->toArray($this->request);
        $this->assertFalse($closed['with_in_time']);
        $this->assertFalse($closed['with_in_time_extended']);

        $this->freezeClockAt($start - 3 * 3600);               // before the early edge
        $tooEarly = (new DtrResource($dtr))->toArray($this->request);
        $this->assertFalse($tooEarly['with_in_time']);
        $this->assertFalse($tooEarly['with_in_time_extended']);
    }

    /**
     * @test
     * BUSINESS RULE — when the shift has a flexible end, the window is measured from the FLEXIBLE
     * end, not the fixed one. An employee on a flexible schedule must still be able to punch out
     * three hours after their flexible end.
     */
    public function a_flexible_shift_measures_the_punch_window_from_its_flexible_end()
    {
        list($owner) = $this->anyOwnerWithZone();
        if (!$owner) $this->markTestSkipped('no fully-named active employee in a utc_timelog country');

        $start     = $this->winterInstant();
        $end       = $start + 9 * 3600;
        $flexyEnd  = $end + 4 * 3600;
        $moment    = $end + 3 * 3600 + 60;                     // past end+3h, well inside flexyEnd+3h

        $this->freezeClockAt($moment);

        $fixed = (new DtrResource($this->memoryDtr($owner, [
            'start_datetime' => $start, 'end_datetime' => $end,
        ])))->toArray($this->request);
        $this->assertFalse($fixed['with_in_time']);

        $flexible = (new DtrResource($this->memoryDtr($owner, [
            'start_datetime'       => $start,
            'end_datetime'         => $end,
            'start_flexy_datetime' => $start + 3600,
            'end_flexy_datetime'   => $flexyEnd,
        ])))->toArray($this->request);
        $this->assertTrue($flexible['with_in_time']);
    }

    /**
     * @test
     * BUSINESS RULE — before_time_in_half is the half-shift alarm: while an employee is clocked in
     * without having clocked out, it stays true until three and a half hours after their time in,
     * and the card publishes that deadline as an absolute timestamp.
     */
    public function an_open_punch_stays_inside_its_half_shift_for_three_and_a_half_hours()
    {
        list($owner) = $this->anyOwnerWithZone();
        if (!$owner) $this->markTestSkipped('no fully-named active employee in a utc_timelog country');

        $start  = $this->winterInstant();
        $timeIn = $start + 300;
        $dtr    = $this->memoryDtr($owner, [
            'start_datetime' => $start,
            'end_datetime'   => $start + 9 * 3600,
            'time_in'        => $timeIn,
        ]);

        $this->freezeClockAt($timeIn + 12599);                 // one second short of the deadline
        $inside = (new DtrResource($dtr))->toArray($this->request);
        $this->assertTrue($inside['before_time_in_half']);
        $this->assertSame($timeIn + 12600, $inside['user_half_timestamp']);

        $this->freezeClockAt($timeIn + 12601);                 // one second past it
        $after = (new DtrResource($dtr))->toArray($this->request);
        $this->assertFalse($after['before_time_in_half']);
        $this->assertSame($timeIn + 12600, $after['user_half_timestamp']);
    }

    /**
     * @test
     * BUSINESS RULE — the alarm only applies to an OPEN punch. Once the employee has clocked out, or
     * on a rest day, there is no half-shift deadline at all and the card publishes zero.
     */
    public function a_closed_punch_and_a_rest_day_carry_no_half_shift_deadline()
    {
        list($owner) = $this->anyOwnerWithZone();
        if (!$owner) $this->markTestSkipped('no fully-named active employee in a utc_timelog country');

        $start  = $this->winterInstant();
        $timeIn = $start + 300;
        $this->freezeClockAt($timeIn + 600);                   // well inside the half-shift window

        $closed = (new DtrResource($this->memoryDtr($owner, [
            'start_datetime' => $start,
            'end_datetime'   => $start + 9 * 3600,
            'time_in'        => $timeIn,
            'time_out'       => $timeIn + 3600,
        ])))->toArray($this->request);
        $this->assertFalse($closed['before_time_in_half']);
        $this->assertSame(0, $closed['user_half_timestamp']);

        $restDay = (new DtrResource($this->memoryDtr($owner, [
            'start_datetime' => $start,
            'end_datetime'   => $start + 9 * 3600,
            'time_in'        => $timeIn,
            'is_rest_day'    => 1,
        ])))->toArray($this->request);
        $this->assertFalse($restDay['before_time_in_half']);
        $this->assertSame(0, $restDay['user_half_timestamp']);
        // a rest day skips the whole window block, so neither punch flag can be true either
        $this->assertFalse($restDay['with_in_time']);
        $this->assertFalse($restDay['with_in_time_extended']);
    }

    // =================================================================================================
    //  DtrResource — payload shape
    // =================================================================================================

    /**
     * @test
     * FINDING RES-DTR-RAWTIME-STRAY-1 (characterisation).
     *
     * The raw_time block is written `'start_datetime' => $this->start_datetime , true ,` — each stray
     * `true` is a fourth array ELEMENT, not part of the preceding pair, so the block ships two
     * unnamed booleans at keys 0 and 1 in every DTR payload the app serves. Assert what it emits
     * today; when the strays are removed this fails and becomes the two-key shape assertion.
     */
    public function the_raw_time_block_ships_two_unnamed_booleans_FINDING_RES_DTR_RAWTIME_STRAY_1()
    {
        list($owner) = $this->anyOwnerWithZone();
        if (!$owner) $this->markTestSkipped('no fully-named active employee in a utc_timelog country');

        $start = $this->winterInstant();
        $this->freezeClockAt($start);

        $out = (new DtrResource($this->memoryDtr($owner, [
            'start_datetime' => $start,
            'end_datetime'   => $start + 9 * 3600,
        ])))->toArray($this->request);

        $this->assertSame([
            'start_datetime' => $start,
            0                => true,
            'end_datetime'   => $start + 9 * 3600,
            1                => true,
        ], $out['raw_time']);
    }

    /**
     * @test
     * BUSINESS RULE — a day with nothing attached still answers with every collection key present and
     * empty. The card iterates policies/holidays/leaves/requests unconditionally, so a missing key
     * would blank the whole day rather than render an empty day.
     */
    public function an_empty_day_still_answers_with_every_collection_present_and_empty()
    {
        list($owner) = $this->anyOwnerWithZone();
        if (!$owner) $this->markTestSkipped('no fully-named active employee in a utc_timelog country');
        $this->freezeClockAt($this->winterInstant());

        $out = (new DtrResource($this->memoryDtr($owner)))->toArray($this->request);

        $this->assertSame([], $out['payroll_items']);
        $this->assertSame([], $out['policies']);
        $this->assertSame([], $out['holidays']);
        $this->assertSame([], $out['leaves']);
        $this->assertSame([], $out['requests']);
        $this->assertSame('00:00', $out['break_time']);        // no break taken renders as 00:00 here
        $this->assertSame(self::FIXTURE_DATE, $out['date']);
        $this->assertSame($owner->id, $out['user_id']);
        $this->assertSame('default', $out['source_type_tagging']);
    }

    /**
     * @test
     * BUSINESS RULE — the null guard: a DTR the query could not resolve serialises as null, so a gap
     * in a date range renders as a missing day instead of taking the whole month down.
     */
    public function an_unresolved_day_serialises_as_null_in_both_resources()
    {
        $this->assertNull((new DtrResource(null))->toArray($this->request));
        $this->assertNull((new DtrLogResource(null))->toArray($this->request));
    }
}
