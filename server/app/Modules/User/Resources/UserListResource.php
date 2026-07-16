<?php

namespace App\Modules\User\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use App\Modules\Department\Models\EvoxDepartment;
use App\Modules\Department\Models\EvoxSubDepartment;

class UserListResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        // Create Resource for Department Handled
        $departments_handled = [];

        $evox_departments_handled=  $this->evox_departments_handled();

        $main_info = array(
            'id' => $this->id,
            'emp_num' => $this->emp_num,
            'department' => ( is_valid( $this->SubDepartmentID ) ? EvoxSubDepartment::where("Id", $this->SubDepartmentID)->first()->Name : null ),
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'is_active' => $this->is_active,
            'job_title' => $this->job_title,
            'email' => $this->email,
            'full_name' => $this->getFullName(),
            'departments_handled' => $evox_departments_handled,
            "has_use_multi" => is_valid($this->LevelId) ?$this->hasFeature("multi_login"): false,
        );

        return $main_info;
    }
}
