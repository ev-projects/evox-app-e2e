<?php

namespace App\Modules\Report\Http\Controllers;

use Exception;
use LDAP\Result;
use Carbon\Carbon;

use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use App\Exports\ExportDTRLog;
use App\Exports\DtrSummaryExport;
use App\Modules\User\Models\User;
use Illuminate\Http\JsonResponse;
use App\Exports\ExportDTRMismatch;
use Illuminate\Support\Facades\DB;
use App\Exports\TeamScheduleExport;
use App\Modules\Payroll\Models\Dtr;
use App\Exports\NewExportDTRSummary;
use App\Exports\TimeoffAllocationExport;
use App\Exports\TimeoffAllocationExportNew;
use App\Exports\TimeoffAllocationExportN;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;
use App\Modules\Payroll\Models\Holiday;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use App\Exports\TeamSummaryAttendanceExport;
use Illuminate\Database\Eloquent\Collection;
use App\Exports\EmployeeAttendanceReportExport;
use App\Exports\ExportDTRMultiLogsSummary;
use App\Modules\Payroll\Resources\DtrLogResource;
use App\Modules\Payroll\Resources\HolidayResource;
use App\Modules\Payroll\Resources\DtrHalfDayMismacth;
use App\Exports\TeamSummaryAttendanceMultiSheetExport;
use App\Modules\Payroll\Resources\AnniversaryResources;
use App\Modules\Report\Resources\DailyScheduleReources;
use App\Modules\Report\Resources\NewDtrSummaryResource;
use App\Modules\Report\Resources\TeamScheduleResources;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
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
     * Returns the DTR Summary of the User by the User ID as Parameter with the Date Range.
     * @return \Illuminate\Http\JsonResponse
     */
    public function export_team_dtr_summary(Request $request)
    {
        $user_collection_paginated = [];
        $user_collection = $this->user->get_users_under_supervisee($request,  $request->valid_from, $request->valid_to);
        $current_page = $user_collection->currentPage();
        $last_page = $user_collection->lastPage();
        foreach ($user_collection as $user) {
            array_push($user_collection_paginated, $user);
        }
        $for_export = $this->report->get_dtr_summary(new Collection($user_collection_paginated),  $request->valid_from, $request->valid_to);
        $content_array = $for_export['summary'];
        if ($current_page == 1) { # create empty file
            Storage::disk('local')->put('app/export/dtrsummary.temp', json_encode($content_array));
        } else { # append to file
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
     * Returns the DTR Logs User's Team.
     * @return \Illuminate\Http\JsonResponse
     */
    public function team_dtr_logs(Request $request)
    {
        try {
            $me = auth()->user();
            $my_timezone = $me->country_timezone_name();

            $result_sets = call_sp('EH_SP_DTR_Logs', [2, $me->id, $me->LevelId, $request->department_id, $request->is_active, isset($request->name) ? $request->name : '', $request->valid_from, $request->valid_to]);
            $dtr_logs = $result_sets[0];
            $dtr_holidays = $result_sets[1];
            $results = [];
            foreach ($dtr_logs as $dtr_log) {
                $pov_timezone = $dtr_log->timezone;
                $holidays = [];
                foreach(array_filter($dtr_holidays, function($h) use ($dtr_log) {
                    return $h->dtr_id == $dtr_log->dtr_id;
                }) as $fh) {
                    array_push($holidays, array('name' => $fh->name, 'type' => $fh->type));
                }
                $results[] = array(
                    'id' => $dtr_log->dtr_id,
                    'emp_num' => $dtr_log->Employee_Number,
                    'user_id' => $dtr_log->user_id,
                    'date' => $dtr_log->date,
                    'time_in' => apply_timezone($dtr_log->time_in, $my_timezone, 'H:i:s'),
                    'time_out' => apply_timezone($dtr_log->time_out, $my_timezone, 'H:i:s'),
                    'start_datetime' => apply_timezone($dtr_log->start_datetime, $my_timezone, 'H:i:s'),
                    'end_datetime' => apply_timezone($dtr_log->end_datetime, $my_timezone, 'H:i:s'),
                    'start_flexy_datetime' => apply_timezone($dtr_log->start_flexy_datetime, $my_timezone, 'H:i:s'),
                    'end_flexy_datetime' => apply_timezone($dtr_log->end_flexy_datetime, $my_timezone, 'H:i:s'),
                    'break_time' => is_valid( $dtr_log->break_time ) && $dtr_log->break_time > 0 ? seconds_to_time( $dtr_log->break_time ) : null,
                    'is_rest_day' => $dtr_log->is_rest_day,
                    'department' => $dtr_log->Department_Name,
                    'full_name' => $dtr_log->Employee_Name,
                    'payroll_items' => array(
                        'late' => $dtr_log->late > 0 ? seconds_to_time(round($dtr_log->late * 3600),true):"",
                        'undertime' => $dtr_log->undertime > 0 ? seconds_to_time(round($dtr_log->undertime * 3600),true):"",
                        'overtime' => $dtr_log->overtime > 0 ? seconds_to_time(round($dtr_log->overtime * 3600),true):"",
                        'overtime_night_diff' => $dtr_log->overtime_night_diff > 0 ? seconds_to_time(round($dtr_log->overtime_night_diff * 3600),true):"",
                        'night_diff' => $dtr_log->night_diff > 0 ? seconds_to_time(round($dtr_log->night_diff * 3600),true):"",
                        'ul' => $dtr_log->ul > 0 ? round($dtr_log->ul):"",
                        'rendered_hours' => $dtr_log->rendered_hours > 0 ? seconds_to_time(round($dtr_log->rendered_hours * 3600),true):"",
                        'other_leave' => ($dtr_log->leave_type !== null && $dtr_log->amount > 0) ? "{$dtr_log->leave_type}({$dtr_log->amount})" : null,
                    ),
                    'timezone' => $dtr_log->country_time_zone,
                    'holidays' => $holidays,
                    'user_POV' => array(
                        'time_in' => apply_timezone($dtr_log->time_in, $pov_timezone, 'H:i:s'),
                        'time_out' => apply_timezone($dtr_log->time_out, $pov_timezone, 'H:i:s'),
                        'start_datetime' => apply_timezone($dtr_log->start_datetime, $pov_timezone, 'H:i:s'),
                        'end_datetime' => apply_timezone($dtr_log->end_datetime, $pov_timezone, 'H:i:s'),
                        'start_flexy_datetime' => apply_timezone($dtr_log->start_flexy_datetime, $pov_timezone, 'H:i:s'),
                        'end_flexy_datetime' => apply_timezone($dtr_log->end_flexy_datetime, $pov_timezone, 'H:i:s'),
                    )
                );
            }

            return success_response(
                trans('messages.' . __FUNCTION__ . '_success'),
                ['data' => $results]
            );
        } catch (Exception $e) {
            log_to_file( 'error', $e->getMessage(), [$e], "dtr");
            return error_response(trans('messages.error_default'));
        }
    }

    /**
     * Returns the DTR Summary of the User by the User ID as Parameter with the Date Range.
     * @return \Illuminate\Http\JsonResponse
     */
    public function export_team_dtr_logs(Request $request)
    {
        $me = auth()->user();
        $my_timezone = $me->country_timezone_name();
        $result_sets = call_sp('EH_SP_DTR_Logs', [2, $me->id, $me->LevelId, $request->department_id, $request->is_active, isset($request->name) ? $request->name : '', $request->valid_from, $request->valid_to]);
        $toggle_POV = !($request->toggle_pov == null);
        $dtr_logs = $result_sets[0];
        $dtr_holidays = $result_sets[1];
        $results = [];
        foreach ($dtr_logs as $dtr_log) {
            $pov_timezone = $dtr_log->timezone;
            $holidays = [];
            foreach(array_filter($dtr_holidays, function($h) use ($dtr_log) {
                return $h->dtr_id == $dtr_log->dtr_id;
            }) as $fh) {
                array_push($holidays, array('name' => $fh->name, 'type' => $fh->type));
            }
            $results[] = array(
                'id' => $dtr_log->dtr_id,
                'emp_num' => $dtr_log->Employee_Number,
                'user_id' => $dtr_log->user_id,
                'date' => $dtr_log->date,
                'time_in' => apply_timezone($dtr_log->time_in, $my_timezone, 'H:i:s'),
                'time_out' => apply_timezone($dtr_log->time_out, $my_timezone, 'H:i:s'),
                'start_datetime' => apply_timezone($dtr_log->start_datetime, $my_timezone, 'H:i:s'),
                'end_datetime' => apply_timezone($dtr_log->end_datetime, $my_timezone, 'H:i:s'),
                'start_flexy_datetime' => apply_timezone($dtr_log->start_flexy_datetime, $my_timezone, 'H:i:s'),
                'end_flexy_datetime' => apply_timezone($dtr_log->end_flexy_datetime, $my_timezone, 'H:i:s'),
                'break_time' => is_valid( $dtr_log->break_time ) && $dtr_log->break_time > 0 ? seconds_to_time( $dtr_log->break_time ) : null,
                'is_rest_day' => $dtr_log->is_rest_day,
                'department' => $dtr_log->Department_Name,
                'full_name' => $dtr_log->Employee_Name,
                'payroll_items' => array(
                    'late' => $dtr_log->late > 0 ? seconds_to_time(round($dtr_log->late * 3600),true):"",
                    'undertime' => $dtr_log->undertime > 0 ? seconds_to_time(round($dtr_log->undertime * 3600),true):"",
                    'overtime' => $dtr_log->overtime > 0 ? seconds_to_time(round($dtr_log->overtime * 3600),true):"",
                    'overtime_night_diff' => $dtr_log->overtime_night_diff > 0 ? seconds_to_time(round($dtr_log->overtime_night_diff * 3600),true):"",
                    'night_diff' => $dtr_log->night_diff > 0 ? seconds_to_time(round($dtr_log->night_diff * 3600),true):"",
                    'ul' => $dtr_log->ul > 0 ? round($dtr_log->ul):"",
                    'rendered_hours' => $dtr_log->rendered_hours > 0 ? seconds_to_time(round($dtr_log->rendered_hours * 3600),true):"",
                    'other_leave' => ($dtr_log->leave_type !== null && $dtr_log->amount > 0) ? "{$dtr_log->leave_type}({$dtr_log->amount})" : null,
                ),
                'timezone' => $pov_timezone,
                'holidays' => $holidays,
                'user_POV' => array(
                    'time_in' => apply_timezone($dtr_log->time_in, $pov_timezone, 'H:i:s'),
                    'time_out' => apply_timezone($dtr_log->time_out, $pov_timezone, 'H:i:s'),
                    'start_datetime' => apply_timezone($dtr_log->start_datetime, $pov_timezone, 'H:i:s'),
                    'end_datetime' => apply_timezone($dtr_log->end_datetime, $pov_timezone, 'H:i:s'),
                    'start_flexy_datetime' => apply_timezone($dtr_log->start_flexy_datetime, $pov_timezone, 'H:i:s'),
                    'end_flexy_datetime' => apply_timezone($dtr_log->end_flexy_datetime, $pov_timezone, 'H:i:s'),
                )
            );
        }

        return Excel::download( new ExportDTRLog($results, $toggle_POV, $my_timezone), 'dtr_log.csv');
    }

    /**
     *  Responsible for fetching the Team's attendance
     * @return array
     */
    public function team_schedule(Request $request)
    {
        $date_from = Carbon::now();
        $logged_user = auth()->user();
        
                                $response = call_sp("EH_SP_Employee_List",[
                                    $logged_user->id, 
                                    is_valid(  $logged_user->LevelId ) ?  $logged_user->LevelId: null, # level
                                    $request->department_id,
                                    $request->department_id != null? $sub_department_id = $request->sub_department_id: null,
                                    1, # active
                                    $request->name, # name
                                    null, # job_title
                                    1,
                                    999,
                                    1      
                                    ]
                                ); 

                                $result = array(
                                    "query" =>  $response ?? [],
                                );
                                $empArrays = array_filter($result['query'], function($array) {

                       

                                    if(isset($array[0])){
                                
                                        return property_exists($array[0], 'Employee_Name');
                                
                                    }
                                
                                });
                                $empKeys = array_keys($empArrays);
                                $user_list = is_valid($empKeys)? $result['query'][$empKeys[0]] : [];
                       
                                $user_list =  User::whereIn('id', collect($user_list)->pluck('id')->all());
        $no_user_limit = get_constant("TEAM_SCHEDULE.records_per_date");

        # Filter by name string
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
                # Get Employee that is active or will be terminated in a certain time
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
                    return success_response(
                        trans('messages.' . __FUNCTION__ . '_success'),
                        new WeeklyScheduleResources($result, $show_more, $holiday_list, $user_collection)
                    );
                } else {
                    $result = $this->dtr->get_dtr_logs($user_collection, $time_from,  $time_to);
                    return success_response(
                        trans('messages.' . __FUNCTION__ . '_success'),
                        new TeamScheduleResources($result, $show_more, $holiday_list, $user_collection)
                    );
                }
            }
        }
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

            $bhr_holidays_array = [];

            $user = Auth::user();
            $EH_SP_Dashboard =  call_sp("EH_SP_Dashboard", [ $user->LevelId,$user->id,null, null,1]);
            
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $bhr_holidays_array, "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            return $EH_SP_Dashboard[1];
        } catch (Exception $e) {
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

            # Start date as the start of the payroll cutoff
            $start_date = $payroll_cutoff->start_date;

            # End date as the date yesterday.
            $end_date = Carbon::yesterday()->format('Y-m-d');
            

            return success_response(
                trans('messages.get_my_dtr_notifications_success'),
                new MyDtrNotificationsResource($this->report->get_my_dtr_notifications($start_date, $end_date))
            );
        } catch (Exception $e) {
            log_to_file( 'error', $e->getMessage(), [$e], "dtr");
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
            $user = Auth::user();
            $EH_SP_Dashboard =  call_sp("EH_SP_Dashboard", [ $user->LevelId,$user->id,null, null,2]);
            return success_response(
                trans('messages.get_anniversary_birthday_success'),
                $EH_SP_Dashboard[0]
            );
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
            $me = Auth::user();
            $report = array(
                'stdd' => $start_date,
                'eddd' => $end_date
            );

            $department_ids = $request->selectedDepartments ? implode(',', $request->selectedDepartments) : null;
            if ($department_ids === null) {
                return response()->json(['error' => ['message' => "Please selecte at least one department.", 'content' => "No department selected"]], 400);
            }
            $team_ids = $request->selectedTeams ? implode(',', $request->selectedTeams) : null;

            $attendance = call_sp('EH_SP_Attendance_Summary', [$start_date, $end_date, $department_ids, $team_ids, $request->name, $me->id, 2, 1]);
            $attendance_stats = $attendance[0][0];
            $attendance_list = $attendance[1];
            $attendance_list_items = [];
            foreach($attendance_list as $i) {
                array_push($attendance_list_items, array(
                    'date'=> $i->LogDate,
                    'user_id' => $i->Id,
                    'name' => $i->Name,
                    'emp_num' => $i->EmployeeNumber,
                    'job_title' => $i->JobTittle,
                    'schedule' => [],
                    'hours' => null,
                    'status' => $i->Status
                ));
            }
            $report['total_headcount'] = $attendance_stats->TotalCount;
            $report['attendance'] = array(
                'total_count' => $attendance_stats->TotalCount,
                'total_percentage' => $attendance_stats->AttendancePercent,
                'target_percentage' => 95,
                'users' => $attendance_list_items
            );
            $pl = call_sp('EH_SP_Attendance_Summary', [$start_date, $end_date, $department_ids, $team_ids, $request->name, $me->id, 2, 2]);
            $pl_stats = $pl[0][0];
            $pl_list = $pl[1];
            $pl_list_items = [];
            foreach($pl_list as $i) {
                array_push($pl_list_items, array(
                    'date'=> $i->LogDate,
                    'user_id' => $i->Id,
                    'name' => $i->Name,
                    'emp_num' => $i->EmployeeNumber,
                    'job_title' => $i->JobTittle,
                    'schedule' => [],
                    'hours' => null,
                    'status' => $i->Status
                ));
            }
            $report['planned_leaves'] = array(
                'total_count' => $pl_stats->PlannedLeaveCount,
                'total_percentage' => $pl_stats->PlannedLeavePercent,
                'target_percentage' => 7,
                'users' => $pl_list_items
            );
            $upl = call_sp('EH_SP_Attendance_Summary', [$start_date, $end_date, $department_ids, $team_ids, $request->name, $me->id, 2, 3]);
            $upl_stats = $upl[0][0];
            $upl_list = $upl[1];
            $upl_list_items = [];
            foreach($upl_list as $i) {
                array_push($upl_list_items, array(
                    'date'=> $i->LogDate,
                    'user_id' => $i->Id,
                    'name' => $i->Name,
                    'emp_num' => $i->EmployeeNumber,
                    'job_title' => $i->JobTittle,
                    'schedule' => [],
                    'hours' => null,
                    'status' => $i->Status
                ));
            }
            $report['unplanned_leaves'] = array(
                'total_count' => $upl_stats->UnplannedLeaveCount,
                'total_percentage' => $upl_stats->UnplannedLeavePercent,
                'target_percentage' => 3,
                'users' => $upl_list_items
            );
            $rdw = call_sp('EH_SP_Attendance_Summary', [$start_date, $end_date, $department_ids, $team_ids, $request->name, $me->id, 2, 4]);
            $rdw_stats = $rdw[0][0];
            $rdw_list = $rdw[1];
            $report['total_rest_day_work'] = array(
                'total_count' => $rdw_stats->RDWCount,
                'total_hours' => $rdw_stats->RDWHours
            );
            $ot = call_sp('EH_SP_Attendance_Summary', [$start_date, $end_date, $department_ids, $team_ids, $request->name, $me->id, 2, 5]);
            $o_stats = $ot[0][0];
            $ot_list = $ot[1];
            $report['total_overtime'] = array(
                'total_count' => $rdw_stats->OTCount,
                'total_hours' => $rdw_stats->OTHours
            );
            return success_response(
                trans('messages.get_attendance_summary_success'),
                $report
            );
        } catch (Exception $e) {
            log_to_file( 'error', $e->getMessage(), [$e], "summary_errors");
            return error_response(trans('messages.error_default'), $e);
        }
    }

    /**
     * Return
     * @return \Illuminate\Http\JsonResponse
     */
    public function export(Request $request, $start_date, $end_date)
    {
        try {
            $this->validate(new Request([
                'start_date' => $start_date,
                'end_date' => $end_date,
            ]), [
                'start_date' => 'date_format:Y-m-d',
                'end_date' => 'date_format:Y-m-d',
            ]);
            $me = Auth::user();
            $department_ids = $request->selectedDepartments ?? null;
            if ($department_ids === null) {
                return response()->json(['error' => ['message' => "Please selecte at least one department.", 'content' => "No department selected"]], 400);
            }
            $team_ids = $request->selectedTeams ?? null;
            $attendance_summary = call_sp('EH_SP_Attendance_Summary', [$start_date, $end_date, $department_ids, $team_ids, $request->name, $me->id, 3, null]);
            $attendance_list = $attendance_summary[0];
            $attendance_stats = $attendance_summary[1];
            $response = Excel::download(
                new EmployeeAttendanceReportExport($attendance_list, $attendance_stats, $start_date, $end_date),
                'attendance_rep.xlsx',
                \Maatwebsite\Excel\Excel::XLSX,
                ["sampleName" => 'sample']
    
            );
            ob_end_clean();
    
            return $response;
        } catch (Exception $e) {
            log_to_file( 'error', $e->getMessage(), [$e], "summary_errors");
            return success_response(
                "No report data found.",
                []
            );
        }
    }

    /**
     * Returns the computed DTR Summary list
     * @return \Illuminate\Http\JsonResponse
     */
    public function new_dtr_summary_report_csv_export(Request $request)
    {
        try {
            $me = Auth::user();
            $user_sup_id = $me->id;
            if($request->sup_id){
                $user_sup_id = $request->sup_id;
            }
            $result_sets = call_sp('EH_SP_DTR_Summary_Report', [$user_sup_id, $me->LevelId, $request->department_id, $request->is_active, isset($request->name) ? $request->name : '', $request->valid_from, $request->valid_to]);
            $user_dtr = $result_sets[1];
            $report = [];
            foreach($user_dtr as $dtr) {
                $report[] = array(
                    "Employee_Name" => $dtr->Employee_Name,
                    "Employee_Number" => $dtr->Employee_Number,
                    "Department" => $dtr->Department_Name,
                    "UL" => $dtr->UL,
                    "Leaves" => $dtr->Leaves,
                    "Late" => $dtr->Late,
                    "Under_Time" => $dtr->Under_Time,
                    "Render_Hr" => $dtr->Render_Hr,
                    "Night_Diff" => $dtr->Night_Diff,
                    "OverTime" => $dtr->OverTime,
                    "OT_ND" => $dtr->OT_ND,
                    "RD_Render_HR" => $dtr->RD_Render_HR,
                    "RD_ND" => $dtr->RD_ND,
                    "RD_OT" => $dtr->RD_OT,
                    "RD_OT_ND" => $dtr->RD_OT_ND,
                    "LH_Render_HR" => $dtr->LH_Render_HR,
                    "LH_ND" => $dtr->LH_ND,
                    "LH_OT" => $dtr->LH_OT,
                    "LH_OT_ND" => $dtr->LH_OT_ND,
                    "SH_Render_Hr" => $dtr->SH_Render_Hr,
                    "SH_ND" => $dtr->SH_ND,
                    "SH_OT" => $dtr->SH_OT,
                    "SH_OT_ND" => $dtr->SH_OT_ND,
                    "DSH_Render_HR" => $dtr->DSH_Render_HR,
                    "DSH_ND" => $dtr->DSH_ND,
                    "DSH_OT" => $dtr->DSH_OT,
                    "DSH_OT_ND" => $dtr->DSH_OT_ND,
                    "DLH_Render_HR" => $dtr->DLH_Render_HR,
                    "DLH_ND" => $dtr->DLH_ND,
                    "DLH_OT" => $dtr->DLH_OT,
                    "DLH_OT_ND" => $dtr->DLH_OT_ND,
                    "SLH_Render_HR" => $dtr->SLH_Render_HR,
                    "SLH_ND" => $dtr->SLH_ND,
                    "SLH_OT" => $dtr->SLH_OT,
                    "SLH_OT_ND" => $dtr->SLH_OT_ND
                );
            }
            return Excel::download(new NewExportDTRSummary($report), 'newdtrsummary.csv');

        } catch (Exception $e) {
            log_to_file( 'error', $e->getMessage(), [$e], "dtr_summary");
            return error_response(trans('messages.error_default'), $e);
        }
    }

    public function new_dtr_summary_report(Request $request)
    {
        try {    
            $me = Auth::user();       
            $user_sup_id = $me->id;
            if($request->sup_id){
                $user_sup_id = $request->sup_id;
            }
            $result_sets = call_sp('EH_SP_DTR_Summary_Report', [$user_sup_id, $me->LevelId, $request->department_id, $request->is_active, isset($request->name) ? $request->name : '', $request->valid_from, $request->valid_to]);
            $user_dtr = $result_sets[1];
            $report = [];
            foreach($user_dtr as $dtr) {
                $report[] = array(
                    "Employee_Name" => $dtr->Employee_Name,
                    "Employee_Number" => $dtr->Employee_Number,
                    "Department" => $dtr->Department_Name,
                    "UL" => $dtr->UL,
                    "Leaves" => $dtr->Leaves,
                    "Late" => $dtr->Late,
                    "Under_Time" => $dtr->Under_Time,
                    "Render_Hr" => $dtr->Render_Hr,
                    "Night_Diff" => $dtr->Night_Diff,
                    "OverTime" => $dtr->OverTime,
                    "OT_ND" => $dtr->OT_ND,
                    "RD_Render_HR" => $dtr->RD_Render_HR,
                    "RD_ND" => $dtr->RD_ND,
                    "RD_OT" => $dtr->RD_OT,
                    "RD_OT_ND" => $dtr->RD_OT_ND,
                    "LH_Render_HR" => $dtr->LH_Render_HR,
                    "LH_ND" => $dtr->LH_ND,
                    "LH_OT" => $dtr->LH_OT,
                    "LH_OT_ND" => $dtr->LH_OT_ND,
                    "SH_Render_Hr" => $dtr->SH_Render_Hr,
                    "SH_ND" => $dtr->SH_ND,
                    "SH_OT" => $dtr->SH_OT,
                    "SH_OT_ND" => $dtr->SH_OT_ND,
                    "DSH_Render_HR" => $dtr->DSH_Render_HR,
                    "DSH_ND" => $dtr->DSH_ND,
                    "DSH_OT" => $dtr->DSH_OT,
                    "DSH_OT_ND" => $dtr->DSH_OT_ND,
                    "DLH_Render_HR" => $dtr->DLH_Render_HR,
                    "DLH_ND" => $dtr->DLH_ND,
                    "DLH_OT" => $dtr->DLH_OT,
                    "DLH_OT_ND" => $dtr->DLH_OT_ND,
                    "SLH_Render_HR" => $dtr->SLH_Render_HR,
                    "SLH_ND" => $dtr->SLH_ND,
                    "SLH_OT" => $dtr->SLH_OT,
                    "SLH_OT_ND" => $dtr->SLH_OT_ND
                );
            }
            $response = [];
            $response['current_page'] = 1;
            $response['last_page'] = 1;
            $response['has_next_page'] = false;
            $response['dtrItems'] =  $report;

            return success_response(
                trans('messages.' . __FUNCTION__ . '_success'),
                $response
            );
     
        } catch (Exception $e) {
            log_to_file( 'error', $e->getMessage(), [$e], "dtr_summary");
            return error_response(trans('messages.error_default'), $e);
        }
    }

    public function dtr_multi_logs_summary_report(Request $request)
    {
        try {    
            $me = Auth::user();
            if (!is_valid($request->department_id)) {
                return error_response("Please select a department", array());
            }
            $result_sets = call_sp('EV_SP_Multi_Quick_Punch_Report', [$request->valid_from, $request->valid_to, $request->department_id, $me->LevelId, $me->id]);
            $user_dtr = $result_sets[0];
            $report = [];
            foreach($user_dtr as $dtr) {
                $report[] = array(
                    "Employee_Name" => $dtr->Employee_Name,
                    "Employee_Number" => $dtr->Employee_Number,
                    "Department" => $dtr->Department_Name,
                    "Date" => $dtr->date,
                    "Total_Hours" => $dtr->duration_hr,
                    "Rendered_Hr" => $dtr->render_hr,
                    "Night_Diff" => $dtr->night_diff_hr,
                    "Project_Name" => $dtr->project_name
                );
            }
            $response = [];
            $response['current_page'] = 1;
            $response['last_page'] = 1;
            $response['has_next_page'] = false;
            $response['dtrItems'] =  $report;

            return success_response(
                trans('messages.' . __FUNCTION__ . '_success'),
                $response
            );
        } catch (Exception $e) {
            log_to_file( 'error', $e->getMessage(), [$e], "dtr_summary");
            return error_response(trans('messages.error_default'), $e);
        }
    }
    
    public function dtr_multi_logs_summary_report_csv_export(Request $request)
    {
        try {
            $me = Auth::user();
            if (!is_valid($request->department_id)) {
                return error_response("Please select a department", array());
            }
            $result_sets = call_sp('EV_SP_Multi_Quick_Punch_Report', [$request->valid_from, $request->valid_to, $request->department_id, $me->LevelId, $me->id]);
            $user_dtr = $result_sets[0];
            $report = [];
            foreach($user_dtr as $dtr) {
                $report[] = array(
                    "Employee_Name" => $dtr->Employee_Name,
                    "Employee_Number" => $dtr->Employee_Number,
                    "Department" => $dtr->Department_Name,
                    "Date" => $dtr->date,
                    "Total_Hours" => $dtr->duration_hr,
                    "Render_Hr" => $dtr->render_hr,
                    "Night_Diff" => $dtr->night_diff_hr,
                    "Project_Name" => $dtr->project_name
                );
            }
            return Excel::download(new  ExportDTRMultiLogsSummary($report), 'dtrmultilogssummary.csv');
        } catch (Exception $e) {
            log_to_file( 'error', $e->getMessage(), [$e], "dtr_summary");
            return error_response(trans('messages.error_default'), $e);
        }
    }

    # Export HalfDay Conflit Report
    public function dtr_half_day_mismatch( Request $request ){   
        try {
          return $result = DB::select('call Half_Day_Conflict_Report("'.$request->valid_from.'", "'.$request->valid_to.'")');

        }catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function dtr_conflict_report(Request $request)
    {
        try {       
            $user_collection_paginated = [];    
         
             $result = DB::select('call Half_Day_Conflict_Report("'.$request->valid_from.'", "'.$request->valid_to.'")');
             $current_page = 1;
             $last_page = 1;
             foreach($result as $user) {
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
                $response,
            );
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        }
    }

    public function timeoff_allocation_report(Request $request)
    {
        try {    
            if ($request->country == 1) {
                $result_sets = call_sp('EVOX_PAYROLL_REPORT', [$request->timeoff_month,$request->timeoff_year]);
                $user_timeoff = $result_sets[0];
                $user_timeoff_new = $result_sets[1];
                
                if($request->export == 1){
                    if($request->timeoff_month - 1 == 0){
                        $previous_mon = 12;
                    }else{
                        $previous_mon = $request->timeoff_month - 1;
                    }
                
                    $current_mon = $request->timeoff_month;
                    $previous_mon_name = date('F', strtotime("2000-".$previous_mon."-01"));
                    $current_mon_name = date('F', strtotime("2000-".$current_mon."-01"));
                    $date = Carbon::create($request->timeoff_year, $request->timeoff_month, 1);
                    $daysInMonth = $date->daysInMonth;
                    $columns_set = ["Sno", "Employee No", "Employee Name", "Employment Status", "Account", "Status", "Start Date", "Present Days", "Paid", "LWP", "Max Lv Eligible", "Paid", "LWP", "Clos. Bal"];

                    $response =  Excel::download(
                        new TimeoffAllocationExport($result_sets[0],$result_sets[1],$previous_mon_name,$current_mon_name,$daysInMonth, $columns_set, $request->timeoff_year, $request->country),
                        'IndianPayroll.csv'
                    );
                return $response;
                }else{
                $report = [];
                $report1 = [];
                $newrow = 0;
                foreach($user_timeoff as $timeoff) {
                    $report[] = array(
                        "Sno" => $timeoff->Sno,
                        "Employee_Name" => $timeoff->Employee_Name,
                        "Employee_status" => $timeoff->Employment_Status,
                        "Account" => $timeoff->Account,
                        "startdate" =>$timeoff->HireDate,
                        "presentdays" =>$timeoff->PresentDays,
                        "AvaiPaid" => $timeoff->Paid_Leave,
                        "AvaiLWP" => $timeoff->LWP_Leave,
                        "MaxLv" => $timeoff->Max_Leave_Eligible,
                        "PrePais" => $timeoff->Pre_LWP_Leave,
                        "PreLWP" => $timeoff->Pre_LWP_Leave,
                        "CloseBal"=> $timeoff->Close_Leave_Balance,
                        "NewHire" => 0,
                    );
                }
                foreach($user_timeoff_new as $timeoff) {
                    $newhire = 1;
                    $newrow  == 0 ? $newhire = 1 : $newhire = 0;
                    $report1[] = array(
                        "Sno" => $timeoff->Sno,
                        "Employee_Name" => $timeoff->Employee_Name,
                        "Employee_status" => $timeoff->Employment_Status,
                        "Account" => $timeoff->Account,
                        "startdate" =>$timeoff->HireDate,
                        "presentdays" =>$timeoff->PrsentDays,
                        "AvaiPaid" => $timeoff->Paid_Leave,
                        "AvaiLWP" => $timeoff->LWP_Leave,
                        "MaxLv" => $timeoff->Max_Leave_Eligible,
                        "PrePais" => $timeoff->Pre_LWP_Leave,
                        "PreLWP" => $timeoff->Pre_LWP_Leave,
                        "CloseBal"=> $timeoff->Close_Leave_Balance,
                        "NewHire" => $newhire,
                    );
                    $newrow = 1;
                }

                    $final_report = array_merge($report,$report1);

                    $response = [];
                    $response['timeoffItems'] =  $report ;
                    $response['timeoffItemsnew'] = $report1;
                    return success_response(
                        trans('messages.' . __FUNCTION__ . '_success'),
                        $response
                    );
                }
            } elseif ($request->country == 4) {
                $results = call_sp('EH_SP_Morocco_DTR_Summary_Report', [$request->timeoff_month, $request->timeoff_year, $request->department, 2]);

                if($request->export == 1){
                    if($request->timeoff_month - 1 == 0){
                        $previous_mon = 12;
                    }else{
                        $previous_mon = $request->timeoff_month - 1;
                    }

                    $current_mon = $request->timeoff_month;
                    $previous_mon_name = date('F', strtotime("2000-".$previous_mon."-01"));
                    $current_mon_name = date('F', strtotime("2000-".$current_mon."-01"));
                    $date = Carbon::create($request->timeoff_year, $request->timeoff_month, 1);
                    $daysInMonth = $date->daysInMonth;
                    $columns_set = ["Employee No", "Last Name", "First Name", "Department", "Hire Date", "Last Work Date", "Total Working Days", "Employee Status", "Lates", "Late Hours", "Undertime Hours", "UL", "Paid Leaves", "Sick Leave", "Paid Holiday", "Regular OverTime", "Regular OverTime NightDiff", "Rest Day Work", "Rest Day Work NightDiff", "Rest Day OverTime", "Rest Day OverTime NightDiff", "Legal Holiday OverTime", "Legal HoliDay OverTime NightDiff", "Special HoliDay OverTime", "Special HoliDay OverTime NightDiff", "Double Special HoliDay OverTime", "Double Special HoliDay OverTime NightDiff", "Double Legal Holiday OverTime", "Double Legal Holiday OverTime NightDiff", "Special Legal HoliDay OverTime", "Special Legal HoliDay OverTime NightDiff"];

                    $response =  Excel::download(
                        new TimeoffAllocationExport($results[0], null, $previous_mon_name, $current_mon_name, $daysInMonth, $columns_set, $request->timeoff_year, $request->country),
                        'MoroccoPayroll.csv'
                    );
                    return $response;
                } else {
                    $response = [
                        'reports' => $results[0]
                    ];
                    return success_response(
                        trans('messages.' . __FUNCTION__ . '_success'),
                        $response,
                    );
                }
            }
        } catch (Exception $e) {
            log_to_file( 'error', $e->getMessage(), [$e], "dtr_summary");
            return error_response(trans('messages.error_default'), $e);
        }
    }

    public function getMoroccoPayrollParams()
    {
        try {   
            $result_sets = call_sp('EH_SP_Morocco_DTR_Summary_Report', [null, null, null, 1]);
            $response = [
                'month'         => $result_sets[1],
                'year'          => $result_sets[2],
                'department'    => $result_sets[0]
            ];
            return $response;
        } catch (Exception $e) {
            log_to_file( 'error', $e->getMessage(), [$e], "morocco_payroll_params");
            return error_response(trans('messages.error_default'), $e);
        }
    }
}