<?php

namespace App\Modules\User\Repositories;

use App\Features;
use Exception;
use Carbon\Carbon;
use DebugBar\DebugBar;
use Illuminate\Http\Request;
use App\Modules\Team\Models\Team;
use App\Modules\User\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Collection;
use App\Modules\Department\Models\Department;
use App\Modules\User\Models\UtcTimelog;
use App\UserFeatures;

class UserRepository implements UserRepositoryInterface{

    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    /**
     *  Responsible for Registering a User w/ specific departments being handled and roles/permissions
     * @param Request $request
     * @return array [ $user, $temporary_password ]
     */
    public function register_user( $request ){

        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "user_sync");

        DB::beginTransaction();
        try {
            /**
             *  1. Insert the User
             *  2. Attach the Role/s to User
             *  3. Attach the Role's Permissions to User
             *  3. Attach the Departments Handled to User
             */

            // Generate Temporary Password for the User
            $temporary_password = str_random(8);

            # 1.
            $user = new User();

            $user->emp_num = null;
            $user->bhr_num = null;
            $user->email = $request->email;
            $user->username = $request->email;
            $user->password = Hash::make( $temporary_password );
            $user->first_name = $request->first_name;
            $user->middle_name = null;
            $user->last_name = $request->last_name;
            $user->employment_status = get_constant('REGISTERED_USER');
            $user->force_change_password = true;
            $user->date_hired = null;
            $user->is_active = true;

            // Save the User and it will generate the User ID
            $user->save();


            # 2.
            // Iterate the roles to be assigned to the User
            foreach( $request->roles as $role_name ){

                //Fetch the Role to attach on the User
                $role = Role::findByName( $role_name );

                // Assign the Role
                $user->assignRole( $role );

                # 3.
                // Total Permissions that are not synced yet on the User
                $permissions_to_sync = [];

                // Iterate and filter out all the Permissions that are already existing for the User.
                foreach( $role->permissions()->get() as $permission ){
                    if( ! $user->hasDirectPermission( $permission ) ) {
                        $permissions_to_sync[] = $permission;
                    }
                }

                // Assign the User's Permissions
                $user->givePermissionTo( $permissions_to_sync );
            }

            # 4.
            // Attach the Departments Supervised to User
            $user->departments_supervised()->sync( $request->departments_handled );

            log_to_file( 'info', 'User Registered Successfully', [$user], 'user_sync');
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $user, "user_sync");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "user_sync");

            DB::commit();
            return [
                'user' => $user,
                'temporary_password' => $temporary_password,
            ];

        } catch (Exception $e) {

            DB::rollback();
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "user_sync");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "user_sync");

            throw $e;
        }
    }



    /**
     *  Responsible for Inserting the BHR Users to EVOX, Attaching Default Roles and Permissions
     * @param object $bhr_user_number
     * @return User $user
     */
    public function insert_bhr_user_to_evox(object $bhr_user, object $utc){

        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "user_sync");

        DB::beginTransaction();
        try {

            /**
             *  1. Insert the User
             *  2. Attach Default Role to User
             *  3. Attach Default Permissions to User
             */
            $user = User::where('bhr_num', $bhr_user->id)->first();

            // Check first if the User is already existing before creating new User.
            if( $user == null ) {

                // If BHr User has E-mail and valid Employment history status, insert the user
                if( is_valid( $bhr_user->bestEmail ) /*&& is_valid( $bhr_user->employmentHistoryStatus ) */ ) {

                    # 1.
                    $user = new User();

                    if(strlen($bhr_user->employeeNumber)==2){
                        $bhr_user->employeeNumber = "0" . $bhr_user->employeeNumber;
                    }

                    $user->emp_num = $bhr_user->employeeNumber;
                    $user->bhr_num = $bhr_user->id;
                    $user->email = $bhr_user->bestEmail;
                    $user->username = generate_username( $bhr_user );
                    $user->password = Hash::make( get_constant('DEFAULT_PASSWORD') );
                    $user->first_name = $bhr_user->firstName;
                    $user->middle_name = $bhr_user->middleName;
                    $user->last_name = $bhr_user->lastName;
                    $user->nickname = $bhr_user->nickname;
                    $user->employment_status = $bhr_user->employmentHistoryStatus;
                    $user->date_hired = $bhr_user->hireDate;
                    $user->is_active = true;
                    $user->job_title = $bhr_user->jobTitle;
                    $user->mobile_number = $bhr_user->mobilePhone;

                    $utc_check = $utc->where('country_name', '=', is_valid( $bhr_user->country )? $bhr_user->country: "Philippine")->first();
                        if ($utc_check !== null) {
                        $user->country_id  = $utc_check->country_id;
                        }

                    if($bhr_user->dateOfBirth != "0000-00-00" && $bhr_user->dateOfBirth != null){
                        $user->birthdate =$bhr_user->dateOfBirth;
                    }

                    if($bhr_user->terminationDate != "0000-00-00" && $bhr_user->terminationDate != null){
                        $user->termination_date = $bhr_user->terminationDate;
                    }

                    /** Fetch Department if existing. Insert new department if not.*/
                    $department = $this->generate_department( $bhr_user->department );
                    if( is_valid( $department ) ) {
                        $user->department_id = $department->id;
                    }

                    // Save the User and it will generate the User ID
                    $user->save();


                    # 2.
                    //Fetch the Employee Role to attach on the User
                    $employee_role = Role::findByName( get_constant('USER_ROLES.employee') );

                    // Assign the Employee Role
                    $user->assignRole( $employee_role );
                    
                   

                    # 3.
                    // Total Permissions that are not synced yet on the User
                    $permissions_to_sync = [];

                    // Iterate and filter out all the Permissions that are already existing for the User.
                    foreach( $employee_role->permissions()->get() as $permission ){
                        if( ! $user->hasDirectPermission( $permission ) ) {
                            $permissions_to_sync[] = $permission;
                        }
                    }

                    // Assign the Employee's Permissions
                    $user->givePermissionTo( $permissions_to_sync );
                    /** */

                   // filter unneeded permissions
                   $user->revokePermissionTo('user_multi_login');

                    log_to_file( 'info', 'User Inserted', [$user], 'user_sync');
                    log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $user, "user_sync");
                    log_to_file( 'info', get_constant('LOG_GAP'), [], "user_sync");


                } else {

                    log_to_file( 'info', 'User not valid to Sync', [$bhr_user], 'user_sync');
                    log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $bhr_user, "user_sync");
                    log_to_file( 'info', get_constant('LOG_GAP'), [], "user_sync");
                }

            } else {

                log_to_file( 'info', 'User Existing', [$user], 'user_sync');
                log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $user, "user_sync");
                log_to_file( 'info', get_constant('LOG_GAP'), [], "user_sync");
            }

            DB::commit();
            return $user;

        } catch (Exception $e) {

            DB::rollback();
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "user_sync");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "user_sync");

            throw $e;
        }
    }

    /**
     *  Responsible for Updating the BHR Users to EVOX
     * @param object $bhr_user_number
     * @return User $user
     */
    public function update_bhr_user_to_evox(User $user, object $bhr_user, object  $utc){

        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "user_sync");

        DB::beginTransaction();
        try {

            // If BHr User has E-mail and valid Employment history status, insert the user
            if( is_valid( $bhr_user->bestEmail ) /*&& is_valid( $bhr_user->employmentHistoryStatus ) */ ) {

                if(strlen($bhr_user->employeeNumber)==2){
                    $bhr_user->employeeNumber = "0" . $bhr_user->employeeNumber;
                }

                $user->emp_num = $bhr_user->employeeNumber;
                $user->bhr_num = $bhr_user->id;
                $user->email = $bhr_user->bestEmail;
                $user->first_name = $bhr_user->firstName;
                $user->middle_name = $bhr_user->middleName;
                $user->last_name = $bhr_user->lastName;
                $user->employment_status = $bhr_user->employmentHistoryStatus;
                $user->nickname = $bhr_user->nickname;
                $user->date_hired = $bhr_user->hireDate;
                $user->is_active = ( $bhr_user->terminationDate == "0000-00-00" && $bhr_user->employmentHistoryStatus != get_constant('BHR_USER_EMPLOYMENT_STATUS.terminated') ) ? true : false;
                $user->job_title = $bhr_user->jobTitle;
                $user->mobile_number = $bhr_user->mobilePhone;

                // check country of BHR user exist in UTC_TimeLogs
                $utc_check = $utc->where('country_name', '=', is_valid( $bhr_user->country )? $bhr_user->country: "Philippine")->first();
                if ($utc_check !== null) {
                 $user->country_id  = $utc_check->country_id;
                }
                else{
                    //Stays at 2 for PH as default
                }


                if($bhr_user->dateOfBirth!="0000-00-00"&&$bhr_user->dateOfBirth!=null){
                    $user->birthdate =$bhr_user->dateOfBirth;
                }

                if($bhr_user->terminationDate!="0000-00-00"&&$bhr_user->terminationDate!=null){
                    $user->termination_date = $bhr_user->terminationDate;
                }
                /** Fetch Department if existing. Insert new department if not.*/
                $department = $this->generate_department( $bhr_user->department );
                if( is_valid( $department ) ) {
                    $user->department_id = $department->id;
                    $admin_collection = Role::findByName( 'admin' )->users()->get()->pluck('id')->toArray();
                    $dep_array = $department->department_supervisors()->get()->pluck('id')->toArray();
                    $department->department_supervisors()->syncWithoutDetaching(  array_merge($dep_array,  $admin_collection));

                }


                // Update the User 
                $user->update();

                log_to_file( 'info', 'User Updated', [$user], 'user_sync');
                log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $user, "user_sync");
                log_to_file( 'info', get_constant('LOG_GAP'), [], "user_sync");

            } else {

                log_to_file( 'info', 'User not valid to Sync', [$bhr_user], 'user_sync');
                log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $bhr_user, "user_sync");
                log_to_file( 'info', get_constant('LOG_GAP'), [], "user_sync");
            }

            DB::commit();
            return $user;

        } catch (Exception $e) {

            DB::rollback();
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "user_sync");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "user_sync");

            throw $e;
        }
    }

       /**
     *  Responsible for Updating the BHR Users to EVOX
     * @param object $bhr_user_number
     * @return User $user
     */
    public function update_bhr_user_country_to_evox(User $user, object $bhr_user, object  $utc){

        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "user_sync");
        error_log("sync_bhr_user_country");
        DB::beginTransaction();
        try {

            // If BHr User has E-mail and valid Employment history status, insert the user
            if( is_valid( $bhr_user->bestEmail ) /*&& is_valid( $bhr_user->employmentHistoryStatus ) */ ) {

                $bhr_country = $bhr_user->country;
                
                

                $utc_check = $utc->where('country_name', '=', is_valid( $bhr_user->country )? $bhr_user->country: "Philippine")->first();
                if ($utc_check !== null) {
                    $user->country_id  = $utc_check->country_id;
                }
                else{
                    //Stays at 2 for PH as default
                }



                // Update the User 
                $user->update();

                log_to_file( 'info', 'User Updated', [$user], 'user_country_sync');
                log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $user, "user_country_sync");
                log_to_file( 'info', get_constant('LOG_GAP'), [], "user_country_sync");

            } else {

                log_to_file( 'info', 'User not valid to Sync', [$bhr_user], 'user_country_sync');
                log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $bhr_user, "user_country_sync");
                log_to_file( 'info', get_constant('LOG_GAP'), [], "user_country_sync");
            }

            DB::commit();
            return $user;

        } catch (Exception $e) {

            DB::rollback();
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "user_country_sync");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "user_country_sync");

            throw $e;
        }
    }


    /**
     *  Responsible for applying the User X Supervisor Pivot Table for the Relationship.
     * @param array $user_supervisor_pivot_array
     * @return array $result
     */
    public function apply_user_supervisor_pivot( $user_supervisor_pivot_array ){

        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "user_sync");

        DB::beginTransaction();
        try {
            $result = [];

            // Apply the Pivot for Supervisor BHR Number x User ID Relationship
            foreach( $user_supervisor_pivot_array as $supervisor_bhr_number => $user_id_array ) {

                // Fetch the Supervisor via Supervisor's BHR Number
                $supervisor = User::where('bhr_num', $supervisor_bhr_number)->first();

                if( is_valid( $supervisor ) ) {

                    log_to_file( 'info', 'Superisee Inserted', ['supervisor'=> $supervisor->id, 'user_id' => $user_id_array], 'user_sync');

                    $supervisor->supervisee()->syncWithoutDetaching( $user_id_array );

                    /**  Fetch the Supervisor Role to attach on the Supervisor  */
                        // $supervisor_role = Role::findByName( get_constant('USER_ROLES.supervisor') );

                        // Check if the Supervisor has already a Role
                        // if( ! $supervisor->isLevel("Supervisor") ){

                            // // Assign the Supervisor Role
                            // $supervisor->assignRole( $supervisor_role );

                            // // Total Permissions that are not synced yet on the Supervisor
                            // $permissions_to_sync = [];

                            // // Iterate and filter out all the Permissions that are already existing for the Supervisor.
                            // foreach( $supervisor_role->permissions()->get() as $permission ){
                            //     if( ! $supervisor->hasDirectPermission( $permission ) ) {
                            //         $permissions_to_sync[] = $permission;
                            //     }
                            // }

                            // // Assign the Supervisor's Permissions
                            // $supervisor->givePermissionTo( $permissions_to_sync );
                        // }
                    /** */

                    $result[ $supervisor->id ] = $user_id_array;

                } else {
                    log_to_file( 'info', 'Superisee NOT Inserted', ['supervisor_bhr_number'=> $supervisor_bhr_number, 'user_id' => $user_id_array], 'user_sync');
                }
            }

            DB::commit();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $result, "user_sync");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "user_sync");

            return $result;

        } catch (Exception $e) {

            DB::rollback();
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "user_sync");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "user_sync");

            throw $e;
        }
    }

    /**
     *  Responsible for Storing the User.
     * @param array (Post Variables) $data
     * @return User $user
     */
    public function store(array $data){
        DB::beginTransaction();
        try {

            // Write Code
            DB::commit();
            log_to_file('info', 'Success', [ /**  Variable */]);
            return null;  /**  Variable */;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for Updating the User by the User ID
     * @param array (Post Variables) $data
     * @param $id
     * @return User $user
     */
    public function update(array $data, $id){
        DB::beginTransaction();
        try {

            // Write Code
            DB::commit();
            log_to_file('info', 'Success', [ /**  Variable */]);
            return null;  /**  Variable */;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for Soft-Deleting the User by the User ID
     * @param $id
     * @return bool
     */
    public function destroy($id){
        DB::beginTransaction();
        try {

            // Write Code
            DB::commit();
            log_to_file('info', 'Success', [ /**  Variable */]);
            return null;  /**  Variable */;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

      /**
     *  Responsible for Soft-Deleting the User by the User ID
     * @param $id
     * @return bool
     */
    public function destroy_department_users($id){
        DB::beginTransaction();
        try {

            $user_list = User::where("department_id", $id);
            $user_list->delete();
            DB::commit();
            log_to_file('info', 'Success', [ /**  Variable */]);
            return null;  /**  Variable */;

        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for fetching the User with the User ID given.
     * @param $id
     * @return User $user
     */
    public function show( $id ){
        try {
            $user = null;

            if( get_authenticated_user( $id )  ) {
                $user = User::findOrFail( $id );
            }
            log_to_file('info', 'Success', [$user]);
            return $user;
        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }



    /**
     *  Responsible for fetching the User via Bhr User Number
     * @param $id
     * @return User $user
     */
    public function show_via_bhr_number( $bhr_user_number ){
        try {
            $user = User::where('bhr_num', '=', $bhr_user_number )->first();

            if( is_valid( $user ) ) {
                log_to_file('info', 'Success', [$user]);
                return $user;
            } else {
                log_to_file('info', 'Fail', [$bhr_user_number]);
                return null;
            }

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for fetching all the Supervisee of the User
     * @param $id
     * @return User $user_collection
     */
    public function get_my_team_list( $id ){
        try {
            $user_collection = [];
            if( get_authenticated_user( $id )  ) {

                $user_collection = User::findOrFail( $id )->users_handled();

                if( is_valid( request()->get('team_id') ) ) {
                    $user_collection->join('team_users', 'team_users.user_id', '=', 'users.id')->where('team_id', '=', request()->get('team_id'));
                }else{
                    if( is_valid( request()->get('department_id') ) ) {
                        $user_collection->where('department_id', '=', request()->get('department_id'));
                    }
                }

                if( is_valid( request()->get('name') ) ) {
                    $user_collection->whereRaw("(first_name LIKE '%".request()->get('name')."%' OR last_name LIKE '%".request()->get('name')."%')");
                }

                if( is_valid( request()->get('job_title') ) ) {
                    $user_collection->where('job_title', 'like', '%' .request()->get('job_title'). '%');
                }

                if( is_valid( request()->get('status') ) ) {
                    $user_collection->where('is_active', '=', request()->get('status') );
                }


                if( is_valid( request()->get('order_by') ) ) {
                    $order = explode(":", request()->get('order_by'));

                    switch ($order[0]) {
                        case "name":
                            $user_collection->orderBy('first_name',  $order[1])
                                ->orderBy('last_name',  $order[1]);
                            break;
                        case "job_title":
                            $user_collection->orderBy('job_title',  $order[1]);
                            break;
                        default:
                            $user_collection->orderBy('first_name',  $order[1])
                                ->orderBy('last_name',  $order[1]);
                      }
                }else{
                    $user_collection->orderBy('emp_num',  'asc');
                }


                if( request()->get('page') == 'all' ){

                    $user_collection->get();

                } else {
                    $user_collection = $user_collection->orderBy('first_name', 'asc')
                                                        ->orderBy('last_name', 'asc')
                                                        ->paginate(15);
                }
            }
            log_to_file('info', 'Success', [$user_collection]);
            return $user_collection;
        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

      /**
     *  Responsible for fetching all the Supervisee of the User
     * @param $id
     * @return User $user_collection
     */
    public function new_get_my_team_list( $id ){
        try {

            $collection = [];
            if( get_authenticated_user( $id )  ) {
                
                $user = Auth::user();
                $original_perpage_count =   15;
                $perpage_count =    !is_valid( request()->get('order_by') ) ? 15 : 99999;
                $response = call_sp("EH_SP_Employee_List",
                
                [
                    $user->id, // vishnu user_id
                    is_valid(  $user->LevelId ) ?  $user->LevelId: null, // level
                    is_valid( request()->get('department_id') ) ? request()->get('department_id'): null,
                    (is_valid( request()->get('sub_department_id') ) 
                        && is_valid( request()->get('department_id') ))
                            ? request()->get('sub_department_id'): null,
                        is_valid( request()->get('status') ) ? (int)request()->get('status'): 1, // active
                    is_valid( request()->get('name') ) ? request()->get('name'): null, // name
                    is_valid( request()->get('job_title') ) ? request()->get('job_title'): null, // job_title
                    !is_valid( request()->get('order_by') ) ?
                                (is_valid( request()->get('page') ) ? request()->get('page'): 1)
                                :
                                1,
                     $perpage_count,
                    1 
                    
                    ]


                ); 
                // dd(request()->all(), is_valid( request()->get('order_by') ), $response);

                // dd($response);
                
                    $result = array(
                        "query" =>  $response ?? [],
                    );
                    

                    $perPageArrays = array_filter($result['query'], function($array) {

                        if(isset($array[0])){
                    
                            return property_exists($array[0], 'PerPage');
                    
                        }

                       
                    
                    });

                    $empArrays = array_filter($result['query'], function($array) {

                       

                        if(isset($array[0])){
                    
                            return property_exists($array[0], 'Employee_Name');
                    
                        }
                    
                    });

            
                    
                    $perPageKeys = array_keys($perPageArrays);
                    $empKeys = array_keys($empArrays);
                        // dd($result['query'][count($result['query'])-3]);
                
                    $arr = [];
                    if( is_valid( request()->get('order_by') ) && is_valid($empKeys) && is_valid($result['query'][$empKeys[0]])  ) {
                        $arr =  $result['query'][count($result['query'])-3];
                        $order = explode(":", request()->get('order_by'));
    // dd($order[0]);
                        switch ($order[0]) {
                            case "name":
                                if( $order[1] ==  "asc"){
                                    usort( $arr,function($first,$second){
                                        return $first->Employee_Name > $second->Employee_Name;
                                    });
                                }
                                if( $order[1] ==  "desc"){
                                    usort( $arr,function($first,$second){
                                        return $first->Employee_Name < $second->Employee_Name;
                                    });
                                }
                                break;
                            case "job_title":
                                if( $order[1] ==  "asc"){
                                    usort( $arr,function($first,$second){
                                        return $first->job_title > $second->job_title;
                                    });
                                }
                                if( $order[1] ==  "desc"){
                                    usort( $arr,function($first,$second){
                                        return $first->job_title < $second->job_title;
                                    });
                                }
                          }
                        //   dd($arr, $result['query'][count($result['query'])-3]);
                          $arr =   array_chunk($arr, 15)
                                [is_valid( request()->get('page') ) ? ((int)request()->get('page')) - 1: 0];
           
                    }

            
                 
                  
                   
                    

                // dd($result['query'],   $perPageKeys[0], $empKeys) ;

                  
                if( count($result['query']) > 2){
                    // $paginate = $result['query'][count($result['query'])-2][0];
                    
                    // $collection["data"] = !is_valid($arr)? $result['query'][count($result['query'])-3] : $arr;
// dd($result['query'], $empKeys, isset($empKeys), is_valid($empKeys));
                    // dd($result['query'],$result['query'][$empKeys[0]]);

                    $paginate = $result['query'][$perPageKeys[0]][0];
                    $collection["data"] = !is_valid($arr)? (is_valid($empKeys) ?$result['query'][$empKeys[0]] : []) : $arr; 
                    $collection["pagination"] = [
                                                    'total' => (int) $paginate->TotalCount,
                                                    'count' => count( $collection["data"]),
                                                    'per_page' =>  (int)  $original_perpage_count,
                                                    'current_page' => !is_valid($arr)?((int) $paginate->CurrentPage) : (is_valid( request()->get('page') ) ? ((int)request()->get('page')): 1),
                                                    'last_page' => ((ceil($paginate->TotalCount /   $original_perpage_count)) ) 
                                                ];

                                                // if( ($paginate->TotalCount % $perpage_count) > 0 
                                                // && fmod($paginate->TotalCount /  $perpage_count, 1) !== 0.00){
                                                //     $collection["pagination"][ 'last_page' ] = $collection["pagination"][ 'last_page' ] + 1;
                                                // }
                }
     
            }
           
           
            log_to_file('info', 'Success', [$collection]);
            return $collection;
        } catch (Exception $e) {
            log_error($e);
            // dd($e);
            throw $e;
        }
    }



    /**
     *  Responsible for fetching all the Active and Non Client Users
     * @param $id
     * @return User $user
     */
    public function get_all_active_users(){
        try {
            $users = User::where('is_active', 1)
                         ->whereHas('roles', function( $query ) {
                             $query->whereNotIn('name', [ get_constant('USER_ROLES.client')]);
                         })
                         ->get();
            return $users;
        } catch (Exception $e) {
            throw $e;
        }
    }

    public function get_all_supervisors(){
        try {
            $users = User::where('is_active', 1)
                            ->whereHas('roles', function( $query ) {
                                $query->whereIn('name', [ get_constant('USER_ROLES.supervisor')])->whereNotIn('name', [ get_constant('USER_ROLES.client')]);
                            })
                        ->get();
     
            return $users;

        } catch (Exception $e) {
            throw $e;
        }
    }


    /**
     *  Responsible for fetching all the Active Users under supervisee
     * @param Request $request
     * @return User $user_collection ( Collection )
     */
    public function get_users_under_supervisee( Request $request , $start_date, $end_date , $hired_strict = false, $country_strict = false){
        try {
            
            $user_collection =  auth()->user()->users_handled();
            
            $user_collection->join('departments', 'users.department_id', '=', 'departments.id')->select('users.*', 'departments.department_name');

            if( $hired_strict){
                $user_collection->where('date_hired', '<=',  Carbon::parse($end_date)->format("Y-m-d"));
            }

            if( is_valid( $request->selectedDepartments ) ){
                $dep_ids = $request->selectedDepartments;
                if(gettype($dep_ids) === "string"){
                    $dep_ids = preg_split("/\,/", $dep_ids );
                }
                $user_collection->whereIn('users.department_id',array_unique($dep_ids) );
            }   

            if( is_valid( $request->department_id ) && !is_valid( $request->selectedDepartments ) ){
                $user_collection->where('department_id',$request->department_id );
            } else {
                $user_collection->whereRaw('department_id IS NOT NULL');
            }

            if( is_valid( $request->team_id ) ){
                $user_collection->whereIn('users.id', Team::find( $request->team_id )->team_users()->pluck('id') );
            }

            if( is_valid( $request->selectedTeams ) ){
                $team_ids = $request->selectedTeams;
                if(gettype($team_ids) === "string"){
                    $team_ids = preg_split("/\,/", $team_ids );
                }

                $team_list = [];
                foreach($team_ids as $team_id){

                    $team_users_id =  Team::find( $team_id )->team_users()->pluck('id')->toArray();
                    foreach( $team_users_id as $id){
                        $team_list[] = $id;
                    }
                }
                $user_collection->whereIn('users.id',array_unique($team_list) );
            }

            if ( $country_strict ) {
                $country_id = auth()->user()->country_id;
                $user_collection->where('country_id', $country_id);
            }

  
            if( is_valid( $request->name ) ){
                $user_collection->whereRaw('(first_name like ? OR middle_name like ? OR last_name like ?)', array('%'.trim( $request->name ).'%', '%'.trim( $request->name ).'%', '%'.trim( $request->name ).'%' ));
            }

            $user_collection->whereRaw('(is_active = ' . (is_valid($request->is_active) ? $request->is_active : '1') .' or termination_date BETWEEN "'. $start_date .'" AND "'. $end_date .'")');

           


            //paginate user collection to prevent request timeout

            //return $user_collection->where('is_active', is_valid($request->is_active) ? $request->is_active : 1)->orderBy('departments.department_name')->orderby('date_hired', 'DESC')->orderBy('last_name', 'asc')->orderBy('first_name', 'asc')->get();
            if (is_valid($request->page)) {
                return $user_collection/*->where('is_active', is_valid($request->is_active) ? $request->is_active : 1)*/->orderBy('departments.department_name')->orderby('date_hired', 'DESC')->orderBy('last_name', 'asc')->orderBy('first_name', 'asc')->paginate(100);
            } else {
                return $user_collection/*->where('is_active', is_valid($request->is_active) ? $request->is_active : 1)*/->orderBy('departments.department_name')->orderby('date_hired', 'DESC')->orderBy('last_name', 'asc')->orderBy('first_name', 'asc')->get();
            }
        } catch (Exception $e) {
            throw $e;
        }
    }
    
    
     /**
     *  Responsible for fetching all the Active Users under supervisee with inactive status
     * @param Request $request
     * @return User $user_collection ( Collection )
     */
    public function get_users_under_supervisee_with_inactive( Request $request , $start_date, $end_date ){
        try {
            $user_collection =  auth()->user()->users_handled(); 

            if( is_valid( $request->department_id ) ){
                $user_collection->where('department_id',$request->department_id );
            } else {
                $user_collection->whereRaw('department_id IS NOT NULL');
            }
            
            if( is_valid( $request->name ) ){
                $user_collection->whereRaw('(first_name like ? OR middle_name like ? OR last_name like ?)', array('%'.trim( $request->name ).'%', '%'.trim( $request->name ).'%', '%'.trim( $request->name ).'%' ));
            }
            
            // $user_collection->whereRaw('(is_active = 1 or termination_date BETWEEN "'. $start_date .'" AND "'. $end_date .'")');
            
            if( is_valid( $request->team_id ) ){
                $user_collection->whereIn('id', Team::find( $request->team_id )->team_users()->pluck('id'));
            }

            return $user_collection->orderBy('last_name', 'asc')->orderBy('first_name', 'asc')->get();
        } catch (Exception $e) {
            throw $e;
        }
    }

    public function get_users_under_supervisee_active_with_no_schedule(User $user){
        try {

           
            $user_collection =  $user->users_handled()
                                
                                ->where('is_active', 1)
                                ->whereHas('roles', function( $query ) {
                                    $query->whereNotIn('name', [ get_constant('USER_ROLES.client')]);
                                })
                                ->doesntHave("defaultSchedule")
                                ->join('departments', 'departments.id', '=', 'users.department_id')
                                ->select('users.id','emp_num','first_name','last_name', 'email','departments.department_name')
                                ->orderBy('departments.department_name', 'asc')
                                ->get(); 
           
            

             return $user_collection;
        } catch (Exception $e) {
            throw $e;
        }
    }


    
    /**
     *  Responsible for fetching all the DPA Userl ist
     * @param Request $request
     * @return User $user_collection ( Collection )
     */
    public function get_dpa_list( Request $request ){
        try {

           
            $perpage_count = 10;
            if( $request->export == "all"){
                $perpage_count = 99999;
            }
            // dd( $request ->all());
            $user = Auth::user();

            $response = call_sp("EH_SP_Employee_DPA_List",
              
            [
                $user->id, // vishnu user_id
                is_valid(  $user->LevelId ) ?  $user->LevelId: null, // level
                is_valid( request()->get('department_id') ) ? request()->get('department_id'): null,
                is_valid( request()->get('is_active') ) ? request()->get('is_active'): null, // active
                is_valid( request()->get('name') ) ? request()->get('name'): null, // name
                is_valid( request()->get('submitted_dpa') ) ? request()->get('submitted_dpa'): null, // submitted_dpa
                is_valid( request()->get('page') ) ? request()->get('page'): 1,
                 $perpage_count,
                null
                
                ]


            ); 
            // dd()
                $result = array(
                    "query" =>  $response ?? [],
                );

                // dd($result['query'][0]);
            if( count($result['query']) > 2){
                // $paginate = $result['query'][count($result['query'])-2][0];
                
                // $collection["data"] = $result['query'][count($result['query'])-2];

                // $collection["data"]  = $collection["data"] ? array_map(function($item) {

                $paginate = $result['query'][2][0];

                $collection["data"] = $result['query'][1];

                $collection["data"]  = $collection["data"] ? array_map(function($item) {
                    
                    return (object) array(
                        'id' => isset($item->id) ? $item->id : $item->UserId,
                        'emp_num' => $item->Employee_Number,
                        'department' => ( is_valid(  $item->Name ) ?  $item->Name : null ),
                        'is_active' => (int)$item->is_active,
                        'full_name' => $item->Employee_Name,
                        'dpa_ticked_at' =>  $item->Status
                    );
                }, $collection["data"]): [];
                $collection["pagination"] = [
                                                'total' => (int) $paginate->TotalCount,
                                                'count' => count( $collection["data"]),
                                                'per_page' =>  (int) $paginate->PerPage,
                                                'current_page' => (int) $paginate->CurrentPage,
                                                'last_page' => ((ceil($paginate->TotalCount /  $perpage_count)) ) 
                                            ];

            }
 
        
        // dd($collection);
            return  $collection;

        } catch (Exception $e) {
            // dump ($e);
            throw $e;
        }
    }



    /**
     *  Responsible for applying the temporary password generated to the User base from the email.
     * @param $email
     * @param $temporary_password
     * @return User $user
     */
    public function apply_temporary_password( $email, $temporary_password ){

        try {
            $user =  User::where( 'email', $email )->first();
            $user->password = Hash::make( $temporary_password );
            $user->force_change_password = true;
            $user->save();

            log_to_file('info', 'Success', $user->id, 'user');
            return $user;

        } catch (Exception $e) {
            throw $e;
        }

    }

    /**
     *  Responsible for changing the password of the User
     * @param $id
     * @param array $data
     * @return User $user
     */
    public function change_password( $id, $data ){

        try {
            $user =  User::findOrFail( $id );

            if( get_authenticated_user( $user->id ) ) {

                $credentials = [
                    'username' => $user->username,
                    'password'  => $data['current_password']
                ];

                if( auth()->attempt( $credentials ) ){

                    $user->password = Hash::make( $data['new_password'] );

                    // If there's a data reset_password, set the force_change_password to false since the password is already reset.
                    if( isset( $data['reset_password'] ) && $data['reset_password'] ) {
                        $user->force_change_password = false;
                    }

                    $user->save();

                    log_to_file('info', 'Success', $user->id, 'user');
                    return $user;

                } else {

                    return false;
                }

            }

        } catch (Exception $e) {
            throw $e;
        }

    }

        /**
     *  Responsible for changing the password of the User
     * @param $id
     * @param array $data
     * @return User $user
     */
    public function get_user_department( $id ){

        try {
            $user =  User::findOrFail( $id );

            if( get_authenticated_user( $user->id ) ) {


                // $user_count = DB::table('users')
                // ->join('department_without_schedule_employees','users.department_id','=','department_without_schedule_employees.department_id')
                // ->where('users.id','=', $user->id)
                // ->where('department_without_schedule_employees.is_active','=',1)
                // ->count();

                $user_count = DB::table('user_has_permissions')
                ->join('permissions','user_has_permissions.permission_id','=','permissions.id')
                ->where('users.id','=', $user->id)
                ->where('permissions.name','=','user_multi_login');

                if($user_count == 0){
                    return false;
                }else{
                    return true;
                }           

            }

        } catch (Exception $e) {
            throw $e;
        }

    }

    

    /**
     *  Responsible for ticking the DPA field of the User
     * @param $id
     * @return User $user
     */
    public function tick_dpa( $id ){

        try {
            $user =  User::findOrFail( $id );

            # allow the tick only if the User in the ID is the user currently logged in
            if( auth()->user()->id == $user->id ) {

                $user->dpa_ticked_at = Carbon::now()->format('Y-m-d H:i:s');
                $user->save();

                log_to_file('info', 'Successfully ticked DPA of User', $user->id, 'user');
                return $user;

            }

        } catch (Exception $e) {
            throw $e;
        }

    }

    /**
     *  Responsible for assigning Roles for the user.
     * @param $id
     * @return User $user
     */
    public function assign_roles_to_user( $id , array $roles_array){
        try {

            if( is_under_supervisee( $id ) ) {

                $user =  User::findOrFail( $id );

                if(in_array('admin', $roles_array)){
                    if(!in_array('supervisor', $roles_array)){
                     array_push($roles_array,"supervisor");
                    }
                 }

                $user->syncRoles( $roles_array );
            }

            log_to_file('info', 'Success', [$id, $roles_array], 'assign');
            return $user;
        } catch (Exception $e) {
            throw $e;
        }
    }




    /**
     *  Responsible for assigning Permissions for the user.
     * @param $id
     * @return User $user
     */
    public function assign_permissions_to_user( $id, array $permissions_array , array $roles_array ){
        try {

            if( is_under_supervisee( $id ) ) {

                $user =  User::findOrFail( $id );

                $permissions_list_supervisor = Role::findByName('supervisor')->permissions->pluck('name')->toArray();

                if(in_array('admin', $roles_array)){
                        $permissions_array = array_merge($permissions_array,$permissions_list_supervisor);
                        $permissions_array = array_unique($permissions_array);
                 }

                if(in_array('admin', $roles_array)){
                    if(!in_array('supervisor', $roles_array)){
                        $permissions_array = array_merge($permissions_array,$permissions_list_supervisor);
                        $permissions_array = array_unique($permissions_array);
                    }
                 }


                $user->syncPermissions( $permissions_array );
            }

            log_to_file('info', 'Success', [$id, $permissions_array], 'assign');
            return $user;
        } catch (Exception $e) {
            throw $e;
        }
    }
        /**
     *  Responsible for assigning Features for the user.
     * @param $id
     * @return User $user
     */
    public function assign_level_features( $id, array $features_array , $level ){
        try {

           

                $user =  User::findOrFail( $id );

                $user_owned_features = $user->userFeatures();

                
                $added = array_diff($features_array,$user_owned_features);
                $removed =  array_diff($user_owned_features,$features_array);

                $data = [];
                $removed_data = [];
            // dd($user_owned_features,  $added, $removed);
              

                if(is_valid($removed)){
                    $bulk_of_feature_list = Features::whereIn('feature_name', $removed )->get()->pluck("id")->toArray();
                    
                    foreach($bulk_of_feature_list as $feature_id){
                        $removed_data[$feature_id]= ["has_access"=> false];
                    }
                    $user->features()->syncWithoutDetaching( $removed_data);
                }


                if(is_valid($added)){
                    $bulk_of_feature_list = Features::whereIn('feature_name', $added)->get()->pluck("id")->toArray();
                    // dd($added,Features::whereIn('feature_name', $added)->get(),$bulk_of_feature_list);
                    foreach($bulk_of_feature_list as $feature_id){
                        $data[$feature_id]= ["has_access"=> true];
                    }
                    UserFeatures::where('user_id', $user->id)->update(["has_access"=> false]);
                    $user->features()->syncWithoutDetaching( $data);
                }
                


                // $user->syncPermissions( $features_array );
            

            // log_to_file('info', 'Success', [$id, $features_array], 'assign');
            return $user;
        } catch (Exception $e) {
            throw $e;
        }
    }




    /**
     *  Responsible for assigning Employees to a user.
     * @param $id
     * @return User $user
     */
    public function assign_employees_to_user( $id, array $post_data ){
        try {

            $user =  User::findOrFail( $id );

            // If there is a Department in the post data, Sync the Users by detaching the exisitng department user first then sync the updated list.
            if( is_valid( $post_data['department_id'] ) ){

                // Desync the Users of the chosen Department
                $user->supervisee()->detach( Department::find( $post_data['department_id'] )->users()->get() );

                // Sync the new Users from the chosen Department and merge with the existing supervisees.
                if( is_valid( $post_data['user_id'] ) ) {
                    $user->supervisee()->syncWithoutDetaching( $post_data['user_id'] );
                }

            } else {

                $user->supervisee()->syncWithoutDetaching( $post_data['user_id'] );
            }


            log_to_file('info', 'Success', [$id, $post_data], 'assign');
            return $user;
        } catch (Exception $e) {
            throw $e;
        }
    }





    /**
     *  Responsible for fetching the specific User list of a Role
     * @param string $role
     * @return Collection $user_collection
     */
    public function list_via_role( $role ){
        try {

            if( request()->get('page') == 'all' ){
                $user_collection = Role::findByName( $role )->users()->where('is_active', 1)
                                                                     ->orderBy('first_name', 'asc')
                                                                     ->orderBy('last_name', 'asc')
                                                                     ->get();
            } else {
                $user_collection = Role::findByName( $role )->users()->where('is_active', 1)
                                                                     ->orderBy('first_name', 'asc')
                                                                     ->orderBy('last_name', 'asc')
                                                                     ->paginate(15);
            }

            return $user_collection;
        } catch (Exception $e) {
            throw $e;
        }
    }




    /**
     *  Responsible for fetching the specific User list of a Department
     * @param string $role
     * @return Collection $user_collection
     */
    public function list_via_department( $department_id ){
        try {

            if( request()->get('page') == 'all' ){
                $user_collection = Department::find( $department_id )->users()->where('is_active', 1)
                                                                              ->orderBy('first_name', 'asc')
                                                                              ->orderBy('last_name', 'asc')
                                                                              ->get();

            } else {
                $user_collection = Department::find( $department_id )->users()->where('is_active', 1)
                                                                              ->orderBy('first_name', 'asc')
                                                                              ->orderBy('last_name', 'asc')
                                                                              ->paginate(15);
            }

            return $user_collection;
        } catch (Exception $e) {
            throw $e;
        }
    }




    /**
     *  Responsible for fetching the specific User list of a Team
     * @param string $team_id
     * @return Collection $user_collection
     */
    public function list_via_team( $team_id ){
        try {

            if( request()->get('page') == 'all' ){
                $user_collection = Team::find( $team_id )->team_users()
                                                         ->orderBy('first_name', 'asc')
                                                         ->orderBy('last_name', 'asc')
                                                         ->get();

            } else {
                $user_collection = Team::find( $team_id )->team_users()
                                                         ->orderBy('first_name', 'asc')
                                                         ->orderBy('last_name', 'asc')
                                                         ->paginate(15);
            }

            return $user_collection;
        } catch (Exception $e) {
            throw $e;
        }
    }


    /**
     *  Responsible for assigned special conditions if user was assigned as admin
     * @param $id
     * @param array $request
     */
    public function adminRoleConditions($user_id, array $request){
        try {
            
            $user =  User::findOrFail( $user_id );

            // check if there is a role called admin 1st
            foreach($request as $key => $role){
                if($role == 'admin'){
                    $department_col = Department::all()->pluck('id')->toArray();


                    // User became a supervisor for each department
                    foreach($department_col as $department_id){
                        $department = Department::find($department_id);
                        $dep_array = $department->department_supervisors()->get()->pluck('id')->toArray();
                        $department->department_supervisors()->sync(  array_merge($dep_array, [$user->id]));


                        $user_array = $department->users()
                        ->orderBy('first_name', 'asc')
                        ->orderBy('last_name', 'asc')
                        ->get()->pluck('id')->toArray();
                        
                        // user become supervisee for each employee
                        if( is_valid( $department->id ) ){

                            if( is_valid(  $user_array) ) {
                            $user->supervisee()->detach( Department::find($department->id)->users()->get() );
                            $user->supervisee()->syncWithoutDetaching(   $user_array);
                            }
                           
                            
                        }
                        else {

                            $user->supervisee()->syncWithoutDetaching( $user_array);
                        }
                    }

                }
            }
        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }
    
    ###############################################################################################
    ##################################### Protected functions #####################################
    ###############################################################################################

    /**
     *  Fetch Department if existing. Insert new department if not.
     * @param $department_name
     * @return Department $department
     */

    private function generate_department( $department_name ){

        try{
            /** Fetch Department if existing */
            if( is_valid( $department_name ) ) {

                $department = Department::where('department_name', $department_name)->first();

                // If the Department is not existing, create it manually.
                if($department == null) {

                    $department = new Department();
                    $department->department_name = $department_name;
                    $department->description = null;
                    $department->created_at = date('Y-m-d H:i:s');
                    $department->updated_at = date('Y-m-d H:i:s');

                    log_to_file( 'info', 'Department Generated', [$department], 'user_sync');
                    $department->save();
                }

                return $department;
            } else {
                return null;
            }
        } catch( Exception $e) {

        }
    }

    public function get_users_under_supervisee_active_with_requests($start_date, $end_date, $supervisor_id = null, $department_id = null){
        try {

            $user_collection = DB::select('CALL SP_Employee_Request_Cutoff(?,?,?,?,?,?)',[
                $start_date,
                $end_date,
                $supervisor_id,
                $department_id,
                null,
                'mail'
            ]);

            return $user_collection;
        } catch (Exception $e) {
            throw $e;
        }
    }

    public function get_users_under_supervisee_active_with_invalid_check_ins($supervisor_id = null, $department_id = null){
        try {

            $user_collection = DB::select('CALL SP_InvalidChekin_Notification(?,?)',[
                $supervisor_id,
                $department_id
            ]);

            return $user_collection;
        } catch (Exception $e) {
            throw $e;
        }
    }

    //....


    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################


    //....



}
