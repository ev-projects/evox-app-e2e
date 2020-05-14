<?php

namespace App\Modules\Request\Resources;

use App\Modules\User\Resources\UserProfileResource;
use Illuminate\Http\Resources\Json\JsonResource;

class RestDayWorkResource extends JsonResource
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

            $result = array(
                'request_type' => get_constant('REQUEST_TYPES.rest_day_work'),
                'id' => $this->id,
                'user_id' => $this->user_id,
                'date' => $this->date,
                'start_time' => seconds_to_time($this->start_time),
                'end_time' => seconds_to_time($this->end_time),
                'break_time' => seconds_to_time($this->break_time),
                'employee_note' => $this->employee_note,
                'approver_note' => $this->approver_note,
                'status' => $this->status,
                'user' => new UserProfileResource( $this->user()->first(), false) 
            );
        }

        return $result;
    }
}
