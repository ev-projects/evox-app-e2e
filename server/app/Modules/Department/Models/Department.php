<?php

namespace App\Modules\Department\Models;

use Carbon\Carbon;
use App\Modules\Team\Models\Team;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Model;
use App\Modules\Schedule\Models\Schedule;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Modules\Department\Models\Announcement;
use App\Modules\Department\Models\DepartmentOnSchedule;

class Department extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    protected $dates = [
        'deleted_at'
    ];

    ########################################################################
    ############################ Custom Helpers ############################
    ########################################################################

    /**
     * 
     *  Gets the Complete Name of the Department 
     * 
     */
    public function getCompleteName()
    {
        return EvoxDepartment::where("Id", $this->id)->first()->Name;
    }
    
    public function country_timezone_to_offset() // this should not exist but we give it UTC
    {
        $offset_string = Carbon::now();

        return $offset_string->format('P');
    }

    ########################################################################
    ############################ Relationships #############################
    ########################################################################

    # Fetch the Department's Default Schedule (Source type is Default)
    public function users(){
        return $this->hasMany(User::class, 'department_id', 'id');
    }

    # Fetch the Department's Teams
    public function teams(){
        return $this->hasMany(Team::class, 'department_id', 'id');
    }

    # Fetch the Department's Default Schedule (Source type is Default)
    public function defaultSchedule(){
        return $this->hasOne(Schedule::class, 'bind_id', 'id')->where([
            'bind_to' => 'department',
            'source_type' => 'default'
        ]);
    }

    # Fetch the Department User's Supervisors
    public function department_supervisors()
    {
        return $this->belongsToMany(User::class, 'department_handlers', 'department_id', 'user_id');
    }

    #check if the department is allowed to use schedule
    public function departments_on_schedule()
    {
        return $this->hasOne(DepartmentOnSchedule::class, 'department_id', 'id');
    }

    #check if the department is allowed to use schedule
    public function departments_on_schedule_is_active()
    {
        $condition = false;
       
        if($this->hasOne(DepartmentOnSchedule::class, 'department_id', 'id')->first()){
            return $this->hasOne(DepartmentOnSchedule::class, 'department_id', 'id')->first()->is_active == true;
        }
        return false ;
    }
}
