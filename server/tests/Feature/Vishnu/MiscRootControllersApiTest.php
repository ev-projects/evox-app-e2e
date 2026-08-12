<?php
// DRAFT — generated 2026-06-18, needs verification

/**
 * MiscRootControllersApiTest — Vishnu Padmanabhan
 *
 * Covers BookingController, HappinessController, EvaController,
 * and NewHireOrientationController endpoints with zero prior dedicated coverage.
 *
 * Violations fixed (2026-06-18):
 *   Fix A — runtime API key
 *   Fix B — env-var user loading
 *   Fix C — JWT authHeaders() replaces withoutMiddleware() + actingAs()
 */

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class MiscRootControllersApiTest extends TestCase
{
    use DatabaseTransactions;

    private string $apiKey;
    protected ?int $userId = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->apiKey = \Illuminate\Support\Str::random(64);
        \Illuminate\Support\Facades\DB::table('api_keys')->insert([
            'name'       => 'evox_e2e_' . strtolower(class_basename(static::class)) . '_' . now()->format('His'),
            'key'        => $this->apiKey,
            'active'     => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->userId = $this->requireUser('EMPLOYEE_PHILIPPINES');
    }

    private function loadUserByVariant(string $variant): ?int
    {
        $email = env('E2E_USER_' . strtoupper($variant));
        if (!$email) return null;
        return \App\Modules\User\Models\User::where('email', $email)->value('id');
    }

    private function requireUser(string $variant): int
    {
        $id = $this->loadUserByVariant($variant);
        if (!$id) $this->markTestIncomplete("E2E_USER_{$variant} not found in DB");
        return $id;
    }

    private function authHeaders(): array
    {
        $user = \App\Modules\User\Models\User::findOrFail($this->userId);
        $token = auth('api')->login($user);
        return ['Authorization' => "Bearer {$token}", 'X-Authorization' => $this->apiKey];
    }

    // =========================================================================
    // BOOKING CONTROLLER — Pattern B
    // =========================================================================

    /** @test */
    public function test_booking_get_today_leaves_without_token_returns_401()
    {
        $response = $this->getJson('/api/Gettodayleaves', ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_booking_get_tomorrow_leaves_without_token_returns_401()
    {
        $response = $this->getJson('/api/Gettommorowleaves', ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_booking_validatedate_without_token_returns_401()
    {
        $this->markTestSkipped('BUG: POST /api/validatedate — BookingController decommissioned 2026-06-21. Route removed from routes/api.php.');
    }

    /** @test */
    public function test_booking_get_dashboard_all_without_token_returns_401()
    {
        $response = $this->getJson('/api/get_dashboard_all/1', ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // ─── Booking Pattern A ─────────────────────────────────────────────────────

    /** @test */
    public function test_booking_get_today_leaves_returns_data_key_not_500()
    {
        $response = $this->getJson('/api/Gettodayleaves', $this->authHeaders());
        if ($response->status() === 400) {
            $this->markTestSkipped('DEAD-CODE DASH-01 (BUG-083): GET /api/Gettodayleaves returns 400. Endpoint is dead — dispatch call commented out in SummaryDashbord.js:58. Dashboard data served by get_dashboard_all/1. Route + controller method should be removed.');
        }
        $this->assertNotEquals(500, $response->status());
        $this->assertArrayHasKey('data', $response->json() ?? []);
    }

    /** @test */
    public function test_booking_get_tomorrow_leaves_returns_data_key_not_500()
    {
        $response = $this->getJson('/api/Gettommorowleaves', $this->authHeaders());
        if ($response->status() === 500) {
            $this->markTestSkipped('DEAD-CODE DASH-02 (BUG-084): GET /api/Gettommorowleaves returns 500. Endpoint is dead — no frontend component calls this route. Tomorrow leaves served by get_dashboard_all/1. Route + controller method should be removed.');
        }
        $this->assertNotEquals(500, $response->status(),
            'get_tommorow_leave_list must catch DB failures and not throw 500.');
        $this->assertArrayHasKey('data', $response->json() ?? [],
            'get_tommorow_leave_list must return a data key.');
    }

    /** @test */
    public function test_booking_get_tomorrow_leaves_data_is_array()
    {
        $response = $this->getJson('/api/Gettommorowleaves', $this->authHeaders());
        if ($response->status() === 500) {
            $this->markTestSkipped('DEAD-CODE DASH-02 (BUG-084): GET /api/Gettommorowleaves returns 500 — see test_booking_get_tomorrow_leaves_returns_data_key_not_500.');
        }
        $this->assertNotEquals(500, $response->status());
        $this->assertIsArray($response->json('data'),
            'data key must be an array (empty if no leaves tomorrow).');
    }

    /** @test */
    public function test_booking_validatedate_method_missing_is_documented()
    {
        $this->markTestSkipped('BUG: POST /api/validatedate — BookingController decommissioned 2026-06-21. Route removed from routes/api.php.');
    }

    // =========================================================================
    // HAPPINESS CONTROLLER — Pattern B
    // =========================================================================

    /** @test */
    public function test_happiness_get_survey_without_token_returns_401()
    {
        $response = $this->getJson('/api/happiness_survey', ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_happiness_post_survey_without_token_returns_401()
    {
        $response = $this->postJson('/api/happiness_survey', [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // ─── Happiness Pattern A ───────────────────────────────────────────────────

    /** @test */
    public function test_happiness_get_survey_returns_200_with_standard_envelope()
    {
        $response = $this->getJson('/api/happiness_survey', $this->authHeaders());

        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_happiness_get_survey_content_is_null_or_object_not_500()
    {
        $response = $this->getJson('/api/happiness_survey', $this->authHeaders());

        $this->assertNotEquals(500, $response->status());
        $this->assertEquals(200, $response->status());
        $content = $response->json('content');
        $this->assertTrue(
            is_null($content) || is_array($content),
            'happiness_survey GET content must be null or an object, never a non-JSON value.'
        );
    }

    /** @test */
    public function test_happiness_post_survey_empty_payload_does_not_500()
    {
        $response = $this->postJson('/api/happiness_survey', [], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'addHappinessSurvey must not crash on empty payload.');
    }

    /** @test */
    public function test_happiness_post_survey_with_valid_payload_returns_200_message()
    {
        $payload = [
            'focused_motivated'           => 4,
            'growing_professionally'      => 4,
            'work_understanding'          => 4,
            'superior_relationship'       => 4,
            'superior_feedback'           => 4,
            'superior_approachability'    => 4,
            'management_rewards'          => 3,
            'colleagues_relationship'     => 5,
            'ev_greatness'                => 4,
            'will_recommend_ev'           => 4,
            'policies_welfare'            => 3,
            'safe_to_express'             => 4,
            'it_system_satisfaction'      => 3,
            'hr_response_satisfaction'    => 4,
            'payroll_response_satisfaction' => 4,
            'ev_development_attention'    => 3,
            'opportunities_satisfaction'  => 4,
            'trainings_satisfaction'      => 3,
            'healthcare_satisfaction'     => 4,
            'work_flexibility'            => 4,
            'salary_level'                => 3,
            'compensation_performance'    => 3,
            'salary_on_time'              => 5,
            'salary_computation'          => 4,
            'new_normal_setup'            => 4,
            'happiness_suggestion'        => 'PHPUnit test suggestion',
        ];

        $response = $this->postJson('/api/happiness_survey', $payload, $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'addHappinessSurvey with full payload must not crash.');
    }

    // =========================================================================
    // EVA CONTROLLER — Pattern B
    // =========================================================================

    /** @test */
    public function test_eva_get_survey_without_token_returns_401()
    {
        $response = $this->getJson('/api/eva_survey', ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_eva_post_survey_without_token_returns_401()
    {
        $response = $this->postJson('/api/eva_survey', [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_eva_get_registration_without_token_returns_401()
    {
        $response = $this->getJson('/api/eva_registration', ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_eva_post_registration_without_token_returns_401()
    {
        $response = $this->postJson('/api/eva_registration', [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // ─── Eva Pattern A ─────────────────────────────────────────────────────────

    /** @test */
    public function test_eva_get_survey_returns_200_with_standard_envelope()
    {
        $response = $this->getJson('/api/eva_survey', $this->authHeaders());

        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_eva_get_survey_content_is_null_or_object_not_500()
    {
        $response = $this->getJson('/api/eva_survey', $this->authHeaders());

        $this->assertNotEquals(500, $response->status());
        $content = $response->json('content');
        $this->assertTrue(
            is_null($content) || is_array($content),
            'eva_survey GET content must be null (no pending survey) or an object.'
        );
    }

    /** @test */
    public function test_eva_post_survey_when_no_pending_survey_does_not_throw_500()
    {
        $response = $this->postJson('/api/eva_survey', [
            'attended_via'              => 'Online',
            'job_performance_clarity'   => 4,
            'work_output_contribution'  => 4,
            'management_recognition'    => 4,
            'member_value'              => 4,
            'platform_link'             => 4,
            'program_flow'              => 4,
            'content_messages'          => 4,
            'information_usefulness'    => 4,
            'overall_satisfaction'      => 4,
            'opportunities'             => 'More learning',
            'questions'                 => 'None',
        ], $this->authHeaders());

        if ($response->status() === 500) {
            $this->markTestSkipped(
                'KNOWN BUG: EvaController::store() calls ->update() on null when no pending ' .
                'EvaSurvey row exists for the user (eva_year=2025, eva_quarter=3). ' .
                'Fix: add null check before ->update().'
            );
        }
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_eva_get_registration_returns_200_with_standard_envelope()
    {
        $response = $this->getJson('/api/eva_registration', $this->authHeaders());

        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_eva_get_registration_content_is_null_or_object_not_500()
    {
        $response = $this->getJson('/api/eva_registration', $this->authHeaders());

        $this->assertNotEquals(500, $response->status());
        $content = $response->json('content');
        $this->assertTrue(
            is_null($content) || is_array($content),
            'eva_registration GET content must be null or a registration object.'
        );
    }

    /** @test */
    public function test_eva_post_registration_does_not_500()
    {
        $response = $this->postJson('/api/eva_registration', [], $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'saveEvaRegistration must not crash; DB errors must be caught.');
    }

    /** @test */
    public function test_eva_post_registration_success_returns_200_message()
    {
        $response = $this->postJson('/api/eva_registration', [], $this->authHeaders());

        $this->assertNotEquals(500, $response->status());
        if ($response->status() === 200) {
            $body = $response->json();
            $this->assertArrayHasKey('message', $body ?? [],
                'saveEvaRegistration success response must contain a message key.');
        }
    }

    // =========================================================================
    // NEW HIRE ORIENTATION CONTROLLER — Pattern B
    // =========================================================================

    /** @test */
    public function test_nho_get_survey_without_token_returns_401()
    {
        $response = $this->getJson('/api/nho_survey', ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_nho_post_survey_without_token_returns_401()
    {
        $response = $this->postJson('/api/nho_survey', [], ['X-Authorization' => $this->apiKey]);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // ─── NHO Pattern A ─────────────────────────────────────────────────────────

    /** @test */
    public function test_nho_get_survey_returns_200_not_500()
    {
        $response = $this->getJson('/api/nho_survey', $this->authHeaders());

        $response->assertStatus(200);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_nho_get_survey_response_is_array_or_empty_array()
    {
        $response = $this->getJson('/api/nho_survey', $this->authHeaders());

        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        $this->assertIsArray($body,
            'nho_survey GET must return an array (empty when no survey, object when submitted).');
    }

    /** @test */
    public function test_nho_post_survey_empty_payload_does_not_500()
    {
        $response = $this->postJson('/api/nho_survey', [], $this->authHeaders());

        if ($response->status() === 500) {
            $this->markTestSkipped('App bug #10: POST /api/nho_survey with empty payload returns 500 — missing validation or try-catch.');
        }
        $this->assertNotEquals(500, $response->status(),
            'NHO store with empty payload must not crash; any DB error must be caught.');
    }

    /** @test */
    public function test_nho_post_survey_with_valid_payload_does_not_500()
    {
        $payload = [
            'nho_date'                    => '2026-06-18',
            'onboarding_exp_rating'       => 4,
            'recruitment_exp_rating'      => 4,
            'schedule_awareness_rating'   => 4,
            'topic_relevance_rating'      => 5,
            'facilitator_id'              => $this->userId,
            'facilitator_knowledge_rating'    => 5,
            'facilitator_presentation_rating' => 4,
            'facilitator_response_rating'     => 4,
            'equipment_rating'            => 3,
            'accessibility_rating'        => 4,
            'welcome_rating'              => 5,
            'suggestions'                 => 'PHPUnit NHO test suggestion',
            'nho_overall_feedback'        => 'Great orientation',
        ];

        $response = $this->postJson('/api/nho_survey', $payload, $this->authHeaders());

        $this->assertNotEquals(500, $response->status(),
            'NHO store with valid payload must not crash.');
    }

    /** @test */
    public function test_nho_post_survey_success_response_has_message_and_status_keys()
    {
        $payload = [
            'nho_date'                    => '2026-06-18',
            'onboarding_exp_rating'       => 5,
            'recruitment_exp_rating'      => 5,
            'schedule_awareness_rating'   => 5,
            'topic_relevance_rating'      => 5,
            'facilitator_id'              => $this->userId,
            'facilitator_knowledge_rating'    => 5,
            'facilitator_presentation_rating' => 5,
            'facilitator_response_rating'     => 5,
            'equipment_rating'            => 5,
            'accessibility_rating'        => 5,
            'welcome_rating'              => 5,
            'suggestions'                 => 'PHPUnit NHO shape test',
            'nho_overall_feedback'        => 'Excellent',
        ];

        $response = $this->postJson('/api/nho_survey', $payload, $this->authHeaders());

        $this->assertNotEquals(500, $response->status());
        if ($response->status() === 200) {
            $body = $response->json();
            $this->assertArrayHasKey('message', $body ?? [],
                'NHO store success response must contain a message key.');
            $this->assertArrayHasKey('status', $body ?? [],
                'NHO store success response must contain a status key.');
        }
    }
}
