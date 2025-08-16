<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class EvaSurvey extends Model
{
    protected $table = 'eva_survey';

    protected $fillable = [
        'user_id',
        'eva_year',
        'eva_quarter',
        'is_submitted',
        'attended_via',
        'job_performance_clarity',
        'work_output_contribution',
        'management_recognition',
        'member_value',
        'platform_link',
        'program_flow',
        'content_messages',
        'information_usefulness',
        'overall_satisfaction',
        'opportunities',
        'questions',
    ];
}
