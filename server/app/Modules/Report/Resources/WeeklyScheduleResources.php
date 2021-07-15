<?php

namespace App\Modules\Report\Resources;

use Carbon\Carbon;
use Illuminate\Http\Resources\Json\JsonResource;

class WeeklyScheduleResources extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function __construct($resource,$show_more)
    {
        // Ensure you call the parent constructor
        parent::__construct($resource);
        $this->team_schedule = $resource;
        $this->show_more = $show_more;
    }

    public function toArray($request)
    {
        $list = null;
        $date_list = [];
        $list = [];
        $week_list = [];

        
        $user_per_page = get_constant("TEAM_SCHEDULE.records_per_date");
        $total_no_employee = $this->show_more["number_of_employee"];
        $terminate_date_list = $this->show_more["termination_date_list"];
        $terminate_date_index = 0;
        $show_more = false;
        if($user_per_page < $total_no_employee ){
            $show_more = True;
        }

        if(count( $this->resource ) > 0 ) {

            $prev_date = $this->resource[0]->date;

            if(count($terminate_date_list) > 0){
                if( $terminate_date_list[$terminate_date_index]== date("Y-m-d", strtotime($prev_date)) ){
                    $total_no_employee--;
                    $terminate_date_index+=1;
                }
            }
            if($user_per_page > $total_no_employee ){
                $show_more = False;
            }

            
            $date_list[] = array( 
                "date" => date("Y-m-d", strtotime($prev_date)),
                "show_more" => $show_more,
            );


            $day_index = 0;
            $week_index = 0;
            
            foreach ( $this->team_schedule as $array) {
                $status = $array->getDtrStatus();
                $week_day = date('l',strtotime($array->date)  );
                
                # Update the list of dates and index
                if($prev_date!=$array->date){
                    $prev_date =$array->date;
                    if(count($terminate_date_list) > 0 && isset($terminate_date_list[$terminate_date_index])){
                        if( $terminate_date_list[$terminate_date_index]== date("Y-m-d", strtotime($prev_date)) ){
                            $total_no_employee--;
                            $terminate_date_index++;
                        }
                    }
                    if($user_per_page >= $total_no_employee ){
                        $show_more = False;
                    }

                    
                    $date_list[] = array( 
                        "date" => date("Y-m-d", strtotime($prev_date)),
                        "show_more" => $show_more,
                    );
                    $day_index += 1;
                }
                
                $list[$day_index][$array->user_id] = [
                    "Name" => $array->user()->first()->getFullName( 3 ),
                    "Schedule" => $array->getSchedule(),
                    "type" =>  $status
                ];

                $prev_day = $week_day;
            }
        }



        return array(
            "data" => $list,
            "date_list" => $date_list,
            "show_more" => $this->show_more,
        );
    }
}
