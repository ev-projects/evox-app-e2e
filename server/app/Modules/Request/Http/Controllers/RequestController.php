<?php

namespace App\Modules\Request\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
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

use App\Modules\User\Models\User;


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
                                    DtrRepositoryInterface $dtr){

        $this->overtime         = $overtime;
        $this->request          = $request;
        $this->rest_day_work    = $rest_day_work;
        $this->alter_log        = $alter_log;
        $this->change_schedule  = $change_schedule;
        $this->dtr              = $dtr;
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
                            $this->dtr->compute_payroll_items( $overtime->dtr()->first() );

                        }elseif($request->bulk_action =="deny"){

                            $overtime = $this->overtime->decline( $data , $request_bulk[0]);
                            $this->dtr->compute_payroll_items( $overtime->dtr()->first() );

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


}
