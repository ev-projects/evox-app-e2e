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

# API Call for Schedules
Route::group(['prefix' => 'schedule', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    # Insert new Schedule
    Route::post('/',     'ScheduleController@store'); //->middleware('permission:add_schedule');

    # Show existing Schedule
    Route::get('/{id}', 'ScheduleController@show'); //->middleware('permission:view_schedule')

    # Update existing Schedule
    Route::put('/{id}', 'ScheduleController@update'); //->middleware('permission:update_schedule')

    # Delete Schedule
    Route::delete('/{id}', 'ScheduleController@destroy'); //->middleware('permission:delete_schedule');


    #####################################################################################################

    # API Call for Assigning of Schedule
    
    # Insert new Schedule
    Route::post('/assign/',     'ScheduleController@assign'); //->middleware('permission:assign_schedule');

});