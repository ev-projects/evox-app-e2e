<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for RequestController::requestlist /
 * requestListDisputes / requestValidityChecker (filtered-list "filter" arms). Menu=Requests Page=RequestList.
 *
 * Routes (module prefix `request`, mounted under /api):
 *   GET /api/request/request-list            -> requestlist()            (RequestFilterRequest)  error=400
 *   GET /api/request/request-list-disputes   -> requestListDisputes()    (RequestFilterRequest)  error=400
 *   GET /api/request/request-validity-check  -> requestValidityChecker()                         (SP-only)
 *
 * SKIPPED arms (invoke stored procedures / SP-backed pagination -> forbidden on live-dump DB):
 *   // SKIPPED-SP requestlist() url=='my_requests' & url=='my_team_requests' -> $user->requests_list()
 *      (SP-backed pagination). Its catch(Exception) is only reachable through those SP calls, so it is
 *      not separately authored. Only the "no matching url" fall-through arm (both if's false -> null -> 200)
 *      is SP-free and authored.
 *   // SKIPPED-SP requestListDisputes() success path always reaches call_sp("EV_SP_PD_Employee_Report").
 *      Only the pre-SP exception arm (cutoff throw while resolving valid_from) is authored.
 *   // SKIPPED-SP requestValidityChecker() single-statement call_sp("EV_SP_Validate_Request_Payroll_Period"),
 *      no try/catch, no mockable seam -> marked skipped below.
 */

namespace Tests\Feature\BranchTests\Requests\RequestList;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;

class RequestListFilterBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestSkipped('no user in test DB');
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    protected function bindMock(string $iface): \Mockery\MockInterface
    {
        $m = Mockery::mock($iface);
        $this->app->instance($iface, $m);
        return $m;
    }

    // ================================================================= requestlist()
    // try -> if(url=='my_requests'){SP} -> if(url=='my_team_requests'){SP} -> (fall through) ; catch -> 400
    // SKIPPED-SP: both url arms call $user->requests_list() (SP). Only the fall-through arm is authored.

    /** @test  neither url matches -> both if's false -> try ends with no return -> action returns null -> 200 empty */
    public function requestlist__filter__no_matching_url__success_200()
    {
        $res = $this->getJson('/api/request/request-list?url=unrecognized_value');

        $res->assertStatus(200);
    }

    // =========================================================== requestListDisputes()
    // try -> if(!isset valid_from){cutoff} -> foreach statuses { call_sp } -> 200 ; catch -> 400
    // SKIPPED-SP: success path always reaches call_sp("EV_SP_PD_Employee_Report"). Only the pre-SP
    // exception arm (cutoff throw while resolving valid_from) is SP-free.

    /** @test  valid_from unset -> cutoff->get_payroll_cutoff() throws before the SP loop -> catch -> 400 */
    public function requestListDisputes__filter__exception__error_400()
    {
        $this->bindMock(PayrollCutoffRepositoryInterface::class)->shouldReceive('get_payroll_cutoff')->once()
             ->andThrow(new Exception('boom'));

        $res = $this->getJson('/api/request/request-list-disputes');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ========================================================= requestValidityChecker()
    // SKIPPED-SP: single statement returning call_sp("EV_SP_Validate_Request_Payroll_Period", ...)[0][0].
    // No try/catch and no mockable seam -> any invocation hits the live-dump DB. Not authored.
    /** @test */
    public function requestValidityChecker__filter__sp_only__skipped()
    {
        $this->markTestSkipped(
            'SKIPPED-SP: requestValidityChecker() is a single call_sp("EV_SP_Validate_Request_Payroll_Period") '
            . 'with no try/catch and no mockable branch; exercising it would run a stored procedure on the live-dump DB.'
        );
    }
}
