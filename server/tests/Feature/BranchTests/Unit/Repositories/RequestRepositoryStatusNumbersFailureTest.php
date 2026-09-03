<?php
/**
 * SOURCE UNDER TEST
 *   app/Modules/Request/Repositories/RequestRepository.php
 *     get_status_numbers, get_status_numbers_only
 *
 * MENU PATH
 *   Requests -> My Requests / My Team Requests (the status tally above the list)
 *   Dashboard -> pending-request tiles
 *
 * COVERAGE AT AUTHORING TIME (line coverage of the named method)
 *   get_status_numbers 95.24 | get_status_numbers_only 76.92
 *   RequestRepositorySpFakeTest drives every SUCCESS arm of both methods (my_requests with and
 *   without dates, my_team_requests at both target indexes, the invalid-rowset guard and the null
 *   LevelId short-circuit). What no suite drives is the failure side: what the approver sees when
 *   the stored procedure behind the tally is unavailable. Those catch arms decide whether the
 *   request list renders with wrong-but-plausible zeros or fails loudly.
 *
 * WHAT THIS FILE ADDS — the catch/rethrow arm of each method, plus the "url is neither
 *   my_requests nor my_team_requests" arm asserted to touch no stored procedure at all.
 *
 * FINDINGS — none. Both methods rethrow, which is the correct behaviour.
 *
 * SAFETY
 *   DatabaseTransactions, and CallSpFake is ACTIVE for every test: an unregistered stored procedure
 *   throws instead of reaching the database, which is exactly the failure this file needs. Nothing
 *   is written. tearDown drains the transaction level get_status_numbers is known to leak
 *   (FINDING REQ-TXN-1, already registered).
 */

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use App\Modules\Request\Repositories\RequestRepository;
use App\Modules\User\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Fluent;
use Tests\Support\CallSpFake;
use Tests\TestCase;

class RequestRepositoryStatusNumbersFailureTest extends TestCase
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

        $this->user = User::whereNotNull('LevelId')->where('is_active', 1)
            ->orderBy('id', 'desc')->first();
        if (!$this->user) $this->markTestSkipped('no active user with a LevelId in test DB');
        $this->be($this->user);

        $this->baseTxnLevel = DB::transactionLevel();
    }

    protected function tearDown(): void
    {
        while (DB::transactionLevel() > $this->baseTxnLevel) {
            DB::rollBack();
        }
        CallSpFake::reset();
        parent::tearDown();
    }

    /** Run $fn and hand back the exception it threw, or null if it did not throw. */
    private function exceptionFrom(callable $fn)
    {
        try {
            $fn();
        } catch (\Exception $e) {
            return $e;
        }
        return null;
    }

    // ═════════════════════════════════════════════════════════════ get_status_numbers()

    /** @test when the my-requests tally procedure fails the caller is told, not handed zeros */
    public function a_failing_my_requests_tally_procedure_is_reported_not_silently_zeroed()
    {
        // no CallSpFake::fake() registration -> EH_SP_OverAll_MyRequest throws when called
        $data = new Fluent(['url' => 'my_requests', 'request_type' => 'all', 'page' => 1]);

        $caught = $this->exceptionFrom(function () use ($data) {
            return $this->repo->get_status_numbers($data, null);
        });

        $this->assertNotNull($caught, 'the tally swallowed the procedure failure and returned zeros');
        $this->assertStringContainsString('EH_SP_OverAll_MyRequest', $caught->getMessage());
        $this->assertCount(1, CallSpFake::callsFor('EH_SP_OverAll_MyRequest'));
    }

    /** @test when the my-team tally procedure fails the caller is told, not handed zeros */
    public function a_failing_my_team_tally_procedure_is_reported_not_silently_zeroed()
    {
        $data = new Fluent([
            'url' => 'my_team_requests', 'request_type' => 'all', 'status' => null,
            'department_id' => null, 'name' => null, 'departmentselect' => null, 'showall' => 0,
        ]);

        $caught = $this->exceptionFrom(function () use ($data) {
            return $this->repo->get_status_numbers($data, null);
        });

        $this->assertNotNull($caught, 'the tally swallowed the procedure failure and returned zeros');
        $this->assertStringContainsString('EH_SP_overall_My_Team_Request', $caught->getMessage());
    }

    /** @test a list the tally does not recognise returns four zeros and calls no procedure */
    public function an_unrecognised_list_returns_zeros_without_calling_any_procedure()
    {
        $data = new Fluent(['url' => 'somebody_elses_requests', 'request_type' => 'all', 'page' => 1]);

        $out = $this->repo->get_status_numbers($data, null);

        $this->assertSame(
            ['pending' => 0, 'approved' => 0, 'declined' => 0, 'canceled' => 0],
            $out['status_numbers']
        );
        $this->assertSame([], CallSpFake::calls());
    }

    // ════════════════════════════════════════════════════════ get_status_numbers_only()

    /** @test when the dashboard procedure fails the caller is told, not handed zeros */
    public function a_failing_dashboard_procedure_is_reported_not_silently_zeroed()
    {
        $caught = $this->exceptionFrom(function () {
            return $this->repo->get_status_numbers_only($this->user, null);
        });

        $this->assertNotNull($caught, 'the dashboard tally swallowed the procedure failure');
        $this->assertStringContainsString('EH_SP_Dashboard', $caught->getMessage());

        $calls = CallSpFake::callsFor('EH_SP_Dashboard');
        $this->assertCount(1, $calls);
        // the dashboard tally is scoped to ONE user: [level, user id, null, null, 1]
        $this->assertEquals($this->user->LevelId, $calls[0]['params'][0]);
        $this->assertSame($this->user->id, $calls[0]['params'][1]);
    }
}
