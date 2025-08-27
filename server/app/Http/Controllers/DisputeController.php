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
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use Auth;

class DisputeController extends Controller
{
    public function __construct(PayrollCutoffRepositoryInterface $payroll_cutoff)
    {
        $this->payroll_cutoff = $payroll_cutoff;
    }

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
        try {
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
              } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
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
        $check_if_payroll = call_sp('EV_SP_Validate_Payroll_Level', [$me->id]);

        if ($check_if_payroll[0][0]->IsExists == 1 || $me->id === 29) { // if user is Kamal, show dispute summary report same as payroll 
            // get latest cutoff period
            $payroll_cutoff = $this->payroll_cutoff->get_payroll_cutoff();
            $start_date = $request->startDate ?? $payroll_cutoff->start_date;
            $end_date = $request->endDate ?? $payroll_cutoff->end_date;

            // return summary of disputes
            $result_sets = call_sp('EV_SP_PD_Get_Payroll_Report', [$start_date, $end_date, $request->geo ?? null]);
        } else {
            // return list of individual dispute records
            $result_sets = call_sp('EV_SP_PD_Get_Pending_Request', [$me->id, $request->department ?? null, null, $request->status ?? 0, 1]);
        }

        try {
            return success_response(
                trans('messages.dispute_list_success'), $result_sets[0]
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function showExport(Dispute $dispute, Request $request)
    {
        // get latest cutoff period
        $payroll_cutoff = $this->payroll_cutoff->get_payroll_cutoff();
        $start_date = $request->startDate ?? $payroll_cutoff->start_date;
        $end_date = $request->endDate ?? $payroll_cutoff->end_date;

        $result_sets = call_sp('EV_SP_PD_Get_Payroll_Report', [$start_date, $end_date, $request->geo ?? null]);

        $results = [];
        if (count($result_sets[0]) > 0) {
          foreach ($result_sets[0] as $key => $value) {
            $results[$key] = [
                $value->Employee_Number,
                $value->Employee_Name,
                $value->Department_Name,
                $value->Cutoff,
                $value->PayrollPeriod,
                $value->ApprovedDate,
                $value->datefilling,
                $value->Remarks,
                $value->unpaid_leave,
                $value->reg_late,
                $value->reg_undertime,
                $value->Render_Hr,
                $value->Night_Diff,
                $value->OverTime,
                $value->OT_ND,
                $value->RD_Render_HR,
                $value->RD_ND,
                $value->RD_OT,
                $value->RD_OT_ND,
                $value->LH_Render_HR,
                $value->LH_ND,
                $value->LH_OT,
                $value->LH_OT_ND,
                $value->SH_Render_Hr,
                $value->SH_ND,
                $value->SH_OT,
                $value->SH_OT_ND,
                $value->DSH_Render_HR,
                $value->DSH_ND,
                $value->DSH_OT,
                $value->DSH_OT_ND,
                $value->DLH_Render_HR,
                $value->DLH_ND,
                $value->DLH_OT,
                $value->DLH_OT_ND,
                $value->SLH_Render_HR,
                $value->SLH_ND,
                $value->SLH_OT,
                $value->SLH_OT_ND,
            ];
          }
        }

        try {
            log_activity( trans('messages.dispute_export_success') );
            return Excel::download(new DisputeExport($results, $start_date, $end_date), 'Dispute.csv');
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    public function getEmployeeDispute(Request $request)
    {
        try {
            $result_sets = call_sp('EV_SP_PD_Get_Pending_Request', [null, null, $request->id, null, 2]);

            return success_response(
                trans('messages.dispute_record_success'), $result_sets[0]
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function UpdateDispute(Request $request,$id)
    {
        try {
            $result_sets = call_sp('EV_SP_PD_Update_Dispute_Status', [$request->status, $id, $request->remarks ?? null]);

            return success_response(
                trans('messages.dispute_status_success'), []
            );
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