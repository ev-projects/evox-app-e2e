<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\EvaSurvey;
use Carbon\Carbon;

class SurveySubmissionTest extends TestCase
{
    use DatabaseTransactions;

    public function test_user_can_create_nho_survey()
    {
        $this->withoutMiddleware();

        $user = User::find(1593);

        $payload = [
            'nho_date' => '2026-05-21',
            'onboarding_exp_rating' => 5,
            'recruitment_exp_rating' => 5,
            'schedule_awareness_rating' => 4,
            'topic_relevance_rating' => 5,
            'facilitator_id' => 1,
            'facilitator_knowledge_rating' => 5,
            'facilitator_presentation_rating' => 5,
            'facilitator_response_rating' => 5,
            'equipment_rating' => 4,
            'accessibility_rating' => 4,
            'welcome_rating' => 5,
            'suggestions' => 'Everything was good',
            'nho_overall_feedback' => 'Excellent onboarding',
        ];

        $response = $this->actingAs($user)->postJson('/api/nho_survey', $payload);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 200,
                'message' => 'Thank you for completing the NHO Survey! Your response has been successfully submitted. Please also consider leaving a Glassdoor review to help us improve our onboarding and workplace culture.',
            ]);

        $this->assertDatabaseHas('nho_survey', [
            'user_id' => $user->id,
            'nho_date' => '2026-05-21',
            'suggestions' => 'Everything was good',
            'nho_overall_feedback' => 'Excellent onboarding',
        ]);
    }
    
    public function test_user_can_create_eva_survey()
    {
        $this->withoutMiddleware();

        $user = User::find(1593);

        $now = Carbon::now();

        $evaSurvey = EvaSurvey::create([
            'user_id' => $user->id,
            'eva_year' => 2025,
            'eva_quarter' => 3,
            'is_submitted' => 0,
            'deleted_at' => null,
        ]);

        $payload = [
            'attended_via' => 'Virtual',
            'job_performance_clarity' => 5,
            'work_output_contribution' => 5,
            'management_recognition' => 4,
            'member_value' => 5,
            'platform_link' => 5,
            'program_flow' => 4,
            'content_messages' => 5,
            'information_usefulness' => 5,
            'overall_satisfaction' => 5,
            'opportunities' => 'More team engagement activities',
            'questions' => 'No questions',
        ];

        $response = $this->actingAs($user)->postJson('/api/eva_survey', $payload);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 200,
                'message' => 'Thank you for completing the EVA Survey! Your response has been successfully submitted.',
            ]);

        $this->assertDatabaseHas('eva_survey', [
            'id' => $evaSurvey->id,
            'user_id' => $user->id,
            'is_submitted' => 1,
            'attended_via' => 'Virtual',
            'opportunities' => 'More team engagement activities',
        ]);
    }
    
    public function test_user_can_create_happiness_survey()
    {
        $this->withoutMiddleware();
    
        $user = User::find(1593);
    
        $payload = [
            'focused_motivated' => 5,
            'growing_professionally' => 5,
            'work_understanding' => 5,
            'superior_relationship' => 5,
            'superior_feedback' => 4,
            'superior_approachability' => 5,
            'management_rewards' => 4,
            'colleagues_relationship' => 5,
            'ev_greatness' => 5,
            'will_recommend_ev' => 5,
            'policies_welfare' => 4,
            'safe_to_express' => 5,
            'it_system_satisfaction' => 4,
            'hr_response_satisfaction' => 5,
            'payroll_response_satisfaction' => 5,
            'ev_development_attention' => 4,
            'opportunities_satisfaction' => 5,
            'trainings_satisfaction' => 5,
            'healthcare_satisfaction' => 4,
            'work_flexibility' => 5,
            'salary_level' => 4,
            'compensation_performance' => 5,
            'salary_on_time' => 5,
            'salary_computation' => 5,
            'new_normal_setup' => 5,
            'happiness_suggestion' => 'Keep improving employee engagement programs.',
        ];
    
        $response = $this->actingAs($user)->postJson('/api/happiness_survey', $payload);
    
        $response->assertStatus(200)
            ->assertJson([
                'status' => 200,
                'message' => 'Thank you for completing the Happiness Survey! Your response has been successfully submitted.',
            ]);
    
        $this->assertDatabaseHas('happiness_survey', [
            'user_id' => $user->id,
            'year' => date('Y'),
            'healthcare_satisfaction' => 4,
            'salary_on_time' => 5,
            'happiness_suggestion' => 'Keep improving employee engagement programs.',
        ]);
    }
}
