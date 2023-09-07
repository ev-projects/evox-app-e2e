<?php 

namespace App\Modules\Request\Repositories;

use Exception;
use Carbon\Carbon;

use App\Modules\User\Models\User;

use Illuminate\Support\Facades\DB;
use App\Modules\Payroll\Models\Dtr;

use Illuminate\Support\Facades\Log;

use Illuminate\Support\Facades\Auth;

use Illuminate\Database\Eloquent\Model;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\AlterLogPunch;
use App\Modules\Payroll\Models\DtrPunchHistory;
use App\Modules\Payroll\Repositories\DtrRepository;
use App\Modules\Request\Resources\AlterLogResource;

class AlterLogPunchRepository implements AlterLogPunchRepositoryInterface{
    
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

    //    dd($data);
        DB::beginTransaction();
        try {   
            $auth_user_offset =  Auth::user() && Auth::user()->country_timezone_to_offset() ? string_offset_to_seconds(Auth::user()->country_timezone_to_offset()): 0; 
            $old_punch = Auth::user()->punch($data['date'], $data['date']);
            $new_punch_formatted = [];
            $sample = json_decode($data["new_punch"]);
            foreach ($sample as $key => $item){
                $new_punch_formatted[$key] = 
                            (object) [
                                'start_time' =>  ( isset( $item->start_time ) && is_valid( $item->start_time ) ) ? strtotime($item->start_time) - $auth_user_offset: null ,
                                'end_time' =>  ( isset( $item->end_time ) && is_valid( $item->end_time ) ) ? strtotime($item->end_time) - $auth_user_offset: null ,
                            ];
            }

            $alter_log_punch = new AlterLogPunch();
            $alter_log_punch->user_id             = ( isset( $data['user_id'] ) && is_valid( $data['user_id'] ) ) ? $data['user_id'] : auth()->user()->id;
            $alter_log_punch->date                = ( isset( $data['date'] ) && is_valid( $data['date'] ) ) ? $data['date'] : null;
            $alter_log_punch->old_punch           = json_encode($old_punch->get()->toArray()) ;
            $alter_log_punch->new_punch           =  json_encode($new_punch_formatted) ;

            $alter_log_punch->employee_note       = ( isset( $data['employee_note'] ) && is_valid( $data['employee_note'] ) ) ? $data['employee_note'] : null;
            $alter_log_punch->updated_by          = auth()->user()->id;
            $alter_log_punch->created_by          = auth()->user()->id;
            $alter_log_punch->save();
            
            DB::commit();
            log_to_file('info', 'Success', [$alter_log_punch], 'request');
            return $alter_log_punch;
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
            
            $alter_log_punch =   ( $id_or_alter_log instanceof AlterLogPunch ) ? $id_or_alter_log : AlterLogPunch::findOrFail($id_or_alter_log);
            
            // Authenticate the User first if valid for the Update
            if( get_authenticated_user( $alter_log_punch->user_id ) ) {
                $auth_user_offset =  Auth::user() && Auth::user()->country_timezone_to_offset() ? string_offset_to_seconds(Auth::user()->country_timezone_to_offset()): 0; 
                $old_punch = Auth::user()->punch($data['date'], $data['date']);

                $alter_log_punch->date                = ( isset( $data['date'] ) && is_valid( $data['date'] ) ) ? $data['date'] : $alter_log_punch->date ;
                $new_punch_formatted = [];
                            $sample = json_decode($data["new_punch"]);
                            foreach ($sample as $key => $item){
                                $new_punch_formatted[$key] = 
                                            (object) [
                                                'start_time' =>  ( isset( $item->start_time ) && is_valid( $item->start_time ) ) ? strtotime($item->start_time) - $auth_user_offset: null ,
                                                'end_time' =>  ( isset( $item->end_time ) && is_valid( $item->end_time ) ) ? strtotime($item->end_time) - $auth_user_offset: null ,
                                            ];
                            }

                $alter_log_punch->old_punch           = json_encode($old_punch->get()->toArray()) ;
                $alter_log_punch->new_punch           =  json_encode($new_punch_formatted) ;
                $alter_log_punch->employee_note       = ( isset( $data['employee_note'] ) && is_valid( $data['employee_note'] ) ) ? $data['employee_note'] : $alter_log_punch->employee_note ;
                $alter_log_punch->approver_note       = ( isset( $data['approver_note'] ) && is_valid( $data['approver_note'] ) ) ? $data['approver_note'] : $alter_log_punch->approver_note ;
                $alter_log_punch->updated_by          = auth()->user()->id;
                $alter_log_punch->update();

                DB::commit();

                $alter_log_punch->pending();

                log_to_file('info', 'Success', [$alter_log_punch], 'request');
                return $alter_log_punch;
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
            $alter_log_punch = AlterLogPunch::find($id);

            if( get_authenticated_user( $alter_log_punch->user_id ) ) {
                
                log_to_file('info', 'Success', [$alter_log_punch], 'request');
                return $alter_log_punch;
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
            $alter_log_punch = AlterLogPunch::findOrFail($id);
            // dd(  is_under_supervisee( $alter_log_punch->user_id ));
            // Authenticate the User first if the Alter Log Submitter is under the user logged in's supervisee
            if( is_under_supervisee( $alter_log_punch->user_id ) ) {

                if(!empty($data)){
                    $this->update($data, $alter_log_punch);
                }
                // dd(   $alter_log_punch);
                $alter_log_punch->approve();
            }
            
            DB::commit();
            return $alter_log_punch;

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
            $alter_log_punch = AlterLogPunch::findOrFail($id);

            // Authenticate the User first if the Alter Log Submitter is under the user logged in's supervisee
            if( is_under_supervisee( $alter_log_punch->user_id ) ) {

                if(!empty($data)){ 
                    $this->update($data, $alter_log_punch);
                }

                $alter_log_punch->decline();
            }

            DB::commit();
            return $alter_log_punch;

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
            
            $alter_log_punch = AlterLogPunch::findOrFail($id);
            $alter_log_punch->cancel();

            return $alter_log_punch;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    
    /**
     *  
     * @param array $data
     * @param $date
     *
     */
    public function on_conflict( $request )
    {
        try {
            
        $message = "";
        $first_log = false;
        $auth_user_offset =  Auth::user() && Auth::user()->country_timezone_to_offset() ? string_offset_to_seconds(Auth::user()->country_timezone_to_offset()): 0; 

            $check_conflicts_pass = DtrPunchHistory::where('date',Carbon::parse($request->date)->subDays(1)->format('Y-m-d'))
                ->where("user_id",$request->user_id)->where("is_active",1)->orderBy('id', 'desc')->first();
            $check_conflicts_tomm = DtrPunchHistory::where('date',Carbon::parse($request->date)->addDays(1)->format('Y-m-d'))
                ->where("user_id",$request->user_id)->where("is_active",1)->first();
            
        
            $current_log = json_decode($request->new_punch);
        
            $alter_start = strtotime($current_log[0]->start_time) - $auth_user_offset;
            $alter_end = strtotime(end($current_log)->end_time) - $auth_user_offset;

        
            if($check_conflicts_pass != null){
                if($alter_start < $check_conflicts_pass->time_out){

                    $first_log = true;
                    $message = $message."Time in conflicts with  ".Carbon::parse($request->date)->subDays(1)->format('Y-m-d') 
                    . " at [" 
                    . date("Y-m-d H:i:s", $check_conflicts_pass->time_out+ $auth_user_offset ) 
                    . "]" 
                    ;
                }
            }

            if($check_conflicts_tomm != null){
                if($alter_end > $check_conflicts_tomm->time_in){

                if($first_log){
                    $message = $message. " and ";
                }
                    $message = $message . "Time out conflicts with  ".Carbon::parse($request->date)->addDays(1)->format('Y-m-d') 
                    . " at [" 
                    . date("Y-m-d H:i:s", $check_conflicts_tomm->time_in+ $auth_user_offset ) 
                    . "]" 
                    ;
                }
            }
            // dd($message);
            return $message;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }



   
    





}