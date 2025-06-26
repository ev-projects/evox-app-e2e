<?php

namespace App\Modules\Coe\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Coe\Http\Requests\COERequest;
use App\Modules\Coe\Models\COE;
use App\Modules\Coe\Models\CoeBhrFields;
use App\Modules\User\Models\User;
use App\Modules\Coe\Repositories\COERepositoryInterface;
use App\Modules\Coe\Resources\COEResource;
use PDF;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

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
            $coe_bhr_fields = CoeBhrFields::where('country_id', $user->country_id)->orderBy('field_label')->get();
            $additional_fields = [];
            foreach($coe_bhr_fields as $coef) {
                $additional_fields[] = $coef->field_name;
                if (($coef->subf_field_name) and (strlen($coef->subf_field_name) > 0)) {
                    $additional_fields[] = $coef->subf_field_name;
                }
            }
            $employee = $this->bhr->get_user_bhr_field( $user->bhr_num, 'BHR_COE_USER_FIELDS', $additional_fields);

            if (!$employee) {
                //log_to_file( 'info', "Employee could not be found.", [], "coelog");
                return error_response( "Employee could not be found.", [], 404 );
            }

            $employee = (array) $employee;
            $created_coe = $this->coe->create($user, $coe_bhr_fields, $request, $employee);
            $coe = $created_coe[0];
            $allowances = $created_coe[1];
            $coe_template = $created_coe[2];
            $image_file = 'images/' . $coe_template->template_header;
            $header_image = '';
            log_to_file( 'warning', "Image does not exits.", [Storage::disk('public')->path($image_file)], "coelog");
            if (Storage::disk('public')->exists($image_file)) {
                $fileContent = Storage::disk('public')->get($image_file);
                $mimeType = Storage::disk('public')->mimeType($image_file); // e.g., image/png
                $base64 = base64_encode($fileContent);
                $header_image = "data:{$mimeType};base64,{$base64}";
            } else {
                log_to_file( 'warning', "Image does not exits.", [$image_file], "coelog");
            }
            // log action to audit_trail table
            log_to_audit_trail(['action' => 'Certificate of Employment', 'description' => 'has requested for certificate of employment', 'user_id' => $user->id, 'session_id' => $request->session_id, 'type' => 1]);
            $local_time = $coe->created_at->copy()->timezone($user->country_timezone_name())->format('F d, Y h:i:s A');;
            $pdf = PDF::loadView('pdfs.coe', compact('coe', 'allowances', 'coe_template', 'header_image', 'local_time'))->setPaper('a4', 'portrait');
            return $pdf->stream($coe->sequence_number . '.pdf');
            
            // return success_response(
            //     trans('Create Success'), 
            //     JsonResponse::HTTP_CREATED
            // );
        } catch(Exception $e){
            log_to_file( 'info', $e->getMessage(), [], "coelog");
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
