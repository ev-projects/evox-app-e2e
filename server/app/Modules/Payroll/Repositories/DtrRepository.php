<?php 

namespace App\Modules\Payroll\Repositories;

use App\Modules\Payroll\Models\Biometrics;
use App\Modules\Payroll\Models\Computation;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\DtrSummary;
use App\Modules\Payroll\Models\DtrPolicy;
use App\Modules\Payroll\Models\Holiday;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;
use Carbon\Carbon;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class DtrRepository implements DtrRepositoryInterface{
    
    function __construct(){
        $this->computation = new Computation();
        $this->dtr_summary = new DtrSummary();
    }

    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################
    

    /**
     *  Responsible for Generating DTR for set of Users with the given date/dates
     * @param array (Post Variables) $data
     * @return User $user
     */
    public function generate_dtr( Collection $user_collection, array $date_array )
    {
        DB::beginTransaction();
        try {
            $start_date = reset($date_array);
            $end_date = end($date_array);
            
            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'start_date' => $start_date, 'end_date' => $end_date], "dtr");

            $dtr_array = [];
            
            # Iterates per User per Date.
            foreach( $user_collection as $user ) {

                # Fetch the Default Schedule for the current User.
                $default_schedule = $user->defaultSchedule()->first();

                # Fetch the Temporary Schedules for the current User within the Date Range
                $temporary_schedule_collection = $user->temporarySchedules($start_date, $end_date)->get();
                
                foreach( $date_array as $date) {

                    # Gets the Latest Temporary Schedule that the current $date is in scope.
                    $temporary_schedule = $temporary_schedule_collection->filter(function ( $schedule ) use ( $date ) {
                        return ( $date >= $schedule->valid_from && $date <= $schedule->valid_to) ;
                     })
                     ->sortByDesc('updated_at')
                     ->first();

                    # Gets the Change Schedule that the current $date is in scope
                    // Put code here...
                    $change_schedule = null;

                    # Setting the Schedule that would be used for that specific Day.
                    # Heirarchy: Temporary Schedule > Change Schedule > Default Schedule
                    $schedule = ( is_valid( $temporary_schedule ) ? $temporary_schedule : 
                                    ( is_valid( $change_schedule ) ? $change_schedule : $default_schedule ) );
                    
                    # Get the Schedule Details for the Day of the Specific Date. Returns null if not existing.
                    $schedule_detail = ( is_valid( $schedule ) ? $schedule->getPerDay( get_day_from_date($date) ) : null);
                    
                    # Get the Parsed Schedule Detail to Date
                    $parsed_schedule_detail = ( is_valid( $schedule_detail ) ? $schedule_detail->getParsedDetailToDate( $date ) : null);

                    # Create the DTR Insert Value Array Structure
                    $dtr_insert_values =  [
                        'user_id'               => "'".$user->id."'",
                        'date'                  => "'".$date."'",
                        'start_datetime'        =>  ( is_valid($parsed_schedule_detail['start_datetime']) ) ? $parsed_schedule_detail['start_datetime'] : 'null',
                        'end_datetime'          =>  ( is_valid($parsed_schedule_detail['end_datetime']) ) ? $parsed_schedule_detail['end_datetime'] : 'null',
                        'start_flexy_datetime'  =>  ( is_valid($parsed_schedule_detail['start_flexy_datetime']) ) ? $parsed_schedule_detail['start_flexy_datetime'] : 'null',
                        'end_flexy_datetime'    =>  ( is_valid($parsed_schedule_detail['end_flexy_datetime']) ) ? $parsed_schedule_detail['end_flexy_datetime'] : 'null',
                        'break_time'            =>  ( is_valid($parsed_schedule_detail['break_time']) ) ? $parsed_schedule_detail['break_time'] : 'null',
                        'is_rest_day'           =>  ( is_valid($schedule_detail) ) ? 0 : 1,
                        'source_type_tagging'   =>  ( is_valid($schedule) ) ? "'".$schedule->source_type."'" : 'null',
                        'updated_by'            => 'NOW()',
                        'created_by'            => 'NOW()'
                    ];

                    # Append the imploded DTR Insert Values into the Main Array that would be Batch Executed later once the Iteration is done.
                    $dtr_insert_array[] = implode(",", $dtr_insert_values);
                } 
            }
            
            # Creates the Customized Query for Batch inserting the To-be-generated DTRs.
            $dtr_insert_query = "INSERT INTO dtrs (
                                        user_id, 
                                        date, 
                                        start_datetime,
                                        end_datetime,
                                        start_flexy_datetime,
                                        end_flexy_datetime,
                                        break_time,
                                        is_rest_day,
                                        source_type_tagging,
                                        updated_at, 
                                        created_at) 
                                    VALUES (".implode( "), (", $dtr_insert_array ).") 
                                    ON DUPLICATE KEY UPDATE
                                        user_id                 = VALUES(user_id), 
                                        date                    = VALUES(date), 
                                        start_datetime          = VALUES(start_datetime), 
                                        end_datetime            = VALUES(end_datetime), 
                                        start_flexy_datetime    = VALUES(start_flexy_datetime), 
                                        end_flexy_datetime      = VALUES(end_flexy_datetime), 
                                        break_time              = VALUES(break_time), 
                                        is_rest_day             = VALUES(is_rest_day), 
                                        source_type_tagging     = VALUES(source_type_tagging), 
                                        created_at              = IF(created_at IS NULL, VALUES(created_at), created_at),
                                        updated_at              = VALUES(updated_at)";
            
            # Executes the Batch Insert Query
            $result = [
                "result" => DB::insert($dtr_insert_query), 
                "total_dtr_count" => count( $dtr_insert_array ),
                "dtr"   => $dtr_insert_array
            ];

            DB::commit();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $result, "dtr");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");
            return $result;

        } catch (Exception $e) {
            DB::rollback();
            
            log_to_file( 'info', get_constant('LOG_ROLLBACK'), [],  "dtr");
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for Applying of Schedule to DTR.
     * @param User|user_id $user_or_user_id
     * @param Schedule $schedule
     * @return array $result
     */
    public function apply_schedule_to_dtr( $user_or_user_id, Schedule $schedule )
    {
        DB::beginTransaction();
        try {

            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'user' => $user_or_user_id, 'schedule' => $schedule ], "dtr");

            $result = [
                'updated' => [],
                'not_updated' => []
            ];

            $user = ( $user_or_user_id instanceof User ) ? $user_or_user_id : User::findOrFail($user_or_user_id);

            # Checks if the $user and $schedule instance are valid.
            if( is_valid( $user ) && is_valid( $schedule ) ) {

                # If Valid to is existing, fetch between the dates.
                if( is_valid( $schedule->valid_to ) ) {
                    $dtr_collection = $user->dtr($schedule->valid_from, $schedule->valid_to)
                                            ->get();

                # If Valid to is NOT existing, fetch from the Valid From date onwards
                } else {
                    $dtr_collection = $user->dtr($schedule->valid_from)
                                            ->get();
                }

                # Iteration of DTR Collection that was fetched.
                foreach( $dtr_collection as $dtr ) {
        
                    # Default Flag value
                    $to_update_flag = true;
        
                    # Heirarchy: Temporary Schedule > Change Schedule > Default Schedule
        
                    # If the Schedule Instance is Change Schedule AND the current DTR tagging was already set as Temporary, sets the Update Flag to FALSE
                    if( $schedule->isChangeSchedule() && $dtr->isTemporary() ) {
                        $to_update_flag = false;
                        $result['not_updated'][] = $dtr;
                    }
        
                    # If the Schedule Instance is Default AND the current DTR tagging was already set as Temporary/Change Schedule, sets the Update Flag to FALSE
                    if( $schedule->isDefault() && ($dtr->isTemporary() || $dtr->isChangeSchedule()) ) {
                        $to_update_flag = false;
                        $result['not_updated'][] = $dtr;
                    }
                    
                    if( $to_update_flag ) {
        
                        # Get the Schedule Details for the Day of the Specific Date. Returns null if not existing.
                        $schedule_detail = ( is_valid( $schedule ) ? $schedule->getPerDay( get_day_from_date( $dtr->date ) ) : null);
                        
                        # Get the Parsed Schedule Detail to Date
                        $parsed_schedule_detail = ( is_valid( $schedule_detail ) ? $schedule_detail->getParsedDetailToDate( $dtr->date ) : null);
                        
                        # Update the DTR properties
                        $dtr->start_datetime        =  $parsed_schedule_detail['start_datetime'];
                        $dtr->end_datetime          =  $parsed_schedule_detail['end_datetime'];
                        $dtr->start_flexy_datetime  =  $parsed_schedule_detail['start_flexy_datetime'];
                        $dtr->end_flexy_datetime    =  $parsed_schedule_detail['end_flexy_datetime'];
                        $dtr->break_time            =  $parsed_schedule_detail['break_time'];
                        
                        $dtr->is_rest_day           =  ( is_valid($schedule_detail) ) ? 0 : $dtr->is_rest_day;
                        $dtr->source_type_tagging   =  ( is_valid($schedule) ) ? $schedule->source_type : $dtr->source_type_tagging;
                        $dtr->update();

                        # Delete the existing DTR Policies before saving the new ones.
                        $dtr->policies()->delete();

                        # Save the DTR Policies base on the Schedule Policies.
                        $this->save_dtr_policies( $dtr, $schedule->schedule_policies()->get() );

                        # Compute for the Items
                        $this->compute_payroll_items( $dtr );

                        $result['updated'][] = $dtr;
                    }
        
                }
            }

            DB::commit();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");
            return $result;

        } catch (Exception $e) {
            DB::rollback();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");
            log_error($e);
            throw $e;
        }
    }



    
    /**
     *  Responsible for Binding the Holiday that was fetched between the Date Range to the DTR Related by Date.
     * @param string $start_date
     * @param string $end_date
     * @return Collection $result
     */
    public function bind_holidays_to_dtr( string $start_date, string $end_date )
    {
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'start_date' => $start_date, 'end_date' => $end_date], "dtr");

        DB::beginTransaction();
        try {

            $result = new Collection;
            
            /** This Holiday date range query and wildcard is created for the following scenarios:
             *  1. Incase the Date Range is overlapping to next year like "2019" to "2020", we cannot query the Month-Date Range (ex. DATE BETWEEN 12-01 AND 01-01 ) 
             *  2. This fetches all the Months between the Date Range and iterates manually the Start and End date of those months that will be converted as Query.
             */
                $holiday_date_range['query_array'] = [];
                $holiday_date_range['wildcard_array']  = [];

                foreach( get_month_date_range( $start_date, $end_date ) as $row ){
                    $holiday_date_range['query_array'][] = "( DATE_FORMAT(date, '%m-%d') BETWEEN DATE_FORMAT(?,'%m-%d') AND DATE_FORMAT(?,'%m-%d') )";
                    array_push($holiday_date_range['wildcard_array'], $row->start_date, $row->end_date);
                }
            /** */
            
            // Fetch all the Holidays within the Start and End date as Parameter.
            $holiday_collection = Holiday::whereRaw("
                                                ( is_predefined = 1 
                                                  AND (". implode( " OR ", $holiday_date_range['query_array'] ) ."))
                                            OR
                                                ( is_predefined = 0 
                                                  AND date BETWEEN ? AND ? )
                                            ", array_merge( 
                                                    $holiday_date_range['wildcard_array'],
                                                    array(
                                                        $start_date,
                                                        $end_date
                                                    )  
                                                ) 
                                            )
                                            ->orderBy('date', 'asc')
                                            ->get();

            // Iterate the Fetched Holidays.
            foreach( $holiday_collection as $holiday ){

                // Parses the Proper Date of the Holiday ( To automate the condition for Pre-defined and non Pre-defined Holiday Dates. )
                $date = $holiday->getProperDate( $start_date, $end_date );

                // Fetch all the DTR that has no Tagging of the Current Holiday in the iteration.
                $dtr_collection = Dtr::select('dtrs.*')
                                        ->whereRaw(
                                            "dtrs.date = ?
                                                AND 
                                                NOT EXISTS (
                                                    SELECT * 
                                                    FROM dtr_holidays
                                                    WHERE dtrs.id = dtr_holidays.dtr_id 
                                                        AND dtr_holidays.holiday_id = ?
                                                )
                                            ",
                                            array(
                                                $date,
                                                $holiday->id
                                            )
                                        )
                                        ->get();
                
                // Iterates the Fetched DTRs. 
                foreach( $dtr_collection as $dtr ) {

                    $dtr->holidays()->save( $holiday );
                    $result->push( $dtr );
                    log_to_file( 'info', 'Holiday Inserted on this DTR.' , ['dtr'=>$dtr, 'holiday'=>$holiday], "dtr");
                }
            }

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");
            DB::commit();
            return $result;

        } catch (Exception $e) {
            DB::rollback();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");
            log_error($e);
            throw $e;
        }
    }


    

    
    /**
     *  Responsible for Binding the Leaves that was fetched between the Date Range to the DTR Related by Date.
     * @param string $start_date
     * @param string $end_date
     * @return Collection $result
     */
    public function bind_leaves_to_dtr( array $bhr_leaves_array )
    {
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "dtr");

        DB::beginTransaction();
        try {

            $result = new Collection;

            // Iterate the fetched Employee Leaves that was fetched from BHr.
            foreach( $bhr_leaves_array as $row ) {

                // Proceed only if the Status of the Leave Request is in the LEAVE REQUEST STATUS constant Array
                if( in_array( $row->status->status, get_constant('LEAVE_REQUEST_STATUS') ) )   {

                    // Get the DTR related on the Leave Request's Date Range
                    $dtr_collection = Dtr::select('dtrs.*')
                                            ->join('users', 'dtrs.user_id', '=', 'users.id')
                                            ->whereRaw("
                                                    users.bhr_num = ?
                                                    AND date BETWEEN ? AND ?
                                                ", array(
                                                    $row->employeeId,
                                                    $row->start,
                                                    $row->end
                                                )
                                            )->get();
                    
                    // Iterate each DTR in order to bind the Leave on each DTR.
                    foreach( $dtr_collection as $dtr ) {

                        # Setting the Amount of Leave from the Leave request for the Corresponding Date
                        $amount = ( is_valid( $row->dates ) && is_valid( $row->dates->{$dtr->date} ) ) ? (float) $row->dates->{$dtr->date} : 0 ;

                        # Create the Leave Insert Value Array Structure
                        $leave_insert_values =  [
                            'dtr_id'              => ( is_valid( $dtr->id ) ) ?  "'".$dtr->id."'" : 'null',
                            'type'                => ( is_valid( $row->type ) && isset( $row->type->name ) ) ?  "'".$row->type->name."'" : 'null',
                            'status'              => ( is_valid( $row->status->status ) ) ?  "'".$row->status->status."'" : 'null',
                            'amount'              =>  "'". ( $amount == 0 ? 0 : ( $amount <= 0.5 ? 0.5 : 1 ) ) ."'",
                            'employee_note'       => ( is_valid( $row->notes ) && isset( $row->notes->employee ) ) ?  "'".addslashes($row->notes->employee)."'" : 'null',
                            'manager_note'        => ( is_valid( $row->notes ) && isset( $row->notes->manager ) ) ?  "'".addslashes($row->notes->manager)."'" : 'null',
                            'updated_by'          => 'NOW()',
                            'created_by'          => 'NOW()'
                        ];

                        # Append the imploded Leaves Insert Values into the Main Array that would be Batch Executed later once the Iteration is done.
                        $leave_insert_array[] = implode(",", $leave_insert_values);
                    }
                }
            }
                                    
            # Creates the Customized Query for Batch inserting the To-be-generated Leaves.
            $leave_insert_query = "INSERT INTO leaves (
                                                dtr_id, 
                                                type, 
                                                status,
                                                amount,
                                                employee_note,
                                                manager_note,
                                                updated_at, 
                                                created_at) 
                                            VALUES (".implode( "), (", $leave_insert_array ).") 
                                            ON DUPLICATE KEY UPDATE
                                                dtr_id          = VALUES(dtr_id), 
                                                type            = VALUES(type), 
                                                status          = VALUES(status), 
                                                amount          = VALUES(amount), 
                                                employee_note   = VALUES(employee_note), 
                                                manager_note    = VALUES(manager_note), 
                                                created_at      = IF(created_at IS NULL, VALUES(created_at), created_at),
                                                updated_at      = VALUES(updated_at)";
            
            # Executes the Batch Insert Query
            $result = [
                "result" => DB::insert($leave_insert_query), 
                "total_dtr_count" => count( $leave_insert_array ),
                "dtr_leaves"   => $leave_insert_array
            ];

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $result, "dtr");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");
            DB::commit();
            return $result;

        } catch (Exception $e) {
            DB::rollback();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for Syncing Biometrics Logs to the existing DTR.
     * @param Collection $biometrics_collection
     * @return Collection $result
     */
    public function sync_biometrics_to_dtr( Collection $biometrics_collection )
    {
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "biometrics");

        try {

            $result = new Collection;
            
            # If the Biometrics has value, proceed on the Iteration.
            if( $biometrics_collection->count() > 0 ) {
                
                foreach( $biometrics_collection as $biometrics ){
                    $dtr = $this->apply_biometrics_to_dtr( $biometrics );
                    
                    if( is_valid( $dtr ) ){
                        $result->push( $dtr );
                    }
                } 
            }

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "biometrics");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "biometrics");
            return $result;

        } catch (Exception $e) {
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "biometrics");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "biometrics");
            throw $e;
        }
    }
    

    /**
     *  Responsible for Computing the DTR Payroll Items Summary base from the User Collection and the Date Range.
     * @param Collection $user_collection
     * @param string $start_date
     * @param string $end_date
     * @return array
     */
    public function compute_dtr_summary( Collection $user_collection, string $start_date, string $end_date ){

        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'user_collection' => $user_collection, 'start_date'=> $start_date, 'end_date'=> $end_date], "dtr_summary");
        
        try{
            
            $user_dtr_summary = [];

            foreach( $user_collection as $user ) {
                $user_dtr_summary[ $user->id ] = $this->dtr_summary->get_summary( $user->dtr($start_date, $end_date)->get() );
            }

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [$user_dtr_summary], "dtr_summary");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr_summary");
            
            return $user_dtr_summary;
            
        } catch (Exception $e) {
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr_summary");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr_summary");
            throw $e;
        }
    }


    /**
     *  Responsible for the Computing the Payroll items of the DTR.
     * @param Dtr $dtr
     * @return Collection $payroll_items (Payroll Items)
     */
    public function compute_payroll_items(Dtr $dtr){
        DB::beginTransaction();
        try{
            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'dtr' => $dtr], "dtr_computation");
            
            $dtr->payroll_items()->delete();

            $payroll_items = $this->computation->get_computed_payroll_items( $dtr );

            $dtr->payroll_items()->saveMany($payroll_items);

            DB::commit();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [$payroll_items], "dtr_computation");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr_computation");
            return $payroll_items;

        } catch (Exception $e) {
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr_computation");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr_computation");
            throw $e;
        }
    }

    ###############################################################################################
    ##################################### Protected functions #####################################
    ###############################################################################################



    /**
     *  Responsible for Applying the Biometrics Parameter to their Respective DTR
     * @param Biometrics $biometrics
     * @return bool
     */
    protected function apply_biometrics_to_dtr( Biometrics $biometrics )
    {
        DB::beginTransaction();
        try {
            # Sets the Result as null by default.
            $result = null;

            # Fetches the Respective First DTR for the Biometrics parameter. This DTR will be updated with the CheckTime from the Biometrics.
            $dtr = Dtr::select('dtrs.*')
                        ->join('users', 'dtrs.user_id', '=', 'users.id')
                                ->whereRaw(
                                    "users.emp_num = '".$biometrics->getParsedEmpNum()."'
                                        AND (
                                        ". $biometrics->getDutyType() ." BETWEEN  '". $biometrics->getFrom() ."' AND '". $biometrics->getTo() ."'
                                        OR 
                                        ". $biometrics->getFlexyType() ." BETWEEN  '". $biometrics->getFrom() ."' AND '". $biometrics->getTo() ."'
                                        )
                                        AND ". $biometrics->getTimeType() . " IS NULL"
                                )->first();

            # If the fetched DTR exist, update the Specific Time Type with the Biometrics' Check Time.
            if( is_valid( $dtr ) ) {
                $dtr->{ $biometrics->getTimeType() } = datetime_to_timestamp( $biometrics->CheckTime );
                $dtr->update();
                $result = $dtr;

                DB::commit();
                log_to_file( 'info', "Biometrics Synced to DTR." , ['dtr'=>$dtr, 'biometrics'=> $biometrics], "biometrics");
            } else {
                log_to_file( 'info', "DTR not Existing." , ['biometrics'=> $biometrics], "biometrics");
            }

            DB::commit();
            return $result;
        } catch (Exception $e) {
            DB::rollback();
            
            log_to_file( 'info', get_constant('LOG_ROLLBACK'), [],  "biometrics");
            log_error($e, 'biometrics');
            throw $e;
        }
    }

    /**
     *  Responsible for saving the Dtr Policies inherited from the Schedule Policies.
     * @param Dtr $dtr
     * @param Collection $schedule_policies_collection (SchedulePolicies)
     * @return bool
     */
    protected function save_dtr_policies(Dtr $dtr, Collection $schedule_policies_collection){
        DB::beginTransaction();
        try{
            $dtr_policies_array = [];
            
            # Iterate the Schedule Policies Collection to be saved as Dtr Policies.
            foreach( $schedule_policies_collection as $schedule_policy ){
                $dtr_policies_array[ $schedule_policy->policy ] = new DtrPolicy();
                $dtr_policies_array[ $schedule_policy->policy ]->policy        = $schedule_policy->policy;
                $dtr_policies_array[ $schedule_policy->policy ]->value         = $schedule_policy->value;
            }

            $dtr->policies()->saveMany( $dtr_policies_array );
            
            DB::commit();
            log_to_file('info', 'Success', [$dtr_policies_array]);
            return true;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }


    ###############################################################################################
    ##################################### Private functions #####################################
    ###############################################################################################


    /**
     *  Responsible for fetching the Time-off for the current DTR Instance.
     *   
     * @param Dtr $dtr
     * @param Collection $dtr_leaves_collection (Leave)
     * @return timestamp $timeoff
     */
    private function get_timeoff(Dtr $dtr, $dtr_leaves_collection){
        try{    
            $timeoff = 0;

            # Iterate the DTR Leave Collection
            foreach( $dtr_leaves_collection as $leave ) {

                # If the current Iterated Leave is Approved and is a Paid Leave,
                if( $leave->isApproved() && $leave->isPaidLeave() ){
                    $timeoff = (int) ( $leave->amount * ( $dtr->end_datetime - $dtr->start_datetime - $dtr->break_time ) );
                }
            }

            return $timeoff;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }


    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################


    //....



}