<?php

namespace App\Modules\Request\Resources;

use App\Modules\User\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Modules\User\Resources\UserProfileResource;
use App\Modules\Payroll\Resources\DtrPunchResource;

class AlterLogPunchResource extends JsonResource
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

            $viewer_offset = Auth::user() ?  Auth::user()->country_timezone_to_offset() :  $owner_offset ;

          
            
            $offset_seconds =  string_offset_to_seconds($viewer_offset);
            $owner_offset_seconds =  string_offset_to_seconds( $owner_offset);


            $new_punch_formatted = [];
            $pov_new_punch_formatted = [];
            foreach(  $this->new_punch_array() as $key =>$punch){
                $new_punch_formatted[ $key ] =  (object) [
                    'start_time' => ( $punch->start_time!=null)?date("Y-m-d H:i:s", $punch->start_time+ $offset_seconds ):null,
                    'end_time' =>   ( $punch->end_time!=null)?date("Y-m-d H:i:s", $punch->end_time+ $offset_seconds ):null,
                ];
                $pov_new_punch_formatted[ $key ] =  (object) [
                    'start_time' => ( $punch->start_time!=null)?date("Y-m-d H:i:s", $punch->start_time+ $owner_offset_seconds ):null,
                    'end_time' =>   ( $punch->end_time!=null)?date("Y-m-d H:i:s", $punch->end_time+ $owner_offset_seconds ):null,
                ];
            }

           
          
            // dd($this->old_punch_to_collection()->get());


            $result = array(
                'request_type' => "alter_log_punch",
                'id' => $this->id,
                'user_id' => $this->user_id,
                'date' => $this->date,
                'new_punch' =>  $new_punch_formatted,
                'old_punch' =>   DtrPunchResource::collection($this->old_punch_to_collection()->get()),
                'status' => $this->status,
                'employee_note' => $this->employee_note,
                'approver_note' => $this->approver_note,
                'user' => new UserProfileResource( $this->user()->first(), false), 
                'is_under_supervisee'   => is_under_supervisee( $this->user_id, false ),

             

                'pov_new_punch' =>  $pov_new_punch_formatted,
                'pov_timezone'=>  $owner->country_zone()->country_name . " " . $owner->country_zone()->country_time_zone."(".$owner->country_zone()->time_difference .")",

                'offset_difference_info' =>   (string_offset_to_seconds($owner_offset)/3600)."-". (string_offset_to_seconds($viewer_offset)/3600),
                'offset_difference' =>   string_offset_to_seconds($owner_offset)- string_offset_to_seconds($viewer_offset),
            );
        }

        return $result;
    }
}
