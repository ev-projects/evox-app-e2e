<?php

namespace App\Modules\Payroll\Models;

use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;

class Dtr extends Model
{
    
    use SoftDeletes, LogsActivity;

    protected $guarded = [];

    protected static $logAttributes = ['user_id', 'date', 'time_in', 'time_out', 'start_time', 'end_time', 'start_flexy_time', 'end_flexy_time', 'break_time'];

    protected $dates = [
        'deleted_at',
        'created_at',
        'updated_at'
    ];
    
    ########################################################################
    ############################ Custom Helpers ############################
    ########################################################################


    /**
     * 
     *  Check if the current DTR has a Complete Time-in and Time-out.
     * @return bool 
     */
    public function hasCompleteTimelogs()
    {
        return ( is_valid( $this->time_in ) && is_valid( $this->time_out ) ) ? true : false;
    }


    /**
     * 
     *  Check if the current DTR has a Valid Time-in and Time-out. (Time Out > Time In)
     * @return bool 
     */
    public function hasValidTimelogs()
    {
        return ( $this->hasCompleteTimelogs() && $this->time_out > $this->time_in ) ? true : false;
    }


    /**
     * 
     *  Check if the current DTR has a Schedule
     * @return bool 
     */
    public function hasSchedule()
    {
        return ( is_valid( $this->start_datetime ) && is_valid( $this->end_datetime ) ) ? true : false;
    }

    /**
     * 
     *  Check if the current DTR is a Rest Day
     * @return bool 
     */
    public function isRestDay()
    {
        return ( $this->is_rest_day ) ? true : false;
    }

    /**
     * 
     *  Check if the Source Type Tagging is 'default'.
     * @return bool 
     */
    public function isDefault()
    {
        return ( $this->source_type_tagging == 'default' ) ? true : false;
    }


    /**
     * 
     *  Check if the Source Type Tagging is 'temporary'.
     * @return bool 
     */
    public function isTemporary()
    {
        return ( $this->source_type_tagging == 'temporary' ) ? true : false;
    }

    /**
     * 
     *  Check if the Source Type Tagging is 'change_schedule'.
     * @return bool 
     */
    public function isChangeSchedule()
    {
        return ( $this->source_type_tagging == 'change_schedule' ) ? true : false;
    }


    ########################################################################

    /**
     *  Relationships
     */
    /**
     * hasMany Relationship for Schedule Policies model
     */
    public function user(){
        return $this->belongsTo(User::class);
    }

    /**
     * hasMany Relationship for DTR Policy model
     */
    public function policies(){
        return $this->hasMany(DtrPolicy::class);
    }

    /**
     * hasMany Relationship for DTR Payroll Items model
     */
    public function payroll_items(){
        return $this->hasMany(DtrPayrollItems::class);
    }

    /**
     * hasMany Relationship for Dtr Holidays model
     */
    public function holidays(){
        return $this->belongsToMany(Holiday::class, 'dtr_holidays', 'dtr_id', 'holiday_id');
        
    }

    /**
     * hasMany Relationship for Dtr Leaves model
     */
    public function leaves(){
        return $this->hasMany(Leave::class);
        
    }


    # Fetch the User's Supervisee 
    public function supervisee()
    {
        return $this->belongsToMany(User::class, 'users_supervisors', 'supervisor_id', 'user_id');
    }

}
