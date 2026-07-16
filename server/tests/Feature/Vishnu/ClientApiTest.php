<?php

/**
 * EVOX Client API Tests — Vishnu Padmanabhan
 *
 * Routes (middleware: jwtauth, auth.apikey):
 *   POST /api/client/assign                        — assign employees to a client
 *   GET  /api/client/{client_id}/{department_id}/users — list users for a client+department
 *
 * Test patterns:
 *   A — Controller logic: withoutMiddleware() + actingAs()
 *   B — Auth enforcement: no withoutMiddleware(), no Bearer token → 401
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\DB;

class ClientApiTest extends TestCase
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

    // ─── Auth enforcement (Pattern B) ────────────────────────────────────────

    /** @test */
    public function test_assign_client_without_token_returns_401_token_absent()
    {
        $response = $this->postJson('/api/client/assign', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_get_client_users_without_token_returns_401_token_absent()
    {
        $response = $this->getJson('/api/client/1/1/users', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_assign_client_with_invalid_jwt_returns_401()
    {
        $fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' .
                     'eyJzdWIiOiIxMjM0NTY3ODkwIn0.' .
                     'BADSIGNATUREXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

        $response = $this->postJson('/api/client/assign', [], array_merge(
            $this->apiKey,
            ['Authorization' => "Bearer {$fakeToken}"]
        ));

        $response->assertStatus(401);
    }

    // ─── Route existence ──────────────────────────────────────────────────────

    /** @test */
    public function test_assign_client_route_exists_returns_not_404()
    {
        $this->withoutMiddleware();

        // Validation will fire — missing required fields → error response
        // Important: must NOT be 404 (route must exist)
        $response = $this->actingAs($this->user)
            ->postJson('/api/client/assign', [], $this->apiKey);

        $this->assertNotEquals(404, $response->status(),
            'POST /api/client/assign must exist — 404 is a routing regression.');
    }

    /** @test */
    public function test_get_client_users_route_exists_returns_not_404()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/client/1/1/users', $this->apiKey);

        $this->assertNotEquals(404, $response->status(),
            'GET /api/client/{client_id}/{department_id}/users must exist.');
    }

    // ─── Controller logic (Pattern A) ────────────────────────────────────────

    /** @test */
    public function test_assign_client_missing_required_fields_returns_validation_error()
    {
        $this->withoutMiddleware();

        // AssignEmployeesClientRequest has required fields — missing all → 422 or error envelope
        $response = $this->actingAs($this->user)
            ->postJson('/api/client/assign', [], $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'assign with missing fields must not throw 500.');
        $this->assertContains($response->status(), [400, 422],
            'Missing required fields must return a 400 or 422 validation error.');
    }

    /** @test */
    public function test_get_client_users_returns_200_and_success_envelope()
    {
        $this->withoutMiddleware();

        // Try to find a client_id and department_id that exist in the clients table
        $assignment = DB::table('employee_clients')->select('client_id', 'department_id')->first();

        if ($assignment === null) {
            $this->markTestSkipped('No rows in clients table — get-users test skipped.');
        }

        $response = $this->actingAs($this->user)
            ->getJson("/api/client/{$assignment->client_id}/{$assignment->department_id}/users", $this->apiKey);

        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_get_client_users_with_nonexistent_ids_returns_error_not_500()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/client/999999/999999/users', $this->apiKey);

        // No matching rows → empty collection → 200 with empty content
        // OR catch fires → error_response — either way, NOT 500
        $this->assertNotEquals(500, $response->status(),
            'Non-existent client/department must return 200 (empty) or graceful error, not 500.');
    }

    /** @test */
    public function test_get_client_users_content_is_array()
    {
        $this->withoutMiddleware();

        $response = $this->actingAs($this->user)
            ->getJson('/api/client/999999/999999/users', $this->apiKey);

        if ($response->status() === 200) {
            $content = $response->json('content');
            $this->assertIsArray($content, 'Client users content must be an array.');
        } else {
            $this->assertNotNull($response->json('error'),
                'Non-200 response must use the error envelope.');
        }
    }
}
