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

            # Create Resource for Holidays
            $holidays = [];
            foreach( $this->holidays()->get() as $holiday){
                $holidays[ $holiday->id ] = [
                    'name'  => $holiday->name,
                    'type'  => $holiday->type
                ];
            }

            # Create Resource for Leaves
            $leaves = [];

            # Flag for catching Approved Leaves that would be use later for Attendance Status.
            $has_approved_leave_flag = false;

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

                # If the Leave is Approved and has a Valid amount, Sets the Approved Leave Flag to True.
                if( $leave->isApproved() && $leave->amount > 0 ){
                    $has_approved_leave_flag = true;
                }
            }

            # Setting of Attendance Status of the current DTR. (Default status is Absent)
            $attendance_status = get_constant("ATTENDANCE_STATUS.absent");

            # If has an Approved Leave, set status to On Leave
            if( $has_approved_leave_flag ) {
                $attendance_status = get_constant("ATTENDANCE_STATUS.on_leave");

            # If has a valid time in and out, set status to Present
            } elseif( is_valid( $this->time_in ) && is_valid( $this->time_out ) ) {
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
                    'attendance_status' => $attendance_status
                ), 
                array('holidays' => $holidays),
                array('leaves' => $leaves),
            );
        }
        return $result;
    }
}
