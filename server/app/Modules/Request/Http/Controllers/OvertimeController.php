<?php

namespace App\Modules\Request\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Request\Http\Requests\OvertimeRequest;
use App\Modules\Request\Repositories\OvertimeRepositoryInterface;
use App\Modules\Request\Resources\OvertimeResource;
use Exception;
use Illuminate\Http\JsonResponse;

class OvertimeController extends Controller
{   
    protected $overtime;

    public function __construct(OvertimeRepositoryInterface $overtime){
        $this->overtime = $overtime;
    }

    /**
     * Creates an Overtime Request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(OvertimeRequest $request){
        try {
            log_activity( trans('messages.create_overtime_attempt') );
            
            return success_response(
                trans('messages.create_overtime_success'), 
                new OvertimeResource( $this->overtime->store( $request->all() )),
                JsonResponse::HTTP_CREATED
            );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Updates an existing Overtime Request
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(OvertimeRequest $request, $id){
        try {
            log_activity( trans('messages.update_overtime_attempt') );

            $overtime = $this->overtime->find( $id );

            return success_response(
                trans('messages.update_overtime_success'), 
                new OvertimeResource( $this->overtime->update( $request->all(), $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Deletes an existing Overtime Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id){
        try {
            log_activity( trans('messages.delete_overtime_attempt') );

            return success_response(
                trans('messages.delete_overtime_success'), 
                $this->overtime->destroy( $id ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Shows an existing Overtime Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function find($id){
        try {
            
            return success_response(
                trans('messages.find_overtime_success'), 
                new OvertimeResource( $this->overtime->find( $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }
    

    /**
     * Approves an Overtime Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function approve(OvertimeRequest $request, $id){
        try {
            log_activity( trans('messages.approve_overtime_attempt') );

            $overtime = $this->overtime->approve( $request->all(), $id );

            // Add code to apply the Overtime on the specific DTR.

            return success_response(
                trans('messages.approve_overtime_success'), 
                new OvertimeResource( $overtime ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }
    

    /**
     * Declines an Overtime Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function decline(OvertimeRequest $request, $id){
        try {
            log_activity( trans('messages.decline_overtime_attempt') );

            $overtime = $this->overtime->decline( $request->all(), $id );

            // Add code to remove the Overtime on the specific DTR.

            return success_response(
                trans('messages.decline_overtime_success'), 
                new OvertimeResource( $this->overtime->decline( $request->all(), $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }
    

    /**
     * Sets an Overtime Request to Pending.
     * @return \Illuminate\Http\JsonResponse
     */
    public function pending($id){
        try {
            log_activity( trans('messages.pending_overtime_attempt') );

            return success_response(
                trans('messages.pending_overtime_success'), 
                new OvertimeResource( $this->overtime->pending( $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }


    /**
     * Cancel an Overtime Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function cancel($id){
        try {
            log_activity( trans('messages.cancel_overtime_attempt') );

            return success_response(
                trans('messages.cancel_overtime_success'), 
                new OvertimeResource( $this->overtime->cancel( $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }
}
