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
// use App\Modules\Department\Models\AnnouncementDepartment;

class Department extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    // protected static $logAttributes = ['department_name', 'description', 'schedule_id'];

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
        // return  $this->department_name;
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

    // public function departments_announcements()
    // {

    //     return $this->hasMany(Announcement::class, 'dep_id', 'id');
    // }

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

    // public function departments_announcements_presented()
    // {
    //     return $this->hasMany(Announcement::class, 'present_dep_id', 'id');
    // }

    // public function departments_announcement_by_json()
    // {
    //     $announcement_ids = AnnouncementDepartment::whereJsonContains('department_ids',[ $this->id])
    //     ->pluck('announcement_id')
    //     ->toArray();

    //     $announcements_list = Announcement::whereIn('id',  $announcement_ids);

    //     return  $announcements_list;
    // }
    
   
    
    
    /**
     * //////////////////////////////////////////
     *          Handled/Handler Methods 
     * //////////////////////////////////////////
     */
    
    
    # Fetch the Department User Handlers of the current Department Instance
    public function department_user_handlers()
    {     
        /* Gets the following: 
            1. Users that handles the Department via 'department_handlers' table
            2. Users that handles the team the department belongs to via 'team_handlers' 
         */
        $user_id_array = $this->belongsToMany(User::class, 'department_handlers', 'department_id', 'user_id')->pluck('id')->toArray();
        foreach( $this->teams()->get() as $team) {
            $user_id_array = array_merge( 
                $user_id_array, 
                $team->team_handlers()->pluck('id')->toArray() 
            );
        }
        return User::whereIn('users.id', array_unique($user_id_array));
    }

}
