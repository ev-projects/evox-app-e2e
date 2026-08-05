<?php

/**
 * EVOX P0 Payroll Cutoff API Tests — Vishnu Padmanabhan
 *
 * Scope: Scenarios NOT already covered by Gary's tests/Feature/Api/PayrollCutoffApiTest.php.
 * Gary covers: GET /all (200), content not empty, GET /{id} (known + nonexistent),
 *              GET /get_filter_for_dtr/{user_id}, GET /all without auth (401/403).
 *
 * This file adds: POST store (happy-path + assertDatabaseHas), PUT update,
 *                 DELETE destroy + assertSoftDeleted, full validation-rule coverage,
 *                 additional unauthorized enforcement, and attack vectors.
 *
 * Endpoints under test (all under middleware: jwtauth, auth.apikey):
 *   GET    /api/payroll/cutoff/all
 *   GET    /api/payroll/cutoff/{id}
 *   GET    /api/payroll/cutoff/get_filter_for_dtr/{user_id}
 *   POST   /api/payroll/cutoff/
 *   PUT    /api/payroll/cutoff/{id}
 *   DELETE /api/payroll/cutoff/{id}
 *
 * DB table: payroll_cutoffs  (model uses SoftDeletes)
 *
 * Test patterns:
 *   A — Controller logic: withoutMiddleware() + actingAs()
 *   B — Auth enforcement: no middleware bypass, no auth header
 *
 * Coverage driver: Xdebug — run with:
 *   php artisan test --filter=Vishnu\\\\PayrollCutoffApiTest --coverage
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Payroll\Models\PayrollCutoff;

class PayrollCutoffApiTest extends TestCase
{
    use DatabaseTransactions;

    /** @var array HTTP header carrying the application API key */
    private array $apiKey;

    /** @var User Active user used for actingAs() authentication */
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->apiKey = [
            'X-Authorization' => env(
                'APP_API_KEY',
                'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z'
            ),
        ];

        $this->user = User::where('is_active', 1)
            ->whereNotNull('country_id')
            ->where('country_id', '>', 0)
            ->firstOrFail();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Returns a start/end date pair guaranteed to not overlap any existing
     * payroll_cutoffs row.  Uses a far-future year so collision is impossible
     * in any real or test DB.
     *
     * @param int $offsetMonths  Shift the base month by this many months (to produce
     *                           non-overlapping pairs within the same test run).
     */
    private function uniqueFutureDates(int $offsetMonths = 0): array
    {
        $base  = now()->addYears(5)->addMonths($offsetMonths);
        $start = $base->startOfMonth()->format('Y-m-d');
        $end   = $base->endOfMonth()->format('Y-m-d');
        return [$start, $end];
    }

    /**
     * Creates a payroll cutoff row directly via Eloquent (bypasses FormRequest).
     * Used to seed data for update / delete tests.
     */
    private function createCutoff(string $start, string $end, string $name = 'Vishnu Test Cutoff'): PayrollCutoff
    {
        return PayrollCutoff::create([
            'name'       => $name,
            'start_date' => $start,
            'end_date'   => $end,
        ]);
    }

    // ─── Happy path — POST store + assertDatabaseHas (Pattern A) ─────────────

    /** @test */
    public function test_post_store_creates_cutoff_and_it_exists_in_database()
    {
        $this->withoutMiddleware();

        [$start, $end] = $this->uniqueFutureDates(0);

        $response = $this->actingAs($this->user)
            ->postJson('/api/payroll/cutoff', [
                'name'       => 'Vishnu Automated Test',
                'start_date' => $start,
                'end_date'   => $end,
            ]);

        $response->assertStatus(201);
        $response->assertJsonStructure(['message', 'content']);

        // Confirm the row landed in the DB
        $this->assertDatabaseHas('payroll_cutoffs', [
            'start_date'  => $start,
            'end_date'    => $end,
            'deleted_at'  => null,
        ]);
    }

    /** @test */
    public function test_post_store_response_content_has_id_start_date_and_end_date()
    {
        $this->withoutMiddleware();

        [$start, $end] = $this->uniqueFutureDates(1);

        $response = $this->actingAs($this->user)
            ->postJson('/api/payroll/cutoff', [
                'name'       => 'Vishnu Test No-Name Check',  // name is NOT NULL in DB
                'start_date' => $start,
                'end_date'   => $end,
            ]);

        $response->assertStatus(201);
        $content = $response->json('content');

        $this->assertArrayHasKey('id',         $content, 'Response content must include id');
        $this->assertArrayHasKey('start_date', $content);
        $this->assertArrayHasKey('end_date',   $content);
    }

    // ─── Happy path — PUT update (Pattern A) ─────────────────────────────────

    /** @test */
    public function test_put_update_modifies_cutoff_name_and_returns_200()
    {
        $this->withoutMiddleware();

        [$start, $end] = $this->uniqueFutureDates(2);
        $cutoff = $this->createCutoff($start, $end, 'Original Name');

        $response = $this->actingAs($this->user)
            ->putJson("/api/payroll/cutoff/{$cutoff->id}", [
                'name'       => 'Updated By Vishnu Test',
                'start_date' => $start,
                'end_date'   => $end,
            ]);

        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);

        // Verify the database reflects the new name
        $this->assertDatabaseHas('payroll_cutoffs', [
            'id'         => $cutoff->id,
            'name'       => 'Updated By Vishnu Test',
            'deleted_at' => null,
        ]);
    }

    // ─── Happy path — DELETE destroy + assertSoftDeleted (Pattern A) ──────────

    /** @test */
    public function test_delete_destroy_soft_deletes_cutoff_from_database()
    {
        $this->withoutMiddleware();

        [$start, $end] = $this->uniqueFutureDates(3);
        $cutoff = $this->createCutoff($start, $end, 'To Be Deleted');

        // Confirm row exists before deletion
        $this->assertDatabaseHas('payroll_cutoffs', ['id' => $cutoff->id, 'deleted_at' => null]);

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/payroll/cutoff/{$cutoff->id}");

        $response->assertStatus(200);

        // PayrollCutoff uses SoftDeletes — row must still exist but with deleted_at set
        $this->assertSoftDeleted('payroll_cutoffs', ['id' => $cutoff->id]);
        // Eloquent global scope hides soft-deleted records
        $this->assertNull(PayrollCutoff::find($cutoff->id));
    }

    // ─── Validation errors — POST store (Pattern A) ───────────────────────────

    /** @test */
    public function test_post_store_missing_start_date_returns_422()
    {
        $this->withoutMiddleware();

        [, $end] = $this->uniqueFutureDates(4);

        $response = $this->actingAs($this->user)
            ->postJson('/api/payroll/cutoff', [
                // start_date deliberately omitted
                'end_date' => $end,
            ]);

        // PayrollCutoffRequest uses failedValidation() → error_response with 422
        $response->assertStatus(422);
        $this->assertNotNull($response->json('error'), 'Missing start_date must produce error envelope');
    }

    /** @test */
    public function test_post_store_missing_end_date_returns_422()
    {
        $this->withoutMiddleware();

        [$start] = $this->uniqueFutureDates(5);

        $response = $this->actingAs($this->user)
            ->postJson('/api/payroll/cutoff', [
                'start_date' => $start,
                // end_date deliberately omitted
            ]);

        $response->assertStatus(422);
        $this->assertNotNull($response->json('error'));
    }

    /** @test */
    public function test_post_store_end_date_before_start_date_returns_422()
    {
        $this->withoutMiddleware();

        [$start, $end] = $this->uniqueFutureDates(6);

        $response = $this->actingAs($this->user)
            ->postJson('/api/payroll/cutoff', [
                'start_date' => $end,    // reversed intentionally
                'end_date'   => $start,
            ]);

        // after_or_equal:start_date rule must fire
        $response->assertStatus(422);
    }

    /** @test */
    public function test_post_store_invalid_date_format_returns_422()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->postJson('/api/payroll/cutoff', [
                'start_date' => '01/01/2030',  // must be Y-m-d
                'end_date'   => '01/31/2030',
            ]);

        $response->assertStatus(422);
    }

    /** @test */
    public function test_post_store_name_at_boundary_255_chars_is_accepted()
    {
        $this->withoutMiddleware();

        [$start, $end] = $this->uniqueFutureDates(7);

        $response = $this->actingAs($this->user)
            ->postJson('/api/payroll/cutoff', [
                'name'       => str_repeat('A', 255),  // exactly at max:255
                'start_date' => $start,
                'end_date'   => $end,
            ]);

        // 255-char name is exactly on the boundary — must succeed
        $response->assertStatus(201);
    }

    /** @test */
    public function test_post_store_name_exceeding_255_chars_returns_422()
    {
        $this->withoutMiddleware();

        [$start, $end] = $this->uniqueFutureDates(8);

        $response = $this->actingAs($this->user)
            ->postJson('/api/payroll/cutoff', [
                'name'       => str_repeat('X', 256),  // one over max:255
                'start_date' => $start,
                'end_date'   => $end,
            ]);

        $response->assertStatus(422);
    }

    // ─── Not found (Pattern A) ────────────────────────────────────────────────

    /** @test */
    public function test_find_nonexistent_cutoff_id_returns_404()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/payroll/cutoff/9999999');

        // PayrollCutoffController::find() catches Exception and returns 404 explicitly
        $response->assertStatus(404);
    }

    /** @test */
    public function test_delete_nonexistent_cutoff_id_returns_error_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->deleteJson('/api/payroll/cutoff/9999999');

        $this->assertNotEquals(500, $response->status(),
            'Deleting a non-existent cutoff must not produce a 500.');
        $this->assertNotEquals(200, $response->status());
    }

    // ─── Unauthorized enforcement (Pattern B — no withoutMiddleware) ──────────

    /** @test */
    public function test_post_store_without_authorization_header_returns_401()
    {
        // No Bearer token — JWTAuthentication middleware fires
        $response = $this->postJson('/api/payroll/cutoff', [
            'start_date' => '2030-01-01',
            'end_date'   => '2030-01-31',
        ], $this->apiKey);

        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_put_update_without_authorization_header_returns_401()
    {
        $response = $this->putJson('/api/payroll/cutoff/1', [
            'start_date' => '2030-01-01',
            'end_date'   => '2030-01-31',
        ], $this->apiKey);

        $response->assertStatus(401);
    }

    /** @test */
    public function test_delete_without_authorization_header_returns_401()
    {
        $response = $this->deleteJson('/api/payroll/cutoff/1', [], $this->apiKey);

        $response->assertStatus(401);
    }

    // ─── Attack scenarios (Pattern A) ─────────────────────────────────────────

    /** @test */
    public function test_post_store_with_sql_injection_in_name_is_sanitized_not_500()
    {
        $this->withoutMiddleware();

        [$start, $end] = $this->uniqueFutureDates(9);

        // SQL injection in name — Eloquent's prepared statements should neutralise it
        $response = $this->actingAs($this->user)
            ->postJson('/api/payroll/cutoff', [
                'name'       => "'; DROP TABLE payroll_cutoffs; --",
                'start_date' => $start,
                'end_date'   => $end,
            ]);

        $this->assertNotEquals(500, $response->status(),
            'SQL injection in name field must not produce a 500.');

        // payroll_cutoffs table must still exist and be queryable
        $this->assertGreaterThan(0, PayrollCutoff::withTrashed()->count(),
            'payroll_cutoffs table must survive the injection attempt.');
    }

    /** @test */
    public function test_post_store_with_oversized_name_field_returns_422_not_500()
    {
        $this->withoutMiddleware();

        [$start, $end] = $this->uniqueFutureDates(10);

        // 65 535-byte string — well above MySQL TEXT and validation limit
        $response = $this->actingAs($this->user)
            ->postJson('/api/payroll/cutoff', [
                'name'       => str_repeat('Z', 65535),
                'start_date' => $start,
                'end_date'   => $end,
            ]);

        // max:255 validation must fire before the string reaches the DB
        $response->assertStatus(422);
    }

    /** @test */
    public function test_post_store_with_malformed_json_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->call(
            'POST',
            '/api/payroll/cutoff',
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
            '{start_date: "2030-01-01", end_date:::}'   // intentionally malformed
        );

        $this->assertNotEquals(500, $response->getStatusCode(),
            'Malformed JSON body must not produce a 500.');
    }
}
