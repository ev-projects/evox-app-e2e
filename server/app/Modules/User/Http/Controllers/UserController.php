<?php

namespace App\Modules\User\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
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
     * Returns the Default Schedule of the User
     * @param string $emp_num
     * @return \Illuminate\Http\JsonResponse
     */
    public function default_schedule( $emp_num ){   
        try {
            log_activity( trans('messages.payload') );

            $user = $this->user->show($emp_num);

            return success_response(
                trans('messages.show_default_schedule'), 
                new ScheduleResource( $user->defaultSchedule()->first() ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

}