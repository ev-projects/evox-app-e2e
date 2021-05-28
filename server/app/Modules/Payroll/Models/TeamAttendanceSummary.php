<?php

namespace App\Modules\Payroll\Models;


use App\Modules\User\Models\User;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Resources\TeamAttendanceResources;
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

                    $dtr_collection = $user->dtr( $start_date->format('Y-m-d'), $end_date->format('Y-m-d') )->get();

                    $this->result['dtr_collection'] = $this->result['dtr_collection']->merge( $dtr_collection );

                    // Fetch the User's DTR base from the final start and end date
                    foreach( $dtr_collection  as $dtr ) {

                        // Fetch the approved leave of the DTR if there is any
                        $leave = $dtr->leaves()->where( 'status' , 'approved' )
                                            ->where( 'amount' , '>' , 0 )
                                            ->first();
                        
                        // Fetch the holidays
                        $holiday_collection = $dtr->holidays()->count();
                        
                        // Fetch the Rest day work
                        $rest_day_work = $dtr->rest_day_work()->first();

                        // Fetch the Overtime
                        $overtime = $dtr->overtime()->first();
                        
                        // Payroll Items
                        $payroll_items_collection = $dtr->payroll_items()->get();

                        // If the DTR has Schedule and there is an approved leave and its not from Unplanned leave types and amount is 1
                        // ...Or has a holiday and there is no timelogs.
                        if( $dtr->hasSchedule()  && 
                            ( ( is_valid( $leave ) 
                                && !in_array( $leave->type, get_constant('UNPLANNED_LEAVE_TYPES') ) 
                                && (float) $leave->amount == 1 
                              ) 
                              || 
                              ( $holiday_collection > 0 && !$dtr->hasValidTimeLogs() )
                            ) 
                        ){
                            $this->result['planned_leaves']['total_count'] += 1;

                        
                        // If the DTR has Schedule and there is an approved leave and its not from Unplanned leave types and amount is .5
                        }elseif( $dtr->hasSchedule()  && 
                            ( is_valid( $leave ) 
                              && !in_array( $leave->type, get_constant('UNPLANNED_LEAVE_TYPES') ) 
                              && (float) $leave->amount == 0.5
                            ) 
                        ){
                            if( $dtr->hasValidTimelogs() ) {
                                $this->result['scheduled_employees']['total_count'] += .5;
                            } else {
                                $this->result['unplanned_leaves']['total_count'] += .5;
                                $this->result['scheduled_employees']['total_count'] += 1;
                            }

                            $this->result['planned_leaves']['total_count'] += .5;

                        // If the DTR is considered absent or if there is an approved leave and its from the Unplanned leave types
                        }elseif( $dtr->isAbsent() || ( is_valid( $leave ) && in_array( $leave->type, get_constant('UNPLANNED_LEAVE_TYPES') ) ) ){
                            $this->result['unplanned_leaves']['total_count'] += 1;
                            $this->result['scheduled_employees']['total_count'] += 1;

                        // If the DTR has Schedule and the DTR type is regular OR if the DTR is holiday and it has valid time logs
                        }elseif( $dtr->hasSchedule() && 
                            ( $holiday_collection <= 0
                                ||
                                ( $holiday_collection > 0 && $dtr->hasValidTimeLogs() )
                            ) ){
                            $this->result['scheduled_employees']['total_count'] += 1;
                        }

                        // If there is a approved Rest day work, count the instance
                        if( is_valid( $rest_day_work ) && $rest_day_work->isApproved() ) {
                            $this->result['total_rest_day_work']['total_count'] += 1;
                        }

                        // If there is a approved Overtime, count the instance
                        if( is_valid( $overtime ) && $overtime->isApproved() ) {
                            $this->result['total_overtime']['total_count'] += 1;
                        }

                        foreach( $payroll_items_collection as $payroll_item ){

                            // If there is an approved rest day work and the current payroll item iterated is Rendered hours, add its value
                            if( is_valid( $rest_day_work ) && $rest_day_work->isApproved()
                                && $payroll_item->item == get_constant('PAYROLL_ITEMS.rendered_hours') ) {

                                    $this->result['total_rest_day_work']['total_hours'] += (int) $payroll_item->value;

                            }
    
                            // If there is an approved overtime and the current payroll item iterated is overtime, add its value
                            if( is_valid( $overtime ) && $overtime->isApproved() 
                                &&  in_array($payroll_item->item, [ get_constant('PAYROLL_ITEMS.overtime'), 
                                                                    get_constant('PAYROLL_ITEMS.overtime_night_diff')
                                                                  ]) ) {

                                $this->result['total_overtime']['total_hours'] += (int) $payroll_item->value; 
                            }
                        };
                        
                    }
                }   
            }

            // If the total headcount has at least 1, proceed on computing the percentage.
            if( $this->result['total_headcount'] > 0 ){

                // Computation for the total days 
                $total_days = $this->result['scheduled_employees']['total_count'] + $this->result['planned_leaves']['total_count'] + $this->result['unplanned_leaves']['total_count'];
                
                // Computation for Scheduled Employee, Planned Leaves, and Unplanned Leaves if the total days are more than 0
                if( $total_days > 0 ) {
                    $this->result['scheduled_employees']['total_percentage'] = (float) number_format(($this->result['scheduled_employees']['total_count'] / $total_days) * 100, 2);
                    $this->result['planned_leaves']['total_percentage'] = (float) number_format(($this->result['planned_leaves']['total_count'] / $total_days) * 100, 2);
                    $this->result['unplanned_leaves']['total_percentage'] = (float) number_format(($this->result['unplanned_leaves']['total_count'] / $total_days) * 100, 2);    
                }

                // Parse the seconds to time for total rest day work and overtime data.
                $this->result['total_rest_day_work']['total_hours'] = seconds_to_time( $this->result['total_rest_day_work']['total_hours'], true );
                $this->result['total_overtime']['total_hours'] = seconds_to_time( $this->result['total_overtime']['total_hours'], true );

                // $this->result['dtr_collection'] = new TeamAttendanceResources( $this->result['dtr_collection']->sortBy('date'));
                
            }
            return $this->result;

        } catch(Exception $e) {
            log_to_file( 'info', $e->getMessage(), [], "summary_errors");
            return error_response( trans('messages.error_default'), $e );
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
                'target_percentage' => 95,
            ],
            "unplanned_leaves"  => [
                'total_count' => 0,
                'total_percentage' => 0,
                'target_percentage' => 3,
            ],
            "planned_leaves"  => [
                'total_count' => 0,
                'total_percentage' => 0,
                'target_percentage' => 7 ,
            ],
            "total_rest_day_work"  => [
                'total_hours' => 0,
                'total_count' => 0,
            ],
            "total_overtime"  => [
                'total_hours' => 0,
                'total_count' => 0,
            ],
            "dtr_collection"  => new Collection(),
        );
    }


}
