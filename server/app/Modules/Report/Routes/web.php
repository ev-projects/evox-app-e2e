<?php

use App\Modules\User\Models\User;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| This file is where you may define all of the routes that are handled
| by your module. Just tell Laravel the URIs it should respond
| to using a Closure or controller method. Build something great!
|
*/

Route::group(['prefix' => 'report'], function () {
    Route::get('/', function () {
        dd('This is the Report module index page. Build something great!');
    });
});
Route::get('/2', "ReportController@export_sample_summary");

Route::get('/3',  function () {
    $user = User::with('supervisee','supervisee.department')->find(2);
    $user_list = $user->supervisee->take(4);

    foreach( $user_list as $key => $employee){
        dump($key);
    }
dump( $user,$user_list);

}
);