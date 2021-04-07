<?php

namespace App\Modules\Schedule\Models;

use App\Modules\Department\Models\Department;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use App\Modules\Request\Models\ChangeSchedule;

class Schedule extends Model{
    
    use SoftDeletes, LogsActivity;

    protected $guarded = [];

    protected static $logAttributes = ['name', 'bind_to', 'bind_id', 'source_type', 'schedule_type', 'valid_from', 'valid_to', 'rest_days', 'updated_by'];

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

    /**
     * 
     *  Returns a Collection that contains the Schedule per Day. Value is null if the day is a Rest Day.
     *  - Accepts an Optional parameter $day_chosen if you want the single Detail for the chosen day to return only.
     * @param string $day_chosen (optional)
     * @return Collection $days 
     */
    public function getPerDay( $day_chosen = null )
    {
        $days = [];

        # Get the 'all' Detail for Standard and Flexible Schedule. (day = all)
        if( $this->isStandard() || $this->isFlexible() ) {
            $all_schedule_detail = $this->schedule_details()->where('day', 'all')->firstOrFail();

        # Get the Detail Collection for Customize Schedule. (day = mon, tue, wed, etc...)
        } else if( $this->isCustomize() ) {
            $per_day_schedule_details_collection = $this->schedule_details()->get();
        }
        
        # Loop the Days 
        foreach( get_constant('DAYS') as $day )
        {   
            # Null will be the default value per day ( If the day is a Rest Day, it would stay as null.)
            $days[ $day ] = null;

            # If the current $day is not in the $rest_days, set a Schedule for that specific day.
            if( ! in_array( $day, $this->rest_days ) ) {

                # If Standard/Flexible, set the Schedule Detail with the day 'all' as default.
                if( $this->isStandard() || $this->isFlexible() ) {
                    $days[ $day ] = $all_schedule_detail;

                # If Customized, set the Schedule Detail using the $day of the current iteration.
                } else if( $this->isCustomize() ) {
                    $days[ $day ] = $per_day_schedule_details_collection->firstWhere('day', $day);
                }
            }

            # Returns the Chosen Day 
            if( is_valid( $day_chosen ) && in_array( $day_chosen, get_constant('DAYS') ) && $day == $day_chosen ) {
                return $days[ $day ];
            }
        }
        return collect($days);
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

    # Fetch the Schedules owner
    public function owner(){
        switch( $this->bind_to ) {
            case "user":
                return $this->hasOne(User::class, 'id', 'bind_id');
                break;
            case "department":
                return $this->hasOne(Department::class, 'id', 'bind_id');
                break;
        }
    }

    /**
     * belongsTo Relationship for User change_schedule
     */
    public function change_schedule(){
        return $this->hasOne(ChangeSchedule::class, 'schedule_id', 'id')->where('status','approved');
    }

    /**
     * belongsTo Relationship for User model through updatedBy
     */
    public function updatedBy(){
        return $this->hasOne(User::class, 'id', 'updated_by');
    }

    /**
     * belongsTo Relationship for User model through createdBy
     */
    public function createdBy(){
        return $this->hasOne(User::class, 'id', 'created_by');
    }
}
