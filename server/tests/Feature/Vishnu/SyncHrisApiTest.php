<?php

// DRAFT — generated 2026-06-17, needs verification

/**
 * EVOX Sync HRIS API Tests — Vishnu Padmanabhan
 *
 * Focused coverage for the four HRIS-facing sync endpoints.
 * All four routes use ONLY auth.apikey middleware (no JWT).
 * They are called by the HRIS/BHR integration, not by logged-in users.
 *
 * Routes (all POST, middleware: auth.apikey only):
 *   POST /api/sync_timeoff_allocation          → SyncController@timeoff_allocation_HRIS
 *   POST /api/sync_timeoff_allocation_new       → SyncController@timeoff_allocation_HRIS_New
 *   POST /api/sync_timeoff_allocation_fail_sync → SyncController@timeoff_allocation_HRIS_fail_sync
 *   POST /api/sync_users_hris                   → SyncController@syncusers_HRIS
 *
 * Note: SyncApiTest already covers Pattern K (401 without key) and bare
 * reachability for all 7 sync routes. This file adds Pattern A coverage:
 * withoutMiddleware + actingAs + minimal valid payload → assert not 500.
 * Goal is exercising the SP call path. DB state does not matter — the SP
 * firing without a PHP exception is the coverage target.
 *
 * Response envelopes:
 *   timeoff_allocation_HRIS        — array body, returns {"message","failed_sync"} HTTP 200/500
 *   timeoff_allocation_HRIS_New    — flat object body, returns {"status","message","BhrNumber"} HTTP 200/202
 *   timeoff_allocation_HRIS_fail_sync — array body, returns {"message","success_sync","failed_sync"} HTTP 200/500
 *   syncusers_HRIS                 — flat object body, returns {"status","message","Employee Name","Employee_status"} HTTP 200/202
 *
 * Test patterns:
 *   B — Auth enforcement : no X-Authorization header → 401
 *   A — Controller logic : withoutMiddleware() + actingAs() + minimal valid payload → not 500
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class SyncHrisApiTest extends TestCase
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

    // ─── Pattern B — auth.apikey enforcement (no X-Authorization header → 401) ─

    /** @test */
    public function test_sync_timeoff_allocation_without_api_key_returns_401()
    {
        $response = $this->postJson('/api/sync_timeoff_allocation', []);
        $response->assertStatus(401);
        $this->assertNotNull($response->json('errors'),
            'Missing API key must return errors envelope from auth.apikey middleware.');
    }

    /** @test */
    public function test_sync_timeoff_allocation_new_without_api_key_returns_401()
    {
        $response = $this->postJson('/api/sync_timeoff_allocation_new', []);
        $response->assertStatus(401);
        $this->assertNotNull($response->json('errors'));
    }

    /** @test */
    public function test_sync_timeoff_allocation_fail_sync_without_api_key_returns_401()
    {
        $response = $this->postJson('/api/sync_timeoff_allocation_fail_sync', []);
        $response->assertStatus(401);
        $this->assertNotNull($response->json('errors'));
    }

    /** @test */
    public function test_sync_users_hris_without_api_key_returns_401()
    {
        $response = $this->postJson('/api/sync_users_hris', []);
        $response->assertStatus(401);
        $this->assertNotNull($response->json('errors'));
    }

    // ─── Pattern A — timeoff_allocation_HRIS (array body) ────────────────────
    //
    // timeoff_allocation_HRIS reads the body as a JSON array. Each element must
    // contain bhrNumber, timeoffType, validFrom. Sends one valid item so the
    // call_sp path fires. SP may succeed (200) or fail gracefully (non-500).

    /** @test */
    public function test_sync_timeoff_allocation_with_valid_item_does_not_return_500()
    {
        $this->withoutMiddleware();

        $payload = [
            [
                'id'             => 1,
                'bhrNumber'      => 'BHR-TEST-001',
                'timeoffType'    => 'Annual Leave',
                'description'    => 'Test allocation',
                'duration'       => 1,
                'validFrom'      => '2026-01-01',
                'validTo'        => '2026-12-31',
                'remainingDays'  => 10,
                'allocationType' => 'Annual',
            ],
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/sync_timeoff_allocation', $payload, $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'timeoff_allocation_HRIS must not throw 500 — exceptions are caught by error_response.');
        $this->assertNotNull($response->json('message'),
            'Response must contain a message key.');
        $this->assertArrayHasKey('failed_sync', $response->json(),
            'Response must contain failed_sync array.');
    }

    /** @test */
    public function test_sync_timeoff_allocation_with_empty_array_returns_200_and_empty_failed_sync()
    {
        $this->withoutMiddleware();

        // Empty array: foreach is a no-op → always returns 200 with empty failed_sync
        $response = $this->actingAs($this->user)
            ->postJson('/api/sync_timeoff_allocation', [], $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        $response->assertStatus(200);
        $this->assertEquals([], $response->json('failed_sync'),
            'Empty body must produce empty failed_sync list.');
        $this->assertEquals('timeoff sync success', $response->json('message'));
    }

    /** @test */
    public function test_sync_timeoff_allocation_with_missing_required_fields_logs_id_in_failed_sync()
    {
        $this->withoutMiddleware();

        // Item missing bhrNumber, timeoffType, validFrom → validator fails → id pushed to failed_sync
        $payload = [
            [
                'id'          => 99,
                'description' => 'incomplete item',
            ],
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/sync_timeoff_allocation', $payload, $this->apiKey);

        // Validation failure path: returns 500 with failed_sync containing id=99
        $this->assertNotEquals(404, $response->status());
        $this->assertContains(99, $response->json('failed_sync'),
            'Invalid item must be logged in failed_sync by id.');
    }

    // ─── Pattern A — timeoff_allocation_HRIS_New (flat object body) ──────────
    //
    // Required fields: bhrNumber, timeoffType, validFrom.
    // Returns flat JSON: {"status":"200","message":"...","BhrNumber":"..."}.

    /** @test */
    public function test_sync_timeoff_allocation_new_with_valid_payload_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->postJson('/api/sync_timeoff_allocation_new', [
                'bhrNumber'      => 'BHR-TEST-002',
                'timeoffType'    => 'Sick Leave',
                'description'    => 'Test new allocation',
                'duration'       => 1,
                'validFrom'      => '2026-01-01',
                'validTo'        => '2026-12-31',
                'remainingDays'  => 5,
                'allocationType' => 'Sick',
            ], $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'timeoff_allocation_HRIS_New must not throw 500.');
        // SP fires: result[0] present → 200, absent → 202; both are acceptable
        $this->assertContains($response->status(), [200, 202],
            'Expected HTTP 200 (inserted) or 202 (SP returned no row).');
        $this->assertNotNull($response->json('message'));
        $this->assertEquals('BHR-TEST-002', $response->json('BhrNumber'));
    }

    /** @test */
    public function test_sync_timeoff_allocation_new_with_missing_required_fields_returns_error_not_500()
    {
        $this->withoutMiddleware();

        // Missing bhrNumber, timeoffType, validFrom → validator fires → error_response
        $response = $this->actingAs($this->user)
            ->postJson('/api/sync_timeoff_allocation_new', [
                'description' => 'incomplete',
            ], $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'Validation failure must use error_response, not crash with 500.');
        $this->assertNotNull($response->json('error'),
            'Validation failure must use the EVOX error envelope.');
    }

    // ─── Pattern A — timeoff_allocation_HRIS_fail_sync (array body) ──────────
    //
    // Same shape as timeoff_allocation_HRIS but response also includes success_sync.

    /** @test */
    public function test_sync_timeoff_allocation_fail_sync_with_valid_item_does_not_return_500()
    {
        $this->withoutMiddleware();

        $payload = [
            [
                'id'             => 2,
                'bhrNumber'      => 'BHR-TEST-003',
                'timeoffType'    => 'Annual Leave',
                'description'    => 'Test fail_sync allocation',
                'duration'       => 2,
                'validFrom'      => '2026-01-01',
                'validTo'        => '2026-12-31',
                'remainingDays'  => 8,
                'allocationType' => 'Annual',
            ],
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/sync_timeoff_allocation_fail_sync', $payload, $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'timeoff_allocation_HRIS_fail_sync must not throw 500.');
        $this->assertArrayHasKey('failed_sync', $response->json());
        $this->assertArrayHasKey('success_sync', $response->json(),
            'fail_sync variant must include success_sync list in response.');
    }

    /** @test */
    public function test_sync_timeoff_allocation_fail_sync_with_empty_array_returns_200()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->postJson('/api/sync_timeoff_allocation_fail_sync', [], $this->apiKey);

        $response->assertStatus(200);
        $this->assertEquals([], $response->json('failed_sync'));
        $this->assertEquals([], $response->json('success_sync'));
        $this->assertEquals('timeoff sync success', $response->json('message'));
    }

    /** @test */
    public function test_sync_timeoff_allocation_fail_sync_with_missing_fields_logs_id_in_failed_sync()
    {
        $this->withoutMiddleware();

        $payload = [
            [
                'id'          => 77,
                'description' => 'incomplete item',
            ],
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/sync_timeoff_allocation_fail_sync', $payload, $this->apiKey);

        $this->assertNotEquals(404, $response->status());
        $this->assertContains(77, $response->json('failed_sync'),
            'Invalid item must appear in failed_sync.');
    }

    // ─── Pattern A — syncusers_HRIS (flat object body) ───────────────────────
    //
    // Required fields: firstName, lastName, employeeNumber, bhrNumber, status.
    // (bestEmail is commented out in the validator — not required.)
    // Returns flat JSON: {"status","message","Employee Name","Employee_status"}.

    /** @test */
    public function test_sync_users_hris_with_valid_payload_does_not_return_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->postJson('/api/sync_users_hris', [
                'firstName'               => 'Test',
                'lastName'                => 'Employee',
                'middleName'              => '',
                'nickname'                => '',
                'bestEmail'               => 'test.employee@test.com',
                'userName'                => 'testemployee',
                'employeeNumber'          => 99999,
                'bhrNumber'               => 99999,
                'status'                  => 1,
                'jobTitle'                => 'Test Role',
                'country'                 => 'PH',
                'dateOfBirth'             => '1990-01-01',
                'hireDate'                => '2026-01-01',
                'terminationDate'         => null,
                'employmentHistoryStatus' => 'Active',
                'department'              => 'Test Dept',
                'mobilePhone'             => '09000000000',
                'supervisorId'            => 0,
                'Subdepartmentname'       => '',
                'subdepartmentsupervisorId' => 0,
                'division'                => '',
            ], $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'syncusers_HRIS must not throw 500 — SP failure must be caught by error_response.');
        $this->assertContains($response->status(), [200, 202],
            'Expected HTTP 200 (upserted) or 202 (SP returned no row).');
        $this->assertNotNull($response->json('message'));
        $this->assertArrayHasKey('Employee_status', $response->json());
    }

    /** @test */
    public function test_sync_users_hris_with_missing_required_fields_returns_error_not_500()
    {
        $this->withoutMiddleware();

        // Missing firstName, lastName, employeeNumber, bhrNumber, status
        $response = $this->actingAs($this->user)
            ->postJson('/api/sync_users_hris', [
                'middleName' => 'Only',
            ], $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'Validation failure must use error_response, not crash with 500.');
        // syncusers_HRIS uses error_response() on validation failure (not raw errors key)
        $this->assertNotNull($response->json('error'),
            'Validation failure must use the EVOX error envelope.');
    }

    /** @test */
    public function test_sync_users_hris_with_none_termination_date_does_not_return_500()
    {
        $this->withoutMiddleware();

        // terminationDate = "None" triggers the null-coercion branch in the controller
        $response = $this->actingAs($this->user)
            ->postJson('/api/sync_users_hris', [
                'firstName'               => 'Test',
                'lastName'                => 'TermNone',
                'employeeNumber'          => 99998,
                'bhrNumber'               => 99998,
                'status'                  => 1,
                'terminationDate'         => 'None',
                'bestEmail'               => 'test.termnone@test.com',
                'userName'                => 'testtermnone',
                'jobTitle'                => 'Test Role',
                'country'                 => 'PH',
                'dateOfBirth'             => '1990-01-01',
                'hireDate'                => '2026-01-01',
                'employmentHistoryStatus' => 'Active',
                'department'              => 'Test Dept',
                'mobilePhone'             => '09000000000',
                'supervisorId'            => 0,
                'Subdepartmentname'       => '',
                'subdepartmentsupervisorId' => 0,
                'division'                => '',
            ], $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'terminationDate="None" must be coerced to null without crashing.');
    }

    /** @test */
    public function test_sync_users_hris_with_zero_date_termination_does_not_return_500()
    {
        $this->withoutMiddleware();

        // terminationDate = "0000-00-00" — another null-coercion branch
        $response = $this->actingAs($this->user)
            ->postJson('/api/sync_users_hris', [
                'firstName'               => 'Test',
                'lastName'                => 'ZeroDate',
                'employeeNumber'          => 99997,
                'bhrNumber'               => 99997,
                'status'                  => 1,
                'terminationDate'         => '0000-00-00',
                'bestEmail'               => 'test.zerodate@test.com',
                'userName'                => 'testzerodate',
                'jobTitle'                => 'Test Role',
                'country'                 => 'PH',
                'dateOfBirth'             => '1990-01-01',
                'hireDate'                => '2026-01-01',
                'employmentHistoryStatus' => 'Active',
                'department'              => 'Test Dept',
                'mobilePhone'             => '09000000000',
                'supervisorId'            => 0,
                'Subdepartmentname'       => '',
                'subdepartmentsupervisorId' => 0,
                'division'                => '',
            ], $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'terminationDate="0000-00-00" must be coerced to null without crashing.');
    }
}
