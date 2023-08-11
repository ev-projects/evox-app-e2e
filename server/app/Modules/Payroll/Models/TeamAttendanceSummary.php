<?php

namespace App\Modules\Payroll\Models;


use App\Modules\User\Models\User;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Resources\TeamAttendanceResources;
use App\Modules\Payroll\Resources\TeamAttendanceSummaryResource;
use Carbon\Carbon;
use Exception;
use Illuminate\Database\Eloquent\Collection;

class TeamAttendanceSummary
{
    # Instance of the Summary
    private $result;

    /**
     *  Initialize the Structure of all the Data that would be returned by the Summary.
     */
    function __construct()
    {
        $this->clear_properties();
    }



    ###############################################################################################
    ######################################## Main function ########################################
    ###############################################################################################



    /**
     *  Main function for triggering the Computation of the Summary.
     * @param Collection $user_collection
     * @param string $start_date
     * @param string $end_date
     * @return array
     */
    public function get_summary(Collection $user_collection, string $start_date, string $end_date)
    {
        try {

            $this->clear_properties();



            $today = Carbon::now();
            $start_date = Carbon::parse($start_date);
            $end_date = Carbon::parse($end_date);
            $default_start_date = $start_date;
            $default_end_date = $end_date;

            // If the start date exceeds the current date, replace its value by today's date
            if ($start_date->gt($today)) {
                $start_date = $today;
            }

            // If the end date exceeds the current date, replace its value by today's date
            if ($end_date->gt($today)) {
                $end_date = $today;
            }

            // Iterate the User collection that was fetched
            foreach ($user_collection->sortBy('emp_num') as $user) {

                $start_date = $default_start_date;
                $end_date = $default_end_date;
                // Declare the variables for date hired and termination date to be used for conditions later.
                $date_hired = Carbon::parse($user->date_hired);
                $termination_date =
                    is_valid($user->termination_date) &&  ($date_hired->lt(Carbon::parse($user->termination_date)))
                    ? Carbon::parse($user->termination_date) : null;

                // Proceed only if the date hired of the user is before start date or between the date range AND
                // ...if termination date has NO value OR
                // ...if the termination date has value and it is after end date or between the date range.
                if (($date_hired->lt($start_date) || $date_hired->between($start_date, $end_date)) &&
                    (is_null($termination_date) ||
                        (is_valid($termination_date) &&
                            ($termination_date->gt($end_date) || $termination_date->between($start_date, $end_date))
                        )
                    )
                ) {

                    // Increment the total headcount
                    $this->result['total_headcount']++;

                    // If the date hired is between the date range, replace the start date's value by the date hired
                    // comment out because it chnages all the start date of aall emp
                    if ($date_hired->between($start_date, $end_date)) {
                        $start_date = $date_hired;
                    }

                    // If the termination date is between the date range, replace the end date's value by the termination date - 1 day for the final day
                    // change all date of end date termination date
                    if (is_valid($termination_date) && $termination_date->between($start_date, $end_date)) {
                        // $end_date = $termination_date->subDays(1);
                        $end_date = $termination_date;
                    }

                    $dtr_collection = $user->dtr($start_date->format('Y-m-d'), $end_date->format('Y-m-d'))->get();

                    $this->result['dtr_collection'] = $this->result['dtr_collection']->merge($dtr_collection);

                    // Fetch the User's DTR base from the final start and end date
                    foreach ($dtr_collection  as $dtr) {

                        // Fetch the approved leave of the DTR if there is any
                        $leave = $dtr->leaves()->where('status', 'approved')
                            ->where('amount', '>', 0)
                            ->first();

                        // Fetch the holidays
                        $holiday_collection = $dtr->holidays()->count();

                        // Fetch the Rest day work
                        $rest_day_work = $dtr->rest_day_work()->first();

                        // Fetch the Overtime
                        $overtime = $dtr->overtime()->first();

                        // Payroll Items
                        $payroll_items_collection = $dtr->payroll_items()->get();

                        // If the DTR has Schedule and there is an approved leave and its not from Unplanned leave types and amount is 1
                        // ...Or has a holiday and there is no timelogs.
                        if (
                            $dtr->hasSchedule()  &&
                            ((is_valid($leave)
                                && !in_array($leave->type, get_constant('UNPLANNED_LEAVE_TYPES'))
                                && (float) $leave->amount == 1
                            )
                                ||
                                ($holiday_collection > 0 && !$dtr->hasValidTimeLogs())
                            )
                        ) {
                            $this->result['planned_leaves']['total_count'] += 1;
                            // add user to the list
                            array_push($this->result['planned_leaves']['users'], $dtr);


                            // If the DTR has Schedule and there is an approved leave and its not from Unplanned leave types and amount is .5
                        } elseif (
                            $dtr->hasSchedule()  &&
                            (is_valid($leave)
                                && !in_array($leave->type, get_constant('UNPLANNED_LEAVE_TYPES'))
                                && (float) $leave->amount == 0.5
                            )
                        ) {
                            // If the DTR has Valid time logs, add .5 on the scheduled employees
                            if ($dtr->hasValidTimelogs()) {
                                // $this->result['scheduled_employees']['total_count'] += .5;
                                // add user to the list 
                                array_push($this->result['scheduled_employees']['users'], $dtr);

                                // If the DTR has NO Valid time logs, add .5 on the unplanned leaves and 1 on scheduled employees
                            } else {
                                // $this->result['unplanned_leaves']['total_count'] += .5;
                                $this->result['scheduled_employees']['total_count'] += 1;
                            }

                            // $this->result['planned_leaves']['total_count'] += .5;
                            array_push($this->result['planned_leaves']['users'], $dtr);

                            // If the DTR is considered absent or if there is an approved leave and its from the Unplanned leave types
                        } elseif ($dtr->isAbsent() || (is_valid($leave) && in_array($leave->type, get_constant('UNPLANNED_LEAVE_TYPES')))) {
                            $this->result['unplanned_leaves']['total_count'] += 1;
                            $this->result['scheduled_employees']['total_count'] += 1;
                            array_push($this->result['unplanned_leaves']['users'], $dtr);
                            array_push($this->result['scheduled_employees']['users'], $dtr);

                            // If the DTR has Schedule and the DTR type is regular OR if the DTR is holiday and it has valid time logs
                        } elseif (
                            $dtr->hasSchedule() &&
                            ($holiday_collection <= 0
                                ||
                                ($holiday_collection > 0 && $dtr->hasValidTimeLogs())
                            )
                        ) {
                            $allow_legal_holiday_policy = $dtr->get_policy_value('allow_legal_holiday');
                            $allow_special_holiday_policy = $dtr->get_policy_value('allow_special_holiday');

                            // If the current Holiday type is allowed by the DTR Policy put it to planned leave
                            if (($allow_legal_holiday_policy === null || $allow_legal_holiday_policy == true)
                                ||  ($allow_special_holiday_policy === null ||  $allow_special_holiday_policy == true)
                            ) {

                                // check if has has logs is < 5 or less than 5 put it in planned and scheduled
                                $rendered_hours = $dtr->getTotalRenderedTime() / 3600 % 24;

                                if ($rendered_hours > 5) {
                                    // array_push($this->result['planned_leaves']['users'],$dtr);
                                    // $this->result['planned_leaves']['total_count'] += 1;
                                    // $this->result['attendance']['total_count'] += 1;
                                    array_push($this->result['scheduled_employees']['users'], $dtr);
                                    $this->result['scheduled_employees']['total_count'] += 1;
                                } else {
                                    if ($rendered_hours == 0) {
                                        array_push($this->result['planned_leaves']['users'], $dtr);
                                        $this->result['planned_leaves']['total_count'] += 1;
                                    } else {
                                        array_push($this->result['scheduled_employees']['users'], $dtr);
                                        array_push($this->result['planned_leaves']['users'], $dtr);
                                        // $this->result['planned_leaves']['total_count'] += .5;
                                        // $this->result['scheduled_employees']['total_count'] += .5;
                                        // $this->result['attendance']['total_count'] += .5;
                                    }
                                }
                                // if not put the details to unplanned leave
                            } else {
                                // // check if has has logs is < 5 or less than 5 put it in unplanned and scheduled
                                $rendered_hours = $dtr->getTotalRenderedTime() / 3600 % 24;
                                if ($rendered_hours > 5) {
                                    array_push($this->result['scheduled_employees']['users'], $dtr);
                                    $this->result['scheduled_employees']['total_count'] += 1;
                                } else {

                                    if ($rendered_hours == 0) {
                                        array_push($this->result['unplanned_leaves']['users'], $dtr);
                                        $this->result['unplanned_leaves']['total_count'] += 1;
                                    } else {
                                        array_push($this->result['scheduled_employees']['users'], $dtr);
                                        array_push($this->result['unplanned_leaves']['users'], $dtr);
                                        array_push($this->result['attendance']['users'], $dtr);
                                        // $this->result['unplanned_leaves']['total_count'] += .5;
                                        $this->result['scheduled_employees']['total_count'] += 1;
                                    }
                                }
                            }
                        }

                        // If there is a approved Rest day work, count the instance
                        if (is_valid($rest_day_work) && $rest_day_work->isApproved()) {
                            $this->result['total_rest_day_work']['total_count'] += 1;
                            array_push($this->result['total_rest_day_work']['users'], $dtr);
                        }

                        // If there is a approved Overtime, count the instance
                        if (is_valid($overtime) && $overtime->isApproved()) {
                            $this->result['total_overtime']['total_count'] += 1;
                            array_push($this->result['total_overtime']['users'], $dtr);
                        }

                        foreach ($payroll_items_collection as $payroll_item) {

                            // If there is an approved rest day work and the current payroll item iterated is Rendered hours, add its value
                            if (
                                is_valid($rest_day_work) && $rest_day_work->isApproved()
                                && $payroll_item->item == get_constant('PAYROLL_ITEMS.rendered_hours')
                            ) {

                                $this->result['total_rest_day_work']['total_hours'] += (int) $payroll_item->value;
                            }

                            // If there is an approved overtime and the current payroll item iterated is overtime, add its value
                            if (
                                is_valid($overtime) && $overtime->isApproved()
                                &&  in_array($payroll_item->item, [
                                    get_constant('PAYROLL_ITEMS.overtime'),
                                    get_constant('PAYROLL_ITEMS.overtime_night_diff')
                                ])
                            ) {

                                $this->result['total_overtime']['total_hours'] += (int) $payroll_item->value;
                            }
                        };
                    }
                }
            }

            // If the total headcount has at least 1, proceed on computing the percentage.
            if ($this->result['total_headcount'] > 0) {
                // return $this->result['total_headcount'];
                // Computation for the total days 
                $total_days = $this->result['scheduled_employees']['total_count'] + $this->result['planned_leaves']['total_count'];
                $this->result['days'] = $total_days;
                // Computation for Scheduled Employee, Planned Leaves, and Unplanned Leaves if the total days are more than 0
                if ($total_days > 0) {
                    // return $total_days;
                    $this->result['scheduled_employees']['total_percentage'] = (float) number_format(($this->result['scheduled_employees']['total_count'] / $total_days) * 100, 2);
                    $this->result['planned_leaves']['total_percentage'] = (float) number_format(($this->result['planned_leaves']['total_count'] / $total_days) * 100, 2);
                    // 
                    // Computation for Attendance's total count and percentage.
                    $this->result['attendance']['total_count'] = $this->result['scheduled_employees']['total_count'] - $this->result['unplanned_leaves']['total_count'];
                    // \
                    // return $this->result['scheduled_employees']['total_count'];
                    if ($this->result['scheduled_employees']['total_count'] == 0) {
                        $this->result['attendance']['total_percentage'] = 0;
                        $this->result['unplanned_leaves']['total_percentage'] = 0;
                    } else {
                        $this->result['attendance']['total_percentage'] = (float) number_format(($this->result['attendance']['total_count'] / $this->result['scheduled_employees']['total_count']) * 100, 2);
                        $this->result['unplanned_leaves']['total_percentage'] = (float) number_format(($this->result['unplanned_leaves']['total_count'] / $this->result['scheduled_employees']['total_count']) * 100, 2);
                    }
                }


                // Parse the seconds to time for total rest day work and overtime data.
                $this->result['total_rest_day_work']['total_hours'] = seconds_to_time($this->result['total_rest_day_work']['total_hours'], true);
                $this->result['total_overtime']['total_hours'] = seconds_to_time($this->result['total_overtime']['total_hours'], true);


                foreach ($this->result['scheduled_employees']['users'] as $scheduled) {
                    $key = array_search($scheduled->id, array_column($this->result['unplanned_leaves']['users'], 'id'));
                    if ($key === false) {
                        array_push($this->result['attendance']['users'], $scheduled);
                    }
                }

                $this->result['dtr'] = $this->result['dtr_collection'];
                $this->result['total_list_count_dtr'] = $this->result['dtr_collection']->count();
                $this->result['dtr_collection'] = new TeamAttendanceSummaryResource($this->result['dtr_collection']);

                $this->result['scheduled_employees']['users'] = new TeamAttendanceSummaryResource($this->result['scheduled_employees']['users']);
                $this->result['unplanned_leaves']['users'] = new TeamAttendanceSummaryResource($this->result['unplanned_leaves']['users']);
                $this->result['planned_leaves']['users'] = new TeamAttendanceSummaryResource($this->result['planned_leaves']['users']);
                $this->result['attendance']['users'] = new TeamAttendanceSummaryResource($this->result['attendance']['users']);
                $this->result['total_rest_day_work']['users'] = new TeamAttendanceSummaryResource($this->result['total_rest_day_work']['users']);
                $this->result['total_overtime']['users'] = new TeamAttendanceSummaryResource($this->result['total_overtime']['users']);
                $this->result['stdd'] = $start_date->format('Y-m-d');
                $this->result['eddd'] = $end_date->format('Y-m-d');
            }

            return $this->result;
        } catch (Exception $e) {
            log_to_file('info', $e->getMessage(), [], "summary_errors");
            return error_response(trans('messages.error_default'), $e);
        }
    }




    /**
     *  Version 2 of Main function for triggering the Computation of the Summary.
     * @param Collection $user_collection
     * @param string $start_date
     * @param string $end_date
     * @return array
     */

    public function get_summary2(Collection $user_collection, string $start_date, string $end_date)
    {
        try {

            $this->clear_properties();



            $today = Carbon::now();
            $start_date = Carbon::parse($start_date);
            $end_date = Carbon::parse($end_date);
            $default_start_date = $start_date;
            $default_end_date = $end_date;
            $employee_list_summary = [];
            // If the start date exceeds the current date, replace its value by today's date
            if ($start_date->gt($today)) {
                $start_date = $today;
            }

            // If the end date exceeds the current date, replace its value by today's date
            if ($end_date->gt($today)) {
                $end_date = $today;
            }

            // Iterate the User collection that was fetched
            foreach ($user_collection->sortBy('emp_num') as $user) {

                $start_date = $default_start_date;
                $end_date = $default_end_date;

                $date_hired = Carbon::parse($user->date_hired);
                $termination_date =
                    is_valid($user->termination_date) &&  ($date_hired->lt(Carbon::parse($user->termination_date)))
                    ? Carbon::parse($user->termination_date) : null;


           
                

                    // Increment the total headcount
                    $this->result['total_headcount']++;

                    // If the date hired is between the date range, replace the start date's value by the date hired
                    // comment out because it chnages all the start date of aall emp
                    if ($date_hired->between($start_date, $end_date)) {
                        $start_date = $date_hired;
                    }

                    // If the termination date is between the date range, replace the end date's value by the termination date - 1 day for the final day
                    // change all date of end date termination date
                    if (is_valid($termination_date) && $termination_date->between($start_date, $end_date)) {
                        // $end_date = $termination_date->subDays(1);
                        $end_date = $termination_date;
                    }

                    $dtr_collection = $user->dtr($start_date->format('Y-m-d'), $end_date->format('Y-m-d'))->get();

                    // $this->result['dtr_collection'] = $this->result['dtr_collection']->merge($dtr_collection);

                    // Fetch the User's DTR base from the final start and end date
                    foreach ($dtr_collection  as $dtr) {

                        // Fetch the approved leave of the DTR if there is any
                        $leave = $dtr->leaves()->where('status', 'approved')
                            ->where('amount', '>', 0)
                            ->first();

                        // Fetch the Rest day work
                        $rest_day_work = $dtr->rest_day_work()->first();

                        // Fetch the Overtime
                        $overtime = $dtr->overtime()->first();

                        // Payroll Items
                        $payroll_items_collection = $dtr->payroll_items()->get();

                        $status = '';
                        // $schedule = array();
                        $has_holiday = false;
                        $has_leave = false;
                        // $has_rest_day_work = false;
                        $is_unplanned = false;
                        $in_dtr = false;



                        $leave = $dtr->leaves()->first();

                        // If DTR has valid leave, tick the has_leave flag
                        if (is_valid($leave) && $leave->isApproved() && $leave->amount > 0) {

                            if ($dtr->isUnplanned()) {
                                $status = $dtr->leavesToAcronym(true);

                                $this->result['unplanned_leaves']['users'][] = $dtr;
                                $is_unplanned = true;
                            } else {
                                $status = $dtr->leavesToAcronym(true);

                                $this->result['planned_leaves']['users'][] = $dtr;
                                $this->result['scheduled_employees']['users'][] = $dtr;


                                $in_dtr = true;
                            }

                            $has_leave = true;
                        }


                        //considers holiday if given by BHR even without a set schedule
                        if ($dtr->holidays()->get()->count() > 0 && Carbon::now()->gte(Carbon::parse($dtr->date))) {
                            if (!$in_dtr) {
                                $status = 'H';

                                $has_holiday = true;
                                $in_dtr = true;
                                $this->result['scheduled_employees']['users'][] = $dtr;
                                $this->result['attendance']['users'][] = $dtr;
                            }
                        } else {

                            # Check if there is a schedule for the DTR
                            if ($dtr->hasSchedule()) {
                                if ($dtr->holidays()->get()->count() > 0 && Carbon::now()->gte(Carbon::parse($dtr->date))) {

                                    if (!$in_dtr) {
                                        $status = 'H';

                                        $has_holiday = true;
                                        $this->result['scheduled_employees']['users'][] = $dtr;
                                        $this->result['attendance']['users'][] = $dtr;

                                        if ($dtr->isRestDay() && $dtr->source_type_tagging == get_constant('DTR_SOURCE_TYPE_TAGGING.rest_day_work')) {
                                            $status = 'H-RDW';
                                            $has_rest_day_work = true;
                                        }
                                    }
                                } else if ($dtr->hasValidTimelogs()) {
                                    $status = 'P';
                                    if (!$in_dtr) {
                                        $this->result['scheduled_employees']['users'][] = $dtr;
                                        $this->result['attendance']['users'][] = $dtr;
                                    }
                                    // else, set status as Absent
                                } else {
                                    $status = 'A';
                                    if ($dtr->checkCurrentTime()) {
                                        $status = 'A';

                                        if (!$is_unplanned && $has_leave == false) {


                                        }
                                        if($user->permissions()->pluck('name')->contains('user_multi_login')){
                                            if($dtr->get_dtr_history()->latest()->first() != null){
                                                if($dtr->get_dtr_history()->latest()->first()->log_out_type = "Log_out"){
                                                    $status = "P";
                                                    $this->result['attendance']['users'][] = $dtr;
                                                }
                                               
                                            }
                                        }
                                    } else {
                                        $status = "TBD";

                                    }
                                }

                                // If the DTR is Rest Day, set status as Rest Day
                                if ($dtr->isRestDay()) {
                                    $status = 'RD';
                                    if ($dtr->isRestDay() && $dtr->source_type_tagging == get_constant('DTR_SOURCE_TYPE_TAGGING.rest_day_work')) {
                                        $status = 'P-RDW';
                                        $has_rest_day_work = true;
                                    }
                                }
                            } elseif ($dtr->isRestDay()) {
                                $status = 'RD';
                                if ($dtr->isRestDay() && $dtr->source_type_tagging == get_constant('DTR_SOURCE_TYPE_TAGGING.rest_day_work')) {
                                    $status = 'P-RDW';
                                    $has_rest_day_work = true;
                                }
                            } else {
                                $status = 'X';
                            }
                        }

                        // Fetch User of the DTR
                        $user = $dtr->user()->first();

                        foreach ($payroll_items_collection as $payroll_item) {

                            // If there is an approved rest day work and the current payroll item iterated is Rendered hours, add its value
                            if (
                                is_valid($rest_day_work) && $rest_day_work->isApproved()
                                && $payroll_item->item == get_constant('PAYROLL_ITEMS.rendered_hours')
                            ) {

                                $this->result['total_rest_day_work']['total_hours'] += (int) $payroll_item->value;
                                $has_rest_day_work = true;
                            }

                            // If there is an approved overtime and the current payroll item iterated is overtime, add its value
                            if (
                                is_valid($overtime) && $overtime->isApproved()
                                &&  in_array($payroll_item->item, [
                                    get_constant('PAYROLL_ITEMS.overtime'),
                                    get_constant('PAYROLL_ITEMS.overtime_night_diff')
                                ])
                            ) {

                                $this->result['total_overtime']['total_hours'] += (int) $payroll_item->value;
                            }
                        };
                       
                        $employee_list_summary[$user->id][] = [
                            "date" => $dtr->date,
                            "name" => $user->getFullName(2),
                            "has_holiday" =>   $has_holiday,
                            "status" => $status
                        ];

                    }
                
            }
            
            $this->result['dtr'] = $this->result['dtr_collection'];
            $this->result['total_list_count_dtr'] = $this->result['dtr_collection']->count();
            $this->result['dtr_collection'] = new TeamAttendanceSummaryResource($this->result['dtr_collection']);


            $this->result['scheduled_employees']['total_count'] = count($this->result['scheduled_employees']['users']);
            $this->result['scheduled_employees']['users'] = new TeamAttendanceSummaryResource($this->result['scheduled_employees']['users']);

            $this->result['to_be_determinded']['total_count'] = count($this->result['to_be_determinded']['users']);
            $this->result['to_be_determinded']['users'] = new TeamAttendanceSummaryResource($this->result['to_be_determinded']['users']);

            $this->result['unplanned_leaves']['total_count']  = count($this->result['unplanned_leaves']['users']);
            $this->result['unplanned_leaves']['users'] = new TeamAttendanceSummaryResource($this->result['unplanned_leaves']['users']);


            $this->result['planned_leaves']['total_count']  = count($this->result['planned_leaves']['users']);
            $this->result['planned_leaves']['users'] = new TeamAttendanceSummaryResource($this->result['planned_leaves']['users']);

            $this->result['attendance']['total_count']  = count($this->result['attendance']['users']);
            $this->result['attendance']['users'] = new TeamAttendanceSummaryResource($this->result['attendance']['users']);

            $this->result['total_rest_day_work']['total_count'] = count($this->result['total_rest_day_work']['users']);
            $this->result['total_rest_day_work']['users'] = new TeamAttendanceSummaryResource($this->result['total_rest_day_work']['users']);

            $this->result['total_overtime']['total_count'] = count($this->result['total_overtime']['users']);
            $this->result['total_overtime']['users'] = new TeamAttendanceSummaryResource($this->result['total_overtime']['users']);

            
            $this->result['total_rest_day_work']['total_hours'] = seconds_to_time($this->result['total_rest_day_work']['total_hours'], true);
            $this->result['total_overtime']['total_hours'] = seconds_to_time($this->result['total_overtime']['total_hours'], true);
            $this->result['stdd'] = $start_date->format('Y-m-d');
            $this->result['eddd'] = $end_date->format('Y-m-d');


            $this->result['employee_list_summary'] = $employee_list_summary;

            return $this->result;
        } catch (Exception $e) {
            log_to_file('info', $e->getMessage(), [], "summary_errors");
            return error_response(trans('messages.error_default'), $e);
        }
    }

    public function get_summary_dtr(Collection $user_collection, string $start_date, string $end_date)
    {
        {
            try {
    
                $this->clear_properties();
    
    
    
                $today = Carbon::now();
                $start_date = Carbon::parse($start_date);
                $end_date = Carbon::parse($end_date);
                $default_start_date = $start_date;
                $default_end_date = $end_date;
                $employee_list_summary = [];
                // If the start date exceeds the current date, replace its value by today's date
                if ($start_date->gt($today)) {
                    $start_date = $today;
                }
    
                // If the end date exceeds the current date, replace its value by today's date
                if ($end_date->gt($today)) {
                    $end_date = $today;
                }
    
                // Iterate the User collection that was fetched
                foreach ($user_collection->sortBy('emp_num') as $user) {
    
                    $start_date = $default_start_date;
                    $end_date = $default_end_date;
    
                    $date_hired = Carbon::parse($user->date_hired);
                    $termination_date =
                        is_valid($user->termination_date) &&  ($date_hired->lt(Carbon::parse($user->termination_date)))
                        ? Carbon::parse($user->termination_date) : null;
    

                        $this->result['total_headcount']++;

                        if ($date_hired->between($start_date, $end_date)) {
                            $start_date = $date_hired;
                        }

                        if (is_valid($termination_date) && $termination_date->between($start_date, $end_date)) {

                            $end_date = $termination_date;
                        }
    
                        $dtr_collection = $user->dtr($start_date->format('Y-m-d'), $end_date->format('Y-m-d'))->get();
    

                        foreach ($dtr_collection  as $dtr) {
    

                            $leave = $dtr->leaves()->where('status', 'approved')
                                ->where('amount', '>', 0)
                                ->first();
                            $status = '';
                            $has_holiday = false;
                            $has_leave = false;
                            $is_unplanned = false;
                            $in_dtr = false;
                            $leave = $dtr->leaves()->first();
                            $stored_leave_status = '';
                            // If DTR has valid leave, tick the has_leave flag
                            if (is_valid($leave) && $leave->isApproved() && $leave->amount > 0) {
    
                                if ($dtr->isUnplanned()) {
                                    $status = $dtr->leavesToAcronym(true);
                                    $is_unplanned = true;
                                } else {
                                    $status = $dtr->leavesToAcronym(true);
                                    $in_dtr = true;
                                }
                                $stored_leave_status = $status;
                                $has_leave = true;
                            }
    
    
                            //considers holiday if given by BHR even without a set schedule
                            if ($dtr->holidays()->get()->count() > 0 && Carbon::now()->gte(Carbon::parse($dtr->date))) {
                                if (!$in_dtr) {
                                    $status = 'H';
    
                                    $has_holiday = true;
                                    $in_dtr = true;
                                }
                            } else {
    
                                # Check if there is a schedule for the DTR
                                if ($dtr->hasSchedule()) {
                                    if ($dtr->holidays()->get()->count() > 0 && Carbon::now()->gte(Carbon::parse($dtr->date))) {
    
                                        if (!$in_dtr) {
                                            $status = 'H';

                                            if ($dtr->isRestDay() && $dtr->source_type_tagging == get_constant('DTR_SOURCE_TYPE_TAGGING.rest_day_work')) {
                                                $status = 'H-RDW';
                                                $has_rest_day_work = true;
                                            }
                                            $has_holiday = true;

                                        }
                                    } else if ($dtr->hasValidTimelogs()) {
                                        $status = 'P';
                                        if (!$in_dtr) {
                                        
                                        }
                                        // else, set status as Absent
                                    } else {
                                        $status = 'A';
                                        if ($dtr->checkCurrentTime()) {
                                            $status = 'A';
    
                                            if (!$is_unplanned && $has_leave == false) {
    

                                            }
                                            if($user->permissions()->pluck('name')->contains('user_multi_login')){
                                                if($dtr->get_dtr_history()->latest()->first() != null){
                                                    $status = $dtr->get_dtr_history()->latest()->first()->log_out_type = "Log_out" ? "P":"A";
                                                }
                                            }
                                        } else {
                                            $status = "TBD";
    
                                        }
                                    }
    
                                    // If the DTR is Rest Day, set status as Rest Day
                                    if ($dtr->isRestDay()) {
                                        $status = 'RD';
                                        if ($dtr->isRestDay() && $dtr->source_type_tagging == get_constant('DTR_SOURCE_TYPE_TAGGING.rest_day_work')) {
                                            $status = 'P-RDW';
                                            $has_rest_day_work = true;
                                        }
                                    }
                                } elseif ($dtr->isRestDay()) {
                                    $status = 'RD';
                                    if ($dtr->isRestDay() && $dtr->source_type_tagging == get_constant('DTR_SOURCE_TYPE_TAGGING.rest_day_work')) {
                                        $status = 'P-RDW';
                                        $has_rest_day_work = true;
                                    }
                                } else {
                                    $status = 'X';
                                }
                            }
    
                            // Fetch User of the DTR
                            $user = $dtr->user()->first();
    
                   
                            // Re Overide status if has LEave
                            if($has_leave){
                                $status =  $stored_leave_status;
                            }
                            $employee_list_summary[$user->id][] = [
                                "date" => $dtr->date,
                                "name" => $user->getFullName(2),
                                "has_holiday" =>   $has_holiday,
                                "status" => $status
                            ];
    
                        }
                    
                }
                
                // $this->result['dtr'] = $this->result['dtr_collection'];
                // $this->result['total_list_count_dtr'] = $this->result['dtr_collection']->count();
                // $this->result['dtr_collection'] = new TeamAttendanceSummaryResource($this->result['dtr_collection']);

    
    
                $this->result['employee_list_summary'] = $employee_list_summary;
    
                return $this->result;
            } catch (Exception $e) {
                log_to_file('info', $e->getMessage(), [], "summary_errors");
                return error_response(trans('messages.error_default'), $e);
            }
        }
    }






    ###############################################################################################
    #################################### Computation functions ####################################
    ###############################################################################################


    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################



    /**
     *  Reponsible for clearing out the DTR Summary Properties
     */
    private function clear_properties()
    {

        $this->result = array(
            "total_headcount"  => 0,
            "scheduled_employees"  => [
                'total_count' => 0,
                'total_percentage' => 0,
                'target_percentage' => 95,
                'users' => [],
            ],
            "attendance"  => [
                'total_count' => 0,
                'total_percentage' => 0,
                'target_percentage' => 95,
                'users' => [],
            ],
            "unplanned_leaves"  => [
                'total_count' => 0,
                'total_percentage' => 0,
                'target_percentage' => 3,
                'users' => [],
            ],
            "planned_leaves"  => [
                'total_count' => 0,
                'total_percentage' => 0,
                'target_percentage' => 7,
                'users' => [],
            ],
            "total_rest_day_work"  => [
                'total_hours' => 0,
                'total_count' => 0,
                'users' => [],
            ],
            "total_overtime"  => [
                'total_hours' => 0,
                'total_count' => 0,
                'users' => [],
            ],
            "to_be_determinded"  => [
                'total_count' => 0,
                'total_percentage' => 0,
                // 'target_percentage' => 95,
                'users' => [],
            ],
            "dtr_collection"  => new Collection(),
            "employee_list_summary" => []
        );
    }
}
