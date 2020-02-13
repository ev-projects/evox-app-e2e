<?php

namespace App\Modules\Schedule\Models;

use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;

class Schedule extends Model{
    
    use SoftDeletes, LogsActivity;

    protected $guarded = [];

    protected static $logAttributes = ['name', 'emp_num', 'source_type', 'schedule_type', 'valid_from', 'valid_to', 'rest_days', 'updated_by'];

    protected $dates = [
        'deleted_at'
    ];

    
    protected $casts = [
        'rest_days' => 'array'  # Casts the Rest Days automatically into Array whenever it is being fetched.
    ];

    
    ########################################################################
    ############################ Custom Helpers ############################
    ########################################################################

    /**
     * 
     *  Check if the Source Type is 'default'.
     * @return bool 
     */
    public function isDefault()
    {
        return ( $this->source_type == 'default' ) ? true : false;
    }

    /**
     * 
     *  Check if the Source Type is 'template'.
     * @return bool 
     */
    public function isTemplate()
    {
        return ( $this->source_type == 'template' ) ? true : false;
    }

    /**
     * 
     *  Check if the Source Type is 'temporary'.
     * @return bool 
     */
    public function isTemporary()
    {
        return ( $this->source_type == 'temporary' ) ? true : false;
    }

    /**
     * 
     *  Check if the Source Type is 'change_schedule'.
     * @return bool 
     */
    public function isChangeSchedule()
    {
        return ( $this->source_type == 'change_schedule' ) ? true : false;
    }

    /**
     * 
     *  Check if the Schedule Type is 'standard'.
     * @return bool 
     */
    public function isStandard()
    {
        return ( $this->schedule_type == 'standard' ) ? true : false;
    }

    /**
     * 
     *  Check if the Schedule Type is 'flexible'.
     * @return bool 
     */
    public function isFlexible()
    {
        return ( $this->schedule_type == 'flexible' ) ? true : false;
    }

    /**
     * 
     *  Check if the Schedule Type is 'customize'.
     * @return bool 
     */
    public function isCustomize()
    {
        return ( $this->schedule_type == 'customize' ) ? true : false;
    }

    ########################################################################

    /**
     *  Relationships
     */

    /**
     * hasMany Relationship for Schedule Details model
     */
    public function schedule_details(){
        return $this->hasMany(ScheduleDetail::class);
    }

    /**
     * hasMany Relationship for Schedule Policies model
     */
    public function schedule_policies(){
        return $this->hasMany(SchedulePolicy::class);
    }

    /**
     * belongsTo Relationship for User model
     */
    public function user(){
        return $this->hasMany(User::class, 'emp_num', 'emp_num');
    }

    /**
     * belongsTo Relationship for User model through updatedBy
     */
    public function updatedBy(){
        return $this->hasOne(User::class, 'emp_num', 'updated_by');
    }

    /**
     * belongsTo Relationship for User model through createdBy
     */
    public function createdBy(){
        return $this->hasOne(User::class, 'emp_num', 'created_by');
    }
}
