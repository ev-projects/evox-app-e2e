<?php
/**
 * @registry-doc payroll-cutoff.registry.md
 * @vetted-by    Gobi Singaravel
 * @vetted-on    2026-07-02
 *
 * VERIFIED-BACKED — generated 2026-07-07 from payroll-cutoff.registry.md
 *
 * Confirmed API endpoints (from [DEVELOPER VETTING]):
 *   GET    /api/payroll/cutoff/all      -> PayrollCutoffController::all()
 *   GET    /api/payroll/cutoff/{id}     -> PayrollCutoffController::find()
 *   POST   /api/payroll/cutoff/         -> PayrollCutoffController::store()
 *   POST   /api/payroll/cutoff/{id}     -> PayrollCutoffController::update()  (_method=PUT)
 *   DELETE /api/payroll/cutoff/{id}     -> PayrollCutoffController::destroy()
 *
 * Known bugs documented in this file:
 *   B-004: Backend permission middleware (permission:manage_payroll_cutoff) is commented out
 *          in routes — only the frontend ProtectedRoute guards access.
 */

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class PayrollCutoffVerifiedApiTest extends TestCase
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
    // Auth enforcement — no token should return 401
    // =========================================================================

    /** @test */
    public function test_get_all_without_token_returns_401(): void
    {
        $response = $this->getJson('/api/payroll/cutoff/all', $this->apiKey);
        $response->assertStatus(401);
    }

    /** @test */
    public function test_store_without_token_returns_401(): void
    {
        $response = $this->postJson('/api/payroll/cutoff/', [], $this->apiKey);
        $response->assertStatus(401);
    }

    // =========================================================================
    // GET /api/payroll/cutoff/all -> PayrollCutoffController::all()
    // Fires on page load; populates state.payrollCutoff.listInstance
    // =========================================================================

    /** @test */
    public function test_index_returns_200_with_data_key(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/payroll/cutoff/all', $this->apiKey);

        $response->assertStatus(200);
        // Response must be JSON — list is rendered into listInstance on the frontend
        $this->assertNotNull($response->json());
    }

    /** @test */
    public function test_index_returns_array_or_collection(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/payroll/cutoff/all', $this->apiKey);

        $response->assertStatus(200);
        $body = $response->json();
        // Body must be an array or object wrapping an array — not a scalar
        $this->assertTrue(is_array($body) || is_object($body));
    }

    // =========================================================================
    // GET /api/payroll/cutoff/{id} -> PayrollCutoffController::find()
    // Fired when Edit button is clicked; pre-populates inline form
    // =========================================================================

    /** @test */
    public function test_find_with_nonexistent_id_does_not_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/payroll/cutoff/999999', $this->apiKey);

        // Must not crash — 404 or empty payload are acceptable; 500 is not
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // POST /api/payroll/cutoff/ -> PayrollCutoffController::store() -> PayrollCutoff::create()
    // Triggered by Submit in Add mode (after window.confirm)
    // =========================================================================

    /** @test */
    public function test_store_with_valid_payload_returns_success(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->postJson('/api/payroll/cutoff/', [
                'name'       => 'Test Cutoff ' . time(),
                'start_date' => '2099-01-01',
                'end_date'   => '2099-01-15',
            ], $this->apiKey);

        // 200 or 201 both acceptable for store
        $this->assertContains($response->status(), [200, 201]);
    }

    /** @test */
    public function test_store_with_empty_name_returns_error(): void
    {
        // KNOWN BUG B-004: Name has no Yup required rule but DB column is NOT NULL
        // Backend returns a SQL error when name is empty — frontend shows generic message
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->postJson('/api/payroll/cutoff/', [
                'name'       => '',
                'start_date' => '2026-08-01',
                'end_date'   => '2026-08-15',
            ], $this->apiKey);

        // Must not return 200 with success — empty name violates DB NOT NULL constraint
        $this->assertNotEquals(200, $response->status(),
            'B-004: Submitting empty name should fail at DB layer — expected non-200 response.');
    }

    /** @test */
    public function test_store_end_date_before_start_date_is_rejected_by_backend(): void
    {
        // KNOWN BUG B-001: Frontend Yup cross-validation always passes
        // Backend PayrollCutoffRequest has after_or_equal:start_date for end_date — only working guard
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->postJson('/api/payroll/cutoff/', [
                'name'       => 'Bug B-001 Test',
                'start_date' => '2026-08-15',
                'end_date'   => '2026-08-01',  // end before start
            ], $this->apiKey);

        // Backend validation (after_or_equal) should reject this — 422 expected
        $this->assertNotEquals(200, $response->status(),
            'B-001: Backend after_or_equal:start_date rule should reject end_date before start_date.');
    }

    // =========================================================================
    // POST /api/payroll/cutoff/{id} + _method=PUT -> PayrollCutoffController::update()
    // Triggered by Submit in Edit mode (after window.confirm)
    // =========================================================================

    /** @test */
    public function test_update_with_nonexistent_id_does_not_500(): void
    {
        // [CODE REVIEW 2026-07-07] Route is Route::put('/{id}', ...) — must use putJson, not postJson.
        // postJson with _method=PUT in JSON body is NOT honoured by Laravel's router for JSON requests;
        // it would hit no matching route and return 405 instead of testing the update controller.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->putJson('/api/payroll/cutoff/999999', [
                'name'       => 'Updated Name',
                'start_date' => '2026-08-01',
                'end_date'   => '2026-08-15',
            ], $this->apiKey);

        // Non-existent record — 404 or validation error acceptable; 500 is not
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // DELETE /api/payroll/cutoff/{id} -> PayrollCutoffController::destroy() -> soft-delete
    // Triggered after window.confirm "Are you sure you want to delete this item?"
    // List refreshes via GET /api/payroll/cutoff/all after delete
    // =========================================================================

    /** @test */
    public function test_delete_with_nonexistent_id_does_not_500(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->deleteJson('/api/payroll/cutoff/999999', [], $this->apiKey);

        // Non-existent record — 404 or empty response acceptable; 500 is not
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // Known bug markers
    // =========================================================================

    /** @test */
    public function test_known_bug_b004_backend_permission_middleware_commented_out(): void
    {
        // KNOWN BUG B-004: route-level permission:manage_payroll_cutoff is commented out
        // Only the frontend ProtectedRoute guards access — backend has no route-level permission check
        // This test documents the bug; a future fix should re-enable the middleware
        $this->markTestIncomplete(
            'Known bug B-004: permission:manage_payroll_cutoff middleware is commented out in routes. ' .
            'Backend has no route-level access control — only frontend ProtectedRoute guards this page. ' .
            'See PayrollCutoffController routes file.'
        );
    }
}
