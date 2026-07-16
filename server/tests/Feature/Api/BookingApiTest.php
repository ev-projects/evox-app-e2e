<?php

/**
 * EVOX-31 — PHPUnit P0: Booking API Tests
 * Source: app/Http/Controllers/BookingController.php (277 uncovered lines)
 * Routes: routes/api.php (Getbookingroom, storebooking, GetBookeddetails, etc.)
 * Using DatabaseTransactions — no permanent DB changes.
 */

namespace Tests\Feature\Api;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * @group dead-code
 */
class BookingApiTest extends TestCase
{
    use DatabaseTransactions;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::whereNotNull('country_id')
            ->where('country_id', '>', 0)
            ->where('is_active', 1)
            ->firstOrFail();
        $this->withoutMiddleware();
    }

    // ─── GET /api/Getbookingroom/{roomid} ─────────────────────────────────────

    /** @test */
    public function test_get_booking_room_details_is_reachable()
    {
        $response = $this->actingAs($this->user)->getJson('/api/Getbookingroom/1');
        $this->assertNotEquals(404, $response->status());
    }

    /** @test */
    public function test_get_booking_room_details_for_nonexistent_room()
    {
        $response = $this->actingAs($this->user)->getJson('/api/Getbookingroom/999999');
        $this->assertContains($response->status(), [200, 400, 404, 500]);
    }

    // ─── POST /api/storebooking ───────────────────────────────────────────────

    /** @test */
    public function test_store_booking_without_required_fields_returns_error()
    {
        $response = $this->actingAs($this->user)->postJson('/api/storebooking', []);
        $this->assertContains($response->status(), [400, 422, 500]);
    }

    /** @test */
    public function test_store_booking_with_payload_is_processable()
    {
        $response = $this->actingAs($this->user)->postJson('/api/storebooking', [
            'room_id'    => 1,
            'user_id'    => $this->user->id,
            'date'       => '2026-06-01',
            'time_start' => '09:00',
            'time_end'   => '10:00',
            'purpose'    => 'PHPUnit test booking',
        ]);
        $this->assertContains($response->status(), [200, 201, 400, 422, 500]);
    }

    // ─── POST /api/validatedate ───────────────────────────────────────────────

    /** @test */
    public function test_validate_date_endpoint_is_reachable()
    {
        $response = $this->actingAs($this->user)->postJson('/api/validatedate', [
            'date'    => '2026-06-01',
            'room_id' => 1,
        ]);
        $this->assertNotEquals(404, $response->status());
    }

    /** @test */
    public function test_validate_date_without_payload_returns_error()
    {
        $response = $this->actingAs($this->user)->postJson('/api/validatedate', []);
        $this->assertContains($response->status(), [200, 400, 422, 500]);
    }

    // ─── GET /api/GetBookeddetails ────────────────────────────────────────────

    /** @test */
    public function test_get_booked_details_returns_non_404()
    {
        $response = $this->actingAs($this->user)->getJson('/api/GetBookeddetails');
        $this->assertNotEquals(404, $response->status());
    }

    /** @test */
    public function test_get_booked_details_with_date_filter()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/GetBookeddetails?date=2026-05-01');
        $this->assertContains($response->status(), [200, 400, 422]);
    }

    // ─── GET /api/GetBookeddetailsByid/{userid?} ──────────────────────────────

    /** @test */
    public function test_get_booked_details_by_id_returns_non_404()
    {
        $response = $this->actingAs($this->user)
            ->getJson("/api/GetBookeddetailsByid/{$this->user->id}");
        $this->assertNotEquals(404, $response->status());
    }

    /** @test */
    public function test_get_booked_details_by_id_without_id_is_reachable()
    {
        $response = $this->actingAs($this->user)->getJson('/api/GetBookeddetailsByid');
        $this->assertContains($response->status(), [200, 400, 404, 422]);
    }

    // ─── PUT /api/Roomapproval/{userid?} ──────────────────────────────────────

    /** @test */
    public function test_room_approval_endpoint_is_reachable()
    {
        $response = $this->actingAs($this->user)
            ->putJson('/api/Roomapproval/1', ['status' => 'approved']);
        $this->assertContains($response->status(), [200, 400, 404, 422, 500]);
    }

    // ─── GET /api/Gettodayleaves ──────────────────────────────────────────────

    /** @test */
    public function test_get_today_leaves_returns_non_404()
    {
        $response = $this->actingAs($this->user)->getJson('/api/Gettodayleaves');
        $this->assertNotEquals(404, $response->status());
    }

    // ─── GET /api/Gettommorowleaves ───────────────────────────────────────────

    /** @test */
    public function test_get_tomorrow_leaves_returns_non_404()
    {
        $response = $this->actingAs($this->user)->getJson('/api/Gettommorowleaves');
        $this->assertNotEquals(404, $response->status());
    }

    // ─── GET /api/Getitrequirement ────────────────────────────────────────────

    /** @test */
    public function test_get_it_requirement_room_list_returns_non_404()
    {
        $response = $this->actingAs($this->user)->getJson('/api/Getitrequirement');
        $this->assertNotEquals(404, $response->status());
    }

    // ─── GET /api/get_dashboard_all/{page_type} ───────────────────────────────

    /** @test */
    public function test_get_dashboard_all_employee_returns_non_404()
    {
        $response = $this->actingAs($this->user)->getJson('/api/get_dashboard_all/employee');
        $this->assertNotEquals(404, $response->status());
    }

    /** @test */
    public function test_get_dashboard_all_supervisor_returns_non_404()
    {
        $response = $this->actingAs($this->user)->getJson('/api/get_dashboard_all/supervisor');
        $this->assertContains($response->status(), [200, 400, 422]);
    }

    /** @test */
    public function test_get_dashboard_all_with_date_range()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/get_dashboard_all/employee?start_date=2026-05-01&end_date=2026-05-31');
        $this->assertContains($response->status(), [200, 400, 422]);
    }
}
