<?php 

namespace App\Modules\Dtr\Repositories;

use App\Modules\Dtr\Models\Biometrics;
use App\Modules\Dtr\Models\Dtr;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;
use Carbon\Carbon;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class DtrRepository implements DtrRepositoryInterface{
    
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
            log_to_file('info', 'Success', $result);
            return $result;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for Applying of Schedule
     * @param User|user_id $user_or_user_id
     * @param Schedule $schedule
     * @return array $result
     */
    public function apply_schedule_to_dtr( $user_or_user_id, Schedule $schedule )
    {
        DB::beginTransaction();
        try {

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
                        $dtr->start_datetime        =  ( is_valid($parsed_schedule_detail) ) ? $parsed_schedule_detail['start_datetime'] :  $dtr->start_datetime;
                        $dtr->end_datetime          =  ( is_valid($parsed_schedule_detail) ) ? $parsed_schedule_detail['end_datetime'] : $dtr->end_datetime;
                        $dtr->start_flexy_datetime  =  ( is_valid($parsed_schedule_detail) ) ? $parsed_schedule_detail['start_flexy_datetime'] : $dtr->start_flexy_datetime;
                        $dtr->end_flexy_datetime    =  ( is_valid($parsed_schedule_detail) ) ? $parsed_schedule_detail['end_flexy_datetime'] : $dtr->end_flexy_datetime;
                        $dtr->break_time            =  ( is_valid($parsed_schedule_detail) ) ? $parsed_schedule_detail['break_time'] : $dtr->break_time;
                        $dtr->is_rest_day           =  ( is_valid($schedule_detail) ) ? 0 : $dtr->is_rest_day;
                        $dtr->source_type_tagging   =  ( is_valid($schedule) ) ? $schedule->source_type : $dtr->source_type_tagging;
                        $dtr->update();

                        $result['updated'][] = $dtr;
                    }
        
                }
            }

            DB::commit();
            log_to_file('info', 'Success', [$result]);
            return $result;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for Syncing Biometrics Logs to the existing DTR.
     * @param string $start_datetime
     * @param string $end_datetime
     * @param Collection $user_collection (Optional)
     * @return bool
     */
    public function sync_biometrics_to_dtr( string $start_datetime, string $end_datetime, Collection $user_collection = null )
    {
        try {

            $result = [
                'biometrics_collection' => new Collection,
                'dtr_collection' => new Collection,
            ];

            # Creates the Query on fetching the Biometrics data between the Start and End Date time.
            $biometrics_collection_query = Biometrics::select('CheckTime','CheckType','Userid')
                                                        ->whereIn('CheckType', ['I','O'])
                                                        ->whereBetween('CheckTime', [$start_datetime, $end_datetime])
                                                        ->orderBy('CheckTime', 'asc');

            # If User Collection is valid, Adds the Users in the condition on fetching the Biometrics
            if( is_valid( $user_collection ) ){

                # Plucks the 'emp_num' field from the Collection and appends the "20" on the emp_num to match the data on Biometrics. 
                $user_emp_num_collection = $user_collection->pluck('emp_num')
                                                            ->map(function ($emp_num) {
                                                                return parse_emp_num_for_biometrics( $emp_num );
                                                            });

                # Appends the condition of User Emp_num on the Biometrics Query
                $biometrics_collection_query->whereIn('Userid',  $user_emp_num_collection );
            }

            # Fetchs the Biometrics Collection.
            $biometrics_collection = $biometrics_collection_query->get();
            $result['biometrics_collection'] = $biometrics_collection;

            # If the Biometrics has value, proceed on the Iteration.
            if( $biometrics_collection->count() > 0 ) {
                
                foreach( $biometrics_collection as $biometrics ){
                    $dtr = $this->apply_biometrics_to_dtr( $biometrics );
                    
                    if( is_valid( $dtr ) ){
                        $result['dtr_collection'][] = $dtr;
                    }
                }
                
            }
            
            log_to_file('info', 'Success', $result);
            return $result['dtr_collection'];

        } catch (Exception $e) {
            log_error($e);
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
            }

            DB::commit();
            log_to_file('info', 'Success', $dtr);
            return $result;
        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }


    //....


    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################


    //....



}