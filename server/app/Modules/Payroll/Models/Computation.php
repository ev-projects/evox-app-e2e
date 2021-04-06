<?php

namespace App\Modules\Payroll\Models;

use Illuminate\Database\Eloquent\Collection;
use Exception;

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

    # The Break Start and End Date of the specific DTR.
    private $break_start_datetime = 0;
    private $break_end_datetime = 0;

    # The Actual Time Start and End Datetime of the DTR
    private $actual_time_start_datetime = 0;
    private $actual_time_end_datetime = 0;

    
    private $leaves;
    private $holidays;
    private $policies;

    private $payroll_items = array();

    function __construct(){
    }


    ###############################################################################################
    ##################################### Main function #####################################
    ###############################################################################################

    /**
     *  Main function for triggering the Computation of the DTR Instance.
     */

    public function get_computed_payroll_items( Dtr $dtr ){

        /**
         *  Sets all the Variables needed before computation.
         */

            $this->clear_properties();

            $this->dtr = $dtr;
            
            $this->policies = $dtr->policies()->get();

            $this->leaves = $dtr->leaves()->get();

            $this->holidays = $dtr->holidays()->get();

            $this->set_timeoff();  

            $this->set_expected_work();

            $this->set_break();

            $this->set_actual_time();
        
        /**
         *  Proceed on the Proper computation of the Payroll Items.
         */

        $payroll_items = [];

            
        /**
         *   COMPUTE for Late
         */
        # Checks if the 'allow_late' policy is activated.
        if( $this->dtr->validLogIn() && $this->dtr->hasSchedule() && $this->dtr->holidays()->get()->count() < 1) {
            
            if( $this->check_allowed_policy('allow_late') ) {
                $late_payroll_item = $this->compute_late();
                
                # If the $late_payroll_item is valid, add it on $payroll_items array.
                if( is_valid( $late_payroll_item ) ) {
                    $payroll_items[] = $late_payroll_item;
                }
            }
        }


        # Check if the DTR has Valid Time Logs and has a proper Schedule.
        if( $this->dtr->hasValidTimelogs() && $this->dtr->hasSchedule() ) {
            # Check if the current date is Holiday
            if($this->dtr->holidays()->get()->count() < 1) {

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
             *   COMPUTE for Overtime
             */
            $overtime_payroll_item_collection = $this->compute_overtime();
            
            # If the $overtime_payroll_item_collection is valid, Iterate it and add each item on $payroll_items array.
            if( is_valid( $overtime_payroll_item_collection ) ) {
                foreach( $overtime_payroll_item_collection as $overtime_payroll_item ) {
                    $payroll_items[] = $overtime_payroll_item;
                }
            }
            

            /**
             *   COMPUTE for Rendered Hours
             */ 
            $rendered_time_payroll_item_collection = $this->compute_rendered_time();

            # If the $rendered_time_payroll_item_collection is valid, Iterate it and add each item on $payroll_items array.
            if( is_valid( $rendered_time_payroll_item_collection ) ) {
                foreach( $rendered_time_payroll_item_collection as $rendered_time_payroll_item ) {
                    $payroll_items[] = $rendered_time_payroll_item;
                }
            }
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
    private function set_expected_work(){

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

                if( $this->dtr->end_flexy_datetime < $this->dtr->time_in + $this->dtr->getRequiredTime() ){
                    $this->expected_work_end_datetime    =   $this->dtr->end_flexy_datetime;
                }

            # If the Time-In is AFTER or EQUAL the Start-Flexy-Datetime
            } elseif ( $this->dtr->isTimedInAfterSchedule() ){
                
                $this->expected_work_start_datetime  =   $this->dtr->start_flexy_datetime;
                $this->expected_work_end_datetime    =   $this->dtr->end_flexy_datetime;
            }

        }

    }

    /**
     *  Responsible for setting the Break Time-In and Out base on the Schedule and Time In & Out of the DTR Instance.
     */
    private function set_break(){

        # Checks if the Break Time of the current DTR instance is more than 0.
        // if( $this->dtr->hasValidBreakTime() ) {

            # Gets the Break Start-Datetime by dividing the Required Time by 2 and subtracting the divided Break time by 2 from it.
            $this->break_start_datetime = $this->expected_work_start_datetime + $this->dtr->getRequiredHalfDayTime();
            
            # Gets the Break End-Datetime by adding the total Break Time from the Break Start-Datetime.
            $this->break_end_datetime = $this->break_start_datetime +  $this->dtr->break_time;
        // }
    }

    /**
     *  Reponsible for setting the Actual Time Start and End Datetime of the DTR base on the Schedule and the Time Logs.
     */
    private function set_actual_time(){

        /** Sets the Actual Time Start-Datetime for computing the Rendered Hours. */ 

            # If the Time-In is BEFORE or EQUAL the Expected Work Start-Datetime, use the Expected Work Start-Datetime.
            if( $this->dtr->time_in <= $this->expected_work_start_datetime ) {
                $this->actual_time_start_datetime = $this->expected_work_start_datetime;

            # If the Time-In is BEYOND the Expected Work Start-Datetime, use the DTR's Time-In.
            } else {
                $this->actual_time_start_datetime = $this->dtr->time_in;
            } 

        /** Sets the Actual Time End-Datetime for computing the Rendered Hours. */ 

            # If the Time-Out is BEFORE or EQUAL the Expected Work End-Datetime, use the DTR's Time-Out.
            if( $this->dtr->time_out <= $this->expected_work_end_datetime ) {
                $this->actual_time_end_datetime = $this->dtr->time_out;

            # If the Time-In is BEYOND the Expected Work End-Datetime, use the Expected Work End-Datetime.
            } else {
                $this->actual_time_end_datetime = $this->expected_work_end_datetime;
            } 
    }


    /**
     *  Reponsible for clearing out the Computation Properties
     */
    private function clear_properties(){

        $this->dtr = null;
        $this->timeoff_time = 0;
        $this->timeoff_amount = 0;
        $this->expected_work_start_datetime = 0;
        $this->expected_work_end_datetime = 0;
        $this->break_start_datetime = 0;
        $this->break_end_datetime = 0;
        $this->actual_time_start_datetime = 0;
        $this->actual_time_end_datetime = 0;
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
                                            'item'  => get_constant('PAYROLL_ITEMS.late'),
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
                    
            # Get the Total Rendered Time (Time-Out - Time-in)
            $rendered_time = $this->dtr->getTotalRenderedTime();

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
                                            'item'  => get_constant('PAYROLL_ITEMS.undertime'),
                                            'value' => $undertime
                                        ]) : null;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }



    /**
     *  Responsible for Computing the Night Diff. of the current DTR Instance.
     *  - Break Time will be deducted from Night Diff.
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
            
            # Set the Expected Night Diff Start and End Time of the specific DTR base from the Expected Work Start-Datetime.
            $night_diff_datetime_array = $this->get_night_diff_datetime( $this->expected_work_start_datetime );

            /**
             *       Computation of the Night Diff. - START
             */
                # Discern if the DTR has NO Overlapped time Logs, compute for Night Diff. only between the Time-In and Time-Out.
                if( ! $this->dtr->hasOverlappedTimeLogs() ) { 

                    $night_diff = $this->get_total_night_diff([
                        'time_start_to_compute'         => $this->dtr->time_in,
                        'time_end_to_compute'           => $this->dtr->time_out,
                        'expected_work_start_datetime'  => $this->expected_work_start_datetime,
                        'expected_work_end_datetime'    => $this->expected_work_end_datetime,
                        'night_diff_start_datetime'     => $night_diff_datetime_array['start_datetime'],
                        'night_diff_end_datetime'       => $night_diff_datetime_array['end_datetime'],
                    ]);

                # If the DTR has Overlapped time Logs (Ex. Time-In is Day 1 and Time-Out is Day 2), compute Separately for Night Diff. and Overlapped Night Diff.
                } else {
                    
                    # Discern if the Time In is BEFORE the 12AM of the Next Day, compute for Night Diff. and Night Diff. Overlapped.
                    if( $this->dtr->time_in < add_days_to_timestamp( $this->dtr->date, 1) ) {

                        # Compute the Night Diff. of Day 1 by setting the (Time Start = Time-In) and (Time End = 12 Midnight of the Next Day).
                        $night_diff = $this->get_total_night_diff([
                            'time_start_to_compute'         => $this->dtr->time_in,
                            'time_end_to_compute'           => add_days_to_timestamp( $this->dtr->date, 1),
                            'expected_work_start_datetime'  => $this->expected_work_start_datetime,
                            'expected_work_end_datetime'    => $this->expected_work_end_datetime,
                            'night_diff_start_datetime'     => $night_diff_datetime_array['start_datetime'],
                            'night_diff_end_datetime'       => $night_diff_datetime_array['end_datetime'],
                        ]);
                        
                        # Compute the Night Diff. of Day 2 by setting the (Time Start = 12 Midnight of the Next Day) and (Time End = Time-Out).
                        $night_diff_overlapped = $this->get_total_night_diff([
                            'time_start_to_compute'         => add_days_to_timestamp( $this->dtr->date, 1),
                            'time_end_to_compute'           => $this->dtr->time_out,
                            'expected_work_start_datetime'  => $this->expected_work_start_datetime,
                            'expected_work_end_datetime'    => $this->expected_work_end_datetime,
                            'night_diff_start_datetime'     => $night_diff_datetime_array['start_datetime'],
                            'night_diff_end_datetime'       => $night_diff_datetime_array['end_datetime'],
                        ]);

                    # Discern if the Time In is BEYOND the 12AM of the Next Day, compute for Night Diff. Overlapped only.
                    } else {
                        
                        # Compute the Night Diff. of Day 2 by setting the (Time Start = Time In) and (Time End = Time-Out).
                        $night_diff_overlapped = $this->get_total_night_diff([
                            'time_start_to_compute'         => $this->dtr->time_in,
                            'time_end_to_compute'           => $this->dtr->time_out,
                            'expected_work_start_datetime'  => $this->expected_work_start_datetime,
                            'expected_work_end_datetime'    => $this->expected_work_end_datetime,
                            'night_diff_start_datetime'     => $night_diff_datetime_array['start_datetime'],
                            'night_diff_end_datetime'       => $night_diff_datetime_array['end_datetime'],
                        ]);
                    }
                }
            /**
             *        Computation of the Night Diff. - END     
             */


            /**
             *        Computation of the Night Diff. Break Time and Deductions - START     
             */
                # If the DTR has a Valid Break Time and the Total Rendered Time is more than the (Required Half Day Time + Break Time), Deduct the Break Time.
                if( $this->dtr->hasValidBreakTime() &&
                    $this->dtr->getTotalRenderedTime() > $this->dtr->getRequiredHalfDayTime() + $this->dtr->break_time ){

                    # If the Break Start and End Da te is NOT the same day, compute for Night Diff. Break Time for the Night Diff. and Overlapped Night Diff.
                    if( timestamp_to_date( $this->break_start_datetime ) != timestamp_to_date( $this->break_end_datetime )) {
                            
                            # Compute Night Diff. Break Time for Day 1 by setting the (Time Start = Break Start-Datetime) and (Time End = 12 Midnight of the Next Day).
                            $night_diff_break_time = $this->get_total_night_diff([
                                'time_start_to_compute'         => $this->break_start_datetime,
                                'time_end_to_compute'           => add_days_to_timestamp( $this->dtr->date, 1),
                                'expected_work_start_datetime'  => $this->expected_work_start_datetime,
                                'expected_work_end_datetime'    => $this->expected_work_end_datetime,
                                'night_diff_start_datetime'     => $night_diff_datetime_array['start_datetime'],
                                'night_diff_end_datetime'       => $night_diff_datetime_array['end_datetime'],
                            ]);

                            # Compute Night Diff. Break Time for Day 2 by setting the (Time Start = 12 Midnight of the Next Day) and (Time End = Break End-Datetime).
                            $night_diff_overlapped_break_time = $this->get_total_night_diff([
                                'time_start_to_compute'         => add_days_to_timestamp( $this->dtr->date, 1),
                                'time_end_to_compute'           => $this->break_end_datetime,
                                'expected_work_start_datetime'  => $this->expected_work_start_datetime,
                                'expected_work_end_datetime'    => $this->expected_work_end_datetime,
                                'night_diff_start_datetime'     => $night_diff_datetime_array['start_datetime'],
                                'night_diff_end_datetime'       => $night_diff_datetime_array['end_datetime'],
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
                            'night_diff_start_datetime'     => $night_diff_datetime_array['start_datetime'],
                            'night_diff_end_datetime'       => $night_diff_datetime_array['end_datetime'],
                        ]);

                        # If the DTR has Overlapped Time Logs AND Time-Out has the SAME DAY from the Break Date, deduct it from the Night. Diff. Overlapped (Day 2)
                        if( $this->dtr->hasOverlappedTimeLogs() &&
                                timestamp_to_date( $this->dtr->time_out ) == timestamp_to_date( $this->break_start_datetime ) ) {
                            $night_diff_overlapped  -= $night_diff_break_time;
                        
                        // # If the Time-In has the SAME DAY from the Break Date, deduct it from the Night. Diff. (Day 1)
                        // }elseif( timestamp_to_date( $this->dtr->time_in ) == timestamp_to_date( $this->break_start_datetime ) ) {
                        //     $night_diff -= $night_diff_break_time;
                        // } 
                        
                        # else, deduct it from the Night Diff.
                        } else {
                            $night_diff -= $night_diff_break_time;
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
                    'item'  => get_constant('PAYROLL_ITEMS.night_diff'),
                    'value' => $night_diff
                ]) );
            }

            # Checks if the Night Diff. has valid Data before appedning it on the Collection.
            if( $night_diff_overlapped > 0 ) {
                $dtr_payroll_item_collection->push( new DtrPayrollItems([
                    'item'  => get_constant('PAYROLL_ITEMS.night_diff'),
                    'value' => $night_diff_overlapped,
                    'tag'   => get_constant('PAYROLL_ITEM_TAGS.overlapped')
                ]) );
            }

            return $dtr_payroll_item_collection;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }



    /**
     *  Responsible for Computing the Overtime of the current DTR Instance.
     *  Overtime                            - The computed Overtime for the current Day of the DTR.
     *  Overtime Night Diff.                - The computed Overtime Night Diff. for the current Day of the DTR.
     *  Overtime Night Diff. Overlapped     - The computed Overtime Night Diff. for the next Day of the DTR.
     *  Overtime Ovelapped                  - The computed Overtime for the next Day of the DTR.
     *   
     * @return Collection $dtr_payroll_item_collection (DtrPayrollItem)
     */
    private function compute_overtime(){
        try{    

            $dtr_payroll_item_collection = new Collection();

            $overtime = 0;
            $overtime_night_diff = 0;

            $overtime_underlapped = 0;
            $overtime_night_diff_underlapped = 0;

            $overtime_overlapped = 0;
            $overtime_night_diff_overlapped = 0;
            
            $overtime_start_datetime = 0;
            $overtime_end_datetime = 0;


            // Fetch the Overtime Request for the current DTR.
            $overtime_request = $this->dtr->overtime()->first();
            
            // Checks if the Fetched Overtime exist AND is Approved. If so, proceed on the Computation Business logic.
            if( is_valid( $overtime_request )  && $overtime_request->isApproved() ) {

                // If the Overtime Type is a Pre-Overtime.
                if( $overtime_request->type == get_constant('OVERTIME_TYPE.pre') ) {

                    // Set the Overtime Start-Datetime by subtracting the Overtime Amount from the Actual Time Start-Datetime.
                    $overtime_start_datetime = $this->actual_time_start_datetime -  $overtime_request->amount;

                    // Set the Overtime End-Datetime using the Actual Time Start-Datetime.
                    $overtime_end_datetime   = $this->actual_time_start_datetime;

                    // If the Time-In is between the Overtime Datetime, use the Time-In as Overtime Start-Datetime to gate this Scenario below:
                    //  - The User files Higher Overtime Amount vs the Actual Overtime Amount base from the Timelogs.
                    if( $this->dtr->time_in >= $overtime_start_datetime && 
                        $this->dtr->time_in <= $overtime_end_datetime ){
                        $overtime_start_datetime = $this->dtr->time_in;
                    }
                    
                    # Sets the Date to compare to 12AM of the current Day
                    $date_to_compare = datetime_to_timestamp($this->dtr->date);

                // If the Overtime Type is a Post-Overtime.
                } elseif( $overtime_request->type == get_constant('OVERTIME_TYPE.post') ) {

                    // Set the Overtime Start-Datetime using the Actual Time End-Datetime.
                    $overtime_start_datetime = $this->actual_time_end_datetime;

                    // Set the Overtime Start-Datetime by adding the Overtime Amount to the Actual Time End-Datetime.
                    $overtime_end_datetime   = $this->actual_time_end_datetime + $overtime_request->amount;

                    // If the Time-Out is between the Overtime Datetime, use the Time-Out as Overtime End-Datetime to gate this Scenario below:
                    //  - The User files Higher Overtime Amount vs the Actual Overtime Amount base from the Timelogs.
                    if( $this->dtr->time_out >= $overtime_start_datetime && 
                        $this->dtr->time_out <= $overtime_end_datetime ){
                        $overtime_end_datetime = $this->dtr->time_out;
                    }

                    # Sets the Date to compare to 12AM of the Next Day
                    $date_to_compare = add_days_to_timestamp( $this->dtr->date, 1);
                }

                // dd( seconds_to_time( $overtime_request->amount ), timestamp_to_datetime( $overtime_start_datetime ), timestamp_to_datetime( $overtime_end_datetime ) );

                # Set the Expected Night Diff Start and End Time of the specific DTR base from the Expected Work Start-Datetime.
                $night_diff_datetime_array = $this->get_night_diff_datetime( $overtime_start_datetime );


                # If Overtime Start and End-Datetime is within the same Date.
                if( timestamp_to_date( $overtime_start_datetime ) == $this->dtr->date &&
                    timestamp_to_date( $overtime_start_datetime ) == timestamp_to_date( $overtime_end_datetime ) ) {

                    # Compute the Overtime Night Diff. of Day 1 by setting the (Time Start = Overtime Start-Datetime) and (Time End = Overtime End-Datetime).
                    $overtime_night_diff = $this->get_total_night_diff([
                        'time_start_to_compute'         => $overtime_start_datetime,
                        'time_end_to_compute'           => $overtime_end_datetime,
                        'night_diff_start_datetime'     => $night_diff_datetime_array['start_datetime'],
                        'night_diff_end_datetime'       => $night_diff_datetime_array['end_datetime'],
                    ]);

                    # Compute the Overtime of Day 1 by getting the difference between Overtime Start and End-Datetime and subtracting the Overtime Night Diff. from the total.
                    $overtime = ($overtime_end_datetime - $overtime_start_datetime) - $overtime_night_diff;


                } else {

                    # Discern if the Overtime Start-Datetime is BEFORE the Date to Compare, compute for Overtime, Overtime Night Diff., Overtime Night Diff. Overlapped, and Overtime Overlapped.
                    if( $overtime_start_datetime < $date_to_compare ) {

                        # If the Overtime Request is a Pre-Overtime AND the Overtime Start-Datetime started before the Current DTR Date (Previous Day), Compute for Underlapped Details. 
                        if( $overtime_request->type == get_constant('OVERTIME_TYPE.pre') &&
                            $overtime_start_datetime < datetime_to_timestamp($this->dtr->date) ) {

                            # Compute the Overtime Night Diff. Underlapped of Day 0 by setting the getting the difference between Overtime Start-Datetime AND 12 Midnight of the Next Day.
                            $overtime_night_diff_underlapped = $this->get_total_night_diff([
                                'time_start_to_compute'         => $overtime_start_datetime,
                                'time_end_to_compute'           => $date_to_compare,
                                'night_diff_start_datetime'     => $night_diff_datetime_array['start_datetime'],
                                'night_diff_end_datetime'       => $night_diff_datetime_array['end_datetime'],
                            ]);

                            # Compute the Overtime Underlapped of Day 0 by getting the difference between Overtime Start and End-Datetime and subtracting the Overtime Night Diff. from the total.
                            $overtime_underlapped = ($date_to_compare - $overtime_start_datetime) - $overtime_night_diff_underlapped;

                            
                            # Compute the Overtime Night Diff. of Day 1 by getting the difference between 12 Midnight of the Next Day AND Overtime End-Datetime.
                            $overtime_night_diff = $this->get_total_night_diff([
                                'time_start_to_compute'         => $date_to_compare,
                                'time_end_to_compute'           => $overtime_end_datetime,
                                'night_diff_start_datetime'     => $night_diff_datetime_array['start_datetime'],
                                'night_diff_end_datetime'       => $night_diff_datetime_array['end_datetime'],
                            ]);

                            # Compute the Overtime  of Day 1 by getting the difference between Overtime Start and End-Datetime and subtracting the Overtime Night Diff. from the total.
                            $overtime = ($overtime_end_datetime - $date_to_compare) - $overtime_night_diff;
                            
                        # else, Compute for Overlapped Details. 
                        } else {

                            # Compute the Overtime Night Diff. of Day 1 by setting the getting the difference between Overtime Start-Datetime AND 12 Midnight of the Next Day.
                            $overtime_night_diff = $this->get_total_night_diff([
                                'time_start_to_compute'         => $overtime_start_datetime,
                                'time_end_to_compute'           => $date_to_compare,
                                'night_diff_start_datetime'     => $night_diff_datetime_array['start_datetime'],
                                'night_diff_end_datetime'       => $night_diff_datetime_array['end_datetime'],
                            ]);

                            # Compute the Overtime of Day 1 by getting the difference between Overtime Start and End-Datetime and subtracting the Overtime Night Diff. from the total.
                            $overtime = ($date_to_compare - $overtime_start_datetime) - $overtime_night_diff;

                            
                            # Compute the Overtime Night Diff. Overlapped of Day 2 by getting the difference between 12 Midnight of the Next Day AND Overtime End-Datetime.
                            $overtime_night_diff_overlapped = $this->get_total_night_diff([
                                'time_start_to_compute'         => $date_to_compare,
                                'time_end_to_compute'           => $overtime_end_datetime,
                                'night_diff_start_datetime'     => $night_diff_datetime_array['start_datetime'],
                                'night_diff_end_datetime'       => $night_diff_datetime_array['end_datetime'],
                            ]);

                            # Compute the Overtime Overlapped of Day 2 by getting the difference between Overtime Start and End-Datetime and subtracting the Overtime Night Diff. from the total.
                            $overtime_overlapped = ($overtime_end_datetime - $date_to_compare) - $overtime_night_diff_overlapped;
                            
                        }



                    # Discern if the Time In is BEYOND the 12AM of the Next Day, compute for Overtime Night Diff. Overlapped and Overtime Overlapped only.
                    } else {
                        
                        # Compute the Overtime Night Diff. Overlapped of Day 2 by getting the difference between 12 Midnight of the Next Day AND Overtime End-Datetime.
                        $overtime_night_diff_overlapped = $this->get_total_night_diff([
                            'time_start_to_compute'         => $overtime_start_datetime,
                            'time_end_to_compute'           => $overtime_end_datetime,
                            'night_diff_start_datetime'     => $night_diff_datetime_array['start_datetime'],
                            'night_diff_end_datetime'       => $night_diff_datetime_array['end_datetime'],
                        ]);

                        # Compute the Overtime Overlapped of Day 2 by getting the difference between Overtime Start and End-Datetime and subtracting the Overtime Night Diff. from the total.
                        $overtime_overlapped = ($overtime_end_datetime - $overtime_start_datetime) - $overtime_night_diff_overlapped;;
                        
                    }
                }


                // dd( 'overtime = ' . seconds_to_time( $overtime ), 
                //     'overtime_night_diff = ' . seconds_to_time( $overtime_night_diff ), 
                //     'overtime_night_diff_underlapped = ' . seconds_to_time( $overtime_night_diff_underlapped ), 
                //     'overtime_underlapped = ' . seconds_to_time( $overtime_underlapped ), 
                //     'overtime_night_diff_overlapped = ' . seconds_to_time( $overtime_night_diff_overlapped ), 
                //     'overtime_overlapped = ' . seconds_to_time( $overtime_overlapped ), 
                //     timestamp_to_datetime( $overtime_start_datetime ), 
                //     timestamp_to_datetime( $overtime_end_datetime ) );

            
           /* Double checks the Validity of the Computed Overtime, Overtime Night Diff., Overtime Night Diff. Overlapped, and Overtime Overlapped. If not valid, set it to Default value (0) */
                        
                $overtime                        = ( $overtime > 0 ) ? $overtime : 0;
                $overtime_night_diff             = ( $overtime_night_diff > 0 ) ? $overtime_night_diff : 0;

                $overtime_night_diff_underlapped = ( $overtime_night_diff_underlapped > 0 ) ? $overtime_night_diff_underlapped : 0;
                $overtime_underlapped            = ( $overtime_underlapped > 0 ) ? $overtime_underlapped : 0;

                $overtime_night_diff_overlapped  = ( $overtime_night_diff_overlapped > 0 ) ? $overtime_night_diff_overlapped : 0;
                $overtime_overlapped             = ( $overtime_overlapped > 0 ) ? $overtime_overlapped : 0;
            

            /** Regular Computation */

                # Checks if the Overtime has valid Data before appending it on the Collection.
                if( $overtime > 0 ) {
                    $dtr_payroll_item_collection->push( new DtrPayrollItems([
                        'item'  => get_constant('PAYROLL_ITEMS.overtime'),
                        'value' => $overtime
                    ]) );
                }

                # Checks if the Overtime Night Diff. has valid Data before appending it on the Collection.
                if( $overtime_night_diff > 0 ) {
                    $dtr_payroll_item_collection->push( new DtrPayrollItems([
                        'item'  => get_constant('PAYROLL_ITEMS.overtime_night_diff'),
                        'value' => $overtime_night_diff
                    ]) );
                }


            /** Underlapped */

                # Checks if the Overtime Underlapped has valid Data before appending it on the Collection.
                if( $overtime_underlapped > 0 ) {
                    $dtr_payroll_item_collection->push( new DtrPayrollItems([
                        'item'  => get_constant('PAYROLL_ITEMS.overtime'),
                        'value' => $overtime_underlapped,
                        'tag'   => get_constant('PAYROLL_ITEM_TAGS.underlapped')
                    ]) );
                }

                # Checks if the Overtime Night Diff. Underlapped has valid Data before appending it on the Collection.
                if( $overtime_night_diff_underlapped > 0 ) {
                    $dtr_payroll_item_collection->push( new DtrPayrollItems([
                        'item'  => get_constant('PAYROLL_ITEMS.overtime_night_diff'),
                        'value' => $overtime_night_diff_underlapped,
                        'tag'   => get_constant('PAYROLL_ITEM_TAGS.underlapped')
                    ]) );
                }


            /** Overlapped */

                # Checks if the Overtime Overlapped has valid Data before appending it on the Collection.
                if( $overtime_overlapped > 0 ) {
                    $dtr_payroll_item_collection->push( new DtrPayrollItems([
                        'item'  => get_constant('PAYROLL_ITEMS.overtime'),
                        'value' => $overtime_overlapped,
                        'tag'   => get_constant('PAYROLL_ITEM_TAGS.overlapped')
                    ]) );
                }

                # Checks if the Overtime Night Diff. Overlapped has valid Data before appending it on the Collection.
                if( $overtime_night_diff_overlapped > 0 ) {
                    $dtr_payroll_item_collection->push( new DtrPayrollItems([
                        'item'  => get_constant('PAYROLL_ITEMS.overtime_night_diff'),
                        'value' => $overtime_night_diff_overlapped,
                        'tag'   => get_constant('PAYROLL_ITEM_TAGS.overlapped')
                    ]) );
                }

            }

            return $dtr_payroll_item_collection;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }



    /**
     *  Responsible for Computing the Rendered Hours of the current DTR Instance.
     *  - Break Time will be deducted from Rendered Hours.
     *  Rendered Hours             - The computed Rendered Hours for the current Day of the DTR.
     *  Rendered Hours Overlapped  - The computed Rendered Hours for the next Day of the DTR.
     *   
     * @return Collection $dtr_payroll_item_collection (DtrPayrollItem)
     */
    private function compute_rendered_time(){
        try{    

            $dtr_payroll_item_collection = new Collection();
            $rendered_hours = 0;
            $rendered_hours_overlapped = 0;
            
            # If the DTR has NO Overlapped Time Logs AND Actual Time Start and End is within the same Date.
            if( ! $this->dtr->hasOverlappedTimeLogs() &&
                timestamp_to_date( $this->actual_time_start_datetime ) ==  timestamp_to_date( $this->actual_time_end_datetime ) ) {
                
                # Gets the Rendered hours by adding the 1st Half (Start Time to Break Time Start) and the 2nd Half (Break Time End to End Time);
                #   Ex. (7AM - 11AM) + (12PM - 4PM) = 8 Hrs.
                
                $rendered_hours = ( $this->break_start_datetime - $this->actual_time_start_datetime ) + ( $this->actual_time_end_datetime - $this->break_end_datetime );

            } else {

                /**
                 *   Compute for Rendered Hours and Overlapped
                 */

                # Discern if the Actual Time Start-Datetime is BEFORE the 12AM of the Next Day, compute for Rendered Hours and Rendered Hours Overlapped.
                if( $this->actual_time_start_datetime < add_days_to_timestamp( $this->dtr->date, 1) ) { 
                    
                    # Gets the Rendered Hours for the Day 1 of the DTR. (Actual Start Datetime to Day 2 12AM)
                    $rendered_hours = add_days_to_timestamp( $this->dtr->date, 1) - $this->actual_time_start_datetime;

                    # Gets the Rendered Hours for the Day 2 of the DTR. (Day 2 12AM to Actual End Datetime)
                    $rendered_hours_overlapped = $this->actual_time_end_datetime - add_days_to_timestamp( $this->dtr->date, 1);

                # Discern if the Actual Time Start-Datetime is BEYOND the 12AM of the Next Day, compute for Rendered Hours Overlapped only.
                } else {

                    # Gets the Rendered Hours for the Day 2 of the DTR. (Actual Start Datetime to Actual End Datetime)
                    $rendered_hours_overlapped = $this->actual_time_end_datetime - $this->actual_time_start_datetime;
                }

                /**
                 *   Deduct the Breaktime from Rendered Hours and Overlapped.
                 */

                # If the Break Start and End Date is NOT the same day, compute for Night Diff. Break Time for the Rendered Hours and Rendered Hours Overlapped.
                if( timestamp_to_date( $this->break_start_datetime ) != timestamp_to_date( $this->break_end_datetime )) {
                            
                    # Deduct the computed Break Times respectively.
                    $rendered_hours             -= add_days_to_timestamp( $this->dtr->date, 1) - $this->break_start_datetime;
                    $rendered_hours_overlapped  -= $this->break_end_datetime - add_days_to_timestamp( $this->dtr->date, 1);

                # If the Break Start and End Date is the same day, compute for Rendered Hours Break Time and deduct it on the correct Date.
                # Break Start-Datetime will represent the Break Date.
                }else{

                    # Gets the total Break Time.
                    $rendered_hours_break_time = $this->break_end_datetime - $this->break_start_datetime;

                    # If the DTR has Overlapped Time Logs AND Time-Out has the SAME DAY from the Break Date, deduct it from the Rendered Hours Overlapped (Day 2)
                    if( $this->dtr->hasOverlappedTimeLogs() &&
                            timestamp_to_date( $this->dtr->time_out ) == timestamp_to_date( $this->break_start_datetime ) ) {
                        $rendered_hours_overlapped  -= $rendered_hours_break_time;

                    # If the Time-In has the SAME DAY from the Break Date, deduct it from the Rendered Hours. (Day 1)
                    }elseif( timestamp_to_date( $this->dtr->time_in ) == timestamp_to_date( $this->break_start_datetime ) ) {
                        $rendered_hours -= $rendered_hours_break_time;
                    }

                }

            }
            
            // dd( seconds_to_time( $rendered_hours ), seconds_to_time( $rendered_hours_overlapped ) );

            # Double checks the Validity of the Computed Rendered Hours. If not valid, set it to Default value (0)
            # 1. If Rendered Hours is LESS THAN 0 (Negative values)
            # 2. If Rendered Hours is GREATHER THAN the Required Time.
            if( $rendered_hours < 0 || $rendered_hours > $this->dtr->getRequiredTime() ){
                $rendered_hours = 0;
            }
            
            # Double checks the Validity of the Computed Rendered Hours Overlapped. If not valid, set it to Default value (0)
            # 1. If Rendered Hours Overlapped is LESS THAN 0 (Negative values)
            # 2. If Rendered Hours Overlapped is GREATHER THAN the Required Time.
            if( $rendered_hours_overlapped < 0 || $rendered_hours > $this->dtr->getRequiredTime() ){
                $rendered_hours_overlapped = 0;
            }


            # Checks if the Rendered Hours has valid Data before appedning it on the Collection.
            if( $rendered_hours > 0 ) {
                $dtr_payroll_item_collection->push( new DtrPayrollItems([
                    'item'  => get_constant('PAYROLL_ITEMS.rendered_hours'),
                    'value' => $rendered_hours
                ]) );
            }

            # Checks if the Rendered Hours Overlapped has valid Data before appedning it on the Collection.
            if( $rendered_hours_overlapped > 0 ) {
                $dtr_payroll_item_collection->push( new DtrPayrollItems([
                    'item'  => get_constant('PAYROLL_ITEMS.rendered_hours'),
                    'value' => $rendered_hours_overlapped,
                    'tag'   => get_constant('PAYROLL_ITEM_TAGS.overlapped')
                ]) );
            }

            return $dtr_payroll_item_collection;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }
    


    ###############################################################################################
    ####################################### General functions #####################################
    ###############################################################################################



    /**
     *  Responsible for getting the Night Differential Start & End Date base on the $datetime_to_compare Parameter.
     * 
     * @param timestamp $datetime_to_compare
     * @return array $night_diff_datetime;
     */
    private function get_night_diff_datetime( $datetime_to_compare ){
        
        $night_diff_datetime['start_datetime'] = 0;
        $night_diff_datetime['end_datetime'] = 0;

        /**
         *      Night Diff. Time Duration 10PM - 6AM
         */

        # If the Date to compare is after the Date @ 6AM, set the Night Diff. for later until tomorrow. (10PM - 6AM)
        if( add_time_to_timestamp( $this->dtr->date, get_constant('PAYROLL_NIGHT_DIFF_TIME.end') ) < $datetime_to_compare ){

            # Sets the Date's start of Night Diff. Time (10PM of the current date.)
            $night_diff_datetime['start_datetime']    = add_time_to_timestamp( $this->dtr->date, get_constant('PAYROLL_NIGHT_DIFF_TIME.start') );   

            # Sets the Date's End of Night Diff. Time (6AM of the next day.)
            $night_diff_datetime['end_datetime']      = add_time_to_timestamp( add_days_to_timestamp( $this->dtr->date, 1 ) , get_constant('PAYROLL_NIGHT_DIFF_TIME.end') );

        # If the Date to compare is before the Date @ 6AM, set the Night Diff. for yesterday until today. (10PM - 6AM)
        }else{

            # Sets the Date's start of Night Diff. Time (10PM of the date yesterday.)
            $night_diff_datetime['start_datetime']    = add_time_to_timestamp( subtract_days_from_timestamp( $this->dtr->date, 1 ) , get_constant('PAYROLL_NIGHT_DIFF_TIME.start') );   

            # Sets the Date's End of Night Diff. Time (6AM of the current day.)
            $night_diff_datetime['end_datetime']      = add_time_to_timestamp( $this->dtr->date, get_constant('PAYROLL_NIGHT_DIFF_TIME.end') );   

        }

        return $night_diff_datetime;
    }


    /**
     *  A general function responsible for getting the Night Diff. Range with the Given Parameters.
     * 
     * @param array $parameters
     * @return timestamp $total_night_diff;
     */
    private function get_total_night_diff( $parameters, $checker = false ){

        $total_night_diff = 0;

        # If Expected Work Start-Datetime is not existing, set the Time Start to Compute as default value;
        if( !isset($parameters['expected_work_start_datetime']) ) {
            $parameters['expected_work_start_datetime'] = $parameters['time_start_to_compute'];
        }

        # If Expected Work End-Datetime is not existing, set the Time End to Compute as default value;
        if( !isset($parameters['expected_work_end_datetime']) ) {
            $parameters['expected_work_end_datetime'] = $parameters['time_end_to_compute'];
        }

        # Sets the Start-Datetime to be measured for Night Diff.
        $to_measure_start_datetime   = ( $parameters['time_start_to_compute'] > $parameters['expected_work_start_datetime'] ) ? $parameters['time_start_to_compute'] : $parameters['expected_work_start_datetime'];
        
        # Sets the End-Datetime to be measured for Night Diff.
        $to_measure_end_datetime     = ( $parameters['time_end_to_compute'] < $parameters['expected_work_end_datetime'] ) ? $parameters['time_end_to_compute'] : $parameters['expected_work_end_datetime'];

        
        // if( $checker ) {
        //     // dd( timestamp_to_datetime( $to_measure_end_datetime ) );
        //     dd( timestamp_to_datetime( $parameters['time_end_to_compute'] ), timestamp_to_datetime(  $parameters['expected_work_end_datetime'] ) );
        //     dd( timestamp_to_datetime( $parameters['night_diff_start_datetime'] ), timestamp_to_datetime(  $parameters['night_diff_end_datetime'] ) );
        //     dd( $parameters );
        // }

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
