<?php

namespace App\Modules\User\Resources;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Resources\Json\JsonResource;

class LeaveCreditsListResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {       
        $main_info = [];
        if( is_valid( $this->resource ) ) {
            foreach ( $this->resource as $leave_credit ) {
                array_push($main_info, [
                    'type' => $leave_credit->name,
                    'balance'  => $leave_credit->balance,
                    'policy_type' => $leave_credit->policyType
                ]);
            }
        }
        return $main_info;
    }
}
