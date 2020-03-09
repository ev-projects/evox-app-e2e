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


# API Call for Payroll
Route::group(['prefix' => 'bhr', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    Route::get('/sync_holidays',     'BhrController@sync_holidays'); //->middleware('permission:add_schedule');

});
