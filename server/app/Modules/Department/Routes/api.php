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

    Route::delete('/{id}', 'DepartmentController@destroy');

    # Gets the Department of the ID indicated on the Parameter
    Route::get('/{id}/department_handlers', 'DepartmentController@department_handlers');

    # Gets the Department of the ID indicated on the Parameter
    Route::get('/{id}/users', 'DepartmentController@users');

    # Gets the Department of the ID indicated on the Parameter
    Route::get('/{id}/default_schedule', 'DepartmentController@default_schedule');

    # Gets the Department of the ID indicated on the Parameter
    Route::post('/assign_handlers/{id}', 'DepartmentController@assign_handlers');

    # API Call for Announcements from Department
    Route::group(['prefix' => 'announcements', 'middleware' => []], function () {

        # Gets all the Department Announcements Lists
        Route::get('/all', 'DepartmentAnnouncementController@index');
        
        # Gets all the Department Announcements Lists
        Route::get('/dashboard_departments', 'DepartmentAnnouncementController@dashboard_index');

        #creates a new  Announcment for a Department
        Route::post('/create', 'DepartmentAnnouncementController@store');

        # Gets/Updates the Department Announcements of the ID indicated on the Parameter
        Route::get('/{id}', 'DepartmentAnnouncementController@show');

        Route::get('/strict/{id}', 'DepartmentAnnouncementController@show_strict');

        Route::get('/my_handle_announcements', 'DepartmentAnnouncementController@dashboard_index');

        Route::group(['prefix' => 'my_handle_announcements', 'middleware' => []], function () {

            # Gets/Updates the Department Announcements of the ID indicated on the Parameter
            Route::get('/{id}', 'DepartmentAnnouncementController@show');

            Route::post('/{id}/update', 'DepartmentAnnouncementController@update');

            Route::put('/{id}/update-status', 'DepartmentAnnouncementController@update_status');

            Route::delete('/{id}', 'DepartmentAnnouncementController@destroy');
    }); 

    });

});

