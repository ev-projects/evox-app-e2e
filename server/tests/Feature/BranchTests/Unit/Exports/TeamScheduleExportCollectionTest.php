<?php

namespace Tests\Feature\BranchTests\Unit\Exports;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Exports\TeamScheduleExport;
use App\Modules\Department\Models\EvoxSubDepartment;
use App\Modules\User\Models\User;

/**
 * =====================================================================================================
 *  SOURCE UNDER TEST
 *      app/Exports/TeamScheduleExport.php :: collection (and the headings contract it feeds)
 *
 *  MENU PATH
 *      Reports -> Team Schedule -> Export
 *
 *  COVERAGE AT THE TIME OF WRITING
 *      TeamScheduleExport::collection  33.33%  (only the empty-data path had ever run)
 *
 *  WHY IT MATTERS. This is the spreadsheet a supervisor sends to payroll. Every row of the loop body
 *  was unexecuted, which is exactly how the missing EvoxSubDepartment import (EXP-TSE-1) survived: the
 *  export appeared to work because nothing ever fed it a row.
 *
 *  FINDINGS RAISED HERE
 *      EXP-TSE-12H-1  Duty times are written with `date("h:i:s", ...)` — TWELVE hour clock with no
 *                     AM/PM marker. An 18:00 duty-off is exported as "06:00:00", indistinguishable
 *                     from six in the morning, on every night shift in the file.
 * =====================================================================================================
 *
 *  METHOD. The export reads six members off each DTR row (user(), date, hasSchedule(),
 *  hasFlexibleSchedule(), the four timestamps, getDtrStatus()), so the rows are in-memory stand-ins
 *  carrying exactly those — no DTR is created and no schedule is generated. One bounded, indexed probe
 *  supplies a real sub-department, because the export resolves the department name through it.
 */
class TeamScheduleExportCollectionTest extends TestCase
{
    use DatabaseTransactions;

    /** 2026-08-03, 09:00:00 and 18:00:00 UTC; flexy window 08:00:00 to 19:00:00 UTC. */
    const START       = 1785747600;
    const END         = 1785780000;
    const FLEXY_START = 1785744000;
    const FLEXY_END   = 1785783600;

    /** @var EvoxSubDepartment */
    private $subDepartment;

    /** @var User */
    private $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->subDepartment = EvoxSubDepartment::whereNotNull('Name')->orderBy('Id', 'desc')->first();
        if (!$this->subDepartment) $this->markTestSkipped('no EVOX_SUB_DEPARTMENT row in test DB');

        $this->employee = User::orderBy('id', 'desc')->first();
        if (!$this->employee) $this->markTestSkipped('no user row in test DB');
    }

    private function row(bool $hasSchedule, bool $hasFlexible, array $status)
    {
        return new TseFakeScheduleRow(
            '2026-08-03',
            new TseFakeUser($this->employee->id, $this->employee->getFullName(3), $this->subDepartment->Id),
            $hasSchedule,
            $hasFlexible,
            $status,
            self::START, self::END, self::FLEXY_START, self::FLEXY_END
        );
    }

    /**
     * @test
     * BUSINESS RULE — an exported row identifies WHO (id, name, sub-department), WHEN (date), the duty
     * window, the flexible window when the shift has one, and the day's status as a single readable
     * cell. The columns must be produced in the order the headings declare them, or every value in the
     * spreadsheet lands under the wrong title.
     *
     * FINDING EXP-TSE-12H-1 is pinned here: an 18:00 duty-off is written as "06:00:00".
     */
    public function a_scheduled_row_exports_the_duty_and_flexible_windows_against_the_declared_headings()
    {
        $export = new TeamScheduleExport();
        $export->data = [$this->row(true, true, ['present', 'late'])];

        $rows = $export->collection();

        $this->assertCount(1, $rows);
        $this->assertSame([
            'id'          => $this->employee->id,
            'name'        => $this->employee->getFullName(3),
            'department'  => $this->subDepartment->Name,
            'date'        => '2026-08-03',
            'on_duty'     => '09:00:00',
            'off_duty'    => '06:00:00',      // FINDING EXP-TSE-12H-1 — this is 18:00, on a 12h clock
            'flexy_start' => '08:00:00',
            'flexy_off'   => '07:00:00',      // FINDING EXP-TSE-12H-1 — this is 19:00
            'status'      => 'present late',
        ], $rows->first());

        // the value order matches the heading order one for one
        $this->assertSame(
            ['# ID', 'Name', 'Department', 'Date', 'Duty On', 'Duty Off', 'Flexi Start', 'Flexi End', 'Status '],
            $export->headings()
        );
        $this->assertCount(count($export->headings()), $rows->first());
    }

    /**
     * @test
     * BUSINESS RULE — a fixed shift (no flexible window) must leave the two flexi columns EMPTY rather
     * than repeating the duty times, so payroll can tell a fixed shift from a flexible one.
     */
    public function a_fixed_shift_exports_empty_flexible_columns()
    {
        $export = new TeamScheduleExport();
        $export->data = [$this->row(true, false, ['present'])];

        $row = $export->collection()->first();

        $this->assertSame('09:00:00', $row['on_duty']);
        $this->assertSame('06:00:00', $row['off_duty']);
        $this->assertSame('', $row['flexy_start']);
        $this->assertSame('', $row['flexy_off']);
        $this->assertSame('present', $row['status']);
    }

    /**
     * @test
     * BUSINESS RULE — a date with no schedule at all still produces a row for that employee, with all
     * four time columns empty and the status still filled in (rest day, absent, on leave). Dropping the
     * row instead would misalign the employee's line across dates in the spreadsheet.
     */
    public function an_unscheduled_date_still_exports_a_row_with_empty_times()
    {
        $export = new TeamScheduleExport();
        $export->data = [$this->row(false, false, ['rest_day'])];

        $row = $export->collection()->first();

        $this->assertSame($this->employee->id, $row['id']);
        $this->assertSame('2026-08-03', $row['date']);
        $this->assertSame('', $row['on_duty']);
        $this->assertSame('', $row['off_duty']);
        $this->assertSame('', $row['flexy_start']);
        $this->assertSame('', $row['flexy_off']);
        $this->assertSame('rest_day', $row['status']);
    }

    /**
     * @test
     * BUSINESS RULE — the export walks the whole selection: every row handed to it produces exactly
     * one spreadsheet row, in order, mixed shift types included.
     */
    public function every_selected_row_produces_one_spreadsheet_row_in_order()
    {
        $export = new TeamScheduleExport();
        $export->data = [
            $this->row(true, true, ['present']),
            $this->row(false, false, ['absent']),
            $this->row(true, false, ['present', 'undertime']),
        ];

        $rows = $export->collection();

        $this->assertCount(3, $rows);
        $this->assertSame(['present', 'absent', 'present undertime'],
            $rows->pluck('status')->all());
        $this->assertSame(['08:00:00', '', ''], $rows->pluck('flexy_start')->all());
    }

    /**
     * @test
     * BUSINESS RULE — exporting an empty selection produces an empty spreadsheet body, not an error:
     * the headings are still written so the file opens.
     */
    public function an_empty_selection_exports_no_rows_but_still_declares_its_headings()
    {
        $export = new TeamScheduleExport();
        $export->data = [];

        $this->assertCount(0, $export->collection());
        $this->assertCount(9, $export->headings());
    }
}

/** Stand-in for the User the export reads off a DTR row: id, full name and sub-department id. */
class TseFakeUser
{
    public $id;
    public $SubDepartmentID;
    private $fullName;

    public function __construct($id, $fullName, $subDepartmentId)
    {
        $this->id = $id;
        $this->fullName = $fullName;
        $this->SubDepartmentID = $subDepartmentId;
    }

    public function getFullName($format = null)
    {
        return $this->fullName;
    }
}

/** The user() relation — the export only calls ->first() on it (three times per row). */
class TseFakeUserRelation
{
    private $user;

    public function __construct($user)
    {
        $this->user = $user;
    }

    public function first()
    {
        return $this->user;
    }
}

/** Stand-in for one generated DTR row as TeamScheduleExport::collection() consumes it. */
class TseFakeScheduleRow
{
    public $date;
    public $start_datetime;
    public $end_datetime;
    public $start_flexy_datetime;
    public $end_flexy_datetime;

    private $user;
    private $hasSchedule;
    private $hasFlexible;
    private $status;

    public function __construct($date, $user, $hasSchedule, $hasFlexible, array $status,
                                $start, $end, $flexyStart, $flexyEnd)
    {
        $this->date = $date;
        $this->user = $user;
        $this->hasSchedule = $hasSchedule;
        $this->hasFlexible = $hasFlexible;
        $this->status = $status;
        $this->start_datetime = $start;
        $this->end_datetime = $end;
        $this->start_flexy_datetime = $flexyStart;
        $this->end_flexy_datetime = $flexyEnd;
    }

    public function user()
    {
        return new TseFakeUserRelation($this->user);
    }

    public function hasSchedule()
    {
        return $this->hasSchedule;
    }

    public function hasFlexibleSchedule()
    {
        return $this->hasFlexible;
    }

    public function getDtrStatus()
    {
        return $this->status;
    }
}
