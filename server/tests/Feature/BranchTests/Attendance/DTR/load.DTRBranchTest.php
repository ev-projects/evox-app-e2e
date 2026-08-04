<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for DtrController::load arms. Menu=Attendance Page=DTR.
 *
 * Controller: App\Modules\Payroll\Http\Controllers\DtrController (constructor-injected:
 *   DtrRepositoryInterface, BiometricsRepositoryInterface, DtrSummaryExport, UserRepositoryInterface).
 *
 * Routes (module Routes/api.php, prefix 'dtr', mounted under /api; middleware jwtauth+auth.apikey bypassed):
 *   GET /api/dtr/{user_id}/{start_date}/{end_date}          -> daily_time_record()
 *   GET /api/dtr/punch/{user_id}/{start_date}/{end_date}    -> punches()
 *   GET /api/dtr/dtrpunch/{user_id}/{start_date}/{end_date} -> Dtr_punches()
 *   GET /api/dtr/dtrpunch/check/{user_id}/{call_date}       -> dtr_single_punch()
 *   GET /api/dtr/incomplete_logs                            -> get_incomplete_logs()
 *
 * FINDING (validation rule 'int'): daily_time_record(), punches() and Dtr_punches() validate
 *   'user_id' => 'int'. Contrary to an earlier assumption, this rule does NOT always throw. It
 *   resolves as a working integer check: a VALID integer user_id PASSES validation and the method
 *   runs through to success_response() => HTTP 200 (confirmed by running the tests). A NON-integer
 *   user_id (e.g. 'abc') FAILS the rule; the resulting ValidationException is caught by each
 *   method's catch(Exception) and returned as error_response() => HTTP 400. So each of these three
 *   endpoints has two reachable arms: valid-int success (200) and non-int validation failure (400),
 *   authored as a pair below.
 *
 * NOTE-SP: daily_time_record()'s success body runs call_sp('SP_DTR_By_UserId', ...) — a READ-only
 *   stored procedure — against the live-dump test DB. It is exercised by the valid-int 200 test
 *   below (wrapped in DatabaseTransactions; no writes/DDL). The non-int 400 test fails validation
 *   first and never reaches the SP.
 *
 * dtr_single_punch(): left UNCHANGED (not in scope). Its test URL /dtr/dtrpunch/check/{id}/{date}
 *   collides with the earlier-registered Dtr_punches route /dtrpunch/{user_id}/{start}/{end},
 *   binding user_id='check' (non-integer) -> validation fails -> 400. The existing 400 assertion
 *   therefore still holds.
 *
 * get_incomplete_logs(): has NO try/catch and no injected dep; uses Eloquent models directly and
 *   only performs user-scoped READS, always returning a raw array (HTTP 200). Its two arms
 *   (!$payroll_cutoff => [] vs. else => user-scoped incomplete DTR) are data-dependent on whether
 *   a PayrollCutoff spans today; both return 200 JSON. No write/SP/exception arm exists to force,
 *   so one honest 200 read test is authored.
 */

namespace Tests\Feature\BranchTests\Attendance\DTR;

use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class DTRLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();                 // reach controller past jwtauth/auth.apikey
        $this->user = User::where('is_active', 1)->first();
        if (!$this->user) $this->markTestIncomplete('no active user in test DB');
        $this->actingAs($this->user);
    }

    // -------------------------------------------------------- daily_time_record()
    // Success arm: valid integer user_id passes validate('user_id'=>'int'), findOrFail resolves the
    // acting user, call_sp('SP_DTR_By_UserId') (READ-only) runs -> success_response => 200.
    /** @test */
    public function daily_time_record__load__valid_int__success_200()
    {
        $res = $this->getJson('/api/dtr/' . $this->user->id . '/2020-01-01/2020-01-31');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Validation arm: non-integer user_id fails the 'int' rule -> ValidationException ->
    // catch(Exception) -> error_response default 400 (never reaches findOrFail / call_sp).
    /** @test */
    public function daily_time_record__load__non_int__error_400()
    {
        $res = $this->getJson('/api/dtr/abc/2020-01-01/2020-01-31');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ---------------------------------------------------------------- punches()
    // Success arm: valid integer user_id passes validation -> get_authenticated_user resolves the
    // acting user -> DtrPunchResource::collection(...) READ -> success_response => 200.
    /** @test */
    public function punches__load__valid_int__success_200()
    {
        $res = $this->getJson('/api/dtr/punch/' . $this->user->id . '/2020-01-01/2020-01-31');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Validation arm: non-integer user_id fails the 'int' rule -> catch -> error_response 400.
    /** @test */
    public function punches__load__non_int__error_400()
    {
        $res = $this->getJson('/api/dtr/punch/abc/2020-01-01/2020-01-31');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // -------------------------------------------------------------- Dtr_punches()
    // Success arm: valid integer user_id passes validation -> get_authenticated_user resolves the
    // acting user -> DtrPunchHistoryLogResources::collection(...) READ -> success_response => 200.
    /** @test */
    public function Dtr_punches__load__valid_int__success_200()
    {
        $res = $this->getJson('/api/dtr/dtrpunch/' . $this->user->id . '/2020-01-01/2020-01-31');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Validation arm: non-integer user_id fails the 'int' rule -> catch -> error_response 400.
    /** @test */
    public function Dtr_punches__load__non_int__error_400()
    {
        $res = $this->getJson('/api/dtr/dtrpunch/abc/2020-01-01/2020-01-31');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // --------------------------------------------------------- dtr_single_punch()
    // Only reachable arm: 'int' rule throws -> catch -> error_response default 400.
    /** @test */
    public function dtr_single_punch__load__invalid_int_rule__error_400()
    {
        $res = $this->getJson('/api/dtr/dtrpunch/check/' . $this->user->id . '/2020-01-01');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // -------------------------------------------------------- get_incomplete_logs()
    // No try/catch: user-scoped READ only. Returns a raw array (either [] when no cutoff spans
    // today, or the filtered incomplete-DTR array) at HTTP 200.
    /** @test */
    public function get_incomplete_logs__load__success__200()
    {
        $res = $this->getJson('/api/dtr/incomplete_logs');

        $res->assertStatus(200);
        $this->assertIsArray($res->json());
    }
}
