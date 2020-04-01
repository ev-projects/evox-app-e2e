<?php

namespace App\Modules\Payroll\Models;

use Illuminate\Database\Eloquent\Collection;

class Computation
{  
    # Instance of the DTR
    private $dtr;
    
    # The Valid Leave Time & Amount of the specific DTR.
    private $timeoff_time = 0;
    private $timeoff_amount = 0.0;

    # The Expected Work Start and Out Time of the specific DTR.
    private $expected_work_start_datetime = 0;
    private $expected_work_end_datetime = 0;

    # The Expected Night Diff Start and End Time of the specific DTR.
    private $night_diff_start_datetime = 0;
    private $night_diff_end_datetime = 0;

    # The Break Start and End Date of the specific DTR.
    private $break_start_datetime = 0;
    private $break_end_datetime = 0;

    
    private $leaves;
    private $holidays;
    private $policies;

    private $payroll_items = array();

    function __construct( Dtr $dtr ){

        $this->dtr = $dtr;
        
        $this->policies = $dtr->policies()->get();

        $this->leaves = $dtr->leaves()->get();

        $this->holidays = $dtr->holidays()->get();

        $this->set_timeoff();  

        $this->set_expected_work_datetime();

        $this->set_night_diff_datetime();

        $this->set_break_datetime();
    }


    ###############################################################################################
    ##################################### Main function #####################################
    ###############################################################################################

    /**
     *  Main function for triggering the Computation of the DTR Instance.
     */

    public function get_computed_payroll_items(){

        $payroll_items = [];

        # Check if the DTR has Valid Time Logs and has a proper Schedule.
        if( $this->dtr->hasValidTimelogs() && $this->dtr->hasSchedule() ) {

            /**
             *   COMPUTE for Late
             */
            # Checks if the 'allow_late' policy is activated.
            if( $this->check_allowed_policy('allow_late') ) {
                $late_payroll_item = $this->compute_late();
                
                # If the $late_payroll_item is valid, add it on $payroll_items array.
                if( is_valid( $late_payroll_item ) ) {
                    $payroll_items[] = $late_payroll_item;
                }
            }

            /**
             *   COMPUTE for Undertime
             */
            # Checks if the 'allow_undertime' policy is activated.
            if( $this->check_allowed_policy('allow_undertime') ) {
                $undertime_payroll_item = $this->compute_undertime();
                
                # If the $undertime_payroll_item is valid, add it on $payroll_items array.
                if( is_valid( $undertime_payroll_item ) ) {
                    $payroll_items[] = $undertime_payroll_item;
                }
            }

            /**
             *   COMPUTE for Night Diff.
             */
            # Checks if the 'allow_night_diff' policy is activated.
            if( $this->check_allowed_policy('allow_night_diff') ) {
                $night_diff_payroll_item_collection = $this->compute_night_diff();
                
                # If the $night_diff_payroll_item_collection is valid, Iterate it and add each item on $payroll_items array.
                if( is_valid( $night_diff_payroll_item_collection ) ) {
                    foreach( $night_diff_payroll_item_collection as $night_diff_payroll_item ) {
                        $payroll_items[] = $night_diff_payroll_item;
                    }
                }
            }
            

            /**
             *   COMPUTE for Rendered Hours
             */ 
            $payroll_items[] = new DtrPayrollItems([
                'item'  => 'rendered_hours',
                'value' => $this->dtr->getRenderedTime()
            ]);
        }
        return $payroll_items;
    }


    ###############################################################################################
    ######################################## Set functions ########################################
    ###############################################################################################

    /**
     *  Responsible for setting the Time-off Values for the current DTR Instance. 
     */
    private function set_timeoff(){
        try{    

            # Iterate the DTR Leave Collection
            foreach( $this->leaves as $leave ) {

                # If the current Iterated Leave is Approved and is a Paid Leave,
                if( $leave->isApproved() && $leave->isPaidLeave() ){
                    $this->timeoff_time      = (int) ( $leave->amount * ( $this->dtr->end_datetime - $this->dtr->start_datetime - $this->dtr->break_time ) );
                    $this->timeoff_amount    = (float) $leave->amount;
                    return true;
                }
            }

            return false;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for setting the expected Work Time In and Out base on the Schedule and Time In & Out of the DTR instance.
     */
    private function set_expected_work_datetime(){

        # If Schedule applied on the DTR is Standard only
        if( ! $this->dtr->hasFlexibleSchedule() ) { 

            $this->expected_work_start_datetime  =   $this->dtr->start_datetime;
            $this->expected_work_end_datetime    =   $this->dtr->end_datetime;

        # If Schedule applied on the DTR is Flexible/Customized only
        } else {
             
            # If the Time-In is BEFORE or EQUAL the Start-Datetime
            if( $this->dtr->isTimedInBeforeSchedule() ){

                $this->expected_work_start_datetime  =   $this->dtr->start_datetime;
                $this->expected_work_end_datetime    =   $this->dtr->end_datetime;
            
            # If the Time-In is BETWEEN the Start-Datetime and Start-Flexy-Datetime
            }elseif( $this->dtr->isTimedInBetweenSchedule() ){

                $this->expected_work_start_datetime  =   $this->dtr->time_in;
                $this->expected_work_end_datetime    =   $this->dtr->time_in + $this->dtr->getRequiredTime();
            
            # If the Time-In is AFTER or EQUAL the Start-Flexy-Datetime
            } elseif ( $this->dtr->isTimedInAfterSchedule() ){
                
                $this->expected_work_start_datetime  =   $this->dtr->start_flexy_datetime;
                $this->expected_work_end_datetime    =   $this->dtr->end_flexy_datetime;
            }

        }

    }

    /**
     *  Responsible for setting the Night Differential Start & End Date base on the Schedule and Time In & Out of the DTR instance.
     */
    private function set_night_diff_datetime(){
        
        /**
         *      Night Diff. Time Duration 10PM - 6AM
         */

        # If the Work Start-Datetime is after the Date @ 6AM, set the Night Diff. for later until tomorrow. (10PM - 6AM)
        if( add_time_to_timestamp( $this->dtr->date, get_constant('PAYROLL_NIGHT_DIFF_TIME.end') ) < $this->expected_work_start_datetime ){

            # Sets the Date's start of Night Diff. Time (10PM of the current date.)
            $this->night_diff_start_datetime    = add_time_to_timestamp( $this->dtr->date, get_constant('PAYROLL_NIGHT_DIFF_TIME.start') );   

            # Sets the Date's End of Night Diff. Time (6AM of the next day.)
            $this->night_diff_end_datetime      = add_time_to_timestamp( add_days_to_timestamp( $this->dtr->date, 1 ) , get_constant('PAYROLL_NIGHT_DIFF_TIME.end') );

        # If the Work Start-Datetime is before the Date @ 6AM, set the Night Diff. for yesterday until today. (10PM - 6AM)
        }else{

            # Sets the Date's start of Night Diff. Time (10PM of the date yesterday.)
            $this->night_diff_start_datetime    = add_time_to_timestamp( subtract_days_from_timestamp( $this->dtr->date, 1 ) , get_constant('PAYROLL_NIGHT_DIFF_TIME.start') );   

            # Sets the Date's End of Night Diff. Time (6AM of the current day.)
            $this->night_diff_end_datetime      = add_time_to_timestamp( $this->dtr->date, get_constant('PAYROLL_NIGHT_DIFF_TIME.end') );   

        }
    }

    /**
     *  Responsible for setting the Break Time-In and Out base on the Schedule and Time In & Out of the DTR Instance.
     */
    private function set_break_datetime(){

        # Checks if the Break Time of the current DTR instance is more than 0.
        // if( $this->dtr->hasValidBreakTime() ) {

            # Gets the Break Start-Datetime by dividing the Required Time by 2 and subtracting the divided Break time by 2 from it.
            $this->break_start_datetime = $this->expected_work_start_datetime + $this->dtr->getRequiredHalfDayTime();
            
            # Gets the Break End-Datetime by adding the total Break Time from the Break Start-Datetime.
            $this->break_end_datetime = $this->break_start_datetime +  $this->dtr->break_time;
        // }
    }

    ###############################################################################################
    #################################### Computation functions ####################################
    ###############################################################################################


    /**
     *  Responsible for Computing the Late of the current DTR Instance.
     *   
     * @return DtrPayrollItem|null
     */
    private function compute_late(){
        try{    
            $late = 0;    

            # Get the Expected TimeIn
            $expected_time_in = $this->dtr->getExpectedTimeIn();
            
            # If the Time-In exceeds the Expected Time-In, Compute for the Difference of Time-In - Expected Time-In.
            if( $this->dtr->time_in > $expected_time_in ){
                $late = $this->dtr->time_in - $expected_time_in;
            }

            # Subtracts the Time-off from the total computed Late.
            $late = $late - $this->timeoff_time;

            # Double checks the Validity of the Computed Late. If not valid, set it to Default value (0)
            # 1. If Late LESS THAN 0 (Negative values)
            # 2. If Late is GREATHER THAN 8 hours.
            # 3. If the Time-off from the Leave is on Half-day (0.5)
            if($late < 0 || $late > get_constant('TIMESTAMP.eight_hours') || $this->timeoff_amount == 0.5 ){
                $late = 0;
            }

            return ( $late > 0 ) ? new DtrPayrollItems([
                                            'item'  => 'late',
                                            'value' => $late
                                        ]) : null;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }
    
    /**
     *  Responsible for Computing the Undertime of the current DTR Instance.
     *   
     * @return DtrPayrollItem|null
     */
    private function compute_undertime(){
        try{    
            $undertime = 0;
                    
            # Get the Rendered Time (Time-Out - Time-in)
            $rendered_time = $this->dtr->getRenderedTime();

            # Get the Required Time (Start-Datetime - End-Datetime)
            $required_time = $this->dtr->getRequiredTime();
            

            # If Schedule applied on the DTR is Standard only
            if( ! $this->dtr->hasFlexibleSchedule() ) {

                # If the Time-Out is BEFORE the End-Datetime, compute for Undertime
                if(  $this->dtr->time_out < $this->dtr->end_datetime ){
                    $undertime = $this->dtr->end_datetime - $this->dtr->time_out;
                }
                
            # If Schedule applied on the DTR is Flexible/Customized only
            } else {
                
                $expected_time_out = 0;

                # If the Time-In is BEFORE or EQUAL the Start-Datetime
                if( $this->dtr->isTimedInBeforeSchedule() ){

                    # Sets the Expected Time-Out to the End-Datetime
                    $expected_time_out = $this->dtr->end_datetime;

                    # If the Time-Out is BEFORE the Expected Time-Out, compute for Undertime..
                    if( $this->dtr->time_out < $expected_time_out ){
                      $undertime = $expected_time_out - $this->dtr->time_out;
                    }

                # If the Time-In is BETWEEN the Start-Datetime and Start-Flexy-Datetime
                }elseif( $this->dtr->isTimedInBetweenSchedule() ){

                    # If the Required Time is HIGHER than the Rendered time, compute for Undertime.
                    if( $required_time > $rendered_time ){
                        $undertime = $required_time - $rendered_time;
                    }

                # If the Time-In is AFTER or EQUAL the Start-Flexy-Datetime
                } elseif ( $this->dtr->isTimedInAfterSchedule() ){

                    # Sets the Expected Time-Out to the End-Flexy-Datetime
                    $expected_time_out = $this->dtr->end_flexy_datetime;

                    # If the Time-Out is BEFORE the Expected Time-Out, compute for Undertime.
                    if( $this->dtr->time_out < $expected_time_out ){
                      $undertime = $expected_time_out - $this->dtr->time_out;
                    }
                }

            }

            # If the Time-off from the Leave is on Half-day (0.5)
            if( $this->timeoff_amount == 0.5 ) {

                # If the Rendered Time is LESSER than the Half-day Time-off, compute for Undertime.
                if( $rendered_time <= $this->timeoff_time ) {
                    $undertime = $this->timeoff_time - $rendered_time;

                # If not, set the Undertime default to zero (For cases like, Timeoff = 4:00 Hrs & Rendered Time = 4:01 Hrs)
                # No undertime for exceeded Rendered Time.
                } else {
                    $undertime = 0;
                }

            # If the Time-off from the Leave is Wholeday or Non-existing, compute for the Undertime.
            }else{
                $undertime = $undertime - $this->timeoff_time;
            }

            # Double checks the Validity of the Computed Undertime. If not valid, set it to Default value (0)
            # 1. If Undertime LESS THAN 0 (Negative values)
            # 2. If Undertime is GREATHER THAN 8 hours.
            if( $undertime < 0 || $undertime > get_constant('TIMESTAMP.eight_hours') ){
                $undertime = 0;
            }
            
            return ( $undertime > 0 ) ? new DtrPayrollItems([
                                            'item'  => 'undertime',
                                            'value' => $undertime
                                        ]) : null;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for Computing the Night Diff. of the current DTR Instance.
     *  Night Diff.             - The computed Night Diff. for the current Day of the DTR.
     *  Night Diff. Overlapped  - The computed Night Diff. for the next Day of the DTR.
     *   
     * @return Collection $dtr_payroll_item_collection (DtrPayrollItem)
     */
    private function compute_night_diff(){
        try{    

            $dtr_payroll_item_collection = new Collection();
            $night_diff = 0;
            $night_diff_overlapped = 0;
            

            /**
             *       Computation of the Night Diff. - START
             */
                # If the DTR has Overlapped time Logs (Ex. Time-In is Day 1 and Time-Out is Day 2), compute Separately for Night Diff. and Overlapped Night Diff.
                if( $this->dtr->hasOverlappedTimeLogs() ) { 
                    
                    # Compute the Night Diff. of Day 1 by setting the (Time Start = Time-In) and (Time End = 12 Midnight of the Next Day).
                    $night_diff = $this->get_total_night_diff([
                        'time_start_to_compute'         => $this->dtr->time_in,
                        'time_end_to_compute'           => add_days_to_timestamp( $this->dtr->date, 1),
                        'expected_work_start_datetime'  => $this->expected_work_start_datetime,
                        'expected_work_end_datetime'    => $this->expected_work_end_datetime,
                        'night_diff_start_datetime'     => $this->night_diff_start_datetime,
                        'night_diff_end_datetime'       => $this->night_diff_end_datetime,
                    ]);

                    # Compute the Night Diff. of Day 2 by setting the (Time Start = 12 Midnight of the Next Day) and (Time End = Time-Out).
                    $night_diff_overlapped = $this->get_total_night_diff([
                        'time_start_to_compute'         => add_days_to_timestamp( $this->dtr->date, 1),
                        'time_end_to_compute'           => $this->dtr->time_out,
                        'expected_work_start_datetime'  => $this->expected_work_start_datetime,
                        'expected_work_end_datetime'    => $this->expected_work_end_datetime,
                        'night_diff_start_datetime'     => $this->night_diff_start_datetime,
                        'night_diff_end_datetime'       => $this->night_diff_end_datetime,
                    ]);

                # If the DTR has NO Overlapped time Logs, compute for Night Diff. only between the Time-In and Time-Out.
                } else {

                    $night_diff = $this->get_total_night_diff([
                        'time_start_to_compute'         => $this->dtr->time_in,
                        'time_end_to_compute'           => $this->dtr->time_out,
                        'expected_work_start_datetime'  => $this->expected_work_start_datetime,
                        'expected_work_end_datetime'    => $this->expected_work_end_datetime,
                        'night_diff_start_datetime'     => $this->night_diff_start_datetime,
                        'night_diff_end_datetime'       => $this->night_diff_end_datetime,
                    ]);
                }
            /**
             *        Computation of the Night Diff. - END     
             */


            /**
             *        Computation of the Night Diff. Break Time and Deductions - START     
             */
                # If the DTR has a Valid Break Time and the Rendered Time is more than the (Required Half Day Time + Break Time), Deduct the Break Time.
                if( $this->dtr->hasValidBreakTime() &&
                    $this->dtr->getRenderedTime() > $this->dtr->getRequiredHalfDayTime() + $this->dtr->break_time ){

                    # If the Break Start and End Da te is NOT the same day, compute for Night Diff. Break Time for the Night Diff. and Overlapped Night Diff.
                    if( timestamp_to_date( $this->break_start_datetime ) != timestamp_to_date( $this->break_end_datetime )) {
                            
                            # Compute Night Diff. Break Time for Day 1 by setting the (Time Start = Break Start-Datetime) and (Time End = 12 Midnight of the Next Day).
                            $night_diff_break_time = $this->get_total_night_diff([
                                'time_start_to_compute'         => $this->break_start_datetime,
                                'time_end_to_compute'           => add_days_to_timestamp( $this->dtr->date, 1),
                                'expected_work_start_datetime'  => $this->expected_work_start_datetime,
                                'expected_work_end_datetime'    => $this->expected_work_end_datetime,
                                'night_diff_start_datetime'     => $this->night_diff_start_datetime,
                                'night_diff_end_datetime'       => $this->night_diff_end_datetime,
                            ]);

                            # Compute Night Diff. Break Time for Day 2 by setting the (Time Start = 12 Midnight of the Next Day) and (Time End = Break End-Datetime).
                            $night_diff_overlapped_break_time = $this->get_total_night_diff([
                                'time_start_to_compute'         => add_days_to_timestamp( $this->dtr->date, 1),
                                'time_end_to_compute'           => $this->break_end_datetime,
                                'expected_work_start_datetime'  => $this->expected_work_start_datetime,
                                'expected_work_end_datetime'    => $this->expected_work_end_datetime,
                                'night_diff_start_datetime'     => $this->night_diff_start_datetime,
                                'night_diff_end_datetime'       => $this->night_diff_end_datetime,
                            ]);

                            # Deduct the computed Break Times respectively.
                            $night_diff             -= $night_diff_break_time;
                            $night_diff_overlapped  -= $night_diff_overlapped_break_time;

                    # If the Break Start and End Date is the same day, compute for Night Diff. Break Time and deduct it on the correct Date.
                    # Break Start-Datetime will represent the Break Date.
                    }else{

                        $night_diff_break_time = $this->get_total_night_diff([
                            'time_start_to_compute'         => $this->break_start_datetime,
                            'time_end_to_compute'           => $this->break_end_datetime,
                            'expected_work_start_datetime'  => $this->expected_work_start_datetime,
                            'expected_work_end_datetime'    => $this->expected_work_end_datetime,
                            'night_diff_start_datetime'     => $this->night_diff_start_datetime,
                            'night_diff_end_datetime'       => $this->night_diff_end_datetime,
                        ]);
                        
                        # If the Time-In has the SAME DAY from the Break Date, deduct it from the Night. Diff. (Day 1)
                        if( timestamp_to_date( $this->dtr->time_in ) == timestamp_to_date( $this->break_start_datetime ) ) {
                            $night_diff -= $night_diff_break_time;

                        # If the DTR has Overlapped Time Logs AND Time-Out has the SAME DAY from the Break Date, deduct it from the Night. Diff. Overlapped (Day 2)
                        }elseif( $this->dtr->hasOverlappedTimeLogs() &&
                                timestamp_to_date( $this->dtr->time_out ) == timestamp_to_date( $this->break_start_datetime ) ) {
                            $night_diff_overlapped  -= $night_diff_break_time;
                        }
                    }
                }
            /**
             *        Computation of the Night Diff. Break Time and Deductions - START     
             */


            # Double checks the Validity of the Computed Night Diff. If not valid, set it to Default value (0)
            # 1. If Night Diff LESS THAN 0 (Negative values)
            # 2. If Night Diff is GREATHER THAN 8 hours.
            if( $night_diff < 0 || $night_diff > get_constant('TIMESTAMP.eight_hours') ){
                $night_diff = 0;
            }
            
            # Double checks the Validity of the Computed Overlapped Night Diff. If not valid, set it to Default value (0)
            # 1. If Overlapped Night Diff LESS THAN 0 (Negative values)
            # 2. If Overlapped Night Diff is GREATHER THAN 8 hours.
            if( $night_diff_overlapped < 0 || $night_diff_overlapped > get_constant('TIMESTAMP.eight_hours') ){
                $night_diff_overlapped = 0;
            }


            # Checks if the Night Diff. has valid Data before appedning it on the Collection.
            if( $night_diff > 0 ) {
                $dtr_payroll_item_collection->push( new DtrPayrollItems([
                    'item'  => 'night_diff',
                    'value' => $night_diff
                ]) );
            }

            # Checks if the Night Diff. has valid Data before appedning it on the Collection.
            if( $night_diff_overlapped > 0 ) {
                $dtr_payroll_item_collection->push( new DtrPayrollItems([
                    'item'  => 'night_diff_overlapped',
                    'value' => $night_diff_overlapped
                ]) );
            }

            return $dtr_payroll_item_collection;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }


    ###############################################################################################
    ##################################### General functions ####################################
    ###############################################################################################

    /**
     *  A general function responsible for getting the Night Diff. Range with the Given Parameters.
     */
    private function get_total_night_diff( $parameters ){

        $total_night_diff = 0;

        # Sets the Start-Datetime to be measured for Night Diff.
        $to_measure_start_datetime   = ( $parameters['time_start_to_compute'] > $parameters['expected_work_start_datetime'] ) ? $parameters['time_start_to_compute'] : $parameters['expected_work_start_datetime'];
        
        # Sets the End-Datetime to be measured for Night Diff.
        $to_measure_end_datetime     = ( $parameters['time_end_to_compute'] < $parameters['expected_work_end_datetime'] ) ? $parameters['time_end_to_compute'] : $parameters['expected_work_end_datetime'];
        

        # If the Start-Datetime is between the Night Diff. Date Range
        if( $to_measure_start_datetime >= $parameters['night_diff_start_datetime']  && 
            $to_measure_start_datetime <= $parameters['night_diff_end_datetime'] ){

            # If the End-Datetime is more than the Night Diff. End-Datetime, Get the Difference between Night Diff. End-Datetime and Start-Datetime.
            if( $to_measure_end_datetime >= $parameters['night_diff_end_datetime']){
                $total_night_diff =  $parameters['night_diff_end_datetime'] -  $to_measure_start_datetime;

            # If not, get the difference between the Start and End Datetime
            }else{
                $total_night_diff =   $to_measure_end_datetime -  $to_measure_start_datetime ;
            }
                
        # If the End-Datetime is between the Night Diff. Date Range
        }elseif( $to_measure_end_datetime >= $parameters['night_diff_start_datetime']  &&  
                 $to_measure_end_datetime <= $parameters['night_diff_end_datetime']){

            # If the Start-Datetime is less than the Night Diff. Start-Datetime, Get the Difference between End-Datetime and Night Diff. Start-Datetime.
            if( $to_measure_start_datetime <= $parameters['night_diff_start_datetime'] ){
                $total_night_diff =   $to_measure_end_datetime - $parameters['night_diff_start_datetime'] ;

            # If not, get the difference between the Start and End Datetime
             }else{
                $total_night_diff =   $to_measure_end_datetime -  $to_measure_start_datetime ;
            }

        # If the Start and End-Datetime is outside the Night Diff. Date range, get the Difference between the Night Diff. Date  Range ( Complete 8 hours )
        }else{
            
            if( $to_measure_start_datetime < $parameters['night_diff_start_datetime'] &&  
                $to_measure_end_datetime   > $parameters['night_diff_end_datetime'] ){
                $total_night_diff =  $parameters['night_diff_end_datetime'] - $parameters['night_diff_start_datetime'];
            }
        }

        return $total_night_diff;
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
    private function check_allowed_policy( $policy_name ) {
        return $this->policies->contains(function ($policy) use ($policy_name) {
            return $policy->policy ==  $policy_name && $policy->value == "1";
        });
    }

}
