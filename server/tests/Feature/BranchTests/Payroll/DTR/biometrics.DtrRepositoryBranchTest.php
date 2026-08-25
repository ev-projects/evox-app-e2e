<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Payroll/Repositories/DtrRepository.php
 *       ::sync_biometrics_to_dtr
 *       ::apply_biometrics_to_dtr (protected, entered at :986 and recursively at :1220)
 *
 * MENU PATH
 *   Dashboard -> Quick Punch (clock in / clock out)   [DtrController@quickpunch]
 *   Cron -> Sync Biometrics
 *
 * COVERAGE BEFORE THIS FILE
 *   sync_biometrics_to_dtr    73.68% of lines
 *   apply_biometrics_to_dtr   55.00% of lines
 *
 * WHAT THESE RULES MEAN
 *   A biometric punch is a raw reader event: an employee number, an instant, and a direction. This
 *   pair of methods decides which day's record that instant belongs to and which side of the day it
 *   writes. Getting it wrong shows up as a missing clock-out, which the employee then has to raise
 *   as a time correction — so the direction mapping and the "which day" search are the rules worth
 *   pinning down.
 *
 * SCOPE NOTE
 *   Punches are anchored on 1990 (the repository's date-scoped searches are not employee-scoped) or
 *   on the far-future anchor where a test needs the auto-generation arm, which creates rows for one
 *   employee only.
 *
 * FINDINGS
 *   _FINDING_BIO_SCHED_GUARD  the "this day has no schedule, borrow the employee's default" block
 *                             can never run: its guard tests is_valid() on a relation OBJECT rather
 *                             than on the related row. See the test of that name.
 */

namespace Tests\Feature\BranchTests\Payroll\DTR;

use Tests\TestCase;
use Tests\Feature\BranchTests\Support\DtrFixtureTrait;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use App\Modules\Payroll\Models\Biometrics;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Repositories\DtrRepository;

class DtrBiometricsBranchTest extends TestCase
{
    use DatabaseTransactions, DtrFixtureTrait;

    /** @var DtrRepository */
    private $repo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fxNoSchedule = true;      // keeps the auto-generation arm from applying live schedules
        $this->repo = $this->app->make(DtrRepository::class);
    }

    /**
     * A reader event for the fixture employee. Biometrics rows live on a separate connection and
     * are read-only; the app only ever builds them in memory, and so do we.
     */
    private function punch($check_type, $datetime)
    {
        $biometrics = new Biometrics();
        $biometrics->Userid    = '20' . $this->requireFixtureUser()->emp_num;
        $biometrics->CheckTime = $datetime;
        $biometrics->CheckType = $check_type;

        $collection = new EloquentCollection();
        $collection->push($biometrics);
        return $collection;
    }

    private function punchAt($day, $time)
    {
        return $this->fixtureDate($day) . ' ' . $time;
    }

    // =======================================================================================
    // The direction mapping — which side of the day a punch writes
    // =======================================================================================

    /** @test */
    public function a_clock_in_punch_writes_the_days_time_in()
    {
        $dtr = $this->makeDtr(0, [
            'start_datetime' => $this->fixtureTs(0, 8 * 3600),
            'end_datetime'   => $this->fixtureTs(0, 17 * 3600),
        ]);

        $result = $this->repo->sync_biometrics_to_dtr($this->punch('I', $this->punchAt(0, '08:05:00')), $dtr->id);

        $this->assertCount(1, $result);
        $this->assertEquals((int) strtotime($this->punchAt(0, '08:05:00')), $dtr->fresh()->time_in);
        $this->assertNull($dtr->fresh()->time_out);
    }

    /** @test */
    public function a_clock_out_punch_writes_the_days_time_out()
    {
        $dtr = $this->makeDtr(0, [
            'start_datetime' => $this->fixtureTs(0, 8 * 3600),
            'end_datetime'   => $this->fixtureTs(0, 17 * 3600),
            'time_in'        => $this->fixtureTs(0, 8 * 3600),
        ]);

        $this->repo->sync_biometrics_to_dtr($this->punch('O', $this->punchAt(0, '17:20:00')), $dtr->id);

        $this->assertEquals((int) strtotime($this->punchAt(0, '17:20:00')), $dtr->fresh()->time_out);
        $this->assertEquals($this->fixtureTs(0, 8 * 3600), $dtr->fresh()->time_in, 'the clock-in was overwritten');
    }

    // A "continue" after a pause counts as clocking back in, and a "pause" as clocking out — the
    // multi-punch screen uses the same four codes as the reader.
    /** @test */
    public function a_continue_punch_counts_as_clocking_in_and_a_pause_as_clocking_out()
    {
        $dtr = $this->makeDtr(0, [
            'start_datetime' => $this->fixtureTs(0, 8 * 3600),
            'end_datetime'   => $this->fixtureTs(0, 17 * 3600),
        ]);

        $this->repo->sync_biometrics_to_dtr($this->punch('P', $this->punchAt(0, '12:00:00')), $dtr->id);
        $this->assertEquals((int) strtotime($this->punchAt(0, '12:00:00')), $dtr->fresh()->time_out);

        $this->repo->sync_biometrics_to_dtr($this->punch('C', $this->punchAt(0, '13:00:00')), $dtr->id);
        $this->assertEquals((int) strtotime($this->punchAt(0, '13:00:00')), $dtr->fresh()->time_in);
    }

    // =======================================================================================
    // The empty and failure arms
    // =======================================================================================

    /** @test */
    public function syncing_an_empty_batch_of_punches_returns_nothing_and_writes_nothing()
    {
        $dtr = $this->makeDtr(0);

        $result = $this->repo->sync_biometrics_to_dtr(new EloquentCollection(), $dtr->id);

        $this->assertCount(0, $result);
        $this->assertNull($dtr->fresh()->time_in);
    }

    // One unusable punch must not abort the batch: the per-punch catch logs it and moves on.
    // A reader code outside I/O/P/C maps to no direction at all, so writing it fails — and the
    // valid punch behind it in the same batch must still land.
    /** @test */
    public function a_punch_with_an_unknown_reader_code_is_skipped_without_stopping_the_rest_of_the_batch()
    {
        $dtr = $this->makeDtr(0, [
            'start_datetime' => $this->fixtureTs(0, 8 * 3600),
            'end_datetime'   => $this->fixtureTs(0, 17 * 3600),
        ]);

        $batch = $this->punch('Z', $this->punchAt(0, '08:00:00'));       // no such direction
        $batch->push($this->punch('I', $this->punchAt(0, '08:05:00'))->first());

        $result = $this->repo->sync_biometrics_to_dtr($batch, $dtr->id);

        $this->assertCount(1, $result, 'the bad punch took the good one down with it');
        $this->assertEquals((int) strtotime($this->punchAt(0, '08:05:00')), $dtr->fresh()->time_in);
    }

    // =======================================================================================
    // Finding the day when the caller does not name one
    // =======================================================================================

    // With no explicit day, the punch is matched to the employee's record for the punch's own date.
    /** @test */
    public function a_punch_with_no_named_day_lands_on_the_employees_record_for_that_date()
    {
        $offset = $this->fixtureOffset();
        // the search compares against the employee's local date, so build the instant backwards
        $local_noon = $this->fixtureTs(0, 12 * 3600);
        $dtr = $this->makeDtr(0, [
            'start_datetime' => $this->fixtureTs(0, 8 * 3600),
            'end_datetime'   => $this->fixtureTs(0, 17 * 3600),
        ]);

        $result = $this->repo->sync_biometrics_to_dtr(
            $this->punch('I', date('Y-m-d H:i:s', $local_noon - $offset))
        );

        $this->assertCount(1, $result);
        $this->assertSame($dtr->id, $result->first()->id);
        $this->assertEquals($local_noon - $offset, $dtr->fresh()->time_in);
    }

    // When the employee has no record for the punch's date at all, the repository generates a
    // window of days around it and then places the punch on the newly created day rather than
    // dropping the punch on the floor.
    /** @test */
    public function a_punch_with_no_record_for_that_date_generates_the_missing_days_and_places_itself()
    {
        $user = $this->requireFixtureUser();
        if (!$user->date_hired) {
            $this->markTestSkipped('the probe employee has no hire date, which this arm dereferences');
        }
        $when = $this->fixtureFutureDate(0) . ' 09:00:00';
        $this->assertNull(
            Dtr::where('user_id', $user->id)->where('date', $this->fixtureFutureDate(0))->first(),
            'the future anchor already has a record, so this test would not exercise generation'
        );

        $result = $this->repo->sync_biometrics_to_dtr($this->punch('I', $when));

        $created = Dtr::where('user_id', $user->id)->where('date', $this->fixtureFutureDate(0))->first();
        $this->assertNotNull($created, 'the missing day was never generated');
        $this->assertCount(1, $result);
        $this->assertEquals((int) strtotime($when), $created->time_in);
    }

    // =======================================================================================
    // DEFECT — the "borrow the default schedule" block is unreachable
    // =======================================================================================
    //
    // apply_biometrics_to_dtr guards its schedule-backfill block with
    //     !is_valid($dtr->start_datetime) && !is_valid($dtr->end_datetime)
    //          && !is_valid(Auth::user()->defaultSchedule())
    // The third clause calls defaultSchedule() WITHOUT ->first(), so it tests the HasOne relation
    // object, not the related row. A relation object is never empty, so is_valid() is always true,
    // the negation is always false, and the block never runs — whether or not the employee actually
    // has a default schedule.
    //
    // The visible consequence: a punch on a day that carries no schedule leaves that day with no
    // schedule, so the day computes no rendered hours and reads as absent despite the punch.
    //
    // This is app code, not the test environment — Chrome would behave identically. The assertion
    // records TODAY's behaviour; adding ->first() makes the block run and this test fail, which is
    // the signal to flip it.
    /** @test */
    public function a_punch_on_a_day_with_no_schedule_leaves_it_without_one_FINDING_BIO_SCHED_GUARD()
    {
        $dtr = $this->makeDtr(0);       // deliberately no start_datetime / end_datetime

        $result = $this->repo->sync_biometrics_to_dtr($this->punch('I', $this->punchAt(0, '08:05:00')), $dtr->id);

        $fresh = $dtr->fresh();
        $this->assertCount(1, $result);
        $this->assertEquals((int) strtotime($this->punchAt(0, '08:05:00')), $fresh->time_in);
        $this->assertNull($fresh->start_datetime, 'the backfill block now runs — flip this finding');
        $this->assertNull($fresh->end_datetime);
        $this->assertNull($fresh->break_time);
    }
}
