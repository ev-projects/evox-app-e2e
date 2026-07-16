<?php
// DRAFT — generated 2026-06-16, needs verification


namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Payroll\Models\PayrollCutoff;

/**
 * PayrollCutoffValidationApiTest
 *
 * Covers the gaps identified in the full-stack report that are NOT yet
 * covered by the existing PayrollCutoffApiTest.php (TC-022 through TC-027)
 * plus auth-enforcement (Pattern B) for every route and additional
 * validation edge-cases (Pattern A).
 *
 * Routes under test:
 *   GET    /api/payroll/cutoff/all
 *   GET    /api/payroll/cutoff/{id}
 *   GET    /api/payroll/cutoff/get_filter_for_dtr/{user_id}
 *   POST   /api/payroll/cutoff/
 *   PUT    /api/payroll/cutoff/{id}          (via POST + _method=PUT spoofing)
 *   DELETE /api/payroll/cutoff/{id}
 */
class PayrollCutoffValidationApiTest extends TestCase
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

    // -----------------------------------------------------------------------
    // Pattern B — auth enforcement (no withoutMiddleware)
    // Both jwtauth and auth.apikey middleware are active.
    // A request with the API key but NO JWT token must return 401 token_absent.
    // -----------------------------------------------------------------------

    /** @test */
    public function test_get_all_without_token_returns_401()
    {
        $response = $this->getJson('/api/payroll/cutoff/all', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_get_single_without_token_returns_401()
    {
        $response = $this->getJson('/api/payroll/cutoff/1', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_get_filter_for_dtr_without_token_returns_401()
    {
        $response = $this->getJson('/api/payroll/cutoff/get_filter_for_dtr/1', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_store_without_token_returns_401()
    {
        $response = $this->postJson('/api/payroll/cutoff/', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_update_without_token_returns_401()
    {
        $response = $this->putJson('/api/payroll/cutoff/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_delete_without_token_returns_401()
    {
        $response = $this->deleteJson('/api/payroll/cutoff/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // -----------------------------------------------------------------------
    // Pattern A — validation tests (withoutMiddleware + actingAs)
    // -----------------------------------------------------------------------

    /**
     * TC-STORE-EMPTY: POST with completely empty payload must return 422.
     * start_date and end_date are both required.
     *
     * @test
     */
    public function test_store_empty_payload_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/payroll/cutoff/', [], $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /**
     * TC-STORE-MISSING-START: POST missing start_date must return 422.
     *
     * @test
     */
    public function test_store_missing_start_date_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'name'     => 'Test Cutoff',
            'end_date' => '2030-01-31',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/payroll/cutoff/', $payload, $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /**
     * TC-STORE-MISSING-END: POST missing end_date must return 422.
     *
     * @test
     */
    public function test_store_missing_end_date_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'name'       => 'Test Cutoff',
            'start_date' => '2030-01-01',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/payroll/cutoff/', $payload, $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /**
     * TC-STORE-HAPPY: POST with a valid minimal payload returns 201.
     * Uses far-future dates to avoid overlap with existing data.
     *
     * @test
     */
    public function test_store_valid_payload_returns_201()
    {
        $this->withoutMiddleware();
        $payload = [
            'name'       => 'Validation Test Cutoff',
            'start_date' => '2031-03-01',
            'end_date'   => '2031-03-15',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/payroll/cutoff/', $payload, $this->apiKey);
        $response->assertStatus(201);
        $response->assertJsonStructure(['message', 'content']);
    }

    /**
     * TC-022: POST with overlapping date range returns 422 with unique_payroll_cutoff error.
     * Creates a seed record first, then submits a request that overlaps it.
     * Gap identified in full-stack report — not covered by existing tests.
     *
     * @test
     */
    public function test_store_overlapping_date_range_returns_422_with_overlap_message()
    {
        $this->withoutMiddleware();

        // Seed a record in the far future
        $seed = PayrollCutoff::create([
            'name'       => 'Overlap Seed',
            'start_date' => '2032-01-01',
            'end_date'   => '2032-01-31',
        ]);

        // Submit a range that overlaps the seed record (middle overlap)
        $payload = [
            'name'       => 'Overlap Attempt',
            'start_date' => '2032-01-15',
            'end_date'   => '2032-02-15',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/payroll/cutoff/', $payload, $this->apiKey);

        $this->assertEquals(422, $response->status());
        // The error message from the custom validator must be present somewhere in the response
        $responseBody = $response->getContent();
        $this->assertStringContainsString(
            'already exists',
            $responseBody,
            'Expected unique_payroll_cutoff error message in 422 response'
        );
    }

    /**
     * TC-023: PUT on a record with its own date range does NOT trigger unique_payroll_cutoff.
     * The self-exclusion `id <> route('id')` in the custom validator must work correctly.
     * Gap identified in full-stack report — not covered by existing tests.
     *
     * @test
     */
    public function test_update_own_date_range_does_not_return_422()
    {
        $this->withoutMiddleware();

        // Seed a record
        $seed = PayrollCutoff::create([
            'name'       => 'Self-Exclusion Test',
            'start_date' => '2033-02-01',
            'end_date'   => '2033-02-28',
        ]);

        // PUT back the exact same dates — should NOT be flagged as overlap
        $payload = [
            'name'       => 'Self-Exclusion Test Updated',
            'start_date' => '2033-02-01',
            'end_date'   => '2033-02-28',
        ];
        $response = $this->actingAs($this->user)
            ->putJson('/api/payroll/cutoff/' . $seed->id, $payload, $this->apiKey);

        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /**
     * TC-026: POST with null/omitted name is NOT rejected by backend validation.
     * Backend rule is 'string|max:255' (no 'required').
     * Note: BUG-006 means MySQL will reject a NULL insert — this test documents
     * that the validation layer accepts it but the DB layer may not.
     *
     * @test
     */
    public function test_store_null_name_is_not_rejected_by_validation()
    {
        $this->withoutMiddleware();

        $payload = [
            // name intentionally omitted
            'start_date' => '2034-04-01',
            'end_date'   => '2034-04-30',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/payroll/cutoff/', $payload, $this->apiKey);

        // Validation must NOT return 422 for a missing name field.
        // The response may be 201 (if DB allows null) or 400 (if MySQL rejects null — BUG-006).
        // Either way it must not be a Laravel validation 422.
        $this->assertNotEquals(
            422,
            $response->status(),
            'Backend validation must not require name — BUG-006 documents the DB-level null rejection separately'
        );
    }

    /**
     * TC-STORE-END-BEFORE-START: POST with end_date before start_date returns 422.
     * The after_or_equal:start_date rule on end_date must catch this.
     *
     * @test
     */
    public function test_store_end_date_before_start_date_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'name'       => 'Bad Date Range',
            'start_date' => '2031-06-30',
            'end_date'   => '2031-06-01',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/payroll/cutoff/', $payload, $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /**
     * TC-STORE-NAME-256: POST with name exceeding 255 characters returns 422.
     *
     * @test
     */
    public function test_store_name_exceeding_255_chars_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'name'       => str_repeat('A', 256),
            'start_date' => '2031-07-01',
            'end_date'   => '2031-07-15',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/payroll/cutoff/', $payload, $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /**
     * TC-STORE-NAME-255: POST with name exactly 255 characters returns 201.
     *
     * @test
     */
    public function test_store_name_exactly_255_chars_returns_201()
    {
        $this->withoutMiddleware();
        $payload = [
            'name'       => str_repeat('B', 255),
            'start_date' => '2031-08-01',
            'end_date'   => '2031-08-31',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/payroll/cutoff/', $payload, $this->apiKey);
        $response->assertStatus(201);
        $response->assertJsonStructure(['message', 'content']);
    }

    /**
     * TC-STORE-INVALID-DATE: POST with invalid date format (MM/DD/YYYY) returns 422.
     *
     * @test
     */
    public function test_store_invalid_date_format_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'name'       => 'Bad Format',
            'start_date' => '01/01/2031',
            'end_date'   => '01/31/2031',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/payroll/cutoff/', $payload, $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /**
     * TC-UPDATE-EMPTY: PUT with completely empty payload returns 422
     * (start_date and end_date are required on update as well).
     *
     * @test
     */
    public function test_update_empty_payload_returns_422()
    {
        $this->withoutMiddleware();

        $seed = PayrollCutoff::create([
            'name'       => 'Update Empty Test',
            'start_date' => '2035-01-01',
            'end_date'   => '2035-01-31',
        ]);

        $response = $this->actingAs($this->user)
            ->putJson('/api/payroll/cutoff/' . $seed->id, [], $this->apiKey);

        $this->assertEquals(422, $response->status());
    }

    /**
     * TC-027: Soft-deleted record is excluded from GET /all.
     * After destroy(), the record must not appear in the list.
     * Gap identified in full-stack report.
     *
     * @test
     */
    public function test_soft_deleted_record_excluded_from_get_all()
    {
        $this->withoutMiddleware();

        // Create a record
        $seed = PayrollCutoff::create([
            'name'       => 'To Be Deleted',
            'start_date' => '2036-01-01',
            'end_date'   => '2036-01-31',
        ]);

        // Soft-delete it directly via model
        $seed->delete();

        // GET /all must not return this record
        $response = $this->actingAs($this->user)->getJson('/api/payroll/cutoff/all', $this->apiKey);
        $response->assertStatus(200);

        $ids = collect($response->json('content'))->pluck('id')->toArray();
        $this->assertNotContains(
            $seed->id,
            $ids,
            'Soft-deleted payroll_cutoff record must not appear in GET /all'
        );
    }

    /**
     * TC-027b: Soft-deleted record returns 404 on GET /{id}.
     *
     * @test
     */
    public function test_soft_deleted_record_returns_404_on_find()
    {
        $this->withoutMiddleware();

        $seed = PayrollCutoff::create([
            'name'       => 'To Be Deleted Find Test',
            'start_date' => '2036-02-01',
            'end_date'   => '2036-02-28',
        ]);

        $seed->delete();

        $response = $this->actingAs($this->user)
            ->getJson('/api/payroll/cutoff/' . $seed->id, $this->apiKey);

        $response->assertStatus(404);
    }

    /**
     * TC-NULL-ID: GET /api/payroll/cutoff/999999 must not return 500.
     * Should return 404 (ModelNotFoundException caught by controller).
     *
     * @test
     */
    public function test_get_nonexistent_id_does_not_return_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/payroll/cutoff/999999', $this->apiKey);

        $this->assertNotEquals(500, $response->status(), 'GET /api/payroll/cutoff/999999 must not return 500');
        $response->assertStatus(404);
    }

    /**
     * TC-DELETE-NONEXISTENT: DELETE /api/payroll/cutoff/999999 must not return 500.
     *
     * @test
     */
    public function test_delete_nonexistent_id_does_not_return_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->deleteJson('/api/payroll/cutoff/999999', [], $this->apiKey);

        $this->assertNotEquals(500, $response->status(), 'DELETE /api/payroll/cutoff/999999 must not return 500');
    }

    /**
     * TC-UPDATE-HAPPY: PUT with valid payload returns 200 + expected structure.
     *
     * @test
     */
    public function test_update_valid_payload_returns_200()
    {
        $this->withoutMiddleware();

        $seed = PayrollCutoff::create([
            'name'       => 'Before Update',
            'start_date' => '2037-03-01',
            'end_date'   => '2037-03-31',
        ]);

        $payload = [
            'name'       => 'After Update',
            'start_date' => '2037-03-01',
            'end_date'   => '2037-03-31',
        ];

        $response = $this->actingAs($this->user)
            ->putJson('/api/payroll/cutoff/' . $seed->id, $payload, $this->apiKey);

        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /**
     * TC-DESTROY-HAPPY: DELETE /{id} returns 200 and record is soft-deleted.
     *
     * @test
     */
    public function test_destroy_existing_record_returns_200()
    {
        $this->withoutMiddleware();

        $seed = PayrollCutoff::create([
            'name'       => 'To Destroy',
            'start_date' => '2037-04-01',
            'end_date'   => '2037-04-30',
        ]);

        $response = $this->actingAs($this->user)
            ->deleteJson('/api/payroll/cutoff/' . $seed->id, [], $this->apiKey);

        $response->assertStatus(200);
        $this->assertSoftDeleted('payroll_cutoffs', ['id' => $seed->id]);
    }

    /**
     * TC-GET-ALL-STRUCTURE: GET /all returns 200 with message + content keys.
     *
     * @test
     */
    public function test_get_all_returns_200_with_expected_structure()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/payroll/cutoff/all', $this->apiKey);
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /**
     * TC-STORE-RESPONSE-FIELDS: POST store response content contains id, start_date, end_date.
     *
     * @test
     */
    public function test_store_response_content_has_id_start_date_end_date()
    {
        $this->withoutMiddleware();
        $payload = [
            'name'       => 'Resource Fields Test',
            'start_date' => '2038-01-01',
            'end_date'   => '2038-01-31',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/payroll/cutoff/', $payload, $this->apiKey);
        $response->assertStatus(201);
        $response->assertJsonStructure([
            'message',
            'content' => ['id', 'name', 'start_date', 'end_date', 'year', 'month', 'month_label'],
        ]);
    }
}
