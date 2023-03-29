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
use App\Modules\User\Resources\UserListResourceCollection;

class BookingController extends Controller
{
    public function GetBookingRoomDetails($roomid)
    {
    return $booking = DB::table('bookings')
    ->select('bookings.room_id','bookings.start_date','bookings.end_date','bookings.total_hours','rooms.name')
    ->join('rooms', 'rooms.id', '=', 'bookings.room_id')
    ->where('bookings.room_id', $roomid)
    ->where('bookings.status','=','approved')
    ->orderBy('bookings.id', 'ASC')->get();
    }

    public function storeBookingRoomDetails(Request $request)
    {

        $startdate = $request -> Startdatetime;
        $enddate = $request -> EnddateTime;
        $room_id = $request -> Roomid;
        $count = 0;
          $eventcount = DB::select( DB::raw("SELECT count(*) as count FROM `bookings` WHERE ('". $startdate."' BETWEEN DATE_ADD(`start_date`, INTERVAL 1 SECOND) and DATE_SUB(`end_date`, INTERVAL 1 SECOND) OR '".$enddate."' BETWEEN DATE_ADD(`start_date`, INTERVAL 1 SECOND) and `end_date` OR DATE_ADD(`start_date`, INTERVAL 1 SECOND) BETWEEN  '". $startdate."' AND '".$enddate."' OR DATE_SUB(`end_date`, INTERVAL 1 SECOND) BETWEEN '". $startdate."' AND '".$enddate."') AND (status = 'approved' OR status = 'pending') AND room_id='".$room_id."'"));
        
          foreach($eventcount as $items)
          {
            $count = $items->count;
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
            if($totalhours <= 3){
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
            'message' => 'Meeting Room Already Booked For this Date',
            
       ]);
       }
       
    }

    public function GetBookeddetails(Request $request){
        
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
                ->where('bookings.total_hours','>',3);
                if( is_valid($request->status) ){
                $booking->where('bookings.status','=',$request->status);
                }
                if( is_valid($request->from_date) && is_valid($request->to_date) ){
                    $booking->whereBetween('bookings.start_date', [$request->from_date, $request->to_date]);
                }
                $result =$booking ->orderBy('bookings.id', 'DESC')->paginate(5);
                $count = DB::table('bookings')
                ->select('status', DB::raw('count(*) as total'))
                ->where('bookings.total_hours','>',3);
                if( is_valid($request->status) ){
                $count->where('bookings.status','=',$request->status);
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
            

            
            
            
    }

    // public function GetStatusCount (){

    // }

    public function GetBookeddetailsByid($id=null){
        
       
        if($id != null){
        
        return $booking = DB::table('bookings')
        ->select('bookings.id','bookings.user_id','bookings.note','bookings.room_id','bookings.start_date','bookings.end_date','bookings.total_hours','bookings.status','rooms.name',DB::raw("CONCAT(IF(users.first_name IS NOT NULL,users.first_name,''),IF(users.middle_name IS NOT NULL,users.middle_name,''),IF(users.last_name IS NOT NULL,users.last_name,'')) AS created_by"))
        ->join('rooms', 'rooms.id', '=', 'bookings.room_id')
        ->join('users','users.id', '=', 'bookings.user_id')
        ->where('bookings.id','=',$id)->get();

        }
    }

    
    public function Roomapproval(Request $request, $id){
  
        $validator = Validator::make($request->all(), [
              'ApprovalNote' => 'required',
          ]);
          if ($validator->fails()) {
            return response()->json(['errors'=>$validator->messages()]);
          }else{
            $startdate = $request -> Startdatetime;
            $enddate = $request -> EnddateTime;
            $count = 0;
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
             $message = $request->Status == 2 ? "Request Deny Successfully":"Request Approved Successfully";
             if($updatestatus){
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
    }
}
