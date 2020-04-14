<?php

namespace App\Modules\Payroll\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class DtrResource extends JsonResource
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

            # Create Resource for Payroll Items
            $payroll_items = [];
            foreach( $this->payroll_items()->get() as $payroll_item){
                $tag = ( $payroll_item->tag == null ) ? get_constant('PAYROLL_ITEM_TAGS.regular') : $payroll_item->tag;
                $payroll_items[ $tag ][ $payroll_item->item ] = seconds_to_time($payroll_item->value, true);
            }

            # Create Resource for Policies
            $policies = [];
            foreach( $this->policies()->get() as $policy){
                $policies[ $policy->policy ] = $policy->value;
            }
            

            # Create Resource for Holidays
            $holidays = [];
            foreach( $this->holidays()->get() as $holiday){
                $holidays[ $holiday->id ] = [
                    'name'  => $holiday->name,
                    'type'  => $holiday->type
                ];
            }


            # Flag for catching Approved Leaves that would be use later for Attendance Status.
            $approved_leave_type = null;

            # Create Resource for Leaves
            $leaves = [];
            foreach( $this->leaves()->get() as $leave){
                $leaves[ $leave->id ] = [
                    'type'  => $leave->type,
                    'status'  => $leave->status,
                    'amount'  => (float) $leave->amount,
                    'note'=> [
                        'employee_note'  => $leave->employee_note,
                        'manager_note'  => $leave->manager_note
                    ]
                ];

                # If the Leave is Approved, a Paid Leave, and has a Valid amount, Sets the Approved Leave Name to get the Slug format of the Leave Type.
                if( $leave->isApproved() && $leave->isPaidLeave() && $leave->amount > 0 ){
                    $approved_leave_type =  $leave->type; 
                }
            }


            # Setting of Attendance Status of the current DTR. (Default status is Absent)
            $attendance_status = get_constant("ATTENDANCE_STATUS.absent");

            # If has an Approved Leave, set status to the parsre-to-slug Leave Type
            if( is_valid( $approved_leave_type ) ) {
                $attendance_status = $approved_leave_type;

            # If has a valid time in and out and has Schedule, set status to Present
            } elseif( $this->hasCompleteTimelogs() && $this->hasSchedule() ) {
                $attendance_status = get_constant("ATTENDANCE_STATUS.present");

            # If set as Rest Day, set status as Rest Day.
            }elseif( $this->is_rest_day ) {
                $attendance_status = get_constant("ATTENDANCE_STATUS.rest_day");
            }

            $result =  array_merge( 
                array(
                    'id' => $this->id,
                    'user_id' => $this->user_id,
                    'date' => $this->date,
                    'time_in' => timestamp_to_datetime( $this->time_in ),
                    'time_out' => timestamp_to_datetime( $this->time_out ),
                    'start_datetime' => timestamp_to_datetime( $this->start_datetime ),
                    'end_datetime' => timestamp_to_datetime( $this->end_datetime ),
                    'end_datetime' => timestamp_to_datetime( $this->end_datetime ),
                    'start_flexy_datetime' => timestamp_to_datetime( $this->start_flexy_datetime ),
                    'end_flexy_datetime' => timestamp_to_datetime( $this->end_flexy_datetime ),
                    'break_time' => seconds_to_time( $this->break_time ),
                    'is_rest_day' => $this->is_rest_day,
                    'source_type_tagging' => $this->source_type_tagging,
                    'attendance_status' => [
                        'name' => $attendance_status,
                        'slug' => parse_to_slug( $attendance_status )
                    ]
                ), 
                array('payroll_items' => $payroll_items),
                array('policies' => $policies),
                array('holidays' => $holidays),
                array('leaves' => $leaves),
            );
        }
        return $result;
    }
}
