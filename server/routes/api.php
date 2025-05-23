<?php

use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware('auth:api')->get('/user', function (Request $request) {
    return $request->user();
});


Route::get('Getroom', 'RoomController@GetroomDetails')->middleware('jwtauth', 'auth.apikey');
Route::get('Getroomcal', 'RoomController@GetroomDetailscal')->middleware('jwtauth', 'auth.apikey');
Route::get('Getroomlist/{roomid}', 'RoomController@Getroomlist')->middleware('jwtauth', 'auth.apikey');
Route::get('Getbookingroom/{roomid}', 'BookingController@GetBookingRoomDetails')->middleware('jwtauth', 'auth.apikey');
Route::post('storebooking', 'BookingController@storeBookingRoomDetails')->middleware('jwtauth', 'auth.apikey');
Route::post('storeroom', 'RoomController@storeRoomDetails')->middleware('jwtauth', 'auth.apikey');
Route::put('UpdateRoomdetails/{roomid}', 'RoomController@UpdateRoomdetails')->middleware('jwtauth', 'auth.apikey');
Route::get('DeleteRoomdetails/{roomid}', 'RoomController@DeleteRoomdetails')->middleware('jwtauth', 'auth.apikey');
Route::post('validatedate', 'BookingController@validatedate')->middleware('jwtauth', 'auth.apikey');
Route::post('storelocation', 'LocationController@storeLocationDetails')->middleware('jwtauth', 'auth.apikey');
Route::get('getlocation/{locationid?}', 'LocationController@GetlocationDetails')->middleware('jwtauth', 'auth.apikey');
Route::get('getlocationcal', 'LocationController@GetlocationDetailscal')->middleware('jwtauth', 'auth.apikey');
Route::put('UpdateLocationDetails/{roomid}', 'LocationController@UpdateLocationDetails')->middleware('jwtauth', 'auth.apikey');
Route::get('DeleteLocationDetails/{roomid}', 'LocationController@DeleteLocationDetails')->middleware('jwtauth', 'auth.apikey');
Route::get('GetBookeddetailsByid/{userid?}', 'BookingController@GetBookeddetailsByid')->middleware('jwtauth', 'auth.apikey');
Route::put('Roomapproval/{userid?}', 'BookingController@Roomapproval')->middleware('jwtauth', 'auth.apikey');
Route::get('GetBookeddetails', 'BookingController@GetBookeddetails')->middleware('jwtauth', 'auth.apikey');
Route::get('Getroomlistlocation_wise/{roomid}', 'RoomController@Getroomlistlocation_wise')->middleware('jwtauth', 'auth.apikey');
Route::get('Gettodayleaves', 'BookingController@get_today_leave_list')->middleware('jwtauth', 'auth.apikey');
Route::get('Gettommorowleaves', 'BookingController@get_tommorow_leave_list')->middleware('jwtauth', 'auth.apikey');
Route::get('Getitrequirement', 'BookingController@get_itrequirement_roomlist')->middleware('jwtauth', 'auth.apikey');
Route::post('insert_users', 'BookingController@insert_user_details');
Route::post('sync_users', 'SyncController@syncusers')->middleware('auth.apikey');
Route::post('sync_users_hris', 'SyncController@syncusers_HRIS')->middleware('auth.apikey');
Route::post('sync_holidays', 'SyncController@syncholidays')->middleware('auth.apikey');
Route::post('sync_leaves', 'SyncController@syncleaves')->middleware('auth.apikey');
Route::post('sync_timeoff_allocation', 'SyncController@timeoff_allocation_HRIS')->middleware('auth.apikey');
Route::post('sync_timeoff_allocation_new', 'SyncController@timeoff_allocation_HRIS_New')->middleware('auth.apikey');
Route::post('sync_timeoff_allocation_fail_sync', 'SyncController@timeoff_allocation_HRIS_fail_sync')->middleware('auth.apikey');
// Route::get('sendemail', 'BookingController@sendemail');
Route::get('get_dashboard_all/{page_type}', 'BookingController@get_dashboard_all')->middleware('jwtauth', 'auth.apikey');
Route::get('get_redis_notifications/{user_id}', 'RedisController@get_redis_notifications')->middleware('jwtauth', 'auth.apikey');

// PayRoll Dispute
Route::post('storedispute', 'DisputeController@store')->middleware('jwtauth', 'auth.apikey');
Route::get('getdispute', 'DisputeController@show')->middleware('jwtauth', 'auth.apikey');
Route::get('getdisputeExport', 'DisputeController@showExport')->middleware('jwtauth', 'auth.apikey');
Route::get('getpayrollcutoff/{fromdate}/{todate}', 'DisputeController@getpayrollcutoff')->middleware('jwtauth', 'auth.apikey');
Route::get('getuserdispute/{id}', 'DisputeController@getEmployeeDispute')->middleware('jwtauth', 'auth.apikey');
Route::put('updatedispute/{id}', 'DisputeController@UpdateDispute')->middleware('jwtauth', 'auth.apikey');

// Pocicies Documents
Route::post('uploadfiles', 'PoliciesDocumentController@upload');
Route::get('show', 'PoliciesDocumentController@show');
Route::get('get_user_departments', 'PoliciesDocumentController@get_user_departments');
Route::get('showlist', 'PoliciesDocumentController@showlist');
Route::put('updatestatus/{id}/{status}', 'PoliciesDocumentController@updatestatus');
Route::get('download_policy/{id}/', 'PoliciesDocumentController@downloadPolicy');

// NHO Survey
Route::post('nho_survey', 'NewHireOrientationController@store')->middleware('auth.apikey');