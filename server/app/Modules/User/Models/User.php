<?php

namespace App\Modules\User\Models;

use App\Modules\Department\Models\Department;
use App\Modules\Schedule\Models\Schedule;
use Illuminate\Notifications\Notifiable;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Permission\Traits\HasRoles;
use Spatie\Permission\Traits\HasPermissions;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use Notifiable, HasRoles, HasPermissions, SoftDeletes, LogsActivity;
    
    public $primaryKey = 'emp_num';
    public $incrementing = false;

    protected $fillable = [];

    protected $hidden = [
        'password'
    ];
    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    protected $dates = ['deleted_at'];

    /**
     * Get the identifier that will be stored in the subject claim of the JWT.
     *
     * @return mixed
     */
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    /**
     * Return a key value array, containing any custom claims to be added to the JWT.
     *
     * @return array
     */
    public function getJWTCustomClaims()
    {
        return [];
    }

    ########################################################################
    ############################ Custom Helpers ############################
    ########################################################################

    /**
     * 
     *  gets the Full Name of the User 
     *  - Can have additional format depending on the $format_type variable.
     *  -   1  -> {first_name} {middle_name} {last_name}
     *  -   2  -> {last_name}, {first_name} {middle_name} 
     * 
     */
    public function getFullName( $format_type = 1  )
    {
        $result = '';
        switch($format_type) {
            case 1:
                $result = $this->first_name . ' ' . $this->middle_name . ' ' . $this->last_name;
                break;
            case 2:
                $result = $this->last_name . ', '. $this->first_name . ' ' . $this->middle_name;
                break;
            default:
                $result = $this->first_name . ' ' . $this->middle_name . ' ' . $this->last_name;
                break;
        }
        return $result;
    }
    

    /**
     *  Eloquent Query Helpers
     */

     # Sets the Query to get all Active only
    public function isActive(){
        return $this->where('is_active', 1);
    }

    # Sets the Query to get all Inactive only
    public function isInactive(){
        return $this->where('is_active', 0);
    }

    ########################################################################

    /**
     *  Relationships
     */
    
    # Fetch the User's Supervisors
    public function supervisors()
    {
        return $this->belongsToMany(User::class, 'users_supervisors', 'emp_num', 'supervisor_emp_num');
    }

    # Fetch the User's Supervisee 
    public function supervisee()
    {
        return $this->belongsToMany(User::class, 'users_supervisors', 'supervisor_emp_num', 'emp_num');
    }

    # Fetch the User's Department
    public function department(){
        return $this->hasOne(Department::class, 'id', 'department_id');
    }

    # Fetch the User's Schedule (Source type is Default)
    public function defaultSchedule(){
        return $this->hasOne(Schedule::class, 'emp_num', 'emp_num')->where('source_type', 'default');
    }

    # Fetch the User's Schedule (Source type is Temporary)
    public function temporarySchedules(){
        return $this->hasMany(Schedule::class, 'emp_num', 'emp_num')->where('source_type', 'temporary');
    }

    # Fetch the User's Schedule (Source type is Change Schedule)
    public function changeSchedule(){
        return $this->hasMany(Schedule::class, 'emp_num', 'emp_num')->where('source_type', 'change_schedule');
    }

    ########################################################################
}
