<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use App\Booking;
use App\itrequirement;
use Mail;
use App\Modules\User\Resources\UserListResourceCollection;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\Redis;
use DateTime;
use Illuminate\Support\Facades\Auth;
class BookingController extends Controller
{
    public function GetBookingRoomDetails($roomid)
    {

    try {
    $booking = DB::table('bookings')
    ->select('bookings.room_id','bookings.start_date','bookings.end_date','bookings.total_hours','rooms.name','users.first_name','users.last_name')
    ->join('rooms', 'rooms.id', '=', 'bookings.room_id')
    ->join('users', 'users.id', '=', 'bookings.user_id')
    ->where('bookings.room_id', $roomid)
    ->where('bookings.status','=','approved')
    ->orderBy('bookings.id', 'ASC')->get();
    return $booking;
    
    } catch (Exception $e) {
    return error_response(trans('messages.error_default'), $e);
    }
    }

    public function storeBookingRoomDetails(Request $request)
    {
        try {
        $startdate = $request -> Startdatetime;
        $enddate = $request -> EnddateTime;
        $room_id = $request -> Roomid;
        $count = 0;
          $eventcount = DB::select( DB::raw("SELECT count(*) as count FROM `bookings` WHERE ('". $startdate."' BETWEEN DATE_ADD(`start_date`, INTERVAL 1 SECOND) and DATE_SUB(`end_date`, INTERVAL 1 SECOND) OR '".$enddate."' BETWEEN DATE_ADD(`start_date`, INTERVAL 1 SECOND) and `end_date` OR DATE_ADD(`start_date`, INTERVAL 1 SECOND) BETWEEN  '". $startdate."' AND '".$enddate."' OR DATE_SUB(`end_date`, INTERVAL 1 SECOND) BETWEEN '". $startdate."' AND '".$enddate."') AND (status = 'approved' OR status = 'pending') AND room_id='".$room_id."'"));
        
          foreach($eventcount as $items)
          {
            $count = $items->count;
          }
         $createdby ='';
         $username = DB::select( DB::raw("SELECT CONCAT(IF(users.first_name IS NOT NULL,users.first_name,''),IF(users.middle_name IS NOT NULL,users.middle_name,''),IF(users.last_name IS NOT NULL,users.last_name,'')) AS created_by FROM `bookings` join `users` ON users.id=bookings.user_id WHERE ('". $startdate."' BETWEEN DATE_ADD(bookings.start_date, INTERVAL 1 SECOND) and DATE_SUB(bookings.end_date, INTERVAL 1 SECOND) OR '".$enddate."' BETWEEN DATE_ADD(bookings.start_date, INTERVAL 1 SECOND) and bookings.end_date OR DATE_ADD(bookings.start_date, INTERVAL 1 SECOND) BETWEEN  '". $startdate."' AND '".$enddate."' OR DATE_SUB(bookings.end_date, INTERVAL 1 SECOND) BETWEEN '". $startdate."' AND '".$enddate."') AND (bookings.status = 'approved' OR bookings.status = 'pending') AND bookings.room_id='".$room_id."'"));
         foreach($username as $items)
          {
            $createdby =  $items->created_by;
          }
       if($count == 0){
        $store = new Booking;
        $storerequirement =new itrequirement;
        $rules = array(
            
            "Roomid" => 'required',
            "Userid"=>'required',
            "Startdatetime"=>'required',
            "EnddateTime"=>'required',
        );
            $user_id = $request -> Userid;
            $totalhours =$request->Totalhours;
            $status = "pending";
            $message = "Room BookSuccessfully, Kindly Wait For Approval";
            if($totalhours <= 2){
                $status = "approved";
                $message = "Room BookSuccessfully";
            }
            $store ->room_id = $request -> Roomid;
            $store ->user_id = $request -> Userid;
            $store ->start_date = $request -> Startdatetime;
            $store ->end_date = $request -> EnddateTime;
            $store ->note = $request -> Note;
            $store ->total_hours=$totalhours;
            $store ->status=$status;
            $savedata1 = $store->save();
            $lastbookingid = $store->id;
            $requirement = $request->ITRequirement;


            if(count($requirement) > 0){
                foreach ($requirement as $items) {

                    $answers[] = [
                        'itrequirement' => $items,
                        'bookingid' => $lastbookingid,
                        
                    ];
                }
                itrequirement::insert($answers);
            }
            if($totalhours <= 2){
                if(count($requirement) > 0){
        $requirementlist= DB::table('itrequirements')
        ->select(DB::raw("CONCAT(IF(users.first_name IS NOT NULL,users.first_name,''),IF(users.middle_name IS NOT NULL,users.middle_name,''),IF(users.last_name IS NOT NULL,users.last_name,'')) AS user_name"),'locations.location_name','bookings.user_id', 'bookings.start_date', 'bookings.end_date', 'bookings.total_hours', 'rooms.name', DB::raw("GROUP_CONCAT(itrequirements.itrequirement) as Reqiurement_List"))
        ->join('bookings','itrequirements.bookingid','=','bookings.id')
        ->join('rooms','bookings.room_id','=','rooms.id')
        ->join('locations','rooms.location','=','locations.id')
        ->join('users','users.id','=','bookings.user_id')
        ->where('bookings.id','=', $lastbookingid)
        ->groupBy('itrequirements.bookingid')
        ->get();

        $array1 =  [
                    'data' => $requirementlist,
        ];
        
        try {
      
            Mail::send('mail', $array1  , function ($message)
            {
                $message->to('helpdesk@eastvantage.com', 'HelpDesk')
                    ->subject('Request for IT Requirement for Meeting Room');
                $message->from('evox@eastvantage.com', 'Evox');
            });
                } catch (Exception $e) {
                    return error_response(trans('messages.error_default'), $e);
                } 
            }
        }
            if($savedata1){
                return response()->json([
         
                     'status' => '200',
                     'message' => $message,
                     'userid'=>$user_id,
                     'roomid'=>$room_id
                     
                ]);
                    }else{
                        
                        return ["Result"=>"Data Not Saved"];
                    }
       } else{
        return response()->json([
         
            'status' => '201',
            'message' => 'Meeting Room Already Booked For this Date by '.$createdby.'',
            
       ]);
       }
    } catch (Exception $e) {
        return error_response(trans('messages.error_default'), $e);
    }
    }

    public function GetBookeddetails(Request $request){
     
        try {
        $numbers = array(
            "All" => 0,
            "pending" => 0, 
            "approved" => 0,
            "decline" => 0,
            "canceled" => 0,
        );
            
                $booking = DB::table('bookings')
                ->select('bookings.id','bookings.room_id','bookings.start_date','bookings.end_date','bookings.total_hours','bookings.status','rooms.name',DB::raw("CONCAT(IF(approveduser.first_name IS NOT NULL,approveduser.first_name,''),IF(approveduser.middle_name IS NOT NULL,approveduser.middle_name,''),IF(approveduser.last_name IS NOT NULL,approveduser.last_name,'')) AS approved_by"),DB::raw("CONCAT(IF(users.first_name IS NOT NULL,users.first_name,''),IF(users.middle_name IS NOT NULL,users.middle_name,''),IF(users.last_name IS NOT NULL,users.last_name,'')) AS created_by"))
                ->join('rooms', 'rooms.id', '=', 'bookings.room_id')
                ->join('users','users.id', '=', 'bookings.user_id')
                ->leftjoin(DB::raw("users as approveduser"), 'approveduser.id', '=', 'bookings.approved_by')
                ->where('bookings.total_hours','>',2);
                if( is_valid($request->status) ){
                $booking->where('bookings.status','=',$request->status);
                }
                if( is_valid($request->from_date) && is_valid($request->to_date) ){
                    // $booking->whereBetween('bookings.start_date', [$request->from_date, $request->to_date]);
                    $booking->whereDate('bookings.start_date', '>=', $request->from_date)
                    ->whereDate('bookings.start_date', '<=', $request->to_date);
                }
                $result =$booking ->orderBy('bookings.id', 'DESC')->paginate(10);
                
                $count = DB::table('bookings')
                ->select('status', DB::raw('count(*) as total'))
                ->where('bookings.total_hours','>',2);
                // if( is_valid($request->status) ){
                // $count->where('bookings.status','=',$request->status);
                // }
                if( is_valid($request->from_date) && is_valid($request->to_date) ){
                    // $booking->whereBetween('bookings.start_date', [$request->from_date, $request->to_date]);
                    $count->whereDate('bookings.start_date', '>=', $request->from_date)
                    ->whereDate('bookings.start_date', '<=', $request->to_date);
                }
                $statuscount = $count->groupBy('status')->get();
                $allcount = 0;
                foreach ($statuscount as $key => $value) {
                    $allcount = $allcount + $value->{'total'};
                    $numbers[$value->{'status'}] = $value->{'total'};
                    $numbers["All"] = $allcount;
                }
                return [
                    'data' => $result,
                    'pagination' => [
                        'total' => $result->total(),
                        'count' => $result->count(),
                        'per_page' => $result->perPage(),
                        'current_page' => $result->currentPage(),
                        'last_page' => $result->lastPage(),
                    ],
                    'statuscount'=> $numbers,
                    
                ];
            
            } catch (Exception $e) {
                return error_response(trans('messages.error_default'), $e);
            }
            
            
            
    }

    // public function GetStatusCount (){

    // }

    public function GetBookeddetailsByid($id=null){
        
       try {
        
        if($id != null){
        
        return $booking = DB::table('bookings')
        ->select('bookings.id','bookings.user_id','bookings.note','bookings.approver_note','bookings.room_id','bookings.start_date','bookings.end_date','bookings.total_hours','bookings.status','rooms.name',DB::raw("CONCAT(IF(users.first_name IS NOT NULL,users.first_name,''),IF(users.middle_name IS NOT NULL,users.middle_name,''),IF(users.last_name IS NOT NULL,users.last_name,'')) AS created_by"))
        ->join('rooms', 'rooms.id', '=', 'bookings.room_id')
        ->join('users','users.id', '=', 'bookings.user_id')
        ->where('bookings.id','=',$id)->get();

        }
    } catch (Exception $e) {
        return error_response(trans('messages.error_default'), $e);
    }
    }

    
    public function Roomapproval(Request $request, $id){
  
        try{
        $validator = Validator::make($request->all(), [
              'ApprovalNote' => 'required',
          ]);
          if ($validator->fails()) {
            return response()->json(['errors'=>$validator->messages()]);
          }else{
            $startdate = $request -> Startdatetime;
            $enddate = $request -> EnddateTime;
            $itcount = 0;
            $itcount = DB::table('itrequirements')
            ->select(DB::raw("Count(*) as count"))
            ->where('bookingid','=',$id)
            ->get();
            
    //       $eventcount = DB::select( DB::raw("SELECT count(*) as count FROM `bookings` WHERE ('". $startdate."' BETWEEN DATE_ADD(`start_date`, INTERVAL 1 SECOND) and DATE_SUB(`end_date`, INTERVAL 1 SECOND) OR '".$enddate."' BETWEEN DATE_ADD(`start_date`, INTERVAL 1 SECOND) and `end_date` OR DATE_ADD(`start_date`, INTERVAL 1 SECOND) BETWEEN  '". $startdate."' AND '".$enddate."' OR DATE_SUB(`end_date`, INTERVAL 1 SECOND) BETWEEN '". $startdate."' AND '".$enddate."') AND status = 'approved'"));
        
    //       foreach($eventcount as $items)
    //       {
    //         $count = $items->count;
    //       }

    //    if($count == 0){
            $updatestatus = Booking::where('id', $id)
            ->update([
                'approver_note' => $request->ApprovalNote,
                'status'=>$request->Status,
                'approved_by'=>$request->Approvedby
             ]);
             $message = $request->Status == "declined" ? "Request Deny Successfully":"Request Approved Successfully";
             if($updatestatus){
               if($request->Status != "declined" )  {
                if($itcount[0]->count != 0){
                    $requirementlist= DB::table('itrequirements')
                    ->select(DB::raw("CONCAT(IF(users.first_name IS NOT NULL,users.first_name,''),IF(users.middle_name IS NOT NULL,users.middle_name,''),IF(users.last_name IS NOT NULL,users.last_name,'')) AS user_name"),'locations.location_name','bookings.user_id', 'bookings.start_date', 'bookings.end_date', 'bookings.total_hours', 'rooms.name', DB::raw("GROUP_CONCAT(itrequirements.itrequirement) as Reqiurement_List"))
                    ->join('bookings','itrequirements.bookingid','=','bookings.id')
                    ->join('rooms','bookings.room_id','=','rooms.id')
                    ->join('locations','rooms.location','=','locations.id')
                    ->join('users','users.id','=','bookings.user_id')
                    ->where('bookings.id','=', $id)
                    ->groupBy('itrequirements.bookingid')
                    ->get();
            
                    $array1 =  [
                                'data' => $requirementlist,
                    ];
                    
                    // try {
                  
                    //     Mail::send('mail', $array1  , function ($message)
                    //     {
                    //         $message->to('helpdesk@eastvantage.com', 'HelpDesk')
                    //             ->subject('Request for IT Requirement for Meeting Room');
                    //         $message->from('evox@eastvantage.com', 'Evox');
                    //     });
                    //         } catch (Exception $e) {
                    //             return error_response(trans('messages.error_default'), $e);
                    //         } 
                }
                   
                }
               
                 return response()->json([
          
                      'status' => '200',
                      'message' => $message,                     
                 ]);
                     }else{
                         
                         return ["Result"=>"Data Not Saved"];
                     }
        //   }else{
        //     return response()->json([
          
        //         'status' => '200',
        //         'message' => 'Already Room Booked For This Date',                     
        //    ]);
        //   }
       
        }
    } catch (Exception $e) {
        return error_response(trans('messages.error_default'), $e);
    }
    }


    public function get_today_leave_list(){
        
        try {

            $user = User::find(auth()->user()->id);
            $redisresponse = Redis::get($user->id.':get_today_leave_list');
            Redis::del(Redis::keys('laravel_cache:*'));
            $data = json_decode($redisresponse, FALSE);

            if(isset($data->today_leaves)) {
               
                return [
                    'data' => $data->today_leaves,
                    'message' => "From redis",
                ];
            }else{
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
                
                $Expiretime = (strtotime('tomorrow') - string_offset_to_seconds(Auth::user()->country_timezone_to_offset())) - datetime_to_timestamp(  date("Y-m-d H:i:s"));
                if($Expiretime < 0){
                    $Expiretime = $Expiretime + (86400);
                    Redis::set($user->id.':get_today_leave_list',json_encode(array_merge( 
                        array('today_leaves' => $booking),
                    )),"EX",$Expiretime);
                }else{
                    Redis::set($user->id.':get_today_leave_list',json_encode(array_merge( 
                        array('today_leaves' => $booking),
                    )),"EX",$Expiretime);
                }
               

                

                return [
                   'data' => $booking,
                   
               ];
               
            }
          
      

     } catch (Exception $e) {
         return error_response(trans('messages.error_default'), $e);
     }
    }
     public function get_tommorow_leave_list(){

        
        try {
            $user = User::find(auth()->user()->id);
            $redisresponse = Redis::get($user->id.':get_tommorow_leave_list');
            Redis::del(Redis::keys('laravel_cache:*'));
            // $current_time = datetime_to_timestamp(  date("Y-m-d H:i:s") );
            // dump(date("Y-m-d H:i:s"));
            
            if(isset($redisresponse)) {
            $data = json_decode($redisresponse , FALSE);

                return [
                    'data' => $data,
                    'message' => "From redis",
                ];
            }else{
                // dd("Test");
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
                // dump(strtotime('tomorrow'));
                // dump(strtotime('tomorrow') - string_offset_to_seconds(Auth::user()->country_timezone_to_offset()));
                // dd( datetime_to_timestamp(  date("Y-m-d H:i:s")));
                $Expiretime = (strtotime('tomorrow') - string_offset_to_seconds(Auth::user()->country_timezone_to_offset())) - datetime_to_timestamp(  date("Y-m-d H:i:s"));
                if($Expiretime < 0){
                    $Expiretime = $Expiretime + (86400);
                    Redis::set($user->id.':Expiretime', $Expiretime,"EX",$Expiretime);
                    Redis::set($user->id.':get_tommorow_leave_list', $booking,"EX", $Expiretime);
                }else{
                    Redis::set($user->id.':get_tommorow_leave_list', $booking,"EX", $Expiretime);
                    Redis::set($user->id.':Expiretime', $Expiretime,"EX",$Expiretime);
                }

                // dd($Expiretime );
             
                
                return [
                   'data' => $booking,
                   
               ];
               
            }

      



        
     } catch (Exception $e) {
         return error_response(trans('messages.error_default'), $e);
     }




     }

     public function get_itrequirement_roomlist(){
        
        try {

        $country_id = auth()->user()->country_id;
  
        $requirementlist= DB::table('itrequirements')
        ->select(DB::raw("CONCAT(IF(users.first_name IS NOT NULL,users.first_name,''),IF(users.middle_name IS NOT NULL,users.middle_name,''),IF(users.last_name IS NOT NULL,users.last_name,'')) AS user_name"), 'bookings.user_id', 'bookings.start_date', 'bookings.end_date', 'bookings.total_hours', 'rooms.name', DB::raw("GROUP_CONCAT(itrequirements.itrequirement) as Reqiurement_List"))
        ->join('bookings','itrequirements.bookingid','=','bookings.id')
        ->join('rooms','bookings.room_id','=','rooms.id')
        ->join('users','users.id','=','bookings.user_id')
        ->where('users.country_id','=',$country_id)
        ->where('bookings.start_date','>=',DB::raw("DATE_FORMAT(NOW(),'%Y-%m-%d')"))
        ->groupBy('itrequirements.bookingid')
        ->paginate(10);
            return [
                'data' => $requirementlist,
                'pagination' => [
                    'total' => $requirementlist->total(),
                    'count' => $requirementlist->count(),
                    'per_page' => $requirementlist->perPage(),
                    'current_page' => $requirementlist->currentPage(),
                    'last_page' => $requirementlist->lastPage(),
                ],
                
            ];

        // Before Fecthing  the IT Requirement

        //  $requirementlist = DB::table('itrequirements')
        //  ->select(DB::raw("CONCAT(IF(users.first_name IS NOT NULL,users.first_name,''),IF(users.middle_name IS NOT NULL,users.middle_name,''),IF(users.last_name IS NOT NULL,users.last_name,'')) AS user_name"), 'bookings.user_id', 'bookings.start_date', 'bookings.end_date', 'bookings.total_hours', 'rooms.name')
        //  ->join('bookings','itrequirements.bookingid','=','bookings.id')
        //  ->join('rooms','bookings.room_id','=','rooms.id')
        //  ->join('users','users.id','=','bookings.user_id')
        //  ->where('users.country_id','=',$id)
        //  ->paginate(10);
        //     return [
        //         'data' => $requirementlist,
        //         'pagination' => [
        //             'total' => $requirementlist->total(),
        //             'count' => $requirementlist->count(),
        //             'per_page' => $requirementlist->perPage(),
        //             'current_page' => $requirementlist->currentPage(),
        //             'last_page' => $requirementlist->lastPage(),
        //         ],
                
        //     ];


     } catch (Exception $e) {
         return error_response(trans('messages.error_default'), $e);
     }



     
     }


     function sendemail(){
        
        $requirementlist= DB::table('itrequirements')
        ->select(DB::raw("CONCAT(IF(users.first_name IS NOT NULL,users.first_name,''),IF(users.middle_name IS NOT NULL,users.middle_name,''),IF(users.last_name IS NOT NULL,users.last_name,'')) AS user_name"),'locations.location_name','bookings.user_id', 'bookings.start_date', 'bookings.end_date', 'bookings.total_hours', 'rooms.name', DB::raw("GROUP_CONCAT(itrequirements.itrequirement) as Reqiurement_List"))
        ->join('bookings','itrequirements.bookingid','=','bookings.id')
        ->join('rooms','bookings.room_id','=','rooms.id')
        ->join('locations','rooms.location','=','locations.id')
        ->join('users','users.id','=','bookings.user_id')
        ->where('bookings.id','=', 113)
        ->groupBy('itrequirements.bookingid')
        ->get();

        $array1 =  [
                    'data' => $requirementlist,
        ];
        
        try {
      
            Mail::send('mail', $array1  , function ($message)
            {
                $message->to('helpdesk@eastvantage.com', 'HelpDesk')
                    ->subject('Test.');
                $message->from('evox@eastvantage.com', 'Evox');
            });
            echo "Successfully sent the email";
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        } 

    }
}
