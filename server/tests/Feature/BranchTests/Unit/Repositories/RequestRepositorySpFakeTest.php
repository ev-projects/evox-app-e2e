<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Fluent;
use App\Modules\Request\Repositories\RequestRepository;
use App\Modules\User\Models\User;

/**
 * SP-FAKE SEAM — RequestRepository (Menu=Requests Pages=MyRequests/MyTeamRequests + Dashboard tiles).
 * File was 9.3% covered (176 uncovered lines) in the 29-07 run: its two hot methods are SP-walled.
 * REAL repository code runs; only the call_sp() boundary is faked; ONE probed user; DB never written.
 *
 * get_status_numbers($data, $cutoff) arms:
 *   my_requests + valid_from        -> EH_SP_MyRequest            (params + status mapping asserted)
 *   my_requests no valid_from       -> EH_SP_OverAll_MyRequest    (params + status mapping asserted)
 *   my_requests SP row-set falsy    -> falls through -> default zeros
 *   my_team_requests + valid_from   -> EH_SP_My_Team_Request      (2-element result -> target index 1)
 *   my_team_requests no valid_from  -> EH_SP_overall_My_Team_Request (6-element result -> target index 2)
 *   my_team_requests invalid rows   -> is_valid guard -> default zeros
 *   LevelId null                    -> early default, SP never called
 * get_status_numbers_only($user, $cutoff) arms:
 *   EH_SP_Dashboard with MyTeamRequest marker    -> own counts from [3], team counts from [2]
 *   EH_SP_Dashboard without marker               -> own counts from [2], team counts all "0"
 *
 * FINDING REQ-TXN-1: get_status_numbers() opens DB::beginTransaction() and never commits/rolls back
 * on the success path — every successful call leaves the connection one transaction level deeper.
 * Characterized here via drainOpenTransactions(); registered in FINDINGS-REGISTER.
 */
class RequestRepositorySpFakeTest extends TestCase
{
    use DatabaseTransactions;

    /** @var RequestRepository */
    private $repo;
    /** @var User */
    private $user;
    /** @var int */
    private $baseTxnLevel;

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();
        $this->repo = new RequestRepository();

        // ONE active user with a level — bounded probe, no table scan
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
        $this->drainOpenTransactions();
        CallSpFake::reset();
        parent::tearDown();
    }

    /** FINDING REQ-TXN-1: the repo leaves its beginTransaction() open on success — rebalance. */
    private function drainOpenTransactions(): void
    {
        while (DB::transactionLevel() > $this->baseTxnLevel) {
            DB::rollBack();
        }
    }

    /** 4 result rows in the SP's fixed order: approved, canceled, declined, pending. */
    private function statusRows($approved, $canceled, $declined, $pending)
    {
        return [
            (object) ['statusCount' => $approved],
            (object) ['statusCount' => $canceled],
            (object) ['statusCount' => $declined],
            (object) ['statusCount' => $pending],
        ];
    }

    // ------------------------------------------------- get_status_numbers: my_requests
    /** @test */
    public function my_requests_with_dates_uses_EH_SP_MyRequest_and_maps_counts()
    {
        CallSpFake::fake('EH_SP_MyRequest', [[], $this->statusRows(5, 2, 3, 7)]);

        $data = new Fluent([
            'url' => 'my_requests', 'request_type' => 'overtime', 'page' => 2,
            'valid_from' => '2026-07-01', 'valid_to' => '2026-07-15',
        ]);
        $out = $this->repo->get_status_numbers($data, null);

        $this->assertSame(
            ['approved' => 5, 'canceled' => 2, 'declined' => 3, 'pending' => 7],
            $out['status_numbers']
        );

        $calls = CallSpFake::callsFor('EH_SP_MyRequest');
        $this->assertCount(1, $calls);
        // ['all', valid_from, valid_to, request_type#, auth id, page, perpage=10]
        $this->assertSame(
            ['all', '2026-07-01', '2026-07-15', 2, $this->user->id, 2, 10],
            $calls[0]['params']
        );
    }

    /** @test */
    public function my_requests_without_dates_uses_EH_SP_OverAll_MyRequest()
    {
        CallSpFake::fake('EH_SP_OverAll_MyRequest', [[], $this->statusRows(1, 0, 0, 4)]);

        $data = new Fluent(['url' => 'my_requests', 'request_type' => 'all', 'page' => 1]);
        $out = $this->repo->get_status_numbers($data, null);

        $this->assertSame(
            ['approved' => 1, 'canceled' => 0, 'declined' => 0, 'pending' => 4],
            $out['status_numbers']
        );

        $calls = CallSpFake::callsFor('EH_SP_OverAll_MyRequest');
        $this->assertCount(1, $calls);
        // ['all', request_type#, auth id, page, perpage=10]
        $this->assertSame(['all', 0, $this->user->id, 1, 10], $calls[0]['params']);
    }

    /** @test */
    public function my_requests_empty_sp_rowset_falls_through_to_default_zeros()
    {
        CallSpFake::fake('EH_SP_OverAll_MyRequest', [[], null]);

        $data = new Fluent(['url' => 'my_requests', 'request_type' => 'all', 'page' => 1]);
        $out = $this->repo->get_status_numbers($data, null);

        $this->assertSame(
            ['pending' => 0, 'approved' => 0, 'declined' => 0, 'canceled' => 0],
            $out['status_numbers']
        );
        $this->assertCount(1, CallSpFake::callsFor('EH_SP_OverAll_MyRequest'));
    }

    // --------------------------------------------- get_status_numbers: my_team_requests
    /** @test */
    public function my_team_with_dates_uses_EH_SP_My_Team_Request_target_index_1()
    {
        // 2-element result -> count != 6 -> counts read from index 1
        CallSpFake::fake('EH_SP_My_Team_Request', [[], $this->statusRows(8, 1, 2, 9)]);

        $data = new Fluent([
            'url' => 'my_team_requests', 'request_type' => 'all', 'status' => 'pending',
            'valid_from' => '2026-07-01', 'valid_to' => '2026-07-15',
            'department_id' => null, 'name' => null, 'departmentselect' => null, 'showall' => 1,
        ]);
        $out = $this->repo->get_status_numbers($data, null);

        $this->assertSame(
            ['pending' => 9, 'approved' => 8, 'declined' => 2, 'canceled' => 1],
            $out['status_numbers']
        );

        $calls = CallSpFake::callsFor('EH_SP_My_Team_Request');
        $this->assertCount(1, $calls);
        $p = $calls[0]['params'];
        $this->assertSame($this->user->id, $p[0]);
        $this->assertEquals($this->user->LevelId, $p[1]);
        $this->assertSame('2026-07-01', $p[2]);
        $this->assertSame('2026-07-15', $p[3]);
        $this->assertSame('0', $p[4]);                    // REQUEST_TYPE_SP_RE['all']
        $this->assertSame('pending', $p[5]);
        $this->assertSame([0, 1, 999], [$p[8], $p[9], $p[10]]);
        $this->assertSame(1, $p[12]);                     // showall
    }

    /** @test */
    public function my_team_without_dates_uses_overall_sp_and_target_index_2()
    {
        // 6-element result -> count == 6 -> counts read from index 2
        CallSpFake::fake('EH_SP_overall_My_Team_Request',
            [[], [], $this->statusRows(3, 4, 5, 6), [], [], []]);

        $data = new Fluent([
            'url' => 'my_team_requests', 'request_type' => 'alteration', 'status' => null,
            'department_id' => null, 'name' => null, 'departmentselect' => null, 'showall' => 0,
        ]);
        $out = $this->repo->get_status_numbers($data, null);

        $this->assertSame(
            ['pending' => 6, 'approved' => 3, 'declined' => 5, 'canceled' => 4],
            $out['status_numbers']
        );

        $calls = CallSpFake::callsFor('EH_SP_overall_My_Team_Request');
        $this->assertCount(1, $calls);
        $this->assertSame('1', $calls[0]['params'][2]);   // REQUEST_TYPE_SP_RE['alteration']
    }

    /** @test */
    public function my_team_invalid_target_rowset_returns_default_zeros()
    {
        CallSpFake::fake('EH_SP_My_Team_Request', [[], null]);   // is_valid(null) -> false

        $data = new Fluent([
            'url' => 'my_team_requests', 'request_type' => 'all', 'status' => null,
            'valid_from' => '2026-07-01', 'valid_to' => '2026-07-15',
            'department_id' => null, 'name' => null, 'departmentselect' => null, 'showall' => 0,
        ]);
        $out = $this->repo->get_status_numbers($data, null);

        $this->assertSame(
            ['pending' => 0, 'approved' => 0, 'declined' => 0, 'canceled' => 0],
            $out['status_numbers']
        );
    }

    /** @test */
    public function null_LevelId_returns_default_zeros_without_touching_sp()
    {
        $noLevel = User::whereNull('LevelId')->orderBy('id', 'desc')->first();
        if (!$noLevel) $this->markTestSkipped('no LevelId-null user in test DB');
        $this->be($noLevel);

        $out = $this->repo->get_status_numbers(
            new Fluent(['url' => 'my_requests', 'request_type' => 'all', 'page' => 1]), null);

        $this->assertSame(
            ['pending' => 0, 'approved' => 0, 'declined' => 0, 'canceled' => 0],
            $out['status_numbers']
        );
        $this->assertSame([], CallSpFake::calls());
    }

    // ------------------------------------------------------- get_status_numbers_only
    /** @test */
    public function dashboard_counts_with_team_marker_split_own_and_team()
    {
        $team = [
            (object) ['requestCount' => 1],
            (object) ['requestCount' => 2, 'MyTeamRequest' => 1],   // the marker probed by the repo
            (object) ['requestCount' => 3],
            (object) ['requestCount' => 4],
        ];
        $own = [
            (object) ['requestCount' => 11],
            (object) ['requestCount' => 12],
            (object) ['requestCount' => 13],
            (object) ['requestCount' => 14],
        ];
        CallSpFake::fake('EH_SP_Dashboard', [[], [], $team, $own]);

        $out = $this->repo->get_status_numbers_only($this->user, null);

        $this->assertSame([
            'alterlogpending' => '11', 'overtimepending' => '12',
            'restdayworkpending' => '13', 'changeschedulepending' => '14',
            'team_alterlogpending' => '1', 'team_overtimepending' => '2',
            'team_restdayworkpending' => '3', 'team_changeschedulepending' => '4',
        ], $out['status_numbers']);

        $calls = CallSpFake::callsFor('EH_SP_Dashboard');
        $this->assertCount(1, $calls);
        $this->assertEquals(
            [$this->user->LevelId, $this->user->id, null, null, 1],
            $calls[0]['params']
        );
    }

    /** @test */
    public function dashboard_counts_without_team_marker_use_own_rows_and_zero_team()
    {
        $own = [
            (object) ['requestCount' => 5],
            (object) ['requestCount' => 6],
            (object) ['requestCount' => 7],
            (object) ['requestCount' => 8],
        ];
        CallSpFake::fake('EH_SP_Dashboard', [[], [], $own, []]);

        $out = $this->repo->get_status_numbers_only($this->user, null);

        $this->assertSame([
            'alterlogpending' => '5', 'overtimepending' => '6',
            'restdayworkpending' => '7', 'changeschedulepending' => '8',
            'team_alterlogpending' => '0', 'team_overtimepending' => '0',
            'team_restdayworkpending' => '0', 'team_changeschedulepending' => '0',
        ], $out['status_numbers']);
    }
}
