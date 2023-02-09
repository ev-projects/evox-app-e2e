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

# API Call for HR
Route::group(['prefix' => 'hr', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    # Gets the list announcements.
    Route::get('/announcements/all', 'HrController@announcements');//->middleware('auth.apikey');

    # Create an announcement.
    Route::post('/announcements', 'HrController@store');//->middleware('auth.apikey');

});
