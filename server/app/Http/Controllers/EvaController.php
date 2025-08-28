<?php

namespace App\Http\Controllers;
use App\EvaSurvey;
use Illuminate\Http\Request;
use Auth;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class EvaController extends Controller
{
    public function index()
    {
        $eva_get = EvaSurvey::where('user_id', Auth::user()->id)->where('is_submitted', 0)->where('deleted_at', null)->first();
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
            $user_eva = EvaSurvey::where('user_id', Auth::user()->id)->where('is_submitted', 0)->where('deleted_at', null)->first();
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
}