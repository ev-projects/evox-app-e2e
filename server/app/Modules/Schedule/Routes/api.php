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

// Route::get('/schedule', function (Request $request) {
//     // return $request->schedule();
// })->middleware('auth:api');


# API calls for Authentication
Route::group(['prefix' => 'schedule'/*, 'middleware' => ['jwtauth', 'auth.apikey']*/], function () {

    # API Call for Schedules
    
    # Insert new Schedule
    Route::post('/',     'ScheduleController@store');

    # Show existing Schedule
    Route::get('/{id}', 'ScheduleController@show');

    # Update existing Schedule
    Route::put('/{id}', 'ScheduleController@update');

    # Delete Schedule
    Route::delete('/{id}', 'ScheduleController@destroy');
});