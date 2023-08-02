<?php

namespace App\Modules\Department\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Department\Http\Requests\AssignDepartmentHandlersRequest;
use App\Modules\Department\Models\Department;
use App\Modules\Department\Resources\DepartmentResource;
use App\Modules\Department\Repositories\DepartmentRepositoryInterface;
use App\Modules\Department\Resources\DepartmentListResource;
use App\Modules\Schedule\Resources\ScheduleResource;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\User\Resources\UserListResource;
use Exception;
use Illuminate\Http\JsonResponse;

class DepartmentController extends Controller
{

    private $department;
    
    public function __construct(DepartmentRepositoryInterface $department, UserRepositoryInterface $user){
        $this->department = $department;
        $this->user = $user;
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
     * Shows all  Department that has announcements
     * @return \Illuminate\Http\JsonResponse
     */
    public function all_with_announcements(){
        try {
            $department_collection = $this->department->all_with_announcements();

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
     * Deletes/SoftDelete an existing Department
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id){
        try {


            $deleted = $this->department->destroy_department($id);
            if($deleted){
                $this->user->destroy_department_users($id);
            }
            return success_response(
                trans('messages.soft_delete_department_success'), 
                // new DepartmentResource( $department ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }


        /**
     * Deletes/SoftDelete an existing Department
     * @return \Illuminate\Http\JsonResponse
     */
    public function set_active_on_sched(Request $request, $id){
        try {
         

            $department = Department::find($id);
            $department_has_set = $department->departments_on_schedule()->first();
            
            if( $department_has_set){
                $department->departments_on_schedule()->update(['is_active' => !$department_has_set->is_active]);
            }else{
                $department->departments_on_schedule()->create(['is_active' => true]);
            }
            return success_response(
                trans('messages.change_department_schedule_status'), 
                // new DepartmentResource( $department ) $this->department->all();
                DepartmentListResource::collection( $this->department->all()) 
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
                                                             ->where('is_active', 1)
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


    /**
     * update Department Handlers
     * @return \Illuminate\Http\JsonResponse
     */
    public function update_handlers( AssignDepartmentHandlersRequest $request, $id ){
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
