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
    
    # Gets the DTR of the User indicated.
    Route::get('/{user_id}/{start_date}/{end_date}', 'DtrController@daily_time_record');//->middleware('auth.apikey');

    
    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/insert_time_in_out/{dtr_id}/{time_in}/{time_out}', 'DtrController@insert_time_in_and_out');//->middleware('auth.apikey');

});

# API Call for DTR Summary
Route::group(['prefix' => 'dtr_summary', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    # Gets the DTR Summary of the User indicated.
    Route::get('/{user_id}/{start_date}/{end_date}', 'DtrController@dtr_summary');

});


