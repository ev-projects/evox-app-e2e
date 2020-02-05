<?php

namespace App\Modules\Schedule\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ScheduleResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {   
        # Create Resource for Schedule Details
        $schedule_details = [];
        foreach( $this->schedule_details()->get() as $schedule_detail){
            $schedule_details[ $schedule_detail->day ] = [
                'start_time'        => seconds_to_time($schedule_detail->start_time),
                'end_time'          => seconds_to_time($schedule_detail->end_time),
                'start_flexy_time'  => seconds_to_time($schedule_detail->start_flexy_time),
                'end_flexy_time'    => seconds_to_time($schedule_detail->end_flexy_time),
                'break_time'        => seconds_to_time($schedule_detail->break_time),
            ];
        }
        
        # Create Resource for Schedule Policies
        $schedule_policies = [];
        foreach( $this->schedule_policies()->get() as $schedule_policy){
            $schedule_policies[ $schedule_policy->policy ] = $schedule_policy->value;
        }

        return array_merge( 
            array(
                'id' => $this->id,
                'name' => $this->name,
                'source_type' => $this->source_type,
                'schedule_type' => $this->schedule_type,
                'rest_day' => $this->rest_days,
                'work_days' => get_work_days($this->rest_days),
            ), 
            array('schedule_details' => $schedule_details),
            array('schedule_policies' => $schedule_policies),
        );
    }
}
