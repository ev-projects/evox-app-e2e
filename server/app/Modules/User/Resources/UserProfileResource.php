<?php

namespace App\Modules\User\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class UserProfileResource extends JsonResource
{
    private $show_full_info;

    public function __construct($resource, $show_full_info = true)
    {
        // Ensure you call the parent constructor
        parent::__construct($resource);
        $this->resource = $resource;
        
        $this->show_full_info = $show_full_info;
    }

    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request){       
        
        $main_info = array(
            'id' => $this->id,
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
        );

        if( $this->show_full_info ) {

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
                $main_info, 
                array('permissions' => $permissions),
                array('roles' => $roles),
            );
            
        } else {
            return $main_info;
        }
    }
}
