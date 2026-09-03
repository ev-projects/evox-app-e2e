<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Payroll/Repositories/DtrRepository.php  ::bind_holidays_to_dtr
 *
 * MENU PATH
 *   Admin -> Masters -> Holidays (save a holiday)  ->  the nightly holiday binding
 *   Cron -> Bind Holidays
 *
 * COVERAGE BEFORE THIS FILE
 *   bind_holidays_to_dtr  67.21% of lines
 *
 * WHAT THESE RULES MEAN
 *   A holiday row is a calendar fact; binding is what makes it a fact about a particular employee's
 *   day, and therefore about their pay. Three rules decide who gets it: a holiday with a country
 *   only reaches employees of that country, a holiday with no country reaches everyone, and a
 *   country-specific holiday displaces a global one already on the day (the local holiday is the
 *   more specific truth). Re-running the binder must be a no-op.
 *
 * SCOPE NOTE
 *   All dates are on the 1990 anchor, so the date-scoped queries in this method — which are not
 *   scoped by employee at all — can only ever see the rows these tests create.
 *
 * FINDINGS
 *   none
 */

namespace Tests\Feature\BranchTests\Payroll\DTR;

use Tests\TestCase;
use Tests\Feature\BranchTests\Support\DtrFixtureTrait;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\Payroll\Models\Holiday;
use App\Modules\Payroll\Repositories\DtrRepository;

class DtrHolidayBindingBranchTest extends TestCase
{
    use DatabaseTransactions, DtrFixtureTrait;

    /** @var DtrRepository */
    private $repo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = $this->app->make(DtrRepository::class);

        // bind_holidays_to_dtr() is queried across EVERY employee's dtrs rows in the date range, not
        // just the fixture user's (see SCOPE NOTE above), so DtrFixtureTrait::clearFixtureWindows()
        // — which only clears the fixture user's own rows — is not enough here: any other user's
        // row landing in one of these windows (the shared database already carries a large volume of
        // dtrs rows on unrelated historical dates that have nothing to do with this suite) would be
        // counted alongside the ones each test creates and break the exact-count assertions below.
        \App\Modules\Payroll\Models\Dtr::withTrashed()
            ->where(function ($q) {
                $q->whereBetween('date', [$this->fixtureDate(0), $this->fixtureDate(21)])
                  ->orWhereBetween('date', ['1990-12-30', '1991-01-02']);
            })
            ->forceDelete();
    }

    private function holiday(array $overrides = [])
    {
        return Holiday::create(array_merge([
            'name'          => 'fixture holiday',
            'date'          => $this->fixtureDate(0),
            'type'          => get_constant('DTR_TYPE.holiday.legal'),
            'is_predefined' => 0,
            'country_id'    => null,
        ], $overrides));
    }

    /** A country id that is NOT the fixture employee's, or null when the database has only one. */
    private function otherCountryId()
    {
        return DB::table('utc_timelog')
            ->whereNotNull('country_id')
            ->where('country_id', '!=', $this->requireFixtureUser()->country_id)
            ->value('country_id');
    }

    private function bind()
    {
        return $this->repo->bind_holidays_to_dtr($this->fixtureDate(0), $this->fixtureDate(1));
    }

    // =======================================================================================

    /** @test */
    public function a_holiday_declared_for_the_employees_country_is_bound_to_that_days_record()
    {
        $dtr = $this->makeDtr(0);
        $holiday = $this->holiday(['country_id' => $this->requireFixtureUser()->country_id]);

        $result = $this->bind();

        $this->assertCount(1, $result);
        $this->assertSame($dtr->id, $result->first()->id);
        $this->assertEquals([$holiday->id], $dtr->holidays()->pluck('holidays.id')->all());
    }

    /** @test */
    public function a_holiday_with_no_country_is_bound_to_every_employees_day()
    {
        $dtr = $this->makeDtr(0);
        $holiday = $this->holiday(['country_id' => null]);

        $result = $this->bind();

        $this->assertCount(1, $result);
        $this->assertEquals([$holiday->id], $dtr->holidays()->pluck('holidays.id')->all());
    }

    /** @test */
    public function a_holiday_declared_for_another_country_is_not_bound_to_this_employees_day()
    {
        $other = $this->otherCountryId();
        if (!$other) {
            $this->markTestSkipped('this database has only one country in utc_timelog, so a '
                . 'foreign-country holiday cannot be constructed');
        }
        $dtr = $this->makeDtr(0);
        $this->holiday(['country_id' => $other]);

        $result = $this->bind();

        $this->assertCount(0, $result);
        $this->assertSame(0, $dtr->holidays()->count());
    }

    // Re-running the binder must not stack duplicates: the second pass finds the holiday already
    // present and skips the day entirely.
    /** @test */
    public function rebinding_the_same_holiday_leaves_the_day_untouched()
    {
        $dtr = $this->makeDtr(0);
        $this->holiday(['country_id' => null]);

        $first  = $this->bind();
        $second = $this->bind();

        $this->assertCount(1, $first);
        $this->assertCount(0, $second, 'the binder bound the same holiday a second time');
        $this->assertSame(1, $dtr->holidays()->count());
    }

    // A country-specific holiday is the more specific truth, so it replaces a global one already
    // sitting on the day rather than being added alongside it.
    /** @test */
    public function a_country_specific_holiday_replaces_a_global_one_already_on_the_day()
    {
        $dtr = $this->makeDtr(0);
        $global = $this->holiday(['name' => 'global day', 'country_id' => null]);
        $dtr->holidays()->attach($global->id);

        $local = $this->holiday([
            'name'       => 'local day',
            'country_id' => $this->requireFixtureUser()->country_id,
            'type'       => get_constant('DTR_TYPE.holiday.special'),
        ]);

        $result = $this->bind();

        $this->assertCount(1, $result);
        $this->assertEquals([$local->id], $dtr->holidays()->pluck('holidays.id')->all());
        $this->assertNotContains($global->id, $dtr->holidays()->pluck('holidays.id')->all());
    }

    // A predefined holiday recurs every year: its stored year is ignored and its month and day are
    // projected onto the range being bound.
    /** @test */
    public function a_recurring_holiday_is_matched_by_month_and_day_whatever_year_it_was_stored_with()
    {
        $dtr = $this->makeDtr(0);
        $holiday = $this->holiday([
            'name'          => 'recurring day',
            'date'          => '1975-' . date('m-d', strtotime($this->fixtureDate(0))),
            'is_predefined' => 1,
            'country_id'    => null,
        ]);

        $result = $this->bind();

        $this->assertCount(1, $result);
        $this->assertEquals([$holiday->id], $dtr->holidays()->pluck('holidays.id')->all());
    }

    // A one-off holiday dated outside the range is not picked up at all.
    /** @test */
    public function a_one_off_holiday_outside_the_range_is_not_bound()
    {
        $dtr = $this->makeDtr(0);
        $this->holiday(['date' => $this->fixtureDate(20), 'country_id' => null]);

        $result = $this->bind();

        $this->assertCount(0, $result);
        $this->assertSame(0, $dtr->holidays()->count());
    }

    // Nothing to bind is not an error — the binder returns an empty collection.
    /** @test */
    public function binding_a_range_that_holds_no_holidays_returns_nothing_and_does_not_fail()
    {
        $dtr = $this->makeDtr(0);

        $result = $this->bind();

        $this->assertCount(0, $result);
        $this->assertSame(0, $dtr->holidays()->count());
    }

    // A range spanning a year boundary cannot be expressed as one month-day BETWEEN, so the binder
    // walks the range month by month. A recurring holiday on either side of New Year must be found
    // in a single call, each projected onto the correct year.
    /** @test */
    public function a_range_crossing_new_year_finds_recurring_holidays_on_both_sides_of_it()
    {
        $new_years_eve = $this->makeDtrOnDate('1990-12-31');
        $new_years_day = $this->makeDtrOnDate('1991-01-01');
        $eve = $this->holiday(['name' => 'eve', 'date' => '1975-12-31', 'is_predefined' => 1, 'country_id' => null]);
        $day = $this->holiday(['name' => 'day', 'date' => '1975-01-01', 'is_predefined' => 1, 'country_id' => null]);

        $result = $this->repo->bind_holidays_to_dtr('1990-12-30', '1991-01-02');

        $this->assertCount(2, $result);
        $this->assertEquals([$eve->id], $new_years_eve->holidays()->pluck('holidays.id')->all());
        $this->assertEquals([$day->id], $new_years_day->holidays()->pluck('holidays.id')->all());
    }
}
