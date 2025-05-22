<?php

namespace App\Modules\Request\Http\Controllers;

use Exception;

use Illuminate\Http\Request;
use App\Modules\User\Models\User;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Modules\Request\Resources\OvertimeResource;
use App\Modules\Request\Http\Requests\OvertimeRequest;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Request\Repositories\OvertimeRepositoryInterface;

class OvertimeController extends Controller
{   
    protected $overtime;
    protected $dtr;
    protected $email;
    protected $user;

    public function __construct(OvertimeRepositoryInterface $overtime,
                                DtrRepositoryInterface $dtr,
                                EmailRepositoryInterface $email,
                                UserRepositoryInterface $user
                                ){
        $this->overtime = $overtime;
        $this->dtr = $dtr;
        $this->email = $email;
        $this->user=$user;
    }

    /**
     * Creates an Overtime Request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(OvertimeRequest $request){
        try {
            // call request validity checker
            $request_validity = request_validity_checker($request->user_id, $request->date);

            if (!$request_validity || $request_validity == 0 || $request_validity == 2) {
                $overtime_dispute = $this->insertToOvertimeDispute($request);

                return success_response(
                    trans('messages.dispute_request_success'),
                    [],
                    JsonResponse::HTTP_CREATED
                );
            } else {
                log_activity( trans('messages.create_overtime_attempt') );

                $overtime = $this->overtime->store( $request->all() );

                $this->email->sendOvertimeRequestEmail( $overtime );

                // log action to audit_trail table
                $description = 'has requested for ' . str_replace('_', '-', $request->type);
                log_to_audit_trail(['action' => 'Overtime', 'description' => $description, 'user_id' => auth()->user()->id, 'session_id' => $request->session_id, 'type' => 1]);

                return success_response(
                    trans('messages.create_overtime_success'), 
                    new OvertimeResource( $overtime ),
                    JsonResponse::HTTP_CREATED
                );
            }

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
            // call request validity checker
            $request_validity = request_validity_checker($request->user_id, $request->date);

            if (!$request_validity || $request_validity == 0 || $request_validity == 2) {
                return error_response( trans('messages.invalid_request_approval') );
            } else {
                log_activity( trans('messages.approve_overtime_attempt') );

                $overtime = $this->overtime->approve( $request->all(), $id );


                $user =  User::find($overtime->user_id);
                $has_multi =  $user->hasFeature("multi_login");

                if(!$has_multi){
                // Call the function to compute for the Payroll Items (Which will automatically check for the Approved Overtime.)
                $this->dtr->compute_payroll_items($overtime->dtr()->first());
                }

                return success_response(
                    trans('messages.approve_overtime_success'), 
                    new OvertimeResource( $overtime ) 
                );
            }
        } catch(Exception $e){
            // dd($e);
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
            

            $user =  User::find($overtime->user_id);
            $has_multi =  $user->hasFeature("multi_login");

            if(!$has_multi){
            // Call the function to compute for the Payroll Items (Which will automatically check for the Declined Overtime.)
            $this->dtr->compute_payroll_items( $overtime->dtr()->first() );
            }
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

    public function insertToOvertimeDispute($request) {
        // call SP to store request on dispute table
        $overtime_dispute = call_sp('EV_SP_PD_Autoamtion_Overtimes', [
            ( isset( $request['user_id'] ) && is_valid( $request['user_id'] ) ) ? $request['user_id'] : auth()->user()->id,
            ( isset( $request['date'] ) && is_valid( $request['date'] ) ) ? $request['date'] : null,
            null,
            ( isset( $request['amount'] ) && is_valid( $request['amount'] ) ) ? time_to_seconds( $request['amount'] ) : 0,
            ( isset( $request['type'] ) && is_valid( $request['type'] ) ) ? $request['type'] : null,
            ( isset( $request['employee_note'] ) && is_valid( $request['employee_note'] ) ) ? $request['employee_note'] : null,
            ( isset( $request['approver_note'] ) && is_valid( $request['approver_note'] ) ) ? $request['approver_note'] : null,
            "approved",
            auth()->user()->id,
            auth()->user()->id,
        ]);
        return $overtime_dispute;
    }
}
