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
########################### CLIENT ##########################################################################
Route::group(['prefix' => 'request/coe', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    # List employee COEs
    Route::get('/', 'COEController@all');

    # Create employee COE
    Route::post('/', 'COEController@create');
});
