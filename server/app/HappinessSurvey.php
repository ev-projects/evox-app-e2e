<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class HappinessSurvey extends Model
{
    protected $table = 'happiness_survey';

    protected $fillable = [
        'user_id',
        'year',
        'focused_motivated',
        'growing_professionally',
        'work_understanding',
        'superior_relationship',
        'superior_feedback',
        'superior_approachability',
        'management_rewards',
        'colleagues_relationship',
        'ev_greatness',
        'will_recommend_ev',
        'policies_welfare',
        'safe_to_express',
        'it_system_satisfaction',
        'hr_response_satisfaction',
        'payroll_response_satisfaction',
        'ev_development_attention',
        'opportunities_satisfaction',
        'trainings_satisfaction',
        'healthcare_satisfaction',
        'work_flexibility',
        'salary_level',
        'compensation_performance',
        'salary_on_time',
        'salary_computation',
        'new_normal_setup',
        'happiness_suggestion',
    ];
}
