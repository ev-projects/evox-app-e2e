<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Report/Repositories/ReportRepository.php
 *       ::get_my_dtr_notifications   ::get_team_attendance
 *       ::get_dtr_summary            ::get_dtr_summary_block
 *
 * MENU PATH
 *   Dashboard -> My DTR notifications   (get_my_dtr_notifications)
 *   Dashboard -> Team attendance        (get_team_attendance)
 *   Reports -> DTR Summary              (get_dtr_summary, get_dtr_summary_block)
 *
 * COVERAGE BEFORE THIS FILE
 *   get_my_dtr_notifications  75.00% of lines
 *   get_team_attendance       81.25% of lines
 *   get_dtr_summary           77.27% of lines
 *   get_dtr_summary_block     94.62% of lines
 *
 * HOW THE STORED PROCEDURES ARE HANDLED
 *   Two procedures sit on these paths — SP_DTR_By_UserId (notifications) and EH_SP_Employee_List
 *   (reached through User::users_handled from team attendance). Both are intercepted by the
 *   Tests\Support\CallSpFake seam, which also caps the size of the team: the faked employee list
 *   names exactly one person, so the attendance query can only ever read that person's days.
 *
 * FINDINGS
 *   _FINDING_ATT_WINDOW_COLLAPSE  get_team_attendance means to look six hours either side of now,
 *                                 but builds both ends from the SAME mutable Carbon instance, so
 *                                 the window is zero seconds wide. See the tests of that name.
 */

namespace Tests\Feature\BranchTests\Reports\DTR;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Tests\Feature\BranchTests\Support\DtrFixtureTrait;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\EvoxLevels;
use App\Modules\Department\Models\EvoxSubDepartment;
use App\Modules\Report\Repositories\ReportRepository;
use App\Modules\User\Models\User;

class ReportRepositoryBranchTest extends TestCase
{
    use DatabaseTransactions, DtrFixtureTrait;

    /** @var ReportRepository */
    private $repo;

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();
        $this->repo = $this->app->make(ReportRepository::class);
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        parent::tearDown();
    }

    /**
     * The fixture employee, additionally required to have a resolvable sub-department: both summary
     * methods dereference EvoxSubDepartment::…->first()->Name with no null guard.
     */
    private function summarisableUser()
    {
        $user = $this->requireFixtureUser();
        foreach ([$user->department_id, $user->SubDepartmentID] as $id) {
            if (is_valid($id) && !EvoxSubDepartment::where('Id', $id)->exists()) {
                $this->markTestSkipped(
                    'the probe employee points at a sub-department that no longer exists; both '
                    . 'summary methods dereference it without a null guard'
                );
            }
        }
        return $user;
    }

    private function userCollection(User $user)
    {
        $collection = new EloquentCollection();
        $collection->push($user);
        return $collection;
    }

    // =======================================================================================
    // get_my_dtr_notifications
    // =======================================================================================

    // The procedure returns five sets; the notifications panel needs three of them, and it needs
    // them in a particular order — records, leaves, requests — because MyDtrNotificationsResource
    // reads them by position.
    /** @test */
    public function the_notifications_feed_returns_the_days_the_leaves_and_the_requests_in_that_order()
    {
        $user = $this->requireFixtureUser();
        $records  = [(object) ['dtr_id' => 1]];
        $summary  = [(object) ['Late' => 0]];
        $holidays = [(object) ['dtr_id' => 1, 'name' => 'ignored here']];
        $leaves   = [(object) ['dtr_id' => 1, 'type' => 'Vacation Leave']];
        $requests = [(object) ['dtr_id' => 1, 'type' => 'overtime']];
        CallSpFake::fake('SP_DTR_By_UserId', [$records, $summary, $holidays, $leaves, $requests]);

        $result = $this->repo->get_my_dtr_notifications($this->fixtureDate(0), $this->fixtureDate(1));

        $this->assertCount(3, $result);
        $this->assertSame($records, $result[0]);
        $this->assertSame($leaves, $result[1]);
        $this->assertSame($requests, $result[2]);
        // the holiday set is deliberately not part of the notifications payload
        $this->assertNotContains($holidays, $result);

        $calls = CallSpFake::callsFor('SP_DTR_By_UserId');
        $this->assertSame([$user->id, $this->fixtureDate(0), $this->fixtureDate(1)], $calls[0]['params']);
    }

    // The feed asks only about the signed-in employee — it never takes a user id from the caller.
    /** @test */
    public function the_notifications_feed_only_ever_asks_about_the_signed_in_employee()
    {
        $me = $this->requireFixtureUser();
        $someone_else = User::where('id', '!=', $me->id)->where('is_active', 1)->first();
        if (!$someone_else) {
            $this->markTestSkipped('this database holds only one active employee');
        }
        CallSpFake::fake('SP_DTR_By_UserId', [[], [], [], [], []]);

        $this->repo->get_my_dtr_notifications($this->fixtureDate(0), $this->fixtureDate(1));

        $params = CallSpFake::callsFor('SP_DTR_By_UserId')[0]['params'];
        $this->assertSame($me->id, $params[0]);
        $this->assertNotSame($someone_else->id, $params[0]);
    }

    // A failing procedure is not swallowed: the caller has to know the feed could not be built.
    /** @test */
    public function a_failing_procedure_is_reported_rather_than_returned_as_an_empty_feed()
    {
        $this->requireFixtureUser();
        CallSpFake::fake('SP_DTR_By_UserId', function () {
            throw new \RuntimeException('procedure unavailable');
        });

        $this->expectException(\RuntimeException::class);
        $this->repo->get_my_dtr_notifications($this->fixtureDate(0), $this->fixtureDate(1));
    }

    // =======================================================================================
    // get_team_attendance
    // =======================================================================================

    /**
     * A supervisor-shaped account whose team list comes from EH_SP_Employee_List, with that
     * procedure faked to name exactly one employee: the fixture user.
     */
    private function actAsSupervisorOf(User $employee)
    {
        $level_names = ['SubDepartment Head', 'Department Head', 'Division Head', 'DivisionHead',
                        'Board', 'Client', 'HR', 'Payroll'];
        $level_ids = EvoxLevels::where(function ($q) use ($level_names) {
            foreach ($level_names as $name) {
                $q->orWhere('Name', 'like', '%' . $name . '%');
            }
        })->pluck('LevelId')->all();
        if (!$level_ids) {
            $this->markTestSkipped('this database defines none of the supervising levels');
        }

        $supervisor = User::whereIn('LevelId', $level_ids)->where('is_active', 1)
                          ->orderBy('id', 'desc')->first();
        if (!$supervisor) {
            $this->markTestSkipped('no active account at a supervising level');
        }

        CallSpFake::fake('EH_SP_Employee_List', [
            [(object) ['id' => $employee->id]],
            [(object) ['CurrentPage' => 1]],
        ]);
        $this->be($supervisor);
        return $supervisor;
    }

    // The date arm: a day carrying the date being asked about is on the attendance list.
    /** @test */
    public function the_attendance_list_includes_a_team_members_day_dated_the_day_being_asked_about()
    {
        $employee = $this->requireFixtureUser();
        $today = $this->makeDtr(0);
        $this->actAsSupervisorOf($employee);

        $result = $this->repo->get_team_attendance(Carbon::parse($this->fixtureDate(0) . ' 12:00:00'));

        $this->assertContains($today->id, $result->pluck('id')->all());
    }

    /** @test */
    public function the_attendance_list_leaves_out_a_team_members_day_from_another_date()
    {
        $employee = $this->requireFixtureUser();
        $other_day = $this->makeDtr(3);
        $this->actAsSupervisorOf($employee);

        $result = $this->repo->get_team_attendance(Carbon::parse($this->fixtureDate(0) . ' 12:00:00'));

        $this->assertNotContains($other_day->id, $result->pluck('id')->all());
    }

    // Filtering by department narrows the team before the days are fetched.
    /** @test */
    public function filtering_by_a_department_the_team_member_is_not_in_empties_the_attendance_list()
    {
        $employee = $this->requireFixtureUser();
        $this->makeDtr(0);
        $this->actAsSupervisorOf($employee);
        $absent_department = (int) User::max('department_id') + 500000;
        request()->merge(['department_id' => $absent_department]);

        $result = $this->repo->get_team_attendance(Carbon::parse($this->fixtureDate(0) . ' 12:00:00'));

        $this->assertCount(0, $result);
    }

    // =======================================================================================
    // DEFECT — the six-hour attendance window is zero seconds wide
    // =======================================================================================
    //
    // get_team_attendance opens with
    //     $time_from = $current_time->subHour( 6 );
    //     $time_to   = $current_time->addHour( 6 );
    // On Carbon 1.x (which Laravel 5.7 ships) subHour() and addHour() MUTATE the receiver and return
    // it, so both variables are the same object: subtracting six hours and adding them back leaves
    // it at the original instant. The four BETWEEN clauses therefore read
    // "BETWEEN now AND now" — a window one second wide at best — and the whole feature falls back
    // on its final `date = today` clause.
    //
    // Visible effect: the dashboard's team attendance panel only ever lists colleagues whose day
    // carries today's date. A night shift that started yesterday evening and is still running — the
    // exact case the six-hour window exists for — is missing from the panel.
    //
    // Nothing here is test-environment specific; the same Carbon version runs in production. The
    // assertions record TODAY's behaviour, so widening the window correctly will fail them.
    /** @test */
    public function a_shift_three_hours_away_is_missing_from_the_attendance_list_FINDING_ATT_WINDOW_COLLAPSE()
    {
        $employee = $this->requireFixtureUser();
        $moment = Carbon::parse($this->fixtureDate(0) . ' 12:00:00');
        // dated the NEXT day, so only the time window could pull it in — and it sits three hours
        // inside the six-hour window the code means to use
        $near_shift = $this->makeDtr(1, [
            'start_datetime' => $moment->timestamp + 3 * 3600,
            'end_datetime'   => $moment->timestamp + 8 * 3600,
        ]);
        $this->actAsSupervisorOf($employee);

        $result = $this->repo->get_team_attendance(Carbon::parse($this->fixtureDate(0) . ' 12:00:00'));

        $this->assertNotContains($near_shift->id, $result->pluck('id')->all(),
            'the six-hour window works now — flip this finding');
    }

    // The other half of the same defect: a shift starting at exactly the instant asked about IS
    // matched, which is only possible if the window has collapsed to that single instant.
    /** @test */
    public function only_a_shift_starting_at_that_exact_instant_is_matched_FINDING_ATT_WINDOW_COLLAPSE()
    {
        $employee = $this->requireFixtureUser();
        $moment = Carbon::parse($this->fixtureDate(0) . ' 12:00:00');
        $exact_shift = $this->makeDtr(1, [
            'start_datetime' => $moment->timestamp,
            'end_datetime'   => $moment->timestamp + 8 * 3600,
        ]);
        $this->actAsSupervisorOf($employee);

        $result = $this->repo->get_team_attendance(Carbon::parse($this->fixtureDate(0) . ' 12:00:00'));

        $this->assertContains($exact_shift->id, $result->pluck('id')->all(),
            'the window no longer collapses to a single instant — flip this finding');
    }

    // =======================================================================================
    // get_dtr_summary
    // =======================================================================================

    /** @test */
    public function the_dtr_summary_reports_each_employee_with_their_identity_and_their_totals()
    {
        $user = $this->summarisableUser();
        $this->scheduledDay(0, [
            'start' => '08:00:00', 'end' => '17:00:00',
            'in'    => '08:00:00', 'out' => '17:00:00',
            'break' => 3600,
        ]);

        $result = $this->repo->get_dtr_summary(
            $this->userCollection($user), $this->fixtureDate(0), $this->fixtureDate(1)
        );

        $this->assertArrayHasKey('summary', $result);
        $this->assertArrayHasKey('column', $result);
        $this->assertCount(1, $result['summary']);
        $info = $result['summary'][0]['employee_info'];
        $this->assertSame($user->emp_num, $info['employee_id']);
        $this->assertSame($user->first_name . ' ' . $user->last_name, $info['name']);
        $this->assertSame($user->employment_status, $info['status']);
        $this->assertSame($user->country_zone()->country_time_zone, $info['timezone']);
        $this->assertArrayHasKey(get_constant('DTR_TYPE.regular'), $result['summary'][0]['summary']);
    }

    // The summary is per employee: two people in, two rows out, each with their own totals.
    /** @test */
    public function the_dtr_summary_reports_one_row_per_employee_asked_for()
    {
        $user = $this->summarisableUser();
        $second = User::where('id', '!=', $user->id)
                      ->where('is_active', 1)
                      ->whereNotNull('country_id')
                      ->whereIn('country_id', DB::table('utc_timelog')->pluck('country_id')->all())
                      ->orderBy('id', 'desc')->first();
        if (!$second) {
            $this->markTestSkipped('no second employee with a utc_timelog-backed country');
        }
        if (is_valid($second->department_id) && !EvoxSubDepartment::where('Id', $second->department_id)->exists()) {
            $this->markTestSkipped('the second employee points at a missing sub-department');
        }

        $collection = $this->userCollection($user);
        $collection->push($second);

        $result = $this->repo->get_dtr_summary($collection, $this->fixtureDate(0), $this->fixtureDate(1));

        $this->assertCount(2, $result['summary']);
        $this->assertSame($user->emp_num, $result['summary'][0]['employee_info']['employee_id']);
        $this->assertSame($second->emp_num, $result['summary'][1]['employee_info']['employee_id']);
    }

    /** @test */
    public function asking_for_no_employees_returns_an_empty_summary_with_the_column_list_intact()
    {
        $result = $this->repo->get_dtr_summary(
            new EloquentCollection(), $this->fixtureDate(0), $this->fixtureDate(1)
        );

        $this->assertSame([], $result['summary']);
        $this->assertArrayHasKey(get_constant('DTR_TYPE.rest_day'), $result['column']);
        // unlike the block report, this one leaves the regular column in the list
        $this->assertArrayHasKey(get_constant('DTR_TYPE.regular'), $result['column']);
    }

    // =======================================================================================
    // get_dtr_summary_block
    // =======================================================================================
    //
    // This one reads the pre-aggregated drt_summary_report table rather than recomputing, so the
    // fixture writes a row there directly — the same shape the DTR triggers write.

    /** @test */
    public function the_summary_block_reports_rendered_hours_net_of_night_differential()
    {
        $user = $this->summarisableUser();
        DB::table('drt_summary_report')->insert([
            'login_date'         => $this->fixtureDate(0),
            'user_id'            => $user->id,
            'reg_rendered_hours' => 8,
            'reg_night_diff'     => 1,
            'reg_late'           => 0.5,
            'reg_overtime'       => 2,
        ]);

        $result = $this->repo->get_dtr_summary_block(
            $this->userCollection($user), $this->fixtureDate(0), $this->fixtureDate(1)
        );

        $regular = $result['summary'][0]['summary'][get_constant('DTR_TYPE.regular')];
        // 8 rendered less 1 of night differential
        $this->assertEquals(7, $regular[get_constant('PAYROLL_ITEMS.rendered_hours')]);
        $this->assertEquals(1, $regular[get_constant('PAYROLL_ITEMS.night_diff')]);
        $this->assertEquals(0.5, $regular[get_constant('PAYROLL_ITEMS.late')]);
        $this->assertEquals(2, $regular[get_constant('PAYROLL_ITEMS.overtime')]);
    }

    /** @test */
    public function the_summary_block_totals_every_day_in_the_range_and_ignores_days_outside_it()
    {
        $user = $this->summarisableUser();
        foreach ([0, 1] as $day) {
            DB::table('drt_summary_report')->insert([
                'login_date' => $this->fixtureDate($day), 'user_id' => $user->id,
                'reg_rendered_hours' => 8, 'reg_night_diff' => 0,
            ]);
        }
        DB::table('drt_summary_report')->insert([
            'login_date' => $this->fixtureDate(9), 'user_id' => $user->id,
            'reg_rendered_hours' => 8, 'reg_night_diff' => 0,
        ]);

        $result = $this->repo->get_dtr_summary_block(
            $this->userCollection($user), $this->fixtureDate(0), $this->fixtureDate(1)
        );

        $regular = $result['summary'][0]['summary'][get_constant('DTR_TYPE.regular')];
        $this->assertEquals(16, $regular[get_constant('PAYROLL_ITEMS.rendered_hours')]);
    }

    // An employee with nothing computed for the period gets a zeroed block rather than an error, so
    // the screen still renders for a new starter.
    /** @test */
    public function an_employee_with_nothing_computed_for_the_period_gets_a_zeroed_block()
    {
        $user = $this->summarisableUser();

        $result = $this->repo->get_dtr_summary_block(
            $this->userCollection($user), $this->fixtureDate(0), $this->fixtureDate(1)
        );

        $regular = $result['summary'][0]['summary'][get_constant('DTR_TYPE.regular')];
        $this->assertSame('0:00', $regular[get_constant('PAYROLL_ITEMS.rendered_hours')]);
        $this->assertSame('0:00', $regular[get_constant('PAYROLL_ITEMS.late')]);
        $rest_day = $result['summary'][0]['summary'][get_constant('DTR_TYPE.rest_day')];
        $this->assertSame('0:00', $rest_day[get_constant('PAYROLL_ITEMS.overtime')]);
    }

    // The column list follows the days actually in the range. Rest day, legal and special holiday
    // columns are always offered; a compound holiday is not, so a day carrying two legal holidays
    // is what proves the list is built from the data rather than fixed. The regular column is
    // always dropped, because it is the report's fixed first column.
    /** @test */
    public function the_summary_blocks_column_list_gains_a_column_for_a_compound_holiday_in_range()
    {
        $user = $this->summarisableUser();
        $dtr = $this->makeDtr(0);
        foreach (['first legal', 'second legal'] as $name) {
            $holiday = \App\Modules\Payroll\Models\Holiday::create([
                'name'          => $name,
                'date'          => $this->fixtureDate(0),
                'type'          => get_constant('DTR_TYPE.holiday.legal'),
                'is_predefined' => 0,
                'country_id'    => $user->country_id,
            ]);
            $dtr->holidays()->attach($holiday->id);
        }

        $result = $this->repo->get_dtr_summary_block(
            $this->userCollection($user), $this->fixtureDate(0), $this->fixtureDate(1)
        );

        // two legal holidays on one day compound into a DOUBLE legal holiday column
        $this->assertArrayHasKey(get_constant('DTR_TYPE.holiday.double_legal'), $result['column']);
        $this->assertArrayNotHasKey(get_constant('DTR_TYPE.regular'), $result['column']);
    }
}
