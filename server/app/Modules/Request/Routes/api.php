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


# API Call for Requests
Route::group(['prefix' => 'request', 'middleware' => ['jwtauth', 'auth.apikey']], function () {


    # Find existing Request Collections
    Route::get('/', 'RequestController@find'); //->middleware('permission:view_overtime')


    # API Call for Overtime
    Route::group(['prefix' => 'overtime'], function () {
    
        # Insert new Overtime
        Route::post('/',     'OvertimeController@store'); //->middleware('permission:add_overtime');

        # Update existing Overtime
        Route::put('/{id}', 'OvertimeController@update'); //->middleware('permission:update_overtime')

        # Delete Overtime
        Route::delete('/{id}', 'OvertimeController@destroy'); //->middleware('permission:delete_overtime');

        # Find existing Overtime
        Route::get('/{id}', 'OvertimeController@find'); //->middleware('permission:view_overtime')

        # Approves the Overtime
        Route::put('/approve/{id}', 'OvertimeController@approve'); //->middleware('permission:approval_of_request');

        # Decline the Overtime
        Route::put('/decline/{id}', 'OvertimeController@decline'); //->middleware('permission:approval_of_request');

        # Pending the Overtime
        Route::put('/pending/{id}', 'OvertimeController@pending'); //->middleware('permission:approval_of_request');

        # Cancels the Overtime
        Route::put('/cancel/{id}', 'OvertimeController@cancel'); //->middleware('permission:approval_of_request');
        
    });


    Route::group(['prefix' => 'changeschedule'], function () {
    
        # Insert new Change Schedule Request
        Route::post('/',     'ChangeScheduleController@store'); 

        # Update existing Change Schedule Request
        Route::put('/{id}', 'ChangeScheduleController@update');

        # Delete Change Schedule Request
        Route::delete('/{id}', 'ChangeScheduleController@destroy'); 

        # Find existing Change Schedule Request
        Route::get('/{id}', 'ChangeScheduleController@find'); 

        # Approves the Change Schedule Request
        Route::put('/approve/{id}', 'ChangeScheduleController@approve'); 

        # Decline the Change Schedule Request
        Route::put('/decline/{id}', 'ChangeScheduleController@decline'); 

        # Pending the Change Schedule Request
        Route::put('/pending/{id}', 'ChangeScheduleController@pending'); 

        # Cancels the Change Schedule Request
        Route::put('/cancel/{id}', 'ChangeScheduleController@cancel'); 
        
    });


    
});