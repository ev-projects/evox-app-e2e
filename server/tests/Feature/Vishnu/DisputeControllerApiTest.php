<?php

// DRAFT — generated 2026-06-17, needs verification

/**
 * EVOX Dispute API Tests — Vishnu Padmanabhan
 *
 * All 6 Dispute endpoints share middleware: jwtauth, auth.apikey.
 * Several endpoints call stored procedures (EV_SP_Validate_Payroll_Level,
 * EV_SP_PD_Get_Payroll_Report, EV_SP_PD_Get_Pending_Request,
 * EV_SP_PD_Update_Dispute_Status, EV_SP_Get_Payroll_Cutoff).
 * The SPs fire against the test DB — coverage is achieved as long as
 * the request reaches the controller without a 500.
 *
 * Routes (all under prefix /api/, middleware: jwtauth, auth.apikey):
 *   GET  /api/getdispute
 *   GET  /api/getdisputeExport
 *   PUT  /api/updatedispute/{id}
 *   GET  /api/getuserdispute/{id}
 *   GET  /api/getpayrollcutoff/{fromdate}/{todate}
 *   POST /api/storedispute
 *
 * Test patterns:
 *   A — Controller logic: withoutMiddleware() + actingAs()  → assert not 500
 *   B — Auth enforcement: no withoutMiddleware(), no token   → assert 401
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Dispute;

class DisputeControllerApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
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
            ->whereNotNull('email')
            ->firstOrFail();
    }

    // ─── Pattern B: Auth enforcement — no token → 401 ────────────────────────

    /** @test */
    public function test_getdispute_without_token_returns_401()
    {
        $response = $this->getJson('/api/getdispute', $this->apiKey);
        $response->assertStatus(401);
    }

    /** @test */
    public function test_getdisputeexport_without_token_returns_401()
    {
        $response = $this->getJson('/api/getdisputeExport', $this->apiKey);
        $response->assertStatus(401);
    }

    /** @test */
    public function test_updatedispute_without_token_returns_401()
    {
        $response = $this->putJson('/api/updatedispute/1', [], $this->apiKey);
        $response->assertStatus(401);
    }

    /** @test */
    public function test_getuserdispute_without_token_returns_401()
    {
        $response = $this->getJson('/api/getuserdispute/1', $this->apiKey);
        $response->assertStatus(401);
    }

    /** @test */
    public function test_getpayrollcutoff_without_token_returns_401()
    {
        $response = $this->getJson('/api/getpayrollcutoff/2026-06-01/2026-06-15', $this->apiKey);
        $response->assertStatus(401);
    }

    /** @test */
    public function test_storedispute_without_token_returns_401()
    {
        $response = $this->postJson('/api/storedispute', [], $this->apiKey);
        $response->assertStatus(401);
    }

    // ─── Pattern A: getdispute — calls EV_SP_Validate_Payroll_Level then ─────
    //     either EV_SP_PD_Get_Payroll_Report or EV_SP_PD_Get_Pending_Request

    /** @test */
    public function test_getdispute_with_auth_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/getdispute', $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'getdispute must not throw 500 — SP failure must be caught.');
    }

    /** @test */
    public function test_getdispute_with_date_filter_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/getdispute?startDate=2026-06-01&endDate=2026-06-15', $this->apiKey);

        $this->assertNotEquals(500, $response->status());
    }

    // ─── Pattern A: getdisputeExport — calls EV_SP_PD_Get_Payroll_Report ─────
    //     returns a CSV download or an error_response envelope

    /** @test */
    public function test_getdisputeexport_with_auth_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/getdisputeExport', $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'getdisputeExport must not throw 500 — SP or Excel failure must be caught.');
    }

    // ─── Pattern A: updatedispute — calls EV_SP_PD_Update_Dispute_Status ─────

    /** @test */
    public function test_updatedispute_with_auth_returns_not_500()
    {
        $this->withoutMiddleware();

        // Use first existing dispute ID, fall back to 1 if table is empty
        $disputeId = optional(Dispute::first())->id ?? 1;

        $response = $this->actingAs($this->user)
            ->putJson('/api/updatedispute/' . $disputeId, [
                'status'  => 'Approved',
                'remarks' => 'Test remark from PHPUnit',
            ], $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'updatedispute must not throw 500 — SP failure must be caught.');
    }

    /** @test */
    public function test_updatedispute_without_status_returns_not_500()
    {
        $this->withoutMiddleware();

        $disputeId = optional(Dispute::first())->id ?? 1;

        // remarks is nullable; status is accepted as-is by the SP
        $response = $this->actingAs($this->user)
            ->putJson('/api/updatedispute/' . $disputeId, [], $this->apiKey);

        $this->assertNotEquals(500, $response->status());
    }

    // ─── Pattern A: getuserdispute/{id} — calls EV_SP_PD_Get_Pending_Request ─

    /** @test */
    public function test_getuserdispute_with_auth_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/getuserdispute/' . $this->user->id, $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'getuserdispute must not throw 500 — SP failure must be caught.');
    }

    /** @test */
    public function test_getuserdispute_response_has_success_envelope()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/getuserdispute/' . $this->user->id, $this->apiKey);

        if ($response->status() === 200) {
            $response->assertJsonStructure(['message', 'content']);
        } else {
            $this->assertNotNull($response->json('error'),
                'Non-200 response must use the error envelope.');
        }
    }

    // ─── Pattern A: getpayrollcutoff/{fromdate}/{todate} ─────────────────────
    //     Calls EV_SP_Get_Payroll_Cutoff and returns $result_sets[0] directly

    /** @test */
    public function test_getpayrollcutoff_with_valid_dates_returns_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/getpayrollcutoff/2026-06-01/2026-06-15', $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'getpayrollcutoff must not throw 500 — SP failure must be caught.');
    }

    /** @test */
    public function test_getpayrollcutoff_response_is_array()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/getpayrollcutoff/2026-06-01/2026-06-15', $this->apiKey);

        if ($response->status() === 200) {
            $this->assertIsArray($response->json(),
                'getpayrollcutoff returns $result_sets[0] directly — must be a JSON array.');
        } else {
            $this->assertNotEquals(500, $response->status());
        }
    }

    // ─── Pattern A: storedispute — Validator + Dispute::create ───────────────

    /** @test */
    public function test_storedispute_with_valid_payload_returns_201()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->postJson('/api/storedispute', [
                'employee_id'  => $this->user->id,
                'dispute_type' => 'Overtime',
                'description'  => 'PHPUnit test dispute',
                'status'       => 'Pending',
            ], $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'storedispute must not throw 500 on a valid payload.');
        // On success the controller returns 201
        $this->assertEquals(201, $response->status(),
            'storedispute must return 201 when the record is created successfully.');
        $response->assertJsonStructure(['message', 'dispute']);
    }

    /** @test */
    public function test_storedispute_with_invalid_payload_returns_validation_errors()
    {
        $this->withoutMiddleware();

        // employee_id and dispute_type are both required; send neither
        $response = $this->actingAs($this->user)
            ->postJson('/api/storedispute', [], $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'storedispute must not throw 500 on a missing-field payload — validator must catch it.');
        // Validator failure returns 200 with an errors key (Laravel 5.7 default)
        $response->assertJsonStructure(['errors']);
    }

    /** @test */
    public function test_storedispute_with_nonexistent_employee_id_returns_validation_errors()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->postJson('/api/storedispute', [
                'employee_id'  => 999999999,
                'dispute_type' => 'Overtime',
            ], $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'storedispute with non-existent employee_id must fail validation, not 500.');
        $response->assertJsonStructure(['errors']);
    }
}
