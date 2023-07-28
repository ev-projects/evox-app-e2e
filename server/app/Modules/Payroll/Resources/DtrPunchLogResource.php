<?php

namespace App\Modules\Payroll\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class DtrPunchLogResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        if( ! is_null( $this->resource ) ) {

            $result = array(
                'date' =>  $this->date ,
                'time_in' =>timestamp_to_time($this->time_in),
                'time_out' =>timestamp_to_time($this->time_out),
                'log_in_type'=>$this->log_in_type,
                'log_out_type'=>$this->log_out_type,
                'duration'=>seconds_to_time($this->duration,true),
            );
            
        }
        
        return $result;
    }
}
