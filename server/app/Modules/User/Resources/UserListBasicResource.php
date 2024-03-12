<?php

namespace App\Modules\User\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class UserListBasicResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        $department = null;
        if(is_valid($this->department )){
            $department = $this->department->department_name;
        }
        

        $main_info = array(
            'id' => $this->id,
            'emp_num' => $this->emp_num,
            'department' => ( is_valid( $department ) ? $department : null ),
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'is_active' => $this->is_active,
            'job_title' => $this->job_title,
            'email' => $this->email,
            'full_name' => $this->getFullName(),
        );

        return $main_info;
    }
}
