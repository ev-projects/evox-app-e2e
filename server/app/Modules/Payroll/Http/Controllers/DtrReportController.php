<?php

namespace App\Modules\Payroll\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\User\Resources\AnniversaryResources; 
use App\Modules\User\Resources\TeamAttendanceResources; 
use Exception;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Permission;
use App\Modules\Payroll\Repositories\DtrReportRepositoryInterface;
use App\Modules\Payroll\Repositories\HolidayRepositoryInterface;
use App\Modules\User\Resources\HolidayResource;
use Carbon\Carbon;


class DtrReportController extends Controller
{
    protected $dtr_report;
    protected $holiday;


    public function __construct( DtrReportRepositoryInterface $dtr_report ,
                                 HolidayRepositoryInterface $holiday ){
        $this->dtr_report = $dtr_report;
        $this->holiday = $holiday;
    }

    # This function registers User to the system
    public function holidays( ){
        try {
            log_activity( trans('messages.get_holidays_attempt') );

            $date_from = Carbon::now();
            $date_to = Carbon::now()->addMonth(3);

            return success_response(
                trans('messages.get_holidays_success'),
                new HolidayResource( $this->holiday->get_holidays( $date_from, $date_to ) ) 
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
    public function dtr_notifications( ){   
        try {
            log_activity( trans('messages.get_anniversary_birthday_attempt') );

            return success_response(
                trans('messages.get_anniversary_birthday_success'), 
                new AnniversaryResources( $this->dtr_report->get_team_birthday_anniversary() )
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
    public function team_birthday_anniversary( ){   
        try {
            log_activity( trans('messages.get_anniversary_birthday_attempt') );

            return success_response(
                trans('messages.get_anniversary_birthday_success'), 
                new AnniversaryResources( $this->dtr_report->get_team_birthday_anniversary() )
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

            $time_today = Carbon::now();

            return success_response(
                trans('messages.get_team_attendance_success'), 
                 new TeamAttendanceResources( $this->dtr_report->get_team_attendance( $time_today ) )
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
    public function team_attendance_summary( $id ){   
        try {
            log_activity( trans('messages.get_attendance_summary_attempt') );

            $time_today = Carbon::now();

            return success_response(
                trans('messages.get_attendance_summary_success'),  $this->dtr_report->get_team_attendance_summary( $time_today )
            );
            
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
    







}