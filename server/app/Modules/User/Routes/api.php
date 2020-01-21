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

    # API Call for Login
    Route::post('login', 'AuthController@login');

    # API Call for Logout (Checks as well if there's a valid token before logging out.)
    Route::post('logout', 'AuthController@logout')->middleware('jwtauth');

    # API Call for Refreshing of Token (Checks as well if there's a valid token before logging out.)
    Route::post('refresh', 'AuthController@refresh')->middleware('jwtauth');
    Route::post('me', 'AuthController@me')->middleware('jwtauth');
    Route::post('payload', 'AuthController@payload')->middleware('jwtauth');


});


Route::resource('user', 'UserController');