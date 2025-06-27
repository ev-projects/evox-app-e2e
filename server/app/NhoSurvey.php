<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class NhoSurvey extends Model
{
    protected $table = 'nho_survey';

    protected $fillable = [
        'user_id',
        'nho_date',
        'onboarding_exp_rating',
        'recruitment_exp_rating',
        'schedule_awareness_rating',
        'topic_relevance_rating',
        'facilitator_id',
        'facilitator_knowledge_rating',
        'facilitator_presentation_rating',
        'facilitator_response_rating',
        'equipment_rating',
        'accessibility_rating',
        'welcome_rating',
        'suggestions',
        'nho_overall_feedback',
    ];
}
