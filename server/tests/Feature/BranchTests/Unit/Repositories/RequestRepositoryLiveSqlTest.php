<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Fluent;
use App\EvoxLevels;
use App\Modules\Request\Repositories\RequestRepository;
use App\Modules\User\Models\User;

/**
 * LIVE-SQL arms of RequestRepository (Menu=Requests Pages=MyRequests/MyTeamRequests, Dashboard tiles).
 * get_status_numbers_old() and get_status_numbers_dashboard() build raw SELECT/COUNT unions —
 * READ-ONLY against the staging dump, always bounded to ONE user_id (or one supervisor id).
 * No writes, no DDL, DatabaseTransactions throughout.
 *
 * get_status_numbers_old arms:
 *   my_requests + request_type=all + date/department/name filters  -> full union executes
 *   my_requests x 5 single-type arms                               -> each SELECT arm executes
 *   my_team_requests, supervisees found     (seam-faked EH_SP_Employee_List -> 1 id)  -> union with IN(id)
 *   my_team_requests, zero supervisees      (seam-faked empty employee list)          -> early default return
 * get_status_numbers_dashboard arms:
 *   my_requests + all       -> 4 pending COUNTs, result loop maps all 4 keys
 *   my_team_requests + all  -> EXISTS(users_supervisors) filter variant
 *
 * The team arms REQUIRE a Head-level user (plain users get [] from users_handled() — see
 * FINDING REQ-UH-1 below) and run under the CallSpFake seam so EH_SP_Employee_List never hits
 * the live DB (BUG-078 class). Live queries here are the same statements production runs per
 * page load, filtered to one id.
 *
 * FINDING REQ-TXN-1 (shared with RequestRepositorySpFakeTest): get_status_numbers_old() opens
 * DB::beginTransaction() and never commits on success -> drained in tearDown.
 * FINDING REQ-UH-1: for a NON-privileged user, User::users_handled() returns a plain array [],
 * so get_status_numbers_old('my_team_requests') fatals on ->select() — dead path for agents,
 * only Head/HR/Payroll/Client levels can reach the team arm alive.
 */
class RequestRepositoryLiveSqlTest extends TestCase
{
    use DatabaseTransactions;

    private const HEAD_LEVELS = [
        'SubDepartment Head', 'Department Head', 'Division Head', 'DivisionHead',
        'Board', 'Client', 'HR', 'Payroll',
    ];

    /** @var RequestRepository */
    private $repo;
    /** @var User */
    private $user;
    /** @var int */
    private $baseTxnLevel;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repo = new RequestRepository();

        $this->user = User::whereNotNull('LevelId')
            ->where('is_active', 1)
            ->orderBy('id', 'desc')
            ->first();
        if (!$this->user) $this->markTestSkipped('no active user with LevelId in test DB');
        $this->be($this->user);

        $this->baseTxnLevel = DB::transactionLevel();
    }

    protected function tearDown(): void
    {
        while (DB::transactionLevel() > $this->baseTxnLevel) {   // FINDING REQ-TXN-1
            DB::rollBack();
        }
        CallSpFake::reset();
        parent::tearDown();
    }

    /** ONE Head-level user (never Admin — its users_handled() is an unbounded users scan). */
    private function headUser()
    {
        $levelIds = EvoxLevels::whereIn('Name', self::HEAD_LEVELS)->pluck('LevelId');
        if ($levelIds->isEmpty()) return null;
        return User::whereIn('LevelId', $levelIds)
            ->where('is_active', 1)
            ->orderBy('id', 'desc')
            ->first();
    }

    private function assertStatusShape(array $out, array $keys)
    {
        $this->assertArrayHasKey('status_numbers', $out);
        foreach ($keys as $k) {
            $this->assertArrayHasKey($k, $out['status_numbers']);
            $this->assertIsNumeric($out['status_numbers'][$k]);
        }
    }

    // ------------------------------------------------------- get_status_numbers_old
    /** @test */
    public function old_my_requests_all_types_with_every_filter_runs_full_union()
    {
        $out = $this->repo->get_status_numbers_old(new Fluent([
            'url' => 'my_requests', 'request_type' => 'all',
            'valid_from' => '2026-01-01', 'valid_to' => '2026-12-31',
            'department_id' => (int) $this->user->department_id ?: 1,
            'name' => 'a',
        ]));

        // live data: only shape is deterministic ('decline' key — legacy spelling kept by the method)
        $this->assertStatusShape($out, ['pending', 'approved', 'decline', 'canceled']);
    }

    /** @test */
    public function old_my_requests_each_single_type_arm_executes()
    {
        $types = ['alteration', 'overtime', 'rest_day_work', 'change_schedule', 'alter_logs_punches'];
        foreach ($types as $type) {
            $out = $this->repo->get_status_numbers_old(new Fluent([
                'url' => 'my_requests', 'request_type' => $type,
            ]));
            $this->assertStatusShape($out, ['pending', 'approved', 'decline', 'canceled']);

            while (DB::transactionLevel() > $this->baseTxnLevel) {   // REQ-TXN-1, per iteration
                DB::rollBack();
            }
        }
    }

    /** @test */
    public function old_my_team_with_one_supervisee_runs_union_bounded_to_that_id()
    {
        $head = $this->headUser();
        if (!$head) $this->markTestSkipped('no Head/HR/Payroll/Client-level user in test DB');
        $this->be($head);

        CallSpFake::activate();
        // users_handled() -> EH_SP_Employee_List; CurrentPage marker row makes it pluck block 0
        CallSpFake::fake('EH_SP_Employee_List', [
            [(object) ['id' => $head->id]],
            [(object) ['CurrentPage' => 1]],
        ]);

        $out = $this->repo->get_status_numbers_old(new Fluent([
            'url' => 'my_team_requests', 'request_type' => 'all',
        ]));

        $this->assertStatusShape($out, ['pending', 'approved', 'decline', 'canceled']);
        $calls = CallSpFake::callsFor('EH_SP_Employee_List');
        $this->assertCount(1, $calls);
        $this->assertSame($head->id, $calls[0]['params'][0]);
    }

    /** @test */
    public function old_my_team_with_zero_supervisees_returns_default_numbers_early()
    {
        $head = $this->headUser();
        if (!$head) $this->markTestSkipped('no Head/HR/Payroll/Client-level user in test DB');
        $this->be($head);

        CallSpFake::activate();
        CallSpFake::fake('EH_SP_Employee_List', [
            [],                                   // empty employee block -> ids = []
            [(object) ['CurrentPage' => 1]],
        ]);

        $out = $this->repo->get_status_numbers_old(new Fluent([
            'url' => 'my_team_requests', 'request_type' => 'all',
        ]));

        $this->assertSame(
            ['pending' => 0, 'approved' => 0, 'decline' => 0, 'canceled' => 0],
            $out['status_numbers']
        );
    }

    // ------------------------------------------------- get_status_numbers_dashboard
    /** @test */
    public function dashboard_my_requests_maps_all_four_pending_counters()
    {
        $out = $this->repo->get_status_numbers_dashboard(new Fluent([
            'url' => 'my_requests', 'request_type' => 'all',
        ]));

        $this->assertStatusShape($out, [
            'alterlogpending', 'overtimepending', 'restdayworkpending', 'changeschedulepending',
        ]);
    }

    /** @test */
    public function dashboard_my_team_uses_users_supervisors_exists_filter()
    {
        $out = $this->repo->get_status_numbers_dashboard(new Fluent([
            'url' => 'my_team_requests', 'request_type' => 'all',
        ]));

        $this->assertStatusShape($out, [
            'alterlogpending', 'overtimepending', 'restdayworkpending', 'changeschedulepending',
        ]);
    }
}
