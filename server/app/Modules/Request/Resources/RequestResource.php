<?php

namespace App\Modules\Request\Resources;

use App\Modules\User\Resources\UserProfileResource;
use Illuminate\Http\Resources\Json\JsonResource;

use App\Modules\Schedule\Models\Schedule;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\AlterLogPunch;
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
            
            foreach($this->resource['query'] as $key => $request) {
                switch ($request->table_name) {
                    case 'overtimes':
                        // $request->fourth_column = seconds_to_time( $request->fourth_column );
                        $request->fifth_column = slug_to_text( $request->fifth_column );
                      break;
                    case 'rest_day_works':
                      // $from =  strtotime($request->date_requested) + $request->fourth_column  ;
                      // $to = strtotime($request->date_requested) + $request->fifth_column  ;
                      $from =  $request->fourth_column  ;
                      $to = $request->fifth_column  ;

                      # Update the date if date from is greater than date to
                      if($from>$to){
                        $to += get_constant("TIMESTAMP.day");
                      }

                        // $request->fourth_column =timestamp_to_datetime( $from );
                        // $request->fifth_column =  timestamp_to_datetime( $to );

                      break;
                    case 'change_schedules':
                        $schedule = Schedule::find($request->fourth_column);
                        
                        if($schedule!=null){
                            # Create Resource for Schedule Policies
                            $schedule_policies = [];
                            foreach( $schedule->schedule_policies()->get() as $schedule_policy){
                                $schedule_policies[ $schedule_policy->policy ] = $schedule_policy->value;
                            }

                            $days = array(  "rest_day" =>  $schedule->rest_days,
                                            "work_days" => get_work_days($schedule->rest_days));

                            $request->fourth_column =  $days;
                            $request->fifth_column =  $schedule_policies;
                        } else {
                          $request->fourth_column = json_decode($request->fourth_column, true);
                          $request->fifth_column = json_decode($request->fifth_column, true);
                        }

                      break;
                      case 'alter_log_punches':

                      
                          $alter_log_punch = AlterLogPunch::find($request->fourth_column);
                          if ($alter_log_punch) {
                            // dump($alter_log_punch, json_decode($alter_log_punch->old_punch));
                            $old_time_logs = json_decode($alter_log_punch->old_punch);

                                                  $result = [];
                                                  foreach ($old_time_logs as $key => $value)
                                                  {
                                                      $result[$key] =   ($key+1).".[".timestamp_to_datetime_small($value->time_in)."|".timestamp_to_datetime_small($value->time_out)."]  " ;
                                                  }
                                                  // $new_time_logs = array(   "new_time_in" =>  $alter_log_punch->new_punch,
                              $new_time_logs =  json_decode($alter_log_punch->new_punch);

                                                  $result1 = [];
                                                  foreach ($new_time_logs as $key => $value)
                                                  {

                                                      $result1[$key] = ($key+1).".[".timestamp_to_datetime_small($value->start_time) . "|".timestamp_to_datetime_small($value->end_time)."]  ";
                                                  }

                            $request->fourth_column =  $result;
                            $request->fifth_column =  $result1;
                          }
  

                      break;
                    case 'alter_logs':
                        // $alter_log = AlterLog::find($request->fourth_column);
                        $alter_log = $request->fourth_column ? AlterLog::find($request->fourth_column) : AlterLog::find($request->id);
                        $old_time_logs = array(   "current_time_in" =>  timestamp_to_datetime($alter_log->current_time_in),
                                                  "current_time_out" => timestamp_to_datetime($alter_log->current_time_out));

                        
                        $new_time_logs = array(   "new_time_in" =>  timestamp_to_datetime($alter_log->new_time_in),
                                                  "new_time_out" => timestamp_to_datetime($alter_log->new_time_out));
                
                        $request->fourth_column =  $old_time_logs;
                        $request->fifth_column =  $new_time_logs;
                   
                      break;
                    default:
                  }
                  $request->status = ucfirst($request->status);
            }



            $result = array(
                'result' => $this->resource['query']
            );
        }
        return $result;
    }
}

