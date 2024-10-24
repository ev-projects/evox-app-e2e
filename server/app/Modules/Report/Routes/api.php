<?php

use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your module. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/



# API Call for Reports 
Route::group(['prefix' => 'report/', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    # Get Holiday Dashboard From BRH API
    Route::get('get_dashboard_holiday', 'ReportController@get_dashboard_holidays');

    # Get holiday
    Route::get('holidays', 'ReportController@holidays');

    # Get My DTR Notifications
    Route::get('my_dtr_notifications', 'ReportController@my_dtr_notifications');

    # Get User Attendance
    Route::get('team_attendance', 'ReportController@team_attendance');

    # Get Team Attendance Summary
    Route::post('team_attendance_summary/{start_date}/{end_date}', 'ReportController@team_attendance_summary');

    # Get Team Schedule
    Route::get('team_schedule/', 'ReportController@team_schedule');


    # Get Birthday Anniversary
    Route::get('team_birthday_anniversary', 'ReportController@team_birthday_anniversary');

    #export attendance summary schedule
    Route::get('attendance/summary/export/{start_date}/{end_date}', 'ReportController@export');

    # API Call for DTR Summary
    Route::group(['prefix' => 'dtr_summary', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
        
        # Gets the DTR Summary of the team.
        Route::get('/{user_id}/{start_date}/{end_date}', 'ReportController@dtr_summary');

        Route::get('block/{user_id}/{start_date}/{end_date}', 'ReportController@dtr_summary_block');

        # Gets the DTR Summary of the User indicated. 
        Route::get('team', 'ReportController@team_dtr_summary'); 

        Route::get('export', 'ReportController@export_team_dtr_summary');

        Route::get('new_team', 'ReportController@new_dtr_summary_report');

        Route::get('new_export', 'ReportController@new_dtr_summary_report_csv_export');

        Route::get('multi_logs', 'ReportController@dtr_multi_logs_summary_report');

        Route::get('multi_logs_export', 'ReportController@dtr_multi_logs_summary_report_csv_export');

        Route::get('export_dtr_conflict', 'ReportController@dtr_half_day_mismatch');

        Route::get('dtr_conflict', 'ReportController@dtr_conflict_report');
    });

    # API Call for DTR Summary
    Route::group(['prefix' => 'dtr_logs', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
        
        # Gets the DTR Summary of the User indicated. 
        Route::get('team', 'ReportController@team_dtr_logs');

        Route::get('export', 'ReportController@export_team_dtr_logs');
    });
    Route::get('timeoff_allocation', 'ReportController@timeoff_allocation_report');
});

Route::get('summaryreport1', 'ReportController@team_dtr_summaryreportnew');

Route::get('exportsummaryreport1', 'ReportController@newdtrsummaryreportcsvexport');

