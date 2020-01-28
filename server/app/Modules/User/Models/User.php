<?php

namespace App\Modules\User\Models;

use App\Modules\Department\Models\Department;
use App\Modules\Schedule\Models\Schedule;
use Illuminate\Notifications\Notifiable;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Spatie\Permission\Traits\HasRoles;
use Spatie\Permission\Traits\HasPermissions;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use Notifiable, HasRoles, HasPermissions, SoftDeletes;
    
    public $primaryKey = 'emp_num';
    public $incrementing = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'password'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
    ];
    
    /**
     * The attributes that should be mutated to dates.
     *
     * @var array
     */
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
     *  Eloquent Query Helpers
     */

     # Sets the Query to get all Active only
    public function isActive($query){
        return $query->where('active', 1);
    }

    # Sets the Query to get all Inactive only
    public function isInactive($query){
        return $query->where('active', 0);
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
    public function schedule(){
        return $this->hasOne(Schedule::class, 'id', 'schedule_id')->where('source_type', 'default');
    }

    ########################################################################
}
