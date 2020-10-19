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
Route::group(['prefix' => 'department', 'middleware' => ['jwtauth', 'auth.apikey']], function () {

    # Gets all the Department Lists
    Route::get('/all', 'DepartmentController@all');

    # Gets the Department of the ID indicated on the Parameter
    Route::get('/{id}', 'DepartmentController@find');

    # Gets the Department of the ID indicated on the Parameter
    Route::post('/assign_handlers/{id}', 'DepartmentController@assign_handlers');

});