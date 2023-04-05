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
use App\location;

class LocationController extends Controller
{
    public function GetlocationDetails($id=null)
    {
        try {
        if($id == null){
             $location = DB::table('locations')->orderBy('id', 'ASC')->paginate(10);
            return [
                'data' => $location,
                'pagination' => [
                    'total' => $location->total(),
                    'count' => $location->count(),
                    'per_page' => $location->perPage(),
                    'current_page' => $location->currentPage(),
                    'last_page' => $location->lastPage(),
                ],
                
            ];
        }else{
            return $location = DB::table('locations')->where('id','=',$id)->orderBy('id', 'ASC')->get();
        }
    } catch (Exception $e) {
        return error_response(trans('messages.error_default'), $e);
    }
    	
    }

    public function GetlocationDetailscal()
    {

       try {
            
            return $location = DB::table('locations')->orderBy('id', 'ASC')->get();
 
    	} catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        }
    	
    }

    public function UpdateLocationDetails (Request $request, $id){
        
        try{
        $validator = Validator::make($request->all(), [
              'Locationname' => 'required',
          ]);
          if ($validator->fails()) {
            return response()->json(['errors'=>$validator->messages()]);
          }else{
            $roomcount = DB::table('locations')->where('location_name','=',$request -> Locationname)->where('id','<>',$id)->count();
        if($roomcount == 0){
            $updateLocation = location::where('id', $id)
            ->update([
                'location_name' => $request->Locationname,
             ]);
     
             if($updateLocation){
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
                            'message' => 'Location Name Already Exist',                     
                       ]);
                    }
          }
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        }
        }


    public function storeLocationDetails(Request $request)
    {

        try{
        $store = new location;
        $validator = Validator::make($request->all(), [
            'Locationname' => 'required',
          ]);
          if ($validator->fails()) {
            return response()->json(['errors'=>$validator->messages()]);
          }else{
            $roomcount = DB::table('locations')->where('location_name','=',$request -> Locationname)->count();
            if($roomcount == 0){
            $Locationname = $request -> Locationname;
            $store ->location_name = $Locationname;
            $savedata1=$store->save();
           

            if($savedata1){
                return response()->json([
         
                     'status' => '200',
                     'message' => 'Location Created Successfully',                     
                ]);
                    }else{
                        
                        return ["Result"=>"Data Not Saved"];
                    }
                }else{
                    return response()->json([
                 
                        'status' => '201',
                        'message' => 'Location Name Already Exist',                     
                   ]);
                }
                }
            } catch (Exception $e) {
                return error_response(trans('messages.error_default'), $e);
            }
    }

    public function DeleteLocationDetails($id){
        try{
        $res=location::find($id)->delete();
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
