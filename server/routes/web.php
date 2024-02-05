<?php

use App\Features;
use Carbon\Carbon;
use App\EvoxLevels;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\DB;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Request\Models\Overtime;
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


// Route::group(['middleware' => ['web', 'guest']], function () {
//     Route::get('/google-login', 'Auth\LoginController@redirectToGoogle')->name('login');
//     Route::get('/google-callback', 'Auth\LoginController@handleGoogleCallback');


//     Route::get('/microsoft-login', 'Auth\LoginController@redirectToMS')->name('login');
//     Route::get('/microsoft-callback', 'Auth\LoginController@handleMSCallback');
//     //Route::get('/get-token', 'Auth\LoginController@getToken');
// });
/*Route::group(['middleware' => ['web', 'MsGraphAuthenticated']], function () {
    Route::get('/microsoft-callback', 'Auth\LoginController@handleMSCallback');
});*/

Route::get('/2', function () {
//    $utc_test = new UtcTimeLogRepository;
//    $utc_test->update();
// dd("here");

$id=[];



$response = call_sp("EH_SP_Employee_List",

[
    3171, // vishnu user_id
    2, // level
    5,
    null,
    1,
    null,
    null,
    1,
    20,
    2 
    
    ]


); 

    $result = array(
        "query" =>  $response ?? [],
    );

dd($result);
});

 Route::get('/3', function () {
    

    $response =  call_sp("EH_SP_Direct_Supervisor",

[
   3538
    
]);
    $result = array(
        "query" =>  $response ?? [],
    );
    if(is_valid( $result["query"][0][0])){
        dd( User::find($result["query"][0][0]->SupervisorId));
    }

dd($result, is_valid( $result["query"] [0][0]),  $result["query"] [0][0]);




    });
    
    Route::get('/4', function () {
    //   $user = User::find(3153);

    //   dd($user->direct_supervisor());

    DB::beginTransaction();
    try {
        error_log("here");
$login = Features::create([ 'feature_name' =>"login", 'feature_label'=>"Login"]);
$dtr_access = Features::create([ 'feature_name' =>"dtr_access", 'feature_label'=>"DTR Access"]);

$login->features_level()->attach([2]);


// error_log("pass");
//     $Admin = EvoxLevels::where("Name", "Admin")->first();
//     // $Employee = EvoxLevels::where("Name", "=", "Employee")->first();
//         // dd($Admin);
//     $Admin->level_features()->attach($Admin,[

//         $login->id ,
//         $dtr_access->id,
//     ]);

    DB::commit();
} catch (Exception $e) {
    DB::rollback();
    dd($e);
}
        });



        Route::get('/5', function () {
            $user = User::find(3153);

            dd($user->LevelId,$user->getFeatureAccess()->toArray());
                });
        
        
        
        