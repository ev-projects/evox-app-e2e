<?php 

namespace App\Modules\Client\Repositories;

use App\Modules\Client\Models\Client;
use Exception;


use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ClientRepository implements ClientRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    public function __construct(){

    }
    /**
     *  Responsible for fetching all the Departments
     * 
     * @return Collection $department_collection
     */
    public function all()
    {
        // try {
        //     $department_collection = Department::orderBy('department_name', 'asc')->get();
        //     log_to_file('info', 'Success', [$department_collection]);
        //     return $department_collection;

        // } catch (Exception $e) {
        //     log_error($e);
        //     throw $e;
        // }
    }

    
    /**
     *  Responsible for fetching the Department with the ID given.
     * @param $id
     * @return Department $department
     */
    public function find($client_id,$department_id)
    {
        try {
            $client = Client::where([
                ['department_id',  $department_id ],
                ['client_id', $client_id]
            ])->pluck('user_id');
            log_to_file('info', 'Success', [$client]);
            return $client;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    
    /**
     *  Responsible for assigning the Department Handlers
     * @param $id
     * @param array $user_id_array
     * @return boolean
     */
    public function assign_clients( $client_id, $department_id , array $user_id_array )
    {
        try {

            $update_list = [];

            Client::where([
                ['department_id',  $department_id ],
                ['client_id', $client_id]
            ])->forceDelete();

            foreach ($user_id_array as $value) {
                array_push($update_list,$value);
                $client = Client::firstOrCreate(['client_id' =>$client_id,'department_id'=> $department_id,'user_id' => $value['value']]);
            }
            return ;
            // $department->department_supervisors()->sync( $user_id_array );

            // log_to_file('info', 'Success', [$department->id . ' - ' . $department->department_name, $user_id_array], 'assign');
            // return $department;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }


}