<?php

namespace App\Modules\Request\Resources;

use App\Modules\User\Resources\UserProfileResource;
use Illuminate\Http\Resources\Json\JsonResource;

class OvertimeResource extends JsonResource
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
                'request_type' => get_constant('REQUEST_TYPES.overtime'),
                'id' => $this->id,
                'user_id' => $this->user_id,
                'date' => $this->date,
                'amount' => seconds_to_time($this->amount),
                'type' => $this->type,
                'employee_note' => $this->employee_note,
                'approver_note' => $this->approver_note,
                'status' => $this->status,
                'user' => new UserProfileResource($this->user()->first(), false) 
            );
        }

        return $result;
    }
}
