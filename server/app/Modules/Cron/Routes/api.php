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

# API Call for Cron Jobs (To be removed after deployment)
Route::group(['prefix' => 'cron', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    

    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/initial_sync_of_users',     'CronController@initial_sync_of_users');

    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/generate_weekly_dtr',     'CronController@generate_weekly_dtr');

    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/sync_realtime_biometrics',     'CronController@sync_realtime_biometrics'); 

    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/sync_holidays',     'CronController@sync_holidays');

    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/sync_leaves',     'CronController@sync_leaves');

    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/sync_dtr',                             'CronController@sync_dtr');
    Route::get('/sync_dtr/{start_date}/{end_date}',     'CronController@sync_dtr');

    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/sync_alter_log',     'CronController@sync_alter_log');
    Route::get('/sync_alter_log/{start_date}/{end_date}',     'CronController@sync_alter_log');

    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/sync_rest_day_work',     'CronController@sync_rest_day_work');
    Route::get('/sync_rest_day_work/{start_date}/{end_date}',     'CronController@sync_rest_day_work');

    
    Route::get('/sync_change_schedule/{start_date}/{end_date}','CronController@sync_change_schedule');


    Route::get('/sync_overtime',                             'CronController@sync_overtime');
    Route::get('/sync_overtime/{start_date}/{end_date}',     'CronController@sync_overtime');

    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/sync_default_schedule',                       'CronController@sync_default_schedule');
    Route::get('/sync_default_schedule/{is_initial_sync}',     'CronController@sync_default_schedule');

    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/sync_temporary_schedule',                       'CronController@sync_temporary_schedule');
    Route::get('/sync_temporary_schedule/{is_initial_sync}',     'CronController@sync_temporary_schedule');


    # FOR TESTING PURPOSES 

    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/generate_weekly_dtr/{start_date}/{end_date}',     'CronController@generate_weekly_dtr');

    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/sync_realtime_biometrics/{start_datetime}/{end_datetime}',     'CronController@sync_realtime_biometrics'); 

    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/sync_holidays/{start_date}/{end_date}',     'CronController@sync_holidays');

    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/sync_leaves/{start_date}/{end_date}',     'CronController@sync_leaves');


});
