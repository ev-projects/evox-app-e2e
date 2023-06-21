<?php

namespace App\Modules\Payroll\Repositories;

use Auth;
use Exception;
use Carbon\Carbon;
use Illuminate\Http\Request;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\DB;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\Leave;
use App\Modules\Payroll\Models\Holiday;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Payroll\Models\DtrPolicy;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\Payroll\Models\Biometrics;
use App\Modules\Payroll\Models\DtrSummary;
use App\Modules\Payroll\Models\Computation;
use App\Modules\Payroll\Models\DtrHoliday;
use App\Modules\Payroll\Models\DtrSummaryReport;
use App\Modules\Request\Models\RestDayWork;
use Illuminate\Database\Eloquent\Collection;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Schedule\Models\SchedulePolicy;
use App\Modules\User\Repositories\UserRepositoryInterface;

class DtrRepository implements DtrRepositoryInterface{
    protected $user;

    function __construct(UserRepositoryInterface $user){
        $this->user = $user;
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

            $dtr_insert_array = [];

            # Iterates per User per Date.
            foreach( $user_collection as $user ) {

                foreach( $date_array as $date) {


                    # Append the imploded DTR Insert Values into the Main Array that would be Batch Executed later once the Iteration is done.
                    $dtr_insert_array[] = implode(",", [
                        'user_id'               => "'".$user->id."'",
                        'date'                  => "'".$date."'",
                        'updated_by'            => 'NOW()',
                        'created_by'            => 'NOW()'
                    ]);
                }
            }

            foreach( array_chunk( $dtr_insert_array, 5000 ) as $dtr_insert_array_chunk ){
                # Creates the Customized Query for Batch inserting the To-be-generated DTRs.
                $dtr_insert_query = "INSERT INTO dtrs (
                                        user_id,
                                        date,
                                        updated_at,
                                        created_at)
                                    VALUES (".implode( "), (", $dtr_insert_array_chunk ).")
                                    ON DUPLICATE KEY UPDATE
                                        user_id                 = VALUES(user_id),
                                        date                    = VALUES(date),
                                        created_at              = IF(created_at IS NULL, VALUES(created_at), created_at),
                                        updated_at              = VALUES(updated_at)";

                # Executes the Batch Insert Query
                DB::insert($dtr_insert_query);
            }


            # Apply the Schedule of the Dates that's been generated.

            foreach( $user_collection as $user ) {

                foreach( $user->dtr( $start_date, $end_date )->get() as $dtr ) {
                    $date = $dtr->date;

                    # Uses this getBestSchedule to check what is the best Schedule for the given Date of specific user.
                    $schedule = $dtr->getBestSchedule();

                    # Fetch Rest Day Work of the DTR Instance.
                    $rest_day_work = $dtr->rest_day_work()->first();

                    # Check if there's an Approved Rest Day Work for the current DTR. If yes, apply the Rest Day Work instead of the Schedule.
                    if( is_valid( $rest_day_work ) && $rest_day_work->isApproved() ) {

                        $this->apply_rest_day_work_to_dtr( $rest_day_work );

                    # Checks if there's a valid schedule to apply on the DTR.
                    } elseif( is_valid( $schedule ) ) {

                        # Get the Schedule Details for the Day of the Specific Date. Returns null if not existing.
                        $schedule_detail = ( is_valid( $schedule ) ? $schedule->getPerDay( get_day_from_date( $date ) ) : null);

                        # Get the Parsed Schedule Detail to Date
                        $parsed_schedule_detail = ( is_valid( $schedule_detail ) ? $schedule_detail->getParsedDetailToDate( $date ) : null);



                        if($parsed_schedule_detail != null){
                            # Update the DTR properties
                            $dtr->start_datetime        =  $parsed_schedule_detail['start_datetime'];
                            $dtr->end_datetime          =  $parsed_schedule_detail['end_datetime'];
                            $dtr->start_flexy_datetime  =  $parsed_schedule_detail['start_flexy_datetime'];
                            $dtr->end_flexy_datetime    =  $parsed_schedule_detail['end_flexy_datetime'];
                            $dtr->break_time            =  $parsed_schedule_detail['break_time'];
                        }

                        $dtr->is_rest_day           =  ( is_valid($schedule_detail) ) ? 0 : 1;
                        $dtr->source_type_tagging   =  ( is_valid($schedule) ) ? $schedule->source_type : $dtr->source_type_tagging;
                        $dtr->update();

                        # Delete the existing DTR Policies before saving the new ones.
                        $dtr->policies()->delete();

                        # Save the DTR Policies base on the Schedule Policies.
                        $this->save_dtr_policies( $dtr, $schedule->schedule_policies()->get() );
                    }
                }
            }




            $result = [
                // "result" => ,
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
     *  Responsible for Generating DTR for a specific user starting from a specific date
     */
    public function generate_dtr2( $date , $emp_id )
    {
        DB::beginTransaction();
        try {
            $days = 7;
            $dates = get_succeeding_days( $date , $days ) ;

            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'start_date' => $date ], "dtr");

            $emp_nump = $emp_id;

            # THIS SQL CREATES RECORD OF 7 DAYS RECORDS OF DTR
            $records_to_be_insert =  "SELECT ".$emp_nump." as user_id," . implode(" as date UNION ALL SELECT  ".$emp_nump." as user_id,", $dates);


            # THIS SQL CREATES A RELATION
            $record_that_dont_exist = " FROM (" .$records_to_be_insert ." ) as table1
            LEFT JOIN dtrs as dtr on dtr.date = table1.date AND dtr.user_id = table1.user_id
            LEFT JOIN ( SELECT * FROM schedules GROUP BY id ORDER BY updated_at DESC ) as sched on table1.user_id = sched.bind_id
                AND (table1.date >= sched.valid_from AND sched.valid_to is null or table1.date <= sched.valid_to) AND sched.bind_to = 'user'
            LEFT JOIN change_schedules as change_sched ON change_sched.schedule_id = sched.id
            LEFT JOIN schedule_details as sched_details ON sched_details.schedule_id = sched.id
                AND ( sched_details.day = LOWER(SUBSTRING(DAYNAME(table1.date),1, 3)) or sched_details.day='all')
            LEFT JOIN users on table1.user_id = users.id
            WHERE dtr.date is NULL AND dtr.user_id is NULL AND table1.date >= users.date_hired AND is_active = 1
            AND ( change_sched.status = 'approved' OR change_sched.status is null )
            GROUP BY table1.date";

            $delete_sched_pol = "DELETE dtr_policies from dtr_policies JOIN dtrs ON dtrs.id = dtr_policies.dtr_id WHERE dtrs.date in ( ". implode(" ,", $dates) ." ) AND dtrs.user_id = ".  $emp_nump .";";

            $insert_sched_policy =  "INSERT INTO dtr_policies (dtr_id, policy, value) SELECT dtr.id,sched_pol.policy, sched_pol.value  FROM (" .$records_to_be_insert ." ) as table1
            JOIN dtrs as dtr on dtr.date = table1.date AND dtr.user_id = table1.user_id
            LEFT JOIN ( SELECT * FROM schedules GROUP BY id ORDER BY updated_at DESC ) as sched on table1.user_id = sched.bind_id
                AND (table1.date >= sched.valid_from AND sched.valid_to is null or table1.date <= sched.valid_to) AND sched.bind_to = 'user'
            LEFT JOIN change_schedules as change_sched ON change_sched.schedule_id = sched.id
            LEFT JOIN users on table1.user_id = users.id
            LEFT JOIN schedule_policies as sched_pol ON sched_pol.schedule_id = sched.id
            WHERE table1.date >= users.date_hired AND is_active = 1
            AND ( change_sched.status = 'approved' OR change_sched.status is null )
            GROUP BY table1.date,sched_pol.policy";

            $columns_to_selected[] = "table1.user_id";

            $columns_to_selected[] = "table1.date";

            $columns_to_selected[] = "sched_details.break_time as break_time";

            # Make sure the start time has correct date
            $start_time = "sched_details.start_time";
            $columns_to_selected[] = check_column_exist( $start_time , "unix_timestamp( table1.date ) + ". $start_time ) . " as start_datetime";

            # Make sure end time is always greater than the start time
            $end_time = "sched_details.end_time";
            $columns_to_selected[] = check_column_exist( $end_time ,check_column_end_datetime( "unix_timestamp( table1.date ) + ". $start_time , "unix_timestamp( table1.date ) + " . $end_time) ) ." as end_datetime";

            # Make sure flexy time is always greater that on duty / start time
            $start_flexy_time = "sched_details.start_flexy_time";
            $columns_to_selected[] = check_column_exist( $start_flexy_time ,check_column_start_flexy_time( "unix_timestamp( table1.date ) + ". $start_time ,"unix_timestamp( table1.date ) + ". $end_time , "unix_timestamp( table1.date ) + " . $start_flexy_time) ) ." as start_flexy_datetime";

            # Make sure the end flexy time is greater than on duty, off duty and start flexy time
            $end_flexy_time = "sched_details.end_flexy_time";
            $columns_to_selected[] = check_column_exist( $end_flexy_time ,check_column_end_flexy_time( "unix_timestamp( table1.date ) + ". $start_time ,"unix_timestamp( table1.date ) + ". $start_flexy_time , "unix_timestamp( table1.date ) + " . $end_time, "unix_timestamp( table1.date ) + " .$end_flexy_time) ) ." as start_flexy_datetime";

            $columns_to_selected[] = check_if_restday( "table1.date" , "sched.rest_days") . " as is_rest_day";

            $columns_to_selected[] = "NOW() as created_at";
            $columns_to_selected[] = "NOW() as updated_at";

            $insert_sql_raw = "INSERT INTO dtrs ( user_id, date, break_time, start_datetime, end_datetime, start_flexy_datetime, end_flexy_datetime, is_rest_day, created_at, updated_at) SELECT ". implode( "," ,$columns_to_selected ). $record_that_dont_exist . ";";

            $sql_raw = $insert_sql_raw. $delete_sched_pol. $insert_sched_policy;

            $result = DB::unprepared( $sql_raw );
            DB::commit();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [] , "dtr");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");

            return $result;
        } catch (Exception $e) {
            DB::rollback();
            log_to_file( 'info', get_constant('LOG_ROLLBACK'), [],  "dtr");
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");

            throw $e;
        }
    }

    /**
     *  Responsible for Generating DTR for a new hired user
     */
    public function generate_dtr_on_new_hire($user )
    {
        $days = 10;
        $dates = get_succeeding_days( $user->date_hired, $days ) ;

        $user_collection = new Collection();
        $user_collection->push((object)User::findOrFail($user->id));
        $this->generate_dtr( $user_collection, $dates );


    }

    /**
     *  Responsible for Applying the newly fetched Drupal DTR to the new DTR
     * @param array $drupal_evox_dtr_array
     *
     * @return Collection $dtr_collection
     */
    public function apply_drupal_evox_data_to_dtr( $drupal_evox_dtr_array )
    {
        DB::beginTransaction();
        try {

            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "drupal_migration");

            $result = [];

            // Iterates the Array fetched from the Drupal Database
            foreach( $drupal_evox_dtr_array as $drupal_evox_dtr) {

                // Fetch the User via the emp_num field of the User
                $user = User::where(['emp_num' => $drupal_evox_dtr->emp_num])->first();

                // Checks if the user is existing
                if( is_valid( $user ) ) {

                    // Fetch the DTR of the User via the Date
                    $dtr = $user->dtr($drupal_evox_dtr->date, $drupal_evox_dtr->date)->first();

                    // Checks if the DTR is existing
                    if( is_valid( $dtr ) ) {

                        # Update the DTR properties
                        $dtr->start_datetime        =  $drupal_evox_dtr->start_datetime;
                        $dtr->end_datetime          =  $drupal_evox_dtr->end_datetime;
                        $dtr->start_flexy_datetime  =  $drupal_evox_dtr->start_flexy_datetime;
                        $dtr->end_flexy_datetime    =  $drupal_evox_dtr->end_flexy_datetime;
                        $dtr->break_time            =  $drupal_evox_dtr->break_time;

                        $dtr->time_in               =  $drupal_evox_dtr->time_in;
                        $dtr->time_out              =  $drupal_evox_dtr->time_out;

                        $dtr->is_rest_day           =  $drupal_evox_dtr->is_rest_day;
                        $dtr->source_type_tagging   =  'default';
                        $dtr->update();

                        // Delete the existing DTR Policies before saving the new ones.
                        $dtr->policies()->delete();

                        // Create the Policies of the DTR
                        $dtr_collection = collect([
                            (object) ['policy' => 'allow_late',         'value' => $drupal_evox_dtr->allow_late],
                            (object) ['policy' => 'allow_undertime',    'value' => $drupal_evox_dtr->allow_undertime],
                            (object) ['policy' => 'allow_night_diff',   'value' => $drupal_evox_dtr->allow_night_diff]
                        ]);

                        // Save the DTR Policies base on the DTR Policies fetched .
                        $this->save_dtr_policies( $dtr, $dtr_collection );

                        // Compute for the Items
                        $this->compute_payroll_items( $dtr );


                        $result[] = $dtr;

                        log_to_file( 'info', 'Success', [$dtr->getAttributes()], "drupal_migration");

                    } else {
                        log_to_file( 'info', 'DTR not existing', [$drupal_evox_dtr], "drupal_migration");
                    }

                } else {
                    log_to_file( 'info', 'User not existing', [$drupal_evox_dtr], "drupal_migration");
                }

            }

            DB::commit();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "drupal_migration");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "drupal_migration");
            return $result;

        } catch (Exception $e) {
            DB::rollback();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "drupal_migration");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "drupal_migration");
            log_error($e);
            throw $e;
        }
    }



    /**
     *  Responsible for Applying of Schedule to DTR.
     * @param User|user_id $user_or_user_id
     * @param Schedule $schedule
     * @param $bypass
     *
     * @return array $result
     */
    public function apply_schedule_to_dtr( $user_or_user_id, Schedule $schedule, $bypass = false )
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

                    # Heirarchy: (Temporary Schedule | Change Schedule) > Default Schedule

                    // ## Removed this code since we're not applyng the Schedule Heirarchy when we apply a specific schedule.
                    // # If the Schedule Instance is Change Schedule AND the current DTR tagging was already set as Temporary/Rest Day Work, sets the Update Flag to FALSE
                    // if( $schedule->isChangeSchedule() && ($dtr->isTemporary() || $dtr->isRestDayWork()) ) {
                    //     $to_update_flag = false;
                    //     $result['not_updated'][] = $dtr;
                    // }

                    # If not gonna bypass and the Schedule Instance is Default AND the current DTR tagging was already set as Temporary/Change Schedule/Rest Day Work, sets the Update Flag to FALSE
                    if( !$bypass & $schedule->isDefault() && ($dtr->isTemporary() || $dtr->isChangeSchedule() || $dtr->isRestDayWork()) ) {
                        $to_update_flag = false;
                        $result['not_updated'][] = $dtr;
                    }
                    $rest_day_work = $dtr->rest_day_work()->first();

                    # Check if there's an Approved Rest Day Work for the current DTR. If yes, apply the Rest Day Work instead of the Schedule.
                    if( is_valid( $rest_day_work ) && $rest_day_work->isApproved() ) {

                        $this->apply_rest_day_work_to_dtr( $rest_day_work );

                    # Else Checks Normal Updates the DTR
                    } 
                    else if( $to_update_flag ) {

                        # Get the Schedule Details for the Day of the Specific Date. Returns null if not existing.
                        $schedule_detail = ( is_valid( $schedule ) ? $schedule->getPerDay( get_day_from_date( $dtr->date ) ) : null);

                        # Get the Parsed Schedule Detail to Date
                        $parsed_schedule_detail = ( is_valid( $schedule_detail ) ? $schedule_detail->getParsedDetailToDate( $dtr->date ) : null);
                        
                        

                        # Update the DTR properties
                        if($parsed_schedule_detail != null){
                            
                            $dtr_user_offset =  string_offset_to_seconds($dtr->user()->first()->country_timezone_to_offset());

                        
                            //optimize parsed_schedule_detail from dtr date if if it is not equels
                            $timestamp_start =  timestamp_to_date_default( $parsed_schedule_detail['start_datetime']+ $dtr_user_offset);

                            if($dtr->date !=   $timestamp_start){
                                $parsed_schedule_detail = $this->optimze_schedule_application($dtr->date,  $timestamp_start,  $parsed_schedule_detail);
                            } 

                            $dtr->start_datetime        =  $parsed_schedule_detail['start_datetime'];
                            $dtr->end_datetime          =  $parsed_schedule_detail['end_datetime'];
                            $dtr->start_flexy_datetime  =  $parsed_schedule_detail['start_flexy_datetime'];
                            $dtr->end_flexy_datetime    =  $parsed_schedule_detail['end_flexy_datetime'];
                            $dtr->break_time            =  $parsed_schedule_detail['break_time'];
                        }
                       
                        $dtr->is_rest_day           =  ( is_valid($schedule_detail) ) ? 0 : 1;
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
     *  Responsible for Removing the Schedule from DTR and apply the proper schedule.
     * @param User|user_id $user_or_user_id
     * @param Schedule $schedule
     * @return array $result
     */
    public function remove_schedule_to_dtr( $user_or_user_id, Schedule $schedule )
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

                    // Gets the Best Schedule for the DTR
                    $best_schedule = $dtr->getBestSchedule();

                    # Get the Schedule Details for the Day of the Specific Date. Returns null if not existing.
                    $schedule_detail = ( is_valid( $best_schedule ) ? $best_schedule->getPerDay( get_day_from_date( $dtr->date ) ) : null);

                    # Get the Parsed Schedule Detail to Date
                    $parsed_schedule_detail = ( is_valid( $schedule_detail ) ? $schedule_detail->getParsedDetailToDate( $dtr->date ) : null);

                    # Update the DTR properties
                    $dtr->start_datetime        =  $parsed_schedule_detail['start_datetime'];
                    $dtr->end_datetime          =  $parsed_schedule_detail['end_datetime'];
                    $dtr->start_flexy_datetime  =  $parsed_schedule_detail['start_flexy_datetime'];
                    $dtr->end_flexy_datetime    =  $parsed_schedule_detail['end_flexy_datetime'];
                    $dtr->break_time            =  $parsed_schedule_detail['break_time'];

                    $dtr->is_rest_day           =  ( is_valid($schedule_detail) ) ? 0 : 1;
                    $dtr->source_type_tagging   =  ( is_valid($best_schedule) ) ? $best_schedule->source_type : $dtr->source_type_tagging;

                    $dtr->update();

                    # Delete the existing DTR Policies before saving the new ones.
                    $dtr->policies()->delete();

                    # Save the DTR Policies base on the Schedule Policies.
                    $this->save_dtr_policies( $dtr, $best_schedule->schedule_policies()->get() );

                    # Compute for the Items
                    $this->compute_payroll_items( $dtr );

                    $result['updated'][] = $dtr;

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
     *  Responsible for Applying of Alter Log to DTR.
     * @param AlterLog $alter_log
     * @return Dtr $dtr
     */
    public function apply_alter_log_to_dtr( AlterLog $alter_log )
    {
        DB::beginTransaction();
        try {

            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'alter_log' => $alter_log ], "dtr");

            # Checks if the $rest_day_work instance are valid.
            if( is_valid( $alter_log ) && $alter_log->isApproved() ) {

                # Gets the DTR related on the Alter Log.
                $dtr = $alter_log->dtr()->first();

                if ($dtr === null) {
                    return get_constant('DTR_NOT_EXISTS');
                }

                // # Update the New Time in and out of the DTR.
                $dtr->time_in =     $alter_log->new_time_in;
                $dtr->time_out =    $alter_log->new_time_out;
                $dtr->update();
             
                # Compute for the Items
                $this->compute_payroll_items( $dtr );

                DB::commit();
                log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr");
                log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");
                return $dtr;
            }

        } catch (Exception $e) {
            DB::rollback();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");
            log_error($e);
            throw $e;
        }
    }



    /**
     *  Responsible for Removing the Alter Log from DTR and revert it from the original state.
     * @param AlterLog $alter_log
     * @return Dtr $dtr
     */
    public function remove_alter_log_from_dtr( AlterLog $alter_log )
    {
        DB::beginTransaction();
        try {

            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'alter_log' => $alter_log ], "dtr");

            # Checks if the $rest_day_work instance are valid and Declined.
            if( is_valid( $alter_log ) && $alter_log->isDeclined() ) {

                # Gets the DTR related on the Alter Log.
                $dtr = $alter_log->dtr()->first();

                if ($dtr === null) {
                    return get_constant('DTR_NOT_EXISTS');
                }

                // # Set the Time In/Out to Current Time in and out of the DTR.
                $dtr->time_in =     $alter_log->current_time_in;
                $dtr->time_out =    $alter_log->current_time_out;
                $dtr->update();

                # Compute for the Items
                $this->compute_payroll_items( $dtr );

                DB::commit();
                log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr");
                log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");
                return $dtr;
            }

        } catch (Exception $e) {
            DB::rollback();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");
            log_error($e);
            throw $e;
        }
    }



    /**
     *  Responsible for Applying of Rest Day Work to DTR.
     * @param RestDayWork $rest_day_work
     * @return Dtr $dtr
     */
    public function apply_rest_day_work_to_dtr( RestDayWork $rest_day_work )
    {
        DB::beginTransaction();
        try {

            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'rest_day_work' => $rest_day_work ], "dtr");

            # Checks if the $rest_day_work instance are valid.
            if( is_valid( $rest_day_work ) && $rest_day_work->isApproved() ) {

                # Gets the DTR related on the Rest Day Work.
                $dtr = $rest_day_work->dtr()->first();

                if ($dtr === null) {
                    return get_constant('DTR_NOT_EXISTS');
                }

                # Updates the DTR properties
                $dtr->start_datetime        =  add_time_to_timestamp( $rest_day_work->date, $rest_day_work->start_time );
                $dtr->end_datetime          =  add_time_to_timestamp( $rest_day_work->date, $rest_day_work->end_time );
                $dtr->time_in               =  add_time_to_timestamp( $rest_day_work->date, $rest_day_work->start_time );
                $dtr->time_out              =  add_time_to_timestamp( $rest_day_work->date, $rest_day_work->end_time );
                $dtr->start_flexy_datetime  =  null;
                $dtr->end_flexy_datetime    =  null;
                $dtr->break_time            =  $rest_day_work->break_time;
                $dtr->is_rest_day           =  true;
                $dtr->source_type_tagging   =  get_constant('DTR_SOURCE_TYPE_TAGGING.rest_day_work');

                # Checks if the Start-Time is greater than the End-Time, adds another day for the End-Time.
                if( $rest_day_work->start_time >= $rest_day_work->end_time ) {
                    $dtr->end_datetime = add_days_to_timestamp( $dtr->end_datetime, 1 );
                    $dtr->time_out = add_days_to_timestamp( $dtr->time_out, 1 );
                }

                # Updates the DTR with the Rest Day Work Details.
                $dtr->save();

                # Compute for the Items
                $this->compute_payroll_items( $dtr );

                DB::commit();
                log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr");
                log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");
                return $dtr;
            }

        } catch (Exception $e) {
            DB::rollback();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");
            log_error($e);
            throw $e;
        }
    }




    /**
     *  Responsible for Removing the Rest Day Work from DTR and revert it from the original state.
     * @param RestDayWork $rest_day_work
     * @return Dtr $dtr
     */
    public function remove_rest_day_from_dtr( RestDayWork $rest_day_work )
    {
        DB::beginTransaction();
        try {

            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'rest_day_work' => $rest_day_work ], "dtr");

            # Checks if the $rest_day_work instance are valid and Declined.
            if( is_valid( $rest_day_work ) && $rest_day_work->isDeclined() ) {

                # Gets the DTR related on the Rest Day Work.
                $dtr = $rest_day_work->dtr()->first();

                if ($dtr === null) {
                    return get_constant('DTR_NOT_EXISTS');
                }

                # Updates the DTR properties
                $dtr->start_datetime        =  null;
                $dtr->end_datetime          =  null;
                $dtr->start_flexy_datetime  =  null;
                $dtr->end_flexy_datetime    =  null;
                $dtr->break_time            =  null;
                $dtr->time_in               =  null;
                $dtr->time_out              =  null;
                $dtr->is_rest_day           =  true;
                $dtr->source_type_tagging   =  get_constant('DTR_SOURCE_TYPE_TAGGING.default');

                $dtr->save();

                # Compute for the Items
                $this->compute_payroll_items( $dtr );

                DB::commit();
                log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr");
                log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");
                return $dtr;
            }

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

                try{
                    // Parses the Proper Date of the Holiday ( To automate the condition for Pre-defined and non Pre-defined Holiday Dates. )
                    $date = $holiday->getProperDate( $start_date, $end_date );

                    // Fetch all the DTR that has a Holiday in the iteration.
                    if($holiday->country_id != null){
                        $holidays_ids_to_delete = Dtr::where("date",  $date)->whereHas('user', function ($query) use($holiday){
                            return $query->whereNotNull('country_id')->where('country_id', $holiday->country_id);
                        })
                        ->pluck('id')
                        ->toArray();
                        DtrHoliday::whereIn('dtr_id', $holidays_ids_to_delete)->delete();
                        
                         // Fetch all the DTR that has no Tagging of the Current Holiday in the iteration on specific users with country_id.
                         $dtr_collection = Dtr::whereHas('user', function ($query) use($holiday){
                            return $query->whereNotNull('country_id')->where('country_id', $holiday->country_id);
                        })->whereRaw(
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

                    }else{
                        // Fetch all the DTR that has no Tagging of the Current Holiday in the iteration.
                        $dtr_collection = Dtr::whereRaw(
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
                    }

                  

                    foreach( $dtr_collection as $dtr ) {
                        

                        $user =  $dtr->user()->first();
                        error_log($user->username);
                       if($user->country_id == $holiday->country_id || $holiday->country_id == null){
                        if($dtr->holidays()->count()  > 0){
                            //should override the holiday if it has country _id
                            if($dtr->holidays()->first()->country_id == null && $holiday->country_id != null){
                                $dtr->holidays()->delete();
                                $dtr->holidays()->save( $holiday );
                            }
                        }else{
                            $dtr->holidays()->save( $holiday );
                        }
                        // $dtr->holidays()->save( $holiday );
                        $result->push( $dtr );
                        log_to_file( 'info', 'Holiday Inserted on this DTR.' , ['dtr'=>$dtr, 'holiday'=>$holiday], "dtr");
                       }
                       else{
                        log_to_file( 'info', 'Holiday was not Inserted on this DTR due to diffferent country_id.' , ['dtr'=>$dtr, 'holiday'=>$holiday], "dtr");
                       }
                        
                       
                    }

                } catch (Exception $e) {
                    error_log($e->getMessage());
                   
                    log_to_file( 'info', '[RECORD ERROR: ID - '. $holiday->id. ' ' . __FUNCTION__ , ['holiday' => $holiday ] , "holiday");
                    continue;
                }

            }

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");
            DB::commit();
            return $result;

        } catch (Exception $e) {
            error_log($e->getMessage());
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
    // public function bind_leaves_to_dtr( array $bhr_leaves_array )
    // {
    //     log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "dtr");

    //     DB::beginTransaction();
    //     try {

    //         $result = new Collection;
    //         $processed_data = array();
    //         // Iterate the fetched Employee Leaves that was fetched from BHr.
    //         foreach( $bhr_leaves_array as $row ) {
    //             // Proceed only if the Status of the Leave Request is in the LEAVE REQUEST STATUS constant Array
    //             try {

    //                 if( in_array( $row->status->status, get_constant('LEAVE_REQUEST_STATUS') ) )   {
    //                     $user = $this->user->show_via_bhr_number( $row->employeeId );
    //                     // Get the DTR related on the Leave Request's Date Range
    //                     $dtr_collection = Dtr::select('dtrs.*')
    //                                             ->join('users', 'dtrs.user_id', '=', 'users.id')
    //                                             ->whereRaw("
    //                                                     users.bhr_num = ?
    //                                                     AND date BETWEEN ? AND ?
    //                                                 ", array(
    //                                                     $row->employeeId,
    //                                                     $row->start,
    //                                                     $row->end
    //                                                 )
    //                                             )->get();

    //                     // Iterate each DTR in order to bind the Leave on each DTR.
    //                     foreach( $dtr_collection as $dtr ) {

    //                         # Setting the Amount of Leave from the Leave request for the Corresponding Date
    //                         $amount = ( is_valid( $row->dates ) && property_exists($row->dates, $dtr->date) ) ? (float) $row->dates->{$dtr->date} : 0 ;

    //                         # Create the Leave Insert Value Array Structure
    //                         $leave_insert_values =  [
    //                             'dtr_id'              => ( is_valid( $dtr->id ) ) ?  "'".$dtr->id."'" : 'null',
    //                             'type'                => ( is_valid( $row->type ) && isset( $row->type->name ) ) ?  "'".$row->type->name."'" : 'null',
    //                             'status'              => ( is_valid( $row->status->status ) ) ?  "'".$row->status->status."'" : 'null',
    //                             'amount'              =>  "'". ( $amount == 0 ? 0 : ( $amount <= 0.5 ? 0.5 : 1 ) ) ."'",
    //                             'employee_note'       => ( is_valid( $row->notes ) && isset( $row->notes->employee ) ) ?  "'".addslashes($row->notes->employee)."'" : 'null',
    //                             'manager_note'        => ( is_valid( $row->notes ) && isset( $row->notes->manager ) ) ?  "'".addslashes($row->notes->manager)."'" : 'null',
    //                             'updated_by'          => 'NOW()',
    //                             'created_by'          => 'NOW()'
    //                         ];

    //                         # Append the imploded Leaves Insert Values into the Main Array that would be Batch Executed later once the Iteration is done.
    //                         $leave_insert_array[] = implode(",", $leave_insert_values);
    //                         $this->compute_payroll_items( $dtr );

    //                     }

    //                     $processed_data[] = [
    //                         "date" => $row->start .' - '.  $row->end,
    //                         "employee_no" =>  $user->emp_num,
    //                         "employee_name" => $user->first_name . ' ' . $user->last_name ,
    //                         "leave_type" =>( is_valid( $row->type ) && isset( $row->type->name ) ) ? $row->type->name: 'null',
    //                         "status" => ( is_valid( $row->status->status ) ) ? $row->status->status : 'null',
    //                         "amount" =>   ( is_valid( $row->amount->amount ) ) ? $row->amount->amount : 'null',
    //                     ];


    //                 }
    //             } catch (Exception $t) {
    //                 log_to_file( 'info', '[FOR LOOP ERROR - ' . "$row->id" . "]" . __FUNCTION__ , [], "dtr");
    //                 continue;
    //             }
    //         }

    //         # Creates the Customized Query for Batch inserting the To-be-generated Leaves.
    //         $leave_insert_query = "INSERT INTO leaves (
    //                                             dtr_id,
    //                                             type,
    //                                             status,
    //                                             amount,
    //                                             employee_note,
    //                                             manager_note,
    //                                             updated_at,
    //                                             created_at)
    //                                         VALUES (".implode( "), (", $leave_insert_array ).")
    //                                         ON DUPLICATE KEY UPDATE
    //                                             dtr_id          = VALUES(dtr_id),
    //                                             type            = VALUES(type),
    //                                             status          = VALUES(status),
    //                                             amount          = VALUES(amount),
    //                                             employee_note   = VALUES(employee_note),
    //                                             manager_note    = VALUES(manager_note),
    //                                             created_at      = IF(created_at IS NULL, VALUES(created_at), created_at),
    //                                             updated_at      = VALUES(updated_at)";

    //         # Executes the Batch Insert Query
    //         $result = [
    //             "result" => DB::insert($leave_insert_query),
    //             "total_dtr_count" => count( $leave_insert_array ),
    //             "dtr_leaves"   => $leave_insert_array
    //         ];

    //         // Update DTR Computations
    //         foreach( $dtr_collection as $dtr ) {
    //             $this->compute_payroll_items( $dtr );
    //         }

    //         log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $result, "dtr");
    //         log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");
    //         DB::commit();
    //         return $processed_data;

    //     } catch (Exception $e) {
    //         DB::rollback();
    //         log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr");
    //         log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");
    //         log_error($e);
    //         throw $e;
    //     }
    // }


    public function bind_leaves_to_dtr( array $bhr_leaves_array )
    {
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "dtr");

        DB::beginTransaction();
        try {

            $result = new Collection;
            $processed_data = array();
            // Iterate the fetched Employee Leaves that was fetched from BHr.
            foreach( $bhr_leaves_array as $row ) {
                // Proceed only if the Status of the Leave Request is in the LEAVE REQUEST STATUS constant Array
                try {
                    
                    if( in_array( $row->status->status, get_constant('LEAVE_REQUEST_STATUS') ) )   {
                        $user = $this->user->show_via_bhr_number( $row->employeeId );

                        
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
                            $amount = ( is_valid( $row->dates ) && property_exists($row->dates, $dtr->date) ) ? (float) $row->dates->{$dtr->date} : 0 ;

                            # Create the Leave Insert Value Array Structure
                            $leave_insert_values =  [
                                'dtr_id'              => ( is_valid( $dtr->id ) ) ?  "'".$dtr->id."'" : 'null',
                                'type'                => ( is_valid( $row->type ) && isset( $row->type->name ) ) ?  "'".$row->type->name."'" : 'null',
                                'status'              => ( is_valid( $row->status->status ) ) ?  "'".$row->status->status."'" : 'null',
                                'amount'              =>  "'". ( $amount == 0 ? 0 : ( $amount <= 0.5 ? 0.5 : 1 ) ) ."'",
                                'employee_note'       => ( is_valid( $row->notes ) && isset( $row->notes->employee ) ) ?  "'".addslashes($row->notes->employee)."'" : 'null',
                                'manager_note'        => ( is_valid( $row->notes ) && isset( $row->notes->manager ) ) ?  "'".addslashes($row->notes->manager)."'" : 'null',
                                'approved_by'         => ( is_valid( $row->status->lastChangedByUserId ) ) ?  "'".$row->status->lastChangedByUserId."'" : 'null',
                                'updated_by'          => 'NOW()',
                                'created_by'          => 'NOW()'
                            ];

                            # Append the imploded Leaves Insert Values into the Main Array that would be Batch Executed later once the Iteration is done.
                            $leave_insert_array[] = implode(",", $leave_insert_values);
                            $this->compute_payroll_items( $dtr );

                        }

                        $processed_data[] = [
                            "date" => $row->start .' - '.  $row->end,
                            "employee_no" =>  $user->emp_num,
                            "employee_name" => $user->first_name . ' ' . $user->last_name ,
                            "leave_type" =>( is_valid( $row->type ) && isset( $row->type->name ) ) ? $row->type->name: 'null',
                            'updated_by'         => ( is_valid( $row->status->lastChangedByUserId ) ) ?  "".$row->status->lastChangedByUserId."" : 'null',
                            "status" => ( is_valid( $row->status->status ) ) ? $row->status->status : 'null',
                            "amount" =>   ( is_valid( $row->amount->amount ) ) ? $row->amount->amount : 'null',
                        ];


                    }
                } catch (Exception $t) {
                    log_to_file( 'info', '[FOR LOOP ERROR - ' . "$row->id" . "]" . __FUNCTION__ , [], "dtr");
                    continue;
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
                                                updated_by,
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

            // Update DTR Computations
            foreach( $dtr_collection as $dtr ) {
                $this->compute_payroll_items( $dtr );
            }

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $result, "dtr");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr");
            DB::commit();
            return $processed_data;

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
    public function sync_biometrics_to_dtr( Collection $biometrics_collection, $dtr_id = null )
    {
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__, [], "biometrics");

        try {

            $result = new Collection;

            # If the Biometrics has value, proceed on the Iteration.
            if( $biometrics_collection->count() > 0 ) {

                foreach( $biometrics_collection as $biometrics ){

                    try{

                        $dtr = $this->apply_biometrics_to_dtr( $biometrics, $dtr_id );
                        if( is_valid( $dtr ) ){

                            $result->push( $dtr );

                            // If the DTR has Valid Time Logs, trigger the computation for Payroll items.
                                $this->compute_payroll_items( $dtr );
                        }

                    } catch (Exception $e) {
                        log_to_file( 'info', '[RECORD ERROR' . __FUNCTION__ . ']',  ['biometrics'=> $biometrics], "biometrix");
                        continue;
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
     * @return Dtr $dtr_collection ( Collection )
     */
    public function get_dtr_logs(Collection $user_collection, string $start_date, string $end_date ){
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'user_collection' => $user_collection, 'start_date'=> $start_date, 'end_date'=> $end_date], "dtr_summary");

        try{
            // Get the DTR Collection via the User ID from the collection and the date between the start_date and end_date. Added sorting for the Emp number, First and Last name, then DTR's date.
            $dtr_collection = Dtr::whereIn('user_id', $user_collection->pluck('id')->toArray())
                                   ->join('users', 'users.id','=','dtrs.user_id');

                //  This is for My Team Schedule
                if( request()->get('link') == 'team_schedule' ){
                    if( request()->get('page')== 'day' ){
                        $dtr_collection ->whereRaw("
                           (
                                start_datetime BETWEEN ".strtotime($start_date)." AND ".strtotime($end_date)."
                                    OR
                                end_datetime BETWEEN ".strtotime($start_date)." AND ".strtotime($end_date)."
                                    OR
                                date BETWEEN '".$start_date."' AND  '".$end_date."'
                            )
                        ");
                    }else{
                        $dtr_collection ->whereRaw("
                        (
                             date BETWEEN '".$start_date."' AND  '".$end_date."'
                         )
                     ");
                    }


                    $dtr_collection ->orderBy('dtrs.date','asc')
                                    ->orderBy('dtrs.start_datetime','asc')
                                    ->orderBy('users.emp_num','asc');


                }else{
                    $dtr_collection->whereBetween("date", array($start_date, $end_date));

                    $dtr_collection->orderBy('users.emp_num','asc')
                                   ->orderBy('users.first_name','asc')
                                   ->orderBy('users.last_name','asc')
                                   ->orderBy('dtrs.date','asc');
                }

                $dtr_collection->select('dtrs.*');

                $dtr_collection = $dtr_collection->get();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [$dtr_collection], "dtr_summary");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr_summary");

            return $dtr_collection;
        } catch (Exception $e) {
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr_summary");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr_summary");
            throw $e;
        }
    }

    public function new_get_dtr_logs(Collection $user_collection, string $start_date, string $end_date){
        try {  
            $user_collection_paginated = [];
            $result = 
            // DB::table('drt_summary_report')
            DtrSummaryReport::whereIn('user_id', $user_collection->pluck('id')->toArray())
                ->select(
                    DB::raw("CONCAT(IF(users.first_name IS NOT NULL,users.first_name,''),
                                                IF(users.middle_name IS NOT NULL,users.middle_name,''),
                                                IF(users.last_name IS NOT NULL,users.last_name,'')) 
                                                AS EmployeeName"),
                    'users.emp_num',
                    'users.email',
                    'users.username',
                    DB::raw("sum(drt_summary_report.unpaid_leave) as ul"),
                    DB::raw("sum(drt_summary_report.on_leave) as vl_sl"),
                    DB::raw("sum(drt_summary_report.reg_late) as reg_late"),
                    DB::raw("sum(drt_summary_report.reg_undertime) as reg_under_time"),
                    DB::raw("sum(drt_summary_report.reg_rendered_hours 
                                                            + IF(drt_summary_report.render_status=1,drt_summary_report.reg_rendered_hours_overlapp,0)) 
                                                            -sum(drt_summary_report.reg_night_diff + 
                                                            IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.reg_night_diff_overlapp,0)) as reg_rendered_hr"),
                    DB::raw("sum(drt_summary_report.reg_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.reg_night_diff_overlapp,0)) as reg_night_dif"),
                    DB::raw("sum(drt_summary_report.reg_overtime) as reg_over_time"),
                    DB::raw("sum(drt_summary_report.reg_overtime_night_diff) as reg_over_night_dif"),
                    DB::raw("sum(drt_summary_report.rd_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.rd_rendered_hours_overlapp,0)) - sum(drt_summary_report.rd_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.rd_night_diff_overlapp,0)) as rd_rendered_hr"),
                    // DB::raw("sum(drt_summary_report.rd_night_diff + drt_summary_report.rd_night_diff_overlapp) as rd_night_dif"),
                    DB::raw("sum(drt_summary_report.rd_overtime) as rd_over_time"),
                    DB::raw("sum(drt_summary_report.rd_overtime_night_diff) as rd_over_night_dif"),
                    DB::raw("sum(drt_summary_report.lh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.lh_rendered_hours_overlapp,0)) 
                                                            -sum(drt_summary_report.lh_night_diff 
                                                            + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.lh_night_diff_overlapp,0)) as lh_rendered_hr"),
                    DB::raw("sum(drt_summary_report.lh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.lh_night_diff_overlapp,0)) as lh_night_dif"),
                    DB::raw("sum(drt_summary_report.lh_overtime) as lh_over_time"),
                    DB::raw("sum(drt_summary_report.lh_overtime_night_diff) as lh_over_night_dif"),
                    DB::raw("sum(drt_summary_report.sh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.sh_rendered_hours_overlapp,0)) 
                                                            -sum(drt_summary_report.sh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.sh_night_diff_overlapp,0)) as sh_rendered_hr"),
                    DB::raw("sum(drt_summary_report.sh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.sh_night_diff_overlapp,0)) as sh_night_dif"),
                    DB::raw("sum(drt_summary_report.sh_overtime) as sh_over_time"),
                    DB::raw("sum(drt_summary_report.sh_overtime_night_diff) as sh_over_night_dif"),
                    DB::raw("sum(drt_summary_report.dsh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.dsh_rendered_hours_overlapp,0)) 
                                                            -sum(drt_summary_report.dsh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dsh_night_diff_overlapp,0)) as dsh_rendered_hr"),
                    DB::raw("sum(drt_summary_report.dsh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dsh_night_diff_overlapp,0)) as dsh_night_dif"),
                    DB::raw("sum(drt_summary_report.dsh_overtime) as dsh_over_time"),
                    DB::raw("sum(drt_summary_report.dsh_overtime_night_diff) as dsh_over_night_dif"),
                    DB::raw("sum(drt_summary_report.dlh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.dlh_rendered_hours_overlapp,0)) 
                                                            -sum(drt_summary_report.dlh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dlh_night_diff_overlapp,0)) as dlh_rendered_hr"),
                    DB::raw("sum(drt_summary_report.dlh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dlh_night_diff_overlapp,0)) as dlh_night_dif"),
                    DB::raw("sum(drt_summary_report.dlh_overtime) as dlh_over_time"),
                    DB::raw("sum(drt_summary_report.dlh_overtime_night_diff) as dlh_over_night_dif"),
                    DB::raw("sum(drt_summary_report.slh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.slh_rendered_hours_overlapp,0)) 
                                                            -sum(drt_summary_report.slh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.slh_night_diff_overlapp,0)) as slh_rendered_hr"),
                    DB::raw("sum(drt_summary_report.slh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.slh_night_diff_overlapp,0)) as slh_night_dif"),
                    DB::raw("sum(drt_summary_report.slh_overtime) as slh_over_time"),
                    DB::raw("sum(drt_summary_report.slh_overtime_night_diff) as slh_over_night_dif")
                )

                ->whereIn('user_id', $user_collection->pluck('id')->toArray()) // NEW

                ->join('users', 'users.id', '=', 'drt_summary_report.user_id')
                ->join('users_supervisors', 'users_supervisors.user_id', '=', 'drt_summary_report.user_id')
                ->join('departments', 'users.department_id', '=', 'departments.id');
            // if (is_valid($request->department_id)) {
            //     if (is_valid($request->sup_id)) {
            //         $result->where('users_supervisors.supervisor_id', '=', $request->sup_id);
            //     }
            // }

            //$result->whereBetween('drt_summary_report.login_date', [$request->valid_from, $request->valid_to]);
            $result->whereBetween('drt_summary_report.login_date', [$start_date,  $end_date]); // note to self, is this 00:00 start and 59:59 end? 
        
        
        
            // if (is_valid($request->department_id)) {
            //     $result->where('users.department_id', '=', $request->department_id);
            // } else {
            //     $result->whereRaw('users.department_id IS NOT NULL');
            // }
        
            // if (is_valid($request->name)) {
            //     $result->whereRaw('(first_name like ? OR middle_name like ? OR last_name like ?)', array('%' . trim($request->name) . '%', '%' . trim($request->name) . '%', '%' . trim($request->name) . '%'));
            // }
            $result
            // ->whereRaw('(is_active = ' . (is_valid($request->is_active) ? $request->is_active : '1') . ' or termination_date BETWEEN "' . $request->valid_from . '" AND "' . $request->valid_to . '")')
                ->groupBy('users.first_name', 'users.middle_name', 'users.last_name', 'users.emp_num', 'users.email', 'users.username', 'users.id');
            


            return $result;

        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
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




    /**
     * Gets the leaves binded from the specific DTR collections
     * @param Collection $dtr_collection
     * @return Collection $leaves_collections
     */
    public function get_leaves_from_dtr( Collection $dtr_collection ){
        try{
            $leaves_collections = Leave::whereIn('dtr_id', $dtr_collection->pluck('id'))->get();
            return $leaves_collections;
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
     * @return Dtr $result
     */
    protected function apply_biometrics_to_dtr( Biometrics $biometrics, $dtr_id = null )
    {
        DB::beginTransaction();
        try {


            # Sets the Result as null by default.
            $result = null;

            # Fetches the Respective First DTR for the Biometrics parameter. This DTR will be updated with the CheckTime from the Biometrics.
            if ($dtr_id) {
                $dtr = Dtr::find($dtr_id);
            } else {
                $dtr = Dtr::select('dtrs.*')
                            ->join('users', 'dtrs.user_id', '=', 'users.id')
                                    ->whereRaw(
                                        "users.emp_num = '".$biometrics->getParsedEmpNum()."'
                                            AND (
                                            ". $biometrics->getDutyType() ." BETWEEN  '". $biometrics->getFrom() ."' AND '". $biometrics->getTo() ."'
                                            OR 
                                            ". $biometrics->getFlexyType() ." BETWEEN  '". $biometrics->getFrom() ."' AND '". $biometrics->getTo() ."'
                                            OR 
                                            date = '".date("Y-m-d" , datetime_to_timestamp( $biometrics->CheckTime ))."'
                                            )"
                                    )->first();
            }

            # If the fetched DTR exist, update the Specific Time Type with the Biometrics' Check Time.
            if( is_valid( $dtr ) ) {

                # Check if no schedule on specific DTR, if none then assign schedule from user's default schedule details
                if (!is_valid($dtr->start_datetime) && !is_valid($dtr->end_datetime) && !is_valid(Auth::user()->defaultSchedule())) {
                    $schedule = $dtr->getBestSchedule();
                    $schedule_detail = $schedule->schedule_details[0];

                    # Get the Parsed Schedule Detail to Date
                    $parsed_schedule_detail = ( is_valid( $schedule_detail ) ? $schedule_detail->getParsedDetailToDate( $dtr->date ) : null);

                    $dtr->start_datetime        = $parsed_schedule_detail['start_datetime'];
                    $dtr->end_datetime          = $parsed_schedule_detail['end_datetime'];
                    $dtr->start_flexy_datetime  = $parsed_schedule_detail['start_flexy_datetime'];
                    $dtr->end_flexy_datetime    = $parsed_schedule_detail['end_flexy_datetime'];
                    $dtr->break_time            = $parsed_schedule_detail['break_time'];
                }

                $dtr->{ $biometrics->getTimeType() } = datetime_to_timestamp( $biometrics->CheckTime );
                $dtr->update();
                $result = $dtr;


                $dtr_prev = Dtr::where("user_id", Auth::user()->id)->where('date', Carbon::parse($biometrics->CheckTime)->subDay(1)->format("Y-m-d"))->first();;
                if($dtr_prev == null &&  Auth::user()->date_hired){
                    if(Auth::user()->date_hired <Carbon::parse($biometrics->CheckTime)->subDay(1)->format("Y-m-d") ){
                                $days = 1;
                                $start_generated_date = Carbon::parse($biometrics->CheckTime)->subDay(1);
                                $dates = get_succeeding_days_basic(  $start_generated_date , $days ) ;
                                $user_collection = new Collection();
                                $user_collection->push((object)User::findOrFail(Auth::user()->id));
                                $this->generate_dtr( $user_collection, $dates );

                                log_to_file( 'info', "previous DTR not Existing." , ['biometrics'=> $biometrics], "biometrics");
                    }

                }


                DB::commit();
                log_to_file( 'info', "Biometrics Synced to DTR." , ['dtr'=>$dtr, 'biometrics'=> $biometrics], "biometrics");
            } else {
                if (Auth::user()) {
                    $days = 23;
                    $start_generated_date = Carbon::parse($biometrics->CheckTime)->subDay(7);
                    $dates = get_succeeding_days_basic(  $start_generated_date , $days ) ;
                    $user_collection = new Collection();
                    $user_collection->push((object)User::findOrFail(Auth::user()->id));
                    $result = $this->generate_dtr( $user_collection, $dates );
                    $result =$this->apply_biometrics_to_dtr($biometrics);

                    log_to_file( 'info', "DTR not Existing." , ['biometrics'=> $biometrics], "biometrics");
                }

                /* Commented old implementation of generate dtr upon quickpunch
                $days = 7;
                $dates = get_succeeding_days(  $biometrics->CheckTime , $days ) ;

                $emp_nump = Auth::user()->id;

                $columns_to_selected = [];

                if( $biometrics->CheckType == 'I' ){
                    $columns_to_selected[] = "table1.time_in";
                    $time_sql = " as time_in";
                    $table = "time_in";
                }elseif( $biometrics->CheckType == 'O' ){
                    $time_sql = " as time_out";
                    $columns_to_selected[] = "table1.time_out";
                    $table = "time_out";
                }

                # THIS SQL CREATES RECORD OF 7 DAYS RECORDS OF DTR
                $records_to_be_insert =  "SELECT ".$emp_nump." as user_id,".strtotime($biometrics->CheckType) ." ".$time_sql."," . implode(" as date UNION ALL SELECT  ".$emp_nump." as user_id, null ".$time_sql.",", $dates);


                # THIS SQL CREATES A RELATION
                $record_that_dont_exist = " FROM (" .$records_to_be_insert ." ) as table1
                LEFT JOIN dtrs as dtr on dtr.date = table1.date AND dtr.user_id = table1.user_id
                LEFT JOIN ( SELECT * FROM schedules GROUP BY id ORDER BY updated_at DESC ) as sched on table1.user_id = sched.bind_id
                    AND (table1.date >= sched.valid_from AND sched.valid_to is null or table1.date <= sched.valid_to) AND sched.bind_to = 'user'
                LEFT JOIN change_schedules as change_sched ON change_sched.schedule_id = sched.id
                LEFT JOIN schedule_details as sched_details ON sched_details.schedule_id = sched.id
                    AND ( sched_details.day = LOWER(SUBSTRING(DAYNAME(table1.date),1, 3)) or sched_details.day='all')
                LEFT JOIN users on table1.user_id = users.id
                WHERE dtr.date is NULL AND dtr.user_id is NULL AND table1.date >= users.date_hired AND is_active = 1
                AND ( change_sched.status = 'approved' OR change_sched.status is null )
                GROUP BY table1.date";

                $delete_sched_pol = "DELETE dtr_policies from dtr_policies JOIN dtrs ON dtrs.id = dtr_policies.dtr_id WHERE dtrs.date in ( ". implode(" ,", $dates) ." ) AND dtrs.user_id = ".  $emp_nump .";";

                $insert_sched_policy =  "INSERT INTO dtr_policies (dtr_id, policy, value) SELECT dtr.id,sched_pol.policy, sched_pol.value  FROM (" .$records_to_be_insert ." ) as table1
                JOIN dtrs as dtr on dtr.date = table1.date AND dtr.user_id = table1.user_id
                LEFT JOIN ( SELECT * FROM schedules GROUP BY id ORDER BY updated_at DESC ) as sched on table1.user_id = sched.bind_id
                    AND (table1.date >= sched.valid_from AND sched.valid_to is null or table1.date <= sched.valid_to) AND sched.bind_to = 'user'
                LEFT JOIN change_schedules as change_sched ON change_sched.schedule_id = sched.id
                LEFT JOIN users on table1.user_id = users.id
                LEFT JOIN schedule_policies as sched_pol ON sched_pol.schedule_id = sched.id
                WHERE table1.date >= users.date_hired AND is_active = 1
                AND ( change_sched.status = 'approved' OR change_sched.status is null )
                GROUP BY table1.date,sched_pol.policy";

                $columns_to_selected[] = "table1.user_id";

                $columns_to_selected[] = "table1.date";

                $columns_to_selected[] = "sched_details.break_time as break_time";

                $start_time = "sched_details.start_time";
                $columns_to_selected[] = check_column_exist( $start_time , "unix_timestamp( table1.date ) + ". $start_time ) . " as start_datetime";

                $end_time = "sched_details.end_time";
                $columns_to_selected[] = check_column_exist( $end_time ,check_column_end_datetime( "unix_timestamp( table1.date ) + ". $start_time , "unix_timestamp( table1.date ) + " . $end_time) ) ." as end_datetime";

                $start_flexy_time = "sched_details.start_flexy_time";
                $columns_to_selected[] = check_column_exist( $start_flexy_time ,check_column_start_flexy_time( "unix_timestamp( table1.date ) + ". $start_time ,"unix_timestamp( table1.date ) + ". $end_time , "unix_timestamp( table1.date ) + " . $start_flexy_time) ) ." as start_flexy_datetime";


                $end_flexy_time = "sched_details.end_flexy_time";
                $columns_to_selected[] = check_column_exist( $end_flexy_time ,check_column_end_flexy_time( "unix_timestamp( table1.date ) + ". $start_time ,"unix_timestamp( table1.date ) + ". $start_flexy_time , "unix_timestamp( table1.date ) + " . $end_time, "unix_timestamp( table1.date ) + " .$end_flexy_time) ) ." as start_flexy_datetime";

                $columns_to_selected[] = check_if_restday( "table1.date" , "sched.rest_days") . " as is_rest_day";

                $columns_to_selected[] = "NOW() as created_at";
                $columns_to_selected[] = "NOW() as updated_at";

                $insert_sql_raw = "INSERT INTO dtrs (".$table.",  user_id , date, break_time, start_datetime, end_datetime, start_flexy_datetime, end_flexy_datetime, is_rest_day, created_at, updated_at) SELECT ". implode( "," ,$columns_to_selected ). $record_that_dont_exist . ";";
                $sql_raw = $insert_sql_raw. $delete_sched_pol. $insert_sched_policy;

                DB::unprepared($sql_raw);

                $result = null;

                log_to_file( 'info', "DTR not Existing. 1 week generation is performed." , ['biometrics'=> $biometrics], "biometrics" );
                */
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
     * @param $schedule_policies_collection (SchedulePolicies)
     * @return bool
     */
    protected function save_dtr_policies(Dtr $dtr, $schedule_policies_collection){
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

        /**
     *  Responsible for optimizing and comparing date schedule before applying to the current DTR Instance.
     *
     * 
     */
    private function optimze_schedule_application($date_of_dtr, $date_of_schedule_to_compare, $parsed_schedule_detail){
        try{
            $date_of_dtr = Carbon::parse($date_of_dtr);
            $date_of_schedule = Carbon::parse($date_of_schedule_to_compare);
         
            $difference_of_days = $date_of_schedule->diffInDays($date_of_dtr,false) ;
         
            // dd($date_of_dtr ,$date_of_dtr->timestamp ,$date_of_schedule, $date_of_schedule->timestamp,$date_of_dtr->timestamp > $date_of_schedule->timestamp);
            if(   $difference_of_days != 0){
                // add_days_to_timestamp();
                if($parsed_schedule_detail != null){
                   $parsed_schedule_detail['start_datetime']        =  add_days_to_timestamp($parsed_schedule_detail['start_datetime'],$difference_of_days);
                   $parsed_schedule_detail['end_datetime']          =  add_days_to_timestamp($parsed_schedule_detail['end_datetime'],$difference_of_days);
                   $parsed_schedule_detail['start_flexy_datetime']  =  $parsed_schedule_detail['start_flexy_datetime'] != null ? add_days_to_timestamp($parsed_schedule_detail['start_flexy_datetime'],$difference_of_days): null;
                   $parsed_schedule_detail['end_flexy_datetime']    =  $parsed_schedule_detail['end_flexy_datetime']   != null ? add_days_to_timestamp($parsed_schedule_detail['end_flexy_datetime'],$difference_of_days): null;
                //    $parsed_schedule_detail['break_time']            =  $parsed_schedule_detail['break_time'];
                }
               
            }

            // dd(  $parsed_schedule_detail,$date_of_dtr,$date_of_schedule, $date_of_dtr == $date_of_schedule, $difference_of_days);

            return $parsed_schedule_detail;


        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }



    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################


    //....

    /**
     *  Responsible for Applying of Schedule to DTR.
     * @param User|user_id $user_or_user_id
     * @param Schedule $schedule
     * @param $bypass
     *
     * @return array $result
     */
    public function apply_dtr_to_simcorp_dtr( $user, $bypass = false ,  $valid_from, $valid_to , $sched_policy)
    // public function apply_dtr_to_simcorp_dtr( $user, $bypass = false )
    {
        DB::beginTransaction();
        try {



            $result = [
                'updated' => [],
                'not_updated' => []
            ];

            $user = ( $user->id instanceof User ) ? $user->id : User::findOrFail($user->id);
            if( is_valid( $user ) ) {

                    $dtr_collection = $user->dtr($valid_from, $valid_to)->get();


                foreach( $dtr_collection as $dtr ) {
                    
                    # Default Flag
                    $to_update_flag = true;

                    if( !$bypass  && ($dtr->isTemporary() || $dtr->isChangeSchedule() || $dtr->isRestDayWork()) ) {
                        $to_update_flag = false;
                        $result['not_updated'][] = $dtr;
                    }
       

                    if( ($dtr->rest_day_work()->where('status','=','pending')->get()->count() > 0  
                    && ($dtr->holidays()->count() > 0) )){
                        $to_update_flag = false;
                       
                    }
                    if( ($dtr->rest_day_work()->where('status','=','approved')->get()->count() == 0  
                    && ($dtr->holidays()->count() > 0) )){
                        $to_update_flag = false;
                    }
                    if($dtr->isRestDay() && $dtr->rest_day_work()->where('status','=','approved')->get()->count() > 0 && !($dtr->holidays()->count() > 0) ){
                        $to_update_flag = false;
                    }
                    if (!($dtr->hasSchedule())){
                        $to_update_flag = false;
                    }
                    if( $to_update_flag ) {

                        
                                $dtr->time_in                  =$dtr->start_datetime;
                                $dtr->time_out                 =$dtr->end_datetime ;

                                $dtr->update();

                                $dtr->policies()->delete();

                                $this->save_dtr_policies( $dtr,  $sched_policy);

                                $this->compute_payroll_items( $dtr );
                    // }
                                

                                

                    $result['updated'][] = $dtr;
                    //    } // has sched
                    }

                }
            }

            DB::commit();
          
            return $result;

        } catch (Exception $e) {
          
            throw $e;
        }
    }

}
