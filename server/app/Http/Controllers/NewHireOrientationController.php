<?php

namespace App\Http\Controllers;
use Maatwebsite\Excel\Facades\Excel;
use App\NhoSurvey;
use Illuminate\Http\Request;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Auth;
use Carbon\Carbon;
use Exception;

class NewHireOrientationController extends Controller
{
    public function index()
    {
        return NhoSurvey::where('user_id', Auth::user()->id)->first() ?? [];
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
          $request->validate([
        'nho_date'                        => 'required|date',
        'onboarding_exp_rating'           => 'required|integer|min:1|max:5',
        'recruitment_exp_rating'          => 'required|integer|min:1|max:5',
        'schedule_awareness_rating'       => 'required|integer|min:1|max:5',
        'topic_relevance_rating'          => 'required|integer|min:1|max:5',
        'facilitator_id'                  => 'required|integer',
        'facilitator_knowledge_rating'    => 'required|integer|min:1|max:5',
        'facilitator_presentation_rating' => 'required|integer|min:1|max:5',
        'facilitator_response_rating'     => 'required|integer|min:1|max:5',
        'equipment_rating'                => 'required|integer|min:1|max:5',
        'accessibility_rating'            => 'required|integer|min:1|max:5',
        'welcome_rating'                  => 'required|integer|min:1|max:5',
    ]);
    
        try {
            $fields = [
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

            foreach ($fields as $field) {
                $data[$field] = $request->$field;
            }
            $data['user_id'] = Auth::user()->id;
            $data['created_at'] = Carbon::now();

            $nho = NhoSurvey::insert($data);

            if ($nho == 1) {
                return response()->json(['message' => 'Thank you for completing the NHO Survey! Your response has been successfully submitted. Please also consider leaving a Glassdoor review to help us improve our onboarding and workplace culture.', 'status' => 200], 200);
            }
        } catch(\Throwable $e) {
            return error_response( trans('messages.error_default'), $e );
        }
    }
}