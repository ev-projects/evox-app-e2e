<?php

namespace App\Http\Controllers;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\DisputeExport;
use App\Dispute;
use Illuminate\Http\Request;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Auth;

class DisputeController extends Controller
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
    public function store(Request $request)
    {

            $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:users,id',
            
            'dispute_type' => 'required|string|max:50',
            
            'description' => 'nullable|string',
            
            'status' => 'nullable|string|max:20',
            ]);
            if ($validator->fails()) {
                return response()->json(['errors'=>$validator->messages()]);
            }else{
                // Creating the dispute record with all additional fields
            
                $dispute = Dispute::create($request->all());
            
            
                return response()->json(['message' => 'Dispute submitted successfully', 'dispute' => $dispute], 201);
              }
            
            
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\Dispute  $dispute
     * @return \Illuminate\Http\Response
     */
    public function show(Dispute $dispute, Request $request)
    {

        $me = Auth::user();
        $result_sets = call_sp('EV_SP_Payroll_Dispute_new', [$request->department,$request->disputeType,$request->startDate,$request->endDate,$request->status,$me->id,$me->LevelId,1,null]);
        try {
            log_activity( trans('messages.list_role_attempt') );
            return success_response(
                trans('messages.list_role_success'), $result_sets[0] 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function showExport(Dispute $dispute, Request $request)
    {
        $me = Auth::user();
        $result_sets = call_sp('EV_SP_Payroll_Dispute_new', [$request->department,$request->disputeType,$request->startDate,$request->endDate,$request->status,$me->id,$me->LevelId,1,null]);
        try {
            log_activity( trans('messages.list_role_attempt') );
            return Excel::download(new DisputeExport($result_sets[0],$request->startDate,$request->endDate), 'Dispute.csv');
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    public function getEmployeeDispute(Request $request)
    {
        // dd($request->department);
        $result_sets = call_sp('EV_SP_Payroll_Dispute_Edit_Update', [$request->id]);
        try {
            log_activity( trans('messages.list_role_attempt') );
            return success_response(
                trans('messages.list_role_success'), $result_sets[0] 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function UpdateDispute(Request $request,$id)
    {
        try{
            $validator = Validator::make($request->all(), [
                  'Payroll_Remarks' => 'required',
              ]);
              if ($validator->fails()) {
                return response()->json(['errors'=>$validator->messages()]);
              }else{
                $me = Auth::user();
                $UpdateDispute = Dispute::where('id', $id)
                ->update([
                    'Payroll_Remarks' => $request->Payroll_Remarks,
                    'Payout_Inclusion' => $request->Payout_Inclusion,
                    'status' => $request->status,
                    'updated_by' =>  $me->id,
                 ]);
         
                 if($UpdateDispute){
                     return response()->json([
              
                          'status' => '200',
                          'message' => 'Updated Successfully',                     
                     ]);
                         }else{
                             
                             return ["Result"=>"Data Not Saved"];
                         }
              }
            } catch (Exception $e) {
                return error_response(trans('messages.error_default'), $e);
            }
    }

    

    public function getpayrollcutoff(Request $request)
    {
        $result_sets = call_sp('EV_SP_Get_Payroll_Cutoff', [$request->fromdate,$request->todate]);
        try {
            log_activity( trans('messages.list_role_attempt') );
            return $result_sets[0];
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  \App\Dispute  $dispute
     * @return \Illuminate\Http\Response
     */
    public function edit(Dispute $dispute)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Dispute  $dispute
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, Dispute $dispute)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Dispute  $dispute
     * @return \Illuminate\Http\Response
     */
    public function destroy(Dispute $dispute)
    {
        //
    }
}
