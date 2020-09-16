<?php

namespace App\Modules\Request\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Request\Http\Requests\ChangeScheduleRequest;
use App\Modules\Schedule\Http\Requests\StoreScheduleRequest;

use App\Modules\Schedule\Repositories\ScheduleRepositoryInterface;
use App\Modules\Request\Repositories\ChangeScheduleRepositoryInterface;

use App\Modules\Request\Resources\ChangeScheduleResource;
use Exception;
use Illuminate\Http\JsonResponse;


class ChangeScheduleController extends Controller
{   
    private $change_schedule;
    private $dtr;

    public function __construct(ChangeScheduleRepositoryInterface $change_schedule,DtrRepositoryInterface $dtr){
        $this->change_schedule = $change_schedule;
        $this->dtr = $dtr;
    }

    /**
     * Creates an Change Schedule Request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(ChangeScheduleRequest $request){
        try {
            log_activity( trans('messages.create_change_schedule_attempt') );

            $change_schedule = $this->change_schedule->store( $request->all());
            
            return success_response(
                trans('messages.create_change_schedule_success'), 
                new ChangeScheduleResource($change_schedule),
                JsonResponse::HTTP_CREATED
            );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Updates an existing Change Schedule Request
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(ChangeScheduleRequest $request, $id){
        try {
            log_activity( trans('messages.update_change_schedule_attempt') );

            return success_response(
                trans('messages.update_change_schedule_success'), 
                new ChangeScheduleResource( $this->change_schedule->update( $request->all(), $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Deletes an existing Change Schedule Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id){
        try {
            log_activity( trans('messages.delete_hange_schedule_attempt') );

            return success_response(
                trans('messages.delete_change_schedule_success'), 
                $this->change_schedule->destroy( $id ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Shows an existing Change Schedule Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function find($id){
        try {
            $change_schedule = $this->change_schedule->find( $id );
            return success_response(
                trans('messages.find_change_schedule_success'), 
                new ChangeScheduleResource( $change_schedule ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }
    

    /**
     * Approves an Change Schedule Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function approve(ChangeScheduleRequest $request, $id){
        try {
            log_activity( trans('messages.approve_change_schedule_attempt') );

            $change_schedule = $this->change_schedule->approve( $request->all(), $id );
            
            // Add code to apply the Schedule on the specific DTRs.
            $dtr = $this->dtr->apply_schedule_to_dtr( $change_schedule->user_id, $change_schedule->schedule()->first() );

            return success_response(
                trans('messages.approve_change_schedule_success'), 
                new ChangeScheduleResource( $change_schedule ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }
    

    /**
     * Declines an Change Schedule Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function decline(ChangeScheduleRequest $request, $id){
        try {
            log_activity( trans('messages.decline_change_schedule_attempt') );

            return success_response(
                trans('messages.decline_change_schedule_success'), 
                new ChangeScheduleResource( $this->change_schedule->decline( $request->all(), $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }
    

    /**
     * Sets an Change Schedule Request to Pending.
     * @return \Illuminate\Http\JsonResponse
     */
    public function pending($id){
        try {
            log_activity( trans('messages.pending_change_schedule_attempt') );

            return success_response(
                trans('messages.pending_change_schedule_success'), 
                new ChangeScheduleResource( $this->change_schedule->pending( $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }


    /**
     * Cancel an Change Schedule Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function cancel($id){
        try {
            log_activity( trans('messages.cancel_change_schedule_attempt') );

            return success_response(
                trans('messages.cancel_overtime_success'), 
                new ChangeScheduleResource( $this->change_schedule->cancel( $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }
}
