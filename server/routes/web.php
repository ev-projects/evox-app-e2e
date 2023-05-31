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



Route::get('/test', function () {

     $start_date =  Carbon::now()->subMonth(4)->format("Y-m-d");
     $end_date =  Carbon::now()->addMonth(3)->format("Y-m-d");


     $dtr_holidays_to_delete = Dtr::where("date",  Carbon::now()->format("Y-m-d"))->pluck('id')->toArray();
     dump($dtr_holidays_to_delete);
     
    // $var = new BhrRepository();
    // $var->sync_holidays( $start_date, $end_date );
    
    
    
});
Route::group(['middleware' => 'web'], function () {
    Route::get('/google-login', 'Auth\LoginController@redirectToProvider')->name('login');
    Route::get('/google-callback', 'Auth\LoginController@handleProviderCallback');
    //Route::get('/get-token', 'Auth\LoginController@getToken');
});

// Route::get('/test_utc', function () {
//    $utc_test = new UtcTimeLogRepository;
//    $utc_test->update();
// });


