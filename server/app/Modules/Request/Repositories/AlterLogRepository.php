<?php 

namespace App\Modules\Request\Repositories;

use Exception;
use App\Modules\User\Models\User;

use Illuminate\Support\Facades\DB;

use App\Modules\Payroll\Models\Dtr;
use Illuminate\Support\Facades\Log;

use Illuminate\Support\Facades\Auth;

use Illuminate\Database\Eloquent\Model;

use App\Modules\Request\Models\AlterLog;
use App\Modules\Payroll\Repositories\DtrRepository;
use App\Modules\Request\Resources\AlterLogResource;

class AlterLogRepository implements AlterLogRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    public function __construct(){

    }


    /**
     *  Responsible for Storing the AlterLog Request
     * @param array (AlterLog Post Variables) $data
     * @return AlterLog $AlterLog
     */
    public function store(array $data)
    {
        DB::beginTransaction();
        try {   
            $auth_user_offset =  Auth::user() && Auth::user()->country_timezone_to_offset() ? string_offset_to_seconds(Auth::user()->country_timezone_to_offset()): 0; 
            $alter_log = new AlterLog();
            $alter_log->user_id             = ( isset( $data['user_id'] ) && is_valid( $data['user_id'] ) ) ? $data['user_id'] : auth()->user()->id;
            $alter_log->date                = ( isset( $data['date'] ) && is_valid( $data['date'] ) ) ? $data['date'] : null;
            $alter_log->current_time_in     = ( isset( $data['current_time_in'] ) && is_valid( $data['current_time_in'] ) ) ? strtotime($data['current_time_in']) - $auth_user_offset: null ;
            $alter_log->current_time_out    = ( isset( $data['current_time_out'] ) && is_valid( $data['current_time_out'] ) ) ? strtotime($data['current_time_out']) - $auth_user_offset: null ;
            $alter_log->new_time_in         = ( isset( $data['new_time_in'] ) && is_valid( $data['new_time_in'] ) ) ? strtotime($data['new_time_in']) - $auth_user_offset: null ;
            $alter_log->new_time_out        = ( isset( $data['new_time_out'] ) && is_valid( $data['new_time_out'] ) ) ? strtotime($data['new_time_out']) - $auth_user_offset: null ;
            $alter_log->employee_note       = ( isset( $data['employee_note'] ) && is_valid( $data['employee_note'] ) ) ? $data['employee_note'] : null;
            $alter_log->updated_by          = auth()->user()->id;
            $alter_log->created_by          = auth()->user()->id;
            $alter_log->save();
            
            DB::commit();
            log_to_file('info', 'Success', [$alter_log], 'request');
            return $alter_log;
        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for Updating the AlterLog Request 
     * @param array (AlterLog Post Variables) $data
     * @param AlterLog (Alter Log Instance/ ID String ) $id_or_alter_log
     * @return AlterLog $AlterLog
     */
    public function update(array $data, $id_or_alter_log)
    {   
        DB::beginTransaction();
        try {   
            
            $alter_log =   ( $id_or_alter_log instanceof AlterLog ) ? $id_or_alter_log : AlterLog::findOrFail($id_or_alter_log);
            
            // Authenticate the User first if valid for the Update
            if( get_authenticated_user( $alter_log->user_id ) ) {
                $auth_user_offset =  Auth::user() && Auth::user()->country_timezone_to_offset() ? string_offset_to_seconds(Auth::user()->country_timezone_to_offset()): 0; 
                $alter_log->date                = ( isset( $data['date'] ) && is_valid( $data['date'] ) ) ? $data['date'] : $alter_log->date ;
                $alter_log->current_time_in     = ( isset( $data['current_time_in'] ) && is_valid( $data['current_time_in'] ) ) ? strtotime($data['current_time_in']) - $auth_user_offset: $alter_log->current_time_in ;
                $alter_log->current_time_out    = ( isset( $data['current_time_out'] ) && is_valid( $data['current_time_out'] ) ) ? strtotime($data['current_time_out']) - $auth_user_offset: $alter_log->current_time_out ;
                $alter_log->new_time_in         = ( isset( $data['new_time_in'] ) && is_valid( $data['new_time_in'] ) ) ? strtotime($data['new_time_in']) - $auth_user_offset: $alter_log->new_time_in ;
                $alter_log->new_time_out        = ( isset( $data['new_time_out'] ) && is_valid( $data['new_time_out'] ) ) ? strtotime($data['new_time_out']) - $auth_user_offset: $alter_log->new_time_out ;

                $alter_log->employee_note       = ( isset( $data['employee_note'] ) && is_valid( $data['employee_note'] ) ) ? $data['employee_note'] : $alter_log->employee_note ;
                $alter_log->approver_note       = ( isset( $data['approver_note'] ) && is_valid( $data['approver_note'] ) ) ? $data['approver_note'] : $alter_log->approver_note ;
                $alter_log->updated_by          = auth()->user()->id;
                $alter_log->update();

                DB::commit();

                $alter_log->pending();

                log_to_file('info', 'Success', [$alter_log], 'request');
                return $alter_log;
            }
            
        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }


    }


    /**
     *  Responsible for Soft-Deleting the AlterLog Request from Database
     * @param $id
     * @return bool
     */
    public function destroy($id)
    {
        DB::beginTransaction();
        try {

            $alter_log = AlterLog::findOrFail($id);
            
            if( get_authenticated_user( $alter_log->user_id ) ) {

                $alter_log->updated_by = auth()->user()->id;

                $alter_log->update();

                $alter_log->delete();

                DB::commit();
                log_to_file('info', 'Success', [$alter_log], 'request');
                return true;

            }

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    
    /**
     *  Responsible for fetching the AlterLog Request with the ID given.
     * @param $id
     * @return AlterLog $AlterLog
     */
    public function find($id)
    {
        try {
            $alter_log = AlterLog::find($id);

            if( get_authenticated_user( $alter_log->user_id ) ) {
                
                log_to_file('info', 'Success', [$alter_log], 'request');
                return $alter_log;
            }

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for updating the Request's Details and Approving the Alteration Request with the ID given
     * @param array $data
     * @param $id
     * @return Alteration $alter_log
     */
    public function approve(array $data, $id)
    {
        DB::beginTransaction();
        try {
            
            # Fetch the Alter Log base on the ID
            $alter_log = AlterLog::findOrFail($id);

            // Authenticate the User first if the Alter Log Submitter is under the user logged in's supervisee
            if( is_under_supervisee( $alter_log->user_id ) ) {

                if(!empty($data)){
                    $this->update($data, $alter_log);
                }

                $alter_log->approve();
            }
            
            DB::commit();
            return $alter_log;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }



    /**
     *  Responsible for updating the Request's Details and Declining the Change Schedule Request with the ID given
     * @param array $data
     * @param $id
     * @return AlterLog $AlterLog
     */
    public function decline( array $data, $id)
    {
        DB::beginTransaction();
        try {
            
            # Fetch the Alter Log base on the ID
            $alter_log = AlterLog::findOrFail($id);

            // Authenticate the User first if the Alter Log Submitter is under the user logged in's supervisee
            if( is_under_supervisee( $alter_log->user_id ) ) {

                if(!empty($data)){ 
                    $this->update($data, $alter_log);
                }

                $alter_log->decline();
            }

            DB::commit();
            return $alter_log;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for updating the Request's Details and Declining the AlterLog Request with the ID given
     * @param array $data
     * @param $id
     * @return AlterLog $AlterLog
     */
    public function pending( $id )
    {
        try {

            $alter_log = AlterLog::findOrFail($id);
            $alter_log->pending();

            return $alter_log;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for updating the Request's Details and Declining the AlterLog Request with the ID given
     * @param array $data
     * @param $id
     * @return AlterLog $AlterLog
     */
    public function cancel( $id )
    {
        try {
            
            $alter_log = AlterLog::findOrFail($id);
            $alter_log->cancel();

            return $alter_log;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for Applying the newly fetched Drupal Overtimes to EVOX
     * @param array $drupal_evox_alter_log_array
     * 
     * @return arrayu $to_compute_items
     */
    public function apply_drupal_evox_data_to_alter_log( array $drupal_evox_alter_log_array )
    {   
        DB::beginTransaction();
        try {

            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "drupal_migration");

            $users_not_existing = [];
            $to_compute_items = [];

            // Iterates the Array fetched from the Drupal Database
            foreach( $drupal_evox_alter_log_array as $drupal_evox_alter_log) {


                // Fetch the User via the emp_num field of the User
                $user = User::where(['emp_num' => $drupal_evox_alter_log->employee_number])->first();
                // Checks if the user is existing
                if( !is_null($user ) ) {
                    $alter_log = $user->alter_log()->where(['date' => $drupal_evox_alter_log->date])->first();

                    # Insert Alter Log
                    if( $alter_log == null ) {
                        $alter_log                   = new AlterLog();
                    }

                    $alter_log->user_id          =  $user->id;
                    
                    $alter_log->date             =  $drupal_evox_alter_log->date;

                    $alter_log->current_time_in  =  $drupal_evox_alter_log->old_time_in;
                    $alter_log->current_time_out =   $drupal_evox_alter_log->old_time_out;

                    $alter_log->new_time_in      = $drupal_evox_alter_log->new_time_in;
                    $alter_log->new_time_out     = $drupal_evox_alter_log->new_time_out;

                    $alter_log->employee_note    =  $drupal_evox_alter_log->employee_note ?? null;
                    $alter_log->approver_note    =  $drupal_evox_alter_log->superviser_note ?? null;

                    $alter_log->status           =  $drupal_evox_alter_log->status;
                    $alter_log->created_by       =  $user->id;
                    $alter_log->created_at       =  $drupal_evox_alter_log->date_created;
                    $alter_log->updated_at       =  $drupal_evox_alter_log->date_updated;
                                        
                    $alter_log->save();

                     // Saved the To compute Items
                     if( in_array($alter_log->status, array('approved','declined')) ) {
                        $to_compute_items[] = $alter_log;
                    }

                    log_to_file( 'info', 'Success', [$alter_log->getAttributes()], "drupal_migration");

                } else {
                    // log_to_file( 'info', 'User not existing', [$drupal_evox_alter_log], "drupal_migration");
                    // $users_not_existing[$drupal_evox_alter_log->emp_num] = $drupal_evox_alter_log->emp_num;
                }

            }

            DB::commit();

            if( count( $users_not_existing ) > 0 ){
                log_to_file( 'info', 'Employee Numbers that does not exist"', [$users_not_existing], "drupal_migration");
            }

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "drupal_migration");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "drupal_migration");
            return $to_compute_items;
        } catch (Exception $e) {
            
            DB::rollback();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "drupal_migration");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "drupal_migration");
            log_error($e);
            throw $e;
        }
    }





}