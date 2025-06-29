<?php

namespace App\Modules\Request\Http\Controllers;

use Exception;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Modules\Payroll\Models\Dtr;

use App\Http\Controllers\Controller;
use App\Modules\Request\Models\AlterLogPunch;

use App\Modules\Request\Http\Requests\AlterLogRequest;
// use App\Modules\Request\Models\AlterLog;

use App\Modules\Request\Resources\AlterLogPunchResource;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Schedule\Http\Requests\StoreScheduleRequest;
use App\Modules\Request\Repositories\AlterLogPunchRepositoryInterface;

class AlterLogPunchController extends Controller
{   
    private $alter_log_punch;
    private $dtr;
    private $email;

    public function __construct(AlterLogPunchRepositoryInterface $alter_log_punch,
                                DtrRepositoryInterface $dtr,
                                EmailRepositoryInterface $email){
        $this->alter_log_punch = $alter_log_punch;
        $this->dtr = $dtr;
        $this->email = $email;
    }

    /**
     * Creates an Change Schedule Request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request){
        try {
          $conflict = $this->alter_log_punch->on_conflict($request);
            if($conflict != ""){
                return error_response(  $conflict );
            }  

            // log_activity( trans('messages.create_alter_log_attempt') );
            $check_alters = AlterLogPunch::where('date',$request->date)->where("user_id",$request->user_id)->where("status","pending")->latest();
         
            if($check_alters->count() > 0){

                $update_id = $check_alters->first()->id;

                return success_response(
                    trans('messages.update_alter_log_success'), 
                    new AlterLogPunchResource( $this->alter_log_punch->update( $request->all(), $update_id ) ) 
                );
            }
            else{
                $alter_log_punch = $this->alter_log_punch->store( $request->all());
          
            
                return success_response(
                    trans('messages.create_alter_log_success'), 
                    new AlterLogPunchResource($alter_log_punch),
                    JsonResponse::HTTP_CREATED
                );
            }


        } catch(Exception $e){
            // dd($e);

            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Updates an existing Change Schedule Request
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id){
        try {
            // log_activity( trans('messages.update_alter_log_attempt') );

            return success_response(
                trans('messages.update_alter_log_success'), 
                new AlterLogPunchResource( $this->alter_log_punch->update( $request->all(), $id ) ) 
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
            // log_activity( trans('messages.delete_hange_schedule_attempt') );

            return success_response(
                trans('messages.delete_alter_log_success'), 
                $this->alter_log_punch->destroy( $id ) 
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
            $alter_log_punch = $this->alter_log_punch->find( $id );
            // dd($alter_log_punch);
            return success_response(
                trans('messages.find_alter_log_success'), 
                new AlterLogPunchResource( $alter_log_punch ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }
    

    /**
     * Approves an Change Schedule Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function approve(Request $request, $id){
        try {

            $conflict = $this->alter_log_punch->on_conflict($request);
            if($conflict != ""){
                return error_response(  $conflict );
            }

            // log_activity( trans('messages.approve_alter_log_attempt') );
     
            $alter_log_punch = $this->alter_log_punch->approve( $request->all() , $id );
           
            // Add code to apply the Alter Log on the specific DTR.
            $punch = $this->dtr->apply_alter_to_punch( $alter_log_punch );

            return success_response(
                trans('messages.approve_alter_log_success'), 
                new AlterLogPunchResource( $alter_log_punch ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }
    

    /**
     * Declines an Change Schedule Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function decline(Request $request, $id){
        try {
            // log_activity( trans('messages.decline_alter_log_attempt') );

            $alter_log_punch = $this->alter_log_punch->decline( $request->all(),$id );

            // Add code to Remove the Alter Log from the specific DTR.
            $dtr = $this->dtr->remove_alter_to_punch( $alter_log_punch );

            return success_response(
                trans('messages.decline_alter_log_success'), 
                new AlterLogPunchResource( $alter_log_punch ) 
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
            // log_activity( trans('messages.pending_alter_log_attempt') );

            return success_response(
                trans('messages.pending_alter_log_success'), 
                new AlterLogPunchResource( $this->alter_log_punch->pending( $id ) ) 
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
            // log_activity( trans('messages.cancel_alter_log_attempt') );

            return success_response(
                trans('messages.cancel_alter_log_success'), 
                new AlterLogPunchResource( $this->alter_log_punch->cancel( $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }
}
