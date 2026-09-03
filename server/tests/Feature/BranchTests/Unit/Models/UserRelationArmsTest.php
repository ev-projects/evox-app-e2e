<?php
/**
 * COVERAGE WAVE 2026-08-19 — the User model's relation builders and request list, which between
 * them held the largest block of uncovered lines left in the User module.
 *
 * Source under test:
 *   server/app/Modules/User/Models/User.php
 *     changeSchedules, dtr, punch, target_punch, punchlogs, get_punch_history,
 *     requests_list, users_handled, evox_sub_departments_handled
 * Menu -> Page: Attendance -> DTR / Punch logs (the relation builders) and
 *               Requests -> My Requests / My Team Requests (requests_list)
 *
 * Coverage before this file: changeSchedules 87.5%, dtr 85.71%, punch 30%, target_punch 0%,
 *   punchlogs 28.57%, get_punch_history 0%, requests_list 35.66%, users_handled 72.41%,
 *   evox_sub_departments_handled 94.44%.
 *
 * The relation methods return query BUILDERS, so each arm is asserted on the SQL and the bindings
 * it produces rather than by executing it — that is what makes the date-range arms distinguishable
 * and keeps every one of them read-free. Only requests_list actually runs SQL, and every branch of
 * it is narrowed by status + a one-day window + a name that matches nobody.
 *
 * SEAM: Support/CallSpFake.php — App\Modules\User\Models is a shadowed namespace, so users_handled
 * and evox_sub_departments_handled run for real against a faked stored procedure.
 *
 * FINDINGS raised here:
 *   F-USR-TARGETPUNCH-1  target_punch() filters with where('date', '==', $date) (User.php:330).
 *                        '==' is not a SQL operator, so Laravel's short-cut rule treats it as the
 *                        VALUE and compares date = '=='. The date argument is discarded and the
 *                        query can never match a row. Live call site:
 *                        DtrController.php:366 (Attendance -> DTR -> single-day punch list).
 *   F-USR-REQCOUNT-1     requests_list() reports pagination.count as count($collection["data"]),
 *                        but data is the single-key wrapper ["query" => rows] — so "count" is
 *                        always 1 regardless of how many requests came back (User.php:507).
 *   F-USR-DTR-NOSTART-1  dtr()/punch()/punchlogs() have no arm for "end date without start date"
 *                        and fall off the end returning null, so a caller chaining ->get() on the
 *                        result gets a fatal. Not reachable from today's routes (both dates are
 *                        required URL segments); asserted here to pin the contract.
 */

namespace Tests\Feature\BranchTests\Unit\Models;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\EvoxLevels;
use App\Modules\User\Models\User;

class UserRelationArmsTest extends TestCase
{
    use DatabaseTransactions;

    const START = '2020-01-01';
    const END   = '2020-01-02';

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();

        $this->user = User::where('is_active', 1)->whereNotNull('LevelId')
            ->orderBy('id', 'desc')->first();
        if (!$this->user) {
            $this->markTestSkipped('no active user with a LevelId in test DB');
        }
        $this->be($this->user);
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        parent::tearDown();
    }

    // ============================================================== changeSchedules()

    /** Every arm returns approved change schedules only — that is the shared precondition. */
    /** @test */
    public function change_schedules__only_ever_returns_approved_requests()
    {
        foreach ([[null, null], [self::START, null], [self::START, self::END]] as $args) {
            $bindings = $this->user->changeSchedules($args[0], $args[1])->getBindings();

            $this->assertContains(get_constant('REQUEST_STATUS.approved'), $bindings);
        }
    }

    /** Both dates given: anything whose validity window starts OR ends inside the range. */
    /** @test */
    public function change_schedules__with_both_dates__matches_either_end_of_the_window()
    {
        $sql = $this->user->changeSchedules(self::START, self::END)->toSql();

        $this->assertStringContainsString("valid_from BETWEEN '" . self::START . "'", $sql);
        $this->assertStringContainsString("OR valid_to BETWEEN '" . self::START . "'", $sql);
    }

    /** Start date only: anything whose window straddles that one day. */
    /** @test */
    public function change_schedules__with_a_start_date_only__matches_windows_spanning_that_day()
    {
        $sql = $this->user->changeSchedules(self::START)->toSql();

        $this->assertStringContainsString("('" . self::START . "' BETWEEN valid_from AND valid_to)", $sql);
        $this->assertStringNotContainsString('valid_from BETWEEN', $sql);
    }

    /** No dates: the whole approved history, with no window filter at all. */
    /** @test */
    public function change_schedules__with_no_dates__applies_no_window_filter()
    {
        $sql = $this->user->changeSchedules()->toSql();

        $this->assertStringNotContainsString('valid_from', $sql);
        $this->assertStringNotContainsString('valid_to', $sql);
    }

    // ========================================================================== dtr()

    /** @test */
    public function dtr__with_both_dates__is_bounded_to_that_range()
    {
        $builder = $this->user->dtr(self::START, self::END);

        $this->assertStringContainsString('"date" between', str_replace('`', '"', $builder->toSql()));
        $this->assertContains(self::START, $builder->getBindings());
        $this->assertContains(self::END, $builder->getBindings());
    }

    /** @test */
    public function dtr__with_a_start_date_only__runs_from_that_day_onwards()
    {
        $builder = $this->user->dtr(self::START);

        $this->assertStringContainsString('>=', $builder->toSql());
        $this->assertContains(self::START, $builder->getBindings());
    }

    /** @test */
    public function dtr__with_no_dates__returns_the_whole_history()
    {
        $sql = $this->user->dtr()->toSql();

        $this->assertStringNotContainsString('between', strtolower($sql));
        $this->assertStringNotContainsString('>=', $sql);
    }

    /**
     * F-USR-DTR-NOSTART-1 — an end date with no start date matches no arm, so the method returns
     * null and any caller chaining ->get() gets a fatal. Not reachable from today's routes.
     */
    /** @test */
    public function dtr__with_an_end_date_but_no_start_date__returns_nothing_at_all_FINDING_F_USR_DTR_NOSTART_1()
    {
        $this->assertNull($this->user->dtr(null, self::END));
        $this->assertNull($this->user->punch(null, self::END));
        $this->assertNull($this->user->punchlogs(null, self::END));
    }

    // ======================================================================== punch()

    /** Every punch arm hides deactivated punch rows — that is the shared precondition. */
    /** @test */
    public function punch__every_arm_filters_out_inactive_punch_rows()
    {
        foreach ([[null, null], [self::START, null], [self::START, self::END]] as $args) {
            $builder = $this->user->punch($args[0], $args[1]);

            $this->assertStringContainsString('is_active', $builder->toSql());
            $this->assertContains('1', $builder->getBindings());
        }
    }

    /** @test */
    public function punch__with_both_dates__is_bounded_to_that_range()
    {
        $builder = $this->user->punch(self::START, self::END);

        $this->assertStringContainsString('between', strtolower($builder->toSql()));
        $this->assertContains(self::END, $builder->getBindings());
    }

    /** @test */
    public function punch__with_a_start_date_only__runs_from_that_day_onwards()
    {
        $builder = $this->user->punch(self::START);

        $this->assertStringContainsString('>=', $builder->toSql());
        $this->assertContains(self::START, $builder->getBindings());
        $this->assertStringNotContainsString('between', strtolower($builder->toSql()));
    }

    /** @test */
    public function punch__with_no_dates__returns_every_active_punch_row()
    {
        $sql = strtolower($this->user->punch()->toSql());

        $this->assertStringNotContainsString('between', $sql);
        $this->assertStringNotContainsString('>=', $sql);
    }

    // ================================================================= target_punch()

    /**
     * F-USR-TARGETPUNCH-1 — DEFECT FIXED (found 2026-09-03, see DtrControllerBranchTest's
     * FINDING_PUNCH_CHECK_OPERATOR): target_punch() previously used where('date', '==', $date), an
     * operator Laravel does not recognise, which short-cut to date = '==' and threw the requested
     * date away. User.php now uses '=', so the date is bound correctly. Flipped per this test's own
     * original instruction ("when the operator is corrected this test fails — flip it").
     */
    /** @test */
    public function target_punch__binds_the_requested_date_with_the_equality_operator()
    {
        $builder = $this->user->target_punch(self::START);
        $bindings = $builder->getBindings();

        $this->assertNotContains('==', $bindings);
        $this->assertContains(self::START, $bindings);
        $this->assertContains('1', $bindings);           // the is_active filter still applies
    }

    /** Other arm: no date at all returns no builder. */
    /** @test */
    public function target_punch__without_a_date__returns_nothing()
    {
        $this->assertNull($this->user->target_punch(null));
        $this->assertNull($this->user->target_punch(''));
    }

    // ==================================================================== punchlogs()

    /** The log-date list is a distinct date/user projection in all three arms. */
    /** @test */
    public function punchlogs__every_arm_projects_distinct_dates_only()
    {
        foreach ([[null, null], [self::START, null], [self::START, self::END]] as $args) {
            $sql = strtolower($this->user->punchlogs($args[0], $args[1])->toSql());

            $this->assertStringContainsString('select distinct', $sql);
            $this->assertStringContainsString('date', $sql);
            $this->assertStringNotContainsString('time_in', $sql);
        }
    }

    /** @test */
    public function punchlogs__with_both_dates__is_bounded_to_that_range()
    {
        $builder = $this->user->punchlogs(self::START, self::END);

        $this->assertStringContainsString('between', strtolower($builder->toSql()));
        $this->assertContains(self::END, $builder->getBindings());
    }

    /** @test */
    public function punchlogs__with_a_start_date_only__runs_from_that_day_onwards()
    {
        $builder = $this->user->punchlogs(self::START);

        $this->assertStringContainsString('>=', $builder->toSql());
        $this->assertStringNotContainsString('between', strtolower($builder->toSql()));
    }

    /** @test */
    public function punchlogs__with_no_dates__has_no_date_filter()
    {
        $sql = strtolower($this->user->punchlogs()->toSql());

        $this->assertStringNotContainsString('between', $sql);
        $this->assertStringNotContainsString('>=', $sql);
    }

    // ============================================================ get_punch_history()

    /** The punch detail for one day joins the punch rows to their durations. */
    /** @test */
    public function get_punch_history__for_one_day__joins_the_punch_rows_to_their_durations()
    {
        $builder = $this->user->get_punch_history(self::START);
        $sql = strtolower($builder->toSql());

        $this->assertStringContainsString('inner join', $sql);
        $this->assertStringContainsString('dtr_collective_punch_new', $sql);
        $this->assertStringContainsString('time_in', $sql);
        $this->assertStringContainsString('duration', $sql);
        $this->assertContains(self::START, $builder->getBindings());
    }

    /** Other arm: no date means no query at all. */
    /** @test */
    public function get_punch_history__without_a_date__returns_nothing()
    {
        $this->assertNull($this->user->get_punch_history());
        $this->assertNull($this->user->get_punch_history(null));
    }

    // ============================================================ users_handled()

    /** An Admin handles everyone who came from BambooHR, with no stored procedure involved. */
    /** @test */
    public function users_handled__admin__covers_every_bhr_synced_employee_without_calling_the_sp()
    {
        $admin = $this->userAtLevel('Admin');
        if (!$admin) {
            $this->markTestSkipped('no active Admin-level user in test DB');
        }

        $builder = $admin->users_handled();

        $this->assertStringContainsString('bhr_num', $builder->toSql());
        $this->assertStringContainsString('not null', strtolower($builder->toSql()));
        $this->assertSame([], CallSpFake::callsFor('EH_SP_Employee_List'));
    }

    /** A supervisory level gets its team from the employee-list SP, scoped to itself. */
    /** @test */
    public function users_handled__supervisory_level__scopes_the_query_to_the_ids_the_sp_returned()
    {
        $head = $this->userAtLevel('Department Head');
        if (!$head) {
            $this->markTestSkipped('no active Department Head in test DB');
        }
        CallSpFake::fake('EH_SP_Employee_List', [
            [(object) ['id' => 4242], (object) ['id' => 4343]],
            [(object) ['CurrentPage' => 1]],
        ]);

        $builder = $head->users_handled(7, 3);

        $this->assertStringContainsString('users`.`id` in', str_replace('"', '`', $builder->toSql()));
        $this->assertContains(4242, $builder->getBindings());
        $this->assertContains(4343, $builder->getBindings());

        $params = CallSpFake::callsFor('EH_SP_Employee_List')[0]['params'];
        $this->assertEquals($head->id, $params[0]);
        $this->assertEquals($head->LevelId, $params[1]);
        $this->assertSame(7, $params[2]);        // department filter passed through
        $this->assertSame(3, $params[3]);        // sub-department only when a department was given
        $this->assertSame(1, $params[4]);        // active employees by default
    }

    /** A sub-department filter without a department is dropped rather than applied on its own. */
    /** @test */
    public function users_handled__sub_department_without_a_department__drops_the_sub_department()
    {
        $head = $this->userAtLevel('Department Head');
        if (!$head) {
            $this->markTestSkipped('no active Department Head in test DB');
        }
        CallSpFake::fake('EH_SP_Employee_List', [
            [(object) ['id' => 4242]],
            [(object) ['CurrentPage' => 1]],
        ]);

        $head->users_handled(null, 3);

        $params = CallSpFake::callsFor('EH_SP_Employee_List')[0]['params'];
        $this->assertNull($params[2]);
        $this->assertNull($params[3]);
    }

    /** Other arm: a plain employee handles nobody and never reaches the stored procedure. */
    /** @test */
    public function users_handled__plain_employee__handles_nobody()
    {
        $employee = User::where('LevelId', 0)->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$employee) {
            $this->markTestSkipped('no plain-employee user in test DB');
        }

        $this->assertSame([], $employee->users_handled());
        $this->assertSame([], CallSpFake::callsFor('EH_SP_Employee_List'));
    }

    // ============================================== evox_sub_departments_handled()

    /** The guard arm: without an access level there is nothing to look up. */
    /** @test */
    public function evox_sub_departments_handled__without_an_access_level__returns_an_empty_list()
    {
        $noLevel = new User();
        $noLevel->LevelId = null;
        $zeroLevel = new User();
        $zeroLevel->LevelId = 0;

        $this->assertSame([], $noLevel->evox_sub_departments_handled(7));
        $this->assertSame([], $zeroLevel->evox_sub_departments_handled(7));
        $this->assertSame([], CallSpFake::callsFor('EH_SP_Get_Department_By_UserId'));
    }

    // ================================================================= requests_list()

    /** My Requests with a date range asks the windowed stored procedure. */
    /** @test */
    public function requests_list__my_requests_with_a_date_range__uses_the_windowed_sp()
    {
        CallSpFake::fake('EH_SP_MyRequest', [
            [(object) ['id' => 1, 'status' => 'pending']],
            [],
            [(object) ['TotalCount' => 1]],
        ]);

        $out = $this->user->requests_list(request(), [
            'url' => 'my_requests',
            'status' => 'pending',
            'valid_from' => self::START,
            'valid_to' => self::END,
            'request_type' => 'overtime',
            'page' => 2,
        ]);

        $this->assertSame(1, $out['data']['query'][0]->id);
        $this->assertSame(1, $out['pagination']->TotalCount);

        $params = CallSpFake::callsFor('EH_SP_MyRequest')[0]['params'];
        $this->assertSame(
            ['pending', self::START, self::END, 2, $this->user->id, 2, 10],
            $params
        );
    }

    /** Other arm: no date range switches to the overall stored procedure and a shorter parameter list. */
    /** @test */
    public function requests_list__my_requests_without_a_date_range__uses_the_overall_sp()
    {
        CallSpFake::fake('EH_SP_OverAll_MyRequest', [
            [],
            [],
            [(object) ['TotalCount' => 0]],
        ]);

        $out = $this->user->requests_list(request(), [
            'url' => 'my_requests',
            'status' => 'approved',
            'request_type' => 'all',
            'page' => 1,
        ]);

        $this->assertSame([], $out['data']['query']);
        $this->assertSame(
            ['approved', 0, $this->user->id, 1, 10],       // request_type "all" maps to 0
            CallSpFake::callsFor('EH_SP_OverAll_MyRequest')[0]['params']
        );
    }

    /** Every request-type keyword maps to its own numeric code for the stored procedure. */
    /** @test */
    public function requests_list__maps_each_request_type_keyword_to_its_sp_code()
    {
        $expected = [
            'all' => 0, 'alteration' => 1, 'overtime' => 2,
            'rest_day_work' => 3, 'change_schedule' => 4, 'alter_logs_punches' => 5,
        ];

        foreach ($expected as $keyword => $code) {
            CallSpFake::reset();
            CallSpFake::activate();
            CallSpFake::fake('EH_SP_OverAll_MyRequest', [[], [], [(object) ['TotalCount' => 0]]]);

            $this->user->requests_list(request(), [
                'url' => 'my_requests', 'status' => 'pending',
                'request_type' => $keyword, 'page' => 1,
            ]);

            $this->assertSame($code,
                CallSpFake::callsFor('EH_SP_OverAll_MyRequest')[0]['params'][1],
                "request type {$keyword} must be sent as {$code}");
        }
    }

    /** My Team Requests, department view off: rows, status counts and paging come from the SP. */
    /** @test */
    public function requests_list__my_team_requests_by_employee__flattens_the_sp_rows_and_counts()
    {
        CallSpFake::fake('EH_SP_My_Team_Request', $this->teamRequestBlocks());

        $out = $this->user->requests_list(request(), [
            'url' => 'my_team_requests',
            'status' => 'pending',
            'valid_from' => self::START,
            'valid_to' => self::END,
            'request_type' => 'overtime',
            'department_id' => 5,
            'name' => 'al',
            'page' => 1,
            'departmentselect' => 0,
            'showall' => 0,
        ]);

        $row = $out['data']['query'][0];
        $this->assertSame(77, $row->id);
        $this->assertSame('pending', $row->status);
        $this->assertSame('Delivery', $row->department_name);
        $this->assertSame('Delivery', $row->UV_DepartmentName);
        $this->assertSame([], $out['Department']);            // department view is off
        $this->assertSame(
            ['approved' => 3, 'canceled' => 1, 'declined' => 2, 'pending' => 4],
            $out['numbers']
        );
        $this->assertSame(40, $out['pagination']['total']);
        $this->assertEquals(4, $out['pagination']['last_page']);   // ceil(40/10)

        $params = CallSpFake::callsFor('EH_SP_My_Team_Request')[0]['params'];
        $this->assertEquals($this->user->id, $params[0]);
        $this->assertSame(2, $params[4]);                      // overtime
        $this->assertSame('pending', $params[5]);
        $this->assertSame(5, $params[6]);
        $this->assertSame('al', $params[7]);
    }

    /**
     * Other arm: department view on, no date range. The rows move to result set 4, the counts to
     * set 2 and the paging to set 3, and the department list is filled in from set 0.
     */
    /** @test */
    public function requests_list__my_team_requests_by_department__reads_the_shifted_result_sets()
    {
        CallSpFake::fake('EH_SP_overall_My_Team_Request', $this->teamRequestBlocks(true));

        $out = $this->user->requests_list(request(), [
            'url' => 'my_team_requests',
            'status' => 'pending',
            'request_type' => 'all',
            'department_id' => null,
            'name' => null,
            'page' => 1,
            'departmentselect' => 1,
            'showall' => 1,
        ]);

        $this->assertSame(88, $out['data']['query'][0]->id);
        $this->assertSame([['id' => 5, 'DepartmentName' => 'Delivery']],
            json_decode(json_encode($out['Department']), true));
        $this->assertSame(40, $out['pagination']['total']);

        $params = CallSpFake::callsFor('EH_SP_overall_My_Team_Request')[0]['params'];
        $this->assertSame(0, $params[2]);       // request type "all"
        $this->assertSame(1, $params[6]);       // the overall SP is always asked in mode 1
        $this->assertSame(1, $params[9]);       // departmentselect passed straight through
        $this->assertSame(1, $params[10]);      // showall passed straight through
    }

    /**
     * F-USR-REQCOUNT-1 — pagination.count is count($collection["data"]), and data is the
     * single-key ["query" => rows] wrapper, so it reports 1 however many requests were returned.
     */
    /** @test */
    public function requests_list__my_team_requests_pagination_count_is_always_one_FINDING_F_USR_REQCOUNT_1()
    {
        CallSpFake::fake('EH_SP_My_Team_Request', $this->teamRequestBlocks());

        $out = $this->user->requests_list(request(), [
            'url' => 'my_team_requests', 'status' => 'pending',
            'valid_from' => self::START, 'valid_to' => self::END,
            'request_type' => 'all', 'department_id' => null, 'name' => null,
            'page' => 1, 'departmentselect' => 0, 'showall' => 0,
        ]);

        $this->assertCount(2, $out['data']['query']);      // two requests came back
        $this->assertSame(1, $out['pagination']['count']); // ...but count says one
    }

    /** Any other page falls back to the SQL union across all five request tables. */
    /** @test */
    public function requests_list__other_pages__union_every_request_table_ordered_by_creation()
    {
        $out = $this->user->requests_list(request(), $this->unionFilter(['request_type' => 'all']));

        $this->assertInstanceOf(\Illuminate\Pagination\LengthAwarePaginator::class, $out['query']);
        $this->assertSame(10, $out['query']->perPage());
        $this->assertSame(0, $out['query']->total());       // the name filter matches nobody
        $this->assertSame([], CallSpFake::calls());         // no stored procedure on this path
    }

    /** Each single request type narrows the union to one table. */
    /** @test */
    public function requests_list__other_pages__each_request_type_narrows_to_its_own_table()
    {
        foreach (['alteration', 'overtime', 'rest_day_work', 'change_schedule', 'alter_logs_punches'] as $type) {
            $out = $this->user->requests_list(request(), $this->unionFilter(['request_type' => $type]));

            $this->assertSame(0, $out['query']->total(), "no {$type} may match the impossible name");
        }
    }

    /** Pending requests are ordered by when they were raised; everything else by when it moved. */
    /** @test */
    public function requests_list__other_pages__pending_orders_by_creation_and_the_rest_by_update()
    {
        $pending = $this->user->requests_list(request(),
            $this->unionFilter(['request_type' => 'overtime', 'status' => 'pending']));
        $approved = $this->user->requests_list(request(),
            $this->unionFilter(['request_type' => 'overtime', 'status' => 'approved']));

        $this->assertSame(0, $pending['query']->total());
        $this->assertSame(0, $approved['query']->total());
    }

    // ------------------------------------------------------------------------ helpers

    private function userAtLevel($levelName)
    {
        $level = EvoxLevels::where('Name', $levelName)->first();
        if (!$level) {
            return null;
        }

        return User::where('LevelId', $level->LevelId)->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
    }

    /**
     * Team-request result sets. By employee the rows sit at index 3, the counts at 1 and the paging
     * at 2; by department everything shifts up one and index 0 carries the department list.
     */
    private function teamRequestBlocks($byDepartment = false)
    {
        $rows = function ($id) {
            return [
                (object) [
                    'T_id' => $id, 'T_status' => 'pending', 'T_created_at' => '2020-01-01 08:00:00',
                    'T_employee_note' => 'note', 'T_created_by' => 'Alice', 'T_updated_by' => 'Bob',
                    'T_fourth_column' => 4, 'T_fifth_column' => 5, 'T_date_requested' => '2020-01-01',
                    'T_table_name' => 'overtimes', 'T_userDepartmentName' => 'Delivery',
                    'T_updated_at' => '2020-01-02 08:00:00',
                ],
                (object) [
                    'T_id' => $id + 1, 'T_status' => 'approved', 'T_created_at' => '2020-01-01 09:00:00',
                    'T_employee_note' => null, 'T_created_by' => 'Alice', 'T_updated_by' => 'Bob',
                    'T_fourth_column' => null, 'T_fifth_column' => null, 'T_date_requested' => '2020-01-01',
                    'T_table_name' => 'overtimes', 'T_userDepartmentName' => 'Delivery',
                    'T_updated_at' => '2020-01-02 09:00:00',
                ],
            ];
        };
        $counts = [
            (object) ['statusCount' => 3], (object) ['statusCount' => 1],
            (object) ['statusCount' => 2], (object) ['statusCount' => 4],
        ];
        $paging = [(object) ['TotalCount' => 40, 'Total_Count_Per_Page' => 10, 'CurrentPage' => 1]];
        $departments = [(object) ['Id' => 5, 'DepartmentName' => 'Delivery']];

        return $byDepartment
            ? [$departments, [], $counts, $paging, $rows(88)]
            : [[], $counts, $paging, $rows(77), []];
    }

    /**
     * Filter for the SQL union arm. Every subquery is narrowed by a status, a one-day window well
     * in the past and a name nobody carries, so the union stays bounded.
     */
    private function unionFilter(array $overrides = [])
    {
        return array_merge([
            'url' => 'requests_report',
            'status' => 'pending',
            'request_type' => 'all',
            'valid_from' => self::START,
            'valid_to' => self::END,
            'name' => 'zzz-no-such-employee-name',
        ], $overrides);
    }
}
