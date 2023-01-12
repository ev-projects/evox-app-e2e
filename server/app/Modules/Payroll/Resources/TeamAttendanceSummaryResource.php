<?php

namespace App\Modules\Payroll\Resources;

use Carbon\Carbon;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamAttendanceSummaryResource extends JsonResource
{

    public function __construct($resource)
    {
        
        // Ensure you call the parent constructor
        parent::__construct($resource);
        $this->team_attendance_summary = $resource;
        
    }
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request){    
        
        $team_attendance_summary = [];

        foreach ( $this->team_attendance_summary as $dtr) {
            $status = '';
            $schedule = array();
            $has_holiday = false;
            $has_leave = false;
            $has_rest_day_work = false;
            $hours = 0;

       
            if( $dtr->holidays()->get()->count() > 0 ){
                $status = 'Holiday';
                $has_holiday = true;    
            }
            
            $leave = $dtr->leaves()->first();
            
            // If DTR has valid leave, tick the has_leave flag
            if( is_valid( $leave ) && $leave->isApproved() && $leave->amount > 0){
                $status = $dtr->leaves()->get()->first()->type; 
                $has_leave = true;
            }

            // If DTR is rest day and has rest day work, tick the has_rest_day_Work flag
            if( $dtr->isRestDay() && $dtr->source_type_tagging == get_constant('DTR_SOURCE_TYPE_TAGGING.rest_day_work')){
                $status = 'Rest Day Work';
                $has_rest_day_work = true;
            }

            # If There is No Rest Day, Holiday and Leave, check status
            if( !$has_rest_day_work && !$has_holiday && !$has_leave ){

                # Check if there is a schedule for the DTR
                if( $dtr->hasSchedule() ){

                    // If DTR has Log, set status as Present
                    if( $dtr->hasValidTimelogs() ){
                        $status = 'Present';

                    // else, set status as Absent
                    }else {
                        $status = 'Absent';
                        
                        // if inside sched = absent 
                        if($dtr->checkCurrentTime()){
                            $status = 'Absent';
                        }else {
                            $status = 'Not yet started';
                        }
                        // if not blank duty not started yet
                    }
                
                // If the DTR is Rest Day, set status as Rest Day
                }elseif($dtr->isRestDay()){
                    $status = 'Rest Day';

                // else, set as No Schedule
                }else{
                    $status = 'No Schedule';
                }
            
            }

            // Compute for Total Payroll Items for Rendered hours, Overtime w/ Night Diff
            foreach( $dtr->payroll_items()->whereIn('item',[get_constant('PAYROLL_ITEMS.rendered_hours'),
                                                            get_constant('PAYROLL_ITEMS.overtime_night_diff'),
                                                            get_constant('PAYROLL_ITEMS.overtime')])
                                          ->whereNotNull('value')
                                          ->get() as $key => $payroll_item){
                
                // Detect if the Payroll Item is Overtime, set status as Overtime
                if( in_array($payroll_item->item, [get_constant('PAYROLL_ITEMS.overtime_night_diff'), 
                                                   get_constant('PAYROLL_ITEMS.overtime')])){
                    $status = 'Overtime';
                    $hours += $payroll_item->value;

                // Detect if there is a Rest Day Work and if the current item is RDW.
                }elseif( $has_rest_day_work && $payroll_item->item == get_constant('PAYROLL_ITEMS.rendered_hours')  ){
                    $hours += $payroll_item->value;
                }
            }
            
            // Fetch User of the DTR
            $user = $dtr->user()->first();

            // Assemble the array details for the Team Attendance Summary
            array_push( $team_attendance_summary,
            [
                "date" => $dtr->date,
                "user_id" => $user->id,
                "name" => $user->getFullName( 2 ) ,
                "job_title" =>  $user->job_title,
                "schedule" =>  $schedule,
                "hours" => $hours > 0 ? seconds_to_time($hours,true) : null,
                "status" => $status
            ]);

       }


        return $team_attendance_summary;
    }

}

