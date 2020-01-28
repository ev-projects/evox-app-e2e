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
        // // Create Resource for Schedule Details
        // $schedule_details = [];
        // foreach( $this->schedule_details() as $schedule_detail){
        //     dd($schedule_detail);die;
        //     $schedule_details[ $schedule_detail->day ] = [
        //         'id'                => $schedule_detail->id,
        //         'start_time'        => $schedule_detail->start_time,
        //         'end_time'          => $schedule_detail->end_time,
        //         'start_flexy_time'  => $schedule_detail->start_flexy_time,
        //         'end_flexy_time'    => $schedule_detail->end_flexy_time,
        //         'break_time'        => $schedule_detail->break_time,
        //     ];
        // }
        // dd($schedule_details);die;
        // return array_merge( 
        //     array(
        //         'id' => $this->id,
        //         'name' => $this->name,
        //         'source_type' => $this->source_type,
        //         'schedule_type' => $this->schedule_type
        //     ), 
        //     array('schedule_details' => $schedule_details)
        // );
    }
}
