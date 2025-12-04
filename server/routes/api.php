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
Route::post('uploadfiles', 'PoliciesDocumentController@upload')->middleware('jwtauth', 'auth.apikey');
Route::get('show', 'PoliciesDocumentController@show')->middleware('jwtauth', 'auth.apikey');
Route::get('get_user_departments', 'PoliciesDocumentController@get_user_departments')->middleware('jwtauth', 'auth.apikey');
Route::get('showlist', 'PoliciesDocumentController@showlist')->middleware('jwtauth', 'auth.apikey');
Route::put('updatestatus/{id}/{status}', 'PoliciesDocumentController@updatestatus')->middleware('jwtauth', 'auth.apikey');
Route::get('download_policy/{id}/', 'PoliciesDocumentController@downloadPolicy')->middleware('jwtauth', 'auth.apikey');

// NEO
Route::get('get_neo_onboarding_users/', 'NeoController@get_neo_onboarding_users')->middleware('jwtauth', 'auth.apikey');
Route::get('get_users_pending_submissions/', 'NeoController@get_users_pending_submissions')->middleware('jwtauth', 'auth.apikey');
Route::get('get_user_submissions_data/', 'NeoController@get_user_submissions_data')->middleware('jwtauth', 'auth.apikey');
Route::post('send_onboarding_link/', 'NeoController@send_onboarding_link')->middleware('jwtauth', 'auth.apikey');
Route::post('approve_submissions/', 'NeoController@approve_submissions')->middleware('jwtauth', 'auth.apikey');
Route::post('request_for_resubmission/', 'NeoController@request_for_resubmission')->middleware('jwtauth', 'auth.apikey');
Route::get('get_neo_file/{userId}/{fileId}', 'NeoController@get_file')->middleware('jwtauth', 'auth.apikey');

// NHO Survey
Route::get('nho_survey', 'NewHireOrientationController@index')->middleware('jwtauth', 'auth.apikey');
Route::post('nho_survey', 'NewHireOrientationController@store')->middleware('jwtauth', 'auth.apikey');

// EVA Survey
Route::get('eva_survey', 'EvaController@index')->middleware('jwtauth', 'auth.apikey');
Route::post('eva_survey', 'EvaController@store')->middleware('jwtauth', 'auth.apikey');

// EVA Registration
Route::get('eva_registration', 'EvaController@getEvaRegistration')->middleware('jwtauth', 'auth.apikey');
Route::post('eva_registration', 'EvaController@saveEvaRegistration')->middleware('jwtauth', 'auth.apikey');

// COC Agreement
Route::get('user_coc', 'CodeOfConductController@index')->middleware('jwtauth', 'auth.apikey');
Route::post('acknowledge_coc', 'CodeOfConductController@store')->middleware('jwtauth', 'auth.apikey');

Route::group(['prefix' => 'freshservice/', 'middleware' => ['jwtauth', 'auth.apikey']], function () {
    Route::get('workspaces', 'FreshServiceController@getWorkspaces');
    Route::group(['prefix' => 'tickets'], function () {
        Route::get('my-tickets', 'FreshServiceController@getMyTickets');
        Route::post('/', 'FreshServiceController@createTicket');
        Route::post('upload-image', 'FreshServiceController@saveTicketImage');
        Route::post('attachments', 'FreshServiceController@saveAttachment');
        Route::group(['prefix' => '{id}'], function () {
            Route::get('/', 'FreshServiceController@getTicket');
            Route::post('reply', 'FreshServiceController@sendTicketConversation');
            Route::get('conversations', 'FreshServiceController@getTicketConversation');
        });
    });
    Route::get('users/suggestions', 'FreshServiceController@getUserSuggestions');
});


// Happiness Survey
Route::get('happiness_survey', 'HappinessController@getHappinessSurvey')->middleware('jwtauth', 'auth.apikey');
Route::post('happiness_survey', 'HappinessController@addHappinessSurvey')->middleware('jwtauth', 'auth.apikey');