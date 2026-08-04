<?php

namespace Tests\Feature\BranchTests\Unit\Helpers;

use Tests\TestCase;

/**
 * WAVE-2 COVERAGE (2026-07-27). Pure unit tests for app/Helpers/sql_helper.php (0% before this).
 * Every function is a pure string-builder or Carbon date walker — no DB, no HTTP.
 *
 * // FINDING SQL-HELPER-1: the guard on line 21 checks function_exists('get_seven_succeeding_days')
 *    but DEFINES get_succeeding_days(). If this file were ever loaded twice, the guard passes again
 *    (get_seven_succeeding_days is never defined) and PHP fatals on redeclare of get_succeeding_days.
 *    Composer's files autoload loads it once, so it is latent — flag for the upgrade cleanup.
 * // FINDING SQL-HELPER-2: check_column_exist and get_succeeding_days_basic are each defined TWICE
 *    in the same file (lines 4/101 and 48/74) — dead duplicate blocks, guard-protected.
 */
class SqlHelperTest extends TestCase
{
    public function test_check_column_exist_builds_rest_day_guarded_if_expression()
    {
        $sql = check_column_exist('t.time_in', 't.time_out');

        $this->assertSame(
            "IF( t.time_in is not null and LOCATE(LOWER(SUBSTRING(DAYNAME(table1.date),1, 3)), sched.rest_days )=0, t.time_out , null )",
            $sql
        );
    }

    public function test_check_column_exist_accepts_custom_rest_day_column()
    {
        $sql = check_column_exist('a', 'b', 'x.rest');

        $this->assertStringContainsString('x.rest', $sql);
        $this->assertStringNotContainsString('sched.rest_days', $sql);
    }

    public function test_get_succeeding_days_returns_quoted_inclusive_range()
    {
        $days = get_succeeding_days('2026-01-01', 2);

        // inclusive of both endpoints: 3 days
        $this->assertSame(["'2026-01-01'", "'2026-01-02'", "'2026-01-03'"], $days);
    }

    public function test_get_succeeding_days_zero_days_returns_single_quoted_date()
    {
        $this->assertSame(["'2026-03-15'"], get_succeeding_days('2026-03-15', 0));
    }

    public function test_get_succeeding_days_basic_returns_unquoted_dates_and_crosses_month_end()
    {
        $days = get_succeeding_days_basic('2026-01-30', 3);

        $this->assertSame(['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02'], $days);
    }

    public function test_check_column_end_datetime_wraps_end_past_midnight()
    {
        $sql = check_column_end_datetime('s.start', 's.end');

        $this->assertSame('IF( s.start > s.end , s.end  + (3600*24) , s.end ) ', $sql);
    }

    public function test_check_column_start_flexy_time_wraps_flexy_start()
    {
        $sql = check_column_start_flexy_time('s.start', 's.end', 's.flexy_start');

        $this->assertSame(
            'IF( s.start > s.flexy_start OR s.end > s.flexy_start, s.flexy_start  + (3600*24) , s.flexy_start ) ',
            $sql
        );
    }

    public function test_check_column_end_flexy_time_wraps_flexy_end_on_any_later_column()
    {
        $sql = check_column_end_flexy_time('s.start', 's.flexy_start', 's.end', 's.flexy_end');

        $this->assertSame(
            'IF( s.start > s.flexy_end  OR s.flexy_start > s.flexy_end  OR s.end > s.flexy_end, s.flexy_end  + (3600*24) , s.flexy_end ) ',
            $sql
        );
    }

    public function test_check_if_restday_builds_locate_flag_expression()
    {
        $sql = check_if_restday('table1.date', 'sched.rest_days');

        $this->assertSame(
            'IF(LOCATE(LOWER(SUBSTRING(DAYNAME(table1.date),1, 3)), sched.rest_days)>0,1,0)',
            $sql
        );
    }
}
