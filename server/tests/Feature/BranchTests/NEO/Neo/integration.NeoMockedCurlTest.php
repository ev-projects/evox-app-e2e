<?php
/**
 * SOURCE UNDER TEST: app/Http/Controllers/NeoController.php
 * MENU PATH:         NEO -> Onboarding (HR onboarding console)
 * MEASURED COVERAGE AT AUTHORING (lines-%): get_neo_onboarding_users 55.56,
 *   get_users_pending_submissions 76.47, get_user_submissions_data 76.92,
 *   send_onboarding_link 75, approve_submissions 82.35, request_for_resubmission 83.33,
 *   get_file 58.82.
 *
 * FINDINGS:
 *  // FINDING NEO-SWALLOW-200: approve_submissions() and request_for_resubmission() answer BOTH an
 *     upstream non-200 AND an outright transport exception with `response()->json([], 200)`. The HR
 *     user sees a success status with an empty body, so a NEO-side rejection is indistinguishable
 *     from an approval that did nothing. Characterised below as the CURRENT behaviour
 *     (*_FINDING_NEO_SWALLOW_200) — when it is fixed to surface the failure these two tests fail,
 *     which is the signal to flip them.
 *  // FINDING NEO-EXC-BODY: get_neo_onboarding_users() and get_users_pending_submissions() answer a
 *     transport failure with `response()->json($e)` — HTTP 200 whose body is the serialised
 *     Exception. A NEO outage is therefore indistinguishable from "nothing to onboard".
 *     Characterised below as *_FINDING_NEO_EXC_BODY.
 *
 * NO REAL HTTP: every Ixudra\Curl call to env('NEO_SERVER_HOST') is replaced by a Mockery builder.
 * The two EV_SP_Neo_Full_Access_Validation call sites go through CallSpFake, so no stored procedure
 * runs. NeoController lives in App\Http\Controllers, which CallSpFake shadows.
 */

namespace Tests\Feature\BranchTests\NEO\Neo;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Ixudra\Curl\Facades\Curl;
use App\Modules\User\Models\User;

class NeoMockedCurlIntegrationTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        CallSpFake::activate();
        $this->withoutMiddleware();

        $this->user = User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$this->user) {
            $this->markTestSkipped('no active user in test DB');
        }
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        Mockery::close();
        parent::tearDown();
    }

    /** Curl stub; $capture records the URL built and the JSON body sent. */
    private function fakeCurl($response, $verb, &$capture = null)
    {
        $capture = ['url' => null, 'data' => null, 'headers' => null];
        $builder = Mockery::mock();
        foreach (['withHeader', 'withTimeout', 'withConnectTimeout', 'returnResponseObject', 'asJson'] as $chain) {
            $builder->shouldReceive($chain)->andReturnSelf();
        }
        $builder->shouldReceive('withHeaders')->andReturnUsing(function ($h) use (&$capture, $builder) {
            $capture['headers'] = $h;
            return $builder;
        });
        $builder->shouldReceive('withData')->andReturnUsing(function ($d) use (&$capture, $builder) {
            $capture['data'] = $d;
            return $builder;
        });
        $builder->shouldReceive($verb)->andReturn($response);
        Curl::shouldReceive('to')->andReturnUsing(function ($url) use (&$capture, $builder) {
            $capture['url'] = $url;
            return $builder;
        });
        return $builder;
    }

    private function failingCurl($message = 'neo host unreachable')
    {
        Curl::shouldReceive('to')->andThrow(new \Exception($message));
    }

    private function fullAccess($isFull)
    {
        CallSpFake::fake('EV_SP_Neo_Full_Access_Validation', [[(object) ['Result' => $isFull ? '1' : '0']]]);
    }

    // ================================================== get_neo_onboarding_users()

    // A full-access HR user must query the catch-all country id 6758 rather than their own geo.
    /** @test */
    public function full_access_users_see_every_geo_via_the_catch_all_country_id()
    {
        $this->fullAccess(true);
        $this->fakeCurl((object) [
            'status' => 200, 'content' => json_encode(['data' => ['users' => []]]),
        ], 'get', $capture);

        $res = $this->getJson('/api/get_neo_onboarding_users/?country=Philippines');

        $res->assertStatus(200);
        $this->assertStringContainsString('/api/hr/available-users?countryId=6758', $capture['url']);
        $this->assertSame([$this->user->id], CallSpFake::callsFor('EV_SP_Neo_Full_Access_Validation')[0]['params']);
    }

    // Without full access the country NAME from the payload is mapped to its numeric id
    // (Philippines => 2 in NeoController::COUNTRIES) and the matching API key header is attached.
    /** @test */
    public function a_geo_scoped_user_queries_only_their_own_country_id()
    {
        $this->fullAccess(false);
        $this->fakeCurl((object) [
            'status' => 200, 'content' => json_encode(['data' => ['users' => []]]),
        ], 'get', $capture);

        $res = $this->getJson('/api/get_neo_onboarding_users/?country=Philippines');

        $res->assertStatus(200);
        $this->assertStringContainsString('/api/hr/available-users?countryId=2', $capture['url']);
        $this->assertContains('Accept: application/json', $capture['headers']);
        $this->assertNotEmpty(preg_grep('/^x-api-key:/', $capture['headers']));
    }

    // An unknown country name makes array_search return false, which stringifies to an EMPTY
    // countryId in the URL — and no api-key header is built for a country not in the key map.
    /** @test */
    public function an_unrecognised_country_produces_an_empty_country_id_in_the_upstream_url()
    {
        $this->fullAccess(false);
        $this->fakeCurl((object) [
            'status' => 200, 'content' => json_encode(['data' => ['users' => []]]),
        ], 'get', $capture);

        $res = $this->getJson('/api/get_neo_onboarding_users/');   // no country at all

        $res->assertStatus(200);
        $this->assertStringContainsString('/api/hr/available-users?countryId=', $capture['url']);
        $this->assertSame('', substr($capture['url'], strpos($capture['url'], 'countryId=') + 10));
        $this->assertSame([], $capture['headers']);                // get_api_headers(null) => []
    }

    // Enrichment rule: lastInitiatedBy is resolved to the initiator's full name; an id that no
    // longer resolves and a missing id BOTH become null so the UI never shows a raw id.
    /** @test */
    public function onboarding_users_are_enriched_with_the_initiators_full_name()
    {
        $this->fullAccess(true);
        $this->fakeCurl((object) [
            'status'  => 200,
            'content' => json_encode(['data' => ['users' => [
                ['id' => 'a', 'lastInitiatedBy' => $this->user->id],
                ['id' => 'b', 'lastInitiatedBy' => 987654321],      // no such user
                ['id' => 'c'],                                       // never initiated
            ]]]),
        ], 'get', $capture);

        $res = $this->getJson('/api/get_neo_onboarding_users/?country=Philippines');

        $res->assertStatus(200);
        $users = $res->json('data.users');
        $this->assertSame(
            $this->user->first_name . ' ' . $this->user->last_name,
            $users[0]['initiatedBy']
        );
        $this->assertNull($users[1]['initiatedBy']);
        $this->assertNull($users[2]['initiatedBy']);
    }

    // A non-200 from NEO yields an empty list rather than an error the console cannot render.
    /** @test */
    public function a_non_200_from_neo_yields_an_empty_onboarding_list()
    {
        $this->fullAccess(true);
        $this->fakeCurl((object) ['status' => 500, 'content' => 'upstream exploded'], 'get', $capture);

        $res = $this->getJson('/api/get_neo_onboarding_users/?country=India');

        $res->assertStatus(200);
        $this->assertSame([], $res->json());
    }

    // FINDING NEO-EXC-BODY — expected-current-behaviour. A NEO outage is answered with
    // `response()->json($e)`, i.e. HTTP 200 whose body is the serialised Exception — `{}`, because
    // an Exception has no public properties. The console therefore cannot distinguish "NEO is
    // down" from "nothing to onboard". Asserted as it behaves today; when the controller starts
    // returning a real error status this test fails and should be flipped.
    /** @test */
    public function a_transport_failure_is_reported_as_status_200_FINDING_NEO_EXC_BODY()
    {
        $this->fullAccess(true);
        $this->failingCurl();

        $res = $this->getJson('/api/get_neo_onboarding_users/?country=India');

        $res->assertStatus(200);
        $this->assertSame('{}', $res->getContent());   // serialised Exception, not an error payload
    }

    // ============================================== get_users_pending_submissions()

    /** @test */
    public function pending_submissions_are_returned_verbatim_from_neo()
    {
        $this->fullAccess(false);
        $this->fakeCurl((object) [
            'status' => 200, 'content' => '{"data":{"submissions":[{"guid":"g-1"}]}}',
        ], 'get', $capture);

        $res = $this->getJson('/api/get_users_pending_submissions/?country=Morocco');

        $res->assertStatus(200);
        $this->assertSame('{"data":{"submissions":[{"guid":"g-1"}]}}', $res->getContent());
        // Morocco is index 4 in NeoController::COUNTRIES.
        $this->assertStringContainsString('/api/hr/pending-submissions?countryId=4', $capture['url']);
    }

    /** @test */
    public function full_access_users_see_pending_submissions_from_every_geo()
    {
        $this->fullAccess(true);
        $this->fakeCurl((object) ['status' => 200, 'content' => '{"data":[]}'], 'get', $capture);

        $res = $this->getJson('/api/get_users_pending_submissions/?country=Morocco');

        $res->assertStatus(200);
        $this->assertStringContainsString('/api/hr/pending-submissions?countryId=6758', $capture['url']);
    }

    /** @test */
    public function a_non_200_pending_submissions_response_yields_an_empty_list()
    {
        $this->fullAccess(false);
        $this->fakeCurl((object) ['status' => 404, 'content' => 'nope'], 'get', $capture);

        $res = $this->getJson('/api/get_users_pending_submissions/?country=India');

        $res->assertStatus(200);
        $this->assertSame([], $res->json());
    }

    // The access-check stored procedure failing must not fatal — the catch answers with the
    // (serialised) exception, and NEO is never contacted.
    /** @test */
    public function a_failing_access_check_stops_the_request_before_neo_is_contacted()
    {
        // EV_SP_Neo_Full_Access_Validation intentionally NOT faked -> CallSpFake throws.
        Curl::shouldReceive('to')->never();

        $res = $this->getJson('/api/get_users_pending_submissions/?country=India');

        // FINDING NEO-EXC-BODY again: the SP failure surfaces as 200 + serialised Exception.
        $res->assertStatus(200);
        $this->assertSame('{}', $res->getContent());
        $this->assertCount(1, CallSpFake::callsFor('EV_SP_Neo_Full_Access_Validation'));
    }

    // ================================================= get_user_submissions_data()

    /** @test */
    public function a_users_submission_review_is_fetched_by_guid_and_returned_verbatim()
    {
        $this->fakeCurl((object) ['status' => 200, 'content' => '{"form":{"fields":[]}}'], 'get', $capture);

        $res = $this->getJson('/api/get_user_submissions_data/?guid=abc-123');

        $res->assertStatus(200);
        $this->assertSame('{"form":{"fields":[]}}', $res->getContent());
        $this->assertStringContainsString('/api/genericform/review/abc-123', $capture['url']);
    }

    /** @test */
    public function a_missing_submission_review_yields_an_empty_list()
    {
        $this->fakeCurl((object) ['status' => 404, 'content' => 'not found'], 'get', $capture);

        $res = $this->getJson('/api/get_user_submissions_data/?guid=nope');

        $res->assertStatus(200);
        $this->assertSame([], $res->json());
    }

    // Unlike get_neo_onboarding_users, this method's catch returns the empty default — no exception
    // object reaches the client.
    /** @test */
    public function a_transport_failure_fetching_a_review_yields_an_empty_list()
    {
        $this->failingCurl();

        $res = $this->getJson('/api/get_user_submissions_data/?guid=abc-123');

        $res->assertStatus(200);
        $this->assertSame([], $res->json());
    }

    // ====================================================== send_onboarding_link()

    /** @test */
    public function sending_an_onboarding_link_targets_the_guid_and_user_id_pair()
    {
        $this->fakeCurl((object) ['status' => 200, 'content' => '{"sent":true}'], 'post', $capture);

        $res = $this->postJson('/api/send_onboarding_link/', [
            'guid' => 'g-9', 'user_id' => 4321, 'country' => 'India',
        ]);

        $res->assertStatus(200);
        $this->assertSame('{"sent":true}', $res->getContent());
        $this->assertStringContainsString('/api/hr/initiate-neo/g-9/4321', $capture['url']);
        $this->assertNotEmpty(preg_grep('/^x-api-key:/', $capture['headers']));
    }

    // Unlike the approve/resubmit pair, this method DOES surface an upstream refusal as an error.
    /** @test */
    public function an_upstream_refusal_to_send_the_onboarding_link_is_surfaced_as_an_error()
    {
        $this->fakeCurl((object) ['status' => 409, 'content' => 'already initiated'], 'post', $capture);

        $res = $this->postJson('/api/send_onboarding_link/', [
            'guid' => 'g-9', 'user_id' => 4321, 'country' => 'India',
        ]);

        $res->assertStatus(400);
        $this->assertSame('Error while getting data', $res->json('error.message'));
        $this->assertSame('already initiated', $res->json('error.content'));
    }

    // ======================================================== approve_submissions()

    /** @test */
    public function approving_a_submission_posts_the_approver_department_and_notes()
    {
        $this->fakeCurl((object) ['status' => 200, 'content' => '{"approved":true}'], 'post', $capture);

        $res = $this->postJson('/api/approve_submissions/', [
            'guid' => 'g-7', 'country' => 'Belgium',
            'approvedBy' => 'Atea Ortiz', 'department' => 'HR', 'notes' => 'all good',
        ]);

        $res->assertStatus(200);
        $this->assertSame('{"approved":true}', $res->getContent());
        $this->assertStringContainsString('/api/genericform/approve/g-7', $capture['url']);
        $this->assertSame(
            json_encode(['approvedBy' => 'Atea Ortiz', 'department' => 'HR', 'notes' => 'all good']),
            $capture['data']
        );
    }

    // FINDING NEO-SWALLOW-200 — expected-current-behaviour: an upstream refusal is reported to the
    // HR user as HTTP 200 with an empty body, identical to a no-op success. Assert what it does
    // today; when the failure starts being surfaced this test fails and should be flipped.
    /** @test */
    public function an_upstream_refusal_to_approve_is_reported_as_an_empty_success_FINDING_NEO_SWALLOW_200()
    {
        $this->fakeCurl((object) ['status' => 422, 'content' => 'form incomplete'], 'post', $capture);

        $res = $this->postJson('/api/approve_submissions/', ['guid' => 'g-7', 'country' => 'Belgium']);

        $res->assertStatus(200);
        $this->assertSame([], $res->json());
    }

    /** @test */
    public function a_transport_failure_while_approving_is_also_reported_as_an_empty_success_FINDING_NEO_SWALLOW_200()
    {
        $this->failingCurl();

        $res = $this->postJson('/api/approve_submissions/', ['guid' => 'g-7', 'country' => 'Belgium']);

        $res->assertStatus(200);
        $this->assertSame([], $res->json());
    }

    // ================================================== request_for_resubmission()

    // fieldsToResubmit arrives as a JSON STRING and must be re-decoded into a real array before
    // being forwarded, otherwise NEO receives a doubly-encoded string.
    /** @test */
    public function requesting_a_resubmission_decodes_the_field_list_before_forwarding_it()
    {
        $this->fakeCurl((object) ['status' => 200, 'content' => '{"queued":true}'], 'post', $capture);

        $res = $this->postJson('/api/request_for_resubmission/', [
            'userGuid'         => 'u-3',
            'fieldsToResubmit' => '["passport","address"]',
            'reason'           => 'illegible scan',
            'requestedBy'      => 'Atea Ortiz',
            'country'          => 'Bulgaria',
        ]);

        $res->assertStatus(200);
        $this->assertStringContainsString('/api/genericform/resubmit/', $capture['url']);
        $this->assertSame(json_encode([
            'userGuid'         => 'u-3',
            'fieldsToResubmit' => ['passport', 'address'],
            'reason'           => 'illegible scan',
            'requestedBy'      => 'Atea Ortiz',
        ]), $capture['data']);
    }

    // FINDING NEO-SWALLOW-200 — expected-current-behaviour, see file header.
    /** @test */
    public function an_upstream_refusal_to_request_a_resubmission_is_reported_as_an_empty_success_FINDING_NEO_SWALLOW_200()
    {
        $this->fakeCurl((object) ['status' => 400, 'content' => 'unknown guid'], 'post', $capture);

        $res = $this->postJson('/api/request_for_resubmission/', [
            'userGuid' => 'u-3', 'fieldsToResubmit' => '[]', 'country' => 'Bulgaria',
        ]);

        $res->assertStatus(200);
        $this->assertSame([], $res->json());
    }

    // ==================================================================== get_file()

    /** @test */
    public function an_onboarding_file_is_fetched_by_file_id_scoped_to_its_owner()
    {
        $this->fakeCurl((object) [
            'status' => 200, 'content' => json_encode(['fileName' => 'passport.png', 'data' => 'AAA']),
        ], 'get', $capture);

        $res = $this->getJson('/api/get_neo_file/501/f-88');

        $res->assertStatus(200);
        $this->assertSame('passport.png', $res->json('content.fileName'));
        $this->assertSame('AAA', $res->json('content.data'));
        $this->assertStringContainsString('/api/genericform/file/f-88?userId=501', $capture['url']);
    }

    /** @test */
    public function a_missing_onboarding_file_returns_a_plain_404()
    {
        $this->fakeCurl((object) ['status' => 404, 'content' => ''], 'get', $capture);

        $res = $this->get('/api/get_neo_file/501/missing');

        $res->assertStatus(404);
        $this->assertSame('File not found', $res->getContent());
    }

    /** @test */
    public function a_transport_failure_fetching_an_onboarding_file_returns_a_plain_404()
    {
        $this->failingCurl();

        $res = $this->get('/api/get_neo_file/501/f-88');

        $res->assertStatus(404);
        $this->assertSame('File not found', $res->getContent());
    }
}
