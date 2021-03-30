<?php

namespace App\Modules\User\Resources;

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

            if( $array->isRestDay() ){
                $status[] = 'Rest Day';
            }elseif( $array->holidays()->get()->count() > 0 ){
                $status[] = 'Holiday';
            }
            
            if($array->leaves()->get()->count() > 0 ){
                $status[] = 'On-Leave'; 
            }
            elseif( $array->hasSchedule()  ){
                
                $schedule[] = date("h:i:s", $array->start_datetime) .  '-' .date("h:i:s", $array->end_datetime );
                
                if( $array->hasFlexibleSchedule() ){
                    $schedule[] = date("h:i:s", $array->start_flexy_datetime) .  '-' .date("h:i:s", $array->end_flexy_datetime );
                }

                if( !$array->hasLog() ){
                    $status[] = 'No Time Logs';
                }elseif( $array->onTimeLog() ){
                    $status[] = 'Present';
                }else{
                    if( $array->checkLate() ){
                        $status[] = 'Late';
                    }
                    
                    if( $array->checkUndertime() ){
                        $status[] = 'Undertime';
                    }
                }
            }


            if( count($status) > 0){
                array_push( $team_attendance ,
                [
                    "date" => $array->date,
                    "name" => $array->user()->first()->getFullName( 2 ) ,
                    "schedule" =>  $schedule,
                    "status" => $status
                ]);
            }

       }


        return $team_attendance;
    }
}

