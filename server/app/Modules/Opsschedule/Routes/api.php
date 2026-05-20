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

Route::group(['prefix' => 'opsschedule', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    Route::get('/', 'OpsScheduleController@get');
    Route::get('/show/{ops_sched_id}', 'OpsScheduleController@show');
    Route::get('/list/{dept_id?}', 'OpsScheduleController@getList');
    Route::post('/', 'OpsScheduleController@store');
    Route::put('/{ops_sched_id}', 'OpsScheduleController@update');
    Route::delete('/{ops_sched_id}', 'OpsScheduleController@delete');
});