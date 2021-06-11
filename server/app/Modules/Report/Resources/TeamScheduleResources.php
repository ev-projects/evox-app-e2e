<?php

namespace App\Modules\Report\Resources;

use Carbon\Carbon;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamScheduleResources extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function __construct($resource)
    {
        // Ensure you call the parent constructor
        parent::__construct($resource);
        $this->team_schedule = $resource;
        
    }

    public function toArray($request)
    {
        $list = null;
        $date_list = [];
        $list = [];
        $week_list = [];
        if(count( $this->resource ) > 0 ) {
            $prev_date = $this->resource[0]->date;
            $date_list[] =  date("M,d", strtotime($prev_date));

            $day_index = 0;
            $week_index = 0;
            
            $week_start = date('l',strtotime($prev_date));
            $prev_day = $week_start;
            
            foreach ( $this->team_schedule as $array) {
                $status = [];
                $isRestDayHolidayLeave = false;
                $week_day = date('l',strtotime($array->date)  );
                if( $array->isRestDay() ){
                    if( $array->rest_day_work()->where('status','=','approved')->get()->count() > 0 ){
                        $status[] = 'rest_day_work';
                    }else{
                        $status[] = 'rest_day';
                        $isRestDayHolidayLeave = true;
                    }
                }
    
                if( $array->holidays()->get()->count() > 0 ){
                    $status[] = 'holiday';
                    $isRestDayHolidayLeave = true;
                }
                
                if($array->onLeave()->get()->count() > 0  ){
                    $status[] = "on_leave"; 
                    $isRestDayHolidayLeave = true;
                }
    
                if( $array->hasSchedule() ){
                    if( !$isRestDayHolidayLeave ){
                        if( $array->isAbsent() ){
                            $status[] = 'absent';
                        }elseif( $array->isOntime() ){
                            $status[] = 'early';
                        }else{
                            $status[] = 'late';
                        }
                    }
                }elseif( !$isRestDayHolidayLeave ){
                    $status[] = 'no_schedule';
                }

                # Update the list of dates and index
                if($prev_date!=$array->date){
                    $prev_date =$array->date;
                    $date_list[] = date("M d", strtotime($prev_date));
                    $day_index += 1;
                }

                if($prev_day == "Saturday" && $week_day=="Sunday"){
                    $week_list[] =  array( $week_start , $prev_day ) ;
                    $week_start = $week_day;
                    $week_index += 1;
                }

                
                $list[$week_index][$day_index][$array->user_id] = [
                    "Name" => $array->user()->first()->getFullName( 3 ),
                    "Schedule" => $array->getSchedule(),
                    "type" =>  $status
                ];

                $prev_day = $week_day;
            }
            //  Append the last iterated week
            $week_list[] = array( $week_start ,  $week_day ) ;

        }



        return array(
            "data" => $list,
            "date_list" => $date_list,
            "week_list" => $week_list
        );
    }
}
