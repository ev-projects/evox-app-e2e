<?php

namespace App\Modules\User\Http\Controllers;

use Auth;

use Exception;
use App\Features;
use Carbon\Carbon;
use Illuminate\Http\Request;
use App\Exports\DpaListExport;
use App\Exports\AssetExport;
use App\Modules\User\Models\User;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Role;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Hash;
use Maatwebsite\Excel\Facades\Excel;
use App\Jobs\AssignAllUserToAdminJob;
use App\Modules\Payroll\Models\Holiday;
use Spatie\Permission\Models\Permission;
use App\Modules\User\Resources\RoleResource;
use Illuminate\Database\Eloquent\Collection;
use App\Modules\User\Resources\HolidayResource;
use App\Modules\User\Resources\UserListResource;
use App\Modules\User\Resources\LeavesListResource;
use App\Modules\User\Resources\DpaUserListResource;
use App\Modules\Department\Models\EvoxSubDepartment;
use App\Modules\Schedule\Resources\ScheduleResource;
use App\Modules\User\Resources\UserProfileResource; 
use App\Modules\User\Resources\AnniversaryResources; 
use App\Modules\User\Resources\UserListBasicResource;
use App\Modules\Schedule\Resources\ScheduleCollection;
use App\Modules\User\Http\Requests\GenerateDtrRequest;
use App\Modules\User\Http\Requests\RegisterUserRequest;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\User\Resources\LeaveCreditsListResource;
use App\Modules\Schedule\Repositories\ScheduleRepository;
use App\Modules\User\Models\AssetManagement;

use App\Modules\User\Http\Requests\ChangePasswordRequest;
use App\Modules\User\Http\Requests\ForgotPasswordRequest;
use App\Modules\User\Resources\EmploymentStatusResource; 
use App\Modules\User\Resources\JobInformationResource;   
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\User\Resources\UserListResourceCollection;
use App\Modules\User\Resources\PersonalInformationResource;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\User\Resources\DpaUserListResourceCollection;
use App\Modules\Schedule\Resources\ScheduleResourceCollection;
use App\Modules\User\Http\Requests\AssignUserEmployeesRequest;
use App\Modules\User\Http\Requests\AssignUserRolePermissionRequest;

class UserController extends Controller
{
    protected $user;
    protected $dtr;
    protected $bhr;
    protected $email;
    protected $schedule;
    protected $dpa_list_export;

    public function __construct(UserRepositoryInterface $user, 
                                DtrRepositoryInterface $dtr, 
                                BhrRepositoryInterface $bhr,
                                DpaListExport $dpa_list_export,
                                EmailRepositoryInterface $email,
                                ScheduleRepository $schedule){
        $this->user = $user;
        $this->dtr = $dtr;
        $this->bhr = $bhr;
        $this->dpa_list_export = $dpa_list_export;
        $this->email = $email;
        $this->schedule = $schedule;
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

            return success_response(
                trans('messages.show_profile_success'), 
                [
                    'user'  => new UserProfileResource( $user ), 
                    'profile_picture'  => $profile_picture
                ]
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
    public function personal_information( $id ){   
        try {
            
            $this->validate(new Request([
                'id' => $id
            ]), [
                'id' => 'int'
            ]);
               
            $user = $this->user->show( $id );

            $info = $this->bhr->get_user_bhr_field( $user->bhr_num  );

            return success_response(
                trans('messages.show_personal_information_success'), 
                new PersonalInformationResource( $info )
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

            $employment_status = $this->bhr->get_user_job_information( $user->bhr_num , get_constant('BHR_USER_TABLE.employee_status') );

            $job_information = $this->bhr->get_user_job_information( $user->bhr_num , get_constant('BHR_USER_TABLE.job_info')  );

            return success_response(
                trans('messages.show_profile_success'), 
                [
                    'job_information'  => new JobInformationResource( $job_information ) ,
                    'employment_status'  => new EmploymentStatusResource( $employment_status )
                ]
            );

            
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Constructs the Time Off Details of the User by the User ID
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function time_off( $id, $start_date, $end_date ){   
        try {
            
            $this->validate(new Request([
                'id' => $id
            ]), [
                'id' => 'int'
            ]);
               

            $user = $this->user->show( $id );

            $dtr_collection = $user->dtr($start_date, $end_date)->get();
            
            $leaves_collection = $this->dtr->get_leaves_from_dtr( $dtr_collection );
            
            return success_response(
                trans('messages.show_time_off_collection'), 
                LeavesListResource::collection( $leaves_collection )
                
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Constructs the Leave Credits Details of the User by the User ID
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function leave_credits( $id ){   
        try {
            
            $this->validate(new Request([
                'id' => $id
            ]), [
                'id' => 'int'
            ]);

            $user = $this->user->show( $id );

            $leave_credits_collection = $this->bhr->get_leave_credits( $user->bhr_num, Carbon::today()->format('Y-m-d')  );

            return success_response(
                trans('messages.show_time_off_collection'), 
                new LeaveCreditsListResource( $leave_credits_collection )
                
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
    public function schedule_history( $id ){   
        try {
            
            $this->validate(new Request([
                'id' => $id
            ]), [
                'id' => 'int'
            ]);

            $schedule_history = $this->schedule->list( $id );
            
           
            return success_response(
                trans('messages.show_default_schedule'), 
                new ScheduleResourceCollection($schedule_history ) 
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
     * Returns the Default Schedule of the User by the User ID
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function schedule_info( $id, $schedule_id ){   
        try {
            
            $this->validate(new Request([
                'id' => $id,
                'schedule_id' => $schedule_id
            ]), [
                'id' => 'int',
                'schedule_id' =>  'int'
            ]);

            $user = $this->user->show( $id );

            return success_response(
                trans('messages.show_default_schedule'), 
                new ScheduleResource( $user->Schedule_Find($schedule_id)->first() ) 
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

            $user_collection = $this->user->new_get_my_team_list( $id );


            return success_response(
                trans('messages.show_my_team_list'), 
                // new UserListResourceCollection( $user_collection ) 
                $user_collection
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
    public function my_team_list_under_department( $id, $department_id ){   
        try {
            $user_collection = Auth::user()->departments_team( $department_id );

            return success_response(
                trans('messages.show_my_team_list'), 
                $user_collection
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

  
    public function sub_department_under_department( $id, $department_id ){   
        try {

                $user = User::find($id);
                $sub_dep = $user->evox_sub_departments_handled($department_id);
            return success_response(
                trans('messages.show_sub_department_list'), 
                $sub_dep);
        } catch(Exception $e){
        
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function sub_department_list(  ){   
        try {

                    $sub_depts = call_sp('EH_SP_Team_Head_Allocation', 
                    [
                        Null, NULL, 1, NULL, Null
                    ]
                );

            // dd($sub_depts);
            return success_response(
                trans('messages.show_sub_department_list'), 
                $sub_depts[0]);
        } catch(Exception $e){
        
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function sub_department_allocate( $user_id , Request $request){   
        try {
            // dd( $user_id,$request->all());

            $action = $request->sp_action == "enable"? 0 : 1;
            
            $sub_depts = call_sp('EH_SP_Team_Head_Allocation', 
                    [
                        $user_id, $request->department_id, 3,  $action, Auth::user()->id
                    ]
                );

                $updated_sub_depts = call_sp('EH_SP_Team_Head_Allocation', 
                [
                    $user_id, NULL, 4, NULL, null
                ]
            );

            // dd($sub_depts);
            // dd($updated_sub_depts);
            return success_response(
                "Allocation Department to user", 
                $updated_sub_depts[0]);
        } catch(Exception $e){
        
            return error_response( trans('messages.error_default'), $e );
        }
    }

    // public function sub_department_is_handled($user_id, $sub_dep_id){   
    //     try {

    //                 $sub_depts = call_sp('EH_SP_Team_Head_Allocation', 
    //                 [
    //                     $user_id, NULL, 4, NULL
    //                 ]
    //             );


    //         // dd($sub_depts);
    //         return success_response(
    //             trans('messages.show_sub_department_list'), 
    //             $sub_depts[0]);
    //     } catch(Exception $e){
        
    //         return error_response( trans('messages.error_default'), $e );
    //     }
    // }

    public function my_team_list_under_selected_department( Request $request,  $id ){   
        try {
            $dept_ids = [];
            if( is_valid( $request->departments ) ) {
                $dept_ids = $request->departments ;
            }
            $me = auth()->user();

            //$sub_depts = call_sp('EH_SP_Attendance_Summary', [NULL, NULL, implode(',', $dept_ids), NULL, NULL, $me->id, 1, null])[0];
            $sub_depts = [];
            if (is_array($dept_ids)) {
                foreach ($dept_ids as $depat_id) {
                    $sub_depts = array_merge($sub_depts, $me->evox_sub_departments_handled($depat_id));
                }
            } elseif (is_numeric($dept_ids)) {
                $sub_depts = $me->evox_sub_departments_handled($depat_id);
            }
            return success_response(
                trans('messages.show_my_team_list'), 
                $sub_depts
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
                // new DpaUserListResourceCollection( $user_collection ),

                $user_collection
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    /**
     * Returns the raw DTR Logs of the User
     * @return \Illuminate\Http\JsonResponse
     */
    public function dpa_list($request) {

        // $user_collection = $this->user->get_users_under_supervisee( $request );
     
        $result = $this->user->get_dpa_list( $request);
        
        return $result;
    }

    /**
     * Returns the DTR Summary of the User by the User ID as Parameter with the Date Range.
     * @return \Illuminate\Http\JsonResponse
     */
    public function export_dpa_list( Request $request ){

        $result = $this->dpa_list($request);
        // dd( $result[0] );

        $this->dpa_list_export->data = $result["data"] ;
         return Excel::download( $this->dpa_list_export , 'dtrlogs.csv');
    
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
//special conditions is assigned as admin included
            // $this->user->adminRoleConditions( $id ,$request->get('roles'));

            AssignAllUserToAdminJob::dispatch( $id ,$request->get('roles') )->delay(Carbon::now()->addSeconds(2));

            $this->user->assign_roles_to_user( $id , $request->get('roles'), );

            $user = $this->user->assign_permissions_to_user( $id ,$request->get('permissions'), $request->get('roles') );

            
            return success_response(
                trans('messages.user_assign_roles_permissions_success'), 
                new UserProfileResource( $user )
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function assign_level_features( Request $request, $id ){   
        try {
            log_activity( trans('messages.user_assign_roles_permissions_attempt') );
            
            $this->validate(new Request([
                'id' => $id
            ]), [
                'id' => 'int'
            ]);

            // dd($request->all());

            $user = $this->user->assign_level_features( $id ,$request->get('features'), $request->get('level') );

            
            return success_response(
                trans('messages.user_assign_roles_permissions_success'), 
                new UserProfileResource( $user )
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
    public function tick_dpa( $id, Request $request ){
        try {
            log_activity( trans('messages.tick_dpa_attempt') );

            $this->validate(new Request([
                'id' => $id
            ]), [
                'id' => 'int'
            ]);
               
            $user = $this->user->tick_dpa( $id );

            // log action to audit_trail table
            log_to_audit_trail(['action' => 'DPA', 'description' => 'has ticked the DPA webinar', 'user_id' => auth()->user()->id, 'session_id' => $request->session_id, 'type' => 1]);

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
            
            if($role == "supervisor"){
                $user = User::whereNotNull("LevelId")->whereIn("LevelId",[1,2,3,4,5,6,7,8])->where("is_active", 1)->with("department")->get()->sortBy('first_name');
                return success_response(
                    trans('messages.list_role_success'), 
                    UserListBasicResource::collection( $user, false )
                );
            }

            $this->validate(new Request([
                'role' => $role
            ]), [
                'role' => 'exists:roles,name'
            ]);
            $user = Auth::user();
            $response = call_sp("EH_SP_Employee_List",
            
            [
                $user->id, // vishnu user_id
                is_valid(  $user->LevelId ) ?  $user->LevelId: null, // level
                is_valid( request()->get('department_id') ) ? request()->get('department_id'): null,
                is_valid( request()->get('sub_department_id') ) ? request()->get('sub_department_id'): null,
                1, // active
                is_valid( request()->get('name') ) ? request()->get('name'): null, // name
                is_valid( request()->get('job_title') ) ? request()->get('job_title'): null, // job_title
                is_valid( request()->get('page') ) ? request()->get('page'): 1,
                 99999,
                1 
                
                ]

                
            ); 
            // dd($response);
            $result = $response[2] ? array_map(function($item) {
                // dd($item);
                return (object) array(
                    'id' => $item->id,
                    'full_name' => $item->Employee_Name,
                   
                );
            }, $response[2]): []
        ;
            
            return success_response(
                trans('messages.list_role_success'), 
                $result
            );
        } catch(Exception $e){
            dd($e);
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
     * Returns all the User List of Specific Team
     * @param string $team_id
     * @return \Illuminate\Http\JsonResponse
     */
    public function list_via_team( $team_id ){   
        try {
            log_activity( trans('messages.list_via_team_attempt') );
            
            $this->validate(new Request([
                'team_id' => $team_id
            ]), [
                'team_id' => 'int'
            ]);
            
            return success_response(
                trans('messages.list_role_success'), 
                UserListResource::collection( $this->user->list_via_department( $team_id ), false )
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
    public function get_user_role_permission( $user_id ){   
        try {
            $user = User::find($user_id);
            log_activity( trans('messages.list_role_attempt') );
                    return success_response(
                        trans('messages.list_role_success'),  
                        [ 
                            'roles' => $user->roles->pluck('name'),
                            'permissions' => $user->permissions->pluck('name'),
                        ]
                    );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

      # This function returns user role
      public function get_user_sub_department_handled( $user_id ){   
        try {
            $user = User::find($user_id);
            

            $sub_depts = call_sp('EH_SP_Team_Head_Allocation', 
                                    [
                                        $user->id, NULL, 4, NULL , null
                                    ]
                                );

                // dd($sub_depts);

            log_activity( trans('messages.list_role_attempt') );
                    return success_response(
                        trans('messages.list_role_success'),  
                        $sub_depts[0]
                    );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

     # This function returns user role
     public function get_user_feature( $user_id ){   
        try {
            $user = User::find($user_id);
            log_activity( trans('messages.list_role_attempt') );

            $feature_all_list = [];
            if(is_valid($user->LevelId)){
                $feature_all_list = array_merge($user->userFeatures(), []);
            }

                    return success_response(
                        trans('messages.list_role_success'),  
                        [ 
                            'level' => [
                                            "level_id"=>$user->LevelId, 
                                            "level_type"=>$user->level_type()
                                        ],
                            'features' => is_valid($user->LevelId) ? $feature_all_list : [],
                        ]
                    );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
     # This function returns user role
     public function get_user_role_feature( $user_id ){   
        try {
            $user = User::find($user_id);
            log_activity( trans('messages.list_role_attempt') );
                    return success_response(
                        trans('messages.list_role_success'),  
                        [ 
                            'roles' => $user->roles->pluck('name'),
                            'permissions' => $user->permissions->pluck('name'),
                        ]
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

      # This function returns roles
      public function get_features( ){   
        try {
            log_activity( trans('messages.list_role_attempt') );
                    return success_response(
                        trans('messages.list_role_success'),  
                        Features::all()->toArray()
                            
                        
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

     /**
     * generate dtr date for emp.
     *
     * @return mixed
     */
    public function generateDtrDate(GenerateDtrRequest $request){
        try {
            // return $request->ids;
            // $start_date =  new Carbon($request->start_date);
            // $end_date = new Carbon($request->end_date);

            $ids = array_column($request->ids, 'value');
            $user_collection = new Collection();
            # Fetches all the Active Users
            // $user_collection = $this->user->get_all_active_users();
            foreach ($ids as $id) {
                $user_collection->push((object)User::findOrFail($id));
                // $user_collection->push((object)User::where('id', $id)->whereHas('roles', function( $query ) {
                //     $query->whereNotIn('name', [ get_constant('USER_ROLES.client')]);
                // })->get());
            }
            
            // return $user_collection ;
            # Generates the Date Range that would be generated as DTR for each Active Employees
            $date_array = generate_date_array($request->start_date, $request->end_date );
            
            # Test Data for Debugging
            // $date_array = generate_date_array( "2021-08-02", '2021-08-08' );
            
            $result = $this->dtr->generate_dtr( $user_collection, $date_array );
               
            return success_response(
                trans('Generate Success'), 
                $result,
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            log_to_file( 'info', $e->getMessage(), [], "cron_errors");
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function getUserCountry(Request $request){
        try {   
            $me = Auth::user();
            $result_sets = call_sp('EH_SP_Get_User_Country', [$me->LevelId, $me->id]);
            $response = $result_sets [0];
            return $response;
        }catch (Exception $e) {
        log_to_file( 'error', $e->getMessage(), [$e], "dtr_summary");
        return error_response(trans('messages.error_default'), $e);
        }
    }

    public function getCountry(Request $request){
        try {  
            $me = Auth::user();
            $result_sets = call_sp('EV_SP_Policies_Document', [null, null, null, null, null, null, null, $me->country_id, null, null, 2]);
            $response = $result_sets[0];
            return $response;
        }catch (Exception $e) {
            log_to_file( 'error', $e->getMessage(), [$e], "upload_document");
            return error_response(trans('messages.error_default'), $e);
        }
    }

    public function get_user_by_string_dispute(){ 
        # Get user

        // $user = User::where('first_name', 'like', '%' . $string_name . '%')
        // ->orWhere('last_name', 'like', '%' . $string_name . '%')
        // ->join('EVOX_SUB_DEPARTMENT', 'users.SubDepartmentId', '=', 'EVOX_SUB_DEPARTMENT.Id')
        // ->join('EVOX_DEPARTMENT', 'EVOX_SUB_DEPARTMENT.DepartmentId', '=', 'EVOX_DEPARTMENT.Id') // Joining the 'departments' table
        // ->select('users.id', 'users.first_name', 'users.middle_name', 'users.last_name', 'users.emp_num', 'EVOX_DEPARTMENT.Name as department_name') // Select relevant fields from both tables
        // ->get(); 
        try {
            $me = Auth::user();
            $user = $result_sets = call_sp('EV_SP_Payroll_Dispute', [null,null,null,null,null,$me->id,$me->LevelId,0,null]);
            log_activity( trans('messages.list_role_attempt') );
            return $user[0]; 
            // return success_response(
            //     trans('messages.list_role_success'), $user 
            // );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function getAllAssets(Request $request)
    {
      try {
            $assets = $result_sets = call_sp('EV_SP_Get_Assets', [$request->geo_id, $request->department_id, $request->emp_name]);
            return $assets[0];
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function getUserAsset($id)
    {
        try {
            $asset_get = AssetManagement::where('id', $id)->where('deleted_at', null)->first();
            return success_response(
                trans('Asset successfully fetched!'),
                $asset_get,
                JsonResponse::HTTP_OK
            );
        } catch (Exception $e) {
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function getUserAssets()
    {
        try {
            $asset_get = AssetManagement::where('user_id', Auth::user()->id)->where('deleted_at', null)->get();
            return success_response(
                trans('Assets successfully fetched!'),
                $asset_get,
                JsonResponse::HTTP_OK
            );
        } catch (Exception $e) {
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function addUserAsset(Request $request)
    {
        try {
            $personal_equipment = $request->personal_equipment ?? null;
            $equipment_type = $request->equipment_type ?? null;
            $serial_no = $request->serial_no ?? null;
            $asset_tag = $request->asset_tag ?? null;
            $add_equipment_type = $request->add_equipment_type ?? null;

            $asset = [
                'user_id' => Auth::user()->id,
                'personal_equipment' => $personal_equipment,
                'equipment_type' => ($equipment_type == "Others") ? $add_equipment_type : $equipment_type,
                'serial_no' => $serial_no,
                'asset_tag' => $asset_tag,
                'created_at' => Carbon::now()
            ];

            $asset_insert = AssetManagement::insert($asset);
            return success_response(
                trans('Asset successfully added!'),
                $asset_insert,
                JsonResponse::HTTP_CREATED
            );
        } catch (Exception $e) {
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function updateUserAsset(Request $request)
    {
        try {
            $personal_equipment = $request->personal_equipment ?? null;
            $equipment_type = $request->equipment_type ?? null;
            $serial_no = $request->serial_no ?? null;
            $asset_tag = $request->asset_tag ?? null;
            $add_equipment_type = $request->add_equipment_type ?? null;

            $asset = [
                'personal_equipment' => $personal_equipment,
                'equipment_type' => ($equipment_type == "Others") ? $add_equipment_type : $equipment_type,
                'serial_no' => $serial_no,
                'asset_tag' => $asset_tag,
                'updated_at' => Carbon::now()
            ];

            $asset_update = AssetManagement::where('id', $request->id)->update($asset);
            return success_response(
                trans('Asset successfully updated!'),
                $asset_update,
                JsonResponse::HTTP_CREATED
            );
        } catch (Exception $e) {
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function assetExport(Request $request)
    {
        try {
            $assets = $result_sets = call_sp('EV_SP_Get_Assets', [$request->geo_id, $request->department_id, $request->emp_name]);
            return Excel::download(new AssetExport($assets[0]), 'AssetReports.csv');
        } catch (Exception $e) {
            return error_response( trans('messages.error_default'), $e );
        }
    }

}