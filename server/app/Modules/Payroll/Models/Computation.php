<?php

namespace App\Modules\Payroll\Models;

class Computation
{  
    private $dtr;
    private $timeoff_time = 0;
    private $timeoff_amount = 0.0;

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
                if( $this->dtr->time_in <= $this->dtr->start_datetime ){

                    # Sets the Expected Time-Out to the End-Datetime
                    $expected_time_out = $this->dtr->end_datetime;

                    # If the Time-Out is BEFORE the Expected Time-Out, compute for Undertime..
                    if( $this->dtr->time_out < $expected_time_out ){
                      $undertime = $expected_time_out - $this->dtr->time_out;
                    }

                # If the Time-In is AFTER or EQUAL the Start-Flexy-Datetime
                } elseif ( $this->dtr->time_in >= $this->dtr->start_flexy_datetime ){

                    # Sets the Expected Time-Out to the End-Flexy-Datetime
                    $expected_time_out = $this->dtr->end_flexy_datetime;

                    # If the Time-Out is BEFORE the Expected Time-Out, compute for Undertime.
                    if( $this->dtr->time_out < $expected_time_out ){
                      $undertime = $expected_time_out - $this->dtr->time_out;
                    }

                # If the Time-In is BETWEEN the Start-Datetime and Start-Flexy-Datetime
                }elseif( $this->dtr->time_in > $this->dtr->start_datetime && 
                          $this->dtr->time_in < $this->dtr->start_flexy_datetime ){

                    # If the Required Time is HIGHER than the Rendered time, compute for Undertime.
                    if( $required_time > $rendered_time ){
                        $undertime = $required_time - $rendered_time;
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
            # 1. If Late LESS THAN 0 (Negative values)
            # 2. If Late is GREATHER THAN 8 hours.
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

    ###############################################################################################
    ##################################### Validation functions #####################################
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
