<?php

namespace App\Modules\Opsschedule\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Opsschedule\Models\OpsSchedule;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Exception;

class OpsScheduleController extends Controller
{
    public function getList($dept_id = null)
    {
        // get ops department list from constants
        $ops_depts = config('constants.OPS_DEPTS');
        
        // get ops schedules list from ops_schedules table
        if ($dept_id) {
            $ops_sched_list = OpsSchedule::where('department_id', $dept_id)->get();
        } else {
            $ops_sched_list = OpsSchedule::get();
        }

        $ops_sched_list_arr = [];
        foreach ($ops_sched_list as $key => $value) {
            // fields formatting
            $item = $value->toArray();
            $arr_key = array_search($item['department_id'], array_column($ops_depts, 'id'));
            $item['department'] = $ops_depts[$arr_key]['name'];

            $work_days = explode(',', $item['work_days']);
            $item['work_days'] = ucfirst(reset($work_days)) . ' - ' . ucfirst(end($work_days));

            $scopes = explode(',', $item['scope']);
            $item['scope'] = $scopes;

            $item['start_time'] = date('ga', $item['start_time']);
            $item['end_time'] = date('ga', $item['end_time']);

            $ops_sched_list_arr[$key] = $item;
        }

        return success_response(
            trans('messages.fetch_ops_schedules_success'), 
            $ops_sched_list_arr,
            JsonResponse::HTTP_OK
        );
    }

    public function get()
    {
        // get ops department list from constants
        $ops_depts = config('constants.OPS_DEPTS');

        // loop through each department and get all ops schedule per department
        $ops_scheds = [];
        foreach ($ops_depts as $key => $value) {
            $list_per_dept = OpsSchedule::where('department_id', $value['id'])->get();
            if (count($list_per_dept)) {
                $ops_scheds[$key]['department'] = $value['name'];
                $ops_scheds[$key]['description'] = $value['description'];

                $list = $list_per_dept->toArray();
                foreach ($list as $key2 => $value2) {
                    // fields formatting
                    $work_days = explode(',', $value2['work_days']);
                    $list[$key2]['work_days'] = ucfirst(reset($work_days)) . ' - ' . ucfirst(end($work_days));
                    
                    $scopes = explode(',', $value2['scope']);
                    $list[$key2]['scope'] = $scopes;

                    $list[$key2]['start_time'] = date('ga', $value2['start_time']);
                    $list[$key2]['end_time'] = date('ga', $value2['end_time']);
                    $ops_scheds[$key]['list'] = $list;
                }
            } 
        }
        $ops_scheds = array_values($ops_scheds);

        return success_response(
            trans('messages.fetch_ops_schedules_success'), 
            $ops_scheds,
            JsonResponse::HTTP_OK
        );
    }

    public function show($ops_sched_id = null)
    {
        // get ops schedule instance using id from ops_schedules table
        $ops_sched = OpsSchedule::find($ops_sched_id)->toArray();
        $ops_sched['start_time'] = date('H:i', $ops_sched['start_time']);
        $ops_sched['end_time'] = date('H:i', $ops_sched['end_time']);

        $work_days = explode(',', $ops_sched['work_days']);
        foreach ($work_days as $value) {
            $ops_sched[$value] = true;
        }
        
        return success_response(
            trans('messages.fetch_ops_schedule_success'), 
            $ops_sched,
            JsonResponse::HTTP_OK
        );
    }

    public function store(Request $request)
    {
        DB::beginTransaction();
        try {
            // get all checked working days
            $work_days = null;
            $days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
            foreach ($days as $day) {
                if ($request->$day && $request->$day != "false") {
                    $work_days .= $day . ',';
                }
            }

            // convert time selected to seconds
            $start_time = explode(" ", $request->start_time);
            $new_start_time = strtotime("1970-01-01 " . $start_time[4] . " UTC");
            
            $end_time = explode(" ", $request->end_time);
            $new_end_time = strtotime("1970-01-01 " . $end_time[4] . " UTC");

            // build list of data to be inserted in ops_schedules table
            $data = [
                'department_id' => $request->department,
                'name'          => $request->name,
                'position'      => $request->position,
                'email'         => $request->email,
                'domain'        => $request->domain ?? '',
                'scope'         => $request->scope ?? '',
                'work_days'     => rtrim($work_days, ','),
                'start_time'    => $new_start_time,
                'end_time'      => $new_end_time,
                'timezone'      => $request->timezone,
            ];

            $new_ops_sched = OpsSchedule::create($data);
            DB::commit();

            return success_response(
                trans('messages.create_ops_schedule_success'), 
                $new_ops_sched,
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            DB::rollback();
            log_error($e);
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function update(Request $request, $ops_sched_id = null)
    {
        DB::beginTransaction();
        try {
            // get all checked working days
            $work_days = null;
            $days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
            foreach ($days as $day) {
                if ($request->$day && $request->$day != "false") {
                    $work_days .= $day . ',';
                }
            }

            // convert time selected to seconds
            $start_time = explode(" ", $request->start_time);
            $new_start_time = strtotime("1970-01-01 " . $start_time[4] . " UTC");
            
            $end_time = explode(" ", $request->end_time);
            $new_end_time = strtotime("1970-01-01 " . $end_time[4] . " UTC");

            // build list of data to be inserted in ops_schedules table
            $data = [
                'department_id' => $request->department,
                'name'          => $request->name,
                'position'      => $request->position,
                'email'         => $request->email,
                'domain'        => $request->domain ?? '',
                'scope'         => $request->scope ?? '',
                'work_days'     => rtrim($work_days, ','),
                'start_time'    => $new_start_time,
                'end_time'      => $new_end_time,
                'timezone'      => $request->timezone,
            ];

            $updated_ops_sched = OpsSchedule::where('id', $ops_sched_id)->update($data);
            DB::commit();

            return success_response(
                trans('messages.update_ops_schedule_success'), 
                $updated_ops_sched,
            );
        } catch(Exception $e){
            DB::rollback();
            log_error($e);
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function delete($ops_sched_id = null)
    {
        DB::beginTransaction();
        try {
            $ops_sched = OpsSchedule::find($ops_sched_id);
            $ops_sched->delete();
            DB::commit();

            return success_response(
                trans('messages.delete_ops_schedule_success'), 
                $ops_sched
            );
        } catch(Exception $e){
            DB::rollback();
            log_error($e);
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
