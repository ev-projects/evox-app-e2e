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
// , 'middleware' => ['jwtauth', 'auth.apikey']
Route::group(['prefix' => 'dtr', 'middleware' => ['jwtauth']], function () {
    
    # Gets the DTR of the User indicated.
    Route::get('/{user_id}/{start_date}/{end_date}', 'DtrController@daily_time_record');//->middleware('auth.apikey');

    # Gets the DTR of the User indicated.
    Route::get('/punch/{user_id}/{start_date}/{end_date}', 'DtrController@punches');//->middleware('auth.apikey');

     # Gets the DTR of the User indicated.
     Route::get('/dtrpunch/{user_id}/{start_date}/{end_date}', 'DtrController@Dtr_punches');//->middleware('auth.apikey');

    Route::post('/quickpunch', 'DtrController@quickpunch');

    Route::post('/quickpunch_multi', 'DtrController@quickpunch_multi');

    # TO BE REMOVED! ONLY CRON JOBS WILL CALL THIS.
    Route::get('/insert_time_in_out/{dtr_id}/{time_in}/{time_out}/{is_rest_day}', 'DtrController@insert_time_in_and_out');//->middleware('auth.apikey');

    # Gets Incomplete DTR for the current cutoff
    Route::get('/incomplete_logs', 'DtrController@get_incomplete_logs');//->middleware('auth.apikey');

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
