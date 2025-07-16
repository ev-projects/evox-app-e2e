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
            log_activity( trans('messages.create_alter_log_attempt') );

            $alter_log = $this->alter_log->store( $request->all());
            
            $this->email->sendAlterLogRequestEmail( $alter_log );
            
            return success_response(
                trans('messages.create_alter_log_success'), 
                new AlterLogResource($alter_log),
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
            log_activity( trans('messages.approve_alter_log_attempt') );

            $alter_log = $this->alter_log->approve( $request->all() , $id );

            // Add code to apply the Alter Log on the specific DTR.
            $dtr = $this->dtr->apply_alter_log_to_dtr( $alter_log );

            return success_response(
                trans('messages.approve_alter_log_success'), 
                new AlterLogResource( $alter_log ) 
            );
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
}