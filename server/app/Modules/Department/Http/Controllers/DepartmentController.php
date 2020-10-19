<?php

namespace App\Modules\Department\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Department\Http\Requests\AssignDepartmentHandlersRequest;
use App\Modules\Department\Resources\DepartmentResource;
use App\Modules\Department\Repositories\DepartmentRepositoryInterface;

use Exception;
use Illuminate\Http\JsonResponse;

class DepartmentController extends Controller
{

    private $department;
    
    public function __construct(DepartmentRepositoryInterface $department){
        $this->department = $department;
    }

    /**
     * Shows all existing Department
     * @return \Illuminate\Http\JsonResponse
     */
    public function all(){
        try {
            $department_collection = $this->department->all();

            return success_response(
                trans('messages.all_department_success'), 
                DepartmentResource::collection( $department_collection ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    /**
     * Shows an existing Department
     * @return \Illuminate\Http\JsonResponse
     */
    public function find($id){
        try {
            $department = $this->department->find( $id );

            return success_response(
                trans('messages.find_department_success'), 
                new DepartmentResource( $department ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    

    /**
     * Shows an existing Department
     * @return \Illuminate\Http\JsonResponse
     */
    public function assign_handlers( AssignDepartmentHandlersRequest $request, $id ){
        try {
            log_activity( trans('messages.department_assign_handlers_attempt') );
            $department = $this->department->assign_handlers( $id, $request->get('user_id') );

            return success_response(
                trans('messages.department_assign_handlers_success'), 
                new DepartmentResource( $department ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }
}
