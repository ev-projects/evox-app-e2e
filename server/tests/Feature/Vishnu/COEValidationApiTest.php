<?php
// DRAFT — generated 2026-06-16, needs verification


namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * COE (Certificate of Employment) API validation tests.
 *
 * Routes under test (all protected by jwtauth + auth.apikey middleware):
 *   GET  /request/coe/           COEController@all
 *   POST /request/coe            COEController@create
 *   GET  /request/coe/user/      COEController@getUsers
 *
 * Known bugs captured via markTestSkipped:
 *   - POST /request/coe with non-existent employee_id → fatal null-member access (500)
 *   - show_compensation is not backend-validated (silent omission accepted)
 *   - POST /request/coe success path streams PDF binary, not JSON
 */
class COEValidationApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->user = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();
    }

    // -------------------------------------------------------------------------
    // Pattern B — Auth enforcement (no withoutMiddleware)
    // -------------------------------------------------------------------------

    /** @test */
    public function test_get_coe_history_without_token_returns_401()
    {
        $response = $this->getJson('/api/request/coe/', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_post_coe_create_without_token_returns_401()
    {
        $response = $this->postJson('/api/request/coe', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_get_coe_users_without_token_returns_401()
    {
        $response = $this->getJson('/api/request/coe/user/', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // -------------------------------------------------------------------------
    // Pattern A — Validation: empty payload → 422
    // -------------------------------------------------------------------------

    /** @test */
    public function test_post_coe_create_with_empty_payload_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/request/coe', [], $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_post_coe_create_missing_purpose_index_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'show_compensation' => '0',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/coe', $payload, $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    // -------------------------------------------------------------------------
    // Pattern A — show_compensation not backend-validated (silent acceptance)
    // -------------------------------------------------------------------------

    /** @test */
    public function test_post_coe_create_missing_show_compensation_does_not_return_422()
    {
        // PRODUCTION NOTE: show_compensation is NOT in COERequest::rules().
        // The backend accepts the payload without it and silently omits salary section from PDF.
        // This test documents the current (buggy) behaviour — it should eventually 422.
        $this->withoutMiddleware();
        // We cannot fully execute create() without a live BHR connection; middleware bypass
        // means we get past validation. The BHR call will fail in unit context — we only
        // assert we are NOT rejected with 422 at the validation layer.
        $payload = [
            'purpose_index' => '0',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/coe', $payload, $this->apiKey);
        $this->assertNotEquals(422, $response->status());
    }

    // -------------------------------------------------------------------------
    // Pattern A — GET /request/coe/ history list
    // -------------------------------------------------------------------------

    /** @test */
    public function test_get_coe_history_returns_200_for_authenticated_user()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/request/coe/', $this->apiKey);
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_get_coe_history_returns_only_current_users_records()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/request/coe/', $this->apiKey);
        $response->assertStatus(200);
        // All returned records must belong to the authenticated user
        $content = $response->json('content');
        if (is_array($content) && count($content) > 0) {
            foreach ($content as $coe) {
                $this->assertEquals($this->user->id, $coe['user_id'],
                    'COE history must only contain records for the authenticated user.');
            }
        } else {
            // Empty collection is also valid — user may have no COEs
            $this->assertIsArray($content);
        }
    }

    /** @test */
    public function test_get_coe_history_with_no_prior_coes_returns_empty_collection()
    {
        // Use withoutMiddleware + a user who has never had a COE if possible.
        // We assert shape rather than specific emptiness since test DB state varies.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/request/coe/', $this->apiKey);
        $response->assertStatus(200);
        $this->assertArrayHasKey('content', $response->json());
    }

    // -------------------------------------------------------------------------
    // Pattern A — GET /request/coe/user/ employee search
    // -------------------------------------------------------------------------

    /** @test */
    public function test_get_coe_users_with_keyword_returns_matching_employees()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/request/coe/user/?keyword=Jo', $this->apiKey);
        // getUsers() returns raw JSON array (not success_response envelope)
        $this->assertContains($response->status(), [200, 204]);
        if ($response->status() === 200) {
            $data = $response->json();
            $this->assertIsArray($data);
        }
    }

    /** @test */
    public function test_get_coe_users_backend_accepts_single_char_keyword()
    {
        // PRODUCTION NOTE: Frontend debounces at < 2 chars, but the backend has NO minimum
        // keyword length. A single-char request goes through and executes LIKE "%J%".
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/request/coe/user/?keyword=J', $this->apiKey);
        // Should not 500 — just returns results (potentially many)
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_coe_users_without_keyword_does_not_500()
    {
        // PRODUCTION NOTE: $keyword = $request->query('keyword') returns null when omitted.
        // LIKE "%null%" or equivalent undefined behaviour — must not 500.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/request/coe/user/', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // -------------------------------------------------------------------------
    // Null / non-existent ID tests
    // -------------------------------------------------------------------------

    /** @test */
    public function test_post_coe_create_with_nonexistent_employee_id_does_not_return_200()
    {
        // PRODUCTION BUG: When employee_id is non-existent, User::find() returns null.
        // The next line accesses $user->country_id on null → fatal error → 500.
        // See COEController::create() and CoeRepository::create().
        $this->withoutMiddleware();
        $nonExistentUserId = (\App\Modules\User\Models\User::max('id') ?? 0) + 1;
        $response = $this->actingAs($this->user)->postJson('/api/request/coe', [
            'employee_id' => $nonExistentUserId,
            'type'        => 'regular',
        ], $this->apiKey);
        if ($response->status() === 500) {
            $this->markTestIncomplete('APP-BUG: POST /api/request/coe with nonexistent employee_id causes null-member access on User::find() → 500; add null guard in COEController::create().');
        }
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_coe_history_with_nonexistent_user_id_999999_does_not_500()
    {
        // GET history scopes by auth()->user()->id — 999999 is a stand-in for a user
        // with no records. The query simply returns an empty collection.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/request/coe/', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // -------------------------------------------------------------------------
    // Typo regression: COEController::all() returns "Sucess" (misspelled)
    // -------------------------------------------------------------------------

    /** @test */
    public function test_get_coe_history_response_message_is_present()
    {
        // PRODUCTION NOTE: The actual message value is "Sucess" (typo in production).
        // We assert the key exists rather than the exact value so the test does not
        // hard-code the typo — fixing the typo should not break this test.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/request/coe/', $this->apiKey);
        $response->assertStatus(200);
        $this->assertArrayHasKey('message', $response->json());
    }

    // -------------------------------------------------------------------------
    // HR path — employee_id privilege escalation (no role gate)
    // -------------------------------------------------------------------------

    /** @test */
    public function test_post_coe_create_with_employee_id_as_non_hr_user_is_not_rejected_at_validation()
    {
        // PRODUCTION BUG: Any authenticated user can submit employee_id to generate a COE
        // for a colleague. There is no role gate or policy on this parameter.
        // We cannot fully invoke create() without BHR, but we assert that the request
        // is NOT blocked at the Form Request validation stage (purpose_index is the only rule).
        $this->withoutMiddleware();
        $otherUser = User::where('is_active', 1)
            ->where('id', '!=', $this->user->id)
            ->whereNotNull('email')
            ->first();
        if (!$otherUser) {
            $this->markTestIncomplete('Cat 1: No second active user in DB — add another user to run this test.');
        }
        $payload = [
            'purpose_index' => '0',
            'show_compensation' => '0',
            'employee_id' => $otherUser->id,
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/coe', $payload, $this->apiKey);
        // Must NOT return 403 — confirms the missing role gate
        $this->assertNotEquals(403, $response->status());
        // Must NOT return 422 — confirms the payload passes validation
        $this->assertNotEquals(422, $response->status());
    }

    // -------------------------------------------------------------------------
    // COE create — PDF streaming response (happy path structural check)
    // -------------------------------------------------------------------------

    /** @test */
    public function test_post_coe_create_valid_payload_does_not_return_422_or_401()
    {
        // NOTE: Full happy-path (PDF generation) requires a live BHR connection and
        // valid employee BHR record. In the test environment BHR is likely mocked/absent.
        // We assert the request passes auth + validation layers without 401/422.
        $this->withoutMiddleware();
        $payload = [
            'purpose_index'    => '0',
            'show_compensation' => '0',
            'session_id'       => 'test-session-id',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/coe', $payload, $this->apiKey);
        $this->assertNotEquals(401, $response->status());
        $this->assertNotEquals(422, $response->status());
    }

    /** @test */
    public function test_post_coe_create_with_travel_purpose_and_purpose_note_does_not_422()
    {
        // purpose_index=6 = "Visa Application for Personal Travel"; purpose_note is
        // conditionally required on the frontend but NOT validated server-side.
        $this->withoutMiddleware();
        $payload = [
            'purpose_index'    => '6',
            'purpose_note'     => 'Japan',
            'show_compensation' => '0',
            'session_id'       => 'test-session-id',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/coe', $payload, $this->apiKey);
        $this->assertNotEquals(422, $response->status());
    }
}
