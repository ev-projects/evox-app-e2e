<?php

namespace App\Modules\Coe\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Coe\Http\Requests\COERequest;
use App\Modules\Coe\Models\COE;
use App\Modules\User\Models\User;
use App\Modules\Coe\Repositories\COERepositoryInterface;
use App\Modules\Coe\Resources\COEResource;
use PDF;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class COEController extends Controller
{
    private $coe;
    private $bhr;
    
    public function __construct(COERepositoryInterface $coe, BhrRepositoryInterface $bhr){
        $this->coe = $coe;
        $this->bhr = $bhr;
    }

    /**
     * Shows the employee's client users
     * @return \Illuminate\Http\JsonResponse
     */
    public function all(){
        try {
            $coe_collection = COEResource::collection($this->coe->all());
            
            return success_response(
                trans('Sucess'), 
                $coe_collection
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    /**
     * Create COE for employee.
     *
     * @return mixed
     */
    public function create(COERequest $request){
        try {
            $user = auth()->user();

            $employee = $this->bhr->get_user_bhr_field( $user->bhr_num, 'BHR_COE_USER_FIELDS' );

            if (!$employee) {
                //log_to_file( 'info', "Employee could not be found.", [], "coelog");
                return error_response( "Employee could not be found.", [], 404 );
            }

            $employee = (array) $employee;
            $coe = $this->coe->create($user->id, $request->purpose_index, $request->show_compensation, $employee);

            // log action to audit_trail table
            log_to_audit_trail(['action' => 'Certificate of Employment', 'description' => 'has requested for certificate of employment', 'user_id' => $user->id, 'session_id' => $request->session_id, 'type' => 1]);

            $pdf = PDF::loadView('pdfs.coe', compact('coe'))->setPaper('a4', 'portrait');
            return $pdf->stream('Certificate-of-Employment.pdf');
            
            // return success_response(
            //     trans('Create Success'), 
            //     JsonResponse::HTTP_CREATED
            // );
        } catch(Exception $e){
            //log_to_file( 'info', $e->getMessage(), [], "coelog");
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
