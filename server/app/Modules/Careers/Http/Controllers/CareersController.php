<?php

namespace App\Modules\Careers\Http\Controllers;

use Illuminate\Http\Request;
use App\Modules\Careers\Models\Careers;
use App\Http\Controllers\Controller;
use App\Modules\User\Models\UtcTimelog;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class CareersController extends Controller
{
    public function index()
    {
        $careers_list = Careers::get();
        if ($careers_list && count($careers_list) > 0) {
            foreach ($careers_list as $value) {
                if ($value->country == 2) {
                    $careers['PHL'][] = $value->toArray();
                } else if ($value->country == 1) {
                    $careers['IND'][] = $value->toArray();
                } else if ($value->country == 3) {
                    $careers['BGR'][] = $value->toArray();
                }
            }            
        }

        return success_response(
            trans('messages.fetch_careers_success'), 
            $careers,
            JsonResponse::HTTP_OK,
        );
    }

    /**
     * Import job openings
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        DB::beginTransaction();
        try {
            log_activity( trans('messages.import_careers_attempt') );

            // get utc timelogs
            $timelogs = UtcTimelog::get();
            $timelog_arr = [];
            foreach ($timelogs as $timelog) {
                $timelog_arr[$timelog->id] = $timelog->alpha_three;
            }

            // clear current list of careers 
            Careers::truncate();

            // set all values before saving
            $jobs = json_decode($request->parsedJobs, true);
            $date = Carbon::now();
            $data = [];
            foreach ($jobs as $value) {
                if ($value[0] != '' && $value[1] != '' && $value[3] != '') {
                    $data[] = [
                        'title'         => $value[0],
                        'link'          => $value[1],
                        'category'      => $value[2],
                        'country'       => array_search($value[3], $timelog_arr),
                        'created_at'    => $date,
                        'updated_at'    => $date,
                    ];
                }
            }
            Careers::insert($data);

            DB::commit();
            return success_response(
                trans('messages.import_careers_success')
            );

        } catch(Exception $e){
            DB::rollback();
            return error_response( trans('messages.error_default'), $e );
        }   
    }
}
