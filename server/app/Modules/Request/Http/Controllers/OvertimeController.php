<?php

namespace App\Modules\Request\Http\Controllers;

use Exception;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
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
            log_activity( trans('messages.create_overtime_attempt') );
            
            $overtime = $this->overtime->store( $request->all() );

            $this->email->sendOvertimeRequestEmail( $overtime );

            return success_response(
                trans('messages.create_overtime_success'), 
                new OvertimeResource( $overtime ),
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
            $user = User::find(auth()->user()->id);
            log_activity( trans('messages.approve_overtime_attempt') );
            Redis::del($user->id.':my_team_request_list');
            Redis::del($user->id.':my_request_list');
            Redis::del(Redis::keys('laravel_cache:*'));
            $overtime = $this->overtime->approve( $request->all(), $id );

            // $with_out_schedule_employee = $this->user->get_user_department($overtime->user_id);
            $user =  User::find($overtime->user_id);
            $with_out_schedule_employee =  ( is_valid( $user->department_id ) ? $user->department()->first()->departments_on_schedule_is_active(): false );

            if(!$with_out_schedule_employee){
            // Call the function to compute for the Payroll Items (Which will automatically check for the Approved Overtime.)
            $this->dtr->compute_payroll_items($overtime->dtr()->first());
            }
          
            return success_response(
                trans('messages.approve_overtime_success'), 
                new OvertimeResource( $overtime ) 
            );
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
            $user = User::find(auth()->user()->id);
            log_activity( trans('messages.decline_overtime_attempt') );
            Redis::del($user->id.':my_team_request_list');
            Redis::del($user->id.':my_request_list');
            // Redis::del(Redis::keys('laravel_cache:*'));
            $overtime = $this->overtime->decline( $request->all(), $id );
            
          // $with_out_schedule_employee = $this->user->get_user_department($overtime->user_id);
            $user =  User::find($overtime->user_id);
            $with_out_schedule_employee =  ( is_valid( $user->department_id ) ? $user->department()->first()->departments_on_schedule_is_active(): false );

            if(!$with_out_schedule_employee){
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
}
