<?php

use Carbon\Carbon;
use App\Modules\User\Models\User;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Bhr\Repositories\BhrRepository;
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


Route::group(['middleware' => ['web', 'guest']], function () {
    Route::get('/google-login', 'Auth\LoginController@redirectToGoogle')->name('login');
    Route::get('/google-callback', 'Auth\LoginController@handleGoogleCallback');


    Route::get('/microsoft-login', 'Auth\LoginController@redirectToMS')->name('login');
    Route::get('/microsoft-callback', 'Auth\LoginController@handleMSCallback');
    //Route::get('/get-token', 'Auth\LoginController@getToken');
});
/*Route::group(['middleware' => ['web', 'MsGraphAuthenticated']], function () {
    Route::get('/microsoft-callback', 'Auth\LoginController@handleMSCallback');
});*/

// Route::get('/test_utc', function () {
//    $utc_test = new UtcTimeLogRepository;
//    $utc_test->update();
// });


