<?php

namespace App\Modules\User\Resource;

use Illuminate\Http\Resources\Json\JsonResource;

class UserProfile extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {       
        // Create Resource for User Permissions
        $user_permissions = [];
        foreach( $this->resource->permissions()->get()  as $permission){
            array_push( $user_permissions, $permission->permission_code );
        }

        // Create Resource for User Roles
        $user_roles = [];
        foreach( $this->resource->roles()->get()  as $role){
            array_push( $user_roles, $role->role );
        }

        $user = parent::toArray($request);

        return array_merge( 
            array(
                'emp_num' => $user['emp_num'],
                'bhr_num' => $user['bhr_num'],
                'department_id' => $user['department_id'],
                'email' => $user['email'],
                'first_name' => $user['first_name'],
                'middle_name' => $user['middle_name'],
                'last_name' => $user['last_name'],
                'employment_status' => $user['employment_status'],
                'is_active' => $user['is_active'],
                'force_change_password' => $user['force_change_password']
            ), 
            array('user_permission' => $user_permissions),
            array('user_roles' => $user_roles),
        );
    }
}
