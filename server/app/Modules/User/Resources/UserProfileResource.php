<?php

namespace App\Modules\User\Resources;

use Carbon\Carbon;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Modules\Department\Models\EvoxDepartment;
use App\Modules\Department\Models\EvoxSubDepartment;
use App\NhoSurvey;


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
            'department' => ( is_valid( $this->SubDepartmentID ) ? EvoxSubDepartment::where("Id", $this->SubDepartmentID)->first()->Name : null ),
            'department_main' => ( is_valid( $this->SubDepartmentID ) ? EvoxDepartment::where("Id", EvoxSubDepartment::where("Id", $this->SubDepartmentID)->first()->DepartmentId)->first()->Name : null ),
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
            "user_server_date" =>  timestamp_to_date(Carbon::now()->timestamp),
            "user_server_timestamp" => (Carbon::now()->timestamp + string_offset_to_seconds($offset)),
            "user_server_timestamp_mils" => (Carbon::now()->timestamp + string_offset_to_seconds($offset))*1000,
            'pov_timezone'=>  $this->country_zone()->country_name . " " . $this->country_zone()->country_time_zone."(".$offset .")",
            'country'=>  $this->country_zone()->country_name ,
            'timezone'=>$this->country_zone()->country_time_zone,
            "current_offset" => $offset,
            "default_offset" => $this->country_zone()->time_difference,
            "lvl_name" => is_valid( $this->LevelId) ? $this->level_type(): null,
            "use_multi" => is_valid( $this->LevelId) ?$this->permissions()->pluck('name')->contains('user_multi_login'): false,

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


            
             $evox_departments_handled = [];
            //  dd("");
             $evox_departments_handled=  $this->evox_departments_handled();

             $evox_departments_handled_strict = [];
             $evox_departments_handled_strict =$this->evox_departments_handled_strict();

            $feature_all_list = [];
            if(is_valid($this->LevelId)){
                
                $feature_all_list = $this->userFeatures();
            }
            $level_item =  [];
            if(is_valid( $this->LevelId)){
                $level_item = $this->level()->select('LevelId','Name','LevelId','IsAdmin','ISHR','IsPayRoll','CountryId','IsActive')->first()->toArray();
                $level_item["Name"] = $this->level_type();
            }
                // dd( $evox_departments_handled);
            return array_merge( 
                $main_info, 
                array('permissions' => $permissions),
                array('roles' => $roles),
                array('features_access' => is_valid($this->LevelId) ? $feature_all_list : []),
                array('level' =>(  $level_item )),
                array('user_nho_survey' => NhoSurvey::where('user_id', $this->id)->first() ?? []),
                array('departments_handled' => $evox_departments_handled),
                array('departments_handled_strict' =>  count($evox_departments_handled_strict) === 0? $evox_departments_handled : $evox_departments_handled_strict),
                array("is_user_nho_valid" => $this->isUserNhoValid()),

            );
            
        } else {
            return $main_info;
        }
    }
}