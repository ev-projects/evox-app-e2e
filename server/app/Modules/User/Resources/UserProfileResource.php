<?php

namespace App\Modules\User\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class UserProfileResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request){       
        
        // Create Resource for Permissions
        $permissions = [];
        foreach( $this->getDirectPermissions() as $permission){
            array_push( $permissions, $permission->name );
        }

        // Create Resource for Roles
        $roles = [];
        foreach( $this->roles()->get()  as $role){
            array_push( $roles, $role->name );
        }

        return array_merge( 
            array(
                'emp_num' => $this->emp_num,
                'bhr_num' => $this->bhr_num,
                'department' => $this->department()->first()->getCompleteName(),
                'email' => $this->email,
                'first_name' => $this->first_name,
                'middle_name' => $this->middle_name,
                'last_name' => $this->last_name,
                'employment_status' => $this->employment_status,
                'is_active' => $this->is_active,
                'force_change_password' => $this->force_change_password
            ), 
            array('permissions' => $permissions),
            array('roles' => $roles),
        );
    }
}
