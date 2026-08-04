<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for NeoController::get_api_headers arms.
 * Menu=NEO Page=Neo.
 *
 * EXTERNAL-FACING CONTROLLER — extra caution. Every ROUTED NeoController method issues a real
 * Ixudra\Curl HTTP call to the NEO server (env('NEO_SERVER_HOST')) as (effectively) its first
 * meaningful statement, with no earlier guard that returns. Two of them additionally start with
 * call_sp(...). None of them has a safe pre-external arm, so none is authored (see SKIPPED list).
 *
 * The only NEO method with a real, side-effect-free branch is the non-routed public helper
 * get_api_headers($country): pure (env() lookups only, no HTTP, no DB, no SP). Both of its arms
 * are authored by calling the controller method directly.
 *
 * AUTHORED arms (get_api_headers, called directly — no HTTP fired):
 *   get_api_headers($country) truthy  -> builds ['Accept: application/json', 'x-api-key: <env>'] (2 headers)
 *   get_api_headers($country) falsy   -> returns [] (empty)
 *
 * SKIPPED-SP (first statement is call_sp -> reaches SP then external; author nothing):
 *   get_neo_onboarding_users()      -> call_sp("EV_SP_Neo_Full_Access_Validation") then Curl->get()
 *   get_users_pending_submissions() -> call_sp("EV_SP_Neo_Full_Access_Validation") then Curl->get()
 *
 * SKIPPED-EXTERNAL (Curl call with no earlier safe return; author nothing):
 *   get_user_submissions_data() -> Curl::to(.../review/{guid})->get()
 *   send_onboarding_link()      -> Curl::to(.../initiate-neo/...)->post()
 *   approve_submissions()       -> Curl::to(.../approve/{guid})->post()      // see FINDING below
 *   request_for_resubmission()  -> Curl::to(.../resubmit/)->post()           // see FINDING below
 *   get_file($userId,$fileId)   -> Curl::to(.../file/{fileId})->get()
 *   (Every catch(Exception) in these methods is only reachable via the external call, so none is
 *    force-tested — doing so would require firing the outgoing request.)
 *
 * // FINDING (documented, NOT triggered — would require the real cURL): the coverage report flags
 *    approve_submissions()/request_for_resubmission() mishandling a non-200 cURL response. In the
 *    CURRENT latest code both methods handle non-200 by `return response()->json([], 200)` (masking
 *    the upstream failure as an empty 200 to the client) rather than surfacing an error; the exception
 *    path likewise swallows to `json([], 200)`. No UnexpectedValueException is thrown in this revision,
 *    but the non-200 arm is untestable without a live outgoing request and is left // SKIPPED-EXTERNAL.
 *
 * Routes (routes/api.php, mounted under /api) — all SKIPPED per above:
 *   GET  /api/get_neo_onboarding_users/        -> get_neo_onboarding_users()
 *   GET  /api/get_users_pending_submissions/   -> get_users_pending_submissions()
 *   GET  /api/get_user_submissions_data/       -> get_user_submissions_data()
 *   POST /api/send_onboarding_link/            -> send_onboarding_link()
 *   POST /api/approve_submissions/             -> approve_submissions()
 *   POST /api/request_for_resubmission/        -> request_for_resubmission()
 *   GET  /api/get_neo_file/{userId}/{fileId}   -> get_file()
 *   (get_api_headers is a public helper — not routed.)
 */

namespace Tests\Feature\BranchTests\NEO\Neo;

use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Http\Controllers\NeoController;

class NeoLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // ----------------------------------------------------------- get_api_headers()
    // Branch A: $country truthy -> returns Accept + x-api-key headers (env lookup only, no HTTP).
    /** @test */
    public function get_api_headers__load__country_set__returns_headers()
    {
        $controller = new NeoController();

        $headers = $controller->get_api_headers('India');   // maps to env('NEO_API_KEY_IN')

        $this->assertIsArray($headers);
        $this->assertCount(2, $headers);
        $this->assertContains('Accept: application/json', $headers);
        // x-api-key header is always present (value may be empty when env key is unset in test).
        $this->assertNotEmpty(preg_grep('/^x-api-key:/', $headers));
    }

    // Branch B: $country falsy -> returns [] (no headers built).
    /** @test */
    public function get_api_headers__load__no_country__returns_empty()
    {
        $controller = new NeoController();

        $headers = $controller->get_api_headers(null);

        $this->assertIsArray($headers);
        $this->assertCount(0, $headers);
    }
}
