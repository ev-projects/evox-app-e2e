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
    

# Request for Forgot Password
Route::post('/forgot_password_request', 'UserController@forgot_password_request')->middleware('auth.apikey'); //->middleware('permission:update_overtime')

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
Route::group(['prefix' => 'user', 'middleware' => ['jwtauth', 'auth.apikey']], function () {

    # Gets the User List of Specific Role
    Route::get('/search-user/{string_name}', 'UserController@get_user_by_string');

    # Get the user roles
    Route::get('/roles/', 'UserController@get_roles');

    # Register a User
    Route::post('register', 'UserController@register')->middleware('role:admin');

    # Get the Role of the user
    Route::get('get_dpa_list', 'UserController@get_dpa_list');
});
#####################################################################################################

# API Calls for user/{id}
Route::group(['prefix' => 'user/{id}', 'middleware' => ['jwtauth', 'auth.apikey']], function () {

    # Gets user info ( Name and Department )
    Route::get('info', 'UserController@user_info');
    
    Route::get('profile', 'UserController@profile');
    
    Route::get('personal_information', 'UserController@personal_information');

    Route::get('job_information', 'UserController@job_information');

    Route::get('time_off/{start_date}/{end_date}', 'UserController@time_off');

    Route::get('leave_credits', 'UserController@leave_credits');

    # Gets the Default Schedule of the User indicated.
    Route::get('default_schedule', 'UserController@default_schedule');//->middleware('auth.apikey');
    
    # Gets the Temporary Schedules of the User indicated.
    Route::get('temporary_schedules', 'UserController@temporary_schedules');//->middleware('auth.apikey');
    
    # Gets the list of Teams of the User
    Route::get('my_team_list', 'UserController@my_team_list');//->middleware('auth.apikey');

    Route::get('team_list/{department_id}', 'UserController@my_team_list_under_department');//->middleware('auth.apikey');
    
    # Get the Role of the user
    Route::get('/role/', 'UserController@get_user_role');

    # Change Password Post request
    Route::post('tick_dpa', 'UserController@tick_dpa');//->middleware('auth.apikey');

    # Change Password Post request
    Route::post('change_password', 'UserController@change_password');//->middleware('auth.apikey');
    
    # Assign Roles & Permissions Post request
    Route::post('/assign_roles_permissions/', 'UserController@assign_roles_permissions')->middleware('role:admin');
    
    # Assign Employees Post Request
    Route::post('/assign_employees/', 'UserController@assign_employees')->middleware('role:admin');


    #####################################################################################################
    
    Route::group(['prefix' => 'profile', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
        
        # Gets the User List of Specific Role
        Route::post('/', 'ProfileController@store');

        # Gets the User List of Specific Role
        Route::put('/', 'ProfileController@update');
    
    
    });
    

});


#####################################################################################################

Route::group(['prefix' => 'role/{role}', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    # Gets the User List of Specific Role
    Route::get('/users', 'UserController@list_via_role');


});

#####################################################################################################

Route::group(['prefix' => 'department/{department_id}', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    # Gets the User List of Specific Department
    Route::get('/users', 'UserController@list_via_department');

});

Route::group(['prefix' => 'team/{team_id}', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    
    # Gets the User List of Specific Department
    Route::get('/users', 'UserController@list_via_team');


});