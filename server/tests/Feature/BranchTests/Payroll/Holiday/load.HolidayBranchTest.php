<?php
/**
 * SOURCE FILES UNDER TEST
 *   app/Modules/Payroll/Models/Holiday.php              :: getProperDate()   (17.65% before this file)
 *   app/Modules/Payroll/Repositories/HolidayRepository.php :: get_holidays() (72.73% before this file)
 *
 * MENU PATH
 *   Payroll -> Holidays  (the holiday calendar the DTR engine reads when it decides whether a day is
 *   paid at holiday rates). getProperDate() is called from the payroll computation engine; get_holidays()
 *   is the repository read behind the holiday list and the DTR holiday binding.
 *
 * WHY A USER CARES
 *   A "pre-defined" holiday (New Year, Christmas, Labour Day...) is stored ONCE with an arbitrary year
 *   in `holidays.date`; only its month and day are meaningful. getProperDate() stamps the correct year
 *   onto it for the payroll period being computed. When a payroll cutoff straddles New Year — say
 *   27 Oct 2025 to 12 Mar 2026 — Christmas must be stamped 2025 and New Year's Day must be stamped 2026.
 *   Get that wrong and an employee is either paid holiday rates on an ordinary day, or paid ordinary
 *   rates on a holiday. The year-transition arms (lines 59-70) were the never-executed ones.
 *
 * ARMS COVERED — both sides of every conditional
 *   getProperDate()
 *     - guard FALSE, not pre-defined            -> the stored date is returned untouched
 *     - guard FALSE, pre-defined but no basis   -> the stored date is returned untouched
 *     - guard TRUE, basis start year == end year        -> line 56  (single-year cutoff)
 *     - guard TRUE, start year < end year, month in the START half  -> line 64
 *     - guard TRUE, start year < end year, month in the END half    -> line 69
 *     - guard TRUE, start year < end year, month in NEITHER half    -> both inner arms fall through
 *   get_holidays()
 *     - success arm: the documented predicate holds for every row returned
 *     - catch arm (lines 39-41): the raw SQL is made invalid, proving the repository LOGS AND RETHROWS
 *       rather than swallowing a database fault and handing payroll an empty holiday list
 *
 * SAFETY
 *   getProperDate() is driven on UNSAVED in-memory Holiday models — no database at all.
 *   get_holidays() is read-only and its date window is pinned to 1990, so the non-pre-defined arm of
 *   the WHERE matches nothing and the result set stays small. Nothing is written; no stored procedure
 *   is reachable from either method.
 *
 * FINDINGS
 *   HOL-RETURNTYPE-1 (characterized below, not fixed): getProperDate() returns THREE different types
 *     depending on which arm runs — a Carbon (guard false, and the "neither half" arm), or a plain
 *     string 'Y-m-d' (the three re-stamping arms). Callers cannot treat the result uniformly; anything
 *     doing ->format() on it breaks on the string arms and anything doing string concatenation breaks
 *     on the Carbon arms. Asserted as today's behaviour so a future normalisation fails here first.
 */

namespace Tests\Feature\BranchTests\Payroll\Holiday;

use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Config;
use Mockery;
use Tests\TestCase;
use App\Modules\Payroll\Models\Holiday;
use App\Modules\Payroll\Repositories\HolidayRepository;

class HolidayLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /**
     * An UNSAVED holiday row. `date` is declared in $dates and `is_predefined` is cast to boolean,
     * so both come back through the model's own casting on read — exactly as production reads them.
     */
    private function holiday(string $date, bool $predefined): Holiday
    {
        $h                = new Holiday();
        $h->name          = 'branch-test holiday';
        $h->date          = $date;
        $h->is_predefined = $predefined;

        return $h;
    }

    // =====================================================================  getProperDate()

    /**
     * A one-off (not pre-defined) holiday carries a real calendar date already. Re-stamping it with
     * the cutoff's year would move it, so the guard must leave it alone even when a basis range is
     * supplied.
     *
     * @test
     */
    public function a_one_off_holiday_keeps_its_own_date_even_when_a_cutoff_range_is_supplied()
    {
        $result = $this->holiday('2019-12-25', false)->getProperDate('2025-10-27', '2026-03-12');

        $this->assertInstanceOf(Carbon::class, $result, 'FINDING HOL-RETURNTYPE-1: guard-false arm returns Carbon');
        $this->assertSame(
            '2019-12-25',
            $result->format('Y-m-d'),
            'a one-off holiday must never be re-stamped with the payroll period year'
        );
    }

    /**
     * The other half of the same guard: pre-defined, but called with no basis range at all (the
     * default arguments). There is no year to stamp on, so the stored date must survive.
     *
     * @test
     */
    public function a_predefined_holiday_called_without_a_cutoff_range_keeps_its_stored_date()
    {
        $result = $this->holiday('2019-12-25', true)->getProperDate();

        $this->assertInstanceOf(Carbon::class, $result);
        $this->assertSame('2019-12-25', $result->format('Y-m-d'));
    }

    /**
     * Ordinary case: the payroll period sits inside one calendar year, so every pre-defined holiday
     * is stamped with that year and keeps its own month and day.
     *
     * @test
     */
    public function a_cutoff_inside_one_year_stamps_that_year_onto_the_predefined_holiday()
    {
        $result = $this->holiday('2019-12-25', true)->getProperDate('2025-03-01', '2025-09-30');

        $this->assertSame(
            '2025-12-25',
            $result,
            'Christmas must be stamped with the single year the payroll period lies in'
        );
        $this->assertInternalType('string', $result, 'FINDING HOL-RETURNTYPE-1: re-stamping arms return a string');
    }

    /**
     * Year transition, holiday in the OPENING half. The period runs 27 Oct 2025 -> 12 Mar 2026;
     * December belongs to the year the period STARTED in, so Christmas is 25 Dec 2025.
     *
     * @test
     */
    public function a_cutoff_that_straddles_new_year_stamps_the_start_year_on_a_december_holiday()
    {
        $result = $this->holiday('2019-12-25', true)->getProperDate('2025-10-27', '2026-03-12');

        $this->assertSame('2025-12-25', $result, 'Christmas inside a straddling period belongs to the start year');
    }

    /**
     * The same period, holiday in the CLOSING half. January belongs to the year the period ENDS in,
     * so New Year's Day is 1 Jan 2026 — not 1 Jan 2025, which is what the start-year arm would give.
     *
     * @test
     */
    public function a_cutoff_that_straddles_new_year_stamps_the_end_year_on_a_january_holiday()
    {
        $result = $this->holiday('2019-01-01', true)->getProperDate('2025-10-27', '2026-03-12');

        $this->assertSame('2026-01-01', $result, "New Year's Day inside a straddling period belongs to the end year");
    }

    /**
     * The arm nobody wrote a rule for: a straddling period 27 Oct -> 12 Mar, and a holiday in June.
     * June is in neither half, so BOTH inner conditions are false and no year is stamped at all —
     * the method hands back the raw stored date, still carrying its meaningless 2019.
     *
     * A June holiday cannot fall inside an Oct->Mar period, so this is defensive rather than broken;
     * pinned here so the fall-through stays deliberate.
     *
     * @test
     */
    public function a_predefined_holiday_outside_both_halves_of_a_straddling_cutoff_is_left_unstamped()
    {
        $result = $this->holiday('2019-06-12', true)->getProperDate('2025-10-27', '2026-03-12');

        $this->assertInstanceOf(Carbon::class, $result, 'FINDING HOL-RETURNTYPE-1: the fall-through arm returns Carbon');
        $this->assertSame(
            '2019-06-12',
            $result->format('Y-m-d'),
            'a month in neither half of the period gets no year stamped — the stored year survives'
        );
    }

    /**
     * The two halves must not overlap: for the same straddling period, a December holiday and a
     * January holiday must land in DIFFERENT years. This is the rule the payroll engine depends on
     * and the one that the never-executed lines 59-70 implement.
     *
     * @test
     */
    public function the_two_halves_of_a_straddling_cutoff_resolve_to_different_years()
    {
        $december = $this->holiday('2019-12-25', true)->getProperDate('2025-10-27', '2026-03-12');
        $january  = $this->holiday('2019-01-01', true)->getProperDate('2025-10-27', '2026-03-12');

        $this->assertSame('2025', substr($december, 0, 4));
        $this->assertSame('2026', substr($january, 0, 4));
        $this->assertNotSame(
            substr($december, 0, 4),
            substr($january, 0, 4),
            'a period that crosses New Year must place its December and January holidays in different years'
        );
    }

    // =====================================================================  get_holidays()

    /**
     * Success arm. The window is pinned to 1990 so the non-pre-defined half of the WHERE matches
     * nothing; whatever comes back must therefore satisfy the documented predicate — either it is a
     * pre-defined holiday inside the MONTH_SCOPE day window, or it is a dated holiday inside the
     * requested range. Asserting the predicate rather than a row count keeps the test independent of
     * how many holidays the dump happens to carry.
     *
     * @test
     */
    public function every_holiday_returned_satisfies_the_predefined_or_in_range_rule()
    {
        $from = Carbon::parse('1990-01-01');
        $to   = Carbon::parse('1990-01-31');

        $collection = (new HolidayRepository())->get_holidays($from, $to);

        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Collection::class, $collection);

        foreach ($collection as $holiday) {
            $date = Carbon::parse($holiday->date)->format('Y-m-d');

            $this->assertTrue(
                (bool) $holiday->is_predefined || ($date >= '1990-01-01' && $date <= '1990-01-31'),
                'a holiday outside the requested window must be pre-defined to be returned; got ' . $date
            );
        }
    }

    /**
     * Catch arm (HolidayRepository.php:39-41). MONTH_SCOPE is interpolated straight into raw SQL, so
     * poisoning it makes the statement invalid. The rule being proved is that a database fault
     * SURFACES: the repository logs it and rethrows, rather than returning an empty collection that
     * payroll would silently read as "no holidays this period" and pay everyone ordinary rates.
     *
     * @test
     */
    public function a_database_fault_while_reading_holidays_is_rethrown_rather_than_swallowed()
    {
        Config::set('constants.MONTH_SCOPE.day_from', '1 AND (SELECT 1 FROM evox_no_such_table_branch_test)');

        $this->expectException(QueryException::class);

        (new HolidayRepository())->get_holidays(Carbon::parse('1990-01-01'), Carbon::parse('1990-01-31'));
    }
}
