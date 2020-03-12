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
     *  Relationships
     */
    /**
     * hasMany Relationship for DTR Payroll Items model
     */
    public function dtr_payroll_items(){
        return $this->hasMany(DtrPayrollItem::class);
    }

    /**
     *  Relationships
     */
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
