<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Payroll/Http/Controllers/DtrController.php
 *       ::daily_time_record   ::dtr_single_punch
 *
 * MENU PATH
 *   Payroll -> Daily Time Record            GET /api/dtr/{user_id}/{start_date}/{end_date}
 *   (API only, no screen)                   GET /api/dtr/dtrpunch/check/{user_id}/{call_date}
 *
 * COVERAGE BEFORE THIS FILE
 *   daily_time_record  98.44% of lines
 *   dtr_single_punch    0.00% of lines
 *
 * HOW THE STORED PROCEDURE IS HANDLED
 *   daily_time_record reads everything from SP_DTR_By_UserId. The Tests\Support\CallSpFake seam
 *   intercepts that one call and hands back a canned five-set payload, so the controller's real
 *   assembly code runs line for line while the database is never asked for a procedure. The seam is
 *   active for the whole class, which also makes it a tripwire: any OTHER stored procedure reached
 *   from these routes would throw rather than run.
 *
 * WHY THE TIME-WINDOW ASSERTIONS ARE STABLE
 *   The controller compares Carbon::now() against each day's schedule to decide whether the punch
 *   buttons should be live. Every fixture day is on the 1990 anchor, which is unambiguously in the
 *   past, so those flags are false today and will still be false whenever this suite is next run.
 *   No clock is frozen and no assertion depends on the date the test executes.
 *
 * FINDINGS
 *   _FINDING_PUNCH_CHECK_OPERATOR  dtr_single_punch can never return a row: User::target_punch()
 *                                  filters with where('date', '==', $date), and '==' is not a
 *                                  valid Eloquent operator, so the builder rewrites the clause to
 *                                  date = '=='. See the test of that name.
 */

namespace Tests\Feature\BranchTests\Payroll\DTR;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Tests\Feature\BranchTests\Support\DtrFixtureTrait;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\Department\Models\EvoxSubDepartment;
use App\Modules\Payroll\Models\DtrPunchHistory;
use App\Modules\User\Models\User;

class DtrControllerBranchTest extends TestCase
{
    use DatabaseTransactions, DtrFixtureTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();          // reach the controller past jwtauth / auth.apikey
        CallSpFake::activate();
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        parent::tearDown();
    }

    /**
     * The fixture employee, additionally required to have a resolvable sub-department: the
     * controller dereferences EvoxSubDepartment::where('Id', …)->first()->Name with no null guard,
     * so an employee pointing at a deleted sub-department would fail for a reason unrelated to the
     * behaviour under test.
     */
    private function owner()
    {
        $user = $this->requireFixtureUser();
        if (is_valid($user->SubDepartmentID)
            && !EvoxSubDepartment::where('Id', $user->SubDepartmentID)->exists()) {
            $this->markTestSkipped(
                'the probe employee points at a sub-department that no longer exists; the '
                . 'controller dereferences it without a null guard'
            );
        }
        return $user;
    }

    /** The summary set the procedure returns — every column the controller reads, all zeroed. */
    private function summaryRow(array $overrides = [])
    {
        $columns = [
            'Late', 'Under_Time', 'Render_Hr', 'Night_Diff', 'OverTime', 'OT_ND', 'Leaves', 'UL',
            'RD_Render_HR', 'RD_ND', 'RD_OT', 'RD_OT_ND',
            'LH_Render_HR', 'LH_ND', 'LH_OT', 'LH_OT_ND',
            'SH_Render_Hr', 'SH_ND', 'SH_OT', 'SH_OT_ND',
            'DSH_Render_HR', 'DSH_ND', 'DSH_OT', 'DSH_OT_ND',
            'DLH_Render_HR', 'DLH_ND', 'DLH_OT', 'DLH_OT_ND',
            'SLH_Render_HR', 'SLH_ND', 'SLH_OT', 'SLH_OT_ND',
        ];
        return (object) array_merge(array_fill_keys($columns, 0), $overrides);
    }

    /** One day as the procedure returns it. */
    private function recordRow(array $overrides = [])
    {
        return (object) array_merge([
            'dtr_id'               => 4001,
            'user_id'              => $this->owner()->id,
            'date'                 => $this->fixtureDate(0),
            'time_in'              => $this->fixtureTs(0, 8 * 3600),
            'time_out'             => $this->fixtureTs(0, 17 * 3600),
            'start_datetime'       => $this->fixtureTs(0, 8 * 3600),
            'end_datetime'         => $this->fixtureTs(0, 17 * 3600),
            'start_flexy_datetime' => null,
            'end_flexy_datetime'   => null,
            'break_time'           => 3600,
            'is_rest_day'          => 0,
            'source_type_tagging'  => get_constant('DTR_SOURCE_TYPE_TAGGING.default'),
            'attendance_status'    => 'Present',
            'late'                 => 0,
            'undertime'            => 0,
            'overtime'             => 0,
            'overtime_night_diff'  => 0,
            'night_diff'           => 0,
        ], $overrides);
    }

    private function fakeProcedure($records, $summary = null, $holidays = [], $leaves = [], $requests = [])
    {
        CallSpFake::fake('SP_DTR_By_UserId', [
            $records,
            [$summary ?: $this->summaryRow()],
            $holidays,
            $leaves,
            $requests,
        ]);
    }

    private function load($user_id = null, $start = null, $end = null)
    {
        $user_id = $user_id ?: $this->owner()->id;
        $start = $start ?: $this->fixtureDate(0);
        $end = $end ?: $this->fixtureDate(1);

        return $this->actingAs($this->owner())->getJson("/api/dtr/{$user_id}/{$start}/{$end}");
    }

    // =======================================================================================
    // daily_time_record — the summary block
    // =======================================================================================

    /** @test */
    public function the_daily_time_record_reports_the_employees_own_identity_and_totals()
    {
        $owner = $this->owner();
        $this->fakeProcedure([], $this->summaryRow(['Late' => 1.5, 'OverTime' => 2, 'Leaves' => 0.5, 'UL' => 1]));

        $response = $this->load();

        $response->assertStatus(200);
        $content = $response->json('content');
        $this->assertSame($owner->emp_num, $content['summary']['items']['employee_info']['employee_id']);
        $this->assertSame(
            $owner->first_name . ' ' . $owner->last_name,
            $content['summary']['items']['employee_info']['name']
        );
        $this->assertEquals(1.5, $content['summary']['items']['data']['reg']['late']);
        $this->assertEquals(2, $content['summary']['items']['data']['reg']['overtime']);
        $this->assertEquals(0.5, $content['summary']['items']['data']['reg']['vl_sl']);
        $this->assertEquals(1, $content['summary']['items']['data']['reg']['ul']);
    }

    // The summary carries a bucket per day type, and the procedure's rest-day and holiday columns
    // must land in their own buckets rather than being folded into the regular one.
    /** @test */
    public function the_summary_keeps_rest_day_and_holiday_hours_in_their_own_buckets()
    {
        $this->fakeProcedure([], $this->summaryRow([
            'Render_Hr' => 8, 'RD_Render_HR' => 4, 'LH_OT' => 3, 'SLH_ND' => 1,
        ]));

        $data = $this->load()->json('content.summary.items.data');

        $this->assertEquals(8, $data['reg']['rendered_hours']);
        $this->assertEquals(4, $data['rd']['rendered_hours']);
        $this->assertEquals(3, $data['lh']['overtime']);
        $this->assertEquals(1, $data['slh']['night_diff']);
    }

    // =======================================================================================
    // daily_time_record — per-day payroll figures
    // =======================================================================================

    // Payroll figures arrive from the procedure in HOURS and are rendered as clock durations, but
    // only when there is something to show: a zero is rendered as an empty cell, not "0:00".
    /** @test */
    public function a_day_with_payroll_figures_renders_them_as_durations()
    {
        $this->fakeProcedure([$this->recordRow([
            'late' => 0.5, 'undertime' => 0.25, 'overtime' => 2,
            'night_diff' => 1, 'overtime_night_diff' => 0.5,
        ])]);

        $items = $this->load()->json('content.dtr_records.0.payroll_items');

        // half an hour late, a quarter hour short, two hours over, one hour of night differential
        $this->assertSame([
            'late'                => '00:30:00',
            'undertime'           => '00:15:00',
            'overtime'            => '02:00:00',
            'overtime_night_diff' => '00:30:00',
            'night_diff'          => '01:00:00',
        ], $items);
    }

    /** @test */
    public function a_day_with_no_payroll_figures_renders_empty_cells_rather_than_zeroes()
    {
        $this->fakeProcedure([$this->recordRow()]);

        $items = $this->load()->json('content.dtr_records.0.payroll_items');

        $this->assertSame(['late' => '', 'undertime' => '', 'overtime' => '',
                           'overtime_night_diff' => '', 'night_diff' => ''], $items);
    }

    // =======================================================================================
    // daily_time_record — attachments are matched to their own day
    // =======================================================================================

    /** @test */
    public function leaves_holidays_and_requests_are_attached_only_to_the_day_they_belong_to()
    {
        $mine     = $this->recordRow(['dtr_id' => 4001]);
        $theirs   = $this->recordRow(['dtr_id' => 4002, 'date' => $this->fixtureDate(1)]);
        $holidays = [(object) ['dtr_id' => 4001, 'name' => 'Fixture Day', 'type' => 'lh']];
        $leaves   = [(object) ['dtr_id' => 4001, 'type' => 'Vacation Leave', 'status' => 'approved',
                               'amount' => '0.5', 'employee_note' => 'note', 'manager_note' => 'ok']];
        $requests = [(object) ['dtr_id' => 4002, 'type' => 'overtime', 'status' => 'approved']];

        $this->fakeProcedure([$mine, $theirs], null, $holidays, $leaves, $requests);

        $records = $this->load()->json('content.dtr_records');

        $this->assertCount(1, $records[0]['holidays']);
        $this->assertSame('Fixture Day', $records[0]['holidays'][0]['name']);
        $this->assertCount(1, $records[0]['leaves']);
        $this->assertSame('Vacation Leave', $records[0]['leaves'][0]['type']);
        $this->assertSame(0.5, $records[0]['leaves'][0]['amount']);       // cast out of the string
        $this->assertSame('note', $records[0]['leaves'][0]['note']['employee_note']);
        $this->assertCount(0, $records[0]['requests']);

        $this->assertCount(0, $records[1]['holidays']);
        $this->assertCount(0, $records[1]['leaves']);
        $this->assertCount(1, $records[1]['requests']);
        $this->assertSame('overtime', $records[1]['requests'][0]['request_type']);
    }

    // =======================================================================================
    // daily_time_record — attendance status
    // =======================================================================================

    /** @test */
    public function a_day_the_procedure_leaves_unstatused_is_reported_as_absent()
    {
        $this->fakeProcedure([$this->recordRow(['attendance_status' => null])]);

        $status = $this->load()->json('content.dtr_records.0.attendance_status');

        $this->assertSame('Absent', $status['name']);
        $this->assertSame(text_to_slug('Absent'), $status['slug']);
    }

    /** @test */
    public function a_day_the_procedure_statuses_keeps_that_status_and_gains_a_slug()
    {
        $this->fakeProcedure([$this->recordRow(['attendance_status' => 'Late Log In'])]);

        $status = $this->load()->json('content.dtr_records.0.attendance_status');

        $this->assertSame('Late Log In', $status['name']);
        $this->assertSame(text_to_slug('Late Log In'), $status['slug']);
    }

    // =======================================================================================
    // daily_time_record — the punch-window flags
    // =======================================================================================

    // A working day long past cannot still be punched, so all three flags are off. (See the header:
    // 1990 is in the past on any day this suite runs.)
    /** @test */
    public function a_working_day_in_the_past_is_reported_as_outside_every_punch_window()
    {
        $this->fakeProcedure([$this->recordRow(['is_rest_day' => 0, 'time_out' => null])]);

        $record = $this->load()->json('content.dtr_records.0');

        $this->assertFalse($record['with_in_time']);
        $this->assertFalse($record['with_in_time_extended']);
        $this->assertFalse($record['before_time_in_half']);
    }

    // A rest day skips the window arithmetic entirely — there is no schedule to be inside.
    /** @test */
    public function a_rest_day_skips_the_punch_window_arithmetic_altogether()
    {
        $this->fakeProcedure([$this->recordRow([
            'is_rest_day' => 1, 'time_in' => null, 'time_out' => null,
            'start_datetime' => null, 'end_datetime' => null,
        ])]);

        $record = $this->load()->json('content.dtr_records.0');

        $this->assertEquals(1, $record['is_rest_day']);
        $this->assertFalse($record['with_in_time']);
        $this->assertFalse($record['before_time_in_half']);
    }

    // When a day has a flexible finish, that is the edge the window is measured to.
    /** @test */
    public function a_flexible_day_measures_its_punch_window_to_the_flexible_finish()
    {
        $this->fakeProcedure([$this->recordRow([
            'start_flexy_datetime' => $this->fixtureTs(0, 10 * 3600),
            'end_flexy_datetime'   => $this->fixtureTs(0, 19 * 3600),
        ])]);

        $record = $this->load()->json('content.dtr_records.0');

        $this->assertFalse($record['with_in_time']);
        $this->assertNotNull($record['start_flexy_datetime']);
        $this->assertNotNull($record['end_flexy_datetime']);
    }

    // =======================================================================================
    // daily_time_record — the failure arms
    // =======================================================================================

    /** @test */
    public function a_malformed_date_is_rejected_before_the_procedure_is_ever_called()
    {
        $this->fakeProcedure([$this->recordRow()]);

        $response = $this->load($this->owner()->id, 'NOT-A-DATE', $this->fixtureDate(1));

        $response->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
        $this->assertSame([], CallSpFake::callsFor('SP_DTR_By_UserId'));
    }

    /** @test */
    public function asking_for_an_employee_who_does_not_exist_is_rejected()
    {
        $this->fakeProcedure([$this->recordRow()]);
        $missing = (int) User::max('id') + 500000;

        $response = $this->load($missing);

        $response->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // The procedure receives the employee and the window it was asked for, with the id as an int.
    /** @test */
    public function the_procedure_is_asked_for_exactly_the_employee_and_window_requested()
    {
        $this->fakeProcedure([]);

        $this->load($this->owner()->id, $this->fixtureDate(0), $this->fixtureDate(3));

        $calls = CallSpFake::callsFor('SP_DTR_By_UserId');
        $this->assertCount(1, $calls);
        $this->assertSame(
            [(int) $this->owner()->id, $this->fixtureDate(0), $this->fixtureDate(3)],
            $calls[0]['params']
        );
    }

    /** @test */
    public function an_employee_with_no_days_in_the_window_still_gets_a_summary_and_an_empty_list()
    {
        $this->fakeProcedure([]);

        $content = $this->load()->json('content');

        $this->assertSame([], $content['dtr_records']);
        $this->assertArrayHasKey('employee_info', $content['summary']['items']);
    }

    // =======================================================================================
    // DEFECT — dtr_single_punch can never return anything
    // =======================================================================================
    //
    // The route resolves to User::target_punch($date), whose filter reads
    //     ->where('date', '==', $date)
    // '==' is not one of Eloquent's operators. Laravel's query builder treats an unrecognised
    // operator as a value, so the clause becomes `date = '=='` — a comparison no row can satisfy.
    // The endpoint therefore returns 200 with an empty list no matter what the employee punched.
    //
    // This is server-side SQL, so Chrome would see exactly the same thing. No frontend code calls
    // this route today (the client only uses /dtr/dtrpunch/{user}/{from}/{to}), so there is no
    // user-visible symptom yet — but the endpoint is live to any authenticated API caller and is a
    // trap for whoever wires it up next.
    //
    // The assertions record TODAY's behaviour, alongside proof that the rows the endpoint should
    // have returned really are present.
    /** @test */
    public function the_single_day_punch_endpoint_returns_nothing_even_when_that_day_has_punches_FINDING_PUNCH_CHECK_OPERATOR()
    {
        $owner = $this->owner();
        DtrPunchHistory::create([
            'user_id'     => $owner->id,
            'date'        => $this->fixtureDate(0),
            'time_in'     => $this->fixtureTs(0, 8 * 3600),
            'time_out'    => $this->fixtureTs(0, 17 * 3600),
            'log_in_type' => 'Log_in',
            'log_out_type' => 'Log_out',
            'is_active'   => 1,
        ]);

        // the data the endpoint is meant to return is unquestionably there
        $this->assertSame(1, DtrPunchHistory::where('user_id', $owner->id)
                                            ->where('date', $this->fixtureDate(0))
                                            ->where('is_active', 1)->count());

        $response = $this->actingAs($owner)
                         ->getJson('/api/dtr/dtrpunch/check/' . $owner->id . '/' . $this->fixtureDate(0));

        $response->assertStatus(200);
        $this->assertSame([], $response->json('content'),
            'the endpoint now returns the punches — flip this finding');
    }

    // The same endpoint asked for a date with no punches: indistinguishable from the case above,
    // which is the practical consequence of the defect.
    /** @test */
    public function the_single_day_punch_endpoint_also_returns_nothing_for_a_day_with_no_punches()
    {
        $response = $this->actingAs($this->owner())
                         ->getJson('/api/dtr/dtrpunch/check/' . $this->owner()->id . '/' . $this->fixtureDate(7));

        $response->assertStatus(200);
        $this->assertSame([], $response->json('content'));
    }

    /** @test */
    public function the_single_day_punch_endpoint_rejects_a_malformed_date()
    {
        $response = $this->actingAs($this->owner())
                         ->getJson('/api/dtr/dtrpunch/check/' . $this->owner()->id . '/NOT-A-DATE');

        $response->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
