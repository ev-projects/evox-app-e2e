<?php

namespace App\Http\Controllers;
use Mail;
use Exception;
use App\itrequirement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Modules\User\Resources\UserListResourceCollection;

class DashboardController extends Controller
{
    public function get_dashboard_all($page_type,  Request $request){
        
            try {
                $user = Auth::user();

                $parameter = [   $user->LevelId, 
                                $user->id ,  
                                null,
                                $user->country_id,
                                $page_type,
                                null,
                                null
                            ];

                            if($page_type == 3){
                                    $department_id = ($request->dep_id == "all" || $request->dep_id == null) ? null : $request->dep_id;
                                    $parameter =  [     $user->LevelId, 
                                                        $user->id ,  
                                                        $department_id,                            
                                                        $user->country_id,
                                                        $page_type,
                                                        ($request->page != null)? ($request->page) :1,
                                                        ($request->page != null)? 3 :6
                                    ];
                            }
                            

                
                $response =  call_sp("EH_SP_Dashboard", $parameter);
             
                $summarized_response = [];
               
                if($page_type == 1){ 


                    $seg_result = array_reduce( $response[0], function ($carry, $item) {

                        if (!isset($carry[$item->leave_day])) {
                            $carry[$item->leave_day] = [];
                        }
                        $carry[$item->leave_day][] = $item;
                        return $carry;
                    }, []);
                    $summarized_response["todayleaves"] = isset($seg_result['Today']) ? $seg_result["Today"]: [];

                    $summarized_response["tommorowleaves"] = []; // i added this reason if this was spellchecked in the future
                    if(isset($seg_result['Tomorrow'])){
                        $summarized_response["tommorowleaves"] =  $seg_result["Tomorrow"];
                    }
                    if(isset($seg_result['Tomorow'])){
                        $summarized_response["tommorowleaves"] =  $seg_result["Tomorow"];
                    }
                    $summarized_response["dashboardholiday"] = $response[1];
                    $summarized_response["status_numbers"] =
                    [
                        "alterlogpending"   => (string)( isset($response[3][0]->MyRequest) ?$response[3][0]->requestCount : 0), 
                        "overtimepending"   => (string)( isset($response[3][0]->MyRequest) ?$response[3][1]->requestCount : 0),
                        "restdayworkpending"    => (string)(isset($response[3][0]->MyRequest) ? $response[3][2]->requestCount : 0),
                        "changeschedulepending" =>  (string)(isset($response[3][0]->MyRequest) ? $response[3][3]->requestCount : 0),


                    
                        "team_alterlogpending" =>(string)( isset($response[2][1]->MyTeamRequest) ?$response[2][0]->requestCount : 0), 
                        "team_overtimepending"  =>(string)( isset($response[2][1]->MyTeamRequest) ?$response[2][1]->requestCount : 0),
                        "team_restdayworkpending"   =>  (string)(isset($response[2][1]->MyTeamRequest) ? $response[2][2]->requestCount : 0),
                        "team_changeschedulepending"    =>  (string)(isset($response[2][1]->MyTeamRequest) ? $response[2][3]->requestCount : 0),
                    ];
                }
                if($page_type == 2){
                    // Sort celebrations by date in ascending order
                    usort($response[0], function ($a, $b) {
                        return strtotime($a->date) <=> strtotime($b->date);
                    });

                    foreach ($response[0] as $key => $value) {
                        // Prepend 0 if date is single digit
                        $celebration = explode(' ', $value->date);
                        $month = $celebration[0];
                        $day = str_pad($celebration[1], 2, '0', STR_PAD_LEFT);
                        $value->date = $month . ' ' . $day;

                        // Transform display's first char to upper case
                        $value->display = ucfirst($value->display);
                    }

                    $summarized_response["team_birthday"] = $response[0];
                }
                if($page_type == 3){
                    $summarized_response["departments"] = $response[0];


                    $summarized_response["announcements"] = $response[1];

                    if(!($request->dep_id == "all" || $request->dep_id == null)){
                        $summarized_response["announcements"] = $response[2];
                    }
                }
                if($page_type == 4){
                    //evoxupdate here hut removed
                }

            return [
                'data' => $summarized_response,
                
            ];

        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        }
     }

    public function get_today_leave_list(){
        try {
            $page_type = 3;
            $user = Auth::user();
            $response =  call_sp("EH_SP_Dashboard", [   $user->LevelId, 
                                                $user->id ,  
                                                null,// $user->department_id,
                                                $user->country_id,
                                                $page_type
                                            ]

                                            );
            $user_list = auth()->user()->users_handled();

            $booking = DB::table('leaves')
                ->select('users.id',DB::raw("CONCAT(IF(users.first_name IS NOT NULL,users.first_name,''),' ',IF(users.middle_name IS NOT NULL,users.middle_name,''),' ',IF(users.last_name IS NOT NULL,users.last_name,'')) AS user_name"),'leaves.type')
                ->join('dtrs', 'dtrs.id', '=', 'leaves.dtr_id')
                ->join('users','users.id', '=', 'dtrs.user_id')
                ->whereIn('users.id', $user_list->pluck('id')->toArray())
                ->where('leaves.status','=','approved')
                ->where('leaves.amount','>','0')
                ->where('users.is_active','=','1')
                ->where('dtrs.date','=',DB::raw("DATE_FORMAT(NOW(),'%Y-%m-%d')"))->get();

            return [
                'data' => $booking,
            ];
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        }
    }

    public function get_tommorow_leave_list(){
        
        try {

         $user_list = auth()->user()->users_handled();

         $booking = DB::table('leaves')
         ->select('users.id',DB::raw("CONCAT(IF(users.first_name IS NOT NULL,users.first_name,''),' ',IF(users.middle_name IS NOT NULL,users.middle_name,''),' ',IF(users.last_name IS NOT NULL,users.last_name,'')) AS user_name"),'leaves.type')
         ->join('dtrs', 'dtrs.id', '=', 'leaves.dtr_id')
         ->join('users','users.id', '=', 'dtrs.user_id')
         ->whereIn('users.id', $user_list->pluck('id')->toArray())
         ->where('leaves.status','=','approved')
         ->where('leaves.amount','>','0')
         ->where('users.is_active','=','1')
         ->where('dtrs.date','=',DB::raw("DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 DAY),'%Y-%m-%d')"))->get();
         return [
            'data' => $booking,
            
        ];
     } catch (Exception $e) {
         return error_response(trans('messages.error_default'), $e);
     }




     }
}