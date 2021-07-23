<?php

namespace App\Modules\Report\Resources;

use Carbon\Carbon;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Modules\User\Models\User;
class TeamScheduleResources extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function __construct($resource,$show_more,$holiday_list, $user_collection)
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
        $date_list = [];
        $list = [];
        $week_list = [];
        $user_list = $this->user;

  
        //  THESE VARIABLE IS FOR SHOW MORE
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

            
            $week_start = date('l',strtotime($prev_date));
            $prev_day = $week_start;
            
            foreach ( $this->team_schedule as $array) {
                $status = $array->getDtrStatus();
                $week_day = date('l',strtotime($array->date)  );
                
                # This condition for updating date in the loop for indexing
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

                    # This line is for the show more
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
                }

                # Updating the week
                if($prev_day == "Sunday" && $week_day=="Monday"){
                    $week_list[] =  array( $week_start , $prev_day ) ;
                    $week_start = $week_day;
                }

                $user =  $array->user()->first();
                $user_list = array_diff($user_list,[$user->id]);

                $list[$prev_date][] = [
                    "Name" =>  $user->getFullName( 3 ),
                    "Schedule" => $array->getStartSchedule(),
                    "type" =>  $status
                ];

                $prev_day = $week_day;
            }
            
            $week_list[] = array( $week_start ,  $week_day ) ;

            // Check if there is employe where there is no generated info
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
            "week_list" => $week_list,
            "holiday_list" => $holiday_list
        );
    }
}
