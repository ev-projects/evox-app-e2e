<?php

namespace App\Modules\Request\Resources;

use App\Modules\User\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Modules\User\Resources\UserProfileResource;

class AlterLogResource extends JsonResource
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
        if( ! is_null( $this->resource ) ) {


            $owner_offset = $owner->country_timezone_to_offset();

            // $viewer_offset = Auth::user()->country_timezone_to_offset();
            $viewer_offset = Auth::user() ?  Auth::user()->country_timezone_to_offset() :  $owner_offset ;

            $offset_seconds =  string_offset_to_seconds($viewer_offset);
            $owner_offset_seconds =  string_offset_to_seconds( $owner_offset);
            $result = array(
                'request_type' => get_constant('REQUEST_TYPES.alter_log'),
                'id' => $this->id,
                'user_id' => $this->user_id,
                'date' => $this->date,
                'current_time_in' => ( $this->current_time_in!=null)?date("Y-m-d H:i:s", $this->current_time_in+ $offset_seconds ):null,
                'current_time_out' =>( $this->current_time_out!=null)? date("Y-m-d H:i:s",$this->current_time_out + $offset_seconds):null,
                'new_time_in' => date("Y-m-d H:i:s", $this->new_time_in + $offset_seconds),
                'new_time_out' => date("Y-m-d H:i:s",$this->new_time_out+ $offset_seconds ),
                'status' => $this->status,
                'employee_note' => $this->employee_note,
                'approver_note' => $this->approver_note,
                'user' => new UserProfileResource( $this->user()->first(), false), 
                'is_under_supervisee'   => is_under_supervisee( $this->user_id, false ),

                'pov_current_time_in' => ( $this->current_time_in!=null)?date("Y-m-d H:i:s", $this->current_time_in+ $owner_offset_seconds ):null,
                'pov_current_time_out' =>( $this->current_time_out!=null)? date("Y-m-d H:i:s",$this->current_time_out + $owner_offset_seconds):null,
                'pov_new_time_in' => date("Y-m-d H:i:s", $this->new_time_in + $owner_offset_seconds),
                'pov_new_time_out' => date("Y-m-d H:i:s",$this->new_time_out+ $owner_offset_seconds ),
                'pov_timezone'=>  $owner->country_zone()->country_name . " " . $owner->country_zone()->country_time_zone."(".$owner->country_zone()->time_difference .")",

                'offset_difference_info' =>   (string_offset_to_seconds($owner_offset)/3600)."-". (string_offset_to_seconds($viewer_offset)/3600),
                'offset_difference' =>   string_offset_to_seconds($owner_offset)- string_offset_to_seconds($viewer_offset),
            );
        }

        return $result;
    }
}
