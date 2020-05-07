<?php

namespace App\Modules\Request\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use App\Modules\User\Resources\UserProfileResource;

class ChangeScheduleResource extends JsonResource
{
    private $schedule;
    public function __construct($resource, $schedule)
    {
        parent::__construct($resource);
        $this->resource = $resource;
        $this->schedule = $schedule;
    }

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
                'schedule_info' =>   $this->schedule,
                'status' => $this->status,
            );
        }

        return $result;
    }
}
