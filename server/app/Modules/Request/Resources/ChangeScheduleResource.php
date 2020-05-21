<?php

namespace App\Modules\Request\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use App\Modules\Schedule\Resources\ScheduleResource;

use App\Modules\Schedule\Repositories\ScheduleRepository;

class ChangeScheduleResource extends JsonResource
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
                'request_type' => get_constant('REQUEST_TYPES.change_schedule'),
                'id' => $this->id,
                'user_id' => $this->user_id,
                'employee_note' => $this->employee_note,
                'approver_note' => $this->approver_note,
                'valid_from' => $this->valid_from,
                'valid_to' => $this->valid_to,
                'status' => $this->status,
                'schedule' =>    new ScheduleResource( $this->schedule()->first() ),
            );
        }

        return $result;
    }
}
