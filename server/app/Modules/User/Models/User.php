<?php

namespace App\Modules\User\Models;

use App\Modules\Department\Models\Department;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Request\Models\Overtime;
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
     *  Gets the Full Name of the User 
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
     *  Gets the parsed Employee Number that would be used for Biometrics fetching
     */
    public function getBiometricsId()
    {
        return "20".$this->emp_num;
    }

    ########################################################################
    ############################ Relationships #############################
    ########################################################################

    
    # Fetch the User's Supervisors
    public function supervisors()
    {
        return $this->belongsToMany(User::class, 'users_supervisors', 'user_id', 'supervisor_id');
    }

    # Fetch the User's Supervisee 
    public function supervisee()
    {
        return $this->belongsToMany(User::class, 'users_supervisors', 'supervisor_id', 'user_id');
    }

    # Fetch the User's Department
    public function department(){
        return $this->hasOne(Department::class, 'id', 'department_id');
    }

    # Fetch the User's Schedule (Source type is Default)
    public function defaultSchedule(){
        return $this->hasOne(Schedule::class, 'bind_id', 'id')->where([
            'bind_to' => 'user',
            'source_type' => 'default'
        ]);
    }

    # Fetch the User's Overtime Requests
    public function overtimes(){
        return $this->hasMany(Overtime::class, 'user_id', 'id');
    }

    # Fetch the User's Schedule (Source type is Temporary)
    public function temporarySchedules($start_date = null, $end_date = null){

        $temporary_schedule_condition = [
            'bind_to' => 'user',
            'source_type' => 'temporary'
        ];

        # If the Start and End Date is valid, fetch the Temporary Schedule that exists between the Date Range.
        if( is_valid( $start_date ) && is_valid( $end_date ) ){
            return $this->hasMany(Schedule::class, 'bind_id', 'id')->where($temporary_schedule_condition)
                                                                   ->whereRaw("( valid_from BETWEEN '".$start_date."' AND '".$end_date."' OR valid_to BETWEEN '".$start_date."' AND '".$end_date."')");

        # If the Start Date is valid and End Date is NOT Valid, fetch the Temporary Schedule that scopes the Start Date
        } elseif( is_valid( $start_date ) && !is_valid( $end_date ) ){
            return $this->hasMany(Schedule::class, 'bind_id', 'id')->where($temporary_schedule_condition)
                                                                   ->whereRaw("( valid_from >= '".$start_date."' AND  valid_to <= '".$start_date."')");

        # If the Start and End Date is NOT valid, fetch the all other Temporary Schedules.
        } else {
            return $this->hasMany(Schedule::class, 'bind_id', 'id')->where($temporary_schedule_condition);
        }                                             
    }

    # Fetch the User's Schedule (Source type is Change Schedule)
    public function changeSchedule(){
        return $this->hasMany(Schedule::class, 'bind_id', 'id')->where([
            'bind_to' => 'user',
            'source_type' => 'change_schedule'
        ]);
    }

    # Fetch the User's DTR
    public function dtr($start_date = null, $end_date = null){

        # If the Start and End Date is valid, fetch the DTR between the Date Range.
        if( is_valid( $start_date ) && is_valid( $end_date ) ){
            return $this->hasMany(Dtr::class)->whereBetween('date', [$start_date, $end_date]);

        # If the Start is valid AND End Date is NOT valid, fetch the DTR Date Range from Start Date Onwards.
        } elseif( is_valid( $start_date ) && !is_valid( $end_date ) ){
            return $this->hasMany(Dtr::class)->where('date', '>=', $start_date);

        # If the Start and End date is NOT valid, fetch the DTR as a whole
        }elseif( !is_valid( $start_date ) && !is_valid( $end_date ) ){
            return $this->hasMany(Dtr::class);
        }
    }


    ########################################################################
}
