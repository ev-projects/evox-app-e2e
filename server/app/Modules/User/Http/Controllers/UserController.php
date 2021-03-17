<?php

namespace App\Modules\User\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Payroll\Resources\DtrResource;
use App\Modules\Schedule\Resources\ScheduleCollection;
use App\Modules\Schedule\Resources\ScheduleResource;
use App\Modules\User\Http\Requests\AssignUserEmployeesRequest;
use App\Modules\User\Http\Requests\AssignUserRolePermissionRequest;
use App\Modules\User\Http\Requests\ChangePasswordRequest;
use App\Modules\User\Http\Requests\ForgotPasswordRequest;
use App\Modules\User\Http\Requests\RegisterUserRequest;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\User\Resources\UserListResource;
use App\Modules\User\Resources\UserListResourceCollection;
use App\Modules\User\Resources\UserProfileResource; 

use App\Modules\User\Resources\EmploymentStatusResource; 
use App\Modules\User\Resources\JobInformationResource; 

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

use App\Modules\User\Models\User;
use App\Modules\User\Resources\DpaUserListResource;
use App\Modules\User\Resources\DpaUserListResourceCollection;
use App\Modules\User\Resources\RoleResource;

class UserController extends Controller
{
    protected $user;
    protected $bhr;
    protected $email;

    public function __construct(UserRepositoryInterface $user, 
                                BhrRepositoryInterface $bhr,
                                EmailRepositoryInterface $email){
        $this->user = $user;
        $this->bhr = $bhr;
        $this->email = $email;
    }

    /**
     * Constructs the Profile Details of the User by the User ID
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function profile( $id ){   
        try {
            
            $this->validate(new Request([
                'id' => $id
            ]), [
                'id' => 'int'
            ]);
               
            $user = $this->user->show( $id );

            $profile_picture = $this->bhr->get_profile_picture( $user->bhr_num );

            $info = $this->bhr->get_user_bhr_field( $user->bhr_num  );

            return success_response(
                trans('messages.show_profile_success'), 
                [
                    'user'  => new UserProfileResource( $user ), 
                    'profile_picture'  => $profile_picture, 
                    'mobile_phone'  => is_valid( $info ) ? $info->mobilePhone : null,
                    'job_title'  => is_valid( $info ) ? $info->jobTitle : null,
                ]
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
    

    public function job_information( $id ){   
        try {
            
            $this->validate(new Request([
                'id' => $id
            ]), [
                'id' => 'int'
            ]);
            $user = $this->user->show( $id );
               
            $profile_picture = $this->bhr->get_profile_picture( $user->bhr_num );

            $employment_status = $this->bhr->get_user_job_information( $user->bhr_num , 'employmentStatus' );

            $job_information = $this->bhr->get_user_job_information( $user->bhr_num , 'jobInfo' );

            $info = $this->bhr->get_user_bhr_field( $user->bhr_num  );
            return success_response(
                trans('messages.show_profile_success'), 
                [
                    'profile_picture'  => $profile_picture, 
                    'job_information'  => new JobInformationResource( $job_information ) ,
                    'employment_status'  =>new EmploymentStatusResource( $employment_status ),
                    'job_title'  => is_valid( $info ) ? $info->jobTitle : null
                ]
            );

            
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
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
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function user_info( $id ){   
        try {

            $this->validate(new Request([
                'id' => $id
            ]), [
                'id' => 'int'
            ]);

            if( is_under_supervisee( $id ) ){
                $user_info = User::find( $id );
                $user_info =  $user_info->getUserInfo();
            }
 
            return success_response(
                trans('messages.get_user_info_success'), 
                $user_info
            );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Shows an existing Department
     * @return \Illuminate\Http\JsonResponse
     */
    public function get_dpa_list( Request $request){
        try {
            $user_collection = $this->user->get_dpa_list( $request );
            return success_response(
                trans('messages.get_dpa_list_success'), 
                new DpaUserListResourceCollection( $user_collection )
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    /**
     * Returns the Temporary Schedules of the User by the User ID
     * @param string $user_id
     * @return \Illuminate\Http\JsonResponse
     */
    public function assign_roles_permissions( AssignUserRolePermissionRequest $request, $id ){   
        try {
            log_activity( trans('messages.user_assign_roles_permissions_attempt') );
            
            $this->validate(new Request([
                'id' => $id
            ]), [
                'id' => 'int'
            ]);

            $this->user->assign_roles_to_user( $id , $request->get('roles'), );

            $this->user->assign_permissions_to_user( $id ,$request->get('permissions') );
            
            return success_response(
                trans('messages.user_assign_roles_permissions_success'), 
                true
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    

    /**
     * Function for Change Password 
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function change_password( ChangePasswordRequest $request, $id ){   
        try {
            log_activity( trans('messages.change_password_attempt') );

            $this->validate(new Request([
                'id' => $id
            ]), [
                'id' => 'int'
            ]);
               
            $user = $this->user->change_password( $id, $request->all() );

            if( ! $user ) {
                $message = trans('messages.current_password_not_match');

                log_error([
                    'user' => $user,
                    'message' => $message
                ]);
                
                return error_response( $message, [], JsonResponse::HTTP_NOT_FOUND);
            }

            return success_response(
                trans('messages.change_password_success'), 
                new UserProfileResource( $user )
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    

    /**
     * Function for Ticking the DPA field of the User
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function tick_dpa( $id ){   
        try {
            log_activity( trans('messages.tick_dpa_attempt') );

            $this->validate(new Request([
                'id' => $id
            ]), [
                'id' => 'int'
            ]);
               
            $user = $this->user->tick_dpa( $id );

            return success_response(
                trans('messages.tick_dpa_success'), 
                new UserProfileResource( $user )
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    

    /**
     * Constructs the Profile Details of the User by the User ID
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function forgot_password_request( ForgotPasswordRequest $request ){   
        try {
            log_activity( trans('messages.forgot_password_request_attempt') );

            $temporary_password = str_random(8);

            $user = $this->user->apply_temporary_password( $request->get('email'), $temporary_password );
            
            $this->email->sendForgotPasswordRequestEmail( $user, $temporary_password );

            return success_response(
                trans('messages.forgot_password_request_success')
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

    /**
     * Returns all the User List of Specific Department
     * @param string $department_id
     * @return \Illuminate\Http\JsonResponse
     */
    public function get_user_by_string( $string_name ){ 
        # Get user

        $user = User::where('first_name', 'like', '%' . $string_name . '%')->orWhere('last_name', 'like', '%' . $string_name . '%')->select('id','first_name','middle_name','last_name','emp_num')->get();  
        try {
            log_activity( trans('messages.list_role_attempt') );
            
            return success_response(
                trans('messages.list_role_success'), $user 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    # This function returns user role
    public function get_user_role( $user_id ){   
        try {
            log_activity( trans('messages.list_role_attempt') );
                    return success_response(
                        trans('messages.list_role_success'),  User::find($user_id)->roles->pluck('name')
                    );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    # This function returns roles
    public function get_roles( ){   
        try {
            log_activity( trans('messages.list_role_attempt') );
                    return success_response(
                        trans('messages.list_role_success'),  
                        RoleResource::collection( Role::with('permissions')->get() ) 
                    );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    # This function registers User to the system
    public function register( RegisterUserRequest $request){
    
        try {
            log_activity( trans('messages.register_user_attempt') );

            $data = $this->user->register_user( $request );

            $this->email->sendRegisteredUserEmail( $data['user'], $data['temporary_password'] );
            
            return success_response(
                trans('messages.register_user_success'),  
                new UserProfileResource( $data['user'] )
            );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    







}