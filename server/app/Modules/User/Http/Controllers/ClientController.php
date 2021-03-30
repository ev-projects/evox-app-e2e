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
    public function get_birthday_anniversary( $id ){   
        try {
            log_activity( trans('messages.get_anniversary_birthday_attempt') );

            $birthdate = User::selectRaw("birthdate as date,first_name,last_name,'birthdate' AS type ")->whereIn('users.id', auth()->user()->supervisee()->pluck('id')->toArray())
                            ->whereRaw("(DAYOFYEAR(birthdate) - DAYOFYEAR(NOW())) >= ".get_constant("ANNIVERSARY_BIRTHDAY.day_from")." AND (DAYOFYEAR(birthdate) - DAYOFYEAR(NOW())) <=  ".get_constant("ANNIVERSARY_BIRTHDAY.day_to")."");

            $anniversary = User::selectRaw("date_hired as date,first_name,last_name,'anniversary' AS type")->whereIn('users.id', auth()->user()->supervisee()->pluck('id')->toArray())
                            ->whereRaw("(DAYOFYEAR(date_hired) - DAYOFYEAR(NOW())) >=  ".get_constant("ANNIVERSARY_BIRTHDAY.day_from")." AND (DAYOFYEAR(date_hired) - DAYOFYEAR(NOW())) <=  ".get_constant("ANNIVERSARY_BIRTHDAY.day_to")."");

            $date_from = Carbon::now()->subMonth( get_constant("REGULARIZATION.month_from") );
            $date_to = Carbon::now()->subMonth( get_constant("REGULARIZATION.month_to") );

            $regularization = User::selectRaw("DATE_ADD(date_hired, INTERVAL 6 MONTH) as date,first_name,last_name,'regularization' AS type ")->whereIn('users.id', auth()->user()->supervisee()->pluck('id')->toArray())
                                ->whereRaw("date_hired >= '".$date_from->format("Y-m-d") ."' AND date_hired <= '".$date_to->format("Y-m-d") ."' ");
            
            $birthdate->union($anniversary)->union($regularization)->orderByRaw('Month(date),Day(date)')->union($regularization);
            
            
            return success_response(
                trans('messages.get_anniversary_birthday_success'), 
                new AnniversaryResources( $birthdate->get() )
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Function for Getting Team Birthday, Anniversary and Regularization 
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function get_team_attendance( $id ){   
        try {
            log_activity( trans('messages.get_anniversary_birthday_attempt') );
            
            $time_today = new Carbon( "2021-01-01" );
            $time_from = $time_today->subMonth( 6 );
            $time_to = $time_today->addMonth( 6 );

            return success_response(
                trans('messages.get_team_attendance_success'), 
                 new TeamAttendanceResources(Dtr::select('dtrs.*')
                ->whereIn('user_id', auth()->user()->supervisee()->pluck('id')->toArray())
                ->whereRaw("
                        start_datetime BETWEEN  '".  $time_from->timestamp."' AND '".  $time_to->timestamp."'
                    OR 
                        start_flexy_datetime BETWEEN  '".  $time_from->timestamp ."' AND '".  $time_to->timestamp ."'
                    OR  
                        end_datetime BETWEEN  '".  $time_from->timestamp."' AND '".  $time_to->timestamp."'
                    OR 
                        end_flexy_datetime BETWEEN  '".  $time_from->timestamp ."' AND '".  $time_to->timestamp ."'
                    OR 
                    date = '".date("Y-m-d" ,$time_today->timestamp)."'
                ")
                ->get()));

            
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }



}