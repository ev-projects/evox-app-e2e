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

    
});