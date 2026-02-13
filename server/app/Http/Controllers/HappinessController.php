<?php

namespace App\Http\Controllers;
use App\HappinessSurvey;
use Illuminate\Http\Request;
use Auth;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class HappinessController extends Controller
{
    public function getHappinessSurvey()
    {
        $happiness_survey_get = HappinessSurvey::where('user_id', Auth::user()->id)->where('year', date('Y'))->where('deleted_at', null)->first();
        return success_response(
            trans('Happiness survey successfully fetched!'),
            $happiness_survey_get,
            JsonResponse::HTTP_OK
        );
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function addHappinessSurvey(Request $request)
    {
        try {
            $fields = [
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

            foreach ($fields as $field) {
                $data[$field] = $request->$field;
            }
            $data['user_id'] = Auth::user()->id;
            $data['year'] = date('Y');
            $data['created_at'] = Carbon::now();
            $data['updated_at'] = Carbon::now();

            $happiness_survey_post = HappinessSurvey::create($data);

            if ($happiness_survey_post) {
                return response()->json(['message' => 'Thank you for completing the Happiness Survey! Your response has been successfully submitted.', 'status' => 200], 200);
            }
        } catch(Exception $e) {
            return error_response( trans('messages.error_default'), $e );
        }
    }
}