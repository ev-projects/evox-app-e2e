<?php

namespace App\Modules\Report\Http\Controllers;

use App\Exports\DtrSummaryExport;
use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Payroll\Resources\AnniversaryResources; 
use App\Modules\Payroll\Resources\TeamAttendanceResources; 
use App\Modules\Report\Resources\TeamScheduleResources; 
use App\Modules\Report\Resources\DailyScheduleReources; 
use App\Modules\Payroll\Resources\HolidayResource;
use Exception;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Permission;
use App\Modules\Payroll\Repositories\DtrReportRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Repositories\HolidayRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use App\Modules\Payroll\Resources\DtrLogResourceCollection;
use App\Modules\Payroll\Resources\MyDtrNotificationsResource;
use App\Modules\Report\Repositories\ReportRepositoryInterface;
use App\Modules\User\Repositories\UserRepositoryInterface;
use Maatwebsite\Excel\Facades\Excel;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class ReportController extends Controller
{
    protected $report;
    protected $holiday;
    protected $payroll_cutoff;
    protected $dtr;
    protected $dtr_summary_export;
    protected $user;


    public function __construct( ReportRepositoryInterface $report,
                                 HolidayRepositoryInterface $holiday,
                                 PayrollCutoffRepositoryInterface $payroll_cutoff,
                                 DtrRepositoryInterface $dtr, 
                                 DtrSummaryExport $dtr_summary_export,
                                 UserRepositoryInterface $user){
        $this->report = $report;
        $this->holiday = $holiday;
        $this->payroll_cutoff = $payroll_cutoff;
        $this->dtr = $dtr;
        $this->dtr_summary_export = $dtr_summary_export;
        $this->user = $user;
    }

    

    /**
     * Returns the DTR Summary of the User by the User ID as Parameter with the Date Range.
     * @param string $user_id
     * @param string $start_date
     * @param string $end_date
     * @return \Illuminate\Http\JsonResponse
     */
    public function dtr_summary( $user_id, $start_date, $end_date ){
        try {
            $user_collection = Collection::make();

            $this->validate(new Request([
                'user_id' => $user_id,
                'start_date' => $start_date,
                'end_date' => $end_date,
            ]), [
                'user_id' => 'int',
                'start_date' => 'date_format:Y-m-d',
                'end_date' => 'date_format:Y-m-d',
            ]);
            
            $user_collection->push(  get_authenticated_user( $user_id )  );

            $result = $this->report->get_dtr_summary( $user_collection, $start_date, $end_date);

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $result[ $user_id ]  
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    public function dtr_summary_block( $user_id, $start_date, $end_date ){
        try {
            $user_collection = Collection::make();

            $this->validate(new Request([
                'user_id' => $user_id,
                'start_date' => $start_date,
                'end_date' => $end_date,
            ]), [
                'user_id' => 'int',
                'start_date' => 'date_format:Y-m-d',
                'end_date' => 'date_format:Y-m-d',
            ]);
            
            $user_collection->push(  get_authenticated_user( $user_id )  );

            # Limit the date that will be fetched by yesterday
            $current_date = date("Y-m-d", strtotime("yesterday") ) ;
            if( $end_date > $current_date ){
                $end_date = $current_date;
            }

            $result = $this->report->get_dtr_summary( $user_collection, $start_date, $end_date);

            # ADD THE SUMMARY COLUMNS NAME
            $result["column_names"] = get_constant('DTR_SUMMARY_COLUMN');

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $result 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Returns the computed DTR Summary list
     * @return \Illuminate\Http\JsonResponse
     */
    public function summary_list( $request ) {

        $user_collection = $this->user->get_users_under_supervisee( $request );
        
        $result = $this->report->get_dtr_summary( $user_collection,  $request->valid_from, $request->valid_to);
        
        return $result;
    }


    /**
     * Returns the DTR Summary of the User by the User ID as Parameter with the Date Range.
     * @return \Illuminate\Http\JsonResponse
     */
    public function team_dtr_summary(  Request $request  ){
        try {
            
            $result = $this->summary_list($request);

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $result  
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Returns the DTR Summary of the User by the User ID as Parameter with the Date Range.
     * @return \Illuminate\Http\JsonResponse
     */
    public function export_team_dtr_summary( Request $request ){

        $result = $this->summary_list($request);

        $this->dtr_summary_export->data = $result ;
        return Excel::download( $this->dtr_summary_export , 'dtrsummary.csv');
    
    }


    

    /**
     * Returns the raw DTR Logs of the User
     * @return \Illuminate\Http\JsonResponse
     */
    public function logs_list($request) {

        $user_collection = $this->user->get_users_under_supervisee( $request );
     
        $result = $this->dtr->get_dtr_logs( $user_collection, $request->valid_from, $request->valid_to);
        
        return $result;
    }


    /**
     * Returns the DTR Logs User's Team.
     * @return \Illuminate\Http\JsonResponse
     */
    public function team_dtr_logs(  Request $request  ){
        try {
            
            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                new DtrLogResourceCollection( $this->logs_list($request) )
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Returns the DTR Summary of the User by the User ID as Parameter with the Date Range.
     * @return \Illuminate\Http\JsonResponse
     */
    public function export_team_dtr_logs( Request $request ){

        $result = $this->logs_list($request);

        $this->export->data = $result ;
         return Excel::download( $this->export , 'dtrsummary.csv');
       
    }


    /**
     *  Responsible for fetching the Team's attendance
     * @return array
     */
    public function team_schedule( Request $request ){
        try {
            $date_from = Carbon::now();
            $user_list = auth()->user()->users_handled();

            // Team Filter
            if( is_valid( request()->get('team_id') ) ) {
                $user_list->join('team_users', 'team_users.user_id', '=', 'users.id')->where('team_id', '=', request()->get('team_id'));
            }else{
                // Department Filter
                if( is_valid( request()->get('department_id') ) ) {
                    $user_list->where('department_id', '=', request()->get('department_id'));
                }
            }

            // Filter by name string
            if( is_valid( request()->get('name') ) ) {
                $user_list->whereRaw("(first_name LIKE '%".request()->get('name')."%' OR last_name LIKE '%".request()->get('name')."%')");
            }

            if(request()->get('page')=="weekly"){
                $date_from->setWeekStartsAt(Carbon::SUNDAY);
                $date_from->setWeekEndsAt(Carbon::SATURDAY);

                $time_from = $date_from->startOfWeek()->format('Y-m-d');
                $time_to = $date_from->endOfWeek()->format('Y-m-d');
            }elseif(request()->get('page')=="monthly"){
                $time_from = $date_from->firstOfMonth()->format('Y-m-d');
                $time_to = $date_from->endOfMonth()->format('Y-m-d');
            }elseif(request()->get('page')=="daily"){

                $time_from = $date_from->startOfDay()->format('Y-m-d');
                $time_to = $date_from->endOfDay()->format('Y-m-d');
                $result = $this->dtr->get_dtr_logs( $user_list->get(), $time_from,  $time_to);

                return success_response(
                    trans('messages.'.__FUNCTION__.'_success'), 
                    new DailyScheduleReources($result,$date_from )
                );
            }
            
            $result = $this->dtr->get_dtr_logs( $user_list->get(), $time_from,  $time_to);

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                new TeamScheduleResources($result)
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
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
    public function my_dtr_notifications(){   
        try {
            log_activity( trans('messages.get_my_dtr_notifications_attempt') );

            $payroll_cutoff = $this->payroll_cutoff->get_payroll_cutoff();

            // Start date as the start of the payroll cutoff
            $start_date = $payroll_cutoff->start_date;

            // End date as the date yesterday. 
            $end_date = Carbon::yesterday()->format('Y-m-d');

            return success_response(
                trans('messages.get_my_dtr_notifications_success'), 
                new MyDtrNotificationsResource( $this->report->get_my_dtr_notifications( $start_date, $end_date) )
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
                new AnniversaryResources( $this->report->get_team_birthday_anniversary() )
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
                 new TeamAttendanceResources( $this->report->get_team_attendance( $time_today ) )
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
    public function team_attendance_summary( Request $request, $start_date, $end_date ){   
        try {
            log_activity( trans('messages.get_attendance_summary_attempt') );

            $this->validate(new Request([
                'start_date' => $start_date,
                'end_date' => $end_date,
            ]), [
                'start_date' => 'date_format:Y-m-d',
                'end_date' => 'date_format:Y-m-d',
            ]);

            $user_collection = $this->user->get_users_under_supervisee( $request );

            return success_response(
                trans('messages.get_attendance_summary_success'),  $this->report->get_team_attendance_summary( $user_collection,  $start_date, $end_date )
            );
            
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }






}