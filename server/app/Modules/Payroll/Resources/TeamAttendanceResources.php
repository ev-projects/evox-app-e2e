<?php

namespace App\Modules\Payroll\Resources;

use Carbon\Carbon;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamAttendanceResources extends JsonResource
{

    public function __construct($resource)
    {
        // Ensure you call the parent constructor
        parent::__construct($resource);
        $this->team_attendance = $resource;
        
    }
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request){    
        
        $team_attendance = [];
        foreach ( $this->team_attendance as $array) {
            $status = array();
            $schedule = array();
            $rd_holiday_leave = false;
            $isNotRestDayWork = true;
            $values= [];

         
            if( $array->isRestDay() ){
                if( $array->rest_day_work()->where('status','=','approved')->get()->count() > 0 ){
                    $status[] = 'RDW';
                    $isNotRestDayWork = false;
                }else{
                    $status[] = 'Rest Day';
                    $rd_holiday_leave = true;
                }
               
            }

            
            if( $array->holidays()->get()->count() > 0 ){
                $status[] = 'Holiday';
                $rd_holiday_leave = true;
            }
            
            if($array->leaves()->get()->count() > 0 ){
                $status[] = $array->leaves()->get()->first()->type; 
                $rd_holiday_leave = true;
            }
            

            if( $array->hasSchedule() ){
                $schedule[] = date("h:i:s", $array->start_datetime) .  '-' .date("h:i:s", $array->end_datetime );
                if( $array->hasFlexibleSchedule() ){
                    $schedule[] = date("h:i:s", $array->start_flexy_datetime) .  '-' .date("h:i:s", $array->end_flexy_datetime );
                }

                # If There is No Rest Day, Holiday and Leave check status
                if( !$rd_holiday_leave ){

                    # If Not Rest Day Work
                    if( $isNotRestDayWork ) {
                        if( !$array->hasLog() ){
                            $status[] = 'Absent';
                        }elseif( $array->onTimeLog() ){
                            $status[] = 'On Time';
                        }else{

                            if( $array->hasLog() ){
                                $status[] = 'Present';
                            }
                            
                            $payroll_items = [];
                            foreach( $array->payroll_items()->whereIn('item',['late','undertime'])->whereNotNull('value')->get() as  $key => $payroll_item){
                                
                                if(isset($payroll_items[ $payroll_item->item ])){
                                    $payroll_items[ $payroll_item->item ] += $payroll_item->value;
                                }else{
                                    $payroll_items[ $payroll_item->item] = $payroll_item->value;
                                }
                            }
                            
                            # Convert the time to seconds to 00:00:00 format
                            foreach( $payroll_items as  $key => $value){
                                $payroll_items[$key] = seconds_to_time($value,true);
                                $values[ $key ] =$payroll_items[$key] ;
    
                            }

                            if($array->isIncompleteLog()){
                                $status[] = 'Incomplete Logs';
                            }
    
                        }
                    }else{
                        # If Rest Day Work, check absent or have log
                        if( !$array->hasLog() ){
                            $status[] = 'Absent';
                        }elseif( $array->validLog() ){
                            $status[] = 'On Time';
                        }
                    }
                    

                }else{
                    # Check if there is log during RD, Holiday and Leave
                    if( $array->validLog() ){
                        $status[] = 'On Time';
                    }
                }

            }elseif( !$rd_holiday_leave ){
                $status[] = 'No Schedule';

            }

                array_push( $team_attendance ,
                [
                    "date" => $array->date,
                    "name" => $array->user()->first()->getFullName( 2 ) ,
                    "schedule" =>  $schedule,
                    "values" => $values,
                    "status" => $status
                ]);

       }


        return $team_attendance;
    }

    public function onTimeLog($array,$status){
        if( $array->onTimeLog() ){
                $status[] = 'On Time';
        }

        return $status;
    }

}

