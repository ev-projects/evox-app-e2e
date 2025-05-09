<?php

namespace App\Modules\Request\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Request\Http\Requests\AlterLogRequest;
use App\Modules\Schedule\Http\Requests\StoreScheduleRequest;

use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Request\Repositories\AlterLogRepositoryInterface;

use App\Modules\Payroll\Models\Dtr;
use App\Modules\Request\Models\AlterLog;

use App\Modules\Request\Resources\AlterLogResource;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class AlterLogController extends Controller
{   
    private $alter_log;
    private $dtr;
    private $email;

    public function __construct(AlterLogRepositoryInterface $alter_log,
                                DtrRepositoryInterface $dtr,
                                EmailRepositoryInterface $email){
        $this->alter_log = $alter_log;
        $this->dtr = $dtr;
        $this->email = $email;
    }

    /**
     * Creates an Change Schedule Request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(AlterLogRequest $request){
        try {
            // call request validity checker
            $request_validity = request_validity_checker($request->user_id, $request->date);

            if (!$request_validity || $request_validity == 0 || $request_validity == 2) {
                $alter_log_dispute = $this->insertToAlterLogDispute($request);

                return success_response(
                    trans('messages.invalid_request'),
                    [],
                    JsonResponse::HTTP_CREATED
                );
            } else {
                log_activity( trans('messages.create_alter_log_attempt') );

                $alter_log = $this->alter_log->store( $request->all());

                $this->email->sendAlterLogRequestEmail( $alter_log );

                return success_response(
                    trans('messages.create_alter_log_success'),
                    new AlterLogResource($alter_log),
                    JsonResponse::HTTP_CREATED
                );
            }
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Updates an existing Change Schedule Request
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(AlterLogRequest $request, $id){
        try {
            log_activity( trans('messages.update_alter_log_attempt') );

            return success_response(
                trans('messages.update_alter_log_success'), 
                new AlterLogResource( $this->alter_log->update( $request->all(), $id ) ) 
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
                trans('messages.delete_alter_log_success'), 
                $this->alter_log->destroy( $id ) 
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
            $alter_log = $this->alter_log->find( $id );
            return success_response(
                trans('messages.find_alter_log_success'), 
                new AlterLogResource( $alter_log ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }
    

    /**
     * Approves an Change Schedule Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function approve(AlterLogRequest $request, $id){
        try {
            // call request validity checker
            $request_validity = request_validity_checker($request->user_id, $request->date);

            if (!$request_validity || $request_validity == 0 || $request_validity == 2) {
                $alter_log_dispute = insertToAlterLogDispute($request);

                return success_response(
                    trans('messages.invalid_request'),
                    [],
                    JsonResponse::HTTP_CREATED
                );
            } else {
                log_activity( trans('messages.approve_alter_log_attempt') );

                $alter_log = $this->alter_log->approve( $request->all() , $id );

                // Add code to apply the Alter Log on the specific DTR.
                $dtr = $this->dtr->apply_alter_log_to_dtr( $alter_log );

                return success_response(
                    trans('messages.approve_alter_log_success'),
                    new AlterLogResource( $alter_log )
                );
            }
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }
    

    /**
     * Declines an Change Schedule Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function decline(AlterLogRequest $request, $id){
        try {
            log_activity( trans('messages.decline_alter_log_attempt') );

            $alter_log = $this->alter_log->decline( $request->all(),$id );

            // Add code to Remove the Alter Log from the specific DTR.
            $dtr = $this->dtr->remove_alter_log_from_dtr( $alter_log );

            return success_response(
                trans('messages.decline_alter_log_success'), 
                new AlterLogResource( $alter_log ) 
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
            log_activity( trans('messages.pending_alter_log_attempt') );

            return success_response(
                trans('messages.pending_alter_log_success'), 
                new AlterLogResource( $this->alter_log->pending( $id ) ) 
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
            log_activity( trans('messages.cancel_alter_log_attempt') );

            return success_response(
                trans('messages.cancel_alter_log_success'), 
                new AlterLogResource( $this->alter_log->cancel( $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    public function insertToAlterLogDispute($request) {
        // call SP to store request on dispute table
        $auth_user_offset =  Auth::user() && Auth::user()->country_timezone_to_offset() ? string_offset_to_seconds(Auth::user()->country_timezone_to_offset()): 0;
        $alter_log_dispute = call_sp('EV_SP_PD_Autoamtion_AlterLog', [
            ( isset( $request['user_id'] ) && is_valid( $request['user_id'] ) ) ? $request['user_id'] : auth()->user()->id,
            ( isset( $request['date'] ) && is_valid( $request['date'] ) ) ? $request['date'] : null,
            ( isset( $request['current_time_in'] ) && is_valid( $request['current_time_in'] ) ) ? strtotime($request['current_time_in']) - $auth_user_offset: null,
            ( isset( $request['current_time_out'] ) && is_valid( $request['current_time_out'] ) ) ? strtotime($request['current_time_out']) - $auth_user_offset: null,
            ( isset( $request['new_time_in'] ) && is_valid( $request['new_time_in'] ) ) ? strtotime($request['new_time_in']) - $auth_user_offset: null,
            ( isset( $request['new_time_out'] ) && is_valid( $request['new_time_out'] ) ) ? strtotime($request['new_time_out']) - $auth_user_offset: null,
            ( isset( $request['employee_note'] ) && is_valid( $request['employee_note'] ) ) ? $request['employee_note'] : null,
            ( isset( $request['approver_note'] ) && is_valid( $request['approver_note'] ) ) ? $request['approver_note'] : null,
            "approved",
            auth()->user()->id,
            auth()->user()->id
        ]);
        return $alter_log_dispute;
    }
}
