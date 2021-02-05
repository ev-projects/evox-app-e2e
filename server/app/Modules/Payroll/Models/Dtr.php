<?php

namespace App\Modules\Payroll\Models;

use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\Schedule\Models\Schedule;
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
     *  Check if the current DTR has a value
     * @return bool 
     */
    public function validLog()
    {
        return ( !is_null( $this->time_in ) && !is_null( $this->time_out ) ) ? true : false;
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
     *  Check if the current DTR has a Flexible Schedule
     * @return bool 
     */
    public function hasFlexibleSchedule()
    {
        return ( is_valid( $this->start_flexy_datetime ) && is_valid( $this->end_flexy_datetime ) ) ? true : false;
    }

    /**
     * 
     *  Check if the current DTR's Break Time has a Valid Break Time (More than 0)
     * @return bool 
     */
    public function hasValidBreakTime()
    {
        return ( is_valid( $this->break_time ) && $this->break_time > 0 ) ? true : false;
    }

    /**
     *  Checks if the current DTR's Time Logs Underlapped from the Previous Day.
     */
    public function hasUnderlappedTimeLogs(){
        return ( $this->hasValidTimelogs() && 
                 timestamp_to_date( $this->time_in ) == timestamp_to_date( subtract_days_from_timestamp( $this->date, 1 ))
               ) ? true : false;
               
                //  Old Code:
                //  timestamp_to_date( $this->time_in ) != timestamp_to_date( $this->time_out ) ) ? true : false;
    }

    /**
     *  Checks if the current DTR's Time Logs overlapped on the Next Day.
     */
    public function hasOverlappedTimeLogs(){
        return ( $this->hasValidTimelogs() && 
                 timestamp_to_date( $this->time_out ) == timestamp_to_date(add_days_to_timestamp( $this->date, 1 ))
               ) ? true : false;
               
                //  Old Code:
                //  timestamp_to_date( $this->time_in ) != timestamp_to_date( $this->time_out ) ) ? true : false;
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
     *  Check if the Source Type Tagging is 'rest_day_work'.
     * @return bool 
     */
    public function isRestDayWork()
    {
        return ( $this->source_type_tagging == 'rest_day_work' ) ? true : false;
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

    /**
     * 
     *  Check if the Time-In is BEFORE or EQUAL the Start-Datetime
     * @return bool 
     */
    public function isTimedInBeforeSchedule()
    {
        return ( $this->time_in <= $this->start_datetime ) ? true : false;
    }

    /**
     * 
     *  Check if the Time-In is:
     *  - BETWEEN the Start-Datetime and Start-Flexy-Datetime if FLEXIBLE
     *  - BEYOND or EQUAL the Start-Datetime if STANDARD
     * 
     * @return bool 
     */
    public function isTimedInBetweenSchedule()
    {
        return ( ($this->hasFlexibleSchedule() &&
                  $this->time_in > $this->start_datetime && 
                  $this->time_in < $this->start_flexy_datetime) 
                ||
                 (!$this->hasFlexibleSchedule() &&
                  $this->time_in >= $this->start_datetime) 
               ) ? true : false;
    }
    
    /**
     * 
     *  Check if the Time-In is AFTER or EQUAL the Start-Flexy-Datetime.
     * @return bool 
     */
    public function isTimedInAfterSchedule()
    {
        return ( $this->time_in >= $this->start_flexy_datetime ) ? true : false;
    }

    /**
     * 
     *  Check if the Time-Out is BEFORE or EQUAL the End-Datetime
     * @return bool 
     */
    public function isTimedOutBeforeSchedule()
    {
        return ( $this->time_out <= $this->end_datetime ) ? true : false;
    }

    /**
     * 
     *  Check if the Time-Out is:
     *  - BETWEEN the End-Datetime and End-Flexy-Datetime if FLEXIBLE
     *  - BEYOND or EQUAL the End-Datetime if STANDARD
     * 
     * @return bool 
     */
    public function isTimedOutBetweenSchedule()
    {
        return ( ($this->hasFlexibleSchedule() &&
                  $this->time_out > $this->end_datetime && 
                  $this->time_out < $this->end_flexy_datetime) 
                ||
                 (!$this->hasFlexibleSchedule() &&
                  $this->time_out >= $this->end_datetime) 
               ) ? true : false;
    }

    /**
     * 
     *  Check if the Time-Out is:
     *  - BEYOND or EQUAL the End-Flexy-Datetime if FLEXIBLE
     *  - BEYOND or EQUAL the End-Datetime if STANDARD
     * 
     * @return bool 
     */
    public function isTimedOutAfterSchedule()
    {
        return ( ($this->hasFlexibleSchedule() &&
                  $this->time_out >= $this->end_flexy_datetime)
                ||
                 (!$this->hasFlexibleSchedule() &&
                  $this->time_out >= $this->end_datetime) 
                ) ? true : false;
    }


    /**
     * 
     *  Gets the Expected Time In base from the Start Datetime and Start Flexy Datetime.
     * @return timestamp|0 
     */
    public function getExpectedTimeIn()
    {
        $expected_time_in = 0;

        # If the Flexy Start Date has value, use it as an Expected Time In. (Flexible)
        if( is_valid( $this->start_flexy_datetime ) ){
            $expected_time_in = $this->start_flexy_datetime;

        # else, If the Start Date has value, use it as an Expected Time In. (Standard)
        } elseif( is_valid( $this->start_datetime ) ){
            $expected_time_in = $this->start_datetime;
        }

        return $expected_time_in;
    }

    /**
     * 
     *  Gets the Rendered Time base from the Time-in and Time-out
     * @return timestamp 
     */
    public function getTotalRenderedTime()
    {
        return ( $this->hasValidTimelogs() ) ? (int) $this->time_out - $this->time_in : 0;
    }


    /**
     * 
     *  Gets the Required Time base from the Start-Datetime and End-Datetime
     * @return timestamp 
     */
    public function getRequiredTime()
    {
        return ( $this->hasSchedule() ) ? (int) $this->end_datetime - $this->start_datetime : 0;
    }

    /**
     *  Gets the Required Half Day time base from the Start-Datetime and End-Datetime (Subtracts the Break Time)
     * @return timestamp
     */
    public function getRequiredHalfDayTime()
    {
        # Gets the Half Day Time by dividing the Required Time by 2 and subtracting the divided Break time by 2 from it.
        return ( ( $this->getRequiredTime() / 2 ) - ( $this->break_time / 2 ) );
    }


    /**
     *  Gets DTR Type of the DTR wether it's a Regular, Rest Day, or Holiday
     * @return string
     */
    public function getDtrType(){

        $type = '';

        $holiday_collection = $this->holidays()->get();

        if( count($holiday_collection) > 0 ){

            foreach( $holiday_collection as $holiday ) {
                
                if( is_valid($type) ){

                    switch( $type ) {
                        case get_constant('DTR_TYPE.holiday.legal'):

                            switch( $holiday->type ){
                                
                                case get_constant('DTR_TYPE.holiday.legal'):
                                    $type = get_constant('DTR_TYPE.holiday.double_legal');
                                    break;

                                case get_constant('DTR_TYPE.holiday.special'):
                                    $type = get_constant('DTR_TYPE.holiday.special_legal');
                                    break;
                            }

                            break;

                        case get_constant('DTR_TYPE.holiday.special'):

                            switch( $holiday->type ){
                                
                                case get_constant('DTR_TYPE.holiday.special'):
                                    $type = get_constant('DTR_TYPE.holiday.double_special');
                                    break;

                                case get_constant('DTR_TYPE.holiday.legal'):
                                    $type = get_constant('DTR_TYPE.holiday.special_legal');
                                    break;
                            }
                            break;
                    }

                } else {
                    $type = $holiday->type;
                }
            }

        }elseif( $this->is_rest_day && $this->source_type_tagging == get_constant('DTR_SOURCE_TYPE_TAGGING.rest_day_work') ){
            $type = get_constant('DTR_TYPE.rest_day');

        }else{
            $type = get_constant('DTR_TYPE.regular');
        }     
        return $type;
    }


    

    /**
     *  Gets the Best Schedule of the DTR base from the existing schedules
     * @return string
     */
    public function getBestSchedule(){

        $user = $this->user()->first();

        # Fetch the Default Schedule for the current User.
        $default_schedule = $user->defaultSchedule()->first();

        # Fetch the Temporary Schedule for the current User within the Date
        $temporary_schedule = $user->temporarySchedules( $this->date )
                                    ->orderBy('updated_at', 'DESC')
                                    ->get()
                                    ->first();

        # Fetch the Change Schedule for the current User within the Date
        $change_schedule = $user->changeSchedules( $this->date )
                                ->orderBy('updated_at', 'DESC')
                                ->get()
                                ->first();

        if($change_schedule != null){
            $change_schedule = $change_schedule->schedule()->first();
        }


        # Setting the Schedule that would be used for that specific Day.
        # Heirarchy: Temporary Schedule > Change Schedule > Default Schedule
        $schedule = ( is_valid( $temporary_schedule ) ? $temporary_schedule : 
                        ( is_valid( $change_schedule ) ? $change_schedule : $default_schedule ) );

        # If Temporary and Change Schedule exists, and Change Schedule is more latest than Temporary, use the Change Schedule as the Best Schedule
        if( is_valid( $temporary_schedule ) && is_valid( $change_schedule ) && $change_schedule->updated_at->gt($temporary_schedule->updated_at) ) {
            $schedule = $change_schedule;
        }
        
        return $schedule;
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
     * hasMany Relationship for DTR Payroll Items Model that are tagged as Underlapped.
     */
    public function underlapped_payroll_items(){
        return  $this->hasMany(DtrPayrollItems::class)->where([
            'tag' => get_constant('PAYROLL_ITEM_TAGS.underlapped')
        ]);
    }

    
    /**
     * hasMany Relationship for DTR Payroll Items Model that are tagged as Overlapped.
     */
    public function overlapped_payroll_items(){
        return  $this->hasMany(DtrPayrollItems::class)->where([
            'tag' => get_constant('PAYROLL_ITEM_TAGS.overlapped')
        ]);
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
    
    
    /**
     * hasMany Relationship for Dtr Leaves model
     */
    public function on_leave(){
        return $this->hasMany(Leave::class)->where( 'status' , 'approved' )->count();
    } 
    
    /**
     * hasOne Relationship for Previous Dtr Model
     */
    public function previous_dtr(){
        return $this->hasOne(Dtr::class, 'user_id', 'user_id')->where([
            'date' => timestamp_to_date( subtract_days_from_timestamp( $this->date, 1 ) )
        ]);
    }

    /**
     * hasOne Relationship for Next Dtr Model
     */
    public function next_dtr(){
        return $this->hasOne(Dtr::class, 'user_id', 'user_id')->where([
            'date' => timestamp_to_date( add_days_to_timestamp( $this->date, 1 ) )
        ]);
    }


    /**
     * hasOne Relationship for the Alter Log
     */
    public function alter_log(){
        return $this->hasOne(AlterLog::class, 'user_id', 'user_id')->where([
            'date' => $this->date
        ]);
    }


    /**
     * hasOne Relationship for the Overtime
     */
    public function overtime(){
        return $this->hasOne(Overtime::class, 'user_id', 'user_id')->where([
            'date' => $this->date
        ]);
    }

    /**
     * hasOne Relationship for the Change of Schedule
     */
    public function change_schedule(){
        return $this->hasOne(ChangeSchedule::class, 'user_id', 'user_id')->whereRaw(
            "( '". $this->date ."' BETWEEN valid_from AND valid_to )"
        );
    }

    /**
     * hasOne Relationship for the RestDayWork
     */
    public function rest_day_work(){
        return $this->hasOne(RestDayWork::class, 'user_id', 'user_id')->where([
            'date' => $this->date
        ]);
    }


}
