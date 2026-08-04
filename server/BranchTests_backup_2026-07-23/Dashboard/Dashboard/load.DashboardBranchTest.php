<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for DashboardController::get_dashboard_all,
 * get_today_leave_list, get_tommorow_leave_list arms. Menu=Dashboard Page=Dashboard.
 *
 * DEPENDENCY NOTE — DashboardController takes NO constructor/injected dependencies. It uses the
 * Auth/DB facades and the global call_sp() helper directly, so there is nothing to IoC-mock.
 * SUCCESS arms run the controller's real READ-ONLY queries under DatabaseTransactions (no writes);
 * CATCH arms are forced with DB::shouldReceive('table')->andThrow(new Exception('boom')).
 *
 * SKIPPED / FINDING summary:
 *   - get_dashboard_all(): body reaches call_sp("EH_SP_Dashboard", $parameter) [SKIPPED-SP].
 *     There is NO return before the SP; the if($page_type==3) arm only mutates $parameter then
 *     still hits the SP. Auth::user() being null does not throw a catchable Exception in PHP 7.4
 *     (property access on null yields a warning, not a throwable), so the catch(Exception) arm is
 *     unreachable before the SP fires. Whole method skipped — one skipped test.
 *   - get_today_leave_list(): first statement is call_sp("EH_SP_Dashboard", ...) [SKIPPED-SP],
 *     immediately followed by dd($result). // FINDING: dump-and-die aborts the request/process;
 *     all code after it (users_handled(), the leaves read query, the return) is dead. Whole method
 *     skipped — one skipped test.
 *
 * Routes (routes/api.php, mounted under /api):
 *   GET /api/get_dashboard_all/{page_type} -> get_dashboard_all()   [SKIPPED-SP]
 *   GET /api/Gettodayleaves                -> get_today_leave_list() [SKIPPED-SP + FINDING dd()]
 *   GET /api/Gettommorowleaves             -> get_tommorow_leave_list()
 */

namespace Tests\Feature\BranchTests\Dashboard\Dashboard;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class DashboardLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();                 // reach controller bodies past jwtauth/auth.apikey
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) {
            $this->markTestSkipped('no user in test DB');
        }
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** Force the method's try/catch(Exception) arm by throwing from the first DB facade call. */
    private function dbThrows(string $method): void
    {
        DB::shouldReceive($method)->andThrow(new Exception('boom'));
    }

    // ------------------------------------------------------------- get_dashboard_all()
    // SKIPPED-SP: body reaches call_sp("EH_SP_Dashboard", $parameter); no return before the SP and
    // the catch is unreachable pre-SP (null Auth::user() yields a warning, not a throwable in 7.4).
    /** @test */
    public function get_dashboard_all__load__reaches_call_sp__skipped_sp()
    {
        // SKIPPED-SP
        $this->markTestSkipped(
            'SKIPPED-SP: get_dashboard_all() invokes call_sp("EH_SP_Dashboard", ...); every page_type ' .
            '(1/2/3/4) arm needs the SP result and no exception is reachable before the SP fires.'
        );
    }

    // ---------------------------------------------------------- get_today_leave_list()
    // SKIPPED-SP + FINDING: first statement is call_sp("EH_SP_Dashboard", ...) then dd($result).
    /** @test */
    public function get_today_leave_list__load__dd_and_call_sp__skipped_sp()
    {
        // FINDING: dd($result) after call_sp() is dump-and-die — aborts the request; all code below
        //          it (users_handled(), the leaves read query, the return) is dead.
        // SKIPPED-SP
        $this->markTestSkipped(
            'SKIPPED-SP + FINDING: get_today_leave_list() first calls call_sp("EH_SP_Dashboard", ...), ' .
            'then dd($result) dump-and-dies. Whole method unauthorable.'
        );
    }

    // -------------------------------------------------------- get_tommorow_leave_list()
    // Branch A: try succeeds -> users_handled() + read-only leaves query -> returns {data:[...]} at 200.
    /** @test */
    public function get_tommorow_leave_list__load__success__ok_200()
    {
        $res = $this->getJson('/api/Gettommorowleaves');

        $res->assertStatus(200)->assertJsonStructure(['data']);
    }

    // Branch B: DB::table throws -> catch(Exception) -> error_response default 400 {error:{message,content}}.
    /** @test */
    public function get_tommorow_leave_list__load__exception__error_400()
    {
        $this->dbThrows('table');

        $res = $this->getJson('/api/Gettommorowleaves');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}
