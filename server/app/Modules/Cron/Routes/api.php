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
    Route::get('/generate_weekly_dtr',     'CronController@generate_weekly_dtr');

    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/sync_realtime_biometrics',     'CronController@sync_realtime_biometrics'); 

    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/sync_holidays',     'CronController@sync_holidays');


});
