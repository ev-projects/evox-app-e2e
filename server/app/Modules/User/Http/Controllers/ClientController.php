<?php

namespace App\Modules\User\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\User\Resources\AnniversaryResources; 
use App\Modules\User\Resources\TeamAttendanceResources; 
use Exception;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Permission;


use App\Modules\Payroll\Models\Dtr;

use Illuminate\Database\Eloquent\Collection;
use App\Modules\Payroll\Models\Biometrics;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use Carbon\Carbon;


class ClientController extends Controller
{
    protected $user;


    public function __construct(UserRepositoryInterface $user){
        $this->user = $user;
    }



    /**
     * Function for Getting Team Birthday, Anniversary and Regularization 
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function birthday_anniversary( ){   
        try {
            log_activity( trans('messages.get_anniversary_birthday_attempt') );
            $user = User::find(auth()->user()->id);

            return success_response(
                trans('messages.get_anniversary_birthday_success'), 
                new AnniversaryResources( $user->team_anniversary_regularization() )
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Function for Getting Team Attendance
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function team_attendance( ){   
        try {
            log_activity( trans('messages.get_team_attendance_attempt') );
            $user = User::find(auth()->user()->id);
            $time_today = Carbon::now();

            return success_response(
                trans('messages.get_team_attendance_success'), 
                 new TeamAttendanceResources($user->team_dtr( $time_today ))
            );
            
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Function for Getting Team DTR Attendance Summary of the week
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function get_team_attendance_summary( $id ){   
        try {
            log_activity( trans('messages.get_attendance_summary_attempt') );
            $user = User::find(auth()->user()->id);

            $time_today = Carbon::now();

            return success_response(
                trans('messages.get_attendance_summary_success'),  $user->team_attendance_summary( $time_today )
            );
            
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }



}