<?php

namespace App\Modules\Request\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Request\Http\Requests\RestDayWorkRequest;
use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;
use App\Modules\Request\Resources\RestDayWorkResource;
use Exception;
use Illuminate\Http\JsonResponse;

class RestDayWorkController extends Controller
{   
    protected $rest_day_work;
    protected $dtr;

    public function __construct(RestDayWorkRepositoryInterface $rest_day_work,
                                DtrRepositoryInterface $dtr){
        $this->rest_day_work = $rest_day_work;
        $this->dtr = $dtr;
    }

    /**
     * Creates a Rest Day Work Request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(RestDayWorkRequest $request){
        try {
            log_activity( trans('messages.create_rest_day_work_attempt') );
            
            return success_response(
                trans('messages.create_rest_day_work_success'), 
                new RestDayWorkResource( $this->rest_day_work->store( $request->all() )),
                JsonResponse::HTTP_CREATED
            );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Updates an existing Rest Day Work Request
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(RestDayWorkRequest $request, $id){
        try {
            log_activity( trans('messages.update_rest_day_work_attempt') );

            $rest_day_work = $this->rest_day_work->find( $id );

            return success_response(
                trans('messages.update_rest_day_work_success'), 
                new RestDayWorkResource( $this->rest_day_work->update( $request->all(), $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Deletes an existing Rest Day Work Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id){
        try {
            log_activity( trans('messages.delete_rest_day_work_attempt') );

            return success_response(
                trans('messages.delete_rest_day_work_success'), 
                $this->rest_day_work->destroy( $id ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Shows an existing Rest Day Work Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function find($id){
        try {
            
            return success_response(
                trans('messages.find_rest_day_work_success'), 
                new RestDayWorkResource( $this->rest_day_work->find( $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }
    

    /**
     * Approves an Rest Day Work Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function approve(RestDayWorkRequest $request, $id){
        try {
            log_activity( trans('messages.approve_rest_day_work_attempt') );

            $rest_day_work = $this->rest_day_work->approve( $request->all(), $id );

            // Add code to apply the Rest Day Work on the specific DTR.
            $dtr = $this->dtr->apply_rest_day_work_to_dtr( $rest_day_work );
            
            return success_response(
                trans('messages.approve_rest_day_work_success'), 
                new RestDayWorkResource( $rest_day_work ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }
    

    /**
     * Declines an Rest Day Work Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function decline(RestDayWorkRequest $request, $id){
        try {
            log_activity( trans('messages.decline_rest_day_work_attempt') );

            $rest_day_work = $this->rest_day_work->decline( $request->all(), $id );

            // Add code to remove the Rest Day Work on the specific DTR.
            dd( $rest_day_work );

            return success_response(
                trans('messages.decline_rest_day_work_success'), 
                new RestDayWorkResource( $this->rest_day_work->decline( $request->all(), $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }
    

    /**
     * Sets an Rest Day Work Request to Pending.
     * @return \Illuminate\Http\JsonResponse
     */
    public function pending($id){
        try {
            log_activity( trans('messages.pending_rest_day_work_attempt') );

            return success_response(
                trans('messages.pending_rest_day_work_success'), 
                new RestDayWorkResource( $this->rest_day_work->pending( $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }


    /**
     * Cancel an Rest Day Work Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function cancel($id){
        try {
            log_activity( trans('messages.cancel_rest_day_work_attempt') );

            return success_response(
                trans('messages.cancel_rest_day_work_success'), 
                new RestDayWorkResource( $this->rest_day_work->cancel( $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }
}
