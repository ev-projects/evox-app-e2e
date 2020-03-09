<?php

namespace App\Modules\User\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Payroll\Resources\DtrResource;
use App\Modules\Schedule\Resources\ScheduleCollection;
use App\Modules\Schedule\Resources\ScheduleResource;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\User\Resources\UserProfileResource;
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
            // log_activity( trans('messages.payload') );
            
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
            // log_activity( trans('messages.payload') );

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

}