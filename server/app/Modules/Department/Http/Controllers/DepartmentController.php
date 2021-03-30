<?php

namespace App\Modules\Department\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Department\Http\Requests\AssignDepartmentHandlersRequest;
use App\Modules\Department\Resources\DepartmentResource;
use App\Modules\Department\Repositories\DepartmentRepositoryInterface;
use App\Modules\Department\Resources\DepartmentListResource;
use App\Modules\Schedule\Resources\ScheduleResource;
use App\Modules\User\Resources\UserListResource;
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
                DepartmentListResource::collection( $department_collection ) 
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
     * Shows the Department Hanlders of the Department
     * @return \Illuminate\Http\JsonResponse
     */
    public function department_handlers($id){
        try {
            $user_collection = $this->department->find( $id )->department_supervisors()
                                                             ->orderBy('first_name', 'asc')
                                                             ->orderBy('last_name', 'asc')
                                                             ->get();

            return success_response(
                trans('messages.fetch_department_handlers_success'), 
                UserListResource::collection( $user_collection ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }


    /**
     * Shows the Department Hanlders of the Department
     * @return \Illuminate\Http\JsonResponse
     */
    public function users($id){
        try {
            $user_collection = $this->department->find( $id )->users()
                                                             ->orderBy('first_name', 'asc')
                                                             ->orderBy('last_name', 'asc')
                                                             ->get();

            return success_response(
                trans('messages.fetch_department_users_success'), 
                UserListResource::collection( $user_collection ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }


    /**
     * Shows an existing Department
     * @return \Illuminate\Http\JsonResponse
     */
    public function default_schedule($id){
        try {
            $schedule = $this->department->find( $id )->defaultSchedule()->first();

            return success_response(
                trans('messages.find_department_success'), 
                new ScheduleResource( $schedule ) 
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
