<?php 

namespace App\Modules\User\Repositories;

use App\Modules\User\Models\User;
use DebugBar\DebugBar;
use Exception;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UserRepository implements UserRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

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
    public function getAllActiveUsers(){
        try {
            $users = User::where('is_active', 1)->get();
            return $users;
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