<?php

namespace App\Modules\Request\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Email\Mail\OvertimeRequestEmail;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Request\Http\Requests\RequestFilterRequest;
use App\Modules\Request\Repositories\RequestRepositoryInterface;
use App\Modules\Request\Resources\OvertimeResource;
use App\Modules\Request\Resources\RequestResource;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;

use App\Modules\Request\Repositories\OvertimeRepositoryInterface;
use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;
use App\Modules\Request\Repositories\AlterLogRepositoryInterface;
use App\Modules\Request\Repositories\ChangeScheduleRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Request\Http\Requests\RequestApprovalChangeStatusRequest;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\Request\Resources\AlterLogResource;
use App\Modules\Request\Resources\ChangeScheduleResource;
use App\Modules\Request\Resources\RequestApprovalChangeStatusResource;
use App\Modules\Request\Resources\RestDayWorkResource;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;

class RequestController extends Controller
{
    protected $overtime;
    protected $alter_log;
    protected $rest_day_work;
    protected $change_schedule;
    protected $work_from_home;

    public function __construct(    OvertimeRepositoryInterface $overtime,
                                    RequestRepositoryInterface $request,
                                    RestDayWorkRepositoryInterface $rest_day_work,
                                    AlterLogRepositoryInterface $alter_log,
                                    ChangeScheduleRepositoryInterface $change_schedule,
                                    DtrRepositoryInterface $dtr,
                                    EmailRepositoryInterface $email){

        $this->overtime         = $overtime;
        $this->request          = $request;
        $this->rest_day_work    = $rest_day_work;
        $this->alter_log        = $alter_log;
        $this->change_schedule  = $change_schedule;
        $this->dtr              = $dtr;
        $this->email            = $email;
    }

    /**
     * Shows a collection of Overtime Requests.
     * @return \Illuminate\Http\JsonResponse
     */
    public function find(RequestFilterRequest $request ){
        try {
            $request_collection = new Collection();

            $parameters = $request->all();

            if( isset( $parameters['request_type'] ) && isset( $this->{ $parameters['request_type'] } ) ) {

                $request_collection->push( $this->{ $parameters['request_type'] }->where( $request->all() ) );
                
            } else {

                foreach( get_constant('REQUEST_TYPES') as $request_type) {

                    if( isset( $this->{ $request_type } ) ) {

                        $request_collection->push( $this->{ $request_type }->where( $request->all() ) );
                   
                    }
                }
            }
            
            return success_response(
                trans('messages.find_request_success'), 
                $request_collection
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    /**
     * Shows a list of Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function requestlist(RequestFilterRequest $request){
        $user = User::find(auth()->user()->id);
      
        try {
            log_activity( trans('messages.request_display_attempt') );
            return success_response(
                trans('messages.request_display_success'), 
                  new RequestResource( $user->requests_list('my_request',$request) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Shows a list of Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function requestlistNumbers(Request $request){
        try {
            log_activity( trans('messages.request_display_attempt') );
            return success_response(
                trans('messages.request_display_success'), $this->request->get_status_numbers( $request)
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function bulkRequest(Request $request){
        try {
            log_activity( trans('messages.request_display_attempt') );
            $data = array();
            foreach ( $request->checkedList as $value ) {
                $request_bulk = explode(".", $value);

                switch ( $request_bulk[1] ) {

                    # Overtime
                    case "overtimes":
                        if($request->bulk_action =="approve"){

                            $overtime = $this->overtime->approve( $data , $request_bulk[0] );
                            $dtr = $overtime->dtr()->first() ;
                            if($dtr!=null){
                                $this->dtr->compute_payroll_items( $dtr );
                            }

                        }elseif($request->bulk_action =="deny"){

                            $overtime = $this->overtime->decline( $data , $request_bulk[0]);
                            $dtr = $overtime->dtr()->first() ;
                            if($dtr!=null){
                                $this->dtr->compute_payroll_items( $dtr );
                            }

                        }
                      break;

                    #Alter Log
                    case "alter_logs":
                        if($request->bulk_action =="approve"){

                            $alter_log = $this->alter_log->approve( $data , $request_bulk[0] );
                            $dtr = $this->dtr->apply_alter_log_to_dtr( $alter_log );

                        }elseif($request->bulk_action =="deny"){

                            $alter_log = $this->alter_log->decline( $data , $request_bulk[0]);
                            $dtr = $this->dtr->remove_alter_log_from_dtr( $alter_log );

                        }
                      break;

                    # Change Schedules
                    case "change_schedules":
                        if($request->bulk_action =="approve"){
                            $change_schedule = $this->change_schedule->approve( $data , $request_bulk[0] );
                            
                            $sched_schedule = $change_schedule->schedule()->first();
                            if($sched_schedule!=null){
                                $dtr = $this->dtr->apply_schedule_to_dtr( $change_schedule->user_id, $sched_schedule);
                            }

                        }elseif($request->bulk_action =="deny"){
                            $change_schedule = $this->change_schedule->decline($data , $request_bulk[0] );
                            
                            $sched_schedule = $change_schedule->schedule()->first();
                            if($sched_schedule!=null){
                                $dtr = $this->dtr->remove_schedule_to_dtr( $change_schedule->user_id, $change_schedule->schedule()->first() );
                            }
                        }
                      break;

                    # Rest Day Works
                    case "rest_day_works":
                        if($request->bulk_action =="approve"){

                            $rest_day_work =  $this->rest_day_work->approve( $data , $request_bulk[0] );
                            $dtr = $this->dtr->apply_rest_day_work_to_dtr( $rest_day_work );

                        }elseif($request->bulk_action =="deny"){

                            $rest_day_work = $this->rest_day_work->decline( $data , $request_bulk[0] );
                            $dtr = $this->dtr->remove_rest_day_from_dtr( $rest_day_work );

                        }
                      break;
                    default:
                  }                
            }

            return success_response(
                trans('messages.bulk_request_update'),$request->bulk_action 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }



    /**
     * Shows a list of Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function change_request_status_via_hash_code(RequestApprovalChangeStatusRequest $request){
        try {
            
            $result = [
                'request'    => null,
                'is_changed' => false,
            ];

            # Get the request detail from the hashed code.
            # [0] - Table name
            # [1] - Table ID
            # [2] - Recepient ID
            $request_detail_array = parse_hash_code_to_request_detail_array( $request->get('hash_code') );

            # Initialize Recepient login for this request
            auth()->login( User::find( $request_detail_array[2] ) );

            # Check for what request table name is being accesed.
            switch( $request_detail_array[0] ){

                case "overtimes":
                    
                    # Fetch the request
                    $result['request'] = Overtime::find( $request_detail_array[1] );

                    # Check if the status is not yet 'approved'. If not, proceed on changing the request to 'approved'.
                    if( $request->get('status') == get_constant('REQUEST_STATUS.approved')
                        && $result['request'] ->status != get_constant('REQUEST_STATUS.approved')  ) {
                        $result = [
                            'request'    => $this->overtime->approve([], $result['request']->id ),
                            'is_changed' => true,
                        ];

                    # Check if the status is not yet 'declined'. If not, proceed on changing the request to 'declined'.
                    } else if( $request->get('status') == get_constant('REQUEST_STATUS.declined')
                        && $result['request'] ->status != get_constant('REQUEST_STATUS.declined')  ) {
                        $result = [
                            'request'    => $this->overtime->decline([], $result['request']->id ),
                            'is_changed' => true,
                        ];
                    } 

                    # Apply the Overtime to the DTR related depending on the action that was conducted on the overtime.
                    $this->dtr->compute_payroll_items( $result['request']->dtr()->first() );
                    break;


                case "rest_day_works":

                    # Fetch the request
                    $result['request'] = RestDayWork::find( $request_detail_array[1] );

                    # Check if the status is not yet 'approved'. If not, proceed on changing the request to 'approved'.
                    if( $request->get('status') == get_constant('REQUEST_STATUS.approved')
                        && $result['request'] ->status != get_constant('REQUEST_STATUS.approved')  ) {
                        $result = [
                            'request'    => $this->rest_day_work->approve([], $result['request']->id ),
                            'is_changed' => true,
                        ];

                        # Apply the newly approved Rest Day Work to the DTRs related.
                        $this->dtr->apply_rest_day_work_to_dtr( $result['request'] );

                    # Check if the status is not yet 'declined'. If not, proceed on changing the request to 'declined'.
                    } else if( $request->get('status') == get_constant('REQUEST_STATUS.declined')
                        && $result['request'] ->status != get_constant('REQUEST_STATUS.declined')  ) {
                        $result = [
                            'request'    => $this->rest_day_work->decline([], $result['request']->id ),
                            'is_changed' => true,
                        ];

                        # Removed the newly declined Rest Day Work to the DTRs related.
                        $this->dtr->remove_rest_day_from_dtr( $result['request'] );
                    } 
                    break;


                case "alter_logs":

                    # Fetch the request
                    $result['request'] = AlterLog::find( $request_detail_array[1] );

                    # Check if the status is not yet 'approved'. If not, proceed on changing the request to 'approved'.
                    if( $request->get('status') == get_constant('REQUEST_STATUS.approved')
                        && $result['request'] ->status != get_constant('REQUEST_STATUS.approved')  ) {
                        $result = [
                            'request'    => $this->alter_log->approve([], $result['request']->id ),
                            'is_changed' => true,
                        ];

                        # Apply the newly approved Alter Log to the DTR related.
                        $this->dtr->apply_alter_log_to_dtr( $result['request'] );

                    # Check if the status is not yet 'declined'. If not, proceed on changing the request to 'declined'.
                    } else if( $request->get('status') == get_constant('REQUEST_STATUS.declined')
                        && $result['request'] ->status != get_constant('REQUEST_STATUS.declined')  ) {
                        $result = [
                            'request'    => $this->alter_log->decline([], $result['request']->id ),
                            'is_changed' => true,
                        ];

                        # Removed the newly declined Alter Log to the DTRs related.
                        $this->dtr->remove_alter_log_from_dtr( $result['request'] );
                    } 
                    break;


                case "change_schedules":

                    # Fetch the request
                    $result['request'] = ChangeSchedule::find( $request_detail_array[1] );

                    # Check if the status is not yet 'approved'. If not, proceed on changing the request to 'approved'.
                    if( $request->get('status') == get_constant('REQUEST_STATUS.approved')
                        && $result['request'] ->status != get_constant('REQUEST_STATUS.approved')  ) {
                        $result = [
                            'request'    => $this->change_schedule->approve([], $result['request']->id ),
                            'is_changed' => true,
                        ];

                        # Apply the newly approved Change Schedule to the DTRs related.
                        $this->dtr->apply_schedule_to_dtr( $result['request']->user_id, $result['request']->schedule()->first() );

                    # Check if the status is not yet 'declined'. If not, proceed on changing the request to 'declined'.
                    } else if( $request->get('status') == get_constant('REQUEST_STATUS.declined')
                        && $result['request'] ->status != get_constant('REQUEST_STATUS.declined')  ) {
                        $result = [
                            'request'    => $this->change_schedule->decline([], $result['request']->id ),
                            'is_changed' => true,
                        ];

                        # Removed the newly declined Alter Log to the DTRs related.
                        $this->dtr->remove_schedule_to_dtr( $result['request']->user_id, $result['request']->schedule()->first() );
                    } 
                    break;
                
            }

            # Trigger the logout since the transaction is done.
            auth()->logout();
            
            return success_response(
                trans('messages.change_request_status_via_hash_code_success'), 
                new RequestApprovalChangeStatusResource( $result['request'], $result['is_changed'] )
            );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

}
