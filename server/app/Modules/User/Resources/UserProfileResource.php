<?php

namespace App\Modules\User\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Carbon\Carbon;


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

        $department = $this->department()->first();
        
        if($this->birthdate!=null){
            $birthdate = new Carbon($this->birthdate);
            $birthdate = $birthdate->format('F d');
        }else{
            $birthdate = '';
        }
        $offset = $this->country_timezone_to_offset(); 

       
        $main_info = array(
            'id' => $this->id,
            'emp_num' => $this->emp_num,
            'bhr_num' => $this->bhr_num,
            'department' => ( is_valid( $department ) ? $department->getCompleteName() : null ),
            'department_id' => $this->department_id,
            'email' => $this->email,
            'username' => $this->username,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'employment_status' => $this->employment_status,
            'date_hired' => $this->date_hired,
            'birthdate' =>$birthdate,
            'nickname' => $this->nickname,
            'is_active' => $this->is_active,
            'job_title' => $this->job_title,
            'mobile_number' => $this->mobile_number,
            'force_change_password' => $this->force_change_password,
            'dpa_ticked_at' => $this->dpa_ticked_at,
            'full_name' => $this->getFullName(),
            'user_has_schedule' => $this->getHasSchedule(),

            // "timezone" => $this->timezone,
            "user_offset_seconds" => string_offset_to_seconds($offset),
            "user_server_time" =>  timestamp_to_datetime(Carbon::now()->timestamp),
            "user_server_timestamp" => (Carbon::now()->timestamp + string_offset_to_seconds($offset)),
            "user_server_timestamp_mils" => (Carbon::now()->timestamp + string_offset_to_seconds($offset))*1000,
            'pov_timezone'=>  $this->country_zone()->country_name . " " . $this->country_zone()->country_time_zone."(".$offset .")",
            'timezone'=>$this->country_zone()->country_time_zone,
            "current_offset" => $offset,
            "default_offset" => $this->country_zone()->time_difference,
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

            // Create Resource for Department Handled
            $departments_handled = [];
            foreach( $this->departments_handled()->orderBy('department_name', 'asc')->get()  as $departments){
                array_push( $departments_handled, $departments );
            }


            return array_merge( 
                $main_info, 
                array('permissions' => $permissions),
                array('roles' => $roles),
                array('departments_handled' => $departments_handled),
            );
            
        } else {
            return $main_info;
        }
    }
}
