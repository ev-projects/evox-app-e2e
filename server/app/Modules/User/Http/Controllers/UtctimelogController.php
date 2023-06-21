<?php

namespace App\Modules\User\Http\Controllers;
use Exception;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Modules\User\Repositories\UtcTimeLogRepository;

class UtctimelogController extends Controller
{
    protected $utc_time_log;

    public function __construct(UtcTimeLogRepository $utc_time_log){

    $this->utc_time_log = $utc_time_log;

   }


       /**
     * This function check adjusment  the UTC for day light savings time
  
     */
    public function sync_adjustment(){
    
        try {
            log_activity( trans('messages.sync_utc_adjust_attemp') );

            
            
            $checked_utc = $this->utc_time_log->check_adjustment();

            return success_response(
                trans('messages.sync_utc_adjust_success'),  
                // new UserProfileResource( $this->profile->update( $user, $request ) )
            );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
