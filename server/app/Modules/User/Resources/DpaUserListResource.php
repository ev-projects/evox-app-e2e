<?php

namespace App\Modules\User\Resources;

use Carbon\Carbon;
use Illuminate\Http\Resources\Json\JsonResource;

class DpaUserListResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        $department = $this->department()->first();
        $main_info = array(
            'id' => $this->id,
            'emp_num' => $this->emp_num,
            'department' => ( is_valid( $department ) ? $department->getCompleteName() : null ),
            'is_active' => $this->is_active,
            'full_name' => $this->getFullName(),
            'dpa_ticked_at' => ( is_valid($this->dpa_ticked_at)  ) ? Carbon::parse( $this->dpa_ticked_at)->format('Y-m-d H:i:s') : 'N/A'
        );

        return $main_info;
    }
}
