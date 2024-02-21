<?php

namespace App\Modules\User\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

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
        $department = $this->department()->first();

        // Create Resource for Department Handled
        $departments_handled = [];
        foreach( $this->departments_handled()->orderBy('department_name', 'asc')->get()  as $departments){
            array_push( $departments_handled, $departments );
        }

        // Create Resource for Supervisee
        $supervisee = [];
        foreach( $this->supervisee()->orderBy('first_name', 'asc')->orderBy('last_name', 'asc')->get()  as $user){
            array_push( $supervisee, $user );
        }

        // Create Resource for Users Handled
        // $users_handled = [];
        // foreach( $this->users_handled()->orderBy('first_name', 'asc')->orderBy('last_name', 'asc')->get()  as $user){
        //     array_push( $users_handled, $user );
        // }

        $main_info = array(
            'id' => $this->id,
            'emp_num' => $this->emp_num,
            'department' => ( is_valid( $department ) ? $department->getCompleteName() : null ),
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'is_active' => $this->is_active,
            'job_title' => $this->job_title,
            'email' => $this->email,
            'full_name' => $this->getFullName(),
            'departments_handled' => $departments_handled,
            'supervisee' => $supervisee,
            "has_use_multi" => $this->hasFeature("multi_login"),
            // 'users_handled' => $users_handled,
        );

        return $main_info;
    }
}
