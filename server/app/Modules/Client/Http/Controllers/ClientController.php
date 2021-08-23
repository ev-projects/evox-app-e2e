<?php

namespace App\Modules\Client\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Client\Http\Requests\AssignEmployeesClientRequest;
use App\Modules\Client\Resources\ClientResource;
use App\Modules\Client\Repositories\ClientRepositoryInterface;
use App\Modules\Client\Resources\ClientListResource;
use App\Modules\Schedule\Resources\ScheduleResource;
use App\Modules\User\Resources\UserListResource;
use Exception;
use Illuminate\Http\JsonResponse;
use App\Modules\User\Models\User;

class ClientController extends Controller
{

    private $client;
    
    public function __construct(ClientRepositoryInterface $client){
        $this->client = $client;
    }

    
    /**
     * generate dtr date for emp.
     *
     * @return mixed
     */
    public function assignEmployeesClient(AssignEmployeesClientRequest $request){
        try {
            
            // return $request;
            $this->client->assign_clients($request->client_id,$request->department_id,$request->employee_user_id);
           
            return success_response(
                trans('Assign Success'), 
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            log_to_file( 'info', $e->getMessage(), [], "cron_errors");
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Shows the employee's client users
     * @return \Illuminate\Http\JsonResponse
     */
    public function users($client_id, $department_id){
        try {
            // return $department_id;
            $user_ids = $this->client->find($client_id,$department_id);
            $user_collection = [];
            if(count($user_ids) != 0){
                $user_collection = UserListResource::collection( User::whereIn('id',$user_ids)->get() );
            }
            
            return success_response(
                trans('messages.fetch_employees_client_success'), 
                $user_collection 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

}
