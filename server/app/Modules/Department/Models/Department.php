<?php

namespace App\Modules\Department\Models;

use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    // use SoftDeletes;

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
        return  $this->department_name;
    }
    


    ########################################################################
    ############################ Relationships #############################
    ########################################################################



    # Fetch the Department's Default Schedule (Source type is Default)
    public function users(){
        return $this->hasMany(User::class, 'department_id', 'id');
    }

    

    # Fetch the Department's Default Schedule (Source type is Default)
    public function defaultSchedule(){
        return $this->hasOne(Schedule::class, 'bind_id', 'id')->where([
            'bind_to' => 'department',
            'source_type' => 'default'
        ]);
    }

    # Fetch the Department's Assigned Users 
    public function department_handlers()
    {
        return $this->belongsToMany(User::class, 'department_handlers', 'department_id', 'user_id');
    }

}
