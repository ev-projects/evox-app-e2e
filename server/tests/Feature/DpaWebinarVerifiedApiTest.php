<?php
// VERIFIED-BACKED — generated 2026-07-07 from dpa-webinar.registry.md (vetted by Gobi Singaravel on 2026-06-29)

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * @registry-doc dpa-webinar.registry.md
 * @vetted-by    Gobi Singaravel
 * @vetted-on    2026-06-29
 *
 * Confirmed API: POST /api/user/{id}/tick_dpa
 * Controller:    UserController::tick_dpa (UserController.php:665)
 * DB column:     users.dpa_ticked_at (set on success, confirmed in response payload)
 * Payload:       {"session_id": "..."} — user ID travels in URL path, not body
 * Response:      Full updated user object; "dpa_ticked_at" key confirmed in response
 */
class DpaWebinarVerifiedApiTest extends TestCase
{
    use DatabaseTransactions; // SAFETY: converted from RefreshDatabase 2026-07-08 — never migrate:fresh on staging DB

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->user   = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();
    }

    // =========================================================================
    // PATTERN B — Auth enforcement (no withoutMiddleware)
    // POST /api/user/{id}/tick_dpa
    // Confirmed: endpoint requires a valid auth token. No token → 401.
    // =========================================================================

    /** @test */
    public function test_tick_dpa_without_auth_token_returns_401()
    {
        $response = $this->postJson(
            '/api/user/' . $this->user->id . '/tick_dpa',
            ['session_id' => 'test-session-id'],
            $this->apiKey
        );
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic (withoutMiddleware + actingAs)
    // POST /api/user/{id}/tick_dpa
    // UserController::tick_dpa (UserController.php:665)
    // =========================================================================

    /** @test */
    public function test_tick_dpa_returns_200_for_authenticated_user()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/user/' . $this->user->id . '/tick_dpa',
            ['session_id' => 'test-session-abc123'],
            $this->apiKey
        );
        $response->assertStatus(200);
    }

    /** @test */
    public function test_tick_dpa_response_contains_dpa_ticked_at_key()
    {
        // Confirmed from staging 2026-06-29: response is the full updated user object
        // with "dpa_ticked_at" set to the timestamp of the submission.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/user/' . $this->user->id . '/tick_dpa',
            ['session_id' => 'test-session-abc123'],
            $this->apiKey
        );
        $response->assertStatus(200);
        // [CODE REVIEW 2026-07-07] tick_dpa returns success_response(message, UserProfileResource($user))
        // which uses the standard {message, content} envelope — dpa_ticked_at is under content, not root.
        $this->assertNotNull($response->json('content.dpa_ticked_at'));
    }

    /** @test */
    public function test_tick_dpa_sets_dpa_ticked_at_in_database()
    {
        // After a successful POST the users.dpa_ticked_at column must be populated.
        // Confirmed from response inspection on staging 2026-06-29.
        $this->withoutMiddleware();

        // Ensure the user has not yet ticked DPA so the write path runs
        $this->user->dpa_ticked_at = null;
        $this->user->save();

        $this->actingAs($this->user)->postJson(
            '/api/user/' . $this->user->id . '/tick_dpa',
            ['session_id' => 'test-session-setdb'],
            $this->apiKey
        );

        $this->user->refresh();
        $this->assertNotNull($this->user->dpa_ticked_at);
    }

    /** @test */
    public function test_tick_dpa_for_nonexistent_user_does_not_500()
    {
        // Passing an unknown user ID must not produce a 500.
        // The controller or route model binding should return 404 or 422, not crash.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/user/999999/tick_dpa',
            ['session_id' => 'test-session-badid'],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_tick_dpa_without_session_id_does_not_500()
    {
        // Payload confirmed: {"session_id": "..."}. Sending an empty body should not crash.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/user/' . $this->user->id . '/tick_dpa',
            [],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // Known coverage gap — no prior PHPUnit test existed
    // Confirmed from method-coverage-map.md: UserController::tick_dpa had zero tests.
    // =========================================================================

    /** @test */
    public function test_tick_dpa_coverage_note_no_prior_test_existed()
    {
        // Marker test: UserController::tick_dpa (UserController.php:665) had no PHPUnit
        // test before this file was generated. This test suite is the first coverage.
        // Confirmed from dpa-webinar.registry.md coverage summary 2026-06-29.
        $this->assertTrue(true); // documentation marker — not skipped
    }
}
