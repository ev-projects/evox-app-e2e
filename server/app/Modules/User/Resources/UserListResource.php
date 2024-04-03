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
        // foreach( $this->departments_handled()->orderBy('department_name', 'asc')->get()  as $departments){
        //     array_push( $departments_handled, $departments );
        // }
        $evox_departments_handled=  $this->evox_departments_handled();

        // Create Resource for Supervisee
        // $supervisee = [];
        // foreach( $this->supervisee()->orderBy('first_name', 'asc')->orderBy('last_name', 'asc')->get()  as $user){
        //     array_push( $supervisee, $user );
        // }

        // Create Resource for Users Handled
        // $users_handled = [];
        // foreach( $this->users_handled()->orderBy('first_name', 'asc')->orderBy('last_name', 'asc')->get()  as $user){
        //     array_push( $users_handled, $user );
        // }

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
            // 'supervisee' => $supervisee,
            "has_use_multi" => is_valid($this->LevelId) ?$this->hasFeature("multi_login"): false,
            // 'users_handled' => $users_handled,
        );

        return $main_info;
    }
}
