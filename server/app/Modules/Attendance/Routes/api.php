<?php

use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| API Routes — Attendance Module
|--------------------------------------------------------------------------
|
| Read-only Attendance endpoints exposed for the Stefan (CTO) integration.
| All endpoints require both JWT auth and the standard API key (same gate
| every other production module uses) and respect geo-based access control
| via AttendanceGeoGate.
|
| Endpoints:
|   GET /api/attendance/by-geo/{geoId}
|   GET /api/attendance/by-department/{departmentId}
|   GET /api/attendance/by-employee/{employeeId}
|
| Optional query params on every endpoint:
|   ?from=YYYY-MM-DD  (default: first day of current month)
|   ?to=YYYY-MM-DD    (default: today)
|   ?per_page=N       (default: 50, max: 200; ignored on by-employee)
|   ?page=N           (default: 1)
*/

# Attendance API
Route::group(['prefix' => 'attendance', 'middleware' => ['jwtauth', 'auth.apikey']], function () {

    # Get attendance for all employees in a geo (country)
    Route::get('/by-geo/{geoId}', 'AttendanceController@byGeo')
        ->where('geoId', '[0-9]+');

    # Get attendance for all employees in a department
    Route::get('/by-department/{departmentId}', 'AttendanceController@byDepartment')
        ->where('departmentId', '[0-9]+');

    # Get attendance for a single employee
    Route::get('/by-employee/{employeeId}', 'AttendanceController@byEmployee')
        ->where('employeeId', '[0-9]+');
});

# Geo / Country master read endpoint (utc_timelog table doubles as the country master)
Route::group(['prefix' => 'attendance/geos', 'middleware' => ['jwtauth', 'auth.apikey']], function () {

    # List all geos available to the calling user
    Route::get('/', 'GeoController@index');
});
