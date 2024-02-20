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


// `EH_SP_Get_Department_By_UserId`(
//     IP_User_Id INT,
//     IP_Department_Id VARCHAR(500)
//     )
$response = call_sp("EH_SP_Get_Department_By_UserId",

[
    3153,null
    
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


   
                            dump(json_decode('{["new_time_in":"2023-10-17 09:09:52","new_time_out":"2023-10-17 21:15:54"]}'));
        });



        Route::get('/5', function () {


            $aUTTT = User::find(1698);

            // if(  $aUTTT->level_type() == "Admin" ) {
            //     echo true;
            // }else{
            //     echo 123;
            // }
           
            if( true ) {
                $user_direct_sup =  User::findOrFail(3153)->direct_supervisor_temp();
                if(!is_valid( $user_direct_sup)){
                    echo false;
                }
                echo $aUTTT->id ==  $user_direct_sup->id ? 'true000' : "false";
                // echo $aUTTT->users_handled()->findOrFail(  ) ? 'true000' : false;
            } else {
                $user_direct_sup =  User::find(2947)->direct_supervisor_temp();
                if(!is_valid( $user_direct_sup)){
                    echo false;
                }
                echo $aUTTT->id ==  $user_direct_sup->id ? 'true000' : "false";
            }
        });
        
        
        Route::get('/6', function () {
    
            $user = user::find(3171);
             dd($user-> users_SP_handled());
            $perpage_count = 15;
            $response = call_sp("EH_SP_Employee_List",
            
            [
                $user->id, // vishnu user_id
                is_valid(  $user->LevelId ) ?  $user->LevelId: null, // level
                null,
                null,
                1, // active
                null, // name
                null, // job_title
                1,
                9999,
                1 
                
                ]


            ); 
            
                $result = array(
                    "query" =>  $response ?? [],
                );

       
            if( count($result['query']) > 2){
                $collection["data"] = $result['query'][count($result['query'])-3];
            }
 
        $ids = array_pluck($result['query'][count($result['query'])-3], "id");
        dd( $result['query'][count($result['query'])-3], $ids);
        
        
        
        
            });
        