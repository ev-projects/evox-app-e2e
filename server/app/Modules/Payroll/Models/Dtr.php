<?php

namespace App\Modules\Payroll\Models;

use App\Modules\User\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Model;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\Overtime;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\Request\Models\RestDayWork;
use Spatie\Activitylog\Traits\LogsActivity;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Modules\Request\Models\ChangeSchedule;

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
        // && $this->time_out > $this->time_in logic for has valid time logs
        return ( $this->hasCompleteTimelogs() ) ? true : false;
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
     *  Check if the current DTR has a value
     * @return bool 
     */
    public function hasLog()
    {
        return ( !is_null( $this->time_in ) || !is_null( $this->time_out ) ) ? true : false;
    }


    /**
     * 
     *  Check if the current DTR has a value
     * @return bool 
     */
    public function validLogIn()
    {
        return ( !is_null( $this->time_in ) ) ? true : false;
    }


    /**
     * 
     *  Get schedule
     * @return bool 
     */
    public function getSchedule()
    {
        $schedule = array();

        if( $this->hasSchedule() ){
            $schedule[] = date("H:i:s", $this->start_datetime) .  '-' .date("H:i:s", $this->end_datetime );
            if( $this->hasFlexibleSchedule() ){
                $schedule[] = date("H:i:s", $this->start_flexy_datetime) .  '-' .date("H:i:s", $this->end_flexy_datetime );
            }
        }

        return  $schedule;
    }


        /**
     * 
     *  Get schedule
     * @return bool 
     */
    public function getStartSchedule()
    {
        $schedule = array();

        if( $this->hasSchedule() ){
            $schedule[] = date("H:i:s", $this->start_datetime) .  '-' .date("H:i:s", $this->end_datetime );
        }

        return  $schedule;
    }

    /**
     * 
     *  Check if the employee has flexi sched
     * @return bool 
     */
    public function onTimeLog()
    {
        if($this->hasSchedule()){
            $late = $this->policies()->where('policy','=','allow_late')->where('value','=','1')->get()->count() > 0;
            $undertime = $this->policies()->where('policy','=','allow_undertime')->where('value','=','1')->get()->count() > 0;

            if( $late &&  $undertime){
                if( $this->time_in <= $this->start_datetime && $this->time_out >= $this->end_datetime ){
                    return true;
                }elseif( $this->hasFlexibleSchedule() ){
                    if(  $this->time_in >= $this->start_datetime && $this->time_in <= $this->start_flexy_datetime ){
                        $expected_out = $this->time_in  + ( $this->end_datetime - $this->start_datetime );
        
                        if($expected_out > $this->end_flexy_datetime ){
                            $expected_out = $this->end_flexy_datetime;
                        }
        
                    }else{
                        return false;
                    }
                    
                    if( $expected_out <= $this->time_out ){
                        return true;
                    }else{
                        return false;
                    }
                }
            }else{
                if( $this->validLog() ){
                    return true;
                }
            }
        }
        
        return false;
        
    }


    /**
     * 
     *  Check if the employee clock in on time
     * @return bool 
     */
    public function isOntime()
    {
        $late = $this->policies()->where('policy','=','allow_late')->where('value','=','1')->get()->count() > 0;

        if($late){
            if(is_valid( $this->time_in)){
                if( $this->time_in <= $this->start_datetime ){
                    return true;
                }elseif( $this->hasFlexibleSchedule() ){
                    if(  $this->time_in >= $this->start_datetime && $this->time_in <= $this->start_flexy_datetime ){
                        return true;
                    }
                    return false;
                }
            }
        }else{
            if($this->hasLog()){
                return true;
            }
        }
        

        return false;
    }

    /**
     * 
     *  Check if the employee is has undertime
     * @return bool 
     */
    public function checkUndertime()
    {
        $undertime = $this->policies()->where('policy','=','allow_undertime')->where('value','=','1')->get()->count() > 0;

        if( $undertime ){
            if( $this->time_out <= $this->end_datetime ){
                return true;
            }elseif( $this->hasFlexibleSchedule() ){
                if(  $this->time_in >= $this->start_datetime && $this->time_in <= $this->start_flexy_datetime ){
                    $expected_out = $this->time_in  + ( $this->end_datetime - $this->start_datetime );

                    if($expected_out > $this->end_flexy_datetime ){
                        $expected_out = $this->end_flexy_datetime;
                    }

                    if( $expected_out > $this->time_out ){
                        return true;
                    }else{
                        return false;
                    }
                }
            }else{
                return false;
            }
        }

        return false;
    }


    public function isIncompleteLog(){
        return ( !is_valid( $this->time_in ) && is_valid( $this->time_out ) );
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
    public function getDtrType($isPayroll = False){

        $type = '';

        $holiday_collection = $this->holidays()->get();
        
        if( count($holiday_collection) > 0 ){ 
            
            foreach( $holiday_collection as $holiday ) {
                
                // If the $type has already been set and there's more than 1 holiday on the iteration
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

                // If the $type is not yet set
                } else {
                    $allow_legal_holiday_policy = $this->get_policy_value( 'allow_legal_holiday' );
                    $allow_special_holiday_policy = $this->get_policy_value( 'allow_special_holiday' );

                    // If the current Holiday type is allowed by the DTR Policy, set the $type
                    if( ($holiday->type == get_constant('DTR_TYPE.holiday.legal') &&
                        ($allow_legal_holiday_policy === null || $allow_legal_holiday_policy == true )) 
                        || 
                        ($holiday->type == get_constant('DTR_TYPE.holiday.special') &&
                        ($allow_special_holiday_policy === null ||  $allow_special_holiday_policy == true )) 
                    ) {

                        $type = $holiday->type;
                    }
                }
            }
        }

        // If the $type is not yet set, proceed on checking if the type is Rest day or Regular
        if( ! is_valid( $type ) ) {
            if( $isPayroll ){
                if( $this->is_rest_day && $this->source_type_tagging  == get_constant('REQUEST_TYPES.rest_day_work')){
                    $type = get_constant('DTR_TYPE.rest_day'); 
                }else{
                    $type = get_constant('DTR_TYPE.regular');
                }  
            }else{
                if( $this->is_rest_day ){
                    $type = get_constant('DTR_TYPE.rest_day');
        
                }else{
                    $type = get_constant('DTR_TYPE.regular');
                }  
            }

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
     * get 
     */
    public function get_summary_row(){
       
        return DB::table('drt_summary_report')
        ->select(DB::raw("unpaid_leave as ul,reg_late as late,reg_undertime as undertime,
        ((reg_rendered_hours + rd_rendered_hours + sh_rendered_hours + lh_rendered_hours + dlh_rendered_hours + dsh_rendered_hours + slh_rendered_hours) + IF(nigdiff_stauts=1,reg_rendered_hours_overlapp
        + rd_rendered_hours_overlapp + lh_rendered_hours_overlapp + sh_rendered_hours_overlapp + dlh_rendered_hours_overlapp + dsh_rendered_hours_overlapp + slh_rendered_hours_overlapp,0)) 
        - (reg_night_diff + rd_night_diff + sh_night_diff + lh_night_diff + dlh_night_diff + dsh_night_diff + slh_night_diff + IF(nigdiff_stauts=1,reg_night_diff_overlapp
        + rd_night_diff_overlapp + lh_night_diff_overlapp + sh_night_diff_overlapp + dlh_night_diff_overlapp + dsh_night_diff_overlapp + slh_night_diff_overlapp,0)) as rendered_hours,
        (reg_night_diff + rd_night_diff + sh_night_diff + lh_night_diff + dlh_night_diff + dsh_night_diff + slh_night_diff) + IF(nigdiff_stauts=1,reg_night_diff_overlapp
        + rd_night_diff_overlapp + lh_night_diff_overlapp + sh_night_diff_overlapp + dlh_night_diff_overlapp + dsh_night_diff_overlapp + slh_night_diff_overlapp,0) as night_diff,
        (reg_overtime + rd_overtime + sh_overtime + lh_overtime + dlh_overtime + dsh_overtime + slh_overtime)  as overtime,
        (reg_overtime_night_diff + rd_overtime_night_diff + sh_overtime_night_diff + lh_overtime_night_diff + dlh_overtime_night_diff + dsh_overtime_night_diff + slh_overtime_night_diff)  as overtime_night_diff"))
                ->where('login_date', '=' , $this->date )
                ->where('user_id','=',$this->user_id);

        // $this->leftJoin('drt_summary_report', function($join){
        //     $join->on('dtrs.date', '=', 'drt_summary_report.login_date');
        //     $join->on('dtrs.user_id', '=', 'drt_summary_report.user_id');
       
        // })
        // // ->take(3)
        // ->get();
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
     * leaves Type to acronym
     */
    public function leavesToAcronym($simple = false){
        $type = explode(" ",$this->leaves()->get()->first()->type);
        $acronym = "";

        foreach ($type as $w) {
        $acronym .= mb_substr($w, 0, 1);
        }

        if($simple){
            if($acronym == "SL"){
                $acronym = $acronym;
            }else{
                if($this->isUnplanned()){
                    $acronym = "UL";
                }else{
                    $acronym = "VL";
                }
                
            }
        }
        return $acronym;
    }   

    /**
     * leaves Type to acronym
     */
    public function isUnplanned(){
       
        return in_array( $this->leaves()->get()->first()->type, get_constant('UNPLANNED_LEAVE_TYPES')) ? true : false;
    }   
    /**
     * Returns true if has Schedule but has no Valid time logs and if there are no holidays and leaves on that day and the DTR Type is regular.
     */
    public function isAbsent(){
        return !$this->validLog() && 
                    $this->hasSchedule() && 
                    $this->onLeave()->count() <= 0 && 
                    $this->holidays()->count() <= 0 &&
                    $this->checkCurrentTime()  &&
                    ($this->getDtrType() == get_constant('DTR_TYPE.regular') );
    } 


    /**
     * Returns True if the current time is greater than the time in
     */
    public function checkCurrentTime(){
        if($this->hasSchedule()){
            if( $this->hasFlexibleSchedule() ){
                return  $this->start_flexy_datetime  < strtotime("Now");
            }
            return $this->start_datetime < strtotime("Now");
        }
        return True;
    } 


    
    /**
     * Returns DTR Status of a date
     */
    public function getDtrStatus(){
        $status = [];
        $isRestDayHolidayLeave = false; # Late, Absent and Undertime should be displayed on when there's no Rest Day Work, Holiday and Leave 
        if( $this->isRestDay() ){
            if( $this->rest_day_work()->where('status','=','approved')->get()->count() > 0 ){
                $status[] = 'rest_day_work';
            }else{
                $status[] = 'rest_day';
                $isRestDayHolidayLeave = true;
            }
        }

        if( $this->holidays()->get()->count() > 0 ){
            $status[] = 'holiday';
            $isRestDayHolidayLeave = true;
        }
        
        if($this->onLeave()->get()->count() > 0  ){
            $status[] = "on_leave"; 
            $isRestDayHolidayLeave = true;
        }

        # Check if there is schedule
        if( $this->hasSchedule() ){
            if( !$isRestDayHolidayLeave ){
                # Group the Payroll Items and compute the total on the payroll_items array.
                $payroll_items = [];
                foreach( $this->payroll_items()->get() as  $key => $payroll_item){
                    if(isset($payroll_items[ $payroll_item->item ])){
                        $payroll_items[ $payroll_item->item ] += $payroll_item->value;
                    }else{
                        $payroll_items[ $payroll_item->item] = $payroll_item->value;
                    }
                }

                if( $this->isAbsent() ){
                    $status[] = 'absent';
                }elseif( $this->isOntime() ){
                    $status[] = 'early';
                }elseif( isset( $payroll_items['late'] ) && is_valid( $payroll_items['late'] ) ) {
                    $status[] = "late";
                }elseif( isset( $payroll_items['undertime'] ) && is_valid( $payroll_items['undertime'] ) ) {
                    $status[] = "undertime";
                }else{
                    $status[] = '';
                }

            }
        }elseif( !$isRestDayHolidayLeave ){
            $status[] = 'no_schedule';
        }

        return $status;
    } 


    
    /**
     * hasMany Relationship for Dtr Leaves model
     */
    public function onLeave(){
        return $this->hasMany(Leave::class)->where( 'status' , 'approved' )->where( 'type' , '<>' ,'Unpaid Leave' )->where( 'amount' , '>' ,0 );
    }
    
    /**
     * hasMany Relationship for Dtr Leaves model
     */
    public function onUnpaidLeave(){
        return $this->hasMany(Leave::class)->where( 'status' , 'approved' )->where( 'type' , '=' ,'Unpaid Leave' )->where( 'amount' , '>' ,0 );
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


    public function summary_report_short(){
        $payroll_items = [];
        $result = DB::table('drt_summary_report')
            
            ->select(DB::raw("unpaid_leave as ul,reg_late as late,reg_undertime as undertime,
            ((reg_rendered_hours + rd_rendered_hours + sh_rendered_hours + lh_rendered_hours + dlh_rendered_hours + dsh_rendered_hours + slh_rendered_hours) + IF(nigdiff_stauts=1,reg_rendered_hours_overlapp
            + rd_rendered_hours_overlapp + lh_rendered_hours_overlapp + sh_rendered_hours_overlapp + dlh_rendered_hours_overlapp + dsh_rendered_hours_overlapp + slh_rendered_hours_overlapp,0)) 
            - (reg_night_diff + rd_night_diff + sh_night_diff + lh_night_diff + dlh_night_diff + dsh_night_diff + slh_night_diff + IF(nigdiff_stauts=1,reg_night_diff_overlapp
            + rd_night_diff_overlapp + lh_night_diff_overlapp + sh_night_diff_overlapp + dlh_night_diff_overlapp + dsh_night_diff_overlapp + slh_night_diff_overlapp,0)) as rendered_hours,
            (reg_night_diff + rd_night_diff + sh_night_diff + lh_night_diff + dlh_night_diff + dsh_night_diff + slh_night_diff) + IF(nigdiff_stauts=1,reg_night_diff_overlapp
            + rd_night_diff_overlapp + lh_night_diff_overlapp + sh_night_diff_overlapp + dlh_night_diff_overlapp + dsh_night_diff_overlapp + slh_night_diff_overlapp,0) as night_diff,
            (reg_overtime + rd_overtime + sh_overtime + lh_overtime + dlh_overtime + dsh_overtime + slh_overtime)  as overtime,
            (reg_overtime_night_diff + rd_overtime_night_diff + sh_overtime_night_diff + lh_overtime_night_diff + dlh_overtime_night_diff + dsh_overtime_night_diff + slh_overtime_night_diff)  as overtime_night_diff"))
                ->where('login_date', '=' , $this->resource->date )
                ->where('user_id','=',$this->resource->user_id)->get();

            # Convert the time to seconds to 00:00:00 format
            // foreach( $payroll_items as  $key => $value){
            //     $payroll_items[$key] = seconds_to_time($value,true);
            // }
            foreach( $result as  $key => $value){
                $payroll_items["late"] = $value->late > 0 ? seconds_to_time(round($value->late * 3600),true):"";
                $payroll_items["undertime"] = $value->undertime > 0 ? seconds_to_time(round($value->undertime * 3600),true):"";
                $payroll_items["overtime"] = $value->overtime > 0 ? seconds_to_time(round($value->overtime * 3600),true):"";
                $payroll_items["overtime_night_diff"] = $value->overtime_night_diff > 0 ? seconds_to_time(round($value->overtime_night_diff * 3600),true):"";
                $payroll_items["night_diff"] = $value->night_diff > 0 ? seconds_to_time(round($value->night_diff * 3600),true):"";
                $payroll_items[ get_constant('PAYROLL_ITEMS.unpaid_leave')  ] = $value->ul > 0 ? round($value->ul):"";
                $payroll_items["rendered_hours"] = $value->rendered_hours > 0 ? seconds_to_time(round($value->rendered_hours * 3600),true):"";
            }
            return $payroll_items;
    }


    public function get_dtr_history(){ 

        $dtr_history = DtrPunchHistory::where('date',$this->date)->where('user_id',$this->user_id);

        return  $dtr_history;
    }
    

    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################

    /**
     *  Checks if the Policy Name parameter is existing on the DTR's Policy.
     *   
     * @param string $policy_name
     * @return boolean
     */
    public function check_allowed_policy( $policy_name ) {
        return $this->policies()->get()->contains(function ($policy) use ($policy_name) {
            return $policy->policy ==  $policy_name && $policy->value == "1";
        });
    }

    /**
     *  Gets the Policy Value via the Policy Name
     *   
     * @param string $policy_name
     * @return boolean
     */
    public function get_policy_value( $policy_name ) {
        $policy = $this->policies()->where("policy", $policy_name)->first();
        return ( is_valid($policy) ? (bool) $policy->value : null );
    }



}
