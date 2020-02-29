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
        $result = null;

        if( ! is_null( $this->resource ) ) {

            # Create Resource for Schedule Details
            $schedule_details = [];
            foreach( $this->schedule_details()->get() as $schedule_detail){
                $schedule_details[ $schedule_detail->day ] = $schedule_detail->getFormattedDetail();
            }
            
            # Create Resource for Schedule Policies
            $schedule_policies = [];
            foreach( $this->schedule_policies()->get() as $schedule_policy){
                $schedule_policies[ $schedule_policy->policy ] = $schedule_policy->value;
            }

            $result =  array_merge( 
                array(
                    'id' => $this->id,
                    'name' => $this->name,
                    'source_type' => $this->source_type,
                    'schedule_type' => $this->schedule_type,
                    'valid_from' => $this->valid_from,
                    'valid_to' => $this->valid_to,
                    'rest_day' => $this->rest_days,
                    'work_days' => get_work_days($this->rest_days),
                ), 
                array('schedule_details' => $schedule_details),
                array('schedule_policies' => $schedule_policies),
            );
        }
        return $result;
    }
}
