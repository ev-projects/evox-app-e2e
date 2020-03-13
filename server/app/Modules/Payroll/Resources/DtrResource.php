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
            foreach( $this->leaves()->get() as $leave){
                $leaves[ $leave->id ] = [
                    'type'  => $leave->type,
                    'status'  => $leave->status,
                    'note'=> [
                        'employee_note'  => $leave->employee_note,
                        'manager_note'  => $leave->manager_note
                    ]
                ];
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
                    'source_type_tagging' => $this->source_type_tagging
                ), 
                array('holidays' => $holidays),
                array('leaves' => $leaves),
            );
        }
        return $result;
    }
}
