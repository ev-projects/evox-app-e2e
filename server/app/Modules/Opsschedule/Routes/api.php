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

Route::get('/opsschedule', 'OpsScheduleController@get');
Route::get('/opsschedule/show/{ops_sched_id}', 'OpsScheduleController@show');
Route::get('/opsschedule/list/{dept_id?}', 'OpsScheduleController@getList');
Route::post('/opsschedule', 'OpsScheduleController@store');
Route::put('/opsschedule/{ops_sched_id}', 'OpsScheduleController@update');
Route::delete('/opsschedule/{ops_sched_id}', 'OpsScheduleController@delete');