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
Route::group(['prefix' => 'client', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    # Assign Employee's Client
    Route::post('/assign', 'ClientController@assignEmployeesClient');

    # Gets the Department of the ID indicated on the Paramete
    Route::get('/{client_id}/{department_id}/users', 'ClientController@users');

});