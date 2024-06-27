<?php

namespace App\Modules\Payroll\Resources;

use Carbon\Carbon;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Modules\Request\Resources\AlterLogResource;
use Illuminate\Support\Facades\DB;
class MyDtrNotificationsResource extends JsonResource
{

    private $my_dtr_notifications = [];
    private $dtr_leaves = [];
    private $dtr_requests = [];
    public function __construct($resource)
    {
        // Ensure you call the parent constructor
        parent::__construct($resource);
        $this->my_dtr_notifications = $resource[0];
        $this->dtr_leaves = $resource[1];
        $this->dtr_requests = $resource[2];
    }
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request){    
        
        $array = [];
        foreach ( $this->my_dtr_notifications as $dtr ) {
            
            // Declare the 2 variables to be needed for this iteration
            $status = "";
            if ($dtr->attendance_status == 'Absent') $status = $dtr->attendance_status;
            $details = "";
            $late = floatval($dtr->late);
            $undertime = floatval($dtr->undertime);

            // If the DTR has Complete Time In and Time Out Logs
            if( $dtr->time_in && $dtr->time_out ) {
                // Check if there is an existing computed for Late and Undertime
                 if($late > 0 && $undertime > 0){
                    $status = "Late & Undertime";
                     $details = seconds_to_time(round($late * 3600),true) . " & " . seconds_to_time(round($undertime * 3600),true);
                 // Check if there is an existing computed for Late
                 }else if($late > 0){
                     $status = "Late";
                     $details = seconds_to_time(round($late * 3600),true);
                 // Check if there is an existing computed for Undertime
                 }else if($undertime > 0){
                     $status = "Undertime";
                     $details = seconds_to_time(round($undertime * 3600),true);
                 }
                 
             // If the DTR has no Complete Time In and Time Out Logs
             } else {
                 
                /* // If the DTR Type is Regular, set the status to "Absent"
                 if( $dtr_type == get_constant('DTR_TYPE.regular') ) {
                    $status = "Absent";

                // If the DTR Source Type Tagging is Rest Day Work, set the status to "RDW Incomplete"
                } elseif( $dtr->source_type_tagging == "rest_day_work" ) {
                    $status = "RDW Incomplete";
                }*/

                // If DTR has no clock out
                if ( is_valid( $dtr->time_in ) && !is_valid( $dtr->time_out ) ){
                    $details = "No clock out";

                // If DTR has no clock in
                } elseif ( !is_valid( $dtr->time_in ) && is_valid( $dtr->time_out ) ){
                    $details = "No clock in";

                // If DTR has no time logs
                } elseif ( !is_valid( $dtr->time_in ) && !is_valid( $dtr->time_out ) ){
                    $details = "No timelogs";
                }

                foreach( $this->dtr_leaves as $leave) {
                    if ($dtr->dtr_id == $leave->dtr_id) {
                        if ($leave->status == "requested") {
                            $details = $leave->type . " - " . ( $leave->status == "requested" ? "Pending" : $leave->status);
                        } elseif ($leave->status == "approved") {
                            $details = "";
                        }
                    }
                }
             }
          
            // If the $status & $details are valid ( not "" ), add it on the final list. 
            if( is_valid( $status ) && is_valid( $details ) ){
                $requests = [];
                /*foreach( $dtr->alter_log()->get() as $alter_log){
                    $requests[] = new AlterLogResource( $alter_log );
                }*/
                foreach ($this->dtr_requests as $dtr_request) {
                    if ($dtr->dtr_id == $dtr_request->dtr_id) {
                        $requests[] = [
                            'id' => $dtr_request->id,
                            'request_type'  => $dtr_request->type,
                            'status'  => $dtr_request->status
                        ];
                    }
                }
                array_push( $array, 
                [
                    'date' => Carbon::parse( $dtr->date )->format("Y-m-d"),
                    'status' => $status,
                    'details' => $details,
                    'time_in' => timestamp_to_datetime( $dtr->time_in ),
                    'time_out' => timestamp_to_datetime( $dtr->time_out ),
                    'start_datetime' => timestamp_to_datetime( $dtr->start_datetime ),
                    'end_datetime' => timestamp_to_datetime( $dtr->end_datetime ),
                    'start_flexy_datetime' => timestamp_to_datetime( $dtr->start_flexy_datetime ),
                    'end_flexy_datetime' => timestamp_to_datetime( $dtr->end_flexy_datetime ),
                    'break_time' => seconds_to_time( $dtr->break_time ),
                    'requests' => $requests
                ]);
            }
        }

        return $array;
    }

}

