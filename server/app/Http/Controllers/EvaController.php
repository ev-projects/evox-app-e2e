<?php

namespace App\Http\Controllers;
use App\EvaSurvey;
use App\EvaRegistration;
use Illuminate\Http\Request;
use Auth;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class EvaController extends Controller
{
    public function index()
    {
        $eva_get = EvaSurvey::where('user_id', Auth::user()->id)->where('is_submitted', 0)->where('eva_year', 2025)->where('eva_quarter', 3)->where('deleted_at', null)->first();
        return success_response(
            trans('EVA survey successfully fetched!'),
            $eva_get,
            JsonResponse::HTTP_OK
        );
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        try {
            $user_eva = EvaSurvey::where('user_id', Auth::user()->id)->where('is_submitted', 0)->where('eva_year', 2025)->where('eva_quarter', 3)->where('deleted_at', null)->first();
            $fields = [
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

            foreach ($fields as $field) {
                $data[$field] = $request->$field;
            }
            $data['is_submitted'] = 1;
            $data['created_at'] = Carbon::now();
            $data['updated_at'] = Carbon::now();

            $eva_update = $user_eva->update($data);

            if ($eva_update) {
                return response()->json(['message' => 'Thank you for completing the EVA Survey! Your response has been successfully submitted.', 'status' => 200], 200);
            }
        } catch(Exception $e) {
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function getEvaRegistration()
    {
        $eva_get = EvaRegistration::where('user_id', Auth::user()->id)->where('deleted_at', null)->first();
        return success_response(
            trans('EVA registration record successfully fetched!'),
            $eva_get,
            JsonResponse::HTTP_OK
        );
    }

    public function saveEvaRegistration()
    {
        try {
            $data = [
                'user_id' => Auth::user()->id,
                'eva_year' => date("Y"),
                'eva_quarter' => 3, // should use ceil(10 / 3) to get the actual quarter
                'is_attending' => 1
            ];

            $user_eva_reg = EvaRegistration::create($data);

            if ($user_eva_reg) {
                return response()->json(['message' => 'Thank you for your interest in our upcoming EVA! Your response has been successfully submitted.', 'status' => 200], 200);
            }
        } catch(Exception $e) {
            return error_response( trans('messages.error_default'), $e );
        }
    }
}