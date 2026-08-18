<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Payroll/Repositories/DtrRepository.php
 *       ::apply_punch_to_history   ::apply_alter_to_punch   ::remove_alter_to_punch
 *
 * MENU PATH
 *   Dashboard -> Multi Punch (log in / pause / continue / log out)  [DtrController@quickpunch_multi]
 *   My Team -> Requests -> Alter Log Punch (approve / decline)      [RequestController bulk action]
 *
 * COVERAGE BEFORE THIS FILE
 *   apply_punch_to_history  60.71% of lines
 *   apply_alter_to_punch     0.00% of lines
 *   remove_alter_to_punch    0.00% of lines
 *
 * WHAT THESE RULES MEAN
 *   Multi-punch keeps a chain of open/closed segments per day. Each new reader event either closes
 *   the segment that is still open or starts a new one, and the very first event of a day must be a
 *   log IN — clocking out with nothing open is refused, which is what puts "you need to clock in"
 *   on the employee's screen.
 *
 * SCOPE NOTE
 *   Every punch row is written on the 1990 anchor. That matters more here than anywhere else in
 *   this wave: two of the three methods query punch rows BY DATE ONLY, with no employee filter (see
 *   the finding below), so a live date would have swept up other people's records.
 *
 * FINDINGS
 *   _FINDING_PUNCH_ALL_USERS  apply_alter_to_punch and remove_alter_to_punch deactivate, and delete
 *                             the computed punches of, EVERY employee who has punch rows on that
 *                             date — not just the employee whose alteration was approved. See the
 *                             two tests of that name.
 */

namespace Tests\Feature\BranchTests\Payroll\DTR;

use Tests\TestCase;
use Tests\Feature\BranchTests\Support\DtrFixtureTrait;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\Request;
use App\Modules\Payroll\Models\Biometrics;
use App\Modules\Payroll\Models\DtrPunchHistory;
use App\Modules\Payroll\Repositories\DtrRepository;
use App\Modules\Request\Models\AlterLogPunch;
use App\Modules\User\Models\User;

class DtrPunchHistoryBranchTest extends TestCase
{
    use DatabaseTransactions, DtrFixtureTrait;

    /** @var DtrRepository */
    private $repo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = $this->app->make(DtrRepository::class);
    }

    private function readerEvent($check_type, $time)
    {
        $biometrics = new Biometrics();
        $biometrics->Userid    = '20' . $this->requireFixtureUser()->emp_num;
        $biometrics->CheckTime = $this->fixtureDate(0) . ' ' . $time;
        $biometrics->CheckType = $check_type;

        $collection = new EloquentCollection();
        $collection->push($biometrics);
        return $collection;
    }

    private function punchRequest()
    {
        return new Request(['project_name' => 'Fixture Project', 'remarks' => 'fixture remarks']);
    }

    private function applyPunch($check_type, $time)
    {
        return $this->repo->apply_punch_to_history(
            $this->fixtureDate(0),
            $this->requireFixtureUser()->id,
            $this->readerEvent($check_type, $time),
            $this->punchRequest()
        );
    }

    private function segment(array $attrs = [], $user_id = null)
    {
        return DtrPunchHistory::create(array_merge([
            'user_id'   => $user_id ?: $this->requireFixtureUser()->id,
            'date'      => $this->fixtureDate(0),
            'time_in'   => $this->fixtureTs(0, 8 * 3600),
            'is_active' => 1,
        ], $attrs));
    }

    private function segmentsFor($user_id)
    {
        return DtrPunchHistory::where('user_id', $user_id)
                              ->where('date', $this->fixtureDate(0))
                              ->orderBy('id', 'asc')->get();
    }

    // =======================================================================================
    // apply_punch_to_history — starting, closing and reopening a day
    // =======================================================================================

    /** @test */
    public function the_first_log_in_of_the_day_opens_a_new_segment()
    {
        $result = $this->applyPunch('I', '08:00:00');

        $this->assertTrue($result);
        $rows = $this->segmentsFor($this->requireFixtureUser()->id);
        $this->assertCount(1, $rows);
        $this->assertEquals((int) strtotime($this->fixtureDate(0) . ' 08:00:00'), $rows->first()->time_in);
        $this->assertNull($rows->first()->time_out);
        $this->assertSame('Log_in', $rows->first()->log_in_type);
        $this->assertSame('Fixture Project', $rows->first()->project_name);
        $this->assertSame('fixture remarks', $rows->first()->remarks);
    }

    /** @test */
    public function logging_out_closes_the_segment_that_is_still_open_rather_than_opening_another()
    {
        $open = $this->segment();

        $result = $this->applyPunch('O', '17:00:00');

        $this->assertTrue($result);
        $rows = $this->segmentsFor($this->requireFixtureUser()->id);
        $this->assertCount(1, $rows, 'a second segment was opened instead of closing the first');
        $this->assertSame($open->id, $rows->first()->id);
        $this->assertEquals((int) strtotime($this->fixtureDate(0) . ' 17:00:00'), $rows->first()->time_out);
        $this->assertSame('Log_out', $rows->first()->log_out_type);
        $this->assertSame('time_out', $rows->first()->log_action);
    }

    // Pausing closes the open segment too, but records it as a pause so the day can be resumed.
    /** @test */
    public function pausing_closes_the_open_segment_and_records_it_as_a_pause()
    {
        $this->segment();

        $this->assertTrue($this->applyPunch('P', '12:00:00'));

        $rows = $this->segmentsFor($this->requireFixtureUser()->id);
        $this->assertCount(1, $rows);
        $this->assertSame('Pause', $rows->first()->log_out_type);
    }

    // Resuming after a pause opens a fresh segment, dated to the paused segment's day.
    /** @test */
    public function resuming_after_a_pause_opens_a_fresh_segment()
    {
        $this->segment([
            'time_out'     => $this->fixtureTs(0, 12 * 3600),
            'log_out_type' => 'Pause',
        ]);

        $this->assertTrue($this->applyPunch('C', '13:00:00'));

        $rows = $this->segmentsFor($this->requireFixtureUser()->id);
        $this->assertCount(2, $rows);
        $this->assertSame('Continue', $rows->last()->log_in_type);
        $this->assertEquals((int) strtotime($this->fixtureDate(0) . ' 13:00:00'), $rows->last()->time_in);
    }

    // After a completed day, logging in again opens a new segment rather than reopening the closed
    // one.
    /** @test */
    public function logging_in_again_after_a_completed_day_opens_a_new_segment()
    {
        $this->segment([
            'time_out'     => $this->fixtureTs(0, 17 * 3600),
            'log_out_type' => 'Log_out',
        ]);

        $this->assertTrue($this->applyPunch('I', '18:00:00'));

        $rows = $this->segmentsFor($this->requireFixtureUser()->id);
        $this->assertCount(2, $rows);
        $this->assertEquals((int) strtotime($this->fixtureDate(0) . ' 18:00:00'), $rows->last()->time_in);
    }

    // The refusal that produces "you need to clock in": there is no open segment to close, and a
    // clock-out on its own would create a segment with no start.
    //
    // The refusal path is also a second instance of the leaked-transaction shape recorded in
    // requests.DtrRepositoryBranchTest — apply_punch_to_history opens a transaction and then
    // `return false` without committing or rolling back — so the level is asserted and drained here
    // rather than left for teardown.
    /** @test */
    public function clocking_out_with_no_open_segment_is_refused_and_writes_nothing()
    {
        $existing = $this->segment(['time_out' => $this->fixtureTs(0, 12 * 3600)]);   // no log_out_type

        $before = \Illuminate\Support\Facades\DB::transactionLevel();
        $result = $this->applyPunch('O', '17:00:00');

        try {
            $this->assertFalse($result, 'a clock-out with nothing open was accepted');
            $rows = $this->segmentsFor($this->requireFixtureUser()->id);
            $this->assertCount(1, $rows);
            $this->assertSame($existing->id, $rows->first()->id);

            $this->assertSame($before + 1, \Illuminate\Support\Facades\DB::transactionLevel(),
                'the refusal path no longer leaks a transaction level');
        } finally {
            // drain only leaked levels, even when an assertion above fails
            while (\Illuminate\Support\Facades\DB::transactionLevel() > $before) {
                \Illuminate\Support\Facades\DB::rollBack();
            }
        }
    }

    // The mirror: with the same half-finished segment, a clock IN is allowed and starts a new one.
    /** @test */
    public function clocking_in_against_a_half_finished_segment_starts_a_new_one()
    {
        $this->segment(['time_out' => $this->fixtureTs(0, 12 * 3600)]);

        $this->assertTrue($this->applyPunch('I', '13:00:00'));

        $this->assertCount(2, $this->segmentsFor($this->requireFixtureUser()->id));
    }

    // =======================================================================================
    // DEFECT — approving one person's punch alteration rewrites everybody's day
    // =======================================================================================
    //
    // apply_alter_to_punch (and remove_alter_to_punch) open with
    //     DtrPunchHistory::where('date', $alter_punch_log->date)->update(['is_active' => 0]);
    //     DtrPunch::whereIn('dtr_collective_punch_history_id',
    //         DtrPunchHistory::where('date', $alter_punch_log->date)->pluck('id'))->delete();
    // Neither statement mentions the employee. The request being approved belongs to one person,
    // but every employee with punch rows on that calendar date has their segments deactivated and
    // their computed punch records deleted.
    //
    // Reachable from Chrome: My Team -> Requests -> Alter Log Punch -> approve. Every colleague who
    // punched that day loses their multi-punch history from the screen and their computed hours.
    //
    // The assertions record TODAY's behaviour: a bystander's row is deactivated. Once the queries
    // are scoped by user_id these tests fail, which is the signal to flip them.
    /** @test */
    public function approving_a_punch_alteration_deactivates_every_other_employees_day_FINDING_PUNCH_ALL_USERS()
    {
        $bystander = $this->bystander();
        $their_row = $this->segment([], $bystander->id);
        $my_row    = $this->segment();

        $alteration = $this->alterationFor([
            (object) ['start_time' => $this->fixtureTs(0, 9 * 3600),
                      'end_time'   => $this->fixtureTs(0, 18 * 3600),
                      'remarks'    => 'corrected', 'project_name' => 'Fixture Project'],
        ]);

        $this->assertTrue($this->repo->apply_alter_to_punch($alteration));

        $this->assertEquals(0, $my_row->fresh()->is_active);
        $this->assertEquals(0, $their_row->fresh()->is_active,
            'the bystander is no longer swept up — flip this finding');
    }

    /** @test */
    public function declining_a_punch_alteration_deactivates_every_other_employees_day_FINDING_PUNCH_ALL_USERS()
    {
        $bystander = $this->bystander();
        $their_row = $this->segment([], $bystander->id);
        $my_row    = $this->segment();

        $alteration = $this->alterationFor(
            [(object) ['start_time' => $this->fixtureTs(0, 9 * 3600),
                       'end_time'   => $this->fixtureTs(0, 18 * 3600),
                       'remarks'    => 'x', 'project_name' => 'y']],
            [(object) ['id' => $my_row->id]]
        );

        $this->assertTrue($this->repo->remove_alter_to_punch($alteration));

        // the employee's own rows are put back...
        $this->assertEquals(1, $my_row->fresh()->is_active);
        // ...but the bystander's, deactivated by the same unscoped statement, are not
        $this->assertEquals(0, $their_row->fresh()->is_active,
            'the bystander is no longer swept up — flip this finding');
    }

    // =======================================================================================
    // apply_alter_to_punch / remove_alter_to_punch — the intended behaviour
    // =======================================================================================

    // An approved alteration replaces the day's segments with the corrected ones, chaining them:
    // the first opens the day, the last closes it, and anything between is a pause/continue pair.
    /** @test */
    public function an_approved_alteration_rewrites_the_day_as_a_chained_set_of_segments()
    {
        $original = $this->segment();
        $alteration = $this->alterationFor([
            (object) ['start_time' => $this->fixtureTs(0, 9 * 3600),
                      'end_time'   => $this->fixtureTs(0, 12 * 3600),
                      'remarks'    => 'morning', 'project_name' => 'Alpha'],
            (object) ['start_time' => $this->fixtureTs(0, 13 * 3600),
                      'end_time'   => $this->fixtureTs(0, 18 * 3600),
                      'remarks'    => 'afternoon', 'project_name' => 'Beta'],
        ]);

        $this->assertTrue($this->repo->apply_alter_to_punch($alteration));

        $this->assertEquals(0, $original->fresh()->is_active, 'the original day was left active');
        $written = DtrPunchHistory::where('user_id', $this->requireFixtureUser()->id)
                                  ->where('date', $this->fixtureDate(0))
                                  ->where('id', '!=', $original->id)
                                  ->orderBy('id', 'asc')->get();
        $this->assertCount(2, $written);

        $this->assertSame('Log_in', $written[0]->log_in_type);
        $this->assertSame('Pause', $written[0]->log_out_type);
        $this->assertSame('Alpha', $written[0]->project_name);
        $this->assertEquals($this->fixtureTs(0, 9 * 3600), $written[0]->time_in);

        $this->assertSame('Continue', $written[1]->log_in_type);
        $this->assertSame('Log_out', $written[1]->log_out_type);
        $this->assertSame('afternoon', $written[1]->remarks);
        $this->assertEquals($this->fixtureTs(0, 18 * 3600), $written[1]->time_out);
    }

    // A single corrected segment is both the opening and the closing one.
    /** @test */
    public function an_approved_alteration_of_a_single_segment_both_opens_and_closes_the_day()
    {
        $original = $this->segment();
        $alteration = $this->alterationFor([
            (object) ['start_time' => $this->fixtureTs(0, 9 * 3600),
                      'end_time'   => $this->fixtureTs(0, 18 * 3600),
                      'remarks'    => 'all day', 'project_name' => 'Alpha'],
        ]);

        $this->repo->apply_alter_to_punch($alteration);

        $written = DtrPunchHistory::where('user_id', $this->requireFixtureUser()->id)
                                  ->where('date', $this->fixtureDate(0))
                                  ->where('id', '!=', $original->id)->get();
        $this->assertCount(1, $written);
        $this->assertSame('Log_in', $written->first()->log_in_type);
        $this->assertSame('Log_out', $written->first()->log_out_type);
    }

    // Declining puts the employee's original segments back and writes no corrected ones.
    /** @test */
    public function a_declined_alteration_restores_the_original_segments_and_writes_no_new_ones()
    {
        $original = $this->segment(['is_active' => 0]);
        $alteration = $this->alterationFor(
            [(object) ['start_time' => $this->fixtureTs(0, 9 * 3600),
                       'end_time'   => $this->fixtureTs(0, 18 * 3600),
                       'remarks'    => 'x', 'project_name' => 'y']],
            [(object) ['id' => $original->id]]
        );

        $this->assertTrue($this->repo->remove_alter_to_punch($alteration));

        $this->assertEquals(1, $original->fresh()->is_active);
        $this->assertSame(
            1,
            DtrPunchHistory::where('user_id', $this->requireFixtureUser()->id)
                           ->where('date', $this->fixtureDate(0))->count(),
            'declining an alteration wrote corrected segments anyway'
        );
    }

    // ------------------------------------------------------------------ fixture helpers

    /** Another active employee who shares the fixture date — the bystander in the finding above. */
    private function bystander()
    {
        $other = User::where('is_active', 1)
                     ->where('id', '!=', $this->requireFixtureUser()->id)
                     ->orderBy('id', 'desc')->first();
        if (!$other) {
            $this->markTestSkipped('this database holds only one active employee, so a second '
                . 'employee cannot be placed on the same date');
        }
        return $other;
    }

    private function alterationFor(array $new_punches, array $old_punches = [])
    {
        return AlterLogPunch::create([
            'user_id'    => $this->requireFixtureUser()->id,
            'date'       => $this->fixtureDate(0),
            'old_punch'  => json_encode($old_punches),
            'new_punch'  => json_encode($new_punches),
            'status'     => get_constant('REQUEST_STATUS.approved'),
            'created_by' => $this->requireFixtureUser()->id,
            'updated_by' => $this->requireFixtureUser()->id,
        ]);
    }
}
