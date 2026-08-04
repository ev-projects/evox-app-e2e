<?php

/**
 * @registry-doc onboarding-list.registry.md
 * @vetted-by Gobi Singaravel
 * @vetted-on 2026-07-01
 */

// VERIFIED-BACKED — generated 2026-07-07 from onboarding-list.registry.md (vetted by Gobi Singaravel on 2026-07-01)

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class NeoOnboardingListVerifiedApiTest extends TestCase
{
    use DatabaseTransactions; // SAFETY: converted from RefreshDatabase 2026-07-08 — never migrate:fresh on staging DB

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->user = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();
    }

    // =========================================================================
    // PATTERN B — Auth enforcement (no withoutMiddleware)
    // GET /api/get_neo_onboarding_users/
    // [CODE REVIEW 2026-07-07] Developer vetting comment was INCORRECT.
    //   Real route: server/routes/api.php line 70: Route::get('get_neo_onboarding_users/', 'NeoController@get_neo_onboarding_users')
    //   Correct path: GET /api/get_neo_onboarding_users/  (no /neo/ segment exists in Laravel routes)
    // Controller: NeoController::get_neo_onboarding_users()
    // =========================================================================

    /** @test */
    public function test_get_neo_onboarding_users_without_token_returns_401(): void
    {
        $response = $this->getJson('/api/get_neo_onboarding_users/?country=Philippines', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN B — Auth enforcement (no withoutMiddleware)
    // POST /api/send_onboarding_link/
    // [CODE REVIEW 2026-07-07] Developer vetting comment was INCORRECT.
    //   Real route: server/routes/api.php line 73: Route::post('send_onboarding_link/', 'NeoController@send_onboarding_link')
    //   Correct path: POST /api/send_onboarding_link/  (no /neo/ segment exists in Laravel routes)
    // Controller: NeoController::send_onboarding_link()
    // =========================================================================

    /** @test */
    public function test_send_onboarding_link_without_token_returns_401(): void
    {
        $response = $this->postJson(
            '/api/send_onboarding_link/?guid=41103290-8fd3-4925-adf5-64bed0bf2ffd&user_id=1&country=Philippines',
            [],
            $this->apiKey
        );
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic (withoutMiddleware + actingAs)
    // GET /api/get_neo_onboarding_users/?country=Philippines
    // NeoController::get_neo_onboarding_users()
    // Calls EV_SP_Neo_Full_Access_Validation → cURL GET to external NEO server
    // Enriches initiatedBy from EVOX users table
    // =========================================================================

    /** @test */
    public function test_get_neo_onboarding_users_with_valid_country_returns_200(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/get_neo_onboarding_users/?country=Philippines',
            $this->apiKey
        );
        // External NEO server is proxied via cURL — expect 200 or a non-500 response
        $this->assertNotEquals(500, $response->status());
        $response->assertStatus(200);
    }

    /** @test */
    public function test_get_neo_onboarding_users_returns_array_of_users(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/get_neo_onboarding_users/?country=Philippines',
            $this->apiKey
        );
        $response->assertStatus(200);
        // Response should be a JSON array (list of onboarding users)
        $this->assertIsArray($response->json());
    }

    /** @test */
    public function test_get_neo_onboarding_users_with_empty_country_does_not_500(): void
    {
        // [DEVELOPER VETTING] If country is empty, get_api_headers() returns [] —
        // request proceeds to the NEO server WITHOUT the x-api-key header.
        // EVOX should not 500 — it may return an error from the NEO server, but not a PHP fatal.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/get_neo_onboarding_users/',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_get_neo_onboarding_users_with_invalid_country_does_not_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/get_neo_onboarding_users/?country=Narnia',
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // PATTERN A — Controller logic (withoutMiddleware + actingAs)
    // POST /api/send_onboarding_link/
    // NeoController::send_onboarding_link()
    // [DEVELOPER VETTING] params sent as query params, not request body:
    //   ?guid={guid}&user_id={id}&country={country}
    // After send: list refreshes (GET /api/get_neo_onboarding_users/ fires automatically — confirmed route)
    // =========================================================================

    /** @test */
    public function test_send_onboarding_link_with_missing_guid_does_not_500(): void
    {
        // guid is a UUID generated and owned by the external NEO .NET server.
        // Sending without guid should return an error response, not a PHP 500.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/send_onboarding_link/?user_id=1&country=Philippines',
            [],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_send_onboarding_link_with_missing_user_id_does_not_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/send_onboarding_link/?guid=41103290-8fd3-4925-adf5-64bed0bf2ffd&country=Philippines',
            [],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_send_onboarding_link_with_all_params_does_not_500(): void
    {
        // Full-param call proxied to external NEO server via cURL.
        // NEO server may reject a test GUID — expect a non-500 response from EVOX.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/send_onboarding_link/?guid=00000000-0000-0000-0000-000000000000&user_id=1&country=Philippines',
            [],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // Known production / open questions documented in registry
    // =========================================================================

    /** @test */
    public function test_get_neo_onboarding_users_empty_country_api_key_behaviour_is_open_question(): void
    {
        // OPEN QUESTION (registry): If country is empty, get_api_headers() returns [] —
        // request proceeds to the NEO server WITHOUT the x-api-key header.
        // Whether NEO server accepts or rejects is unknown — depends on NEO configuration.
        // Flag to Vishnu: should EVOX validate country before calling get_api_headers()?
        $this->markTestIncomplete(
            'Open question: empty country causes get_api_headers() to return [] — ' .
            'EVOX sends request to external NEO server without x-api-key header. ' .
            'NEO server behaviour in this case is unknown. ' .
            'Recommend EVOX validates country param and returns early if empty. ' .
            'See NeoController::get_neo_onboarding_users() / get_api_headers().'
        );
    }
}
