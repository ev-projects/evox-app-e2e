<?php

namespace App\Modules\Payroll\Resources;

use Carbon\Carbon;
use Illuminate\Http\Resources\Json\JsonResource;

class MyDtrNotificationsResource extends JsonResource
{

    public function __construct($resource)
    {
        // Ensure you call the parent constructor
        parent::__construct($resource);
        $this->my_dtr_notifications = $resource;
        
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
            $details = "";

            
            // Group the Payroll Items and compute the total on the payroll_items array.
            $payroll_items = [];
            foreach( $dtr->payroll_items()->get() as  $key => $payroll_item){
                
                if(isset($payroll_items[ $payroll_item->item ])){
                    $payroll_items[ $payroll_item->item ] += $payroll_item->value;
                }else{
                    $payroll_items[ $payroll_item->item] = $payroll_item->value;
                }
            }
            
            // Fetch the leave connected to the DTR.
            $leave = $dtr->leaves()->first();
            
            // Fetch the DTR type 
            $dtr_type = $dtr->getDtrType();

            // If the DTR has Schedule
            if( $dtr->hasSchedule() ){

                // If the DTR has Complete Time In and Time Out Logs
                if( $dtr->hasCompleteTimelogs() ) {

                    // Check if there is an existing computed for Late and Undertime
                    if( isset( $payroll_items['late'] ) && is_valid( $payroll_items['late'] ) &&
                        isset( $payroll_items['undertime'] ) && is_valid( $payroll_items['undertime'] ) ) {
                        $status = "Late & Undertime";
                        $details = seconds_to_time($payroll_items['late'],true) . " & " . seconds_to_time($payroll_items['undertime'],true);

                    // Check if there is an existing computed for Late
                    } elseif( isset( $payroll_items['late'] ) && is_valid( $payroll_items['late'] ) ) {
                        $status = "Late";
                        $details = seconds_to_time($payroll_items['late'],true);

                    // Check if there is an existing computed for Undertime
                    } elseif( isset( $payroll_items['undertime'] ) && is_valid( $payroll_items['undertime'] ) ) {
                        $status = "Undertime";
                        $details = seconds_to_time($payroll_items['undertime'],true);
                    }
                    
                // If the DTR has no Complete Time In and Time Out Logs
                } else {
                    
                    // If the DTR Type is Regular ( Not Rest Day or Holiday ) OR if the DTR Source Type tagging is "Rest Day Work"
                    if( $dtr_type == get_constant('DTR_TYPE.regular') || $dtr->source_type_tagging == "rest_day_work" ){

                        // If the DTR Type is Regular, set the status to "Absent"
                        if( $dtr_type == get_constant('DTR_TYPE.regular') ) {
                            $status = "Absent";

                        // If the DTR Source Type Tagging is Rest Day Work, set the status to "RDW Incomplete"
                        } elseif( $dtr->source_type_tagging == "rest_day_work" ) {
                            $status = "RDW Incomplete";
                        }
                        
                        // If there is an existing leave and it is "Unpaid Leave" OR If its any other leave type and the status is still "requested"
                        if( is_valid( $leave ) && ($leave->type == 'Unpaid Leave' ||  $leave->status == "requested"   )) {
                            $details = $leave->type . " - " . ( $leave->status == "requested" ? "Pending" : $leave->status);

                        // If there is an existing leave and its status is "approved", Just set the $details as empty ( so it wouldnt be included on the list )
                        }elseif( is_valid( $leave ) && $leave->status == "approved"  ) {
                            $details = "";

                        // If DTR has no clock out
                        }elseif( is_valid( $dtr->time_in ) && !is_valid( $dtr->time_out ) ){
                            $details = "No clock out";

                        // If DTR has no clock in
                        }elseif( !is_valid( $dtr->time_in ) && is_valid( $dtr->time_out ) ){
                            $details = "No clock in";

                        // If DTR has no time logs
                        }elseif( !is_valid( $dtr->time_in ) && !is_valid( $dtr->time_out ) ){
                            $details = "No timelogs";
                        }
                    }
                }
                
            // If the DTR has NO Schedule
            } else {
                $status = "No Schedule";
                $details = "";
            }

            // If the $status & $details are valid ( not "" ), add it on the final list. 
            if( is_valid( $status ) && is_valid( $details ) ){
                array_push( $array, 
                [
                    'date' => Carbon::parse( $dtr->date )->format("Y-m-d"),
                    'status' => $status,
                    'details' => $details
                ]);
            }
        }

        return $array;
    }

}

