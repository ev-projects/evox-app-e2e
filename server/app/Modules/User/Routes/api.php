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

# API Calls for user/{id}
Route::group(['prefix' => 'user/{id}', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    # Gets the list of Teams of the User
    Route::get('profile', 'UserController@profile');//->middleware('auth.apikey');

    # Gets the Default Schedule of the User indicated.
    Route::get('default_schedule', 'UserController@default_schedule');//->middleware('auth.apikey');
    
    # Gets the Temporary Schedules of the User indicated.
    Route::get('temporary_schedules', 'UserController@temporary_schedules');//->middleware('auth.apikey');
    
    # Gets the list of Teams of the User
    Route::get('my_team_list', 'UserController@my_team_list');//->middleware('auth.apikey');

    # Gets the list of Teams of the User
    Route::post('change_password', 'UserController@change_password');//->middleware('auth.apikey');
    
    # Gets the Payroll Cutoff of the ID indicated on the Parameter
    Route::post('/assign_roles_permissions/', 'UserController@assign_roles_permissions');
    
    # Gets the Payroll Cutoff of the ID indicated on the Parameter
    Route::post('/assign_employees/', 'UserController@assign_employees');

    Route::get('/role/', 'UserController@get_user_role');

});



#####################################################################################################

Route::group(['prefix' => 'role/{role}', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    # Gets the User List of Specific Role
    Route::get('/users', 'UserController@list_via_role');


});


#####################################################################################################

Route::group(['prefix' => 'admin-access/', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    # Gets the User List of Specific Role
    Route::get('/search-user/{string_name}', 'UserController@get_user_by_string');

    # Get the user roles
    Route::get('/roles/', 'UserController@get_roles');

});


#####################################################################################################

Route::group(['prefix' => 'department/{department_id}', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    # Gets the User List of Specific Department
    Route::get('/users', 'UserController@list_via_department');


});