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

    Route::get('/get_department_all', 'DepartmentController@get_department_all');

    # Gets all the Department Lists
    Route::get('/all_with_announcements', 'DepartmentController@all_with_announcements');

    # Gets the Department of the ID indicated on the Parameter
    Route::get('/{id}', 'DepartmentController@find');

    # soft delete department
    Route::delete('/{id}', 'DepartmentController@destroy');

    # switch active status on using multi login
    Route::post('/{id}/switch_active_schedule', 'DepartmentController@set_active_on_sched');

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
        Route::get('/all', 'AnnouncementController@index');
        
        # Gets all the Department Announcements Lists
        Route::get('/dashboard_departments', 'AnnouncementController@dashboard_index');

        Route::get('/increment_dashboard_departments', 'AnnouncementController@increment_dashboard_index');

        #creates a new  Announcement for a Department
        Route::post('/create', 'AnnouncementController@store');

        # Gets/Updates the Department Announcements of the ID indicated on the Parameter
        Route::get('/{id}', 'AnnouncementController@show');

        Route::get('/strict/{id}', 'AnnouncementController@show_strict');

        Route::group(['prefix' => 'my_handle_announcements', 'middleware' => []], function () {
            # from my team department "my handled announcements"
            Route::get('/all', 'AnnouncementController@handle_announcements_index');

            # Gets/Updates the Department Announcements of the ID indicated on the Parameter
            Route::get('/{id}', 'AnnouncementController@show');

            Route::post('/{id}/update', 'AnnouncementController@update');

            Route::put('/{id}/update-status', 'AnnouncementController@update_status'); // uncheck fromcontrolelr

            Route::delete('/{id}', 'AnnouncementController@destroy');
    }); 

    
    Route::group(['prefix' => 'hr', 'middleware' => []], function () {

        Route::get('/all', 'AnnouncementController@all_hr_handled_Announcements');

        # Gets/Updates the Department Announcements of the ID indicated on the Parameter
        Route::get('/{id}', 'AnnouncementController@show_hr_strict'); // uncheck fromcontrolelr

        Route::post('/{id}/update', 'AnnouncementController@update'); // uncheck fromcontrolelr

        Route::put('/{id}/update-status', 'AnnouncementController@update_status'); // uncheck fromcontrolelr

        Route::delete('/{id}', 'AnnouncementController@destroy'); // uncheck fromcontrolelr
}); 

    });

});

