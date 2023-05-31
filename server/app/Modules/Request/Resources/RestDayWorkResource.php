<?php

namespace App\Modules\Request\Resources;

use App\Modules\User\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Modules\User\Resources\UserProfileResource;

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
        $owner = User::find( $this->user_id);

        $owner_offset = $owner->country_timezone_to_offset();

        $viewer_offset = Auth::user() ?  Auth::user()->country_timezone_to_offset() :  $owner_offset ;

        if( ! is_null( $this->resource ) ) {

            $result = array(
                'request_type' => get_constant('REQUEST_TYPES.rest_day_work'),
                'id' => $this->id,
                'user_id' => $this->user_id,
                'date' => $this->date,
                //on supervisor
                'start_time' => seconds_to_time($this->start_time, false, true),
                'end_time' => seconds_to_time($this->end_time, false, true),
                'break_time' => seconds_to_time($this->break_time),
                'employee_note' => $this->employee_note,
                'approver_note' => $this->approver_note,
                'status' => $this->status,
                'user' => new UserProfileResource( $this->user()->first(), false), 
                'is_under_supervisee'   => is_under_supervisee( $this->user_id, false ),

                //employee prespective timezone
                'pov_start_time' => seconds_to_time_POV($this->start_time, false, true,  $owner),
                'pov_end_time' => seconds_to_time_POV($this->end_time, false, true,  $owner),
                'pov_timezone'=>  $owner->country_zone()->country_name . " " . $owner->country_zone()->country_time_zone."(".$owner->country_zone()->time_difference .")",

                'offset_difference_info' =>   (string_offset_to_seconds($owner_offset)/3600)."-". (string_offset_to_seconds($viewer_offset)/3600),
                'offset_difference' =>   string_offset_to_seconds($owner_offset)- string_offset_to_seconds($viewer_offset),
            );
        }

        return $result;
    }
}
