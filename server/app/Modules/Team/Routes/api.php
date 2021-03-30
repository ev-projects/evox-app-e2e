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


# API Call for Department
Route::group(['prefix' => 'team', 'middleware' => ['jwtauth', 'auth.apikey']], function () {

    # Gets all the Teams Lists
    Route::get('/all', 'TeamController@all');

    # Gets the Teams of the ID indicated on the Parameter
    Route::get('/{id}', 'TeamController@find');

    # Gets the Teams of the ID indicated on the Parameter
    Route::post('/', 'TeamController@store');

    # Gets the Teams of the ID indicated on the Parameter
    Route::put('/{id}', 'TeamController@update');

    # Gets the Teams of the ID indicated on the Parameter
    Route::delete('/{id}', 'TeamController@destroy');

});

Route::group(['prefix' => 'department/{department_id}', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    # Gets the Team List of Specific Department
    Route::get('/teams', 'TeamController@list_via_department');


});

Route::group(['prefix' => 'user/{user_id}', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    # Gets the Teams Handled by the specific User
    Route::get('/teams_handled', 'TeamController@list_via_team_handler');


});