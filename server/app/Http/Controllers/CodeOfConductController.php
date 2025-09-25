<?php

namespace App\Http\Controllers;
use App\CodeOfConduct;
use Illuminate\Http\Request;
use Auth;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class CodeOfConductController extends Controller
{
    public function index()
    {
        $coc_get = CodeOfConduct::where('user_id', Auth::user()->id)->where('deleted_at', null)->first();
        return success_response(
            trans('Code of Conduct agreement successfully fetched!'),
            $coc_get,
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
            $user_id = Auth::user()->id;
            $user_coc = CodeOfConduct::where('user_id', $user_id)->first();

            if ($user_coc && $user_coc->is_acknowledged === 1) {
                // Update existing record
                $user_coc->is_completed = 1;
                $user_coc->completed_at = Carbon::now();
                $user_coc->save();

                return response()->json([
                    'message' => 'Your Code of Conduct status has been updated successfully.',
                    'status' => 200
                ], 200);
            } else {
                // Create new record
                CodeOfConduct::create([
                    'user_id' => Auth::user()->id,
                    'is_acknowledged' => 1,
                    'acknowledged_at' => Carbon::now(),
                ]);
                
                return response()->json([
                    'message' => 'Thank you for acknowledging the Code of Conduct agreement.',
                    'status' => 200
                ], 200);
            }
        } catch(Exception $e) {
            return error_response( trans('messages.error_default'), $e );
        }
    }
}