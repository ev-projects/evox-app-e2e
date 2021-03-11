<?php 

namespace App\Modules\Email\Repositories;

use App\Modules\Department\Models\Department;
use App\Modules\Email\Jobs\SendAlterLogRequestEmailJob;
use App\Modules\Email\Jobs\SendChangeScheduleRequestEmailJob;
use App\Modules\Email\Jobs\SendForgotPasswordRequestEmailJob;
use App\Modules\Email\Jobs\SendOvertimeRequestEmailJob;
use App\Modules\Email\Jobs\SendRegisteredUserEmailJob;
use App\Modules\Email\Jobs\SendRestDayWorkRequestEmailJob;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\User\Models\User;
use Carbon\Carbon;
use DebugBar\DebugBar;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;

class EmailRepository implements EmailRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    public function sendRegisteredUserEmail( User $user, $temporary_password ){
        try {
            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "emails");

            SendRegisteredUserEmailJob::dispatch( $user, $temporary_password )
                                            ->delay( Carbon::now()->addSeconds(5) );
            
            log_to_file( 'info', get_constant('LOG_QUEUED') . __FUNCTION__ , [], "emails");

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "emails");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "emails");
            return true;
            
        } catch (Exception $e) {

            log_error($e, 'emails');
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "emails");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "emails");

            throw $e;
        }
    }

    public function sendForgotPasswordRequestEmail( User $user, $temporary_password ){
        try {
            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "emails");

            SendForgotPasswordRequestEmailJob::dispatch( $user, $temporary_password )
                                            ->delay( Carbon::now()->addSeconds(5) );
            
            log_to_file( 'info', get_constant('LOG_QUEUED') . __FUNCTION__ , [], "emails");

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "emails");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "emails");
            return true;
            
        } catch (Exception $e) {

            log_error($e, 'emails');
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "emails");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "emails");

            throw $e;
        }
    }

    public function sendOvertimeRequestEmail( Overtime $overtime ){
        try {
            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "emails");

            SendOvertimeRequestEmailJob::dispatch( $overtime )
                                       ->delay( Carbon::now()->addSeconds(5) );
            
            log_to_file( 'info', get_constant('LOG_QUEUED') . __FUNCTION__ , [], "emails");

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "emails");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "emails");
            return true;
            
        } catch (Exception $e) {

            log_error($e, 'emails');
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "emails");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "emails");

            throw $e;
        }
    }

    public function sendOvertimeRequestChangeStatusEmail( Overtime $overtime ){
        try {
                
            
        } catch (Exception $e) {

            DB::rollback();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "user_sync");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "user_sync");

            throw $e;
        }
    }

    public function sendRestDayWorkRequestEmail( RestDayWork $rest_day_work ){
        try {
            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "emails");

            SendRestDayWorkRequestEmailJob::dispatch( $rest_day_work )
                                          ->delay( Carbon::now()->addSeconds(5) );
            
            log_to_file( 'info', get_constant('LOG_QUEUED') . __FUNCTION__ , [], "emails");

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "emails");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "emails");
            return true;
            
        } catch (Exception $e) {

            log_error($e, 'emails');
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "emails");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "emails");

            throw $e;
        }
    }

    public function sendRestDayWorkRequestChangeStatusEmail( RestDayWork $rest_day_work ){
        try {
                
            
        } catch (Exception $e) {

            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "user_sync");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "user_sync");

            throw $e;
        }
    }


    public function sendAlterLogRequestEmail( AlterLog $alter_log ){
        try {
            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "emails");

            SendAlterLogRequestEmailJob::dispatch( $alter_log )
                                       ->delay( Carbon::now()->addSeconds(5) );
            
            log_to_file( 'info', get_constant('LOG_QUEUED') . __FUNCTION__ , [], "emails");

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "emails");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "emails");
            return true;
            
        } catch (Exception $e) {

            log_error($e, 'emails');
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "emails");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "emails");

            throw $e;
        }
    }

    public function sendAlterLogRequestChangeStatusEmail( AlterLog $alter_log ){
        try {
                
            
        } catch (Exception $e) {

            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "user_sync");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "user_sync");

            throw $e;
        }
    }




    public function sendChangeScheduleRequestEmail( ChangeSchedule $change_schedule ){
        try {
            log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "emails");

            SendChangeScheduleRequestEmailJob::dispatch( $change_schedule )
                                             ->delay( Carbon::now()->addSeconds(5) );
            
            log_to_file( 'info', get_constant('LOG_QUEUED') . __FUNCTION__ , [], "emails");

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "emails");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "emails");
            return true;
            
        } catch (Exception $e) {

            log_error($e, 'emails');
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "emails");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "emails");

            throw $e;
        }
    }

    public function sendChangeScheduleRequestChangeStatusEmail( ChangeSchedule $change_schedule ){
        try {
                
            
        } catch (Exception $e) {

            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "user_sync");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "user_sync");

            throw $e;
        }
    }

}