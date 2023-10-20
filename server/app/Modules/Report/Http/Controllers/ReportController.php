<?php

namespace App\Modules\Report\Http\Controllers;

use Exception;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\Redis;
use Illuminate\Http\Request;
use App\Exports\DtrSummaryExport;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Exports\TeamScheduleExport;
use App\Modules\Payroll\Models\Dtr;
use App\Exports\NewExportDTRSummary;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;
use App\Modules\Payroll\Models\Holiday;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use App\Exports\TeamSummaryAttendanceExport;
use Illuminate\Database\Eloquent\Collection;
use App\Exports\EmployeeAttendanceReportExport;
use App\Exports\ExportDTRLog;
use App\Modules\Payroll\Resources\HolidayResource;
use App\Exports\TeamSummaryAttendanceMultiSheetExport;
use App\Modules\Payroll\Resources\AnniversaryResources;
use App\Modules\Report\Resources\DailyScheduleReources;
use App\Modules\Report\Resources\TeamScheduleResources;
use App\Modules\Report\Resources\WeeklyScheduleResources;
use App\Modules\Payroll\Resources\TeamAttendanceResources;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\Payroll\Resources\DtrLogResourceCollection;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Resources\MyDtrNotificationsResource;

use App\Modules\Report\Repositories\ReportRepositoryInterface;
use App\Modules\Payroll\Repositories\HolidayRepositoryInterface;
use App\Modules\Payroll\Resources\TeamAttendanceSummaryResource;
use App\Modules\Payroll\Repositories\DtrReportRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use App\Modules\Payroll\Resources\DtrLogResource;
use App\Modules\Report\Resources\NewDtrSummaryResource;
use App\Modules\User\Models\User;
class ReportController extends Controller
{
    protected $report;
    protected $holiday;
    protected $payroll_cutoff;
    protected $dtr;
    protected $dtr_summary_export;
    protected $team_schedule_export;
    protected $user;
    protected $info_array;
    protected $new_added;



    public function __construct(
        ReportRepositoryInterface $report,
        HolidayRepositoryInterface $holiday,
        PayrollCutoffRepositoryInterface $payroll_cutoff,
        DtrRepositoryInterface $dtr,
        DtrSummaryExport $dtr_summary_export,
        TeamScheduleExport $team_schedule_export,
        UserRepositoryInterface $user
    ) {
        $this->report = $report;
        $this->holiday = $holiday;
        $this->payroll_cutoff = $payroll_cutoff;
        $this->dtr = $dtr;
        $this->dtr_summary_export = $dtr_summary_export;
        $this->team_schedule_export = $team_schedule_export;
        $this->user = $user;

        $this->new_added =  ["EmployeeNumber",];

        $this->info_array =  [
                                "FullName",
                                "EmployeeNumber",
                                "Account",
                                "Attendance_Rate",
                                "Unplanned",
                                "Planned",
                                "Scheduled_+_VL",
                                "Present_Days",
                                "Scheduled_Days",
                                "Unplanned_Leaves",
                                "Absent",
                                "SL",
                                "VL"
                            ];

        $this->disregard =  [
                                "FullName",
                                "EmployeeNumber",
                                "Account",
                                
                            ];
        $this->percentage_info =  [
                                "Attendance_Rate",
                                "Unplanned",
                                "Planned",
                            ];
    }



    /**
     * Returns the DTR Summary of the User by the User ID as Parameter with the Date Range.
     * @param string $user_id
     * @param string $start_date
     * @param string $end_date
     * @return \Illuminate\Http\JsonResponse
     */
    public function dtr_summary($user_id, $start_date, $end_date)
    {
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

            $user_collection->push(get_authenticated_user($user_id));

            $result = $this->report->get_dtr_summary($user_collection, $start_date, $end_date);

            return success_response(
                trans('messages.' . __FUNCTION__ . '_success'),
                $result[$user_id]
            );
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        }
    }


    public function dtr_summary_block($user_id, $start_date, $end_date)
    {
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

            $user_collection->push(get_authenticated_user($user_id));

            # Limit the date that will be fetched by yesterday
            $current_date = date("Y-m-d", strtotime("yesterday"));
            if ($end_date > $current_date) {
                $end_date = $current_date;
            }
            // $result = $this->report->get_dtr_summary($user_collection, $start_date, $end_date);
            $result = $this->report->get_dtr_summary_block($user_collection, $start_date, $end_date);

            # ADD THE SUMMARY COLUMNS NAME
            $result["column_names"] = get_constant('DTR_SUMMARY_COLUMN');

            return success_response(
                trans('messages.' . __FUNCTION__ . '_success'),
                $result
            );
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        }
    }



    /**
     * Returns the computed DTR Summary list
     * @return \Illuminate\Http\JsonResponse
     */
    public function summary_list($request)
    {

        $user_collection = $this->user->get_users_under_supervisee_with_inactive($request,  $request->valid_from, $request->valid_to);

        $result = $this->report->get_dtr_summary($user_collection,  $request->valid_from, $request->valid_to);

        return $result;
    }


    /**
     * Returns the DTR Summary of the User by the User ID as Parameter with the Date Range.
     * @return \Illuminate\Http\JsonResponse
     */
    public function team_dtr_summary(Request $request)
    {
        try { 

           
            $user_collection_paginated = [];
            $user_collection = $this->user->get_users_under_supervisee($request,  $request->valid_from, $request->valid_to);
            $current_page = $user_collection->currentPage();
            $last_page = $user_collection->lastPage();
            foreach ($user_collection as $user) {
                array_push($user_collection_paginated, $user);
            }

            $result = $this->report->get_dtr_summary(new Collection($user_collection_paginated),  $request->valid_from, $request->valid_to);
            $result['current_page'] = $current_page;
            $result['last_page'] = $last_page;
            $result['has_next_page'] = $current_page < $last_page;

            return success_response(
                trans('messages.' . __FUNCTION__ . '_success'),
                $result
            );
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        }
    }


    /**
     * Returns the DTR Summary of the User by the User ID as Parameter with the Date Range.
     * @return \Illuminate\Http\JsonResponse
     */
    public function export_team_dtr_summary(Request $request)
    {

        //$result = $this->summary_list($request);
        $user_collection_paginated = [];
        $user_collection = $this->user->get_users_under_supervisee($request,  $request->valid_from, $request->valid_to);
        $current_page = $user_collection->currentPage();
        $last_page = $user_collection->lastPage();
        foreach ($user_collection as $user) {
            array_push($user_collection_paginated, $user);
        }
        $for_export = $this->report->get_dtr_summary(new Collection($user_collection_paginated),  $request->valid_from, $request->valid_to);
        $content_array = $for_export['summary'];
        if ($current_page == 1) { //create empty file
            Storage::disk('local')->put('app/export/dtrsummary.temp', json_encode($content_array));
        } else { //append to file
            $contents = Storage::disk('local')->get('app/export/dtrsummary.temp');
            $content_array = json_decode($contents);
            foreach ($for_export['summary'] as $sum) {
                array_push($content_array, $sum);
            }
            Storage::disk('local')->put('app/export/dtrsummary.temp', json_encode($content_array));
        }
        $result['current_page'] = $current_page;
        $result['last_page'] = $last_page;
        $result['has_next_page'] = $current_page < $last_page;
        $result['content_array'] = $content_array;
        if ($current_page < $last_page) {
            return success_response(
                trans('messages.' . __FUNCTION__ . '_success'),
                $result
            );
        } else {
            //$this->dtr_summary_export->data = $for_export;
            $contents = Storage::disk('local')->get('app/export/dtrsummary.temp');
            $content_array = json_decode($contents, true);
            $result = array(
                'summary' => $content_array,
                'column' =>  $for_export['column']
            );
            $this->dtr_summary_export->data = $result;
            Storage::disk('local')->delete('app/export/dtrsummary.temp');
            return Excel::download($this->dtr_summary_export, 'dtrsummary.csv');
        }
    }




    /**
     * Returns the raw DTR Logs of the User
     * @return \Illuminate\Http\JsonResponse
     */
    public function logs_list($request)
    {

        $user_collection = $this->user->get_users_under_supervisee($request, $request->valid_from, $request->valid_to);

        $result = $this->dtr->get_dtr_logs($user_collection, $request->valid_from, $request->valid_to);

        return $result;
    }


    /**
     * Returns the DTR Logs User's Team.
     * @return \Illuminate\Http\JsonResponse
     */
    public function team_dtr_logs(Request $request)
    {
        try {

            return success_response(
                trans('messages.' . __FUNCTION__ . '_success'),
                new DtrLogResourceCollection($this->logs_list($request))
            );
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        }
    }

    /**
     * Returns the DTR Summary of the User by the User ID as Parameter with the Date Range.
     * @return \Illuminate\Http\JsonResponse
     */
    public function export_team_dtr_logs(Request $request)
    {
        

        $toggle_POV = !($request->toggle_pov == null);
        $result = $this->logs_list($request);
       
        $result = [
            'data' =>  $result
        ];
        return Excel::download( new ExportDTRLog(DtrLogResource::collection( $this->logs_list($request)), $toggle_POV), 'dtr_log.csv');
    }


    /**
     *  Responsible for fetching the Team's attendance
     * @return array
     */
    public function team_schedule(Request $request)
    {
        // try {
        $date_from = Carbon::now();
        $user_list = auth()->user()->users_handled();
        $no_user_limit = get_constant("TEAM_SCHEDULE.records_per_date");

        // Team Filter
        if (is_valid(request()->get('team_id'))) {
            $user_list->join('team_users', 'team_users.user_id', '=', 'users.id')->where('team_id', '=', request()->get('team_id'));
        } else {
            // Department Filter
            if (is_valid(request()->get('department_id'))) {
                $user_list->where('department_id', '=', request()->get('department_id'));
            }
        }

        // Filter by name string
        if (is_valid(request()->get('name'))) {
            $user_list->whereRaw("(first_name LIKE '%" . request()->get('name') . "%' OR last_name LIKE '%" . request()->get('name') . "%')");
        }

        if (is_valid(request()->get('start_date')) &&  is_valid(request()->get('end_date'))) {
            $time_from =  request()->get('start_date');
            $time_to =  request()->get('end_date');
        } else {
            if (request()->get('scope_type') == "week") {
                $time_from = $date_from->startOfWeek()->format('Y-m-d');
                $time_to = $date_from->endOfWeek()->format('Y-m-d');
            } elseif (request()->get('scope_type') == "month") {
                $time_from = $date_from->firstOfMonth()->format('Y-m-d');
                $time_to = $date_from->endOfMonth()->format('Y-m-d');
            } elseif (request()->get('scope_type') == "day") {
                $time_from = $date_from->startOfDay()->format('Y-m-d');
                $time_to = $date_from->endOfDay()->format('Y-m-d');
            }
        }

        $user_list->orderBy('is_active', 'desc');

        if (request()->get('export') == "all") {
            $result = $this->dtr->get_dtr_logs($user_list->get(), $time_from,  $time_to);
            $this->team_schedule_export->data = $result;
            return Excel::download($this->team_schedule_export, 'dtrsummary.csv');
        } else {
            if (request()->get('scope_type') == "day") {
                $result = $this->dtr->get_dtr_logs($user_list->get(), $time_from,  $time_to);
                return success_response(
                    trans('messages.' . __FUNCTION__ . '_success'),
                    new DailyScheduleReources($result, $date = new Carbon($time_from))
                );
            } else {
                // Get Employee that is active or will be terminated in a certain time
                $user_list = $user_list->where(function ($query) use ($time_from, $time_to) {
                    $query
                        ->where('termination_date', '=', null)
                        ->orwhere(function ($query) use ($time_from, $time_to) {
                            $query->whereDate('termination_date', '>', $time_to);
                        })
                        ->orwhere(function ($query) use ($time_from, $time_to) {
                            $query->whereDate('termination_date', '<', $time_to)
                                ->whereDate('termination_date', '>', $time_from);
                        });
                })->get();

                $show_more = array(
                    "number_of_employee" => $user_list->count(),
                    "termination_date_list" => $user_list->where('termination_date', "!=", null)->sortBy('termination_date')->pluck("termination_date")
                );

                $holiday_list = Holiday::whereRaw("(is_predefined = 1 AND (DAYOFYEAR(date) >= DAYOFYEAR('" . $time_from . "')) AND (DAYOFYEAR(date) <= DAYOFYEAR('" . $time_to . "') ) )
                    OR (is_predefined = 0 AND date >= '" . $time_from . "' AND date <= '" . $time_to . "' ) ")->orderByRaw('Month(date),Day(date)')->get();

                if (!request()->get('show_more')) {
                    $user_collection = $user_list->take($no_user_limit);
                } else {
                    $user_collection = $user_list;
                }

                if (request()->get('scope_type') == "week") {
                    $result = $this->dtr->get_dtr_logs($user_collection, $time_from,  $time_to);
                    // return $result;
                    return success_response(
                        trans('messages.' . __FUNCTION__ . '_success'),
                        new WeeklyScheduleResources($result, $show_more, $holiday_list, $user_collection)
                    );
                } else {
                    $result = $this->dtr->get_dtr_logs($user_collection, $time_from,  $time_to);
                    // return $result;
                    return success_response(
                        trans('messages.' . __FUNCTION__ . '_success'),
                        new TeamScheduleResources($result, $show_more, $holiday_list, $user_collection)
                    );
                }
            }
        }


        // } catch(Exception $e){
        //     return error_response( trans('messages.error_default'), $e );
        // }
    }




    # This function registers User to the system
    public function holidays()
    {
        try {
            log_activity(trans('messages.get_holidays_attempt'));

            $date_from = Carbon::now();
            $date_to = Carbon::now()->addMonth(3);

            return success_response(
                trans('messages.get_holidays_success'),
                new HolidayResource($this->holiday->get_holidays($date_from, $date_to))
            );
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        }
    }


    
    
    public function get_dashboard_holidays(Request $request)
    {
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'start_date' => $request->start_date, 'end_date' => $request->end_date], "bhrlog");
        try {
            $user = User::find(auth()->user()->id);
            $bhr_holidays_array = [];

           
            $redisresponse = Redis::get($user->id.':get_dashboard_holidays'.date('Y-m-d'));
            Redis::del(Redis::keys('laravel_cache:*'));
            if(isset($redisresponse)) {
             
              return json_decode($redisresponse, FALSE);
                
            }else{

                $bhr_holidays_array = Holiday::whereRaw("date > DATE_FORMAT(NOW(),'%Y-%m-%d')")->orderByRaw('Month(date),Day(date)')->get();
                $Expiretime = (strtotime('tomorrow') - string_offset_to_seconds(Auth::user()->country_timezone_to_offset())) - datetime_to_timestamp(  date("Y-m-d H:i:s"));
                if($Expiretime < 0){
                 $Expiretime = $Expiretime + (86400);
                 Redis::set($user->id.':get_dashboard_holidays', $bhr_holidays_array,"EX",$Expiretime);
                }else{
                 Redis::set($user->id.':get_dashboard_holidays', $bhr_holidays_array,"EX",$Expiretime);
                }
                
                return $bhr_holidays_array;
            }

     // Define the End Point for the API.
        //     $end_point = 'time_off/whos_out/?start='.$request->start_date.'&end='.$request->end_date;
       
        //     // Iterate the BHr Call Result
        //     $user = $this->user->show(Auth::user()->id);

        //     // if ($user->country_id == 2) {
        //         // BHR API CALL For Fecthing Philippines Holiday
        //         foreach( bhr_api_call('GET', $end_point) as $row ) {

        //             // If the current Iteration's Type Attribute is a 'holiday', proceed on checking for possible Holiday transaction.
        //             if( $row->type == 'holiday' ) {
        //                 $bhr_holidays_array[] = $row;
        //             }
        //         }
        //     // } else if ($user->country_id == 1) {
        //         // BHR API CALL For Fecthing Indian Holiday
        //         foreach( bhr_api_call_india('GET', $end_point) as $row ) {

        //             // If the current Iteration's Type Attribute is a 'holiday', proceed on checking for possible Holiday transaction.
        //             if( $row->type == 'holiday' ) {

        //                 // Check Holidays Already Exist ion Array
        //                 if(in_array($row, $bhr_holidays_array)) {
        //                 }  else {
        //                 $bhr_holidays_array[] = $row;
        //                 }
        //             }
        //         // }
        //     }

        //       // BHR API CALL For Fecthing bulgaria Holiday
        //     foreach( bhr_api_call_bulgaria('GET', $end_point) as $row ) {

        //         // If the current Iteration's Type Attribute is a 'holiday', proceed on checking for possible Holiday transaction.
        //         if( $row->type == 'holiday' ) {

        //             // Check Holidays Already Exist ion Array
        //             if(in_array($row, $bhr_holidays_array)) {
        //             }  else {
        //             $bhr_holidays_array[] = $row;
        //             }

        //         }
        //     // }
        //     }
        //     // Sort Holiday By Date And ID
        //     usort($bhr_holidays_array, function($a, $b) {
        //         return [$a->start,$a->id] <=> [$b->start,$b->id];
        //    });
            
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $bhr_holidays_array, "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            return $bhr_holidays_array;
            return success_response(
                trans('messages.get_holidays_success'),
                $bhr_holidays_array
            );
        } catch (Exception $e) {
            DB::rollback();
            
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            throw $e;
        }
    }



    /**
     * Function for Getting Team Birthday, Anniversary and Regularization
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function my_dtr_notifications()
    {
        try {
            log_activity(trans('messages.get_my_dtr_notifications_attempt'));

            $payroll_cutoff = $this->payroll_cutoff->get_payroll_cutoff();

            // Start date as the start of the payroll cutoff
            $start_date = $payroll_cutoff->start_date;

            // End date as the date yesterday.
            $end_date = Carbon::yesterday()->format('Y-m-d');
            

            return success_response(
                trans('messages.get_my_dtr_notifications_success'),
                new MyDtrNotificationsResource($this->report->get_my_dtr_notifications($start_date, $end_date))
            );
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        }
    }



    /**
     * Function for Getting Team Birthday, Anniversary and Regularization
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function team_birthday_anniversary()
    {
        try {
            log_activity(trans('messages.get_anniversary_birthday_attempt'));
            $user = User::find(auth()->user()->id);
            $getteambirthdayanniversary = Redis::get($user->id.':team_birthday_anniversary');
            Redis::del(Redis::keys('laravel_cache:*'));
                if(isset($getteambirthdayanniversary)) {
                  return success_response(
                        trans('messages.get_anniversary_birthday_success_from_redis'), json_decode($getteambirthdayanniversary, FALSE)
                    );
                }else{
                   $teambirthdayanniversary = new AnniversaryResources($this->report->get_team_birthday_anniversary_last_twodays());
                   $jsonmyteambirthday = json_encode($teambirthdayanniversary);
                   $Expiretime = (strtotime('tomorrow') - string_offset_to_seconds(Auth::user()->country_timezone_to_offset())) - datetime_to_timestamp(  date("Y-m-d H:i:s"));
                   if($Expiretime < 0){
                    $Expiretime = $Expiretime + (86400);
                    Redis::set($user->id.':team_birthday_anniversary', $jsonmyteambirthday,"EX",$Expiretime
                     );
                   }else{
                    Redis::set($user->id.':team_birthday_anniversary', $jsonmyteambirthday,"EX",$Expiretime
                    );
                   }
                    
                    return success_response(
                        trans('messages.get_anniversary_birthday_success'), $teambirthdayanniversary
                    );
                }
            // return success_response(
            //     trans('messages.get_anniversary_birthday_success'),
            //     // new AnniversaryResources($this->report->get_team_birthday_anniversary())
            //     new AnniversaryResources($this->report->get_team_birthday_anniversary_last_twodays()) 
            // );
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        }
    }



    /**
     * Function for Getting Team Attendance
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function team_attendance()
    {
        try {
            log_activity(trans('messages.get_team_attendance_attempt'));

            $time_today = Carbon::now();

            return success_response(
                trans('messages.get_team_attendance_success'),
                new TeamAttendanceResources($this->report->get_team_attendance($time_today))
            );
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        }
    }


    /**
     * Function for Getting Team DTR Attendance Summary of the week
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function team_attendance_summary(Request $request, $start_date, $end_date)
    {

        try {
            log_activity(trans('messages.get_attendance_summary_attempt'));

            $this->validate(new Request([
                'start_date' => $start_date,
                'end_date' => $end_date,
            ]), [
                'start_date' => 'date_format:Y-m-d',
                'end_date' => 'date_format:Y-m-d',
            ]);


            $new_start_date = Carbon::parse($start_date)->format('y-m-d');
            $new_end_date = Carbon::parse($end_date)->format('y-m-d');
            $period = CarbonPeriod::between($new_start_date,  $new_end_date);

            $user_collection = $this->user->get_users_under_supervisee($request, $start_date, $end_date,  true, auth()->user()->hasRole( get_constant('USER_ROLES.hr') ));


            $override = $this->report->get_team_attendance_summary($user_collection,  $start_date, $end_date);
           
            
            $list = (array) $override['employee_list_summary'];



            $excel_employees = $this->ammendDetailsOfSummaryForExcel($list, $period, $user_collection);


            $information_array = $this->info_array;

            $ordered_row =  $this->attendance_order_row($excel_employees,  $information_array, $start_date, $end_date);


            $total_row = $this->compute_attendance_total_row($ordered_row,  $information_array);


            $override["attendance"]['total_percentage'] = number_format($total_row[3], 2);

            $override["unplanned_leaves"]['total_percentage'] = number_format($total_row[4], 2);
            $override["planned_leaves"]['total_percentage'] = number_format($total_row[5], 2);



            return success_response(
                trans('messages.get_attendance_summary_success'),
                $override
            );
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        }
    }

    /**
     * Return
     * @return \Illuminate\Http\JsonResponse
     */
    public function export(Request $request, $start_date, $end_date)
    {


        $new_start_date = Carbon::parse($start_date)->format('y-m-d');
        $new_end_date = Carbon::parse($end_date)->format('y-m-d');
        $period = CarbonPeriod::between($new_start_date,  $new_end_date);


        $user_collection = $this->user->get_users_under_supervisee($request, $start_date, $end_date, true, auth()->user()->hasRole( get_constant('USER_ROLES.hr') ));
        $data =  $this->report->get_team_attendance_summary_dtr($user_collection,  $start_date, $end_date);

        $list = (array) $data['employee_list_summary'];
        



        $excel_employees = $this->ammendDetailsOfSummaryForExcel($list, $period, $user_collection);


        $information_array = $this->info_array;

        $ordered_row =  $this->attendance_order_row($excel_employees,  $information_array, $start_date, $end_date);


        $total_row = $this->compute_attendance_total_row($ordered_row,  $information_array);

        $segragated_total_row = $this->compute_account_attendance_total_row($ordered_row,  $information_array);


        $response = Excel::download(
            new EmployeeAttendanceReportExport($start_date, $end_date, $data,  $ordered_row, $total_row, $segragated_total_row),
            'attendance_rep.xlsx',
            \Maatwebsite\Excel\Excel::XLSX,
            ["sampleName" => 'sample']

        );
        ob_end_clean();

        return $response;
    }

    // public function export_old(Request $request, $start_date, $end_date)
    // {
    //     $user_collection = $this->user->get_users_under_supervisee($request, $start_date, $end_date);
    //     $data =  $this->report->get_team_attendance_summary($user_collection,  $start_date, $end_date);
    //     $array = (array) $data['dtr_collection'];
    //     $list = $this->getDetailsOfSummary($array['team_attendance_summary']);
    //     ob_end_clean();
    //     ob_start();

    //     return Excel::download(new TeamSummaryAttendanceExport($data, $list), 'users.xlsx');
    // }


    public function getDetailsOfSummary($data)
    {
        try {
            $team_attendance_summary = [];

            foreach ($data as $dtr) {
                $status = '';
                $schedule = array();
                $has_holiday = false;
                $has_leave = false;
                $has_rest_day_work = false;

                // If DTR has holidays, tick the has_holiday flag
                if ($dtr->holidays()->get()->count() > 0) {
                    $status = 'Holiday';
                    $has_holiday = true;
                }

                $leave = $dtr->leaves()->first();

                // If DTR has valid leave, tick the has_leave flag
                if (is_valid($leave) && $leave->isApproved() && $leave->amount > 0) {
                    $status = $dtr->leaves()->get()->first()->type;
                    $has_leave = true;
                }

                // If DTR is rest day and has rest day work, tick the has_rest_day_Work flag
                if ($dtr->isRestDay() && $dtr->source_type_tagging == get_constant('DTR_SOURCE_TYPE_TAGGING.rest_day_work')) {
                    $status = 'Rest Day Work';
                    $has_rest_day_work = true;
                }

                # If There is No Rest Day, Holiday and Leave, check status
                if (!$has_rest_day_work && !$has_holiday && !$has_leave) {

                    # Check if there is a schedule for the DTR
                    if ($dtr->hasSchedule()) {

                        // If DTR has Log, set status as Present
                        if ($dtr->hasValidTimelogs()) {
                            $status = 'Present';

                            // else, set status as Absent
                        } else {
                            $status = 'Absent';

                            // if inside sched = absent
                            if ($dtr->checkCurrentTime()) {
                                $status = 'Absent';
                            } else {
                                $status = 'Not yet started';
                            }
                        }

                        // If the DTR is Rest Day, set status as Rest Day
                    } elseif ($dtr->isRestDay()) {
                        $status = 'Rest Day';

                        // else, set as No Schedule
                    } else {
                        $status = 'No Schedule';
                    }
                }

                // Fetch User of the DTR
                $user = $dtr->user()->first();

                // Assemble the array details for the Team Attendance Summary
                array_push(
                    $team_attendance_summary,
                    [
                        "date" => $dtr->date,
                        "user_id" => $user->id,
                        "name" => $user->getFullName(2),
                        "job_title" =>  $user->job_title,
                        "department" =>  $user->department->department_name,
                        "status" => $status
                    ]
                );
            }

            return $team_attendance_summary;
        } catch (Exception $e) {
            throw $e;
        }
    }


   

    /**
     * Return
     * @return \Illuminate\Http\JsonResponse
     */
    public function getDetailsOfSummaryForExcel($data)
    {

        try {

            $employee_list_summary = [];
            foreach ($data as $dtr) {

                $status = '';
                
                $has_holiday = false;
                $has_leave = false;
                $has_rest_day_work = false;



                // If DTR has holidays, tick the has_holiday flag
                if ($dtr->holidays()->get()->count() > 0) {
                    $status = 'H';
                    $has_holiday = true;
                }

                $leave = $dtr->leaves()->first();

                // If DTR has valid leave, tick the has_leave flag
                if (is_valid($leave) && $leave->isApproved() && $leave->amount > 0) {
                    // $status = $dtr->leaves()->get()->first()->type;
                    $status = $dtr->leavesToAcronym(true);
                    $has_leave = true;
                }

                // If DTR is rest day and has rest day work, tick the has_rest_day_Work flag
                if ($dtr->isRestDay() && $dtr->source_type_tagging == get_constant('DTR_SOURCE_TYPE_TAGGING.rest_day_work')) {
                    $status = 'P-RDW';
                    $has_rest_day_work = true;
                }

                # If There is No Rest Day, Holiday and Leave, check status
                if (!$has_rest_day_work && !$has_holiday && !$has_leave) {

                    # Check if there is a schedule for the DTR
                    if ($dtr->hasSchedule()) {

                        // If DTR has Log, set status as Present
                        if ($dtr->hasValidTimelogs()) {
                            $status = 'P';

                            // else, set status as Absent
                        } else {
                            $status = 'A';

                            // if inside sched = absent
                            if ($dtr->checkCurrentTime()) {
                                $status = 'A';
                            } else {
                                $status = "TBD";
                            }
                        }

                        // If the DTR is Rest Day, set status as Rest Day
                    } elseif ($dtr->isRestDay()) {
                        $status = 'RD';

                        // else, set as No Schedule
                    } else {
                        $status = 'X';
                    }
                }

                // Fetch User of the DTR
                $user = $dtr->user()->first();



                $employee_list_summary[$user->id][] = [
                    "dtr" => $dtr,
                    "date" => $dtr->date,
                    "name" => $user->getFullName(2),
                    "has_holiday" =>   $has_holiday,
                    "status" => $status
                ];
            }

            return $employee_list_summary;
        } catch (Exception $e) {
            throw $e;
        }
    }


    public function ammendDetailsOfSummaryForExcel($employee_dtr_list, $period, $user_collection)
    {
        try {
            $ammended_list = [];
            foreach ($employee_dtr_list as $key => $dtr_list) {
                $temp_list = [];

                foreach ($dtr_list as $keyd => $dtr) {
                    $temp_list[$dtr["date"]] = $dtr;
                }
                foreach ($period as $day) {
                    if (isset($temp_list[$day->format("Y-m-d")])) {
                        $ammended_list[$key][] =   $temp_list[$day->format("Y-m-d")];
                    } else {
                        $ammended_list[$key][] = [
                            "date" => $day->format('Y-m-d'),
                            "status" => "M"
                        ];
                    }
                }
            }

            $list =  $ammended_list;

            $excel_employees = [];
            foreach ($user_collection as $key => $employee) {
                $excel_employees[$key]["information"]["FullName"]               = /*$employee->emp_num ." ".*/ $employee->getFullName();
                $excel_employees[$key]["information"]["Account"]                = $employee->department->department_name;
                $excel_employees[$key]["information"]["EmployeeNumber"]         = $employee->emp_num;
                $excel_employees[$key]["information"]["Attendance_Rate"]        = 0;
                $excel_employees[$key]["information"]["Unplanned"]              = 0;
                $excel_employees[$key]["information"]["Planned"]                = 0;
                $excel_employees[$key]["information"]["Scheduled_+_VL"]         = 0;
                $excel_employees[$key]["information"]["Present_Days"]           = 0;
                $excel_employees[$key]["information"]["Scheduled_Days"]         = 0;
                $excel_employees[$key]["information"]["Unplanned_Leaves"]       = 0;
                $excel_employees[$key]["information"]["Absent"]                 = 0;
                $excel_employees[$key]["information"]["SL"]                     = 0;
                $excel_employees[$key]["information"]["VL"]                     = 0;


                if (isset($list[$employee->id])) {
                    $excel_employees[$key]["dates"]                                 =  $list[$employee->id];
                } else {
                    foreach ($period as $day) {
                        $excel_employees[$key]["dates"][] = [
                            "date" => $day->format('Y-m-d'),
                            "status" => "X"
                        ];
                    }
                }
            }

            return $excel_employees;
        } catch (Exception $e) {
            throw $e;
        }
    }







    public function attendance_order_row($data, $information_array, $start_date, $end_date)
    {
        try {
            $ordered_excel_row = [];
            $i = 1;
            $d = 1;

            $month_start = Carbon::parse($start_date)->format('y-m-d');
            $month_end = Carbon::parse($end_date)->format('y-m-d');
            $period = CarbonPeriod::between($month_start,  $month_end);






            $r = 0;
            $current_date = Carbon::now();
            foreach ($data as $keyd => $row) {
                foreach ($information_array as $keyi => $type) {
                    $ordered_excel_row[$keyd][] = $row["information"][$type];
                    $r = $r + 1;
                }

                foreach ($period as $keyp => $date) {
                    if ($current_date->gte($date)) {
                        if (isset($row["dates"][$keyp]) && $date->format('Y-m-d') == $row["dates"][$keyp]["date"]) {


                            $ordered_excel_row[$keyd][] = $row["dates"][$keyp]["status"];
                        } else {
                            $ordered_excel_row[$keyd][] =  null;
                        }
                    } else {
                        $ordered_excel_row[$keyd][] = null;
                    }


                    ///////////////CALCULATION for VL 
                    $VL_key = array_search('VL', $information_array);
                    if (isset($row["dates"][$keyp]) && $row["dates"][$keyp]["status"] == "VL") {
                        $ordered_excel_row[$keyd][$VL_key] += 1;
                    }

                    ///////////////CALCULATION for SL 
                    $SL_key = array_search('SL', $information_array);
                    if (isset($row["dates"][$keyp]) && $row["dates"][$keyp]["status"] == "SL") {
                        $ordered_excel_row[$keyd][$SL_key] += 1;
                    }

                    //////////////CALCULATION for A 
                    $A_key = array_search('Absent', $information_array);
                    if (isset($row["dates"][$keyp])) {
                        if ($row["dates"][$keyp]["status"] == "A") {
                            $ordered_excel_row[$keyd][$A_key] += 1;
                        }
                        if ($row["dates"][$keyp]["status"] == "UL") {
                            $ordered_excel_row[$keyd][$A_key] += 1;
                        }

                        if ($row["dates"][$keyp]["status"] == "X") {
                            $ordered_excel_row[$keyd][$A_key] += 1;
                        }
                        // if( $row["dates"][$keyp]["status"] == "Xd"){
                        //     $ordered_excel_row[$keyd][$A_key] += 1;
                        // }

                    }

                    //////////////CALCULATION for Unplanned_Leaves 
                    $UnplL_key = array_search('Unplanned_Leaves', $information_array);
                    $ordered_excel_row[$keyd][$UnplL_key] =
                        ($ordered_excel_row[$keyd][$A_key] + $ordered_excel_row[$keyd][$SL_key]);

                    //////////////CALCULATION for Present_Days 
                    $P_key = array_search('Present_Days', $information_array);
                    if (isset($row["dates"][$keyp])) {
                        if ($row["dates"][$keyp]["status"] == "P") {
                            $ordered_excel_row[$keyd][$P_key] += 1;
                        }
                        if ($row["dates"][$keyp]["status"] == "P-RDW") {
                            $ordered_excel_row[$keyd][$P_key] += 1;
                        }
                        if ($row["dates"][$keyp]["status"] == "H-RDW") {
                            $ordered_excel_row[$keyd][$P_key] += 1;
                        }
                        if ($row["dates"][$keyp]["status"] == "H" && Carbon::now()->gte(Carbon::parse($row["dates"][$keyp]["date"]))) {
                            $ordered_excel_row[$keyd][$P_key] += 1;
                        }
                    }


                    //////////////CALCULATION for Scheduled_Days 
                    $SchDa_key = array_search('Scheduled_Days', $information_array);
                    $ordered_excel_row[$keyd][$SchDa_key] =
                        ($ordered_excel_row[$keyd][$UnplL_key] + $ordered_excel_row[$keyd][$P_key]);

                    //////////////CALCULATION for Scheduled_+_VL 
                    $Sch_VL_key = array_search('Scheduled_+_VL', $information_array);
                    $ordered_excel_row[$keyd][$Sch_VL_key] =
                        ($ordered_excel_row[$keyd][$SchDa_key] + $ordered_excel_row[$keyd][$VL_key]);


                    //////////////CALCULATION for Planned 
                    $Plan_key = array_search('Planned', $information_array);
                    if ($ordered_excel_row[$keyd][$Sch_VL_key] > 0) {
                        $ordered_excel_row[$keyd][$Plan_key] =
                            ($ordered_excel_row[$keyd][$VL_key] / $ordered_excel_row[$keyd][$Sch_VL_key]) * 100;
                    }

                    //////////////CALCULATION for Unplanned 
                    $UnPlan_key = array_search('Unplanned', $information_array);
                    if ($ordered_excel_row[$keyd][$SchDa_key] > 0) {
                        $ordered_excel_row[$keyd][$UnPlan_key] =
                            ($ordered_excel_row[$keyd][$UnplL_key] / $ordered_excel_row[$keyd][$SchDa_key]) * 100;
                    }

                    //////////////CALCULATION for Attendance_Rate 
                    $AR_key = array_search('Attendance_Rate', $information_array);
                    if ($ordered_excel_row[$keyd][$SchDa_key] > 0) {
                        $ordered_excel_row[$keyd][$AR_key] =
                            ($ordered_excel_row[$keyd][$P_key] / $ordered_excel_row[$keyd][$SchDa_key]) * 100;
                    }
                }
            }

            return $ordered_excel_row;
        } catch (Exception $e) {
            throw $e;
        }
    }


    public function compute_attendance_total_row($ordered_row, $information_array)
    {

        try {
            $total_row = [];

            $disregard = $this->disregard;

            $count_rows = count($ordered_row);

            $percentage_info = $this->percentage_info;

            foreach ($information_array as $key => $info) {
                if (!(in_array($info, $disregard))) {

                    if (!(in_array($info, $percentage_info))) {
                        $info_key = array_search($info, $information_array);
                        $total_row[] = array_sum(array_column($ordered_row, $info_key));
                    } else {
                        $info_key = array_search($info, $information_array);
                        $total_row[] = $count_rows > 0 ? array_sum(array_column($ordered_row, $info_key)) / $count_rows : 0;
                    }
                } else {
                    $total_row[] = null;
                }
            }

            return $total_row;
            
        } catch (Exception $e) {
            throw $e;
        }
    }



    public function compute_account_attendance_total_row($ordered_row, $information_array)
    {

        try {
            // $total_row = [];

            $disregard = $this->disregard;

            $segregated_count_rows = [];

            $segregated_accounts = [];
            $segregated_account_total = [];
            $percentage_info =  $this->percentage_info;
            foreach ($ordered_row as $row) {
                $info_key = array_search("Account", $information_array);
                $account_name = $row[$info_key];
                $segregated_accounts[$account_name][] = $row;
            }


            foreach ($segregated_accounts as $seg_key => $segregated_account_rows) {
                foreach ($this->new_added as $new_col){
                    $segregated_account_total[$seg_key][] = "";
                }
                $segregated_count_rows = count($segregated_account_rows);
                foreach ($information_array as $key => $info) {
                    if (!(in_array($info, $disregard))) {

                        if (!(in_array($info, $percentage_info))) {
                            $info_key = array_search($info, $information_array);
                            $segregated_account_total[$seg_key][] = array_sum(array_column($segregated_account_rows, $info_key));
                        } else {
                            $info_key = array_search($info, $information_array);
                            $segregated_account_total[$seg_key][] = array_sum(array_column($segregated_account_rows, $info_key)) / $segregated_count_rows;
                        }
                    } else {

                        if ((in_array($info, $disregard)) && $info ==  "FullName") { // Replaced as headcount in excel

                            $segregated_account_total[$seg_key][] = $segregated_count_rows;
                        }

                        if ((in_array($info, $disregard)) && $info ==  "Account") {

                            $segregated_account_total[$seg_key][] = $seg_key;
                        }
                    }
                }
            }

            return $segregated_account_total;
        } catch (Exception $e) {
            throw $e;
        }
    }
    /**
     * Returns the computed DTR Summary list
     * @return \Illuminate\Http\JsonResponse
     */





    public function new_dtr_summary_report_csv_export(Request $request)
    {

      
        try {           
            $user_sup_id = Auth::user()->id; // basically user id
            if($request->sup_id){
                $user_sup_id = $request->sup_id;
            }
             $user_collection_paginated = [];
             $result = DB::table('drt_summary_report')
->select(DB::raw("CONCAT(IF(users.first_name IS NOT NULL,users.first_name,''),' ',IF(users.middle_name IS NOT NULL,users.middle_name,''),' ',IF(users.last_name IS NOT NULL,users.last_name,'')) AS Employee_Name"),'users.emp_num as Employee_Number','departments.department_name as Department', 
DB::raw("sum(drt_summary_report.unpaid_leave) as UL"), DB::raw("sum(drt_summary_report.on_leave) as Leaves"), 
DB::raw("round(sum(drt_summary_report.reg_late),2) as Late"), DB::raw("round(sum(drt_summary_report.reg_undertime),2) as Under_Time"), 
DB::raw("round(sum(drt_summary_report.reg_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.reg_rendered_hours_overlapp,0)) -sum(drt_summary_report.reg_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.reg_night_diff_overlapp,0)),2) as Render_Hr"), 
DB::raw("round(sum(drt_summary_report.reg_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.reg_night_diff_overlapp,0)),2) as Night_Diff"), 
DB::raw("round(sum(drt_summary_report.reg_overtime),2) as OverTime"), DB::raw("round(sum(drt_summary_report.reg_overtime_night_diff),2) as OT_ND"), 
DB::raw("round(sum(drt_summary_report.rd_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.rd_rendered_hours_overlapp,0)) - sum(drt_summary_report.rd_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.rd_night_diff_overlapp,0)),2) as RD_Render_HR"), 
DB::raw("round(sum(drt_summary_report.rd_night_diff + drt_summary_report.rd_night_diff_overlapp),2) as RD_ND"), 
DB::raw("round(sum(drt_summary_report.rd_overtime),2) as RD_OT"), DB::raw("round(sum(drt_summary_report.rd_overtime_night_diff),2) as RD_OT_ND"), 
DB::raw("round(sum(drt_summary_report.lh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.lh_rendered_hours_overlapp,0)) -sum(drt_summary_report.lh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.lh_night_diff_overlapp,0)),2) as LH_Render_HR"), 
DB::raw("round(sum(drt_summary_report.lh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.lh_night_diff_overlapp,0)),2) as LH_ND"), 
DB::raw("round(sum(drt_summary_report.lh_overtime),2) as LH_OT"), DB::raw("round(sum(drt_summary_report.lh_overtime_night_diff),2) as LH_OT_ND"), 
DB::raw("round(sum(drt_summary_report.sh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.sh_rendered_hours_overlapp,0)) -sum(drt_summary_report.sh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.sh_night_diff_overlapp,0)),2) as SH_Render_Hr"), 
DB::raw("round(sum(drt_summary_report.sh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.sh_night_diff_overlapp,0)),2) as SH_ND"), 
DB::raw("round(sum(drt_summary_report.sh_overtime),2) as SH_OT"), DB::raw("round(sum(drt_summary_report.sh_overtime_night_diff),2) as SH_OT_ND"), 
DB::raw("round(sum(drt_summary_report.dsh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.dsh_rendered_hours_overlapp,0)) -sum(drt_summary_report.dsh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dsh_night_diff_overlapp,0)),2) as DSH_Render_HR"),
DB::raw("round(sum(drt_summary_report.dsh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dsh_night_diff_overlapp,0)),2) as DSH_ND"), 
DB::raw("round(sum(drt_summary_report.dsh_overtime),2) as DSH_OT"), DB::raw("round(sum(drt_summary_report.dsh_overtime_night_diff),2) as DSH_OT_ND"), 
DB::raw("round(sum(drt_summary_report.dlh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.dlh_rendered_hours_overlapp,0)) -sum(drt_summary_report.dlh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dlh_night_diff_overlapp,0)),2) as DLH_Render_HR"), 
DB::raw("round(sum(drt_summary_report.dlh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dlh_night_diff_overlapp,0)),2) as DLH_ND"), 
DB::raw("round(sum(drt_summary_report.dlh_overtime),2) as DLH_OT"), DB::raw("round(sum(drt_summary_report.dlh_overtime_night_diff),2) as DLH_OT_ND"), 
DB::raw("round(sum(drt_summary_report.slh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.slh_rendered_hours_overlapp,0)) -sum(drt_summary_report.slh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.slh_night_diff_overlapp,0)),2) as SLH_Render_HR"), 
DB::raw("round(sum(drt_summary_report.slh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.slh_night_diff_overlapp,0)),2) as SLH_ND"), 
DB::raw("round(sum(drt_summary_report.slh_overtime),2) as SLH_OT"), DB::raw("round(sum(drt_summary_report.slh_overtime_night_diff),2) as SLH_OT_ND")) ->join('users','users.id','=','drt_summary_report.user_id')
             ->join('departments', 'users.department_id', '=', 'departments.id');
             if( is_valid( $user_sup_id ) ){
		        $result->join('users_supervisors','users_supervisors.user_id','=','drt_summary_report.user_id');
                $result->where('users_supervisors.supervisor_id','=',$user_sup_id);
             }
             $result->whereBetween('drt_summary_report.login_date', [$request->valid_from, $request->valid_to]);
             
              
             
            if( is_valid( $request->department_id ) ){
                $result->where('users.department_id','=' ,$request->department_id );
            } else {
                $result->whereRaw('users.department_id IS NOT NULL');
            }

            if( is_valid( $request->name ) ){
                $result->whereRaw('(first_name like ? OR middle_name like ? OR last_name like ?)', array('%'.trim( $request->name ).'%', '%'.trim( $request->name ).'%', '%'.trim( $request->name ).'%' ));
            }
           $result->whereRaw('(is_active = ' . (is_valid($request->is_active) ? $request->is_active : '1') .' or termination_date BETWEEN "'. $request->valid_from .'" AND "'. $request->valid_to .'")')
            ->groupBy('users.first_name','users.middle_name','users.last_name','users.emp_num','users.email','users.username','users.id');
            if (is_valid($request->page)) {
                $result1= $result->orderBy('departments.department_name')->orderby('users.date_hired', 'DESC')->orderBy('users.last_name', 'asc')->orderBy('users.first_name', 'asc')->get();
            }else{
                $result1= $result->orderBy('departments.department_name')->orderby('users.date_hired', 'DESC')->orderBy('users.last_name', 'asc')->orderBy('users.first_name', 'asc');
            }

            // $jsonAllDecoded = json_decode($result1, true);

            // //here simple add our CSV file a (pakainfo.csv)name.
            // $csvFileName = 'sm/summaryreport.csv';

            // //simple PHP File Open file pointer.
            // $fp = fopen($csvFileName, 'w');
            // fputcsv($fp, array_keys($jsonAllDecoded[0]));
            // //PHP Loop through the associative an array.
            // foreach($jsonAllDecoded as $row){
            // //Write the json row all the data to the CSV file.
            // fputcsv($fp, $row);
            // }

            // //last step here, close the file pointer.
            // fclose($fp);

            // $fileName = 'summaryreport.csv';
            // $path = public_path('sm/summaryreport.csv');

            // return Response::download($path, $fileName , ['Content-Type: application/csv']);
            return Excel::download(new NewExportDTRSummary($result1), 'newdtrsummary.csv');

     
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        }
    }

    public function new_dtr_summary_report(Request $request)
    {
   
        try {           
            $user_sup_id = Auth::user()->id; // basically user id
            if($request->sup_id){
                $user_sup_id = $request->sup_id;
            }
             $user_collection_paginated = [];
             $result = DB::table('drt_summary_report')
->select(DB::raw("CONCAT(IF(users.first_name IS NOT NULL,users.first_name,''),' ',IF(users.middle_name IS NOT NULL,users.middle_name,''),' ',IF(users.last_name IS NOT NULL,users.last_name,'')) AS Employee_Name"),'users.emp_num as Employee_Number','departments.department_name as Department', DB::raw("sum(drt_summary_report.unpaid_leave) as UL"), DB::raw("sum(drt_summary_report.on_leave) as Leaves"), 
DB::raw("round(sum(drt_summary_report.reg_late),2) as Late"), DB::raw("round(sum(drt_summary_report.reg_undertime),2) as Under_Time"), 
DB::raw("round(sum(drt_summary_report.reg_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.reg_rendered_hours_overlapp,0)) -sum(drt_summary_report.reg_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.reg_night_diff_overlapp,0)), 2) as Render_Hr"), 
DB::raw("round(sum(drt_summary_report.reg_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.reg_night_diff_overlapp,0)),2) as Night_Diff"),
DB::raw("round(sum(drt_summary_report.reg_overtime),2) as OverTime"), DB::raw("round(sum(drt_summary_report.reg_overtime_night_diff),2) as OT_ND"),
DB::raw("round(sum(drt_summary_report.rd_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.rd_rendered_hours_overlapp,0)) - sum(drt_summary_report.rd_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.rd_night_diff_overlapp,0)),2) as RD_Render_HR"),
DB::raw("round(sum(drt_summary_report.rd_night_diff + drt_summary_report.rd_night_diff_overlapp),2) as RD_ND"),
DB::raw("round(sum(drt_summary_report.rd_overtime),2) as RD_OT"),DB::raw("round(sum(drt_summary_report.rd_overtime_night_diff),2) as RD_OT_ND"), 
DB::raw("round(sum(drt_summary_report.lh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.lh_rendered_hours_overlapp,0)) -sum(drt_summary_report.lh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.lh_night_diff_overlapp,0)),2) as LH_Render_HR"),
DB::raw("round(sum(drt_summary_report.lh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.lh_night_diff_overlapp,0)),2) as LH_ND"),
DB::raw("round(sum(drt_summary_report.lh_overtime),2) as LH_OT"), DB::raw("round(sum(drt_summary_report.lh_overtime_night_diff),2) as LH_OT_ND"),
DB::raw("round(sum(drt_summary_report.sh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.sh_rendered_hours_overlapp,0)) -sum(drt_summary_report.sh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.sh_night_diff_overlapp,0)),2) as SH_Render_Hr"), 
DB::raw("round(sum(drt_summary_report.sh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.sh_night_diff_overlapp,0)),2) as SH_ND"), 
DB::raw("round(sum(drt_summary_report.sh_overtime),2) as SH_OT"), DB::raw("round(sum(drt_summary_report.sh_overtime_night_diff),2) as SH_OT_ND"), 
DB::raw("round(sum(drt_summary_report.dsh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.dsh_rendered_hours_overlapp,0)) -sum(drt_summary_report.dsh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dsh_night_diff_overlapp,0)),2) as DSH_Render_HR"), 
DB::raw("round(sum(drt_summary_report.dsh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dsh_night_diff_overlapp,0)),2) as DSH_ND"), 
DB::raw("round(sum(drt_summary_report.dsh_overtime),2) as DSH_OT"), DB::raw("round(sum(drt_summary_report.dsh_overtime_night_diff),2) as DSH_OT_ND"), 
DB::raw("round(sum(drt_summary_report.dlh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.dlh_rendered_hours_overlapp,0)) -sum(drt_summary_report.dlh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dlh_night_diff_overlapp,0)),2) as DLH_Render_HR"), 
DB::raw("round(sum(drt_summary_report.dlh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dlh_night_diff_overlapp,0)),2) as DLH_ND"), 
DB::raw("round(sum(drt_summary_report.dlh_overtime),2) as DLH_OT"), 
DB::raw("round(sum(drt_summary_report.dlh_overtime_night_diff),2) as DLH_OT_ND"), 
DB::raw("round(sum(drt_summary_report.slh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.slh_rendered_hours_overlapp,0)) -sum(drt_summary_report.slh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.slh_night_diff_overlapp,0)),2) as SLH_Render_HR"), 
DB::raw("round(sum(drt_summary_report.slh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.slh_night_diff_overlapp,0)),2) as SLH_ND"), 
DB::raw("round(sum(drt_summary_report.slh_overtime),2) as SLH_OT"), DB::raw("round(sum(drt_summary_report.slh_overtime_night_diff),2) as SLH_OT_ND")) ->join('users','users.id','=','drt_summary_report.user_id')
             ->join('departments', 'users.department_id', '=', 'departments.id');
             if( is_valid( $user_sup_id ) ){
		        $result->join('users_supervisors','users_supervisors.user_id','=','drt_summary_report.user_id');
                $result->where('users_supervisors.supervisor_id','=',$user_sup_id);
             }
             $result->whereBetween('drt_summary_report.login_date', [$request->valid_from, $request->valid_to]);
             
              
             
            if( is_valid( $request->department_id ) ){
                $result->where('users.department_id','=' ,$request->department_id );
            } else {
                $result->whereRaw('users.department_id IS NOT NULL');
            }

            if( is_valid( $request->name ) ){
                $result->whereRaw('(first_name like ? OR middle_name like ? OR last_name like ?)', array('%'.trim( $request->name ).'%', '%'.trim( $request->name ).'%', '%'.trim( $request->name ).'%' ));
            }
           $result->whereRaw('(is_active = ' . (is_valid($request->is_active) ? $request->is_active : '1') .' or termination_date BETWEEN "'. $request->valid_from .'" AND "'. $request->valid_to .'")')
            ->groupBy('users.first_name','users.middle_name','users.last_name','users.emp_num','users.email','users.username','users.id');
         



            if (is_valid($request->page)) {
                // $result_to_page= $result->orderBy('departments.department_name')->orderby('users.date_hired', 'DESC')->orderBy('users.last_name', 'asc')->orderBy('users.first_name', 'asc')->paginate(100);
                $result_to_page= $result->orderBy('departments.department_name')->orderby('users.date_hired', 'DESC')->orderBy('users.last_name', 'asc')->orderBy('users.first_name', 'asc')->get();

            }else{
                $result_to_page= $result->orderBy('departments.department_name')->orderby('users.date_hired', 'DESC')->orderBy('users.last_name', 'asc')->orderBy('users.first_name', 'asc');
            }
         
   
        
            //  $current_page = $result_to_page->currentPage();
            //  $last_page = $result_to_page->lastPage();
             $current_page = 1;
             $last_page = 1;
             foreach($result_to_page as $user) {
                array_push($user_collection_paginated, $user);
            }
           
            $report = $user_collection_paginated;
             if($report == NULL || empty($report)) {
                return response()->json(["message" => "Not Found"],404);                
             }
             $response = [];
             $response['current_page'] = $current_page;
             $response['last_page'] = $last_page;
             $response['has_next_page'] = $current_page < $last_page;
             $response['dtrItems'] =  $report;

            return success_response(
                trans('messages.' . __FUNCTION__ . '_success'),
                $response
            );
            

     
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        }
    }




}








