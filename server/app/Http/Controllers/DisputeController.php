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

        if ($check_if_payroll[0][0]->IsExists == 1) {
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
        try {
            log_activity( trans('messages.dispute_export_success') );
            return Excel::download(new DisputeExport($result_sets[0], $start_date, $end_date), 'Dispute.csv');
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
            $result_sets = call_sp('EV_SP_PD_Update_Dispute_Status', [$request->status, $id]);

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
