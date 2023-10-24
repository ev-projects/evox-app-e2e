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

// Route::get('/test_send_mail', 'RequestController@test_send_mail'); 

# API Call for Request Approval
Route::group(['prefix' => 'request/approval', 'middleware' => ['auth.apikey']], function () {

        # Change Status of the Request
        Route::post('/', 'RequestController@change_request_status_via_hash_code'); //->middleware('permission:update_overtime')

});

# API Call for Requests , 
Route::group(['prefix' => 'request', 'middleware' => ['jwtauth', 'auth.apikey']], function () {


    # Request List
    Route::get('/request-list',     'RequestController@requestlist');

    # Request List Number
    Route::get('/request-numbers',     'RequestController@requestlistNumbers');
    Route::get('/request-numbers_dashboard',     'RequestController@requestlistNumbers_dashboard');
    

    # Request List Number
    Route::post('/bulk-request',     'RequestController@bulkRequest');

    # Find existing Request Collections
    Route::get('/', 'RequestController@find'); 


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


    Route::group(['prefix' => 'change_schedule'], function () {
    
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


    Route::group(['prefix' => 'alter_log'], function () {
    
        # Insert new Change Schedule Request
        Route::post('/',     'AlterLogController@store'); 

        # Update existing Change Schedule Request
        Route::put('/{id}', 'AlterLogController@update');

        # Delete Change Schedule Request
        Route::delete('/{id}', 'AlterLogController@destroy'); 

        # Find existing Change Schedule Request
        Route::get('/{id}', 'AlterLogController@find'); 

        # Approves the Change Schedule Request
        Route::put('/approve/{id}', 'AlterLogController@approve'); 

        # Decline the Change Schedule Request
        Route::put('/decline/{id}', 'AlterLogController@decline'); 

        # Pending the Change Schedule Request
        Route::put('/pending/{id}', 'AlterLogController@pending'); 

        # Cancels the Change Schedule Request
        Route::put('/cancel/{id}', 'AlterLogController@cancel'); 
        
    });


    Route::group(['prefix' => 'alter_log_punch'], function () {
    
        # Insert new Change Schedule Request
        Route::post('/',     'AlterLogPunchController@store'); 

        # Update existing Change Schedule Request
        Route::put('/{id}', 'AlterLogPunchController@update');

        # Delete Change Schedule Request
        Route::delete('/{id}', 'AlterLogPunchController@destroy'); 

        # Find existing Change Schedule Request
        Route::get('/{id}', 'AlterLogPunchController@find'); 

        # Approves the Change Schedule Request
        Route::put('/approve/{id}', 'AlterLogPunchController@approve'); 

        # Decline the Change Schedule Request
        Route::put('/decline/{id}', 'AlterLogPunchController@decline'); 

        # Pending the Change Schedule Request
        Route::put('/pending/{id}', 'AlterLogPunchController@pending'); 

        # Cancels the Change Schedule Request
        Route::put('/cancel/{id}', 'AlterLogPunchController@cancel'); 
        
    });



    

    # API Call for Rest Day Work
    Route::group(['prefix' => 'rest_day_work'], function () {
        Route::get('/myrequests',     'RequestController@allrequest'); //->middleware('permission:add_rest_day_work');
        # Insert new Rest Day Work
        Route::post('/',     'RestDayWorkController@store'); //->middleware('permission:add_rest_day_work');

        # Update existing Rest Day Work
        Route::put('/{id}', 'RestDayWorkController@update'); //->middleware('permission:update_rest_day_work')

        # Delete Rest Day Work
        Route::delete('/{id}', 'RestDayWorkController@destroy'); //->middleware('permission:delete_rest_day_work');

        # Find existing Rest Day Work
        Route::get('/{id}', 'RestDayWorkController@find'); //->middleware('permission:view_rest_day_work')

        # Approves the Rest Day Work
        Route::put('/approve/{id}', 'RestDayWorkController@approve'); //->middleware('permission:approval_of_request');

        # Decline the Rest Day Work
        Route::put('/decline/{id}', 'RestDayWorkController@decline'); //->middleware('permission:approval_of_request');

        # Pending the Rest Day Work
        Route::put('/pending/{id}', 'RestDayWorkController@pending'); //->middleware('permission:approval_of_request');

        # Cancels the Rest Day Work
        Route::put('/cancel/{id}', 'RestDayWorkController@cancel'); //->middleware('permission:approval_of_request');
        
    });




    
});