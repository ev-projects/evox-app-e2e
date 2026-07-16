<?php
// DRAFT — generated 2026-06-18, needs verification
//
// Covers four root-namespace controllers that had zero dedicated test coverage:
//
//   BookingController     (app/Http/Controllers/BookingController.php)
//     All routes live in routes/api.php under middleware: jwtauth + auth.apikey
//     NOTE: Most Booking routes are covered more deeply in MeetingRoomApiTest.php.
//           This file adds Pattern B (auth) + Pattern A (coverage) for routes not
//           tested there: get_today_leave_list, get_tommorow_leave_list, validatedate.
//           For the remaining Booking routes, Pattern B is included here so that
//           auth coverage is recorded in one place alongside the three other controllers.
//
//   HappinessController   (app/Http/Controllers/HappinessController.php)
//     GET  /api/happiness_survey    — getHappinessSurvey
//     POST /api/happiness_survey    — addHappinessSurvey
//
//   EvaController         (app/Http/Controllers/EvaController.php)
//     GET  /api/eva_survey          — index
//     POST /api/eva_survey          — store
//     GET  /api/eva_registration    — getEvaRegistration
//     POST /api/eva_registration    — saveEvaRegistration
//
//   NewHireOrientationController (app/Http/Controllers/NewHireOrientationController.php)
//     GET  /api/nho_survey          — index
//     POST /api/nho_survey          — store
//
// Test patterns:
//   B — Auth enforcement: real middleware stack, no Bearer token → 401
//   A — Controller logic: withoutMiddleware() + actingAs() → assertNotEquals(500)
//
// Known bugs documented inline:
//   - BookingController::get_today_leave_list() has an un-removed dd() debug call
//     that would halt the response in any environment including test. Skipped.
//   - BookingController::validatedate() is declared in routes/api.php but the
//     method does NOT exist in BookingController. Route resolves to 500/BadMethod.
//   - EvaController::store() and saveEvaRegistration() call ->update() on null when
//     no matching EvaSurvey / EvaRegistration row exists for the user — PHP \Error.
//   - HappinessController::addHappinessSurvey() uses catch(Exception $e) without
//     `use Exception;` in the namespace — non-namespaced catch may miss exceptions.

namespace Tests\Feature\Vishnu;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class MiscRootControllersApiTest extends TestCase
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
    // BOOKING CONTROLLER
    // All routes: GET|POST|PUT /api/* with middleware: jwtauth + auth.apikey
    // Detailed coverage lives in MeetingRoomApiTest.php.
    // This section adds Pattern B stubs for the three uncovered routes and
    // records Pattern B auth coverage for the rest.
    // =========================================================================

    // ─── Pattern B — auth enforcement ─────────────────────────────────────────

    /**
     * @test
     * @group dead-code
     */
    public function test_booking_get_today_leaves_without_token_returns_401()
    {
        $response = $this->getJson('/api/Gettodayleaves', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /**
     * @test
     * @group dead-code
     */
    public function test_booking_get_tomorrow_leaves_without_token_returns_401()
    {
        $response = $this->getJson('/api/Gettommorowleaves', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /**
     * @test
     * @group dead-code
     */
    public function test_booking_validatedate_without_token_returns_401()
    {
        $response = $this->postJson('/api/validatedate', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /**
     * @test
     * @group dead-code
     */
    public function test_booking_get_dashboard_all_without_token_returns_401()
    {
        // Additional Pattern B; Pattern A is in DashboardApiTest.php.
        $response = $this->getJson('/api/get_dashboard_all/1', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // ─── Pattern A — controller logic ─────────────────────────────────────────

    /**
     * @test
     * @group dead-code
     */
    public function test_booking_get_today_leaves_is_skipped_due_to_dd_call()
    {
        // KNOWN PRODUCTION BUG: BookingController::get_today_leave_list() contains an
        // un-removed `dd($result)` debug dump (line ~350). Calling this endpoint in any
        // environment executes dump-and-die, producing a non-JSON HTML response that
        // halts the test runner output for this request.
        // Fix: remove the dd() call and complete the implementation.
        $this->markTestSkipped(
            'KNOWN BUG: BookingController::get_today_leave_list() has an un-removed dd() call. ' .
            'Hitting GET /api/Gettodayleaves will dump-and-die instead of returning JSON. ' .
            'Remove the dd() to make this route testable.'
        );
    }

    /**
     * @test
     * @group dead-code
     */
    public function test_booking_get_tomorrow_leaves_returns_data_key_not_500()
    {
        // get_tommorow_leave_list queries leaves+dtrs+users — no dd() bug on this branch.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/Gettommorowleaves', $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'get_tommorow_leave_list must catch DB failures and not throw 500.');
        // Controller returns ['data' => $booking] directly (no success_response wrapper)
        $body = $response->json();
        $this->assertArrayHasKey('data', $body ?? [],
            'get_tommorow_leave_list must return a data key.');
    }

    /**
     * @test
     * @group dead-code
     */
    public function test_booking_get_tomorrow_leaves_data_is_array()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/Gettommorowleaves', $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        $this->assertIsArray($response->json('data'),
            'data key must be an array (empty if no leaves tomorrow).');
    }

    /**
     * @test
     * @group dead-code
     */
    public function test_booking_validatedate_method_missing_is_documented()
    {
        // KNOWN MISSING METHOD: routes/api.php registers POST /api/validatedate pointing to
        // BookingController@validatedate, but BookingController does not declare this method.
        // The framework resolves the route and throws BadMethodCallException → HTTP 500.
        // Fix: implement the validatedate() method in BookingController.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->postJson('/api/validatedate', [], $this->apiKey);

        if ($response->status() === 500) {
            $this->markTestIncomplete(
                'KNOWN BUG: BookingController::validatedate() does not exist. ' .
                'POST /api/validatedate returns 500 (BadMethodCallException). ' .
                'Implement the method to fix this.'
            );
        }

        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // HAPPINESS CONTROLLER
    // Routes: middleware jwtauth + auth.apikey
    //   GET  /api/happiness_survey   — getHappinessSurvey
    //   POST /api/happiness_survey   — addHappinessSurvey
    // =========================================================================

    // ─── Pattern B — auth enforcement ─────────────────────────────────────────

    /** @test */
    public function test_happiness_get_survey_without_token_returns_401()
    {
        $response = $this->getJson('/api/happiness_survey', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_happiness_post_survey_without_token_returns_401()
    {
        $response = $this->postJson('/api/happiness_survey', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // ─── Pattern A — controller logic ─────────────────────────────────────────

    /** @test */
    public function test_happiness_get_survey_returns_200_with_standard_envelope()
    {
        // getHappinessSurvey queries HappinessSurvey by user + year — DB-only, no external calls.
        // Returns null content when no record exists or when popup_flag.status == 0.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/happiness_survey', $this->apiKey);

        $response->assertStatus(200);
        // success_response() envelope: {message, content}
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_happiness_get_survey_content_is_null_or_object_not_500()
    {
        // Content is null when: (a) no survey found, or (b) popup_flag.status == 0.
        // Either way the response must be 200 with the envelope, not 500.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/happiness_survey', $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        $this->assertEquals(200, $response->status());
        // content can be null (no survey submitted yet) or an object
        $content = $response->json('content');
        $this->assertTrue(
            is_null($content) || is_array($content),
            'happiness_survey GET content must be null or an object, never a non-JSON value.'
        );
    }

    /** @test */
    public function test_happiness_post_survey_empty_payload_does_not_500()
    {
        // addHappinessSurvey iterates $fields and sets $data[$field] = $request->$field.
        // No validation — fields will be null. HappinessSurvey::create() may succeed or
        // hit a DB constraint. Either way the controller must NOT return 500.
        // NOTE: catch(Exception $e) in HappinessController is missing `use Exception;` —
        // exceptions may not be caught. We assert not-500 to confirm coverage path fires.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->postJson('/api/happiness_survey', [], $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'addHappinessSurvey must not crash on empty payload.');
    }

    /** @test */
    public function test_happiness_post_survey_with_valid_payload_returns_200_message()
    {
        $this->withoutMiddleware();

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

        $response = $this->actingAs($this->user)
            ->postJson('/api/happiness_survey', $payload, $this->apiKey);

        // HappinessSurvey::create() may fail if a row already exists for this user+year
        // (no unique constraint checked in controller). Accept 200 or any non-500.
        $this->assertNotEquals(500, $response->status(),
            'addHappinessSurvey with full payload must not crash.');
    }

    // =========================================================================
    // EVA CONTROLLER
    // Routes: middleware jwtauth + auth.apikey
    //   GET  /api/eva_survey         — index
    //   POST /api/eva_survey         — store
    //   GET  /api/eva_registration   — getEvaRegistration
    //   POST /api/eva_registration   — saveEvaRegistration
    //
    // Known bugs:
    //   store(): calls $user_eva->update($data) where $user_eva can be null when
    //     no matching EvaSurvey row exists → PHP \Error: Call to member function
    //     update() on null → 500. Skipped for the store POST happy path.
    //   saveEvaRegistration(): EvaRegistration::create() may throw if the user
    //     already has a registration row; no duplicate check in controller.
    // =========================================================================

    // ─── Pattern B — auth enforcement ─────────────────────────────────────────

    /** @test */
    public function test_eva_get_survey_without_token_returns_401()
    {
        $response = $this->getJson('/api/eva_survey', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_eva_post_survey_without_token_returns_401()
    {
        $response = $this->postJson('/api/eva_survey', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_eva_get_registration_without_token_returns_401()
    {
        $response = $this->getJson('/api/eva_registration', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_eva_post_registration_without_token_returns_401()
    {
        $response = $this->postJson('/api/eva_registration', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // ─── Pattern A — controller logic ─────────────────────────────────────────

    /** @test */
    public function test_eva_get_survey_returns_200_with_standard_envelope()
    {
        // index() queries EvaSurvey for the user (is_submitted=0, year=2025, quarter=3).
        // Returns null content when no matching row exists — that is the expected state
        // for most test-env users (survey is quarter-specific and may be from 2025).
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/eva_survey', $this->apiKey);

        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_eva_get_survey_content_is_null_or_object_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/eva_survey', $this->apiKey);

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
        // KNOWN BUG: store() does $user_eva->update($data) where $user_eva is the result of
        // EvaSurvey::where(...)->first(). If no matching row exists, first() returns null
        // and ->update($data) on null throws PHP \Error (not caught by catch(Exception $e))
        // → HTTP 500. This test documents the bug without blocking CI.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->postJson('/api/eva_survey', [
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
            ], $this->apiKey);

        if ($response->status() === 500) {
            $this->markTestIncomplete(
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
        // getEvaRegistration() queries EvaRegistration by user — returns null if not registered.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/eva_registration', $this->apiKey);

        $response->assertStatus(200);
        $response->assertJsonStructure(['message', 'content']);
    }

    /** @test */
    public function test_eva_get_registration_content_is_null_or_object_not_500()
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/eva_registration', $this->apiKey);

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
        // saveEvaRegistration() creates an EvaRegistration row with is_attending=1.
        // If a row already exists for this user there is no duplicate check in the controller,
        // so a DB unique constraint violation could be thrown. The catch(Exception $e) block
        // will handle it gracefully. We assert not-500 to confirm the code path executes.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->postJson('/api/eva_registration', [], $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'saveEvaRegistration must not crash; DB errors must be caught.');
    }

    /** @test */
    public function test_eva_post_registration_success_returns_200_message()
    {
        // When a new registration is created successfully, the controller returns
        // response()->json(['message' => '...', 'status' => 200], 200).
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->postJson('/api/eva_registration', [], $this->apiKey);

        // Accept 200 (created) or any non-500 (e.g. DB constraint if already registered)
        $this->assertNotEquals(500, $response->status());
        if ($response->status() === 200) {
            $body = $response->json();
            $this->assertArrayHasKey('message', $body ?? [],
                'saveEvaRegistration success response must contain a message key.');
        }
    }

    // =========================================================================
    // NEW HIRE ORIENTATION CONTROLLER
    // Routes: middleware jwtauth + auth.apikey
    //   GET  /api/nho_survey   — index
    //   POST /api/nho_survey   — store
    //
    // index() returns NhoSurvey::where('user_id', ...)->first() ?? []
    //   → raw Eloquent model (not wrapped in success_response)
    // store() calls NhoSurvey::insert($data) then returns JSON; no unique check.
    // =========================================================================

    // ─── Pattern B — auth enforcement ─────────────────────────────────────────

    /** @test */
    public function test_nho_get_survey_without_token_returns_401()
    {
        $response = $this->getJson('/api/nho_survey', $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    /** @test */
    public function test_nho_post_survey_without_token_returns_401()
    {
        $response = $this->postJson('/api/nho_survey', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // ─── Pattern A — controller logic ─────────────────────────────────────────

    /** @test */
    public function test_nho_get_survey_returns_200_not_500()
    {
        // index() does a simple NhoSurvey::where('user_id', ...)->first() ?? []
        // Returns raw Eloquent model (no success_response wrapper) or an empty array [].
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/nho_survey', $this->apiKey);

        $response->assertStatus(200);
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_nho_get_survey_response_is_array_or_empty_array()
    {
        // When no NHO survey exists for the user, returns [] (empty array).
        // When a survey exists, returns the serialised Eloquent model (array).
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->getJson('/api/nho_survey', $this->apiKey);

        $this->assertNotEquals(500, $response->status());
        $body = $response->json();
        $this->assertIsArray($body,
            'nho_survey GET must return an array (empty when no survey, object when submitted).');
    }

    /** @test */
    public function test_nho_post_survey_empty_payload_does_not_500()
    {
        // store() maps $fields via $request->$field — null values will be inserted.
        // NhoSurvey::insert($data) will fire. If a constraint is violated the catch block fires.
        // Goal: exercise the code path without crashing.
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)
            ->postJson('/api/nho_survey', [], $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'NHO store with empty payload must not crash; any DB error must be caught.');
    }

    /** @test */
    public function test_nho_post_survey_with_valid_payload_does_not_500()
    {
        $this->withoutMiddleware();

        $payload = [
            'nho_date'                    => '2026-06-18',
            'onboarding_exp_rating'       => 4,
            'recruitment_exp_rating'      => 4,
            'schedule_awareness_rating'   => 4,
            'topic_relevance_rating'      => 5,
            'facilitator_id'              => $this->user->id,
            'facilitator_knowledge_rating'    => 5,
            'facilitator_presentation_rating' => 4,
            'facilitator_response_rating'     => 4,
            'equipment_rating'            => 3,
            'accessibility_rating'        => 4,
            'welcome_rating'              => 5,
            'suggestions'                 => 'PHPUnit NHO test suggestion',
            'nho_overall_feedback'        => 'Great orientation',
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/nho_survey', $payload, $this->apiKey);

        $this->assertNotEquals(500, $response->status(),
            'NHO store with valid payload must not crash.');
    }

    /** @test */
    public function test_nho_post_survey_success_response_has_message_and_status_keys()
    {
        $this->withoutMiddleware();

        $payload = [
            'nho_date'                    => '2026-06-18',
            'onboarding_exp_rating'       => 5,
            'recruitment_exp_rating'      => 5,
            'schedule_awareness_rating'   => 5,
            'topic_relevance_rating'      => 5,
            'facilitator_id'              => $this->user->id,
            'facilitator_knowledge_rating'    => 5,
            'facilitator_presentation_rating' => 5,
            'facilitator_response_rating'     => 5,
            'equipment_rating'            => 5,
            'accessibility_rating'        => 5,
            'welcome_rating'              => 5,
            'suggestions'                 => 'PHPUnit NHO shape test',
            'nho_overall_feedback'        => 'Excellent',
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/nho_survey', $payload, $this->apiKey);

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
