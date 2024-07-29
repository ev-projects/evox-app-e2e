<?php

namespace App\Modules\Payroll\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Carbon\Carbon;


class DtrPunchResource extends JsonResource
{

 
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request){    
        
        $result = null;
        // dump($this);
        if( ! is_null( $this->resource ) ) {
            $result = array(
                'id' => $this->id,
                'date' =>  $this->date ,
                'time_in' => timestamp_to_time( $this->time_in ),
                'time_out' =>timestamp_to_time( $this->time_out ),

                'date_time_in' => timestamp_to_datetime( $this->time_in ),
                'date_time_out' =>timestamp_to_datetime( $this->time_out ),

                'log_action' => ( $this->log_action ),
                'log_in_type' =>( $this->log_in_type ),
                'log_out_type' =>( $this->log_out_type != null ? $this->log_out_type : null ),
                'recent_log' =>( $this->log_out_type != null ? $this->log_out_type : $this->log_in_type ),
                'completed_today' =>( $this->log_out_type != null ? $this->log_out_type == "Log_out" : false ),
                'remarks' =>$this->remarks,
                'project_name' =>$this->project_name,
                // 'completed_date' =>( $this->log_out_type != null ? $this->log_out_type : $this->log_in_type ),
                // 'hour2' => ($this->time_in - ($this->time_out != null?$this->time_out: 0  )),
                'hours' => $this->time_out != null && $this->time_in != null?seconds_to_time(($this->time_out - ($this->time_in != null?$this->time_in: 0  )) ,true) :null,
            );
        }
        
        return $result;
    }
}
