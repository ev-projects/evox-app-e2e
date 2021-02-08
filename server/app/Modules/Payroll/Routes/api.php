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

    Route::post('/quickpunch', 'DtrController@quickpunch');


    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/insert_time_in_out/{dtr_id}/{time_in}/{time_out}/{is_rest_day}', 'DtrController@insert_time_in_and_out');//->middleware('auth.apikey');

});

# API Call for DTR Summary
Route::group(['prefix' => 'dtr_summary', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    # Gets the DTR Summary of the team.
    Route::get('/{user_id}/{start_date}/{end_date}', 'DtrController@dtr_summary');

    # Gets the DTR Summary of the User indicated. 
    Route::get('team', 'DtrController@team_dtr_summary');

    Route::get('export', 'DtrController@export_team_dtr_summary');
});

# API Call for DTR Summary
Route::group(['prefix' => 'dtr_logs', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    # Gets the DTR Summary of the User indicated. 
    Route::get('team', 'DtrController@team_dtr_logs');

    Route::get('export', 'DtrController@export_team_dtr_logs');
});



# API Call for Payroll
Route::group(['prefix' => 'payroll', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    # API Call for Payroll Cutoffs
    Route::group(['prefix' => 'cutoff'], function () {

        
        # Gets all the Payroll Cutoff Lists
        Route::get('/get_filter_for_dtr/{user_id}', 'PayrollCutoffController@get_filter_for_dtr');

        # Gets all the Payroll Cutoff Lists
        Route::get('/all', 'PayrollCutoffController@all');

        # Gets the Payroll Cutoff of the ID indicated on the Parameter
        Route::get('/{id}', 'PayrollCutoffController@find');
    
        # Insert new Overtime
        Route::post('/',     'PayrollCutoffController@store'); //->middleware('permission:add_overtime');

        # Update existing Overtime
        Route::put('/{id}', 'PayrollCutoffController@update'); //->middleware('permission:update_overtime')

        # Delete Overtime
        Route::delete('/{id}', 'PayrollCutoffController@destroy'); //->middleware('permission:delete_overtime');
    });
});
