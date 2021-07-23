<?php

namespace App\Modules\Report\Resources;

use Carbon\Carbon;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Modules\User\Models\User;
class WeeklyScheduleResources extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function __construct($resource,$show_more,$holiday_list,$user_collection)
    {
        // Ensure you call the parent constructor
        parent::__construct($resource);
        $this->team_schedule = $resource;
        $this->show_more = $show_more;
        $this->holiday_list = $holiday_list;
        $this->user = $user_collection->pluck('id')->toArray();
    }

    public function toArray($request)
    {
        $list = null;
        $list = [];
        $week_list = [];
        $date_list = [];
        $user_list = $this->user;

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
                if( $terminate_date_list[$terminate_date_index] == date("Y-m-d", strtotime($prev_date)) ){
                    $total_no_employee--;
                    $terminate_date_index+=1;
                }
            }
            if($user_per_page > $total_no_employee ){
                $show_more = False;
            }
            
            $date_list[$prev_date] = $show_more;

            $day_index = 0;
            $week_index = 0;
            
            foreach ( $this->team_schedule as $array) {
                $status = $array->getDtrStatus();
                $week_day = date('l',strtotime($array->date)  );
                
                # Update the list of dates and index
                if($prev_date!=$array->date){
                    if(count($user_list)>0){
                        foreach( $user_list as $user_id ){
                            $list[$prev_date][] = [
                                "Name" =>  User::find( $user_id )->getFullName( 3 ),
                                "Schedule" => [],
                                "type" =>  []
                            ];
                        }
                        $user_list = $this->user;
                    }

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

                    $date_list[$prev_date] = $show_more;
                    $day_index += 1;
                }
                $user =  $array->user()->first();
                $user_list = array_diff($user_list,[$user->id]);

                $list[$prev_date][] = [
                    "Name" => $user->getFullName( 3 ),
                    "Schedule" => $array->getStartSchedule(),
                    "type" =>  $status
                ];

                $prev_day = $week_day;
            }

            if(count($user_list)>0){
                foreach( $user_list as $user_id ){
                    $list[$prev_date][] = [
                        "Name" =>  User::find( $user_id )->getFullName( 3 ),
                        "Schedule" => [],
                        "type" =>  []
                    ];
                }
            }
        }

        $holiday_list = [];
        foreach ( $this->holiday_list as $array) {
            $holiday_date =  date("m-d", strtotime($array->date));
            $holiday_list[$holiday_date] = [
                "name" => $array->name,
                "type" => $array->type
            ];
        }

        return array(
            "data" => $list,
            "date_list" => $date_list,
            "holiday_list" => $holiday_list
        );
    }
}
