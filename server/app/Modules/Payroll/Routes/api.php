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

# API Call for DTR
Route::group(['prefix' => 'dtr', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/generate_weekly_dtr',     'DtrController@generate_weekly_dtr'); //->middleware('permission:add_schedule');

    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/sync_realtime_biometrics',     'DtrController@sync_realtime_biometrics'); //->middleware('permission:add_schedule');

    # Gets the DTR of the User indicated.
    Route::get('/{user_id}/{date_start}/{date_end}', 'DtrController@daily_time_record');//->middleware('auth.apikey');

});