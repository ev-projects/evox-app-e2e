<?php

namespace App\Modules\Report\Resources;

use Carbon\Carbon;
use Illuminate\Http\Resources\Json\JsonResource;

class DailyScheduleReources extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function __construct($resource,$current_date)
    {
        // Ensure you call the parent constructor
        parent::__construct($resource);
        $this->team_schedule = $resource;

        $this->current_date = $current_date->format('Y-m-d');
        $this->overlapped_current_date = $current_date->addDay()->format('Y-m-d');
    }

    public function toArray($request)
    {
        $list = null;
        $list = [];
        if(count( $this->resource ) > 0 ) {
            foreach ( $this->team_schedule->items() as $array) {
                # Skip the dtr if it doesn't have schedule
                if(!$array->hasSchedule()){
                    continue;
                }
                $tag  = "regular";
                
                $status = $array->getDtrStatus();
                $week_day = date('l',strtotime($array->date)  );

                // Underlapped Schedule
                if(date( 'Y-m-d', $array->start_datetime ) <  $this->current_date ){
                    $tag = "underlapped";
                    $hour =  ($array->end_datetime - strtotime($this->current_date))/3600  ;
                // Overlapped Schedule
                }else if(date( 'Y-m-d  H:i:s', $array->end_datetime ) >  $this->overlapped_current_date ){
                    $tag = "overlapped";
                    $hour =  (strtotime($this->overlapped_current_date) - $array->start_datetime )/3600  ;
                // Regular Schedule
                }else{ 
                    $hour = ($array->end_datetime - $array->start_datetime )/3600 ;
                }

                $list[] = [
                    "Name" => $array->user()->first()->getFullName( 3 ),
                    "on_duty" => date( 'Y-m-d H:i:s', $array->start_datetime ),
                    "off_duty" => date( 'Y-m-d H:i:s', $array->end_datetime ),
                    "day_type" => $tag ,
                    "hour" => $hour,
                    "type" =>  $status
                ];

                $prev_day = $week_day;
            }

        }

        return array(
            "current_page" => $this->team_schedule->currentPage(), 
            "last_page" => $this->team_schedule->lastPage(), 
            "data" => $list,
        );
    }
}
