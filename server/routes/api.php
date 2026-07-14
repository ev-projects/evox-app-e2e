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


Route::get('Gettodayleaves', 'DashboardController@get_today_leave_list')->middleware('jwtauth', 'auth.apikey');
Route::get('Gettommorowleaves', 'DashboardController@get_tommorow_leave_list')->middleware('jwtauth', 'auth.apikey');
Route::get('get_dashboard_all/{page_type}', 'DashboardController@get_dashboard_all')->middleware('jwtauth', 'auth.apikey');
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

// Masters — lookup tables for the Stefan Attendance API (EVOX-254)
Route::get('masters/departments', 'MastersController@departments')->middleware('jwtauth', 'auth.apikey');