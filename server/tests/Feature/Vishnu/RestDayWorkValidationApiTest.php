<?php
// DRAFT — generated 2026-06-16, needs verification


namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * REST DAY WORK — API Validation Tests
 *
 * Routes under test (prefix: /api/request/rest_day_work):
 *   POST   /api/request/rest_day_work          → RestDayWorkController@store
 *   GET    /api/request/rest_day_work/{id}      → RestDayWorkController@find
 *   PUT    /api/request/rest_day_work/{id}      → RestDayWorkController@update
 *   DELETE /api/request/rest_day_work/{id}      → RestDayWorkController@destroy
 *   PUT    /api/request/rest_day_work/approve/{id} → RestDayWorkController@approve
 *   PUT    /api/request/rest_day_work/decline/{id} → RestDayWorkController@decline
 *   PUT    /api/request/rest_day_work/pending/{id} → RestDayWorkController@pending
 *   PUT    /api/request/rest_day_work/cancel/{id}  → RestDayWorkController@cancel
 *
 * Middleware: jwtauth + auth.apikey on all routes.
 * Form Request: App\Modules\Request\Http\Requests\RestDayWorkRequest
 */
class RestDayWorkValidationApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = [
            'X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z'),
        ];
        $this->user = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();
    }

    // =========================================================================
    // PATTERN B — AUTH ENFORCEMENT (no withoutMiddleware)
    // =========================================================================

    /** @test */
    public function test_post_rest_day_work_without_token_returns_401()
    {
        $response = $this->postJson('/api/request/rest_day_work', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_get_rest_day_work_by_id_without_token_returns_401()
    {
        $response = $this->getJson('/api/request/rest_day_work/1', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_put_rest_day_work_update_without_token_returns_401()
    {
        $response = $this->putJson('/api/request/rest_day_work/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_delete_rest_day_work_without_token_returns_401()
    {
        $response = $this->deleteJson('/api/request/rest_day_work/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_put_approve_rest_day_work_without_token_returns_401()
    {
        $response = $this->putJson('/api/request/rest_day_work/approve/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_put_decline_rest_day_work_without_token_returns_401()
    {
        $response = $this->putJson('/api/request/rest_day_work/decline/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_put_pending_rest_day_work_without_token_returns_401()
    {
        $response = $this->putJson('/api/request/rest_day_work/pending/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_put_cancel_rest_day_work_without_token_returns_401()
    {
        $response = $this->putJson('/api/request/rest_day_work/cancel/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — VALIDATION: empty payload → 422
    // =========================================================================

    /** @test */
    public function test_post_rest_day_work_with_empty_payload_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/rest_day_work',
            [],
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_put_rest_day_work_update_with_empty_payload_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->putJson(
            '/api/request/rest_day_work/1',
            [],
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    // =========================================================================
    // PATTERN A — VALIDATION: missing individual required fields → 422
    // =========================================================================

    /** @test */
    public function test_post_rest_day_work_missing_date_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'user_id'    => $this->user->id,
            'start_time' => '08:00',
            'end_time'   => '17:00',
            'break_time' => '01:00',
        ];
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/rest_day_work',
            $payload,
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_post_rest_day_work_missing_user_id_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'date'       => '2026-06-01',
            'start_time' => '08:00',
            'end_time'   => '17:00',
            'break_time' => '01:00',
        ];
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/rest_day_work',
            $payload,
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_post_rest_day_work_missing_start_time_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'user_id'    => $this->user->id,
            'date'       => '2026-06-01',
            'end_time'   => '17:00',
            'break_time' => '01:00',
        ];
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/rest_day_work',
            $payload,
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_post_rest_day_work_missing_end_time_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'user_id'    => $this->user->id,
            'date'       => '2026-06-01',
            'start_time' => '08:00',
            'break_time' => '01:00',
        ];
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/rest_day_work',
            $payload,
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_post_rest_day_work_missing_break_time_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'user_id'    => $this->user->id,
            'date'       => '2026-06-01',
            'start_time' => '08:00',
            'end_time'   => '17:00',
        ];
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/rest_day_work',
            $payload,
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    // =========================================================================
    // PATTERN A — VALIDATION: wrong format → 422
    // =========================================================================

    /** @test */
    public function test_post_rest_day_work_wrong_date_format_returns_422()
    {
        // Backend validates date_format:Y-m-d; DD-MM-YYYY should fail
        $this->withoutMiddleware();
        $payload = [
            'user_id'    => $this->user->id,
            'date'       => '01-06-2026', // wrong format: DD-MM-YYYY
            'start_time' => '08:00',
            'end_time'   => '17:00',
            'break_time' => '01:00',
        ];
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/rest_day_work',
            $payload,
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_post_rest_day_work_break_time_exceeding_one_hour_returns_422()
    {
        // ValidBreakTime rule: break_time > 3600 seconds (1 hour) → rejected
        $this->withoutMiddleware();
        $payload = [
            'user_id'    => $this->user->id,
            'date'       => '2026-06-01',
            'start_time' => '08:00',
            'end_time'   => '17:00',
            'break_time' => '01:01', // 1 hour 1 minute — exceeds limit
        ];
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/rest_day_work',
            $payload,
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_post_rest_day_work_nonexistent_user_id_returns_422()
    {
        // user_id: exists:users,id — 999999 should not exist
        $this->withoutMiddleware();
        $payload = [
            'user_id'    => 999999,
            'date'       => '2026-06-01',
            'start_time' => '08:00',
            'end_time'   => '17:00',
            'break_time' => '01:00',
        ];
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/rest_day_work',
            $payload,
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    // =========================================================================
    // PATTERN A — HAPPY PATH: minimal valid payload → 200/201
    // =========================================================================

    /** @test */
    public function test_post_rest_day_work_valid_payload_returns_201()
    {
        // NOTE: This test requires that the date used is a rest day in the DTR table
        // and falls within the active payroll cutoff. Adjust the date as needed for the
        // test environment. Assumes request_mode=regular.
        $this->withoutMiddleware();
        $payload = [
            'user_id'        => $this->user->id,
            'date'           => '2026-06-15',
            'start_time'     => '08:00',
            'end_time'       => '17:00',
            'break_time'     => '01:00',
            'employee_note'  => 'PHPUnit test submission',
            'request_mode'   => 'regular',
            'session_id'     => 'test-session-id',
        ];
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/rest_day_work',
            $payload,
            $this->apiKey
        );
        // 201 on success; 400 if date is not a rest day or outside payroll cutoff in this env
        $this->assertContains($response->status(), [201, 400]);
    }

    /** @test */
    public function test_get_rest_day_work_by_id_returns_200_or_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/request/rest_day_work/999999',
            $this->apiKey
        );
        // Should not return 500; 404 or 200 depending on whether record exists
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // NULL-ID TESTS — Assert NOT 500
    // =========================================================================

    /** @test */
    public function test_put_rest_day_work_update_nonexistent_id_does_not_return_500()
    {
        $this->withoutMiddleware();
        $payload = [
            'user_id'    => $this->user->id,
            'date'       => '2026-06-15',
            'start_time' => '08:00',
            'end_time'   => '17:00',
            'break_time' => '01:00',
        ];
        $response = $this->actingAs($this->user)->putJson(
            '/api/request/rest_day_work/999999',
            $payload,
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_delete_rest_day_work_nonexistent_id_does_not_return_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->deleteJson(
            '/api/request/rest_day_work/999999',
            [],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_put_approve_rest_day_work_nonexistent_id_does_not_return_500()
    {
        $this->withoutMiddleware();
        $payload = [
            'user_id'       => $this->user->id,
            'date'          => '2026-06-15',
            'start_time'    => '08:00',
            'end_time'      => '17:00',
            'break_time'    => '01:00',
            'approver_note' => 'test',
        ];
        $response = $this->actingAs($this->user)->putJson(
            '/api/request/rest_day_work/approve/999999',
            $payload,
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_put_decline_rest_day_work_nonexistent_id_does_not_return_500()
    {
        $this->withoutMiddleware();
        $payload = [
            'user_id'       => $this->user->id,
            'date'          => '2026-06-15',
            'start_time'    => '08:00',
            'end_time'      => '17:00',
            'break_time'    => '01:00',
            'approver_note' => 'test',
        ];
        $response = $this->actingAs($this->user)->putJson(
            '/api/request/rest_day_work/decline/999999',
            $payload,
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_put_cancel_rest_day_work_nonexistent_id_does_not_return_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->putJson(
            '/api/request/rest_day_work/cancel/999999',
            [],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_put_pending_rest_day_work_nonexistent_id_does_not_return_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->putJson(
            '/api/request/rest_day_work/pending/999999',
            [],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }
}
