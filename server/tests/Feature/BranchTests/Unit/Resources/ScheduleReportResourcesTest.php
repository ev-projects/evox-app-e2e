<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use Illuminate\Http\Request;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\Report\Resources\TeamScheduleResources;
use App\Modules\Report\Resources\WeeklyScheduleResources;
use App\Modules\User\Models\User;

/**
 * =====================================================================================================
 *  SOURCE UNDER TEST
 *      app/Modules/Report/Resources/TeamScheduleResources.php   :: __construct + toArray
 *      app/Modules/Report/Resources/WeeklyScheduleResources.php :: __construct + toArray
 *
 *  MENU PATH
 *      Reports -> Team Schedule       (TeamScheduleResources — the grid with the week banding)
 *      Reports -> Weekly Schedule     (WeeklyScheduleResources — the same grid, one week at a time)
 *
 *  COVERAGE AT THE TIME OF WRITING
 *      TeamScheduleResources::toArray    78.46%
 *      WeeklyScheduleResources::toArray  77.05%
 *
 *  WHAT WAS NEVER DRIVEN. Both resources were only ever exercised on a fully populated window, so
 *  three rules had never run: the placeholder row inserted for an employee who has NO generated
 *  schedule on a date, the "show more" counter shrinking as terminated employees drop out of the
 *  window, and (Team Schedule only) the Sunday-to-Monday week boundary that draws the week bands.
 *
 *  WHAT A USER SEES. Every employee in the selected team must occupy a row on every date in the
 *  window, whether or not a schedule was generated for them — a missing row silently shifts the whole
 *  grid and a supervisor reads the wrong person's shift.
 *
 *  FINDINGS RAISED HERE
 *      WSR-NOWEEK-1  WeeklyScheduleResources computes `$prev_day` on every iteration and never reads
 *                    it: the week-boundary tracking its Team Schedule sibling uses was copied in
 *                    without the code that consumes it, so the weekly grid emits no week bands at all.
 * =====================================================================================================
 *
 *  METHOD. The rows are in-memory stand-ins carrying exactly the four members these resources touch
 *  (date, user(), getDtrStatus(), getStartSchedule()) — the resources never look at anything else, so
 *  no DTR row is created and no schedule is generated. Two real user ids ARE required, because the
 *  placeholder arm resolves missing employees with `User::find($id)->getFullName(3)`; they are read
 *  with one bounded, indexed probe and nothing is written.
 */
class ScheduleReportResourcesTest extends TestCase
{
    use DatabaseTransactions;

    const SUNDAY = '2026-08-02';
    const MONDAY = '2026-08-03';

    /** @var Request */
    private $request;

    /** @var User */
    private $employeeA;

    /** @var User */
    private $employeeB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->request = Request::create('/api/probe', 'GET');

        $users = User::orderBy('id', 'desc')->limit(2)->get();
        if (count($users) < 2) $this->markTestSkipped('need two user rows in test DB');

        $this->employeeA = $users[0];
        $this->employeeB = $users[1];
    }

    private function row(string $date, User $owner, array $schedule = null, array $status = null)
    {
        return new TsrFakeScheduleRow(
            $date,
            new TsrFakeUser($owner->id, $owner->getFullName(3)),
            $schedule === null ? ['start_time' => '09:00', 'end_time' => '18:00'] : $schedule,
            $status === null ? ['present'] : $status
        );
    }

    private function holidays()
    {
        return [
            (object) ['date' => '2026-08-03', 'name' => 'Ninoy Aquino Day', 'type' => 'special'],
        ];
    }

    private function userCollection()
    {
        return collect([
            (object) ['id' => $this->employeeA->id],
            (object) ['id' => $this->employeeB->id],
        ]);
    }

    // =================================================================================================
    //  TeamScheduleResources — Reports -> Team Schedule
    // =================================================================================================

    /**
     * @test
     * BUSINESS RULE — every selected employee occupies one row on every date in the window. Employee B
     * has no generated schedule on either date, so the grid must still show B on both, with an empty
     * shift and an empty status, in the same order the team was selected.
     *
     * The window opens on a Sunday and runs into Monday, so this also pins the week banding: the grid
     * closes the first week at Sunday and opens a new one on Monday.
     */
    public function every_selected_employee_gets_a_row_on_every_date_even_with_no_generated_schedule()
    {
        $rows = [
            $this->row(self::SUNDAY, $this->employeeA),
            $this->row(self::MONDAY, $this->employeeA, ['start_time' => '13:00', 'end_time' => '22:00'], ['rest_day']),
        ];

        $out = (new TeamScheduleResources(
            $rows,
            ['number_of_employee' => 8, 'termination_date_list' => [self::MONDAY]],
            $this->holidays(),
            $this->userCollection()
        ))->toArray($this->request);

        // ---- both dates carry both employees, the scheduled one first
        $this->assertSame([self::SUNDAY, self::MONDAY], array_keys($out['data']));
        $this->assertCount(2, $out['data'][self::SUNDAY]);
        $this->assertCount(2, $out['data'][self::MONDAY]);

        $this->assertSame($this->employeeA->getFullName(3), $out['data'][self::SUNDAY][0]['Name']);
        $this->assertSame(['start_time' => '09:00', 'end_time' => '18:00'],
            $out['data'][self::SUNDAY][0]['Schedule']);
        $this->assertSame(['present'], $out['data'][self::SUNDAY][0]['type']);

        // ---- the placeholder row: named, but with no shift and no status
        $this->assertSame($this->employeeB->getFullName(3), $out['data'][self::SUNDAY][1]['Name']);
        $this->assertSame([], $out['data'][self::SUNDAY][1]['Schedule']);
        $this->assertSame([], $out['data'][self::SUNDAY][1]['type']);
        $this->assertSame($this->employeeB->getFullName(3), $out['data'][self::MONDAY][1]['Name']);
        $this->assertSame([], $out['data'][self::MONDAY][1]['Schedule']);

        $this->assertSame(['start_time' => '13:00', 'end_time' => '22:00'],
            $out['data'][self::MONDAY][0]['Schedule']);
        $this->assertSame(['rest_day'], $out['data'][self::MONDAY][0]['type']);

        // ---- week banding: the Sunday week is closed, a new week opens on Monday
        $this->assertSame([['Sunday', 'Sunday'], ['Monday', 'Monday']], $out['week_list']);

        // ---- 8 employees against 5 rows per date: the "show more" link stays on both dates, even
        //      after the Monday termination takes the headcount down to 7
        $this->assertSame([self::SUNDAY => true, self::MONDAY => true], $out['date_list']);

        // ---- holidays are keyed by month-day so the grid can shade the column
        $this->assertSame(['08-03' => ['name' => 'Ninoy Aquino Day', 'type' => 'special']],
            $out['holiday_list']);
    }

    /**
     * @test
     * BUSINESS RULE — the other arm of the "show more" counter. Terminations inside the window reduce
     * the headcount for the dates that follow them; once the remaining headcount fits on one page the
     * link must disappear, on the opening date and on every later date.
     */
    public function the_show_more_link_disappears_once_terminations_bring_the_team_under_one_page()
    {
        $rows = [
            $this->row(self::SUNDAY, $this->employeeA),
            $this->row(self::MONDAY, $this->employeeA),
        ];

        $out = (new TeamScheduleResources(
            $rows,
            ['number_of_employee' => 5, 'termination_date_list' => [self::SUNDAY, self::MONDAY]],
            [],
            collect([(object) ['id' => $this->employeeA->id]])
        ))->toArray($this->request);

        $this->assertSame([self::SUNDAY => false, self::MONDAY => false], $out['date_list']);
        $this->assertCount(1, $out['data'][self::SUNDAY]);
        $this->assertCount(1, $out['data'][self::MONDAY]);
        $this->assertSame([], $out['holiday_list']);
    }

    /**
     * @test
     * BUSINESS RULE — a window with no schedules at all (a team with nothing generated yet) renders an
     * empty grid rather than failing: no data, no dates, no week bands — but the holiday shading is
     * still returned, because the calendar header is drawn from it.
     */
    public function an_empty_window_returns_an_empty_grid_but_still_returns_the_holidays()
    {
        $out = (new TeamScheduleResources(
            [],
            ['number_of_employee' => 8, 'termination_date_list' => []],
            $this->holidays(),
            $this->userCollection()
        ))->toArray($this->request);

        $this->assertSame([], $out['data']);
        $this->assertSame([], $out['date_list']);
        $this->assertSame([], $out['week_list']);
        $this->assertSame(['08-03' => ['name' => 'Ninoy Aquino Day', 'type' => 'special']],
            $out['holiday_list']);
    }

    // =================================================================================================
    //  WeeklyScheduleResources — Reports -> Weekly Schedule
    // =================================================================================================

    /**
     * @test
     * BUSINESS RULE — the weekly grid follows the same rule as the team grid: every selected employee
     * appears on every date, with a placeholder row where nothing was generated.
     *
     * FINDING WSR-NOWEEK-1 is pinned in the same pass — the weekly payload has NO week_list key at
     * all, even though the resource still computes the week boundary variable its sibling uses.
     */
    public function the_weekly_grid_fills_in_a_placeholder_row_for_every_employee_without_a_schedule()
    {
        $rows = [
            $this->row(self::SUNDAY, $this->employeeA),
            $this->row(self::MONDAY, $this->employeeA, ['start_time' => '13:00', 'end_time' => '22:00'], ['present']),
        ];

        $out = (new WeeklyScheduleResources(
            $rows,
            ['number_of_employee' => 8, 'termination_date_list' => [self::MONDAY]],
            $this->holidays(),
            $this->userCollection()
        ))->toArray($this->request);

        $this->assertSame([self::SUNDAY, self::MONDAY], array_keys($out['data']));
        $this->assertSame($this->employeeA->getFullName(3), $out['data'][self::SUNDAY][0]['Name']);
        $this->assertSame($this->employeeB->getFullName(3), $out['data'][self::SUNDAY][1]['Name']);
        $this->assertSame([], $out['data'][self::SUNDAY][1]['Schedule']);
        $this->assertSame([], $out['data'][self::MONDAY][1]['type']);

        $this->assertSame([self::SUNDAY => true, self::MONDAY => true], $out['date_list']);
        $this->assertSame(['08-03' => ['name' => 'Ninoy Aquino Day', 'type' => 'special']],
            $out['holiday_list']);

        // FINDING WSR-NOWEEK-1 — no week banding is emitted here, unlike Reports -> Team Schedule
        $this->assertSame(['data', 'date_list', 'holiday_list'], array_keys($out));
    }

    /**
     * @test
     * BUSINESS RULE — the weekly grid's "show more" counter obeys the same termination rule as the
     * team grid.
     */
    public function the_weekly_show_more_link_disappears_once_terminations_bring_the_team_under_one_page()
    {
        $rows = [
            $this->row(self::SUNDAY, $this->employeeA),
            $this->row(self::MONDAY, $this->employeeA),
        ];

        $out = (new WeeklyScheduleResources(
            $rows,
            ['number_of_employee' => 5, 'termination_date_list' => [self::SUNDAY, self::MONDAY]],
            [],
            collect([(object) ['id' => $this->employeeA->id]])
        ))->toArray($this->request);

        $this->assertSame([self::SUNDAY => false, self::MONDAY => false], $out['date_list']);
        $this->assertCount(1, $out['data'][self::MONDAY]);
    }

    /**
     * @test
     * BUSINESS RULE — an empty weekly window renders an empty grid and still returns the holidays.
     */
    public function an_empty_weekly_window_returns_an_empty_grid_but_still_returns_the_holidays()
    {
        $out = (new WeeklyScheduleResources(
            [],
            ['number_of_employee' => 8, 'termination_date_list' => []],
            $this->holidays(),
            $this->userCollection()
        ))->toArray($this->request);

        $this->assertSame([], $out['data']);
        $this->assertSame([], $out['date_list']);
        $this->assertSame(['08-03' => ['name' => 'Ninoy Aquino Day', 'type' => 'special']],
            $out['holiday_list']);
    }
}

/**
 * Stand-in for the User instance the schedule grids read off a DTR row: they call getFullName(3) and
 * read the id, nothing else.
 */
class TsrFakeUser
{
    public $id;
    private $fullName;

    public function __construct($id, $fullName)
    {
        $this->id = $id;
        $this->fullName = $fullName;
    }

    public function getFullName($format = null)
    {
        return $this->fullName;
    }
}

/** The user() relation on a DTR row — the grids only ever call ->first() on it. */
class TsrFakeUserRelation
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

/**
 * Stand-in for one generated schedule row. The two grid resources touch exactly four members:
 * ->date, ->user()->first(), ->getDtrStatus() and ->getStartSchedule().
 */
class TsrFakeScheduleRow
{
    public $date;
    private $user;
    private $schedule;
    private $status;

    public function __construct($date, $user, array $schedule, array $status)
    {
        $this->date = $date;
        $this->user = $user;
        $this->schedule = $schedule;
        $this->status = $status;
    }

    public function user()
    {
        return new TsrFakeUserRelation($this->user);
    }

    public function getStartSchedule()
    {
        return $this->schedule;
    }

    public function getDtrStatus()
    {
        return $this->status;
    }
}
