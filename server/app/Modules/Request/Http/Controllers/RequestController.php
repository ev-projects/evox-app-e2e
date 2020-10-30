<?php

namespace App\Modules\Request\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Request\Http\Requests\RequestFilterRequest;
use App\Modules\Request\Repositories\OvertimeRepositoryInterface;
use App\Modules\Request\Repositories\RequestRepositoryInterface;
use App\Modules\Request\Resources\OvertimeResource;
use App\Modules\Request\Resources\RequestResource;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;

use App\Modules\User\Models\User;


class RequestController extends Controller
{
    protected $overtime;
    protected $alter_log;
    protected $rest_day_work;
    protected $change_schedule;
    protected $work_from_home;

    public function __construct(OvertimeRepositoryInterface $overtime,RequestRepositoryInterface $request){
        $this->overtime         = $overtime;
        $this->request          = $request;
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

    

}
