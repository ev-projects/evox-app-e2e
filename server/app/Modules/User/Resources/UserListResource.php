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

        // Create Resource for Department Handled
        $supervisee = [];
        foreach( $this->supervisee()->orderBy('first_name', 'asc')->orderBy('last_name', 'asc')->get()  as $user){
            array_push( $supervisee, $user );
        }

        $main_info = array(
            'id' => $this->id,
            'emp_num' => $this->emp_num,
            'department' => ( is_valid( $department ) ? $department->getCompleteName() : null ),
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'full_name' => $this->getFullName(),
            'departments_handled' => $departments_handled,
            'supervisee' => $supervisee,
        );

        return $main_info;
    }
}
