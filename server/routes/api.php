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
Route::get('Gettodayleaves', 'BookingController@get_today_leave_list')->middleware('jwtauth', 'auth.apikey');;
Route::get('Gettommorowleaves', 'BookingController@get_tommorow_leave_list')->middleware('jwtauth', 'auth.apikey');;





