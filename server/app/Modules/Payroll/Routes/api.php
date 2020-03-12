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

# API Call for DTR
Route::group(['prefix' => 'dtr', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    # Gets the DTR of the User indicated.
    Route::get('/{user_id}/{date_start}/{date_end}', 'DtrController@daily_time_record');//->middleware('auth.apikey');

});