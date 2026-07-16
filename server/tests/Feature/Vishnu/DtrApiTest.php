<?php

/**
 * EVOX P0 DTR (Daily Time Record) API Tests — Vishnu Padmanabhan
 *
 * Scope: Scenarios NOT already covered by Gary's tests/Feature/Api/DtrApiTest.php.
 * Gary covers: basic GET dtr (200), current month, different user,
 *              punch, dtrpunch range, dtrpunch check, incomplete_logs,
 *              quickpunch missing fields, quickpunch endpoint reachable.
 *
 * This file adds: full response-structure assertions, validation errors,
 *                 unauthorized enforcement, not-found, and attack vectors.
 *
 * Endpoints under test (all under middleware: jwtauth, auth.apikey):
 *   GET  /api/dtr/{user_id}/{start_date}/{end_date}
 *   GET  /api/dtr/punch/{user_id}/{start_date}/{end_date}
 *   GET  /api/dtr/dtrpunch/{user_id}/{start_date}/{end_date}
 *   GET  /api/dtr/incomplete_logs
 *   POST /api/dtr/quickpunch
 *   POST /api/dtr/quickpunch_multi
 *
 * Test patterns:
 *   A — Controller logic tests: withoutMiddleware() + actingAs()  (Gary's accepted pattern)
 *   B — Auth enforcement tests: no middleware bypass, no auth header
 *   C — Full-stack tests: real JWT from login, then tested endpoint
 *
 * Coverage driver: Xdebug — run with:
 *   php artisan test --filter=Vishnu\\\\DtrApiTest --coverage
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class DtrApiTest extends TestCase
{
    use DatabaseTransactions;

    /** @var array HTTP header carrying the application API key */
    private array $apiKey;

    /** @var User Active user with country and emp_num set — guaranteed to exist */
    private User $user;

    /** Range that is likely to have DTR records in the test database */
    private const DTR_START = '2026-04-01';
    private const DTR_END   = '2026-04-30';

    protected function setUp(): void
    {
        parent::setUp();

        $this->apiKey = [
            'X-Authorization' => env(
                'APP_API_KEY',
                'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z'
            ),
        ];

        // Prefer a user that has emp_num (needed for quickpunch biometrics Userid construction)
        $this->user = User::where('is_active', 1)
            ->whereNotNull('country_id')
            ->where('country_id', '>', 0)
            ->whereNotNull('emp_num')
            ->firstOrFail();
    }

    // ─── Helper ──────────────────────────────────────────────────────────────

    /**
     * Resets the test user's password, calls POST /api/auth/login, and returns the JWT token.
     */
    private function loginAndGetToken(): string
    {
        $this->user->password = bcrypt('TestEvox2026!');
        $this->user->save();

        $resp = $this->postJson('/api/auth/login', [
            'username' => $this->user->email,
            'password' => 'TestEvox2026!',
        ], $this->apiKey);

        $resp->assertStatus(200);
        return $resp->json('content.access_token');
    }

    // ─── Happy path — full response-structure assertions (Pattern A) ──────────

    /** @test */
    public function test_dtr_response_top_level_has_message_and_content_keys()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson("/api/dtr/{$this->user->id}/" . self::DTR_START . '/' . self::DTR_END);

        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_dtr_content_contains_summary_and_dtr_records_keys()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson("/api/dtr/{$this->user->id}/" . self::DTR_START . '/' . self::DTR_END);

        $response->assertStatus(200);
        $content = $response->json('content');

        $this->assertArrayHasKey('summary', $content,    'content must contain a "summary" key');
        $this->assertArrayHasKey('dtr_records', $content, 'content must contain a "dtr_records" key');
    }

    /** @test */
    public function test_dtr_summary_contains_items_column_and_column_names()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson("/api/dtr/{$this->user->id}/" . self::DTR_START . '/' . self::DTR_END);

        $response->assertStatus(200);
        $summary = $response->json('content.summary');

        $this->assertIsArray($summary, 'summary must be an array/object');
        $this->assertArrayHasKey('items',        $summary);
        $this->assertArrayHasKey('column',       $summary);
        $this->assertArrayHasKey('column_names', $summary);
    }

    /** @test */
    public function test_dtr_summary_items_contains_employee_info_and_data()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson("/api/dtr/{$this->user->id}/" . self::DTR_START . '/' . self::DTR_END);

        $response->assertStatus(200);
        $items = $response->json('content.summary.items');

        $this->assertArrayHasKey('employee_info', $items);
        $this->assertArrayHasKey('data',          $items);

        // employee_info sub-keys
        $info = $items['employee_info'];
        $this->assertArrayHasKey('employee_id', $info);
        $this->assertArrayHasKey('name',        $info);

        // payroll data must carry at least reg sub-key
        $this->assertArrayHasKey('reg', $items['data']);
    }

    /** @test */
    public function test_dtr_records_items_have_expected_shape_when_present()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson("/api/dtr/{$this->user->id}/" . self::DTR_START . '/' . self::DTR_END);

        $response->assertStatus(200);
        $records = $response->json('content.dtr_records');
        $this->assertIsArray($records);

        if (count($records) === 0) {
            $this->markTestSkipped(
                "No DTR records found for user {$this->user->id} in range " .
                self::DTR_START . '/' . self::DTR_END .
                '. Assertion skipped — re-run against a date range with data.'
            );
        }

        $first = $records[0];
        foreach (['id', 'user_id', 'date', 'time_in', 'time_out', 'attendance_status', 'payroll_items', 'holidays', 'leaves'] as $key) {
            $this->assertArrayHasKey($key, $first, "dtr_record must have key: {$key}");
        }
    }

    /** @test */
    public function test_punch_endpoint_returns_200_with_message_and_content()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson("/api/dtr/punch/{$this->user->id}/" . self::DTR_START . '/' . self::DTR_END);

        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_incomplete_logs_returns_200()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/dtr/incomplete_logs');

        $response->assertStatus(200);
    }

    // ─── Validation errors (Pattern A) ────────────────────────────────────────

    /** @test */
    public function test_dtr_with_invalid_date_format_ymd_returns_error_not_500()
    {
        $this->withoutMiddleware();

        // date_format:Y-m-d validation in controller will reject MM/DD/YYYY
        $response = $this->actingAs($this->user)
            ->getJson("/api/dtr/{$this->user->id}/04-01-2026/04-30-2026");

        // Caught by try-catch → error_response (400) — must NOT be 500
        $this->assertNotEquals(500, $response->status());
        $this->assertNotEquals(200, $response->status());
        $this->assertNotNull($response->json('error'), 'Validation failure must use error envelope');
    }

    /** @test */
    public function test_dtr_with_non_integer_user_id_returns_error_not_500()
    {
        $this->withoutMiddleware();

        // 'user_id' => 'int' validation will fail for a string
        $response = $this->actingAs($this->user)
            ->getJson("/api/dtr/not_an_integer/" . self::DTR_START . '/' . self::DTR_END);

        $this->assertNotEquals(500, $response->status());
        $this->assertNotEquals(200, $response->status());
    }

    /** @test */
    public function test_quickpunch_with_unknown_action_returns_error_not_500()
    {
        $this->withoutMiddleware();

        // 'sleep' is not in/out — controller throws Exception("Unknown time log action.")
        $response = $this->actingAs($this->user)
            ->postJson('/api/dtr/quickpunch', ['quickpunch' => 'sleep']);

        $this->assertNotEquals(500, $response->status());
        $this->assertNotEquals(200, $response->status());
    }

    /** @test */
    public function test_quickpunch_without_quickpunch_field_returns_error()
    {
        $this->withoutMiddleware();

        // No quickpunch field → $request->quickpunch is null → else branch → exception
        $response = $this->actingAs($this->user)
            ->postJson('/api/dtr/quickpunch', ['some_other_field' => 'value']);

        $this->assertNotEquals(200, $response->status());
    }

    /** @test */
    public function test_quickpunch_in_does_not_return_404()
    {
        $this->withoutMiddleware();

        // Endpoint must exist; business-logic errors (double punch, no schedule) are fine
        $response = $this->actingAs($this->user)
            ->postJson('/api/dtr/quickpunch', ['quickpunch' => 'in']);

        $this->assertNotEquals(404, $response->status(),
            'quickpunch endpoint must exist — 404 means it is missing or misconfigured.');
    }

    /** @test */
    public function test_quickpunch_out_does_not_return_404()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->postJson('/api/dtr/quickpunch', ['quickpunch' => 'out']);

        $this->assertNotEquals(404, $response->status());
    }

    /** @test */
    public function test_quickpunch_multi_endpoint_is_reachable()
    {
        $this->withoutMiddleware();

        // quickpunch_multi supports in/out/pause/continue
        $response = $this->actingAs($this->user)
            ->postJson('/api/dtr/quickpunch_multi', ['quickpunch' => 'in']);

        $this->assertNotEquals(404, $response->status(),
            'quickpunch_multi endpoint must exist.');
    }

    // ─── Not found (Pattern A) ────────────────────────────────────────────────

    /** @test */
    public function test_dtr_for_nonexistent_user_id_returns_error_not_500()
    {
        $this->withoutMiddleware();

        // User::findOrFail(9999999) → ModelNotFoundException → caught → error_response(400)
        $response = $this->actingAs($this->user)
            ->getJson('/api/dtr/9999999/' . self::DTR_START . '/' . self::DTR_END);

        $this->assertNotEquals(500, $response->status(),
            'A missing user must not produce a 500 — the controller catch block should handle it.');
        $this->assertNotEquals(200, $response->status());
    }

    // ─── Unauthorized — JWT enforcement (Pattern B — no withoutMiddleware) ────

    /** @test */
    public function test_dtr_without_any_authorization_header_returns_401_token_absent()
    {
        // No withoutMiddleware() — JWTAuthentication must fire
        $response = $this->getJson(
            "/api/dtr/{$this->user->id}/" . self::DTR_START . '/' . self::DTR_END,
            $this->apiKey  // API key present but no Bearer token
        );

        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_dtr_with_invalid_jwt_returns_401_token_invalid()
    {
        // Structurally valid JWT header+claims but garbage signature
        $fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' .
                     'eyJzdWIiOiIxMjM0NTY3ODkwIn0.' .
                     'BADSIGNATUREXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

        $response = $this->getJson(
            "/api/dtr/{$this->user->id}/" . self::DTR_START . '/' . self::DTR_END,
            array_merge($this->apiKey, ['Authorization' => "Bearer {$fakeToken}"])
        );

        $response->assertStatus(401);
        $this->assertContains(
            $response->json('error.content.code'),
            ['token_invalid', 'token_absent']
        );
    }

    // ─── Attack scenarios ─────────────────────────────────────────────────────

    /** @test */
    public function test_dtr_with_sql_injection_in_user_id_segment_returns_error_not_500()
    {
        $this->withoutMiddleware();

        // URL-encode the injection so it is parsed as the user_id segment value
        // Controller validates 'user_id' => 'int' → will fail → 400 error response
        $response = $this->actingAs($this->user)
            ->getJson('/api/dtr/1%20OR%201%3D1--/' . self::DTR_START . '/' . self::DTR_END);

        $this->assertNotEquals(500, $response->status(),
            'SQL injection attempt in URL segment must not produce a 500.');
        $this->assertNotEquals(200, $response->status(),
            'SQL injection attempt must not succeed as a valid request.');
    }

    /** @test */
    public function test_quickpunch_with_malformed_json_does_not_return_500()
    {
        $this->withoutMiddleware();

        // Send raw malformed JSON — server must not crash
        $response = $this->call(
            'POST',
            '/api/dtr/quickpunch',
            [],
            [],
            [],
            [
                'HTTP_X-Authorization' => env(
                    'APP_API_KEY',
                    'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z'
                ),
                'CONTENT_TYPE' => 'application/json',
            ],
            '{quickpunch: "in", malformed:::}'
        );

        $this->assertNotEquals(500, $response->getStatusCode(),
            'Malformed JSON body on quickpunch must not produce a 500.');
    }
}
