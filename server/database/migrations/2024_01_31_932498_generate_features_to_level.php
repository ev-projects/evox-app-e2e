<?php

use App\Features;
use App\EvoxLevels;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class GenerateFeaturesToLevel extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        DB::beginTransaction();
        try {
    $login = Features::create([ 'feature_name' =>"login", 'feature_label'=>"Login"]);
    $login->features_level()->attach([0,1,2,3,4,5,6]);

    $dtr_access = Features::create([ 'feature_name' =>"dtr_access", 'feature_label'=>"DTR Access"]);
    $dtr_access->features_level()->attach([0,1,2,3,4,5,6]);

    $multi_login = Features::create([ 'feature_name' =>"multi_login", 'feature_label'=>"Multi-login*"]);
    //  $multi_login->features_level()->attach([0,1,2,3,4,5,6]); this is null be default

    $request_alter_logs = Features::create([ 'feature_name' =>"request_alter_logs", 'feature_label'=>"Request Alter Logs"]);
    $request_alter_logs->features_level()->attach([0,1,2,3,4,5,6]);

    $request_change_schedule = Features::create([ 'feature_name' =>"request_change_schedule", 'feature_label'=>"Request Change Schedule"]);
    $request_change_schedule->features_level()->attach([0,1,2,3,4,5,6]);

    $request_coe = Features::create([ 'feature_name' =>"request_coe", 'feature_label'=>"Request COE"]);
    $request_coe->features_level()->attach([0,1,2,3,4,5,6]);

    $request_rest_day_work = Features::create([ 'feature_name' =>"request_rest_day_work", 'feature_label'=>"Request Rest Day Work"]);
    $request_rest_day_work->features_level()->attach([0,1,2,3,4,5,6]);

    $request_overtime = Features::create([ 'feature_name' =>"request_overtime", 'feature_label'=>"Request Overtime"]);
    $request_overtime->features_level()->attach([0,1,2,3,4,5,6]);

    $export_dtr_logs = Features::create([ 'feature_name' =>"export_dtr_logs", 'feature_label'=>"Export DTR Logs"]);
    $export_dtr_logs->features_level()->attach([1,2,3,4,6,7]);

    $export_dtr_summary = Features::create([ 'feature_name' =>"export_dtr_summary", 'feature_label'=>"Export DTR Summary"]);
    $export_dtr_summary->features_level()->attach([1,2,3,4,6,7]);

    $view_employee_dtr = Features::create([ 'feature_name' =>"view_employee_dtr", 'feature_label'=>"View Employee DTR"]);
    $view_employee_dtr->features_level()->attach([1,2,3,4,6,7]);

    $view_dtr_logs = Features::create([ 'feature_name' =>"view_dtr_logs", 'feature_label'=>"View DTR Logs"]);
    $view_dtr_logs->features_level()->attach([1,2,3,4,6,7]);

    $view_dtr_summary = Features::create([ 'feature_name' =>"view_dtr_summary", 'feature_label'=>"View DTR Summary"]);
    $view_dtr_summary->features_level()->attach([1,2,3,4,6,7]);

    $view_employee_schedule = Features::create([ 'feature_name' =>"view_employee_schedule", 'feature_label'=>"View Employee Schedule"]);
    $view_employee_schedule->features_level()->attach([1,2,3,4,6,7]);

    $change_employee_schedule = Features::create([ 'feature_name' =>"change_employee_schedule", 'feature_label'=>"Change Employee Schedule"]);
    $change_employee_schedule->features_level()->attach([1,2,3,4,6]);

    $view_attendance_report = Features::create([ 'feature_name' =>"view_attendance_report", 'feature_label'=>"View Attendance Report"]);
    $view_attendance_report->features_level()->attach([1,2,3,4,6,7]);

    $view_department_list = Features::create([ 'feature_name' =>"view_department_list", 'feature_label'=>"View Department List"]);
    $view_department_list->features_level()->attach([1,2,3,4,5,6]);

    $manage_teams = Features::create([ 'feature_name' =>"manage_teams", 'feature_label'=>"Manage Teams"]);
    $manage_teams->features_level()->attach([2]);

    $manage_department_schedules = Features::create([ 'feature_name' =>"manage_department_schedules", 'feature_label'=>"Manage Department Schedules"]);
    $manage_department_schedules->features_level()->attach([1,2,3,4,6]);

    $manage_alter_log_request = Features::create([ 'feature_name' =>"manage_alter_log_request", 'feature_label'=>"Manage Alter Log Requests"]);
    $manage_alter_log_request->features_level()->attach([1,2,3,4,6]);

    $manage_change_schedules_request = Features::create([ 'feature_name' =>"manage_change_schedules_request", 'feature_label'=>"Manage Change Schedule Requests"]);
    $manage_change_schedules_request->features_level()->attach([1,2,3,4,6]);

    $manage_rest_day_work_request = Features::create([ 'feature_name' =>"manage_rest_day_work_request", 'feature_label'=>"Manage Rest Day Work Requests"]);
    $manage_rest_day_work_request->features_level()->attach([1,2,3,4,6]);

    $manage_overtime_request = Features::create([ 'feature_name' =>"manage_overtime_request", 'feature_label'=>"Manage Overtime Requests"]);
    $manage_overtime_request->features_level()->attach([1,2,3,4,6]);

    $view_employee_list = Features::create([ 'feature_name' =>"view_employee_list", 'feature_label'=>"View Employee List"]);
    $view_employee_list->features_level()->attach([1,2,3,4,5,6,7]);

    $view_employee_personal_information = Features::create([ 'feature_name' =>"view_employee_personal_information", 'feature_label'=>"View Employee Personal Information"]);
    $view_employee_personal_information->features_level()->attach([1,2,3,4,5,6]);

    $view_employee_job_information = Features::create([ 'feature_name' =>"view_employee_job_information", 'feature_label'=>"View Employee Job Information"]);
    $view_employee_job_information->features_level()->attach([1,2,3,4,5,6]);

    $manage_announcement = Features::create([ 'feature_name' =>"manage_announcement", 'feature_label'=>"Manage Annoucements"]);
    // $manage_announcement->features_level()->attach([1,2,3,4,5,6]); on selected can be given

    $view_whos_out = Features::create([ 'feature_name' =>"view_whos_out", 'feature_label'=>"View Who's Out"]);
    $view_whos_out->features_level()->attach([1,2,3,4,5,6]);

    $view_holidays = Features::create([ 'feature_name' =>"view_holidays", 'feature_label'=>"View Holidays"]);
    $view_holidays->features_level()->attach([0,1,2,3,4,5,6,7]);

    $view_celebrations = Features::create([ 'feature_name' =>"view_celebrations", 'feature_label'=>"View Celebrations"]);
    $view_celebrations->features_level()->attach([1,2,3,4,5,6,7]);

    $manage_payroll_cutoff = Features::create([ 'feature_name' =>"manage_payroll_cutoff", 'feature_label'=>"Manage Payroll Cut-off"]);
    $manage_payroll_cutoff->features_level()->attach([0]);

    $bhr_sync = Features::create([ 'feature_name' =>"bhr_sync", 'feature_label'=>"BHR Sync"]);
    $bhr_sync->features_level()->attach([0]);

    $biometric_sync = Features::create([ 'feature_name' =>"biometric_sync", 'feature_label'=>"Biometrics Sync"]);
    $biometric_sync->features_level()->attach([0]);

    $manage_users = Features::create([ 'feature_name' =>"manage_users", 'feature_label'=>"Manage Users"]);
    $manage_users->features_level()->attach([0]);

    $manage_roles_and_permissions = Features::create([ 'feature_name' =>"manage_roles_and_permissions", 'feature_label'=>"Manage Roles & Permissions"]);
    $manage_roles_and_permissions->features_level()->attach([0]);



    DB::commit();
    } catch (Exception $e) {
        DB::rollback();
        error_log($e->getMessage());
    }
    }
    
    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // Schema::table('users', function (Blueprint $table) {
        //     //
        // });
    }
}
