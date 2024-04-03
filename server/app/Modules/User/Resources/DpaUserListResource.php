<?php

namespace App\Modules\User\Resources;

use Carbon\Carbon;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Modules\Department\Models\EvoxDepartment;
use App\Modules\Department\Models\EvoxSubDepartment;

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

        $main_info = array(
            'id' => $this->id,
            'emp_num' => $this->emp_num,
            'department' => ( is_valid( $this->SubDepartmentID ) ? EvoxSubDepartment::where("Id", $this->SubDepartmentID)->first()->Name : null ),
            'is_active' => $this->is_active,
            'full_name' => $this->getFullName(),
            'dpa_ticked_at' => ( is_valid($this->dpa_ticked_at)  ) ? Carbon::parse( $this->dpa_ticked_at)->format('Y-m-d H:i:s') : 'N/A'
        );

        return $main_info;
    }
}
