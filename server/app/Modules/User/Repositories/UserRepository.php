<?php 

namespace App\Modules\User\Repositories;

use App\Modules\Department\Models\Department;
use App\Modules\User\Models\User;
use DebugBar\DebugBar;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Spatie\Permission\Models\Role;

class UserRepository implements UserRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    
    /**
     *  Responsible for Inserting the BHR Users to EVOX
     * @param object $bhr_user_number
     * @return User $user
     */
    public function insert_bhr_user_to_evox(object $bhr_user){

        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "user_sync");

        DB::beginTransaction();
        try {  

            $user = User::where('bhr_num', $bhr_user->id)->first();

            // Check first if the User is already existing before creating new User.
            if( $user == null&& is_valid( $bhr_user->workEmail ) ) {

                $user = new User();

                $user->emp_num = $bhr_user->employeeNumber;
                $user->bhr_num = $bhr_user->id;
                $user->email = $bhr_user->workEmail;
                $user->username = generate_username( $bhr_user );
                $user->password = Hash::make( get_constant('DEFAULT_PASSWORD') );
                $user->first_name = $bhr_user->firstName;
                $user->middle_name = $bhr_user->middleName;
                $user->last_name = $bhr_user->lastName;
                $user->employment_status = $bhr_user->employmentHistoryStatus;
                $user->is_active = true;
                
                /** Fetch Department if existing */ 
                    if( is_valid( $bhr_user->department ) ) {
                        
                        $department = Department::where('department_name', $bhr_user->department)->first();
                        
                        // If the Department is not existing, create it manually.
                        if($department == null) {

                            $department = new Department();
                            $department->department_name = $bhr_user->department;
                            $department->description = null;
                            $department->created_at = date('Y-m-d H:i:s');
                            $department->updated_at = date('Y-m-d H:i:s');
                            $department->save();
                        }

                        // Set the Department ID
                        $user->department_id = $department->id;
                    }
                /** */
                

                // Save the User and it will generate the User ID
                $user->save();

                
                /**  Fetch the Employee Role to attach on the User  */
                    $employee_role = Role::findByName( get_constant('USER_ROLES.employee') );

                    // Assign the Employee Role
                    $user->assignRole( $employee_role );

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


                # 2.
                // Assign the User x Supervisor data for iteration afterwards
                $user_supervisor_pivot_array[ $bhr_user->supervisorEId ][] = $user->id;
                
                log_to_file( 'info', 'User Inserted', [$user], 'user_sync');

                DB::commit();
                log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $user, "user_sync");
                log_to_file( 'info', get_constant('LOG_GAP'), [], "user_sync");

                return $user;

            } else {
                
                DB::commit();
                log_to_file( 'info', 'User Existing', [$user], 'user_sync');

                log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $user, "user_sync");
                log_to_file( 'info', get_constant('LOG_GAP'), [], "user_sync");
    
                return $user;
            }

        } catch (Exception $e) {

            DB::rollback();
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "user_sync");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "user_sync");

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
                        $supervisor_role = Role::findByName( get_constant('USER_ROLES.supervisor') );

                        // Check if the Supervisor has already a Role
                        if( ! $supervisor->hasRole($supervisor_role) ){

                            // Assign the Supervisor Role
                            $supervisor->assignRole( $supervisor_role );

                            // Total Permissions that are not synced yet on the Supervisor
                            $permissions_to_sync = [];

                            // Iterate and filter out all the Permissions that are already existing for the Supervisor.
                            foreach( $supervisor_role->permissions()->get() as $permission ){
                                if( ! $supervisor->hasDirectPermission( $permission ) ) {
                                    $permissions_to_sync[] = $permission;
                                }
                            }
                            
                            // Assign the Supervisor's Permissions
                            $supervisor->givePermissionTo( $permissions_to_sync );
                        }
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
     *  Responsible for fetching the User with the User ID given.
     * @param $id
     * @return User $user
     */
    public function show( $id ){
        try {
            $user = User::findOrFail( $id );
            log_to_file('info', 'Success', [$user]);
            return $user;
        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }



    /**
     *  Responsible for fetching all the Active Users
     * @param $id
     * @return User $user
     */
    public function get_all_active_users(){
        try {
            $users = User::where('is_active', 1)->get();
            return $users;
        } catch (Exception $e) {
            throw $e;
        }
    }




    /**
     *  Responsible for assigning Roles for the user.
     * @param $id
     * @return User $user
     */
    public function assign_roles_to_user( $user_id , array $roles_array){
        try {
            
            if( is_under_supervisee( $user_id ) ) {

                $user =  User::findOrFail( $user_id );

                $user->syncRoles( $roles_array );
            }

            log_to_file('info', 'Success', [$user_id, $roles_array], 'assign');
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
    public function assign_permissions_to_user( $user_id, array $permissions_array ){
        try {

            if( is_under_supervisee( $user_id ) ) {

                $user =  User::findOrFail( $user_id );

                $user->syncPermissions( $permissions_array );
            }
            
            log_to_file('info', 'Success', [$user_id, $permissions_array], 'assign');
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
    public function assign_employees_to_user( $user_id, array $post_data ){
        try {

            $user =  User::findOrFail( $user_id );

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
            
            
            log_to_file('info', 'Success', [$user_id, $post_data], 'assign');
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
            $user_collection = Role::findByName( $role )->users()
                                                        ->orderBy('first_name', 'asc')
                                                        ->orderBy('last_name', 'asc')
                                                        ->get();
        
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
            $user_collection = Department::find( $department_id )->users()
                                                                 ->orderBy('first_name', 'asc')
                                                                 ->orderBy('last_name', 'asc')
                                                                 ->get();
        
            return $user_collection;
        } catch (Exception $e) {
            throw $e;
        }
    }
    ###############################################################################################
    ##################################### Protected functions #####################################
    ###############################################################################################


    //....


    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################


    //....



}