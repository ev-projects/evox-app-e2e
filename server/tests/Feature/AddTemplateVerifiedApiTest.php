<?php
// VERIFIED-BACKED — generated 2026-07-07 from add-template.registry.md (vetted by Glenn Macasarte on July 3, 2026)

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

/**
 * @registry-doc add-template.registry.md
 * @vetted-by    Glenn Macasarte
 * @vetted-on    July 3, 2026
 *
 * Covers: POST /api/schedule → ScheduleController::store(StoreScheduleRequest)
 *         → ScheduleRepository::store() → DB::transaction:
 *           INSERT schedules, INSERT schedule_details, INSERT schedule_policies ×2
 *         Returns 201 on success, 422 on validation failure.
 */
class AddTemplateVerifiedApiTest extends TestCase
{
    use DatabaseTransactions; // SAFETY: converted from RefreshDatabase 2026-07-08 — never migrate:fresh on staging DB

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = [
            'X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iWfoxLktznLfTUL3NfaNO5HittoAfA9Z'),
        ];
        $this->user = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();
    }

    // =========================================================================
    // PATTERN B — Auth enforcement (no withoutMiddleware)
    // POST /api/schedule — unauthenticated request must be rejected
    // =========================================================================

    /** @test */
    public function test_post_api_schedule_without_token_returns_401(): void
    {
        $response = $this->postJson('/api/schedule', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — Controller logic (withoutMiddleware + actingAs)
    // POST /api/schedule — validation: name is required (422)
    // ScheduleController::store → StoreScheduleRequest validates name required
    // =========================================================================

    /** @test */
    public function test_post_api_schedule_without_name_returns_422(): void
    {
        $this->withoutMiddleware();
        $payload = [
            'schedule_type' => 'standard',
            'source_type'   => 'template',
            'work_days'     => [],
            'schedule_details' => [
                'all' => [
                    'start_time' => '08:00',
                    'end_time'   => '17:00',
                    'break_time' => '12:00',
                ],
            ],
            'schedule_policies' => [
                'allow_special_holiday' => 1,
                'allow_legal_holiday'   => 1,
                'allow_undertime'       => 0,
                'allow_late'            => 0,
                'allow_night_diff'      => 0,
            ],
        ];

        $response = $this->actingAs($this->user)
                         ->postJson('/api/schedule', $payload, $this->apiKey);

        $response->assertStatus(422);
    }

    // =========================================================================
    // PATTERN A — Validation: schedule_type is required (422)
    // =========================================================================

    /** @test */
    public function test_post_api_schedule_without_schedule_type_returns_422(): void
    {
        $this->withoutMiddleware();
        $payload = [
            'name'        => 'Test Template Without Type',
            'source_type' => 'template',
            'work_days'   => [],
            'schedule_policies' => [
                'allow_special_holiday' => 1,
                'allow_legal_holiday'   => 1,
                'allow_undertime'       => 0,
                'allow_late'            => 0,
                'allow_night_diff'      => 0,
            ],
        ];

        $response = $this->actingAs($this->user)
                         ->postJson('/api/schedule', $payload, $this->apiKey);

        $response->assertStatus(422);
    }

    // =========================================================================
    // PATTERN A — Happy path: valid Standard template returns 201
    // ScheduleController::store → ScheduleRepository::store → DB::transaction
    // INSERT schedules + schedule_details + schedule_policies ×2
    // =========================================================================

    /** @test */
    public function test_post_api_schedule_with_valid_standard_payload_returns_201(): void
    {
        $this->withoutMiddleware();
        $payload = [
            'name'          => 'PHPUnit Standard Template',
            'source_type'   => 'template',
            'schedule_type' => 'standard',
            'work_days'     => ['mon', 'tue', 'wed', 'thu', 'fri'],
            'schedule_details' => [
                'all' => [
                    'start_time' => '08:00',
                    'end_time'   => '17:00',
                    'break_time' => '12:00',
                ],
            ],
            'schedule_policies' => [
                'allow_special_holiday' => 1,
                'allow_legal_holiday'   => 1,
                'allow_undertime'       => 0,
                'allow_late'            => 0,
                'allow_night_diff'      => 0,
            ],
        ];

        $response = $this->actingAs($this->user)
                         ->postJson('/api/schedule', $payload, $this->apiKey);

        $response->assertStatus(201);
    }

    // =========================================================================
    // PATTERN A — Happy path: valid Flexible template returns 201
    // Flexible type requires start_time, end_time, break_time,
    // start_flexy_time, end_flexy_time per detail entry
    // =========================================================================

    /** @test */
    public function test_post_api_schedule_with_valid_flexible_payload_returns_201(): void
    {
        $this->withoutMiddleware();
        $payload = [
            'name'          => 'PHPUnit Flexible Template',
            'source_type'   => 'template',
            'schedule_type' => 'flexible',
            'work_days'     => ['mon', 'tue', 'wed', 'thu', 'fri'],
            'schedule_details' => [
                'all' => [
                    'start_time'       => '07:00',
                    'end_time'         => '17:00',
                    'break_time'       => '12:00',
                    'start_flexy_time' => '07:00',
                    'end_flexy_time'   => '10:00',
                ],
            ],
            'schedule_policies' => [
                'allow_special_holiday' => 1,
                'allow_legal_holiday'   => 1,
                'allow_undertime'       => 0,
                'allow_late'            => 0,
                'allow_night_diff'      => 0,
            ],
        ];

        $response = $this->actingAs($this->user)
                         ->postJson('/api/schedule', $payload, $this->apiKey);

        $response->assertStatus(201);
    }

    // =========================================================================
    // PATTERN A — Boundary: name exceeds 255 characters returns 422
    // StoreScheduleRequest: name max:255
    // =========================================================================

    /** @test */
    public function test_post_api_schedule_with_name_exceeding_255_chars_returns_422(): void
    {
        $this->withoutMiddleware();
        $payload = [
            'name'          => str_repeat('A', 256),
            'source_type'   => 'template',
            'schedule_type' => 'standard',
            'work_days'     => [],
            'schedule_details' => [
                'all' => [
                    'start_time' => '08:00',
                    'end_time'   => '17:00',
                    'break_time' => '12:00',
                ],
            ],
            'schedule_policies' => [
                'allow_special_holiday' => 1,
                'allow_legal_holiday'   => 1,
                'allow_undertime'       => 0,
                'allow_late'            => 0,
                'allow_night_diff'      => 0,
            ],
        ];

        $response = $this->actingAs($this->user)
                         ->postJson('/api/schedule', $payload, $this->apiKey);

        $response->assertStatus(422);
    }

    // =========================================================================
    // PATTERN A — Completely empty body returns 422
    // Both name and schedule_type are required
    // =========================================================================

    /** @test */
    public function test_post_api_schedule_with_empty_body_returns_422(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
                         ->postJson('/api/schedule', [], $this->apiKey);
        $response->assertStatus(422);
    }

    // =========================================================================
    // Known gap marker
    // =========================================================================

    /** @test */
    public function test_post_api_schedule_no_redirect_after_success_is_known_gap(): void
    {
        // KNOWN GAP: after a successful POST /api/schedule the front end stays on /app/schedule/
        // with a blank form reset. The template list is NOT refreshed without a manual page reload.
        // This is a UX gap, not a backend bug. The API itself returns 201 correctly.
        $this->markTestSkipped(
            'Known UX gap: after successful template creation the UI does not refresh the template list. ' .
            'No redirect occurs. Form resets to blank. Tracked in add-template.registry.md.'
        );
    }
}
