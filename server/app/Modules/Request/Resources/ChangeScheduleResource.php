<?php

namespace App\Modules\Request\Resources;

use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Resources\Json\JsonResource;

use App\Modules\User\Resources\UserProfileResource;
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
        $owner = $this->user()->first();
        if( ! is_null( $this->resource ) ) {


            $owner_offset = $owner->country_timezone_to_offset();

            $viewer_offset = Auth::user() ?  Auth::user()->country_timezone_to_offset() :  $owner_offset ;


            $result = array(
                'request_type' => get_constant('REQUEST_TYPES.change_schedule'),
                'id' => $this->id,
                'user_id' => $this->user_id,
                'valid_from' => $this->valid_from,
                'valid_to' => $this->valid_to,
                'schedule' =>    new ScheduleResource( $this->schedule()->first() ),
                'status' => $this->status,
                'employee_note' => $this->employee_note,
                'approver_note' => $this->approver_note,
                'user' => new UserProfileResource( $this->user()->first(), false), 
                'is_under_supervisee'   => is_under_supervisee( $this->user_id, false ),
                
                'offset_difference_info' =>   (string_offset_to_seconds( $owner_offset)/3600)."-". (string_offset_to_seconds( $viewer_offset)/3600),
                'offset_difference' =>   string_offset_to_seconds( $owner_offset)- string_offset_to_seconds( $viewer_offset),
                
            );
        }

        return $result;
    }
}
