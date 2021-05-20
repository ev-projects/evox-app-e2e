<?php

namespace App\Modules\Payroll\Models;


use App\Modules\User\Models\User;
use App\Modules\Payroll\Models\Dtr;
use Carbon\Carbon;
use Exception;
use Illuminate\Database\Eloquent\Collection;

class TeamAttendanceSummary
{  
    # Instance of the Summary
    private $result;

    /**
     *  Initialize the Structure of all the Data that would be returned by the Summary.
     */
    function __construct()
    {
       $this->clear_properties();
    }



    ###############################################################################################
    ######################################## Main function ########################################
    ###############################################################################################



    /**
     *  Main function for triggering the Computation of the Summary.
     * @param Collection $user_collection
     * @param string $start_date
     * @param string $end_date
     * @return array
     */
    public function get_summary( Collection $user_collection, string $start_date, string $end_date )
    {
        try {

            $this->clear_properties();

            $today = Carbon::now();
            $start_date = Carbon::parse($start_date);
            $end_date = Carbon::parse($end_date);

            // If the start date exceeds the current date, replace its value by today's date
            if( $start_date->gt( $today ) ) {
                $start_date = $today;
            } 
            
            // If the end date exceeds the current date, replace its value by today's date
            if( $end_date->gt( $today ) ) {
                $end_date = $today;
            } 
            
            // Iterate the User collection that was fetched
            foreach( $user_collection as $user) {

                // Declare the variables for date hired and termination date to be used for conditions later.
                $date_hired = Carbon::parse( $user->date_hired );
                $termination_date = is_valid( $user->termination_date ) ? Carbon::parse( $user->termination_date ) : null;

                // Proceed only if the date hired of the user is before start date or between the date range AND
                // ...if termination date has NO value OR
                // ...if the termination date has value and it is after end date or between the date range.
                if( ( $date_hired->lt( $start_date ) || $date_hired->between( $start_date, $end_date) ) &&
                    ( is_null( $termination_date ) || 
                        ( is_valid($termination_date) &&  
                            ( $termination_date->gt( $end_date ) || $termination_date->between( $start_date, $end_date) ) 
                        )
                    ) ){
                    
                    // Increment the total headcount
                    $this->result['total_headcount']++;
                    
                    // If the date hired is between the date range, replace the start date's value by the date hired
                    if( $date_hired->between( $start_date, $end_date) ) {
                        $start_date = $date_hired;
                    }

                    // If the termination date is between the date range, replace the end date's value by the termination date
                    if( is_valid( $termination_date ) && $termination_date->between( $start_date, $end_date) ) {
                        $end_date = $termination_date;
                    }

                    // Fetch the User's DTR base from the final start and end date
                    foreach( $user->dtr( $start_date->format('Y-m-d'), $end_date->format('Y-m-d') )->get() as $dtr ) {

                        // Fetch the approved leave of the DTR if there is any
                        $leave = $dtr->leaves()->where( 'status' , 'approved' )
                                            ->where( 'amount' , '>' , 0 )
                                            ->first();
                        
                        // Declare the DTR Type since it would be reused.
                        $dtr_type = $dtr->getDtrType();

                        // If the DTR has Schedule and there is an approved leave and its not from Unplanned leave types
                        if( $dtr->hasSchedule() && is_valid( $leave ) && !in_array( $leave, get_constant('UNPLANNED_LEAVE_TYPES') ) ){
                            $this->result['planned_leaves']['total_count'] += 1;

                        // If the DTR is considered absent or if there is an approved leave and its from the Unplanned leave types
                        }elseif( $dtr->isAbsent() || ( is_valid( $leave ) && in_array( $leave, get_constant('UNPLANNED_LEAVE_TYPES') ) ) ){
                            $this->result['unplanned_leaves']['total_count'] += 1;
                            $this->result['scheduled_employees']['total_count'] += 1;

                        // If the DTR has Schedule and the DTR type is regular OR if the DTR is holiday and it has valid time logs
                        }elseif( $dtr->hasSchedule() && 
                            ( $dtr_type == get_constant('DTR_TYPE.regular') 
                            ||
                            ( !in_array( $dtr_type, [get_constant('DTR_TYPE.regular'),  get_constant('DTR_TYPE.rest_day')] ) && 
                                $dtr->hasValidTimeLogs()
                            )
                            ) ){
                            $this->result['scheduled_employees']['total_count'] += 1;
                        }
                    }
                }   
            }

            // If the total headcount has at least 1, proceed on computing the percentage.
            if( $this->result['total_headcount'] > 0 ){

                // Computation for the total days 
                $total_days = $this->result['scheduled_employees']['total_count'] + $this->result['planned_leaves']['total_count'] + $this->result['unplanned_leaves']['total_count'];
    
                // Computation for Scheduled Employee, Planned Leaves, and Unplanned Leaves
                $this->result['scheduled_employees']['total_percentage'] = (float) number_format(($this->result['scheduled_employees']['total_count'] / $total_days) * 100, 2);
                $this->result['planned_leaves']['total_percentage'] = (float) number_format(($this->result['planned_leaves']['total_count'] / $total_days) * 100, 2);
                $this->result['unplanned_leaves']['total_percentage'] = (float) number_format(($this->result['unplanned_leaves']['total_count'] / $total_days) * 100, 2);
                
            }
            return $this->result;

        } catch(Exception $e) {
            dd( $e );
        }
    }



    ###############################################################################################
    #################################### Computation functions ####################################
    ###############################################################################################


    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################



    /**
     *  Reponsible for clearing out the DTR Summary Properties
     */
    private function clear_properties(){

        $this->result = array(
            "total_headcount"  => 0,
            "scheduled_employees"  => [
                'total_count' => 0,
                'total_percentage' => 0,
                'expected_percentage' => 95,
            ],
            "unplanned_leaves"  => [
                'total_count' => 0,
                'total_percentage' => 0,
                'expected_percentage' => 3,
            ],
            "planned_leaves"  => [
                'total_count' => 0,
                'total_percentage' => 0,
                'expected_percentage' => 7 ,
            ],
        );
    }


}
