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
        try {
            $request->user_id = auth()->user()->id;
            $nho = NhoSurvey::insert($request->all() + ['user_id' => Auth::user()->id, 'created_at' => Carbon::now()]);

            if ($nho == 1) {
                return response()->json(['message' => 'New hire orientation survey submitted successfully', 'status' => 200], 200);
            }
        } catch(Exception $e) {
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
