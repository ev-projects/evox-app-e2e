<?php

namespace App\Modules\Payroll\Models;

class Computation
{  
    private $dtr;
    private $timeoff_timestamp;
    private $timeoff_amount;
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
        
        if( $this->check_allowed_policy('allow_late') ) {
            $late_payroll_item = $this->compute_late();

            if( is_valid( $late_payroll_item ) ) {
                $payroll_items[] = $late_payroll_item;
            }
        }
        return $payroll_items;
    }


    ###############################################################################################
    ##################################### Computation functions #####################################
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
                    $this->timeoff_timestamp = (int) ( $leave->amount * ( $this->dtr->end_datetime - $this->dtr->start_datetime - $this->dtr->break_time ) );
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
     *  Responsible for Computing the Late of the current DTR Instance.
     *   
     * @return DtrPayrollItem|null
     */
    private function compute_late(){
        try{    
            $late = 0;

            # Check if the DTR has Valid Time Logs and has a proper Schedule.
            if( $this->dtr->hasValidTimelogs() && $this->dtr->hasSchedule() ){
                        
                $expected_time_in = 0;

                # If the Flexy Start Date has value, use it as an Expected Time In. (Flexible)
                if( is_valid( $this->dtr->start_flexy_datetime ) ){
                    $expected_time_in = $this->dtr->start_flexy_datetime;

                # else, If the Start Date has value, use it as an Expected Time In. (Standard)
                } elseif( is_valid( $this->dtr->start_datetime ) ){
                    $expected_time_in = $this->dtr->start_datetime;
                }

                # If the Time-In exceeds the Expected Time-In, Compute for the Difference of Time-In - Expected Time-In.
                if( $this->dtr->time_in > $expected_time_in ){
                    $late = $this->dtr->time_in - $expected_time_in;
                }

                # Subtracts the Time-off from the total computed Late.
                $late = $late - $this->timeoff_timestamp;

                # Double checks the Validity of the Computed Late. If not valid, set it to Default value (0)
                # 1. If Late LESS THAN 0 (Negative values)
                # 2. If Late is GREATHER THAN 8 hours.
                # 3. If the Time-off from the Leave is on Half-day (0.5)
                if($late < 0 || $late > get_constant('TIMESTAMP.eight_hours') || $this->timeoff_amount == 0.5 ){
                    $late = 0;
                }
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
