<?php
/**
 * UNIT tests for app/Helpers/date_helper.php (LATEST code).
 *
 * These are PURE global helper functions loaded via composer files-autoload. They are tested by
 * calling the function directly. Tests\TestCase is extended only to boot the Laravel app so the
 * helpers + config (get_constant('TIMESTAMP.*')) + Carbon are autoloaded/available. NO DB access,
 * NO DatabaseTransactions needed (no function here writes to the DB).
 *
 * Determinism: setUp() pins date_default_timezone_set('UTC') so every date()/strtotime()-based
 * assertion is stable regardless of the host/app timezone. Round-trip assertions
 * (datetime_to_timestamp <-> timestamp_to_*) are timezone-independent by construction.
 *
 * SKIPPED arms (require a logged-in User with a country timezone offset -> Auth::user() branch):
 *   - time_to_seconds()/seconds_to_time()/seconds_to_time_POV() $with_offset=true path      // SKIPPED-AUTH
 *   - timestamp_to_datetime()/_small()/timestamp_to_time() Auth::user() offset + $owner path // SKIPPED-AUTH
 * With no authenticated user (default in these unit tests) Auth::user() is null, so the pure
 * date() fallback path runs and is what we assert.
 *
 * FINDING (get_month_date_range, single-month range): when start_date and end_date fall in the SAME
 * month, the if/elseif means the "clamp end to end_date" branch never runs, so end_date is IGNORED
 * and the range end stays end-of-month. Locked in test_get_month_date_range_single_month_edge().
 * FINDING (seconds_to_time complete format, > 1 day): the trailing-seconds branch mis-nests the /60,
 * producing malformed output like "25:01:1". Locked in test_seconds_to_time_over_day_complete().
 */

namespace Tests\Feature\BranchTests\Unit\Helpers;

use Tests\TestCase;
use Illuminate\Database\Eloquent\Collection;

class DateHelperTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        date_default_timezone_set('UTC');
    }

    // ---------------------------------------------------------------- generate_date_array

    public function test_generate_date_array_range()
    {
        $this->assertSame(
            ['2020-01-01', '2020-01-02', '2020-01-03'],
            generate_date_array('2020-01-01', '2020-01-03')
        );
    }

    public function test_generate_date_array_single_day()
    {
        $this->assertSame(['2020-01-01'], generate_date_array('2020-01-01', '2020-01-01'));
    }

    // ---------------------------------------------------------------- get_day_from_date

    public function test_get_day_from_date_known_weekday()
    {
        // 2020-01-01 was a Wednesday -> lowercased 3-letter day.
        $this->assertSame('wed', get_day_from_date('2020-01-01'));
        $this->assertSame('sun', get_day_from_date('2020-01-05'));
    }

    public function test_get_day_from_date_invalid_returns_null()
    {
        $this->assertNull(get_day_from_date(null));
        $this->assertNull(get_day_from_date(''));
    }

    // ---------------------------------------------------------------- time_to_seconds

    public function test_time_to_seconds_conversions()
    {
        $this->assertSame(0, time_to_seconds('00:00:00'));
        $this->assertSame(28800, time_to_seconds('08:00:00'));
        $this->assertSame(3661, time_to_seconds('01:01:01'));
    }

    public function test_time_to_seconds_invalid_returns_null()
    {
        $this->assertNull(time_to_seconds(''));
        $this->assertNull(time_to_seconds(null));
    }

    // ---------------------------------------------------------------- seconds_to_time

    public function test_seconds_to_time_within_day()
    {
        $this->assertSame('00:00', seconds_to_time(0));
        $this->assertSame('08:00', seconds_to_time(28800));
        $this->assertSame('12:30', seconds_to_time(45000));
    }

    public function test_seconds_to_time_day_boundary()
    {
        // 86400 == TIMESTAMP.day still uses the date() path -> wraps to next midnight.
        $this->assertSame('00:00', seconds_to_time(86400));
    }

    public function test_seconds_to_time_over_day()
    {
        // > 86400 -> sprintf hours:minutes path (hours can exceed 24).
        $this->assertSame('25:00', seconds_to_time(90000));
    }

    public function test_seconds_to_time_complete_format_within_day()
    {
        $this->assertSame('01:01:01', seconds_to_time(3661, true));
    }

    public function test_seconds_to_time_over_day_complete()
    {
        // FINDING: malformed trailing-seconds formatting for > 1 day complete format.
        $this->assertSame('25:01:1', seconds_to_time(90061, true));
    }

    // ---------------------------------------------------------------- seconds_to_time_POV

    public function test_seconds_to_time_pov_default_path()
    {
        // $user = null, $with_offset = false -> same as seconds_to_time default output.
        $this->assertSame('08:00', seconds_to_time_POV(28800, false, false, null));
        $this->assertSame('08:00:00', seconds_to_time_POV(28800, true, false, null));
    }

    // ---------------------------------------------------------------- seconds_to_hour

    public function test_seconds_to_hour()
    {
        $this->assertEquals(1, seconds_to_hour(3600));
        $this->assertEquals(8, seconds_to_hour(28800));
        $this->assertEquals(1.5, seconds_to_hour(5400));
        $this->assertEquals(0, seconds_to_hour(0));
    }

    // ---------------------------------------------------------------- datetime_to_timestamp

    public function test_datetime_to_timestamp_roundtrips_with_timestamp_to_datetime()
    {
        $ts = datetime_to_timestamp('2020-06-15 13:45:30');
        $this->assertInternalType('int', $ts);
        $this->assertSame('2020-06-15 13:45:30', timestamp_to_datetime($ts));
    }

    public function test_datetime_to_timestamp_invalid_returns_null()
    {
        $this->assertNull(datetime_to_timestamp(''));
        $this->assertNull(datetime_to_timestamp(null));
    }

    // ---------------------------------------------------------------- timestamp_to_* (guest / no-Auth path)

    public function test_timestamp_to_datetime()
    {
        $ts = mktime(13, 45, 30, 6, 15, 2020); // 2020-06-15 13:45:30 UTC
        $this->assertSame('2020-06-15 13:45:30', timestamp_to_datetime($ts));
    }

    public function test_timestamp_to_datetime_invalid_returns_null()
    {
        $this->assertNull(timestamp_to_datetime(null));
        $this->assertNull(timestamp_to_datetime(''));
    }

    public function test_timestamp_to_datetime_small()
    {
        $ts = mktime(13, 45, 30, 6, 15, 2020);
        $this->assertSame('06-15 13:45', timestamp_to_datetime_small($ts));
    }

    public function test_timestamp_to_datetime_old()
    {
        $ts = mktime(13, 45, 30, 6, 15, 2020);
        $this->assertSame('2020-06-15 13:45:30', timestamp_to_datetime_old($ts));
        $this->assertNull(timestamp_to_datetime_old(null));
    }

    public function test_timestamp_to_date()
    {
        $ts = mktime(13, 45, 30, 6, 15, 2020);
        $this->assertSame('2020-06-15', timestamp_to_date($ts));
        $this->assertNull(timestamp_to_date(null));
    }

    public function test_timestamp_to_date_default()
    {
        $ts = mktime(0, 0, 0, 12, 31, 2019);
        $this->assertSame('2019-12-31', timestamp_to_date_default($ts));
        $this->assertNull(timestamp_to_date_default(''));
    }

    public function test_timestamp_to_time()
    {
        $ts = mktime(13, 45, 30, 6, 15, 2020);
        $this->assertSame('13:45:30', timestamp_to_time($ts));
        $this->assertNull(timestamp_to_time(null));
    }

    // ---------------------------------------------------------------- add/subtract days & time

    public function test_add_days_to_timestamp_int()
    {
        // integer timestamp path: + 86400 * days.
        $this->assertSame(1000000 + 2 * 86400, add_days_to_timestamp(1000000, 2));
    }

    public function test_add_days_to_timestamp_string_date()
    {
        $base = strtotime('2020-01-01');
        $this->assertSame($base + 3 * 86400, add_days_to_timestamp('2020-01-01', 3));
    }

    public function test_subtract_days_from_timestamp()
    {
        $this->assertSame(1000000 - 2 * 86400, subtract_days_from_timestamp(1000000, 2));
    }

    public function test_add_time_to_timestamp_int_and_string()
    {
        // both int
        $this->assertSame(1000000 + 3600, add_time_to_timestamp(1000000, 3600));
        // int timestamp + time string -> time_to_seconds('01:00:00') = 3600
        $this->assertSame(1000000 + 3600, add_time_to_timestamp(1000000, '01:00:00'));
    }

    public function test_subtract_time_from_timestamp_int_and_string()
    {
        $this->assertSame(1000000 - 3600, subtract_time_from_timestamp(1000000, 3600));
        $this->assertSame(1000000 - 3600, subtract_time_from_timestamp(1000000, '01:00:00'));
    }

    // ---------------------------------------------------------------- get_month_date_range

    public function test_get_month_date_range_multi_month()
    {
        $range = get_month_date_range('2020-01-15', '2020-03-10');
        $this->assertInstanceOf(Collection::class, $range);
        $this->assertCount(3, $range);

        $jan = $range->get(0);
        $this->assertSame('2020', $jan->year);
        $this->assertSame('01', $jan->month);
        $this->assertSame('2020-01-15', $jan->start_date); // clamped to start_date
        $this->assertSame('2020-01-31', $jan->end_date);

        $feb = $range->get(1);
        $this->assertSame('2020-02-01', $feb->start_date);
        $this->assertSame('2020-02-29', $feb->end_date); // 2020 is a leap year

        $mar = $range->get(2);
        $this->assertSame('2020-03-01', $mar->start_date);
        $this->assertSame('2020-03-10', $mar->end_date); // clamped to end_date
    }

    public function test_get_month_date_range_single_month_edge()
    {
        // FINDING: same-month start/end -> end_date is ignored, range end stays end-of-month.
        $range = get_month_date_range('2020-05-10', '2020-05-20');
        $this->assertCount(1, $range);
        $this->assertSame('2020-05-10', $range->get(0)->start_date);
        $this->assertSame('2020-05-31', $range->get(0)->end_date);
    }

    // ---------------------------------------------------------------- date_to_text

    public function test_date_to_text_default_format()
    {
        $this->assertSame('January 15, 2020', date_to_text('2020-01-15'));
    }

    public function test_date_to_text_custom_format()
    {
        $this->assertSame('15/01/2020', date_to_text('2020-01-15', 'd/m/Y'));
    }

    // ---------------------------------------------------------------- string_offset_to_seconds

    public function test_string_offset_to_seconds_positive()
    {
        $this->assertSame(28800, string_offset_to_seconds('+08:00'));
        $this->assertSame(19800, string_offset_to_seconds('+05:30'));
    }

    public function test_string_offset_to_seconds_negative()
    {
        $this->assertSame(-18000, string_offset_to_seconds('-05:00'));
    }

    public function test_string_offset_to_seconds_zero()
    {
        $this->assertSame(0, string_offset_to_seconds('+00:00'));
    }

    public function test_string_offset_to_seconds_non_string_returns_zero()
    {
        $this->assertSame(0, string_offset_to_seconds(null));
        $this->assertSame(0, string_offset_to_seconds(0));
        $this->assertSame(0, string_offset_to_seconds(123));
    }

    // ---------------------------------------------------------------- apply_timezone

    public function test_apply_timezone_utc_is_identity()
    {
        $ts = mktime(13, 45, 30, 6, 15, 2020);
        // UTC offset "+00:00" -> 0 added -> plain date() of the timestamp.
        $this->assertSame(date('Y-m-d H:i:s', $ts), apply_timezone($ts, 'UTC'));
    }

    public function test_apply_timezone_fixed_offset()
    {
        $ts = mktime(0, 0, 0, 6, 15, 2020);
        // Asia/Manila is a fixed +08:00 zone (no DST) -> +28800 seconds.
        $this->assertSame(date('Y-m-d H:i:s', $ts + 28800), apply_timezone($ts, 'Asia/Manila'));
    }

    public function test_apply_timezone_invalid_timestamp_returns_null()
    {
        $this->assertNull(apply_timezone(null, 'UTC'));
    }
}
