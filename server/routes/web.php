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

Route::get('/sync_users',    'CronController@sync_users');
Route::get('/2', function () {
    $user = User::with("department")->find(2);
   dump($user ->department->department_name);
});


Route::get('/3', function () {
    $recepient = User::with("department")->find(2);
    $list_employees = User::with("department")->take(5)->get();
    return view('emails.reminders.new-users-to-supervisor-reminder', compact("recepient","list_employees"));
});