<?php

namespace App\Modules\Cron\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Payroll\Repositories\BiometricsRepositoryInterface;
use App\Modules\Payroll\Repositories\DrupalEvoxRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollRepository;
use App\Modules\Payroll\Resources\DtrResource;
use App\Modules\Request\Repositories\OvertimeRepositoryInterface;
use App\Modules\Schedule\Repositories\ScheduleRepositoryInterface;
use App\Modules\Request\Repositories\ChangeScheduleRepositoryInterface;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepositoryInterface;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;

use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;
use App\Modules\Request\Repositories\AlterLogRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class CronController extends Controller
{
    protected $bhr;
    protected $payroll;
    protected $user;
    protected $dtr;
    protected $overtime;
    protected $schedule;
    protected $biometrics;
    protected $drupal_evox;
    

    public function __construct(BhrRepositoryInterface $bhr, 
                                PayrollRepository $payroll, 
                                UserRepositoryInterface $user, 
                                DtrRepositoryInterface $dtr, 
                                OvertimeRepositoryInterface $overtime,
                                ScheduleRepositoryInterface $schedule,
                                BiometricsRepositoryInterface $biometrics, 
                                DrupalEvoxRepositoryInterface $drupal_evox,
                                RestDayWorkRepositoryInterface $rest_day_work,
                                ChangeScheduleRepositoryInterface $change_schedule,
                                AlterLogRepositoryInterface $alter_log){
        $this->bhr = $bhr;
        $this->payroll = $payroll;
        $this->user = $user;
        $this->dtr = $dtr;
        $this->overtime = $overtime;
        $this->schedule = $schedule;
        $this->biometrics = $biometrics;
        $this->drupal_evox = $drupal_evox;
        $this->rest_day_work    = $rest_day_work;
        $this->change_schedule  = $change_schedule;
        $this->alter_log        = $alter_log;
    }


    /**
     * Initially Sync all the Users from BHr
     * @return \Illuminate\Http\JsonResponse
     */
    public function initial_sync_of_users($start_date = null, $end_date = null){
        try {

            /**
             *  Steps:
             *  1. Fetch all the User's BHR Number
             *  2. Insert and Iterate per User (generate Department if existing)
             *  3. Every iteration, save the Supervisor ID x User ID
             *  4. After iteration, insert the Supervisor ID x User ID on the matrix table.
             * 
             */

            $user_supervisor_pivot_array = [];

            # 1
            # Fetches all BHR Users Numbers and set it as a collection
            $bhr_user_number_collection = $this->bhr->get_all_bhr_user_numbers();
            
            # 2
            // Iterate the BHR User Numbers Collection and insert the user
            foreach( $bhr_user_number_collection as $bhr_user_number ) {

                $bhr_user = $this->bhr->get_user( $bhr_user_number, true );

                if( is_valid( $bhr_user ) ) {
                    
                    $user = $this->user->insert_bhr_user_to_evox( $bhr_user );

                    if( is_valid( $user ) ) {
                        # 3.
                        $user_supervisor_pivot_array[ $bhr_user->supervisorEId ][] = $user->id;
                    }
                }
            }
            
            # 4
            $apply_user_supervisor_pivot_result = $this->user->apply_user_supervisor_pivot( $user_supervisor_pivot_array );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $apply_user_supervisor_pivot_result,
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Sync all the Users from BHr base from the last changed date
     * @return \Illuminate\Http\JsonResponse
     */
    public function sync_users($since_date_to_sync = null){
        try {

            /**
             *  Steps:
             *  1. Fetch all the list User's BHR Number which was recently changed base on the parameter
             *  2. Iterate ever User and check if it's for Insert/Update (generate Department if existing)
             *  3. Every iteration, save the Supervisor ID x User ID
             *  4. After iteration, insert the Supervisor ID x User ID on the matrix table.
             * 
             */
            $user_supervisor_pivot_array = [];

            // If a $since_date_to_sync has parameter, use it as since date to sync. If not, use the date yesterday.
            if( is_valid( $since_date_to_sync ) ){
                $since_date_to_sync = date('Y-m-d', strtotime($since_date_to_sync)) . 'T00:00:00-00:00';
            } else {
                $since_date_to_sync = Carbon::today()->subDays(7)->format('Y-m-d') . 'T00:00:00-00:00';
            }

            # 1.
            # Fetches all the recently changed BHr Users ( grouped by Inserted and Updated )
            $bhr_user_number_array = $this->bhr->get_changed_users( $since_date_to_sync );
            
            # 2.
            # Iterate the actual BHR User Numbers array
            $processed_user = array();
            foreach( $bhr_user_number_array as $bhr_user_number ){
                $action = '';
                // Fetch the User if it's already existing in the System
                $user = $this->user->show_via_bhr_number( $bhr_user_number );
                
                # Fetch the BHr User Details
                $bhr_user = $this->bhr->get_user( $bhr_user_number, true );
                
                # If the User is existing in EVOX, Proceed on Updating the BHR User Instance
                if( is_valid( $user ) ){
                    $user = $this->user->update_bhr_user_to_evox( $user, $bhr_user );
                    $action = 'Update';

                # If the User is not existing in EVOX, Proceed on Inserting the BHR User Instance
                } else {
                    $user = $this->user->insert_bhr_user_to_evox( $bhr_user );

                    if( is_valid( $user ) ) {

                        # Fetch the Department of the User.
                        $department =  $user->department()->first();
                        
                        # Added generating of Schedule for the newly inserted user using the User's department default schedule
                        if( is_valid( $department ) ) {

                            $schedule = $department->defaultSchedule()->first();
                            $this->schedule->replicate_schedule_to_user( $schedule, $user );
                            
                        }

                        # Checks if the Date Hired is less than or equal to the nearest saturday date.
                        $nearest_saturday_date = Carbon::now()->next( Carbon::SATURDAY );
                        if( Carbon::parse( $user->date_hired )->lte( $nearest_saturday_date ) ){

                            # Generate DTR from the Date Hired up to the Saturday of this week.
                            $date_array = generate_date_array($user->date_hired, $nearest_saturday_date );
                            $this->dtr->generate_dtr( (new Collection())->add($user) , $date_array );
                        }
                    }
                    $action = 'New User';
                }

                # 3.
                if( is_valid( $user ) ) {
                    $user_supervisor_pivot_array[ $bhr_user->supervisorEId ][] = $user->id;
                }

                $processed_user[] = array(
                    'emp_num' =>  $user->emp_num ,
                    'name' =>  $user->first_name.' '.$user->last_name   ,
                    'action' =>  $action
                );

                        
            }

            # 4
            $apply_user_supervisor_pivot_result = $this->user->apply_user_supervisor_pivot( $user_supervisor_pivot_array );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $processed_user,
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }



    /**
     * Generates the Weekly DTR for all the Employees
     * @return \Illuminate\Http\JsonResponse
     */
    public function generate_weekly_dtr($start_date = null, $end_date = null){
        try {
            
            // Fetch the Current Cutoff that would be use as Date Range for Syncing of Holidays from BHR and Binding Holidays to DTR.
            if( !is_valid( $start_date ) && !is_valid( $end_date ) ) {
                $start_date =  Carbon::tomorrow();
                $end_date = 7;
            }

            # Fetches all the Active Users
            $user_collection = $this->user->get_all_active_users();

            # Generates the Date Range that would be generated as DTR for each Active Employees
            $date_array = generate_date_array($start_date, $end_date );
            
            # Test Data for Debugging
            // $date_array = generate_date_array( "2019-07-01", '2020-06-30' );
            
            $result = $this->dtr->generate_dtr( $user_collection, $date_array );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $result,
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Syncs the Biometrics' Data to DTR with specific Number of Minutes (3 minutes as of now.)
     * @param string $user_id
     * @param string $start_date
     * @param string $end_date
     * @return \Illuminate\Http\JsonResponse
     */
    public function sync_realtime_biometrics($start_datetime = null, $end_datetime = null){   
        try {
            
            // If Start Datetime and End Datetime is not set, fetch the Default 30 minutes gap from the current time.
            if( !is_valid( $start_datetime ) && !is_valid( $end_datetime ) ) {
                $start_datetime = Carbon::now()->subMinutes(30)->format('Y-m-d H:i:s');
                $end_datetime = Carbon::now()->format('Y-m-d H:i:s'); 
            }

            # Test Data for Debugging
            // $start_datetime = "2020-02-15 00:00:00";
            // $end_datetime = "2020-02-29 18:20:00"; 
            // $user_collection = User::get();

            $biometrics_collection = $this->biometrics->get_biometrics( $start_datetime, $end_datetime );
            
            $result = DtrResource::collection( $this->dtr->sync_biometrics_to_dtr( $biometrics_collection ) );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $result
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Syncs the BHr's Declared Holidays within the current Payroll Cutoff Date Range into the DTR affected.
     *  1. Fetch BHr Declared Holidays
     *  2. Insert Holidays in EVOX
     *  3. Bind Holidays to DTR
     * @return \Illuminate\Http\JsonResponse
     */
    public function sync_holidays($start_date = null, $end_date = null){
        try {
            
            // If Start Date and End Date is not set, Fetch the Current Cutoff that would be use as Date Range for Syncing of Holidays from BHR and Binding Holidays to DTR.
            if( !is_valid( $start_date ) && !is_valid( $end_date ) ) {
                $payroll_cutoff = $this->payroll->get_payroll_cutoff();
                $start_date = $payroll_cutoff->start_date;
                $end_date = $payroll_cutoff->end_date;
            }

            # Test Data for Debugging
            // $start_date = "2019-07-01";
            // $end_date = "2020-06-30";
            
            // Sync the Holidays from BHr to EVOX within the Payroll Cutoff as Date Range.
            $this->bhr->sync_holidays( $start_date, $end_date );

            // Binding of the Holidays within the Date Range to the DTR within the Date Range.
            $result = $this->dtr->bind_holidays_to_dtr( $start_date, $end_date );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                DtrResource::collection($result),
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Syncs the BHr's Submitted Leave Requests within the current Payroll Cutoff Date Range into the DTR affected.
     *  1. Fetch BHr Submitted Leave Requests
     *  2. Bind Leaves to DTR
     * @return \Illuminate\Http\JsonResponse
     */
    public function sync_leaves($start_date = null, $end_date = null){
        try {
            
            // If Start Date and End Date is not set, Fetch the Current Cutoff that would be use as Date Range for Syncing of Holidays from BHR and Binding Holidays to DTR.
            if( !is_valid( $start_date ) && !is_valid( $end_date ) ) {
                $payroll_cutoff = $this->payroll->get_payroll_cutoff();
                $start_date = $payroll_cutoff->start_date;
                $end_date = $payroll_cutoff->end_date;
            }

            # Test Data for Debugging
            // $start_date = "2019-07-01";
            // $end_date = "2020-06-30";

            // Fetch the Leaves from BHr within the Payroll Cutoff as Date Range.
            $bhr_leaves_array = $this->bhr->get_leaves( $start_date, $end_date );
            
            // Binding of the Leaves fetched from BHr within the Date Range to the DTR within the Date Range.
            $result = $this->dtr->bind_leaves_to_dtr( $bhr_leaves_array );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $result,
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Syncs the DTR from Existing EVOX to this new EVOX 
     *  1. Fetch DTR from EVOX base from the Start & End Date
     *  2. Update/Generate the DTR for the New EVOX using the details from the newly fetched from Existing EVOX
     * @return \Illuminate\Http\JsonResponse
     */
    public function sync_dtr($start_date = null, $end_date = null){
        try {
            
            // If Start Date and End Date is not set, Fetch the Current Cutoff that would be use as Date Range for Syncing of Holidays from BHR and Binding Holidays to DTR.
            if( !is_valid( $start_date ) && !is_valid( $end_date ) ) {
                $start_datetime = Carbon::yesterday()->format('Y-m-d H:i:s');
                $end_datetime = Carbon::yesterday()->endOfDay()->format('Y-m-d H:i:s');
            } else {
                $start_datetime = Carbon::parse($start_date)->format('Y-m-d H:i:s');
                $end_datetime = Carbon::parse($end_date)->endOfDay()->format('Y-m-d H:i:s');
            }   
            
            $drupal_evox_dtr_array = $this->drupal_evox->get_dtr( $start_datetime, $end_datetime );

            $result = $this->dtr->apply_drupal_evox_data_to_dtr( $drupal_evox_dtr_array );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $result,
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Syncs the Alter Logs from Existing EVOX to this new EVOX 
     *  1. Fetch Alter Logs from EVOX base from the Start & End Date
     *  3. Update/Generate the Alter Logs for the New EVOX using the details from the newly fetched from Existing EVOX
     * @return \Illuminate\Http\JsonResponse
     */
    public function sync_alter_log($start_date = null, $end_date = null){
        try {
            // If Start Date and End Date is not set, Fetch the Current Cutoff that would be use as Date Range for Syncing of Holidays from BHR and Binding Holidays to DTR.
            if( !is_valid( $start_date ) && !is_valid( $end_date ) ) {
                $start_datetime = Carbon::yesterday()->format('Y-m-d');
                $end_datetime = Carbon::yesterday()->endOfDay()->format('Y-m-d');
            } else {
                $start_datetime = Carbon::parse($start_date)->format('Y-m-d');
                $end_datetime = Carbon::parse($end_date)->endOfDay()->format('Y-m-d');
            }   
            
            $drupal_evox_alter_log_array = $this->drupal_evox->get_alter_log( $start_datetime, $end_datetime );
            
            $to_compute_items = $this->alter_log->apply_drupal_evox_data_to_alter_log( $drupal_evox_alter_log_array );

            if( count($to_compute_items) > 0 ){
                
                foreach( $to_compute_items as $alter_log ){

                    // Fetch the DTR instance from the Overtime
                    $dtr = $alter_log->dtr()->first();

                    // Compute only if the DTR is existing.
                    if( $dtr != null ) {
                        $this->dtr->compute_payroll_items( $dtr );
                    }
                }
            }

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $to_compute_items
            );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
    /*
     * Syncs the Overtime from Existing EVOX to this new EVOX 
     *  1. Fetch Overtime Requests from EVOX base from the Start & End Date
     *  2. Update/Generate the Request for the New EVOX using the details from the newly fetched from Existing EVOX
     * @return \Illuminate\Http\JsonResponse
     */
    public function sync_overtime($start_date = null, $end_date = null){
        try {
            
            // If Start Date and End Date is not set, Fetch the date yesterday
            if( !is_valid( $start_date ) && !is_valid( $end_date ) ) {
                $start_datetime = Carbon::yesterday()->format('Y-m-d H:i:s');
                $end_datetime = Carbon::yesterday()->endOfDay()->format('Y-m-d H:i:s');
            } else {
                $start_datetime = Carbon::parse($start_date)->format('Y-m-d H:i:s');
                $end_datetime = Carbon::parse($end_date)->endOfDay()->format('Y-m-d H:i:s');
            }   

            // Fetch the Drupal Overtime Data
            $drupal_evox_overtime_array = $this->drupal_evox->get_overtime( $start_datetime, $end_datetime);

            // Apply the Drupal Overtime Data to EVOX 
            $to_compute_items = $this->overtime->apply_drupal_evox_data_to_overtime( $drupal_evox_overtime_array );

            // Iterate the to-be-computed Overtime Instance
            if( count($to_compute_items) > 0 ){
                
                foreach( $to_compute_items as $overtime ){

                    // Fetch the DTR instance from the Overtime
                    $dtr = $overtime->dtr()->first();

                    // Compute only if the DTR is existing.
                    if( $dtr != null ) {
                        $this->dtr->compute_payroll_items( $dtr );
                    }
                }
            }

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $to_compute_items,
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Syncs the Rest Day Work from Existing EVOX to this new EVOX 
     *  1. Fetch Rest Day Work from EVOX base from the Start & End Date
     *  3. Update/Generate the Rest Day Work for the New EVOX using the details from the newly fetched from Existing EVOX
     * @return \Illuminate\Http\JsonResponse
     */
    public function sync_rest_day_work($start_date = null, $end_date = null){
        try {
            
            // If Start Date and End Date is not set, Fetch the Current Cutoff that would be use as Date Range for Syncing of Holidays from BHR and Binding Holidays to DTR.
            if( !is_valid( $start_date ) && !is_valid( $end_date ) ) {
                $start_datetime = Carbon::yesterday()->format('Y-m-d');
                $end_datetime = Carbon::yesterday()->endOfDay()->format('Y-m-d');
            } else {
                $start_datetime = Carbon::parse($start_date)->format('Y-m-d');
                $end_datetime = Carbon::parse($end_date)->endOfDay()->format('Y-m-d');
            }   
            
            $drupal_evox_rest_day_work_array = $this->drupal_evox->get_rest_day_work( $start_datetime, $end_datetime );

            $to_compute_items = $this->rest_day_work->apply_drupal_evox_data_to_rest_day_work( $drupal_evox_rest_day_work_array );

            if( count($to_compute_items) > 0 ){
                
                foreach( $to_compute_items as $rest_day_work ){

                    // Fetch the DTR instance from the Overtime
                    $dtr = $rest_day_work->dtr()->first();

                    // Compute only if the DTR is existing.
                    if( $dtr != null ) {
                        $this->dtr->compute_payroll_items( $dtr );
                    }
                }
            }

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $to_compute_items
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }




    /**
     * Syncs the Change Schedule from Existing EVOX to this new EVOX 
     *  1. Fetch Change Schedule from EVOX base from the Start & End Date
     *  3. Update/Generate the Change Schedule for the New EVOX using the details from the newly fetched from Existing EVOX
     * @return \Illuminate\Http\JsonResponse
     */
    public function sync_change_schedule($start_date = null, $end_date = null){
        try {
            
            // If Start Date and End Date is not set, Fetch the Current Cutoff that would be use as Date Range for Syncing of Holidays from BHR and Binding Holidays to DTR.
            if( !is_valid( $start_date ) && !is_valid( $end_date ) ) {
                $start_datetime = Carbon::yesterday()->format('Y-m-d');
                $end_datetime = Carbon::yesterday()->endOfDay()->format('Y-m-d');
            } else {
                $start_datetime = Carbon::parse($start_date)->format('Y-m-d');
                $end_datetime = Carbon::parse($end_date)->endOfDay()->format('Y-m-d');
            }   
      
            $drupal_evox_default_schedule_array = $this->drupal_evox->get_change_schedule( $start_datetime, $end_datetime );

            $to_compute_items = $this->change_schedule->apply_drupal_evox_data_to_change_schedule( $drupal_evox_default_schedule_array );

            if( count($to_compute_items) > 0 ){
                
                foreach( $to_compute_items as $change_of_schedule ){

                    // Fetch the DTR instance from the Overtime
                    $dtr = $change_of_schedule->dtr()->first();

                    // Compute only if the DTR is existing.
                    if( $dtr != null ) {
                        $this->dtr->compute_payroll_items( $dtr );
                    }
                }
            }

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $to_compute_items
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Syncs the Default Schedule from Existing EVOX to this new EVOX 
     *  1. Fetch Default Schedule from EVOX base from the Start & End Date
     *  2. Update/Generate the Default Schedule for the New EVOX using the details from the newly fetched from Existing EVOX
     * @return \Illuminate\Http\JsonResponse
     */
    public function sync_default_schedule($is_initial_sync = false){
        try {

            // Fetch the Drupal Default Schedule Data
            $drupal_evox_default_schedule_array = $this->drupal_evox->get_default_schedule( $is_initial_sync );

            // Apply the Drupal Default Schedule Data to EVOX 
            $schedule_collection = $this->schedule->apply_drupal_evox_data_to_default_schedule( $drupal_evox_default_schedule_array );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $schedule_collection,
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Syncs the Temporary Schedule from Existing EVOX to this new EVOX 
     *  1. Fetch Temporary Schedule from EVOX base from the Start & End Date
     *  2. Update/Generate the Temporary Schedule for the New EVOX using the details from the newly fetched from Existing EVOX
     * @return \Illuminate\Http\JsonResponse
     */
    public function sync_temporary_schedule($is_initial_sync = false){
        try {

            // Fetch the Drupal Temporary Schedule Data
            $drupal_evox_temporary_schedule_array = $this->drupal_evox->get_temporary_schedule( $is_initial_sync );

            // Apply the Drupal Temporary Schedule Data to EVOX 
            $schedule_collection = $this->schedule->apply_drupal_evox_data_to_temporary_schedule( $drupal_evox_temporary_schedule_array );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $schedule_collection,
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

}
