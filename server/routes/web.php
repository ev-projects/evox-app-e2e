<?php

use App\Modules\Bhr\Repositories\BhrRepository;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UtcTimeLogRepository;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/
Route::get('demo-generate-pdf','PDFController@demoGeneratePDF');
Route::get('/', function () {
    return view('welcome');
});



Route::get('/test', function () {
    $var = new BhrRepository();
    $var->sync_holidays( "2023-01-01", "2023-12-29" );
    
});
// Route::group(['middleware' => 'web'], function () {
//     Route::get('/google-login', 'Auth\LoginController@redirectToProvider')->name('login');
//     Route::get('/google-callback', 'Auth\LoginController@handleProviderCallback');
//     //Route::get('/get-token', 'Auth\LoginController@getToken');
// });

Route::get('/test_utc', function () {
   $utc_test = new UtcTimeLogRepository;
   $utc_test->update();
});


