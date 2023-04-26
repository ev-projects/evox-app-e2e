<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
use App\Http\Controllers\Response;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use App\Room;

class RoomController extends Controller
{
    public function GetroomDetails()
    {
        try{
    	$rooms = DB::table('rooms')
        ->select('rooms.id','rooms.name','rooms.seats','rooms.description','locations.location_name')
        ->join('locations', 'locations.id', '=', 'rooms.location')
        ->orderBy('id', 'ASC')->paginate(10);

        return [
            'data' => $rooms,
            'pagination' => [
                'total' => $rooms->total(),
                'count' => $rooms->count(),
                'per_page' => $rooms->perPage(),
                'current_page' => $rooms->currentPage(),
                'last_page' => $rooms->lastPage(),
            ],
            
        ];
    } catch (Exception $e) {
        return error_response(trans('messages.error_default'), $e);
    }
    	
    }

    public function GetroomDetailscal()
    {
        try{
    	return $rooms = DB::table('rooms')->orderBy('id', 'ASC')->get();

    } catch (Exception $e) {
        return error_response(trans('messages.error_default'), $e);
    }
    }

    public function Getroomlist($id)
    {
        try{
    	return $rooms = DB::table('rooms')->where('id','=',$id)->get();
    } catch (Exception $e) {
        return error_response(trans('messages.error_default'), $e);
    }
    }

    public function Getroomlistlocation_wise($location_id)
    {
        try{
    	return $rooms = DB::table('rooms')->where('location','=',$location_id)->orderBy('id', 'ASC')->get();
    } catch (Exception $e) {
        return error_response(trans('messages.error_default'), $e);
    }
    }

    public function storeRoomDetails(Request $request)
    {

        try{
        $store = new Room;
        $validator = Validator::make($request->all(), [
            'RoomName' => 'required',
            'Location' => 'required',
          ]);
          if ($validator->fails()) {
            return response()->json(['errors'=>$validator->messages()]);
          }else{
            $roomcount = DB::table('rooms')
            ->where('name','=',$request -> RoomName)
            ->where('location','=',$request -> Location)
            ->count();
            if($roomcount == 0){
                $roomname = $request -> RoomName;
                $location = $request -> Location;
                $desctiption =$request->Description;
                $seats =$request->Seats;
                $store ->name = $roomname;
                $store ->location = $location;
                $store ->description = $desctiption;
                $store ->seats = $seats;
                $savedata1=$store->save();
               
    
                if($savedata1){
                    return response()->json([
             
                         'status' => '200',
                         'message' => 'Room Created Successfully',                     
                    ]);
                        }else{
                            
                            return ["Result"=>"Data Not Saved"];
                        }
            }else{
                return response()->json([
             
                    'status' => '201',
                    'message' => 'Room Name Already Exist',                     
               ]);
            }
           
                }
            } catch (Exception $e) {
                return error_response(trans('messages.error_default'), $e);
            }
    }

  public function UpdateRoomdetails (Request $request, $id){
  
    try{
    $validator = Validator::make($request->all(), [
        'RoomName' => 'required',
        'Location' => 'required',
      ]);
      if ($validator->fails()) {
        return response()->json(['errors'=>$validator->messages()]);
      }else{
        $roomcount = DB::table('rooms')
        ->where('name','=',$request -> RoomName)
        ->where('location','=',$request -> Location)
        ->where('id','<>',$id)->count();
        if($roomcount == 0){
        $updateRoom = Room::where('id', $id)
        ->update([
            'name' => $request->RoomName,
            'location'=>$request -> Location,
            'description'=>$request ->Description,
            'seats'=>$request ->Seats,
         ]);
 
         if($updateRoom){
             return response()->json([
      
                  'status' => '200',
                  'message' => 'Updated Successfully',                     
             ]);
                 }else{
                     
                     return ["Result"=>"Data Not Saved"];
                 }
                   }else{
                return response()->json([
             
                    'status' => '201',
                    'message' => 'Room Name Already Exist',                     
               ]);
            }
      }
    } catch (Exception $e) {
        return error_response(trans('messages.error_default'), $e);
    }
   
    }

    public function DeleteRoomdetails($id){

        try{
        $res=Room::find($id)->delete();
        if ($res){
            $data=[
                'status'=>'1',
                'message'=>'Successfully Deleted'
            ];
        }else{
            $data=[
                'status'=>'0',
                'message'=>'Error'
            ];
       
    }
    return response()->json($data);
} catch (Exception $e) {
    return error_response(trans('messages.error_default'), $e);
}
}
}
