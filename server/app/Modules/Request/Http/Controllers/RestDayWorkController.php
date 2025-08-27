<?php

namespace App\Modules\Request\Http\Controllers;

use Exception;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Modules\Payroll\Models\Dtr;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use App\Modules\Request\Resources\RestDayWorkResource;
use App\Modules\Request\Http\Requests\RestDayWorkRequest;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;

class RestDayWorkController extends Controller
{   
    protected $rest_day_work;
    protected $dtr;
    protected $email;

    public function __construct(RestDayWorkRepositoryInterface $rest_day_work,
                                DtrRepositoryInterface $dtr,
                                EmailRepositoryInterface $email){
        $this->rest_day_work = $rest_day_work;
        $this->dtr = $dtr;
        $this->email = $email;
    }

    /**
     * Creates a Rest Day Work Request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(RestDayWorkRequest $request){
        try {
            log_activity( trans('messages.create_rest_day_work_attempt') );

             $dtr_check = Dtr::where("date",  $request->date)->where("user_id", Auth::user()->id)->first();

            if( $dtr_check!= null){
                if($dtr_check->is_rest_day == 0){
                    return error_response( "The Date requested/targeted is not a restday, if its a work day make an alter log instead." );
                }
            }
            
            $rest_day_work = $this->rest_day_work->store( $request->all() );

            $this->email->sendRestDayWorkRequestEmail( $rest_day_work );

            // log action to audit_trail table
            log_to_audit_trail(['action' => 'Rest Day Work', 'description' => 'has requested for rest day work', 'user_id' => auth()->user()->id, 'session_id' => $request->session_id, 'type' => 1]);

            return success_response(
                trans('messages.create_rest_day_work_success'), 
                new RestDayWorkResource( $rest_day_work ),
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

            // Add code to Remove the Rest Day Work on the specific DTR.
            $dtr = $this->dtr->remove_rest_day_from_dtr( $rest_day_work );

            return success_response(
                trans('messages.decline_rest_day_work_success'), 
                new RestDayWorkResource( $rest_day_work ) 
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