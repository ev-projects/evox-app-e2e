<?php 

namespace App\Modules\Request\Repositories;

use App\Modules\Payroll\Models\Dtr;
use App\Modules\Request\Models\AlterLog;

use App\Modules\Request\Resources\AlterLogResource;

use App\Modules\User\Models\User;
use Exception;

use Illuminate\Database\Eloquent\Model;

use App\Modules\Payroll\Repositories\DtrRepository;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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
            $alter_log = new AlterLog();
            $alter_log->user_id             = auth()->user()->id;
            $alter_log->date                = $data['date'];
            $alter_log->current_time_in     = ( isset( $data['current_time_in'] ) && is_valid( $data['current_time_in'] ) ) ? strtotime($data['current_time_in']) : null ;
            $alter_log->current_time_out    = ( isset( $data['current_time_out'] ) && is_valid( $data['current_time_out'] ) ) ? strtotime($data['current_time_out']) : null ;
            $alter_log->new_time_in         = strtotime($data['new_time_in']);
            $alter_log->new_time_out        = strtotime($data['new_time_out']);
            $alter_log->employee_note       = ( isset( $data['employee_note'] ) && is_valid( $data['employee_note'] ) ) ? $data['employee_note'] : null;
            $alter_log->updated_by          = auth()->user()->id;
            $alter_log->created_by          = auth()->user()->id;
            $alter_log->save();
            
            DB::commit();
            log_to_file('info', 'Success', [$alter_log]);
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
     * 
     * @return AlterLog $AlterLog
     */
    public function update(array $data, $id_or_alter_log)
    {   
        DB::beginTransaction();
        try {   
            
            $alter_log =   ( $id_or_alter_log instanceof AlterLog ) ? $id_or_alter_log : AlterLog::findOrFail($id_or_alter_log);
            
            // Authenticate the User first if valid for the Update
            if( get_authenticated_user( $alter_log->user_id ) ) {

                $alter_log->date                = ( isset( $data['date'] ) && is_valid( $data['date'] ) ) ? $data['date'] : $alter_log->date ;
                $alter_log->current_time_in     = ( isset( $data['current_time_in'] ) && is_valid( $data['current_time_in'] ) ) ? strtotime($data['current_time_in']) : $alter_log->current_time_in ;
                $alter_log->current_time_out    = ( isset( $data['current_time_out'] ) && is_valid( $data['current_time_out'] ) ) ? strtotime($data['current_time_out']) : $alter_log->current_time_out ;
                $alter_log->new_time_in         = ( isset( $data['new_time_in'] ) && is_valid( $data['new_time_in'] ) ) ? strtotime($data['new_time_in']) : $alter_log->new_time_in ;
                $alter_log->new_time_out        = ( isset( $data['new_time_out'] ) && is_valid( $data['new_time_out'] ) ) ? strtotime($data['new_time_out']) : $alter_log->new_time_out ;

                $alter_log->employee_note       = ( isset( $data['employee_note'] ) && is_valid( $data['employee_note'] ) ) ? $data['employee_note'] : $alter_log->employee_note ;
                $alter_log->approver_note       = ( isset( $data['approver_note'] ) && is_valid( $data['approver_note'] ) ) ? $data['approver_note'] : $alter_log->approver_note ;
                $alter_log->updated_by          = auth()->user()->id;
                $alter_log->update();

                DB::commit();

                $alter_log->pending();

                log_to_file('info', 'Success', [$alter_log]);
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
                log_to_file('info', 'Success', [$alter_log]);
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
                
                log_to_file('info', 'Success', [$alter_log]);
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

                $this->update($data, $alter_log);

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

                $this->update($data, $alter_log);

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
            $change_schedule = AlterLog::findOrFail($id);
            $change_schedule->pending();

            return $change_schedule;

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
            
            $change_schedule = AlterLog::findOrFail($id);
            $change_schedule->cancel();

            return $change_schedule;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }







}