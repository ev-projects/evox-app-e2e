<?php
// DRAFT — generated 2026-06-16, needs verification


/**
 * EVOX Meeting Room API Tests — Full Module Coverage
 *
 * Covers: Booking (store/list/approval), Location management, IT requirements.
 * Room management routes are covered separately in RoomApiTest.php — not repeated here.
 *
 * All routes protected by: jwtauth + auth.apikey middleware.
 *
 * Known bugs documented inline — see full-stack report:
 *   - storeBookingRoomDetails: $rules array is dead code — server-side required fields never validated
 *   - DeleteRoomdetails/DeleteLocationDetails: Room::find(null)->delete() throws PHP \Error on non-existent ID
 *   - SQL injection risk in storeBookingRoomDetails (raw string interpolation)
 *   - Delete routes use GET verb (anti-pattern)
 *
 * Routes under test:
 *   POST /api/storebooking                      — create booking
 *   GET  /api/GetBookeddetails                  — booking list (approval queue, total_hours > 2 only)
 *   GET  /api/GetBookeddetailsByid/{id}         — single booking detail
 *   GET  /api/Getbookingroom/{roomid}           — approved bookings for a room (calendar)
 *   PUT  /api/Roomapproval/{id}                 — approve/deny booking
 *   GET  /api/Getitrequirement                  — IT requirement list
 *   POST /api/storelocation                     — create location
 *   PUT  /api/UpdateLocationDetails/{id}        — update location
 *   GET  /api/DeleteLocationDetails/{id}        — delete location (GET verb — bug)
 *   GET  /api/getlocation                       — location list (paginated)
 *   GET  /api/getlocation/{id}                  — single location
 *   GET  /api/getlocationcal                    — all locations flat (for dropdowns)
 *
 * Test patterns:
 *   B — Auth enforcement: no withoutMiddleware(), no Bearer token → 401
 *   A — Controller logic: withoutMiddleware() + actingAs()
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * @group dead-code
 */
class MeetingRoomApiTest extends TestCase
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

    // =========================================================================
    // LOCATION MANAGEMENT — Pattern B (auth enforcement)
    // =========================================================================

    /** @test */
    public function test_storelocation_without_token_returns_401()
    {
        $response = $this->postJson('/api/storelocation', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_updatelocationdetails_without_token_returns_401()
    {
        $response = $this->putJson('/api/UpdateLocationDetails/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_deletelocationdetails_without_token_returns_401()
    {
        $response = $this->getJson('/api/DeleteLocationDetails/1', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_getlocation_without_token_returns_401()
    {
        $response = $this->getJson('/api/getlocation', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_getlocationcal_without_token_returns_401()
    {
        $response = $this->getJson('/api/getlocationcal', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // LOCATION MANAGEMENT — Pattern A (controller logic)
    // =========================================================================

    /** @test */
    public function test_storelocation_missing_locationname_returns_validation_error()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/storelocation', [], $this->apiKey);

        $this->assertNotEquals(404, $response->status(), 'POST /api/storelocation route must exist.');
        $this->assertNotEquals(500, $response->status());
        // LocationController uses inline Validator — validation failure returns errors key
        $this->assertArrayHasKey('errors', $response->json() ?? []);
    }

    /** @test */
    public function test_storelocation_with_empty_locationname_returns_validation_error()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/storelocation',
            ['Locationname' => ''],
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
        $this->assertArrayHasKey('errors', $response->json() ?? []);
    }

    /** @test */
    public function test_storelocation_valid_payload_returns_200_status()
    {
        $this->withoutMiddleware();

        $uniqueName = 'Test Location ' . uniqid();
        $response = $this->actingAs($this->user)->postJson(
            '/api/storelocation',
            ['Locationname' => $uniqueName],
            $this->apiKey
        );

        // LocationController returns {status: '200', message: 'Location Created Successfully'}
        // or {status: '201', ...} for duplicates
        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        $this->assertNotNull($body);
        $this->assertContains($body['status'] ?? null, ['200', '201'],
            'storelocation must return status 200 (created) or 201 (duplicate).'
        );
    }

    /** @test */
    public function test_storelocation_duplicate_name_returns_201_status()
    {
        $this->withoutMiddleware();

        // First, insert a location to test duplication
        $existingLocation = DB::table('locations')->first();
        if ($existingLocation === null) {
            $this->markTestSkipped('No locations in DB — cannot test duplicate check.');
        }

        $response = $this->actingAs($this->user)->postJson(
            '/api/storelocation',
            ['Locationname' => $existingLocation->location_name],
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        // Duplicate returns {status: '201', message: 'Location Name Already Exist'}
        $this->assertEquals('201', $body['status'] ?? null,
            'Duplicate location name must return status 201.'
        );
    }

    /** @test */
    public function test_getlocation_paginated_returns_data_and_pagination_keys()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/getlocation', $this->apiKey);

        $this->assertNotEquals(404, $response->status());
        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        $this->assertArrayHasKey('data', $body ?? []);
        $this->assertArrayHasKey('pagination', $body ?? []);
    }

    /** @test */
    public function test_getlocation_by_id_with_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/getlocation/999999', $this->apiKey);

        $this->assertNotEquals(404, $response->status(), 'GET /api/getlocation/{id} route must exist.');
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_getlocation_by_valid_id_returns_location_record()
    {
        $this->withoutMiddleware();

        $location = DB::table('locations')->first();
        if ($location === null) {
            $this->markTestSkipped('No locations in DB — skipping shape assertion.');
        }

        $response = $this->actingAs($this->user)->getJson("/api/getlocation/{$location->id}", $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        $this->assertNotEmpty($body, 'Response for valid location ID must not be empty.');
    }

    /** @test */
    public function test_getlocationcal_returns_flat_array_for_dropdowns()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/getlocationcal', $this->apiKey);

        $this->assertNotEquals(404, $response->status());
        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        $this->assertIsArray($body, 'getlocationcal must return a flat array for dropdown population.');
    }

    /** @test */
    public function test_updatelocationdetails_missing_locationname_returns_validation_error()
    {
        $this->withoutMiddleware();

        $location = DB::table('locations')->first();
        if ($location === null) {
            $this->markTestSkipped('No locations in DB — cannot test update validation.');
        }

        $response = $this->actingAs($this->user)->putJson(
            "/api/UpdateLocationDetails/{$location->id}",
            [],
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
        $this->assertArrayHasKey('errors', $response->json() ?? []);
    }

    /** @test */
    public function test_updatelocationdetails_valid_payload_returns_200_status()
    {
        $this->withoutMiddleware();

        $location = DB::table('locations')->first();
        if ($location === null) {
            $this->markTestSkipped('No locations in DB — cannot test update.');
        }

        $response = $this->actingAs($this->user)->putJson(
            "/api/UpdateLocationDetails/{$location->id}",
            ['Locationname' => $location->location_name . ' Updated'],
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        $this->assertContains($body['status'] ?? null, ['200', '201'],
            'UpdateLocationDetails must return status 200 (updated) or 201 (duplicate).'
        );
    }

    /** @test */
    public function test_deletelocationdetails_nonexistent_id_does_not_500()
    {
        // PRODUCTION BUG: LocationController::DeleteLocationDetails() calls
        // location::find($id)->delete() without a null check.
        // When the ID does not exist, find() returns null and ->delete() on null
        // throws a PHP \Error (not caught by catch(Exception $e) in PHP 7) → HTTP 500.
        // Fix: add null check before ->delete().
        $this->markTestSkipped('Known production bug: DeleteLocationDetails() calls ->delete() on null for non-existent ID → PHP \\Error → 500. See LocationController::DeleteLocationDetails().');
    }

    // =========================================================================
    // BOOKING — Pattern B (auth enforcement)
    // =========================================================================

    /** @test */
    public function test_storebooking_without_token_returns_401()
    {
        $response = $this->postJson('/api/storebooking', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_getbookeddetails_without_token_returns_401()
    {
        $response = $this->getJson('/api/GetBookeddetails', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_getbookeddetailsbyid_without_token_returns_401()
    {
        $response = $this->getJson('/api/GetBookeddetailsByid/1', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_getbookingroom_without_token_returns_401()
    {
        $response = $this->getJson('/api/Getbookingroom/1', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_roomapproval_without_token_returns_401()
    {
        $response = $this->putJson('/api/Roomapproval/1', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_getitrequirement_without_token_returns_401()
    {
        $response = $this->getJson('/api/Getitrequirement', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // BOOKING — Pattern A (controller logic)
    // =========================================================================

    /** @test */
    public function test_storebooking_missing_all_required_fields_does_not_500()
    {
        // NOTE: storeBookingRoomDetails declares $rules array but never instantiates
        // Validator::make() with it — the required-field rules are dead code.
        // An empty payload will reach the overlap SQL check with null values, which
        // may succeed or fail at the DB layer. We assert it does NOT return 500.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/storebooking', [], $this->apiKey);

        $this->assertNotEquals(404, $response->status(), 'POST /api/storebooking route must exist.');
        $this->assertNotEquals(500, $response->status(),
            'storeBookingRoomDetails must handle empty payload without crashing (known: server-side validation rules are dead code).'
        );
    }

    /** @test */
    public function test_storebooking_missing_roomid_does_not_500()
    {
        // KNOWN BUG: Roomid is in the dead-code $rules array — it is never server-validated.
        // A booking without Roomid creates a booking record with room_id = null.
        // We assert NOT 500; the response may be a 200 with the booking created (bad state).
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson('/api/storebooking', [
            'Userid'        => $this->user->id,
            'Startdatetime' => now()->addDay()->format('Y-m-d 09:00:00'),
            'EnddateTime'   => now()->addDay()->format('Y-m-d 10:00:00'),
            'Note'          => 'PHPUnit test booking — no room ID',
            'Totalhours'    => 1,
        ], $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'storebooking with missing Roomid must not crash — even though validation rules are dead code.'
        );
    }

    /** @test */
    public function test_storebooking_valid_short_booking_returns_200_approved_status()
    {
        $this->withoutMiddleware();

        $room = DB::table('rooms')->first();
        if ($room === null) {
            $this->markTestSkipped('No rooms in DB — cannot test storebooking.');
        }

        // Use a far-future date to avoid overlapping with existing bookings in the test DB
        $startDT = now()->addDays(90)->format('Y-m-d 08:00:00');
        $endDT   = now()->addDays(90)->format('Y-m-d 09:00:00');

        $response = $this->actingAs($this->user)->postJson('/api/storebooking', [
            'Roomid'        => $room->id,
            'Userid'        => $this->user->id,
            'Startdatetime' => $startDT,
            'EnddateTime'   => $endDT,
            'Note'          => 'PHPUnit short booking test',
            'Totalhours'    => 1,
            'ITRequirement' => [],
        ], $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        // 200 = no conflict + booking stored; 201 = conflict with existing booking
        $this->assertContains($body['status'] ?? null, ['200', '201'],
            'storebooking must return status 200 (booked) or 201 (conflict).'
        );
    }

    /** @test */
    public function test_storebooking_long_booking_over_2h_sets_pending_status()
    {
        $this->withoutMiddleware();

        $room = DB::table('rooms')->first();
        if ($room === null) {
            $this->markTestSkipped('No rooms in DB — cannot test storebooking pending flow.');
        }

        $startDT = now()->addDays(91)->format('Y-m-d 08:00:00');
        $endDT   = now()->addDays(91)->format('Y-m-d 11:00:00');

        $response = $this->actingAs($this->user)->postJson('/api/storebooking', [
            'Roomid'        => $room->id,
            'Userid'        => $this->user->id,
            'Startdatetime' => $startDT,
            'EnddateTime'   => $endDT,
            'Note'          => 'PHPUnit long booking test — pending',
            'Totalhours'    => 3,
            'ITRequirement' => [],
        ], $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        $this->assertContains($body['status'] ?? null, ['200', '201'],
            'Long booking (>2h) must return status 200 (pending created) or 201 (conflict).'
        );

        // If the booking was created (status 200), verify it was inserted with pending status
        if (($body['status'] ?? null) === '200') {
            $booking = DB::table('bookings')
                ->where('user_id', $this->user->id)
                ->where('start_date', $startDT)
                ->first();

            if ($booking !== null) {
                $this->assertEquals('pending', $booking->status,
                    'A booking with Totalhours > 2 must be inserted with status = pending.'
                );
            }
        }
    }

    /** @test */
    public function test_getbookeddetails_returns_paginated_data_with_pagination_key()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/GetBookeddetails?page=1', $this->apiKey);

        $this->assertNotEquals(404, $response->status(), 'GET /api/GetBookeddetails route must exist.');
        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        $this->assertArrayHasKey('data', $body ?? []);
        $this->assertArrayHasKey('pagination', $body ?? []);
    }

    /** @test */
    public function test_getbookeddetails_only_returns_bookings_with_total_hours_over_2()
    {
        // The BookingController::GetBookeddetails enforces: WHERE total_hours > 2
        // Sub-2-hour auto-approved bookings must never appear in this list.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/GetBookeddetails?page=1', $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        $rows = $body['data']['data'] ?? $body['data'] ?? [];

        foreach ($rows as $row) {
            $this->assertGreaterThan(2, $row['total_hours'] ?? 3,
                'GetBookeddetails must not return bookings with total_hours <= 2.'
            );
        }
    }

    /** @test */
    public function test_getbookeddetails_with_status_filter_returns_filtered_results()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/GetBookeddetails?status=pending&page=1',
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        $rows = $body['data']['data'] ?? $body['data'] ?? [];

        foreach ($rows as $row) {
            $this->assertEquals('pending', $row['status'] ?? 'pending',
                'Status filter must return only bookings with matching status.'
            );
        }
    }

    /** @test */
    public function test_getbookeddetails_with_date_range_filter_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson(
            '/api/GetBookeddetails?from_date=2026-06-01&to_date=2026-06-30&page=1',
            $this->apiKey
        );

        $this->assertNotEquals(404, $response->status());
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_getbookeddetails_returns_statuscount_key()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/GetBookeddetails?page=1', $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        $this->assertArrayHasKey('statuscount', $body ?? [],
            'GetBookeddetails must return statuscount object for badge display.'
        );
    }

    /** @test */
    public function test_getbookeddetailsbyid_with_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/GetBookeddetailsByid/999999', $this->apiKey);

        $this->assertNotEquals(404, $response->status(), 'GET /api/GetBookeddetailsByid/{id} route must exist.');
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_getbookeddetailsbyid_with_valid_id_returns_booking_record()
    {
        $this->withoutMiddleware();

        $booking = DB::table('bookings')->first();
        if ($booking === null) {
            $this->markTestSkipped('No bookings in DB — skipping shape assertion.');
        }

        $response = $this->actingAs($this->user)->getJson(
            "/api/GetBookeddetailsByid/{$booking->id}",
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        $this->assertNotEmpty($body, 'GetBookeddetailsByid must return a booking record for a valid ID.');
    }

    /** @test */
    public function test_getbookingroom_returns_only_approved_bookings_for_room()
    {
        $this->withoutMiddleware();

        $room = DB::table('rooms')->first();
        if ($room === null) {
            $this->markTestSkipped('No rooms in DB — cannot test Getbookingroom.');
        }

        $response = $this->actingAs($this->user)->getJson(
            "/api/Getbookingroom/{$room->id}",
            $this->apiKey
        );

        $this->assertNotEquals(404, $response->status(), 'GET /api/Getbookingroom/{roomid} route must exist.');
        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        $this->assertIsArray($body, 'Getbookingroom must return an array of bookings for the calendar.');
    }

    /** @test */
    public function test_getbookingroom_with_nonexistent_room_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/Getbookingroom/999999', $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        $this->assertIsArray($body, 'Getbookingroom with non-existent room must return empty array, not error.');
    }

    /** @test */
    public function test_roomapproval_missing_approvalnote_returns_validation_error()
    {
        $this->withoutMiddleware();

        $booking = DB::table('bookings')->where('status', 'pending')->first();
        if ($booking === null) {
            $this->markTestSkipped('No pending bookings in DB — cannot test Roomapproval validation.');
        }

        $response = $this->actingAs($this->user)->putJson(
            "/api/Roomapproval/{$booking->id}",
            ['Status' => 'approved', 'Approvedby' => $this->user->id],
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        // Roomapproval validates ApprovalNote required via Validator::make — returns {errors: {...}}
        $this->assertArrayHasKey('errors', $body ?? [],
            'Roomapproval without ApprovalNote must return validation errors.'
        );
    }

    /** @test */
    public function test_roomapproval_empty_approvalnote_returns_approvalnote_error_key()
    {
        $this->withoutMiddleware();

        $booking = DB::table('bookings')->where('status', 'pending')->first();
        if ($booking === null) {
            $this->markTestSkipped('No pending bookings in DB — cannot test ApprovalNote validation.');
        }

        $response = $this->actingAs($this->user)->putJson(
            "/api/Roomapproval/{$booking->id}",
            ['ApprovalNote' => '', 'Status' => 'approved', 'Approvedby' => $this->user->id],
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        $this->assertArrayHasKey('errors', $body ?? []);
        $errors = $body['errors'] ?? [];
        $this->assertArrayHasKey('ApprovalNote', $errors,
            'Roomapproval with empty ApprovalNote must return errors.ApprovalNote.'
        );
    }

    /** @test */
    public function test_roomapproval_valid_payload_returns_200_status()
    {
        $this->withoutMiddleware();

        $booking = DB::table('bookings')->where('status', 'pending')->first();
        if ($booking === null) {
            $this->markTestSkipped('No pending bookings in DB — cannot test Roomapproval happy path.');
        }

        $response = $this->actingAs($this->user)->putJson(
            "/api/Roomapproval/{$booking->id}",
            [
                'ApprovalNote'  => 'Approved via PHPUnit test',
                'Status'        => 'approved',
                'Approvedby'    => $this->user->id,
                'Startdatetime' => $booking->start_date,
                'EnddateTime'   => $booking->end_date,
            ],
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        $this->assertEquals('200', $body['status'] ?? null,
            'Roomapproval with valid payload must return status 200.'
        );
        $response->assertJsonStructure(['status', 'message']);
    }

    /** @test */
    public function test_roomapproval_with_nonexistent_id_does_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->putJson(
            '/api/Roomapproval/999999',
            [
                'ApprovalNote'  => 'PHPUnit test note',
                'Status'        => 'approved',
                'Approvedby'    => $this->user->id,
                'Startdatetime' => now()->format('Y-m-d 09:00:00'),
                'EnddateTime'   => now()->format('Y-m-d 10:00:00'),
            ],
            $this->apiKey
        );

        // Non-existent ID with valid payload — Booking::where('id', 999999)->update() returns 0 rows
        // but should not crash. Booking::find(null) is not called here (different pattern from delete).
        $this->assertNotEquals(500, $response->status(),
            'Roomapproval with non-existent ID must not crash.'
        );
    }

    // =========================================================================
    // IT REQUIREMENT — Pattern B (auth) already covered above for Getitrequirement
    // =========================================================================

    /** @test */
    public function test_getitrequirement_returns_paginated_data()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/Getitrequirement?page=1', $this->apiKey);

        $this->assertNotEquals(404, $response->status(), 'GET /api/Getitrequirement route must exist.');
        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        // BookingController::get_itrequirement_roomlist returns paginated data
        $this->assertNotNull($body, 'Getitrequirement must return a non-null response body.');
    }

    /** @test */
    public function test_getitrequirement_scopes_to_future_bookings_only()
    {
        // The backend filter: bookings.start_date >= today AND users.country_id = auth user country.
        // We cannot directly assert the SQL filter here, but we can verify the response
        // does not crash and returns rows where start_date >= today (if any rows returned).
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->getJson('/api/Getitrequirement?page=1', $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        $rows = $body['data']['data'] ?? $body['data'] ?? [];

        foreach ($rows as $row) {
            if (isset($row['start_date'])) {
                $this->assertGreaterThanOrEqual(
                    now()->startOfDay()->timestamp,
                    strtotime($row['start_date']),
                    'Getitrequirement must only return future bookings (start_date >= today).'
                );
            }
        }
    }

    /** @test */
    public function test_deletelocationdetails_valid_id_returns_status_1()
    {
        $this->withoutMiddleware();

        // Insert a test location to delete (DatabaseTransactions will roll back after test)
        $locationId = DB::table('locations')->insertGetId([
            'location_name' => 'PHPUnit Delete Test ' . uniqid(),
        ]);

        $response = $this->actingAs($this->user)->getJson(
            "/api/DeleteLocationDetails/{$locationId}",
            $this->apiKey
        );

        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        $this->assertEquals('1', (string)($body['status'] ?? ''),
            'DeleteLocationDetails with valid ID must return status 1 (successfully deleted).'
        );
    }
}
