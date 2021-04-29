<?php 

namespace App\Modules\User\Repositories;

use App\Modules\Department\Models\Department;
use App\Modules\Team\Models\Team;
use App\Modules\User\Models\User;
use Carbon\Carbon;
use DebugBar\DebugBar;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Spatie\Permission\Models\Role;
use Illuminate\Http\Request;

class ProfileRepository implements ProfileRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    /**
     *  Responsible for Storing User Profile
     * @param User $user
     * @param Request $request
     * @return User $user
     */
    public function store( User $user, Request $request ){

        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "user_sync");

        DB::beginTransaction();
        try {  
            /**
             *  1. Store the User Profile
             */

            //** Once the profile module is published, update this code*/
         
            
            log_to_file( 'info', 'User Profile successfully updated', [$user], 'user_profile');
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $user, "user_profile");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "user_profile");

            DB::commit();
            return $user;

        } catch (Exception $e) {

            DB::rollback();
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "user_profile");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "user_profile");

            throw $e;
        }
    }


    /**
     *  Responsible for Update User Profile
     * @param User $user
     * @param Request $request
     * @return User $user
     */
    public function update( User $user, Request $request ){

        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "user_profile");

        DB::beginTransaction();
        try {  
            /**
             *  1. Update the User
             */

            //** This is the initial code to update the old table of user. Once the profile module is done, change this */
            $user->first_name = $request->first_name;
            $user->last_name = $request->last_name;
            $user->email = $request->email;
            $user->mobile_number = $request->mobile_number;

            // Update the User
            $user->update();

            
            log_to_file( 'info', 'User Profile successfully updated', [$user], 'user_profile');
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $user, "user_profile");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "user_profile");

            DB::commit();
            return $user;

        } catch (Exception $e) {

            DB::rollback();
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "user_profile");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "user_profile");

            throw $e;
        }
    }


    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################


    //....



}