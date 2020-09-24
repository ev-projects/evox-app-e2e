<?php

namespace App\Modules\Request\Resources;

use App\Modules\User\Resources\UserProfileResource;
use Illuminate\Http\Resources\Json\JsonResource;

use App\Modules\Schedule\Models\Schedule;
use App\Modules\Request\Models\AlterLog;

class RequestResource extends JsonResource
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
            
            foreach($this->resource as $key => $request) {
                switch ($request->table_name) {
                    case 'overtime':
                        $request->column_one = seconds_to_time( $request->column_one );
                      break;
                    case 'rest_day_work':
                        $request->column_one = timestamp_to_datetime( $request->column_one  );
                        $request->column_two = timestamp_to_datetime( $request->column_two );
                      break;
                    case 'change_schedule':
                        $schedule = Schedule::find($request->column_one);
                        
                        if($schedule!=null){
                            # Create Resource for Schedule Policies
                            $schedule_policies = [];
                            foreach( $schedule->schedule_policies()->get() as $schedule_policy){
                                $schedule_policies[ $schedule_policy->policy ] = $schedule_policy->value;
                            }

                            $days = array(  "rest_day" =>  $schedule->rest_days,
                                            "work_days" => get_work_days($schedule->rest_days));

                            $request->column_one =  $days;
                            $request->column_two =  $schedule_policies;
                        }

                      break;
                    case 'alter_log':
                        $alter_log = AlterLog::find($request->column_one);
                        $old_time_logs = array(  "current_time_in" =>  timestamp_to_datetime($alter_log->current_time_in),
                        "current_time_out" => timestamp_to_datetime($alter_log->current_time_out));

                        
                        $new_time_logs = array(  "new_time_in" =>  timestamp_to_datetime($alter_log->new_time_in),
                        "new_time_out" => timestamp_to_datetime($alter_log->new_time_out));
                
                        $request->column_one =  $old_time_logs;
                        $request->column_two =  $new_time_logs;
                   
                      break;
                    default:
                  }
            }



            $result = array(
                $this->resource
            );
        }
        return $result;
    }
}

