<?php

namespace App\Modules\Payroll\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Payroll\Http\Requests\PayrollCutoffRequest;
use App\Modules\Payroll\Repositories\PayrollCutoffRepository;
use App\Modules\Payroll\Resources\PayrollCutoffResource;
use Exception;
use Illuminate\Http\JsonResponse;

class PayrollCutoffController extends Controller
{

    private $payroll_cutoff;
    
    public function __construct(PayrollCutoffRepository $payroll_cutoff){
        $this->payroll_cutoff = $payroll_cutoff;
    }

    /**
     * Shows all existing Payroll Cutoff
     * @return \Illuminate\Http\JsonResponse
     */
    public function get_filter_for_dtr( $user_id ){
        try {
            $collection = $this->payroll_cutoff->get_filter_for_dtr( $user_id );

            return success_response(
                trans('messages.get_filter_for_dtr_success'), 
                $collection
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    /**
     * Shows all existing Payroll Cutoff
     * @return \Illuminate\Http\JsonResponse
     */
    public function all(){
        try {
            $payroll_cutoff_collection = $this->payroll_cutoff->all();

            return success_response(
                trans('messages.all_payroll_cutoff_success'), 
                PayrollCutoffResource::collection( $payroll_cutoff_collection ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    /**
     * Shows an existing Payroll Cutoff
     * @return \Illuminate\Http\JsonResponse
     */
    public function find($id){
        try {
            $payroll_cutoff = $this->payroll_cutoff->find( $id );

            return success_response(
                trans('messages.find_payroll_cutoff_success'), 
                new PayrollCutoffResource( $payroll_cutoff ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    /**
     * Creates an Payroll Cutoff
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(PayrollCutoffRequest $request){
        try {
            log_activity( trans('messages.create_payroll_cutoff_attempt') );

            $payroll_cutoff = $this->payroll_cutoff->store( $request->all());
            
            return success_response(
                trans('messages.create_payroll_cutoff_success'), 
                new PayrollCutoffResource($payroll_cutoff),
                JsonResponse::HTTP_CREATED
            );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Updates an existing Payroll Cutoff
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(PayrollCutoffRequest $request, $id){
        try {
            log_activity( trans('messages.update_payroll_cutoff_attempt') );

            return success_response(
                trans('messages.update_payroll_cutoff_success'), 
                new PayrollCutoffResource( $this->payroll_cutoff->update( $request->all(), $id ) ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Deletes an existing Payroll Cutoff
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id){
        try {
            log_activity( trans('messages.delete_payroll_cutoff_attempt') );

            return success_response(
                trans('messages.delete_payroll_cutoff_success'), 
                $this->payroll_cutoff->destroy( $id ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
