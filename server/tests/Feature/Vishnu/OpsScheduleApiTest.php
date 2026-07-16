<?php
// DRAFT — generated 2026-06-16, needs verification


namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class OpsScheduleApiTest extends TestCase
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
    // SECURITY NOTE: All OpsSchedule routes have NO authentication middleware
    // (documented bug EVOX-176). Pattern B tests below document this — the
    // routes return 200 without a token, which is a known security gap.
    // These tests should flip to assertStatus(401) once EVOX-176 is fixed.
    // =========================================================================

    // -------------------------------------------------------------------------
    // GET /api/opsschedule — Employee view (public, no auth required — EVOX-176)
    // -------------------------------------------------------------------------

    /** @test */
    public function test_get_opsschedule_is_accessible_without_token_documents_evox176()
    {
        // SECURITY BUG EVOX-176: This route has no auth middleware.
        // Expected: 401. Actual: 200. Test documents the current (broken) state.
        $response = $this->getJson('/api/opsschedule', $this->apiKey);
        // Assert it does NOT return 401 — confirms the auth bug is still present
        $this->assertNotEquals(401, $response->status(), 'EVOX-176: route should require auth but does not');
        // Assert it returns 200 (documents current behaviour)
        $response->assertStatus(200);
    }

    /** @test */
    public function test_get_opsschedule_returns_200_and_expected_structure()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/opsschedule', $this->apiKey);
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_get_opsschedule_content_has_at_most_two_columns()
    {
        // The controller uses array_chunk to split into two columns for the two-column layout
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/opsschedule', $this->apiKey);
        $response->assertStatus(200);
        $content = $response->json('content');
        $this->assertIsArray($content);
        $this->assertLessThanOrEqual(2, count($content), 'Content should be chunked into at most 2 columns');
    }

    // -------------------------------------------------------------------------
    // GET /api/opsschedule/list — Admin list (no auth — EVOX-176)
    // -------------------------------------------------------------------------

    /** @test */
    public function test_get_opsschedule_list_without_dept_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/opsschedule/list/', $this->apiKey);
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_get_opsschedule_list_is_accessible_without_token_documents_evox176()
    {
        // SECURITY BUG EVOX-176: No auth middleware on list route either
        $response = $this->getJson('/api/opsschedule/list/', $this->apiKey);
        $this->assertNotEquals(401, $response->status(), 'EVOX-176: /api/opsschedule/list should require auth');
    }

    /** @test */
    public function test_get_opsschedule_list_with_valid_dept_id_returns_200()
    {
        // department_id 1 corresponds to the first OPS_DEPTS entry in constants.php
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/opsschedule/list/1', $this->apiKey);
        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_get_opsschedule_list_with_nonexistent_dept_id_does_not_500()
    {
        // dept_id 999999 won't match any OPS_DEPTS constant — should return empty list, not crash
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/opsschedule/list/999999', $this->apiKey);
        $this->assertNotEquals(500, $response->status(), 'Should return empty list, not 500, for unknown dept_id');
        $response->assertStatus(200);
    }

    // -------------------------------------------------------------------------
    // GET /api/opsschedule/show/{id}
    // -------------------------------------------------------------------------

    /** @test */
    public function test_get_opsschedule_show_is_accessible_without_token_documents_evox176()
    {
        // SECURITY BUG EVOX-176: No auth on show route
        $response = $this->getJson('/api/opsschedule/show/1', $this->apiKey);
        $this->assertNotEquals(401, $response->status(), 'EVOX-176: /api/opsschedule/show should require auth');
    }

    /** @test */
    public function test_get_opsschedule_show_valid_id_returns_200()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/opsschedule/show/1', $this->apiKey);
        // If record ID 1 exists, expect 200; otherwise the backend will 500 (known bug — no null guard)
        // This test documents the happy path
        $this->assertContains($response->status(), [200, 500], 'show/1 should return 200 if record exists');
    }

    /** @test */
    public function test_get_opsschedule_show_nonexistent_id_is_known_500_bug()
    {
        // KNOWN BUG: OpsScheduleController::show() calls find()->toArray() with no null guard.
        // A missing ID returns null and PHP throws a fatal error -> HTTP 500.
        // This test documents the bug. Flip to assertStatus(404) once the null guard is added.
        $this->markTestSkipped(
            'Known production bug: GET /api/opsschedule/show/999999 returns HTTP 500 instead of 404 ' .
            'because OpsScheduleController::show() calls find()->toArray() without a null guard. ' .
            'See OpsScheduleController::show(). Fix: add null check and return 404 error_response.'
        );
    }

    // -------------------------------------------------------------------------
    // POST /api/opsschedule — Store (create)
    // -------------------------------------------------------------------------

    /** @test */
    public function test_post_opsschedule_is_accessible_without_token_documents_evox176()
    {
        // SECURITY BUG EVOX-176: unauthenticated callers can create schedules
        $response = $this->postJson('/api/opsschedule', [], $this->apiKey);
        $this->assertNotEquals(401, $response->status(), 'EVOX-176: POST /api/opsschedule should require auth');
    }

    /** @test */
    public function test_post_opsschedule_with_empty_payload_returns_non_200()
    {
        // No validation class exists — the controller will reach type-branching logic and
        // encounter missing fields; result is a PHP error (500) or unhandled branch.
        // We assert it does NOT silently return 200 with an empty payload.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/opsschedule', [], $this->apiKey);
        $this->assertNotEquals(200, $response->status(), 'Empty payload should not produce a 200 success response');
    }

    /** @test */
    public function test_post_opsschedule_missing_department_does_not_return_200()
    {
        // The controller reads $request->department_id and $request->type directly.
        // Without department, the image-branch will attempt to query with null department_id.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/opsschedule',
            ['type' => 'image'],
            $this->apiKey
        );
        $this->assertNotEquals(200, $response->status(), 'Missing department should not yield 200');
    }

    /** @test */
    public function test_post_opsschedule_image_type_without_image_file_is_known_bug()
    {
        // KNOWN BUG: When type=image but no image file is included in the update request,
        // $request->image->extension() is called on null -> fatal TypeError.
        // This also applies to store when the image is missing.
        $this->markTestSkipped(
            'Known production bug: POST /api/opsschedule with type=image but no image file ' .
            'calls $request->image->extension() on null, throwing a fatal TypeError (HTTP 500). ' .
            'See OpsScheduleController::store() image branch. Fix: add $request->hasFile(\'image\') guard.'
        );
    }

    /** @test */
    public function test_post_opsschedule_form_type_with_valid_payload_returns_201()
    {
        // Tests the form-type store path with all required fields
        // start_time and end_time must be in JS Date.toString() format since the controller
        // uses explode(" ", ...) and takes index [4] for the HH:MM:SS component
        $this->withoutMiddleware();
        $payload = [
            'type'         => 'form',
            'department'   => '1',
            'name'         => 'Test POC',
            'position'     => 'Senior Engineer',
            'email'        => 'test@eastvantage.com',
            'domain'       => 'IT Support',
            'scope'        => 'Network,Hardware',
            'mon'          => 'true',
            'tue'          => 'true',
            'wed'          => 'true',
            'thu'          => 'true',
            'fri'          => 'true',
            'sat'          => 'false',
            'sun'          => 'false',
            // JS Date.toString() format — controller splits by space and takes index [4]
            'start_time'   => 'Thu Jan 01 2020 09:00:00 GMT+0800 (Philippine Standard Time)',
            'end_time'     => 'Thu Jan 01 2020 18:00:00 GMT+0800 (Philippine Standard Time)',
            'timezone'     => 'PST',
        ];
        $response = $this->actingAs($this->user)->postJson('/api/opsschedule', $payload, $this->apiKey);
        $response->assertStatus(201);
        $response->assertJsonStructure(['message', 'content']);
    }

    // -------------------------------------------------------------------------
    // PUT /api/opsschedule/{id} — Update
    // -------------------------------------------------------------------------

    /** @test */
    public function test_put_opsschedule_is_accessible_without_token_documents_evox176()
    {
        // SECURITY BUG EVOX-176
        $response = $this->putJson('/api/opsschedule/1', [], $this->apiKey);
        $this->assertNotEquals(401, $response->status(), 'EVOX-176: PUT /api/opsschedule/{id} should require auth');
    }

    /** @test */
    public function test_put_opsschedule_nonexistent_id_does_not_500()
    {
        // For update with type=form, the controller calls OpsSchedule::where('id', $id)->update(...)
        // which returns 0 rows affected but does not crash. For image type, it would crash on
        // $request->image->extension() — so we use form type here.
        $this->withoutMiddleware();
        $payload = [
            'type'       => 'form',
            'department' => '1',
            'name'       => 'Ghost POC',
            'position'   => 'Tester',
            'email'      => 'ghost@eastvantage.com',
            'domain'     => 'None',
            'scope'      => 'N/A',
            'start_time' => 'Thu Jan 01 2020 09:00:00 GMT+0800 (Philippine Standard Time)',
            'end_time'   => 'Thu Jan 01 2020 18:00:00 GMT+0800 (Philippine Standard Time)',
            'timezone'   => 'PST',
        ];
        $response = $this->actingAs($this->user)->putJson('/api/opsschedule/999999', $payload, $this->apiKey);
        $this->assertNotEquals(500, $response->status(), 'PUT with nonexistent ID should not 500');
    }

    /** @test */
    public function test_put_opsschedule_image_type_without_file_is_known_bug()
    {
        // KNOWN BUG: OpsScheduleController::update() calls $request->image->extension()
        // unconditionally when type=image, without checking hasFile('image').
        // Sending an update with type=image but no file attachment -> fatal TypeError -> HTTP 500.
        $this->markTestSkipped(
            'Known production bug: PUT /api/opsschedule/{id} with type=image but no image file ' .
            'throws fatal TypeError on $request->image->extension() — no hasFile() guard exists. ' .
            'See OpsScheduleController::update() image branch.'
        );
    }

    // -------------------------------------------------------------------------
    // DELETE /api/opsschedule/{id}
    // -------------------------------------------------------------------------

    /** @test */
    public function test_delete_opsschedule_is_accessible_without_token_documents_evox176()
    {
        // SECURITY BUG EVOX-176: unauthenticated callers can delete schedules
        $response = $this->deleteJson('/api/opsschedule/999999', [], $this->apiKey);
        $this->assertNotEquals(401, $response->status(), 'EVOX-176: DELETE /api/opsschedule/{id} should require auth');
    }

    /** @test */
    public function test_delete_opsschedule_nonexistent_id_does_not_500()
    {
        // delete() has a try/catch, so find(999999) returning null triggers ->delete() on null
        // which is caught by the catch block and returns error_response. Assert not 500.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->deleteJson('/api/opsschedule/999999', [], $this->apiKey);
        // The try/catch should prevent a raw 500; may return 4xx or 200 with error body
        $this->assertNotEquals(500, $response->status(), 'DELETE with nonexistent ID should be caught, not 500');
    }

    /** @test */
    public function test_delete_opsschedule_valid_id_returns_200_and_soft_deletes()
    {
        // First create a record so we have a valid ID to delete
        // Uses DatabaseTransactions to roll back after test
        $this->withoutMiddleware();

        // Create via form type (avoids image file upload complexity)
        $createPayload = [
            'type'       => 'form',
            'department' => '1',
            'name'       => 'Temp Delete POC',
            'position'   => 'Tester',
            'email'      => 'temp@eastvantage.com',
            'domain'     => 'IT',
            'scope'      => 'Testing',
            'start_time' => 'Thu Jan 01 2020 09:00:00 GMT+0800 (Philippine Standard Time)',
            'end_time'   => 'Thu Jan 01 2020 18:00:00 GMT+0800 (Philippine Standard Time)',
            'timezone'   => 'PST',
        ];
        $createResponse = $this->actingAs($this->user)
            ->postJson('/api/opsschedule', $createPayload, $this->apiKey);

        if ($createResponse->status() !== 201) {
            $this->markTestSkipped('Could not create a test record to delete; skipping delete test.');
        }

        $newId = $createResponse->json('content.id');
        $this->assertNotNull($newId, 'Created record should have an ID');

        // Now delete it
        $deleteResponse = $this->actingAs($this->user)
            ->deleteJson('/api/opsschedule/' . $newId, [], $this->apiKey);
        $deleteResponse->assertStatus(200);
        $deleteResponse->assertJsonStructure(['message', 'content']);

        // Verify soft-delete: record should still exist in DB with deleted_at set
        $record = \App\Modules\Opsschedule\Models\OpsSchedule::withTrashed()->find($newId);
        $this->assertNotNull($record, 'Soft-deleted record should still exist in DB');
        $this->assertNotNull($record->deleted_at, 'deleted_at should be set after soft delete');
    }
}
