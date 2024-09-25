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
use Exception;
use Illuminate\Support\Arr;
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
                // "bestEmail" => 'required',
                "lastName"=>'required',
                "employeeNumber"=>'required',
                "bhrNumber"=>'required',
                "status"=>'required'
            ]);
            if ($validator->fails()) {
            //   return response()->json(['errors'=>$validator->messages()]);
              return error_response(trans('messages.error_default'), $validator->messages());
            }else{
    
                // $result = DB::select('call EH_SP_User_Sync_HRIS("'.$request->bestEmail.'", '.$request->employeeNumber.'
                // ,'.$request->bhrNumber.', "'.$request->userName.'","'.Hash::make( get_constant('DEFAULT_PASSWORD') ).'","'.$request->firstName.'", "'.$request->middleName.'"
                // ,"'.$request->lastName.'", "'.$request->nickname.'","'.$request->employmentHistoryStatus.'", "'.$request->hireDate.'"
                // ,'.$request->status.', "'.$request->jobTitle.'","'.$request->country.'", "'.$request->dateOfBirth.'"
                // ,"'.is_valid($request->terminationDate)?? "NULL".'", "'.$request->department.'","'.$request->mobilePhone.'", '.$request->supervisorId.'
                // ,"'.$request->Subdepartmentname.'",'.$request->subdepartmentsupervisorId.',"'.$request->division.'")');    
                
            
                    $termination_date = $request->terminationDate == "0000-00-00" 
                            || 
                            $request->terminationDate == "None"
                            || 
                            $request->terminationDate == null
                            ? 
                            null: $request->terminationDate ;
              
                
                $result =  call_sp("EH_SP_User_Sync_HRIS", 
                [
                    $request->bestEmail, 
                    $request->employeeNumber,
                    $request->bhrNumber,
                    $request->userName,
                    Hash::make( get_constant('DEFAULT_PASSWORD') ),
                    $request->firstName,
                    $request->middleName,
                    $request->lastName,
                    $request->nickname,
                    $request->employmentHistoryStatus,
                    $request->hireDate,
                    $request->status,
                    $request->jobTitle,
                    $request->country,
                    $request->dateOfBirth,
                    $termination_date,
                    $request->department,
                    $request->mobilePhone,
                    $request->supervisorId,
                    $request->Subdepartmentname,
                    $request->subdepartmentsupervisorId,
                    $request->division,
            
        
                ]);
    
                if(isset($result[0])){
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
        //     return response()->json([
                                
        //         'status' => '405',
        //         'message' => "Insert Failed = " . $e->getMessage(),
    
        // ]);
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
            $data = $request->isJson() ? ($request->json()->all()) : [];
            log_to_file('info', 'Posted Leaves', [$data], 'dtr_leaves');
            $failed_sync = [];
            $leave_items = [];
            foreach($data as $d) {
                array_push($leave_items, $d);
                $validator = Validator::make($d, [
                    "date" => 'required',
                    "userId" => 'required',
                    "typeofLeave"=>'required',
                    "status"=>'required',
                    "amount"=>'required',
                ]);
                if ($validator->fails()) {
                    array_push($failed_sync, $d['id']);
                } else {
                    try {
                        $result = call_sp('EV_SP_Leave_Sync', [$d['date'], $d['userId'], $d['typeofLeave'], $d['status'], $d['amount'], $d['employeeNote'], $d['managerNote'], $d['updatedBy']]);
                        log_to_file('info', 'Sync Leave', [$result], 'dtr_leaves');
                    } catch (Exception $e) {
                        array_push($failed_sync, $d['id']);
                    }
                }
            }
            return response()->json([
                'message' => count($failed_sync) > 0 ? "Some items could not be synced" : "Leave sync success",
                'failed_sync' => $failed_sync
            ], count($failed_sync) > 0 ? '500' : '200');
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        }
    }



    public function timeoff_allocation_HRIS_New(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                "bhrNumber"=>'required',
                "timeoffType" => 'required',
                "validFrom"=>'required',
            ]);
            if ($validator->fails()) {
              return error_response(trans('messages.error_default'), $validator->messages());
            }else{
              
                
                $result =  call_sp("EV_SP_Timeoff_Allocation", 
                [
                    $request->bhrNumber, 
                    $request->timeoffType,
                    $request->description,
                    $request->duration,
                    $request->validFrom,
                    $request->validTo,
                    $request->remainingDays,
                    $request->allocationType,       
                ]);
    
                if(isset($result[0])){
                    return response()->json([
              
                        'status' => '200',
                        'message' => "Insert Or Updated Successfully",
                        'BhrNumber'=> $request->bhrNumber
            
                   ]);
                }else{
                    return response()->json([
              
                        'status' => '202',
                        'message' => "Insert Failed",
                        'BhrNumber'=> $request->bhrNumber
            
                   ]);
                }
               
            }

        } catch (Exception $e) {

         return error_response(trans('messages.error_default'), $e);
        
        }
    }


    public function timeoff_allocation_HRIS(Request $request)
    {
        try {
            $data = $request->isJson() ? ($request->json()->all()) : [];
            log_to_file('info', 'Posted Timeoff', [$data], 'sync_timeoff');
            $failed_sync = [];
            foreach($data as $d) {
                $validator = Validator::make($d, [
                    "bhrNumber" => 'required',
                    "timeoffType" => 'required',
                    "validFrom"=>'required',
                ]);
                if ($validator->fails()) {
                    array_push($failed_sync, $d['id']);
                } else {
                    try {
                        $result = call_sp('EV_SP_Timeoff_Allocation', [$d['bhrNumber'], $d['timeoffType'], $d['description'], $d['duration'], $d['validFrom'], $d['validTo'], $d['remainingDays'], $d['allocationType']]);
                        log_to_file('info', 'Sync Timeoff', [$result], 'sync_timeoff');
                    } catch (Exception $e) {
                        array_push($failed_sync, $d['id']);
                    }
                }
            }
            return response()->json([
                'message' => count($failed_sync) > 0 ? "Some items could not be synced" : "timeoff sync success",
                'failed_sync' => $failed_sync
            ], count($failed_sync) > 0 ? '500' : '200');

        } catch (Exception $e) {

         return error_response(trans('messages.error_default'), $e);
        
        }
    }


    
    public function timeoff_allocation_HRIS_fail_sync(Request $request)
    {
        try {
            $data = $request->isJson() ? ($request->json()->all()) : [];
            log_to_file('info', 'Posted Timeoff', [$data], 'sync_timeoff');
            $failed_sync = [];
            $success_sync = [];
            foreach($data as $d) {
                $validator = Validator::make($d, [
                    "bhrNumber" => 'required',
                    "timeoffType" => 'required',
                    "validFrom"=>'required',
                ]);
                if ($validator->fails()) {
                    array_push($failed_sync, $d['id']);
                } else {
                    try {
                        $result = call_sp('EV_SP_Timeoff_Allocation', [$d['bhrNumber'], $d['timeoffType'], $d['description'], $d['duration'], $d['validFrom'], $d['validTo'], $d['remainingDays'], $d['allocationType']]);
                        log_to_file('info', 'Sync Timeoff', [$result], 'sync_timeoff');
                        if(isset($result[0])){
                            array_push($success_sync, $d['id']);
                        }                       
                    } catch (Exception $e) {
                        array_push($failed_sync, $d['id']);
                    }
                }
            }
            return response()->json([
                'message' => count($failed_sync) > 0 ? "Some items could not be synced" : "timeoff sync success",
                'success_sync' => $success_sync,
                'failed_sync' => $failed_sync
            ], count($failed_sync) > 0 ? '500' : '200');

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
