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
 * FINDING (invalid validation rule): daily_time_record(), punches(), Dtr_punches() and
 *   dtr_single_punch() all validate 'user_id' => 'int'. 'int' is NOT a Laravel rule (the real
 *   rule is 'integer'); the Validator resolves it to a non-existent validateInt() method, whose
 *   __call() throws BadMethodCallException. Because 'user_id' is always present (route param),
 *   validation ALWAYS throws, is caught by each method's catch(Exception), and returns
 *   error_response() => HTTP 400. The success/try-completion body is therefore UNREACHABLE
 *   (dead code) on all four endpoints. Only the catch arm is authorable -> one 400 test each.
 *
 * SKIPPED-SP: daily_time_record()'s (dead) success body would run call_sp('SP_DTR_By_UserId', ...)
 *   plus all downstream foreach/if arms; unreachable AND SP-backed, so not authored.
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
        if (!$this->user) $this->markTestSkipped('no active user in test DB');
        $this->actingAs($this->user);
    }

    // -------------------------------------------------------- daily_time_record()
    // Only reachable arm: validate('user_id'=>'int') throws BadMethodCallException ->
    // catch(Exception) -> error_response default 400. (Success body + call_sp are dead code.)
    /** @test */
    public function daily_time_record__load__invalid_int_rule__error_400()
    {
        $res = $this->getJson('/api/dtr/' . $this->user->id . '/2020-01-01/2020-01-31');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ---------------------------------------------------------------- punches()
    // Only reachable arm: 'int' rule throws -> catch -> error_response default 400.
    /** @test */
    public function punches__load__invalid_int_rule__error_400()
    {
        $res = $this->getJson('/api/dtr/punch/' . $this->user->id . '/2020-01-01/2020-01-31');

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // -------------------------------------------------------------- Dtr_punches()
    // Only reachable arm: 'int' rule throws -> catch -> error_response default 400.
    /** @test */
    public function Dtr_punches__load__invalid_int_rule__error_400()
    {
        $res = $this->getJson('/api/dtr/dtrpunch/' . $this->user->id . '/2020-01-01/2020-01-31');

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
