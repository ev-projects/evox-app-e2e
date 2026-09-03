<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Payroll/Repositories/PayrollCutoffRepository.php
 *       ::get_payroll_cutoff   ::get_filter_for_dtr   ::all   ::update
 *
 * MENU PATH
 *   Admin -> Payroll -> Cutoffs                     (all, update)
 *   Payroll -> Daily Time Record (period selector)  (get_filter_for_dtr)
 *   Dashboard -> My DTR notifications               (get_payroll_cutoff, the "current period")
 *
 * COVERAGE BEFORE THIS FILE
 *   get_payroll_cutoff  58.33% of lines
 *   get_filter_for_dtr  50.00% of lines
 *   all                 50.00% of lines
 *   update              69.23% of lines
 *
 * WHAT THESE RULES MEAN
 *   A payroll cutoff is the period an employee's hours are totalled into. get_payroll_cutoff answers
 *   "which period is this date in", and its fallback matters: rather than returning nothing for a
 *   date past the last configured period, it hands back the most recent one, so the dashboard keeps
 *   working when payroll has not yet configured next year. get_filter_for_dtr builds the period
 *   dropdown, and it is built from a different source for India and Morocco than for everyone else.
 *
 * NOTE ON THE EXISTING SUITE
 *   Payroll/Cutoff/{load,submit,delete}.CutoffBranchTest.php already cover PayrollCutoffController
 *   with the repository mocked out. This file is the other half: the real repository, no mocks.
 *
 * FINDINGS
 *   none
 */

namespace Tests\Feature\BranchTests\Payroll\Cutoff;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\Payroll\Models\PayrollCutoff;
use App\Modules\Payroll\Repositories\PayrollCutoffRepository;
use App\Modules\User\Models\User;

class CutoffRepositoryBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var PayrollCutoffRepository */
    private $repo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = new PayrollCutoffRepository();
    }

    /**
     * Cutoffs are anchored on 1990 so the "which period contains this date" query can only ever
     * match the rows a test just wrote, and the "latest period" fallback is never satisfied by one
     * of them (every live cutoff ends far later than 1990).
     */
    private function cutoff($name, $start, $end)
    {
        return PayrollCutoff::create(['name' => $name, 'start_date' => $start, 'end_date' => $end]);
    }

    private function employee()
    {
        // whereNotNull('LevelId') + whereHas('level') guards against users whose level_type() crashes:
        // get_authenticated_user() calls isLevel() -> level_type() -> level()->first()->Name, which
        // throws if LevelId is null or has no matching EvoxLevels row (BUG-117 fix regression).
        $user = User::where('is_active', 1)
            ->whereNotNull('date_hired')
            ->whereNotNull('LevelId')
            ->whereHas('level')
            ->orderBy('id', 'desc')->first();
        if (!$user) {
            $this->markTestSkipped('no active employee with a hire date in this database');
        }
        $this->be($user);
        return $user;
    }

    // =======================================================================================
    // get_payroll_cutoff
    // =======================================================================================

    /** @test */
    public function a_date_inside_a_configured_period_returns_that_period()
    {
        $wanted = $this->cutoff('fixture first half', '1990-06-01', '1990-06-15');
        $this->cutoff('fixture second half', '1990-06-16', '1990-06-30');

        $result = $this->repo->get_payroll_cutoff('1990-06-10');

        $this->assertSame($wanted->id, $result->id);
        $this->assertSame('fixture first half', $result->name);
    }

    /** @test */
    public function the_first_and_last_day_of_a_period_both_count_as_inside_it()
    {
        $wanted = $this->cutoff('fixture first half', '1990-06-01', '1990-06-15');

        $this->assertSame($wanted->id, $this->repo->get_payroll_cutoff('1990-06-01')->id);
        $this->assertSame($wanted->id, $this->repo->get_payroll_cutoff('1990-06-15')->id);
    }

    // The fallback: a date no configured period covers gets the most recent period rather than
    // nothing, so the screens that depend on "the current cutoff" keep rendering.
    /** @test */
    public function a_date_no_period_covers_falls_back_to_the_most_recent_period()
    {
        $this->cutoff('fixture ancient', '1990-06-01', '1990-06-15');

        $result = $this->repo->get_payroll_cutoff('1990-06-20');

        $this->assertNotNull($result);
        $latest = PayrollCutoff::orderBy('end_date', 'desc')->first();
        $this->assertSame($latest->id, $result->id);
        $this->assertNotSame('fixture ancient', $result->name);
    }

    // Called with no date at all, the repository asks about today. Rather than guessing which
    // period that is, the test states the contract itself: omitting the date means today's date.
    /** @test */
    public function asking_with_no_date_means_asking_about_today()
    {
        $this->cutoff('fixture ancient', '1990-06-01', '1990-06-15');

        $implicit = $this->repo->get_payroll_cutoff();
        $explicit = $this->repo->get_payroll_cutoff(date('Y-m-d'));

        if (!$explicit) {
            $this->markTestSkipped('this database has no payroll cutoffs configured at all');
        }
        $this->assertSame($explicit->id, $implicit->id);
        // and the 1990 fixture is never the answer for today
        $this->assertNotSame('fixture ancient', $implicit->name);
    }

    // =======================================================================================
    // all
    // =======================================================================================

    /** @test */
    public function listing_every_period_includes_a_newly_added_one()
    {
        $before = $this->repo->all()->count();
        $added = $this->cutoff('fixture added', '1990-07-01', '1990-07-15');

        $after = $this->repo->all();

        $this->assertSame($before + 1, $after->count());
        $this->assertContains($added->id, $after->pluck('id')->all());
    }

    // Soft-deleted periods drop out of the list.
    /** @test */
    public function listing_every_period_leaves_out_one_that_has_been_deleted()
    {
        $added = $this->cutoff('fixture removed', '1990-07-01', '1990-07-15');
        $added->delete();

        $this->assertNotContains($added->id, $this->repo->all()->pluck('id')->all());
    }

    // =======================================================================================
    // update
    // =======================================================================================

    /** @test */
    public function updating_a_period_rewrites_every_field_it_was_given()
    {
        $cutoff = $this->cutoff('fixture original', '1990-08-01', '1990-08-15');

        $result = $this->repo->update([
            'name'       => 'fixture renamed',
            'start_date' => '1990-08-02',
            'end_date'   => '1990-08-16',
        ], $cutoff->id);

        $this->assertSame('fixture renamed', $result->name);
        $this->assertSame('1990-08-02', $result->start_date);
        $this->assertSame('1990-08-16', $result->end_date);
        $this->assertSame('fixture renamed', $cutoff->fresh()->name);
    }

    // A field left out of the payload keeps its stored value rather than being blanked — the edit
    // form posts only what changed.
    /** @test */
    public function updating_a_period_keeps_the_fields_that_were_not_supplied()
    {
        $cutoff = $this->cutoff('fixture original', '1990-08-01', '1990-08-15');

        $result = $this->repo->update(['name' => 'fixture renamed only'], $cutoff->id);

        $this->assertSame('fixture renamed only', $result->name);
        $this->assertSame('1990-08-01', $result->start_date);
        $this->assertSame('1990-08-15', $result->end_date);
    }

    // An empty value is treated as "not supplied" too, so a cleared field cannot wipe a date.
    /** @test */
    public function updating_a_period_with_blank_values_keeps_the_stored_ones()
    {
        $cutoff = $this->cutoff('fixture original', '1990-08-01', '1990-08-15');

        $result = $this->repo->update(['name' => '', 'start_date' => '', 'end_date' => ''], $cutoff->id);

        $this->assertSame('fixture original', $result->name);
        $this->assertSame('1990-08-01', $result->start_date);
        $this->assertSame('1990-08-15', $result->end_date);
    }

    // The repository accepts either the model or its id.
    /** @test */
    public function updating_a_period_accepts_the_model_in_place_of_its_id()
    {
        $cutoff = $this->cutoff('fixture original', '1990-08-01', '1990-08-15');

        $result = $this->repo->update(['name' => 'fixture by model'], $cutoff);

        $this->assertSame('fixture by model', $result->name);
        $this->assertSame($cutoff->id, $result->id);
    }

    /** @test */
    public function updating_a_period_that_does_not_exist_is_rejected()
    {
        $missing = (int) PayrollCutoff::withTrashed()->max('id') + 500000;

        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
        $this->repo->update(['name' => 'nope'], $missing);
    }

    // =======================================================================================
    // get_filter_for_dtr — the period dropdown
    // =======================================================================================

    // For everyone outside India and Morocco the dropdown is built from payroll_cutoffs, grouped by
    // the year and month the period ENDS in, and periods that finished before the employee was
    // hired are left out.
    /** @test */
    public function the_period_dropdown_is_grouped_by_the_year_and_month_each_period_ends_in()
    {
        $user = $this->employee();
        if (in_array((int) $user->country_id, [1, 4], true)) {
            $this->markTestSkipped('the probe employee is in India or Morocco, whose dropdown is '
                . 'built from a different source; see the test below');
        }
        $ends_in_month = date('Y-m-d', strtotime($user->date_hired . ' +40 days'));
        $added = $this->cutoff('fixture dropdown', $user->date_hired, $ends_in_month);

        $result = $this->repo->get_filter_for_dtr($user->id);

        $year  = date('Y', strtotime($ends_in_month));
        $month = date('m', strtotime($ends_in_month));
        $this->assertArrayHasKey($year, $result);
        $this->assertArrayHasKey($month, $result[$year]);
        $this->assertSame(date('F', strtotime($ends_in_month)), $result[$year][$month]['label']);
        $this->assertArrayHasKey($added->id, $result[$year][$month]['data']);
    }

    /** @test */
    public function the_period_dropdown_leaves_out_periods_that_ended_before_the_employee_was_hired()
    {
        $user = $this->employee();
        if (in_array((int) $user->country_id, [1, 4], true)) {
            $this->markTestSkipped('India and Morocco build this dropdown from a different source');
        }
        $too_early = $this->cutoff('fixture pre-hire', '1990-06-01', '1990-06-15');

        $result = $this->repo->get_filter_for_dtr($user->id);

        $found = false;
        foreach ($result as $months) {
            foreach ($months as $month) {
                if (array_key_exists($too_early->id, $month['data'])) {
                    $found = true;
                }
            }
        }
        $this->assertFalse($found, 'a period that ended before the hire date reached the dropdown');
    }

    // India and Morocco read their periods from the India payroll cutoff table instead, and the
    // entries carry the zero-padded cutoff month rather than the month the period ends in.
    /** @test */
    public function india_and_morocco_build_the_period_dropdown_from_their_own_cutoff_table()
    {
        $user = User::where('is_active', 1)
                    ->whereIn('country_id', [1, 4])
                    ->whereNotNull('date_hired')
                    ->whereNotNull('LevelId')
                    ->whereHas('level')
                    ->orderBy('id', 'desc')->first();
        if (!$user) {
            $this->markTestSkipped('no active India or Morocco employee in this database');
        }
        $this->be($user);

        $result = $this->repo->get_filter_for_dtr($user->id);

        if (!$result) {
            $this->markTestSkipped('the India payroll cutoff table is empty in this database');
        }
        foreach ($result as $year => $months) {
            foreach ($months as $month => $bucket) {
                $this->assertArrayHasKey('label', $bucket);
                $this->assertArrayHasKey('data', $bucket);
                foreach ($bucket['data'] as $entry) {
                    $this->assertSame(str_pad($entry['month'], 2, '0', STR_PAD_LEFT), $entry['month']);
                    $this->assertSame($entry['month_label'] . ' ' . $year, $entry['name']);
                    $this->assertIsString($entry['year']);
                }
            }
        }
    }
}
