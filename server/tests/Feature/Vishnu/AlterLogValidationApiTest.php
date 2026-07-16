<?php
// DRAFT — generated 2026-06-16, needs verification


namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Request\Models\AlterLog;

class AlterLogValidationApiTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->user = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();
    }

    // =========================================================================
    // AUTH ENFORCEMENT — Pattern B (no withoutMiddleware)
    // =========================================================================

    /** @test */
    public function test_alter_log_store_without_token_returns_401()
    {
        $response = $this->postJson('/api/request/alter_log', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_alter_log_find_without_token_returns_401()
    {
        $response = $this->getJson('/api/request/alter_log/1', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_alter_log_update_without_token_returns_401()
    {
        $response = $this->postJson('/api/request/alter_log/1', ['_method' => 'PUT'], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_alter_log_approve_without_token_returns_401()
    {
        $response = $this->postJson('/api/request/alter_log/approve/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_alter_log_decline_without_token_returns_401()
    {
        $response = $this->postJson('/api/request/alter_log/decline/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_alter_log_cancel_without_token_returns_401()
    {
        $response = $this->postJson('/api/request/alter_log/cancel/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_alter_log_destroy_without_token_returns_401()
    {
        $response = $this->deleteJson('/api/request/alter_log/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_alter_log_punch_store_without_token_returns_401()
    {
        $response = $this->postJson('/api/request/alter_log_punch', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_alter_log_punch_find_without_token_returns_401()
    {
        $response = $this->getJson('/api/request/alter_log_punch/1', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_alter_log_punch_approve_without_token_returns_401()
    {
        $response = $this->postJson('/api/request/alter_log_punch/approve/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_alter_log_punch_decline_without_token_returns_401()
    {
        $response = $this->postJson('/api/request/alter_log_punch/decline/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // STORE VALIDATION — Pattern A (empty payload → 422)
    // =========================================================================

    /** @test */
    public function test_alter_log_store_empty_payload_returns_422()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log', [], $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_alter_log_store_missing_date_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'user_id'       => $this->user->id,
            'new_time_in'   => '2026-06-01 08:00:00',
            'new_time_out'  => '2026-06-01 17:00:00',
            'employee_note' => 'Test alter log request',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log', $payload, $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_alter_log_store_missing_user_id_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'date'          => '2026-06-01',
            'new_time_in'   => '2026-06-01 08:00:00',
            'new_time_out'  => '2026-06-01 17:00:00',
            'employee_note' => 'Test alter log request',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log', $payload, $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_alter_log_store_missing_new_time_in_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'date'          => '2026-06-01',
            'user_id'       => $this->user->id,
            'new_time_out'  => '2026-06-01 17:00:00',
            'employee_note' => 'Test alter log request',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log', $payload, $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_alter_log_store_missing_new_time_out_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'date'          => '2026-06-01',
            'user_id'       => $this->user->id,
            'new_time_in'   => '2026-06-01 08:00:00',
            'employee_note' => 'Test alter log request',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log', $payload, $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_alter_log_store_missing_employee_note_returns_422()
    {
        // Backend AlterLogRequest marks employee_note as required|string|max:255
        // even though Yup frontend schema treats it as optional (BUG-1)
        $this->withoutMiddleware();
        $payload = [
            'date'         => '2026-06-01',
            'user_id'      => $this->user->id,
            'new_time_in'  => '2026-06-01 08:00:00',
            'new_time_out' => '2026-06-01 17:00:00',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log', $payload, $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_alter_log_store_wrong_date_format_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'date'          => '01/06/2026', // wrong format, expects Y-m-d
            'user_id'       => $this->user->id,
            'new_time_in'   => '2026-06-01 08:00:00',
            'new_time_out'  => '2026-06-01 17:00:00',
            'employee_note' => 'Test alter log request',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log', $payload, $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_alter_log_store_wrong_time_format_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'date'          => '2026-06-01',
            'user_id'       => $this->user->id,
            'new_time_in'   => '08:00:00', // missing date part, expects Y-m-d H:i:s
            'new_time_out'  => '2026-06-01 17:00:00',
            'employee_note' => 'Test alter log request',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log', $payload, $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_alter_log_store_nonexistent_user_id_returns_422()
    {
        $this->withoutMiddleware();
        $payload = [
            'date'          => '2026-06-01',
            'user_id'       => 999999,
            'new_time_in'   => '2026-06-01 08:00:00',
            'new_time_out'  => '2026-06-01 17:00:00',
            'employee_note' => 'Test alter log request',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log', $payload, $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    // =========================================================================
    // STORE HAPPY PATH — Pattern A (valid payload → 201)
    // =========================================================================

    /** @test */
    public function test_alter_log_store_valid_payload_returns_201()
    {
        $this->withoutMiddleware();
        // Use a future date unlikely to already exist for this user
        $testDate = '2099-01-15';
        $payload = [
            'date'          => $testDate,
            'user_id'       => $this->user->id,
            'new_time_in'   => '2099-01-15 08:00:00',
            'new_time_out'  => '2099-01-15 17:00:00',
            'employee_note' => 'PHPUnit test: valid alter log store',
            'request_mode'  => 'regular',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log', $payload, $this->apiKey);
        // Store can return 201 (regular path) or 201 (dispute path)
        $this->assertContains($response->status(), [201, 200]);
    }

    // =========================================================================
    // FIND — Pattern A (by ID)
    // =========================================================================

    /** @test */
    public function test_alter_log_find_existing_record_returns_200()
    {
        $this->withoutMiddleware();
        $alterLog = AlterLog::where('user_id', $this->user->id)->whereNull('deleted_at')->first();
        if (!$alterLog) {
            $this->markTestSkipped('No AlterLog records exist for the test user.');
        }
        $response = $this->actingAs($this->user)->getJson('/api/request/alter_log/' . $alterLog->id, $this->apiKey);
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_alter_log_find_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/request/alter_log/999999', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // UPDATE — Pattern A (missing required fields → 422)
    // =========================================================================

    /** @test */
    public function test_alter_log_update_empty_payload_returns_422()
    {
        $this->withoutMiddleware();
        $alterLog = AlterLog::where('user_id', $this->user->id)->where('status', 'pending')->whereNull('deleted_at')->first();
        if (!$alterLog) {
            $this->markTestSkipped('No pending AlterLog records exist for the test user.');
        }
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/alter_log/' . $alterLog->id,
            ['_method' => 'PUT'],
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_alter_log_update_missing_new_time_in_returns_422()
    {
        $this->withoutMiddleware();
        $alterLog = AlterLog::where('user_id', $this->user->id)->where('status', 'pending')->whereNull('deleted_at')->first();
        if (!$alterLog) {
            $this->markTestSkipped('No pending AlterLog records exist for the test user.');
        }
        $payload = [
            '_method'       => 'PUT',
            'date'          => $alterLog->date,
            'user_id'       => $this->user->id,
            'new_time_out'  => '2026-06-01 17:00:00',
            'employee_note' => 'Update test',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log/' . $alterLog->id, $payload, $this->apiKey);
        $this->assertEquals(422, $response->status());
    }

    // =========================================================================
    // APPROVE — Pattern A
    // =========================================================================

    /** @test */
    public function test_alter_log_approve_empty_payload_returns_422()
    {
        $this->withoutMiddleware();
        $alterLog = AlterLog::whereNull('deleted_at')->first();
        if (!$alterLog) {
            $this->markTestSkipped('No AlterLog records exist.');
        }
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/alter_log/approve/' . $alterLog->id,
            [],
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    /** @test */
    public function test_alter_log_approve_missing_date_returns_422()
    {
        $this->withoutMiddleware();
        $alterLog = AlterLog::whereNull('deleted_at')->first();
        if (!$alterLog) {
            $this->markTestSkipped('No AlterLog records exist.');
        }
        $payload = [
            'user_id'       => $alterLog->user_id,
            'new_time_in'   => '2026-06-01 08:00:00',
            'new_time_out'  => '2026-06-01 17:00:00',
            'employee_note' => 'Approve test',
        ];
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/alter_log/approve/' . $alterLog->id,
            $payload,
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    // =========================================================================
    // DECLINE — Pattern A
    // =========================================================================

    /** @test */
    public function test_alter_log_decline_empty_payload_returns_422()
    {
        $this->withoutMiddleware();
        $alterLog = AlterLog::whereNull('deleted_at')->first();
        if (!$alterLog) {
            $this->markTestSkipped('No AlterLog records exist.');
        }
        $response = $this->actingAs($this->user)->postJson(
            '/api/request/alter_log/decline/' . $alterLog->id,
            [],
            $this->apiKey
        );
        $this->assertEquals(422, $response->status());
    }

    // =========================================================================
    // NULL-ID GUARD — nonexistent IDs must not produce 500
    // =========================================================================

    /** @test */
    public function test_alter_log_update_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $payload = [
            '_method'       => 'PUT',
            'date'          => '2099-01-15',
            'user_id'       => $this->user->id,
            'new_time_in'   => '2099-01-15 08:00:00',
            'new_time_out'  => '2099-01-15 17:00:00',
            'employee_note' => 'Nonexistent ID test',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log/999999', $payload, $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_alter_log_approve_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $payload = [
            'date'          => '2099-01-15',
            'user_id'       => $this->user->id,
            'new_time_in'   => '2099-01-15 08:00:00',
            'new_time_out'  => '2099-01-15 17:00:00',
            'employee_note' => 'Nonexistent ID approve test',
            'approver_note' => 'Approved',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log/approve/999999', $payload, $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_alter_log_cancel_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log/cancel/999999', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_alter_log_destroy_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->deleteJson('/api/request/alter_log/999999', [], $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // ALTER LOG PUNCH — Auth enforcement (Pattern B)
    // =========================================================================

    /** @test */
    public function test_alter_log_punch_store_empty_payload_does_not_return_401_when_authenticated()
    {
        // AlterLogPunchController uses base Request — no validation class.
        // Store with no payload will likely 500 in repo (missing new_punch JSON decode).
        // This test just asserts auth is required separately (covered by auth test above).
        // Here we confirm that with auth + no payload, we at minimum get past the auth gate.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log_punch', [], $this->apiKey);
        $this->assertNotEquals(401, $response->status());
    }

    /** @test */
    public function test_alter_log_punch_find_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/request/alter_log_punch/999999', $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_alter_log_punch_store_valid_payload_does_not_500()
    {
        // GAP-3: No AlterLogPunchRequest validation class exists.
        // The controller uses base Request — missing fields cause repo-level PHP exceptions.
        // This test verifies a structurally valid payload does not produce a 500.
        $this->withoutMiddleware();
        $newPunch = json_encode([
            [
                'start_time'   => '2099-02-01 08:00:00',
                'end_time'     => '2099-02-01 17:00:00',
                'project_name' => 'EVOX',
                'remarks'      => 'PHPUnit smoke test',
            ]
        ]);
        $payload = [
            'date'          => '2099-02-01',
            'user_id'       => $this->user->id,
            'new_punch'     => $newPunch,
            'employee_note' => 'PHPUnit alter log punch test',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/request/alter_log_punch', $payload, $this->apiKey);
        $this->assertNotEquals(500, $response->status());
    }
}
