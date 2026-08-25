<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use Illuminate\Http\Request;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\Attendance\Resources\EmployeeAttendanceResource;
use App\Modules\Request\Models\AlterLogPunch;
use App\Modules\Request\Resources\RequestResource;

/**
 * =====================================================================================================
 *  SOURCE UNDER TEST
 *      app/Modules/Attendance/Resources/EmployeeAttendanceResource.php  :: toArray
 *      app/Modules/Request/Resources/RequestResource.php                :: toArray
 *
 *  MENU PATH
 *      Attendance -> Attendance          (by-geo / by-department employee bundles)
 *      Requests   -> Request List        (the mixed request table: overtime, rest day work,
 *                                         change schedule, alter log, alter log punch)
 *
 *  COVERAGE AT THE TIME OF WRITING (03-Aug gap analysis re-measured 18-Aug)
 *      EmployeeAttendanceResource::toArray  93.75%  (the null-resource guard never ran)
 *      RequestResource::toArray             66.67%  (only two of the six switch arms were entered)
 *
 *  NOT TESTED HERE — WorkFromHomeResource (target 16) is DEAD CODE: `grep -rn WorkFromHomeResource
 *  app/` matches its own declaration and nothing else, there is no controller, no route and no
 *  live front-end page. Reported as a dead-code candidate rather than covered.
 *
 *  FINDINGS RAISED HERE
 *      REQ-RDW-DROP-1  RequestResource drops the overnight correction it computes for rest-day-work
 *                      rows: `$to` is adjusted locally and never written back to the row, so the
 *                      Request List still shows an end time EARLIER than the start time.
 *      REQ-PUNCH-SILENT-1  When the alter-log-punch row referenced by `fourth_column` no longer
 *                      exists, the arm silently leaves the raw id in the payload and the screen
 *                      renders a bare number where the old/new punch list belongs.
 * =====================================================================================================
 *
 *  METHOD. These three resources are pure transformations of whatever the repository hands them, so
 *  the rows are built in memory exactly as the repositories shape them (stdClass for the attendance
 *  bundle, an array keyed 'query' for the request list). The only database work in the whole file is
 *  one bounded, indexed probe for a real alter_log_punches_new row; every other test is DB-free.
 *  DatabaseTransactions is carried because of that probe.
 */
class AttendanceAndRequestResourceShapesTest extends TestCase
{
    use DatabaseTransactions;

    /** @var Request */
    private $request;

    protected function setUp(): void
    {
        parent::setUp();
        $this->request = Request::create('/api/probe', 'GET');
    }

    /** A user row exactly as the attendance repository decorates it. */
    private function employeeRow(array $overrides = [])
    {
        return (object) array_merge([
            'id'                  => 4242,
            'emp_num'             => '10101',
            'bhr_num'             => '55',
            'first_name'          => 'Ana',
            'last_name'           => 'Cruz',
            'department_id'       => 7,
            'department_name'     => 'Operations',
            'SubDepartmentID'     => 19,
            'sub_department_name' => 'Operations - Night',
            'country_name'        => 'Philippines',
            'date_hired'          => '2021-03-01',
            'termination_date'    => null,
        ], $overrides);
    }

    // =================================================================================================
    //  EmployeeAttendanceResource — Attendance -> Attendance
    // =================================================================================================

    /**
     * @test
     * BUSINESS RULE — the by-geo/by-department screens read the employee's identity from the user row
     * and the day rows from the repository decoration, under the names the React table binds to:
     * `employee_number`, `bhr_number`, `joining_date`, `termination_date`, `daily`.
     */
    public function an_employee_bundle_renames_the_user_columns_to_the_attendance_screens_contract()
    {
        $row = $this->employeeRow([
            '_attendance_rows' => [
                ['date' => '2026-08-03', 'time_in' => '09:00', 'time_out' => '18:00',
                 'rendered_hours' => 8, 'status' => 'present'],
                ['date' => '2026-08-04', 'is_rest_day' => true, 'status' => 'rest_day'],
            ],
        ]);

        $out = json_decode(json_encode(
            (new EmployeeAttendanceResource($row))->toArray($this->request)
        ), true);

        $this->assertSame(4242, $out['id']);
        $this->assertSame('10101', $out['employee_number']);
        $this->assertSame('55', $out['bhr_number']);
        $this->assertSame('Ana', $out['first_name']);
        $this->assertSame('Cruz', $out['last_name']);
        $this->assertSame(7, $out['department_id']);
        $this->assertSame('Operations', $out['department_name']);
        $this->assertSame(19, $out['sub_department_id']);
        $this->assertSame('Operations - Night', $out['sub_department_name']);
        $this->assertSame('Philippines', $out['country_name']);
        $this->assertSame('2021-03-01', $out['joining_date']);
        $this->assertNull($out['termination_date']);

        // the day rows come back through AttendanceResource, one entry per repository row
        $this->assertCount(2, $out['daily']);
        $this->assertSame('2026-08-03', $out['daily'][0]['date']);
        $this->assertEquals(8, $out['daily'][0]['rendered_hours']); // assertEquals not assertSame: resource returns int 8, not float 8.0
        $this->assertFalse($out['daily'][0]['is_rest_day']);
        $this->assertTrue($out['daily'][1]['is_rest_day']);
        $this->assertSame('rest_day', $out['daily'][1]['status']);
    }

    /**
     * @test
     * BUSINESS RULE — an employee the repository found but produced no day rows for (hired mid-range,
     * terminated, or simply no DTR in the window) must still appear in the list with an EMPTY day
     * array, never a missing key: the screen groups by employee before it renders days.
     */
    public function an_employee_with_no_day_rows_still_renders_with_an_empty_daily_array()
    {
        $terminated = $this->employeeRow([
            'termination_date' => '2026-05-31',
            'date_hired'       => '2019-01-15',
        ]);

        $out = json_decode(json_encode(
            (new EmployeeAttendanceResource($terminated))->toArray($this->request)
        ), true);

        $this->assertSame([], $out['daily']);
        $this->assertSame('2026-05-31', $out['termination_date']);
        $this->assertSame('2019-01-15', $out['joining_date']);
    }

    /**
     * @test
     * BUSINESS RULE — the guard arm. A null entry inside the employee collection must serialise as
     * null rather than a half-built bundle of nulls, so the screen can skip it.
     */
    public function a_null_employee_bundle_serialises_as_null()
    {
        $this->assertNull((new EmployeeAttendanceResource(null))->toArray($this->request));
    }

    // =================================================================================================
    //  RequestResource — Requests -> Request List
    // =================================================================================================

    /** The repository hands RequestResource an array keyed 'query'. */
    private function requestList(array $rows)
    {
        return (new RequestResource(['query' => $rows]))->toArray($this->request);
    }

    private function requestRow(array $attributes)
    {
        return (object) array_merge([
            'table_name'    => 'overtimes',
            'fourth_column' => null,
            'fifth_column'  => null,
            'status'        => 'pending',
        ], $attributes);
    }

    /**
     * @test
     * BUSINESS RULE — an overtime row shows its TYPE as words, not as the stored slug, and every row
     * type in the list gets a capitalised status. `rest_day_work` must read "Rest Day Work".
     */
    public function an_overtime_row_is_shown_with_a_human_readable_type_and_capitalised_status()
    {
        $row = $this->requestRow([
            'table_name'   => 'overtimes',
            'fifth_column' => 'rest_day_work',
            'status'       => 'approved',
        ]);

        $out = $this->requestList([$row]);

        $this->assertSame('Rest Day Work', $out['result'][0]->fifth_column);
        $this->assertSame('Approved', $out['result'][0]->status);
    }

    /**
     * @test
     * FINDING REQ-RDW-DROP-1 (characterisation — assert what the code does TODAY).
     *
     * A rest-day-work shift that crosses midnight is stored with an end time earlier than its start
     * time. The arm detects exactly that and computes the corrected end (`+ 86400 seconds`) — then
     * throws the result away: `$to` is a local variable that is never assigned back to
     * `$request->fifth_column`. The Request List therefore still renders "18:00 to 06:00" of the SAME
     * day. When someone assigns `$request->fifth_column = $to;` this test fails, which is the signal
     * to flip it to assert the corrected date.
     */
    public function a_rest_day_work_row_crossing_midnight_keeps_its_uncorrected_end_time_FINDING_REQ_RDW_DROP_1()
    {
        $row = $this->requestRow([
            'table_name'    => 'rest_day_works',
            'fourth_column' => '2026-08-03 18:00:00',   // from
            'fifth_column'  => '2026-08-03 06:00:00',   // to — earlier than from, i.e. next morning
            'status'        => 'pending',
        ]);

        $out = $this->requestList([$row]);

        // the computed correction (2026-08-04 06:00:00) never reaches the payload
        $this->assertSame('2026-08-03 06:00:00', $out['result'][0]->fifth_column);
        $this->assertSame('2026-08-03 18:00:00', $out['result'][0]->fourth_column);
        $this->assertSame('Pending', $out['result'][0]->status);
    }

    /**
     * @test
     * BUSINESS RULE — the other arm of the same branch: a rest-day-work shift that ends on the day it
     * starts is left exactly as stored.
     */
    public function a_same_day_rest_day_work_row_is_left_untouched()
    {
        $row = $this->requestRow([
            'table_name'    => 'rest_day_works',
            'fourth_column' => '2026-08-03 08:00:00',
            'fifth_column'  => '2026-08-03 17:00:00',
            'status'        => 'declined',
        ]);

        $out = $this->requestList([$row]);

        $this->assertSame('2026-08-03 08:00:00', $out['result'][0]->fourth_column);
        $this->assertSame('2026-08-03 17:00:00', $out['result'][0]->fifth_column);
        $this->assertSame('Declined', $out['result'][0]->status);
    }

    /**
     * @test
     * BUSINESS RULE — a change-schedule row stores the old and new week as JSON. The list must hand
     * the front end decoded structures, not JSON strings, or the schedule comparison renders blank.
     */
    public function a_change_schedule_row_decodes_both_stored_weeks_into_structures()
    {
        $row = $this->requestRow([
            'table_name'    => 'change_schedules',
            'fourth_column' => json_encode(['monday' => '09:00-18:00', 'tuesday' => '09:00-18:00']),
            'fifth_column'  => json_encode(['monday' => '13:00-22:00', 'tuesday' => '13:00-22:00']),
            'status'        => 'pending',
        ]);

        $out = $this->requestList([$row]);

        $this->assertSame(['monday' => '09:00-18:00', 'tuesday' => '09:00-18:00'],
            $out['result'][0]->fourth_column);
        $this->assertSame(['monday' => '13:00-22:00', 'tuesday' => '13:00-22:00'],
            $out['result'][0]->fifth_column);
    }

    /**
     * @test
     * BUSINESS RULE — an alter-log row stores "in,out" pairs in one column each. The list must split
     * them into the named pair the approval screen reads (current_time_in / current_time_out and
     * new_time_in / new_time_out).
     */
    public function an_alter_log_row_splits_its_comma_pairs_into_named_current_and_new_times()
    {
        $row = $this->requestRow([
            'table_name'    => 'alter_logs',
            'fourth_column' => '2026-08-03 09:12,2026-08-03 18:02',
            'fifth_column'  => '2026-08-03 09:00,2026-08-03 18:00',
            'status'        => 'pending',
        ]);

        $out = $this->requestList([$row]);

        $this->assertSame([
            'current_time_in'  => '2026-08-03 09:12',
            'current_time_out' => '2026-08-03 18:02',
        ], $out['result'][0]->fourth_column);
        $this->assertSame([
            'new_time_in'  => '2026-08-03 09:00',
            'new_time_out' => '2026-08-03 18:00',
        ], $out['result'][0]->fifth_column);
    }

    /**
     * @test
     * BUSINESS RULE — the empty arm of the same branch. An alter-log row saved without stored times
     * must still produce the four named keys, holding null, so the approval screen binds to a shape
     * it recognises instead of an empty string.
     */
    public function an_alter_log_row_with_no_stored_times_still_produces_the_named_pair_holding_nulls()
    {
        $row = $this->requestRow([
            'table_name'    => 'alter_logs',
            'fourth_column' => null,
            'fifth_column'  => '',
            'status'        => 'pending',
        ]);

        $out = $this->requestList([$row]);

        $this->assertSame(['current_time_in' => null, 'current_time_out' => null],
            $out['result'][0]->fourth_column);
        $this->assertSame(['new_time_in' => null, 'new_time_out' => null],
            $out['result'][0]->fifth_column);
    }

    /**
     * @test
     * FINDING REQ-PUNCH-SILENT-1 (characterisation).
     *
     * The alter-log-punch arm looks the punch row up by id and only rewrites the columns when it is
     * found. A request whose punch row has since been deleted keeps the raw id in the payload, so the
     * Request List shows a bare number where the "old punches / new punches" list belongs, with no
     * indication that anything is missing. Assert TODAY's behaviour; flip when a fallback is added.
     */
    public function an_alter_log_punch_row_whose_punch_record_is_gone_keeps_the_raw_id_FINDING_REQ_PUNCH_SILENT_1()
    {
        $row = $this->requestRow([
            'table_name'    => 'alter_log_punches',
            'fourth_column' => 999999999,          // an id that cannot exist
            'fifth_column'  => 999999999,
            'status'        => 'pending',
        ]);

        $out = $this->requestList([$row]);

        $this->assertSame(999999999, $out['result'][0]->fourth_column);
        $this->assertSame(999999999, $out['result'][0]->fifth_column);
        $this->assertSame('Pending', $out['result'][0]->status);
    }

    /**
     * @test
     * BUSINESS RULE — the found arm: a real punch record is expanded into a numbered, human readable
     * list of old punches and new punches, one entry per punch pair, so the approver can compare them
     * line by line.
     */
    public function an_alter_log_punch_row_expands_the_stored_punches_into_a_numbered_list()
    {
        $punch = AlterLogPunch::whereNotNull('old_punch')->whereNotNull('new_punch')
            ->orderBy('id', 'desc')->first();
        if (!$punch) $this->markTestSkipped('no alter_log_punches_new row in test DB');

        $old = json_decode($punch->old_punch);
        $new = json_decode($punch->new_punch);
        if (!is_array($old) || !is_array($new) || count($old) === 0 || count($new) === 0) {
            $this->markTestSkipped('probed punch row does not carry both punch lists');
        }
        foreach ($old as $o) {
            if (!isset($o->time_in) || !isset($o->time_out)) {
                $this->markTestSkipped('probed punch row old_punch is not in the time_in/time_out shape');
            }
        }
        foreach ($new as $n) {
            if (!isset($n->start_time) || !isset($n->end_time)) {
                $this->markTestSkipped('probed punch row new_punch is not in the start_time/end_time shape');
            }
        }

        $row = $this->requestRow([
            'table_name'    => 'alter_log_punches',
            'fourth_column' => $punch->id,
            'fifth_column'  => $punch->id,
            'status'        => 'pending',
        ]);

        $out = $this->requestList([$row]);

        $this->assertCount(count($old), $out['result'][0]->fourth_column);
        $this->assertCount(count($new), $out['result'][0]->fifth_column);
        // numbering is 1-based and each entry is bracketed "n.[in|out]"
        $this->assertStringStartsWith('1.[', $out['result'][0]->fourth_column[0]);
        $this->assertStringStartsWith('1.[', $out['result'][0]->fifth_column[0]);
        $this->assertStringEndsWith(']  ', $out['result'][0]->fourth_column[0]);
        // each entry carries the pair separated by a pipe: "n.[in|out]  "
        $this->assertStringContainsString('|', $out['result'][0]->fifth_column[0]);
    }

    /**
     * @test
     * BUSINESS RULE — the default arm. A request type the list does not special-case (work from home)
     * passes its columns through untouched; only the status is capitalised. This is the arm that keeps
     * a newly added request type from breaking the shared list.
     */
    public function an_unrecognised_request_type_passes_its_columns_through_untouched()
    {
        $row = $this->requestRow([
            'table_name'    => 'work_from_homes',
            'fourth_column' => '2026-08-03',
            'fifth_column'  => '2026-08-07',
            'status'        => 'pending',
        ]);

        $out = $this->requestList([$row]);

        $this->assertSame('2026-08-03', $out['result'][0]->fourth_column);
        $this->assertSame('2026-08-07', $out['result'][0]->fifth_column);
        $this->assertSame('Pending', $out['result'][0]->status);
    }

    /**
     * @test
     * BUSINESS RULE — the whole list is transformed in one pass: every row keeps its position and
     * every row gets its own arm applied, so a mixed page of request types is rendered correctly.
     */
    public function a_mixed_page_of_request_types_is_transformed_row_by_row_in_order()
    {
        $out = $this->requestList([
            $this->requestRow(['table_name' => 'overtimes', 'fifth_column' => 'rest_day_work', 'status' => 'approved']),
            $this->requestRow(['table_name' => 'alter_logs', 'fourth_column' => 'a,b', 'fifth_column' => 'c,d', 'status' => 'declined']),
            $this->requestRow(['table_name' => 'change_schedules', 'fourth_column' => json_encode(['x' => 1]), 'fifth_column' => json_encode(['y' => 2]), 'status' => 'pending']),
        ]);

        $this->assertCount(3, $out['result']);
        $this->assertSame('Rest Day Work', $out['result'][0]->fifth_column);
        $this->assertSame(['current_time_in' => 'a', 'current_time_out' => 'b'], $out['result'][1]->fourth_column);
        $this->assertSame(['x' => 1], $out['result'][2]->fourth_column);
        $this->assertSame(['Approved', 'Declined', 'Pending'],
            array_map(function ($r) { return $r->status; }, $out['result']));
    }

    /**
     * @test
     * BUSINESS RULE — the guard arm: no result set at all serialises as null, which is what the
     * controller's "no requests" response relies on.
     */
    public function a_null_request_list_serialises_as_null()
    {
        $this->assertNull((new RequestResource(null))->toArray($this->request));
    }
}
