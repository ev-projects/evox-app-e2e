<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

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

# API calls for Authentication
Route::group(['prefix' => 'auth'], function () {

    # Login
    Route::post('login', 'AuthController@login')->middleware('auth.apikey');

    # Logout (Checks as well if there's a valid token before logging out.)
    Route::post('logout', 'AuthController@logout')->middleware('jwtauth', 'auth.apikey');

    # API Call for Refreshing of Token (Checks as well if there's a valid token before logging out.)
    // Route::post('refresh', 'AuthController@refresh')->middleware('jwtauth', 'auth.apikey');

    # Fetching the Payload that contains the User Data and Token Credentials
    Route::post('payload', 'AuthController@payload')->middleware('jwtauth', 'auth.apikey');


});

#####################################################################################################

# API Calls for user/{emp_num}
Route::group(['prefix' => 'user/{emp_num}', 'middleware' => ['jwtauth', 'auth.apikey']], function () {

    # Gets the Default Schedule of the User indicated.
    Route::get('default_schedule', 'UserController@default_schedule');//->middleware('auth.apikey');

});