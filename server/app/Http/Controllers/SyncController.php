<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use App\temp_user;
use Illuminate\Support\Facades\Hash;
class SyncController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function syncusers(Request $request)
    {
        try {

            $validator = Validator::make($request->all(), [
                "firstName" => 'required',
                "bestEmail" => 'required',
                "lastName"=>'required',
                "employeeNumber"=>'required',
                "bhrNumber"=>'required',
                "status"=>'required'
            ]);
            if ($validator->fails()) {
              return response()->json(['errors'=>$validator->messages()]);
            }else{
    
                $result = DB::select('call EV_SP_User_sync("'.$request->bestEmail.'", '.$request->employeeNumber.'
                ,'.$request->bhrNumber.', "'.$request->userName.'","'.Hash::make( get_constant('DEFAULT_PASSWORD') ).'","'.$request->firstName.'", "'.$request->middleName.'"
                ,"'.$request->lastName.'", "'.$request->nickname.'","'.$request->employmentHistoryStatus.'", "'.$request->hireDate.'"
                ,'.$request->status.', "'.$request->jobTitle.'","'.$request->country.'", "'.$request->dateOfBirth.'"
                ,"'.$request->terminationDate.'", "'.$request->department.'","'.$request->mobilePhone.'", '.$request->supervisorId.')');       
    
                if(isset($result)){
                    return response()->json([
              
                        'status' => '200',
                        'message' => "Insert Or Updated Successfully",
                        'Employee Name' => $request->firstName. ($request->middleName ? " " :"").$request->middleName." ".$request->lastName,
                        'Employee_status'=> $request->status
            
                   ]);
                }else{
                    return response()->json([
              
                        'status' => '202',
                        'message' => "Insert Failed",
                        'Employee Name' => $request->firstName. ($request->middleName ? " " :"").$request->middleName." ".$request->lastName,
                        'Employee_status'=> $request->status
            
                   ]);
                }
               
            }
        // $data = $request->all();
        // return $data;
        } catch (Exception $e) {
        return error_response(trans('messages.error_default'), $e);
        }
    }

    public function syncusers_HRIS(Request $request)
    {
        try {

            $validator = Validator::make($request->all(), [
                "firstName" => 'required',
                "bestEmail" => 'required',
                "lastName"=>'required',
                "employeeNumber"=>'required',
                "bhrNumber"=>'required',
                "status"=>'required'
            ]);
            if ($validator->fails()) {
              return response()->json(['errors'=>$validator->messages()]);
            }else{
    
                $result = DB::select('call EH_SP_User_Sync_HRIS("'.$request->bestEmail.'", '.$request->employeeNumber.'
                ,'.$request->bhrNumber.', "'.$request->userName.'","'.Hash::make( get_constant('DEFAULT_PASSWORD') ).'","'.$request->firstName.'", "'.$request->middleName.'"
                ,"'.$request->lastName.'", "'.$request->nickname.'","'.$request->employmentHistoryStatus.'", "'.$request->hireDate.'"
                ,'.$request->status.', "'.$request->jobTitle.'","'.$request->country.'", "'.$request->dateOfBirth.'"
                ,"'.$request->terminationDate.'", "'.$request->department.'","'.$request->mobilePhone.'", '.$request->supervisorId.'"
                ,"'.$request->Subdepartmentname.'","'.$request->subdepartmentsupervisorId.'","'.$request->division.'")');       
    
                if(isset($result)){
                    return response()->json([
              
                        'status' => '200',
                        'message' => "Insert Or Updated Successfully",
                        'Employee Name' => $request->firstName. ($request->middleName ? " " :"").$request->middleName." ".$request->lastName,
                        'Employee_status'=> $request->status
            
                   ]);
                }else{
                    return response()->json([
              
                        'status' => '202',
                        'message' => "Insert Failed",
                        'Employee Name' => $request->firstName. ($request->middleName ? " " :"").$request->middleName." ".$request->lastName,
                        'Employee_status'=> $request->status
            
                   ]);
                }
               
            }
        // $data = $request->all();
        // return $data;
        } catch (Exception $e) {
        return error_response(trans('messages.error_default'), $e);
        }
    }

    public function syncholidays(Request $request){
        try {
            $result = DB::select('call EV_SP_Holidays_Sync("'.$request->holidayName.'", "'.$request->holiday_date.'", "'.$request->country.'", "'.$request->holidaytype.'")');
            return $result;
            } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
            }
    }

    public function syncleaves(Request $request){
        try {
      
            $validator = Validator::make($request->all(), [
                "date" => 'required',
                "userId" => 'required',
                "typeofLeave"=>'required',
                "status"=>'required',
                "amount"=>'required',
                
            ]);
            if ($validator->fails()) {
              return response()->json(['errors'=>$validator->messages()]);
            }else{
            $result = DB::select('call EV_SP_Leave_Sync(
                  "'.$request->date.'"
                , "'.$request->userId.'"
                , "'.$request->typeofLeave.'"
                , "'.$request->status.'"
                , "'.$request->amount.'"
                , "'.$request->employeeNote.'"
                , "'.$request->managerNote.'"
                , "'.$request->updatedBy.'")');
        if(isset($result)){
            return response()->json([
      
                'status' => '200',
                'message' => "Leave Insert Or Updated Successfully",
    
           ]);
        }else{
            return response()->json([
      
                'status' => '202',
                'message' => "Insert Failed",
    
           ]);
        }
    }
    } catch (Exception $e) {
        return error_response(trans('messages.error_default'), $e);
        }
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function edit($id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        //
    }
}
