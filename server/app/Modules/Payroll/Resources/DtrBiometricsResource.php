<?php

namespace App\Modules\Payroll\Resources;

use App\Modules\Request\Resources\AlterLogResource;
use App\Modules\Request\Resources\ChangeScheduleResource;
use App\Modules\Request\Resources\OvertimeResource;
use App\Modules\Request\Resources\RestDayWorkResource;
use App\Modules\User\Resources\UserProfileResource;
use Illuminate\Http\Resources\Json\JsonResource;

class DtrBiometricsResource extends JsonResource
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


            $result =   array(
                'id' => $this->id,
                'user_id' => $this->user_id,
                'date' => $this->date,
                'time_in' => timestamp_to_datetime( $this->time_in ),
                'time_out' => timestamp_to_datetime( $this->time_out ),
                'user' => new UserProfileResource( $this->user()->first() )
            );
        }
        return $result;
    }
}
