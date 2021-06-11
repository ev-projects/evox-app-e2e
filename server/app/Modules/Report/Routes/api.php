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

    # Get holiday
    Route::get('holidays', 'ReportController@holidays');

    # Get My DTR Notifications
    Route::get('my_dtr_notifications', 'ReportController@my_dtr_notifications');

    # Get User Attendance
    Route::get('team_attendance', 'ReportController@team_attendance');

    # Get Team Attendance Summary
    Route::get('team_attendance_summary/{start_date}/{end_date}', 'ReportController@team_attendance_summary');

    # Get Team Schedule
    Route::get('team_schedule/', 'ReportController@team_schedule');


    # Get Birthday Anniversary
    Route::get('team_birthday_anniversary', 'ReportController@team_birthday_anniversary');


    # API Call for DTR Summary
    Route::group(['prefix' => 'dtr_summary', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
        
        # Gets the DTR Summary of the team.
        Route::get('/{user_id}/{start_date}/{end_date}', 'ReportController@dtr_summary');

        Route::get('block/{user_id}/{start_date}/{end_date}', 'ReportController@dtr_summary_block');

        # Gets the DTR Summary of the User indicated. 
        Route::get('team', 'ReportController@team_dtr_summary'); 

        Route::get('export', 'ReportController@export_team_dtr_summary');
    });

    # API Call for DTR Summary
    Route::group(['prefix' => 'dtr_logs', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
        
        # Gets the DTR Summary of the User indicated. 
        Route::get('team', 'ReportController@team_dtr_logs');

        Route::get('export', 'ReportController@export_team_dtr_logs');
    });
});