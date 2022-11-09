<?php

use App\Modules\User\Models\User;

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

Route::get('/', function () {
    return view('welcome');
});


Route::group(['middleware' => 'web'], function () {
    Route::get('/google-login', 'Auth\LoginController@redirectToProvider')->name('login');
    Route::get('/google-callback', 'Auth\LoginController@handleProviderCallback');
    //Route::get('/get-token', 'Auth\LoginController@getToken');
});

