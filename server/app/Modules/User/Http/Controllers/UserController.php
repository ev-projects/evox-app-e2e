<?php

namespace App\Modules\User\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Payroll\Resources\DtrResource;
use App\Modules\Schedule\Resources\ScheduleCollection;
use App\Modules\Schedule\Resources\ScheduleResource;
use App\Modules\User\Http\Requests\AssignUserEmployeesRequest;
use App\Modules\User\Http\Requests\AssignUserRolePermissionRequest;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\User\Resources\UserListResource;
use App\Modules\User\Resources\UserListResourceCollection;
use Exception;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    protected $user;

    public function __construct(UserRepositoryInterface $user){
        $this->user = $user;
    }

    /**
     * Returns the Default Schedule of the User by the User ID
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function default_schedule( $id ){   
        try {
            
            $this->validate(new Request([
                'id' => $id
            ]), [
                'id' => 'int'
            ]);

            $user = $this->user->show( $id );

            return success_response(
                trans('messages.show_default_schedule'), 
                new ScheduleResource( $user->defaultSchedule()->first() ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Returns the Temporary Schedules of the User by the User ID
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function temporary_schedules( $id ){   
        try {

            $this->validate(new Request([
                'id' => $id
            ]), [
                'id' => 'int'
            ]);

            $user = $this->user->show( $id );
            
            return success_response(
                trans('messages.show_temporary_schedule'), 
                ScheduleResource::collection( $user->temporarySchedules()->get() ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }



    /**
     * Returns the Temporary Schedules of the User by the User ID
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function my_team_list( $id ){   
        try {

            $this->validate(new Request([
                'id' => $id
            ]), [
                'id' => 'int'
            ]);

            $user_collection = $this->user->get_my_team_list( $id );

            return success_response(
                trans('messages.show_my_team_list'), 
                new UserListResourceCollection( $user_collection ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    

    /**
     * Returns the Temporary Schedules of the User by the User ID
     * @param string $user_id
     * @return \Illuminate\Http\JsonResponse
     */
    public function assign_roles_permissions( AssignUserRolePermissionRequest $request, $user_id ){   
        try {
            log_activity( trans('messages.user_assign_roles_permissions_attempt') );
            
            $this->validate(new Request([
                'user_id' => $user_id
            ]), [
                'user_id' => 'int'
            ]);

            $this->user->assign_roles_to_user( $user_id , $request->get('roles'), );

            $this->user->assign_permissions_to_user( $user_id ,$request->get('permissions') );
            
            return success_response(
                trans('messages.user_assign_roles_permissions_success'), 
                true
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    

    /**
     * Returns the Temporary Schedules of the User by the User ID
     * @param string $user_id
     * @return \Illuminate\Http\JsonResponse
     */
    public function assign_employees( AssignUserEmployeesRequest $request, $user_id ){   
        try {
            log_activity( trans('messages.user_assign_employees_attempt') );
            
            $this->validate(new Request([
                'user_id' => $user_id
            ]), [
                'user_id' => 'int'
            ]);

            $user = $this->user->assign_employees_to_user( $user_id , $request->all() );
            
            return success_response(
                trans('messages.user_assign_employees_success'), 
                new UserListResource( $user )
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    

    /**
     * Returns all the Users that has a role in the Parameter.
     * @param string $user_id
     * @return \Illuminate\Http\JsonResponse
     */
    public function list_via_role( $role ){   
        try {
            log_activity( trans('messages.list_role_attempt') );
            
            $this->validate(new Request([
                'role' => $role
            ]), [
                'role' => 'exists:roles,name'
            ]);
            
            return success_response(
                trans('messages.list_role_success'), 
                UserListResource::collection( $this->user->list_via_role( $role ), false )
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    

    /**
     * Returns all the User List of Specific Department
     * @param string $department_id
     * @return \Illuminate\Http\JsonResponse
     */
    public function list_via_department( $department_id ){   
        try {
            log_activity( trans('messages.list_role_attempt') );
            
            $this->validate(new Request([
                'department_id' => $department_id
            ]), [
                'department_id' => 'int'
            ]);
            
            return success_response(
                trans('messages.list_role_success'), 
                UserListResource::collection( $this->user->list_via_department( $department_id ), false )
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }







}