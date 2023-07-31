<?php

namespace App\Modules\Payroll\Resources;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Modules\Request\Resources\AlterLogResource;
use App\Modules\Request\Resources\OvertimeResource;
use App\Modules\Request\Resources\RestDayWorkResource;
use App\Modules\Request\Resources\ChangeScheduleResource;

class DtrResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        $result = null;
        
        if( ! is_null( $this->resource ) ) {

            # Create Resource for Payroll Items
            $payroll_items = [];
            // foreach( $this->payroll_items()->get() as  $key => $payroll_item){
                
            //     if(isset($payroll_items[ $payroll_item->item ])){
            //         $payroll_items[ $payroll_item->item ] += $payroll_item->value;
            //     }else{
            //         $payroll_items[ $payroll_item->item] = $payroll_item->value;
            //     }
            // }

            $result = DB::table('drt_summary_report')
            ->select(DB::raw("reg_late as late,reg_undertime as undertime,
            (reg_night_diff + rd_night_diff + sh_night_diff + lh_night_diff + dlh_night_diff + dsh_night_diff + slh_night_diff) + IF(nigdiff_stauts=1,reg_night_diff_overlapp
            + rd_night_diff_overlapp + lh_night_diff_overlapp + sh_night_diff_overlapp + dlh_night_diff_overlapp + dsh_night_diff_overlapp + slh_night_diff_overlapp,0) as night_diff,
            (reg_overtime + rd_overtime + sh_overtime + lh_overtime + dlh_overtime + dsh_overtime + slh_overtime)  as overtime,
            (reg_overtime_night_diff + rd_overtime_night_diff + sh_overtime_night_diff + lh_overtime_night_diff + dlh_overtime_night_diff + dsh_overtime_night_diff + slh_overtime_night_diff)  as overtime_night_diff"))
                ->where('login_date', '=' , $this->resource->date )
                ->where('user_id','=',$this->resource->user_id)->get();

            # Convert the time to seconds to 00:00:00 format
            // foreach( $payroll_items as  $key => $value){
            //     $payroll_items[$key] = seconds_to_time($value,true);
            // }
            foreach($result as  $key => $value){
                $payroll_items["late"] = $value->late > 0 ? seconds_to_time(round($value->late * 3600),true):"";
                $payroll_items["undertime"] = $value->undertime > 0 ? seconds_to_time(round($value->undertime * 3600),true):"";
                $payroll_items["overtime"] = $value->overtime > 0 ? seconds_to_time(round($value->overtime * 3600),true):"";
                $payroll_items["overtime_night_diff"] = $value->overtime_night_diff > 0 ? seconds_to_time(round($value->overtime_night_diff * 3600),true):"";
                $payroll_items["night_diff"] = $value->night_diff > 0 ? seconds_to_time(round($value->night_diff * 3600),true):"";
            }
            
            # Create Resource for Policies
            $policies = [];
            foreach( $this->policies()->get() as $policy){
                $policies[ $policy->policy ] = $policy->value;
            }
            
            # Flag for catching Approved Leaves that would be use later for Attendance Status.
            $approved_leave_type = null;

            # Create Resource for Leaves
            $leaves = [];
            foreach( $this->leaves()->get() as $leave){
                $leaves[ $leave->id ] = [
                    'type'  => $leave->type,
                    'status'  => $leave->status,
                    'amount'  => (float) $leave->amount,
                    'note'=> [
                        'employee_note'  => $leave->employee_note,
                        'manager_note'  => $leave->manager_note
                    ]
                ];

                # If the Leave is Approved, a Paid Leave, and has a Valid amount, Sets the Approved Leave Name to get the Slug format of the Leave Type.
                if( $leave->isApproved() && $leave->isPaidLeave() && $leave->amount > 0 ){
                    $approved_leave_type =  $leave->type; 
                }
            }


            $attendance_status = '';

            # Check if absent
            if( $this->isAbsent() ){
                $attendance_status = get_constant("ATTENDANCE_STATUS.absent");

            }elseif( $this->onLeave()->get()->count() > 0 ) {
                $attendance_status = $approved_leave_type;

            } elseif( $this->is_rest_day ) {
                $attendance_status = get_constant("ATTENDANCE_STATUS.rest_day");

            }   elseif( $this->hasCompleteTimelogs() /*&& $this->hasSchedule()*/ ) {
                $attendance_status = get_constant("ATTENDANCE_STATUS.present");

            } 

            # Create Resource for Holidays
            $holidays = [];
            foreach( $this->holidays()->get() as $holiday){
                $holidays[ $holiday->id ] = [
                    'name'  => $holiday->name,
                    'type'  => $holiday->type
                ];
            }

            # Create Resource for Requests
            $requests = [];
            foreach( $this->alter_log()->get() as $alter_log){
                $requests[] = new AlterLogResource( $alter_log );
            }
            foreach( $this->change_schedule()->get() as $change_schedule){
                $requests[] = new ChangeScheduleResource( $change_schedule );
            }
            foreach( $this->overtime()->get() as $overtime){
                $requests[] = new OvertimeResource( $overtime );
            }
            foreach( $this->rest_day_work()->get() as $rest_day_work){
                $requests[] = new RestDayWorkResource( $rest_day_work );
            }

            // foreach( $this->work_from_home()->get() as $work_from_home){
            //     $requests[] = new WorkFromHomeResource( $work_from_home );
            // }

            $now = Carbon::now()->timestamp;

            
      
            $is_within_time = false;
            $is_within_time_extended = false;
            $checked_end_time =  $this->end_datetime;
            if($this->end_flexy_datetime != null){
                $checked_end_time =  $this->end_flexy_datetime;
            }
            if($this->is_rest_day == 0){
                $is_within_time = Carbon::now()->timestamp > ($this->start_datetime - 7200) && Carbon::now()->timestamp < ($checked_end_time +  10800) && $this->is_rest_day == 0 ;
                $is_within_time_extended = Carbon::now()->timestamp > ($this->start_datetime - 7200) && Carbon::now()->timestamp < ($checked_end_time +  21600) && $this->is_rest_day == 0 ;
            }



            // $on_multiple_log = false;
            // $dtr_history = [];
            // if($this->use_schedule == false && $this->use_logs == true){
            //     // $is_within_time = true;
            //     // $is_within_time_extended = true;

            //     $on_multiple_log = true;

            //     $recent_log = $this->get_dtr_history()->latest()->first();

                
            //     $this->time_in =  $recent_log ? $recent_log->time_in : null;
            //     $this->time_out = $recent_log ? $recent_log->time_out : null;

            //     foreach ($this->get_dtr_history()->get() as $history) {
            //         $dtr_history[] = array(
            //                                     'id' => $history->id,
            //                                     'time_in' => timestamp_to_datetime( $history->time_in ),
            //                                     'time_out' =>timestamp_to_datetime( $history->time_out ),
            //                                     'hours' => seconds_to_time( ($history->time_in - ($history->time_out != null?$history->time_out: 0  )),true)
            //                                 );
            //     }
            //     // dump($dtr_history);
               
            // }

            $owner = $this->user()->first();
            $result =  array_merge( 
                array(
                    'id' => $this->id,
                    'user_id' => $this->user_id,
                    'date' => $this->date,
                    'time_in' => timestamp_to_datetime( $this->time_in ),
                    'time_out' => timestamp_to_datetime( $this->time_out ),
                    'start_datetime' => timestamp_to_datetime( $this->start_datetime ),
                    'end_datetime' => timestamp_to_datetime( $this->end_datetime ),
                    'start_flexy_datetime' => timestamp_to_datetime( $this->start_flexy_datetime ),
                    'end_flexy_datetime' => timestamp_to_datetime( $this->end_flexy_datetime ),
                    'break_time' => seconds_to_time( $this->break_time ),
                    'is_rest_day' => $this->is_rest_day,
                    'source_type_tagging' => $this->source_type_tagging,
                    'attendance_status' => [
                        'name' => $attendance_status,
                        'slug' => text_to_slug( $attendance_status )
                    ],

                    'with_in_time' => $is_within_time,
                    'with_in_time_extended' => $is_within_time_extended,
                    // 'on_multiple_login' => $on_multiple_log,
                    // 'dtr_history' => $dtr_history,
                    // 'timezone' =>  $owner->country_zone()->country_time_zone,
                ), 
                array('payroll_items' => $payroll_items),
                array('policies' => $policies),
                array('holidays' => $holidays),
                array('leaves' => $leaves),
                array('requests' => $requests),
                array('owner_POV' => [

                    'time_in' => timestamp_to_datetime( $this->time_in , true ,  $owner),
                    'time_out' => timestamp_to_datetime( $this->time_out , true ,  $owner),
                    'start_datetime' => timestamp_to_datetime( $this->start_datetime , true ,  $owner),
                    'end_datetime' => timestamp_to_datetime( $this->end_datetime , true ,  $owner),
                    'end_datetime' => timestamp_to_datetime( $this->end_datetime , true ,  $owner),
                    'start_flexy_datetime' => timestamp_to_datetime( $this->start_flexy_datetime , true ,  $owner),
                    'end_flexy_datetime' => timestamp_to_datetime( $this->end_flexy_datetime , true ,  $owner),
                ]),

                array('raw_time' => [
                    'start_datetime' =>  $this->start_datetime , true ,
                    'end_datetime' =>  $this->end_datetime , true ,
                    // 'start_flexy_datetime' => timestamp_to_datetime( $this->start_flexy_datetime , true ,  $owner),
                    // 'end_flexy_datetime' => timestamp_to_datetime( $this->end_flexy_datetime , true ,  $owner),
                ])
            );
        }
        return $result;
    }
}
