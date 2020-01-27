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
Route::group(['prefix' => 'schedule', 'middleware' => ['jwtauth', 'auth.apikey']], function () {

    # API Call for Login
    Route::post('add', 'ScheduleController@add');
});