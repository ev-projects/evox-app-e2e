<?php

namespace App\Modules\Request\Http\Controllers;

use Exception;

use Illuminate\Http\Request;
use App\Modules\User\Models\User;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;
use Illuminate\Database\Eloquent\Collection;

use App\Modules\Request\Models\ChangeSchedule;
use App\Modules\Email\Mail\OvertimeRequestEmail;
use App\Modules\Request\Resources\RequestResource;
use App\Modules\Request\Resources\AlterLogResource;
use App\Modules\Request\Resources\OvertimeResource;
use App\Modules\Request\Resources\RestDayWorkResource;
use App\Modules\Request\Resources\ChangeScheduleResource;
use App\Modules\Request\Http\Requests\RequestFilterRequest;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Request\Repositories\RequestRepositoryInterface;
use App\Modules\Request\Repositories\AlterLogRepositoryInterface;
use App\Modules\Request\Repositories\OvertimeRepositoryInterface;
use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollCutoffRepositoryInterface;
use App\Modules\Request\Repositories\AlterLogPunchRepositoryInterface;
use App\Modules\Request\Resources\RequestApprovalChangeStatusResource;
use App\Modules\Request\Repositories\ChangeScheduleRepositoryInterface;
use App\Modules\Request\Http\Requests\RequestApprovalChangeStatusRequest;

class RequestController extends Controller
{
    protected $overtime;
    protected $alter_log;
    protected $alter_log_punch;
    protected $rest_day_work;
    protected $change_schedule;
    protected $work_from_home;

    public function __construct(    PayrollCutoffRepositoryInterface $payroll_cutoff,
                                    OvertimeRepositoryInterface $overtime,
                                    RequestRepositoryInterface $request,
                                    RestDayWorkRepositoryInterface $rest_day_work,
                                    AlterLogRepositoryInterface $alter_log,
                                    AlterLogPunchRepositoryInterface $alter_log_punch,
                                    ChangeScheduleRepositoryInterface $change_schedule,
                                    DtrRepositoryInterface $dtr,
                                    EmailRepositoryInterface $email){
        $this->payroll_cutoff         = $payroll_cutoff;
        $this->overtime         = $overtime;
        $this->request          = $request;
        $this->rest_day_work    = $rest_day_work;
        $this->alter_log        = $alter_log;
        $this->alter_log_punch  = $alter_log_punch;
        $this->change_schedule  = $change_schedule;
        $this->dtr              = $dtr;
        $this->email            = $email;
    }

    /**
     * Shows a collection of Overtime Requests.
     * @return \Illuminate\Http\JsonResponse
     */
    public function find(RequestFilterRequest $request ){
        try {
            $request_collection = new Collection();

            $parameters = $request->all();

            if( isset( $parameters['request_type'] ) && isset( $this->{ $parameters['request_type'] } ) ) {

                $request_collection->push( $this->{ $parameters['request_type'] }->where( $request->all() ) );
                
            } else {

                foreach( get_constant('REQUEST_TYPES') as $request_type) {

                    if( isset( $this->{ $request_type } ) ) {

                        $request_collection->push( $this->{ $request_type }->where( $request->all() ) );
                   
                    }
                }
            }
            
            return success_response(
                trans('messages.find_request_success'), 
                $request_collection
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e, JsonResponse::HTTP_NOT_FOUND);
        }
    }

    /**
     * Shows a list of Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function requestlist(RequestFilterRequest $request){
        $user = User::find(auth()->user()->id);

        try {
            log_activity( trans('messages.request_display_attempt') );

            // if(!isset($request->valid_from)){
            //     $cutoff = $this->payroll_cutoff->get_payroll_cutoff();
            //     $request->merge(['valid_from' => $cutoff->start_date]);
            //     $request->merge(['valid_to' => $cutoff->end_date]);
            // }

            if($request->url== 'my_requests'){
                $response = $user->requests_list('my_request',$request);
                $my_req_proc = (new RequestResource($response["data"]))->resolve();

                $result = [
                    "data" => $my_req_proc["result"],
                    "total" => $response["pagination"]->TotalCount ? (int) $response["pagination"]->TotalCount : 0,
                    "count" => count($my_req_proc["result"]),
                    "per_page" => $response["pagination"]->Total_Count_Per_Page ? (int) $response["pagination"]->Total_Count_Per_Page : 0,
                    "current_page" => $response["pagination"]->CurrentPage ? (int) $response["pagination"]->CurrentPage : 0,
                    "last_page" => floor($response["pagination"]->TotalCount / $response["pagination"]->Total_Count_Per_Page)
                ];

                if( ($response["pagination"]->TotalCount % $response["pagination"]->Total_Count_Per_Page) > 0
                    && fmod($response["pagination"]->TotalCount / $response["pagination"]->Total_Count_Per_Page, 1) !== 0.00){
                    $result['last_page'] = $result['last_page'] + 1;
                }

                return success_response(
                    trans('messages.request_display_success'), ["result" => $result]
                );
            }
            if($request->url== 'my_team_requests'){
                // return success_response(
                //     trans('messages.request_display_success'), 
                //       new RequestResource( $user->requests_list('my_request',$request) ) 
                // );
                $collection  = $user->requests_list('my_team_requests',$request);
                $DAT = (new RequestResource( $collection["data"] ))->resolve();
        
                return success_response(
                    trans('messages.request_display_success'), 
                    ["result" => [
                        "data" =>       $DAT["result"],
                        "department" => $collection["Department"],
                        "status_numbers" => $collection["numbers"],
                        "total" => is_valid($collection["pagination"]["total"]) ? $collection["pagination"]["total"]: 0,
                        "count" => is_valid($collection["pagination"]["count"]) ? $collection["pagination"]["count"]: 0,
                        "per_page" => is_valid($collection["pagination"]["per_page"]) ? $collection["pagination"]["per_page"]: 0,
                        "current_page" =>is_valid($collection["pagination"]["current_page"]) ? $collection["pagination"]["current_page"]: 0,
                        "last_page" => is_valid($collection["pagination"]["last_page"]) ? $collection["pagination"]["last_page"]: 0,
                    ]]
                );
            }

        } catch(Exception $e){
            // dump($e);
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Shows a list of Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function requestlistNumbers(Request $request){
        try {
            log_activity( trans('messages.request_number_display_attempt') );
            return success_response(
                trans('messages.request_display_success'), $this->request->get_status_numbers( $request, $this->payroll_cutoff->get_payroll_cutoff() )
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function requestlistNumbers_dashboard(Request $request){
        try {
            log_activity( trans('messages.request_number_display_attempt') );
            // return success_response(
            //     trans('messages.request_display_success'), $this->request->get_status_numbers_dashboard( $request )
            // );

            return success_response(
                trans('messages.request_display_success'), $this->request->get_status_numbers_only( Auth::user(),$this->payroll_cutoff->get_payroll_cutoff() )
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function bulkRequest(Request $request){
        try {
            log_activity( trans('messages.bulk_request_change_status_attempt') );
            $has_dispute = false;
            foreach ( $request->checkedList as $value ) {
                $data = [];
                $request_bulk = explode(".", $value);
                $model = null;

                switch ( $request_bulk[1] ) {

                    # Overtime
                    case "overtimes":
                        $overtime_model = $this->overtime->find($request_bulk[0]);
                        // call request validity checker
                        $request_validity = request_validity_checker($overtime_model->user_id, $overtime_model->date);

                        if ($request_validity === "2") {
                            if($request->bulk_action =="approve"){
                                $data = [
                                    'user_id' => $overtime_model->user_id,
                                    'date' => $overtime_model->date,
                                    'amount' => $overtime_model->amount,
                                    'type' => $overtime_model->type,
                                    'employee_note' => $overtime_model->employee_note,
                                    'approver_note' => $overtime_model->approver_note,
                                ];
                                $overtime_dispute = $this->insertToOvertimeDispute($data);
                            }

                            // decline the original request
                            $overtime_model->update([
                                'status' => 'declined',
                                'updated_by' => auth()->user()->id
                            ]);
                            $has_dispute = true;
                        } else {
                            if($request->bulk_action =="approve"){

                                $overtime = $this->overtime->approve( $data , $request_bulk[0] );
                                $dtr = $overtime->dtr()->first() ;
                                if($dtr!=null){
                                    $this->dtr->compute_payroll_items( $dtr );
                                }

                            }elseif($request->bulk_action =="deny"){

                                $overtime = $this->overtime->decline( $data , $request_bulk[0]);
                                $dtr = $overtime->dtr()->first() ;
                                if($dtr!=null){
                                    $this->dtr->compute_payroll_items( $dtr );
                                }

                            }
                        }
                      break;

                    #Alter Log
                    case "alter_logs":
                        $alterlog_model = $this->alter_log->find($request_bulk[0]);
                        // call request validity checker
                        $request_validity = request_validity_checker($alterlog_model->user_id, $alterlog_model->date);

                        if ($request_validity === "2") {
                            if($request->bulk_action =="approve"){
                                $data = [
                                    'user_id' => $alterlog_model->user_id,
                                    'date' => $alterlog_model->date,
                                    'current_time_in' => $alterlog_model->current_time_in,
                                    'current_time_out' => $alterlog_model->current_time_out,
                                    'new_time_in' => $alterlog_model->new_time_in,
                                    'new_time_out' => $alterlog_model->new_time_out,
                                    'employee_note' => $alterlog_model->employee_note,
                                    'approver_note' => $alterlog_model->approver_note,
                                ];
                                $alterlog_dispute = $this->insertToAlterLogDispute($data);
                            }

                            // decline the original request
                            $alterlog_model->update([
                                'status' => 'declined',
                                'updated_by' => auth()->user()->id
                            ]);
                            $has_dispute = true;
                        } else {
                            if($request->bulk_action =="approve"){

                                $alter_log = $this->alter_log->approve( $data , $request_bulk[0] );
                                $dtr = $this->dtr->apply_alter_log_to_dtr( $alter_log );

                            }elseif($request->bulk_action =="deny"){

                                $alter_log = $this->alter_log->decline( $data , $request_bulk[0]);
                                $dtr = $this->dtr->remove_alter_log_from_dtr( $alter_log );

                            }
                        }
                        break;
                    #Alter Log
                    case "alter_log_punches":
                        if($request->bulk_action =="approve"){

                            $alter_log_punch = $this->alter_log_punch->approve( $data , $request_bulk[0] );
                            $dtr = $this->dtr->apply_alter_to_punch( $alter_log_punch );

                        }elseif($request->bulk_action =="deny"){

                            $alter_log_punch = $this->alter_log_punch->decline( $data , $request_bulk[0]);
                            $dtr = $this->dtr->remove_alter_to_punch( $alter_log_punch );

                        }
                    break;

                    # Change Schedules
                    case "change_schedules":
                        if($request->bulk_action =="approve"){
                            $change_schedule = $this->change_schedule->approve( $data , $request_bulk[0] );
                            
                            $sched_schedule = $change_schedule->schedule()->first();
                            if($sched_schedule!=null){
                                $dtr = $this->dtr->apply_schedule_to_dtr( $change_schedule->user_id, $sched_schedule);
                            }

                        }elseif($request->bulk_action =="deny"){
                            $change_schedule = $this->change_schedule->decline($data , $request_bulk[0] );
                            
                            $sched_schedule = $change_schedule->schedule()->first();
                            if($sched_schedule!=null){
                                $dtr = $this->dtr->remove_schedule_to_dtr( $change_schedule->user_id, $change_schedule->schedule()->first() );
                            }
                        }
                      break;

                    # Rest Day Works
                    case "rest_day_works":
                        $rdw_model = $this->rest_day_work->find($request_bulk[0]);
                        // call request validity checker
                        $request_validity = request_validity_checker($rdw_model->user_id, $rdw_model->date);

                        if ($request_validity === "2") {
                            if($request->bulk_action =="approve"){
                                $data = [
                                    'user_id' => $rdw_model->user_id,
                                    'date' => $rdw_model->date,
                                    'start_time' => $rdw_model->start_time,
                                    'end_time' => $rdw_model->end_time,
                                    'break_time' => $rdw_model->break_time,
                                    'employee_note' => $rdw_model->employee_note,
                                    'approver_note' => $rdw_model->approver_note,
                                ];
                                $rdw_dispute = $this->insertToRestDayWorkDispute($data);
                            }

                            // decline the original request
                            $rdw_model->update([
                                'status' => 'declined',
                                'updated_by' => auth()->user()->id
                            ]);
                            $has_dispute = true;
                        } else {
                            if($request->bulk_action =="approve"){

                                $rest_day_work =  $this->rest_day_work->approve( $data , $request_bulk[0] );
                                $dtr = $this->dtr->apply_rest_day_work_to_dtr( $rest_day_work );

                            }elseif($request->bulk_action =="deny"){

                                $rest_day_work = $this->rest_day_work->decline( $data , $request_bulk[0] );
                                $dtr = $this->dtr->remove_rest_day_from_dtr( $rest_day_work );

                            }
                        }
                      break;
                    default:
                  }                
            }

            $messageKey = 'messages.bulk_request_update';
            if ($request->bulk_action === 'approve' && $has_dispute) {
                $messageKey = 'messages.bulk_approve_with_dispute';
            }

            return success_response(
                trans($messageKey),
                $request->bulk_action
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }



    /**
     * Shows a list of Request.
     * @return \Illuminate\Http\JsonResponse
     */
    public function change_request_status_via_hash_code(RequestApprovalChangeStatusRequest $request){
        try {
            
            log_activity( trans('messages.change_request_status_attempt') );

            $result = [
                'request'    => null,
                'is_changed' => false,
            ];

            # Get the request detail from the hashed code.
            # [0] - Table name
            # [1] - Table ID
            # [2] - Recepient ID
            $request_detail_array = parse_hash_code_to_request_detail_array( $request->get('hash_code') );

            # Initialize Recepient login for this request
            auth()->login( User::find( $request_detail_array[2] ) );

            # Check for what request table name is being accesed.
            switch( $request_detail_array[0] ){

                case "overtimes":
                    
                    # Fetch the request
                    $result['request'] = Overtime::find( $request_detail_array[1] );

                    # Check if the status is not yet 'approved'. If not, proceed on changing the request to 'approved'.
                    if( $request->get('status') == get_constant('REQUEST_STATUS.approved')
                        && $result['request'] ->status != get_constant('REQUEST_STATUS.approved')  ) {
                        $result = [
                            'request'    => $this->overtime->approve([], $result['request']->id ),
                            'is_changed' => true,
                        ];

                    # Check if the status is not yet 'declined'. If not, proceed on changing the request to 'declined'.
                    } else if( $request->get('status') == get_constant('REQUEST_STATUS.declined')
                        && $result['request'] ->status != get_constant('REQUEST_STATUS.declined')  ) {
                        $result = [
                            'request'    => $this->overtime->decline([], $result['request']->id ),
                            'is_changed' => true,
                        ];
                    } 

                    # Apply the Overtime to the DTR related depending on the action that was conducted on the overtime.
                    $this->dtr->compute_payroll_items( $result['request']->dtr()->first() );
                    break;


                case "rest_day_works":

                    # Fetch the request
                    $result['request'] = RestDayWork::find( $request_detail_array[1] );

                    # Check if the status is not yet 'approved'. If not, proceed on changing the request to 'approved'.
                    if( $request->get('status') == get_constant('REQUEST_STATUS.approved')
                        && $result['request'] ->status != get_constant('REQUEST_STATUS.approved')  ) {
                        $result = [
                            'request'    => $this->rest_day_work->approve([], $result['request']->id ),
                            'is_changed' => true,
                        ];

                        # Apply the newly approved Rest Day Work to the DTRs related.
                        $this->dtr->apply_rest_day_work_to_dtr( $result['request'] );

                    # Check if the status is not yet 'declined'. If not, proceed on changing the request to 'declined'.
                    } else if( $request->get('status') == get_constant('REQUEST_STATUS.declined')
                        && $result['request'] ->status != get_constant('REQUEST_STATUS.declined')  ) {
                        $result = [
                            'request'    => $this->rest_day_work->decline([], $result['request']->id ),
                            'is_changed' => true,
                        ];

                        # Removed the newly declined Rest Day Work to the DTRs related.
                        $this->dtr->remove_rest_day_from_dtr( $result['request'] );
                    } 
                    break;


                case "alter_logs":

                    # Fetch the request
                    $result['request'] = AlterLog::find( $request_detail_array[1] );

                    # Check if the status is not yet 'approved'. If not, proceed on changing the request to 'approved'.
                    if( $request->get('status') == get_constant('REQUEST_STATUS.approved')
                        && $result['request'] ->status != get_constant('REQUEST_STATUS.approved')  ) {
                        $result = [
                            'request'    => $this->alter_log->approve([], $result['request']->id ),
                            'is_changed' => true,
                        ];

                        # Apply the newly approved Alter Log to the DTR related.
                        $this->dtr->apply_alter_log_to_dtr( $result['request'] );

                    # Check if the status is not yet 'declined'. If not, proceed on changing the request to 'declined'.
                    } else if( $request->get('status') == get_constant('REQUEST_STATUS.declined')
                        && $result['request'] ->status != get_constant('REQUEST_STATUS.declined')  ) {
                        $result = [
                            'request'    => $this->alter_log->decline([], $result['request']->id ),
                            'is_changed' => true,
                        ];

                        # Removed the newly declined Alter Log to the DTRs related.
                        $this->dtr->remove_alter_log_from_dtr( $result['request'] );
                    } 
                    break;


                case "change_schedules":

                    # Fetch the request
                    $result['request'] = ChangeSchedule::find( $request_detail_array[1] );

                    # Check if the status is not yet 'approved'. If not, proceed on changing the request to 'approved'.
                    if( $request->get('status') == get_constant('REQUEST_STATUS.approved')
                        && $result['request'] ->status != get_constant('REQUEST_STATUS.approved')  ) {
                        $result = [
                            'request'    => $this->change_schedule->approve([], $result['request']->id ),
                            'is_changed' => true,
                        ];

                        # Apply the newly approved Change Schedule to the DTRs related.
                        $this->dtr->apply_schedule_to_dtr( $result['request']->user_id, $result['request']->schedule()->first() );

                    # Check if the status is not yet 'declined'. If not, proceed on changing the request to 'declined'.
                    } else if( $request->get('status') == get_constant('REQUEST_STATUS.declined')
                        && $result['request'] ->status != get_constant('REQUEST_STATUS.declined')  ) {
                        $result = [
                            'request'    => $this->change_schedule->decline([], $result['request']->id ),
                            'is_changed' => true,
                        ];

                        # Removed the newly declined Alter Log to the DTRs related.
                        $this->dtr->remove_schedule_to_dtr( $result['request']->user_id, $result['request']->schedule()->first() );
                    } 
                    break;
                
            }

            # Trigger the logout since the transaction is done.
            auth()->logout();
            
            return success_response(
                trans('messages.change_request_status_success'), 
                new RequestApprovalChangeStatusResource( $result['request'], $result['is_changed'] )
            );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Shows a list of Dispute Requests.
     * @return \Illuminate\Http\JsonResponse
     */
    public function requestListDisputes(RequestFilterRequest $request){
        try {
            log_activity( trans('messages.request_display_attempt') );
            $request_types = [
                'all'                   => 0,
                'alteration'            => 1,
                'overtime'              => 2,
                'rest_day_work'         => 3,
                // 'change_schedule'       => 4,
                // 'alter_logs_punches'    => 5,
            ];

            $statuses = ['pending', 'approved', 'cancelled', 'declined'];

            if(!isset($request->valid_from)){
                $cutoff = $this->payroll_cutoff->get_payroll_cutoff();
                $request->merge(['valid_from' => $cutoff->start_date]);
                $request->merge(['valid_to' => $cutoff->end_date]);
            }

            $dispute_list = [];
            $dispute_count = [];
            foreach ($statuses as $status) {
                // call SP to get employee's dispute requests
                $response = call_sp("EV_SP_PD_Employee_Report", [
                    $status,
                    $request->valid_from,
                    $request->valid_to,
                    $request_types[$request->request_type],
                    auth()->user()->id
                ]);
                $dispute_count[$status] = count($response[0]);

                if ($request->status === $status) {
                    $dispute_list = $response[0];
                }
            }

            return success_response(
                trans('messages.request_display_success'),
                [
                    "dispute_list" => $dispute_list,
                    "dispute_count" => $dispute_count
                ]
            );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function requestValidityChecker(Request $request)
    {
        return success_response(
            "Request validity checking completed!",
            call_sp('EV_SP_Validate_Request_Payroll_Period', [auth()->user()->id, $request->date])[0][0]
        );
    }

    public function insertToAlterLogDispute($request)
    {
        // call SP to store request on dispute table
        $auth_user_offset =  Auth::user() && Auth::user()->country_timezone_to_offset() ? string_offset_to_seconds(Auth::user()->country_timezone_to_offset()): 0;
        $alter_log_dispute = [
            ( isset( $request['user_id'] ) && is_valid( $request['user_id'] ) ) ? $request['user_id'] : auth()->user()->id,
            ( isset( $request['date'] ) && is_valid( $request['date'] ) ) ? $request['date'] : null,
            ( isset( $request['current_time_in'] ) && is_valid( $request['current_time_in'] ) ) ? $request['current_time_in'] : null,
            ( isset( $request['current_time_out'] ) && is_valid( $request['current_time_out'] ) ) ? $request['current_time_out'] : null,
            ( isset( $request['new_time_in'] ) && is_valid( $request['new_time_in'] ) ) ? $request['new_time_in'] : null,
            ( isset( $request['new_time_out'] ) && is_valid( $request['new_time_out'] ) ) ? $request['new_time_out'] : null,
            ( isset( $request['employee_note'] ) && is_valid( $request['employee_note'] ) ) ? $request['employee_note'] : null,
            ( isset( $request['approver_note'] ) && is_valid( $request['approver_note'] ) ) ? $request['approver_note'] : null,
            "approved",
            auth()->user()->id,
            auth()->user()->id
        ];
        call_sp('EV_SP_PD_Autoamtion_AlterLog', $alter_log_dispute);
        return array(
            'user_id' => $alter_log_dispute[0],
            'date' => $alter_log_dispute[1],
            'current_time_in' => $alter_log_dispute[2],
            'current_time_out' => $alter_log_dispute[3],
            'new_time_in' => $alter_log_dispute[4],
            'new_time_out' => $alter_log_dispute[5],
            'employee_note' => $alter_log_dispute[6],
        );
    }

    public function insertToOvertimeDispute($request)
    {
        // call SP to store request on dispute table
        $overtime_dispute = [
            ( isset( $request['user_id'] ) && is_valid( $request['user_id'] ) ) ? $request['user_id'] : auth()->user()->id,
            ( isset( $request['date'] ) && is_valid( $request['date'] ) ) ? $request['date'] : null,
            null,
            ( isset( $request['amount'] ) && is_valid( $request['amount'] ) ) ? $request['amount'] : 0,
            ( isset( $request['type'] ) && is_valid( $request['type'] ) ) ? $request['type'] : null,
            ( isset( $request['employee_note'] ) && is_valid( $request['employee_note'] ) ) ? $request['employee_note'] : null,
            ( isset( $request['approver_note'] ) && is_valid( $request['approver_note'] ) ) ? $request['approver_note'] : null,
            "approved",
            auth()->user()->id,
            auth()->user()->id,
        ];
        call_sp('EV_SP_PD_Autoamtion_Overtimes', $overtime_dispute);
        return array(
            'user_id' => $overtime_dispute[0],
            'date' => $overtime_dispute[1],
            'amount' => $overtime_dispute[3],
            'type' => $overtime_dispute[4],
            'employee_note' => $overtime_dispute[5],
        );
    }

    public function insertToRestDayWorkDispute($request)
    {
        $start_time = ( isset( $request['start_time'] ) && is_valid( $request['start_time'] ) ) ? add_time_to_timestamp( $request['date'], $request['start_time'] ) : 0;
        $end_time = ( isset( $request['end_time'] )   && is_valid( $request['end_time'] ) ) ? add_time_to_timestamp( $request['date'], $request['end_time'] ) : 0;

        # Checks if the Start-Time is greater than the End-Time, adds another day for the End-Time.
        if( $start_time >= $end_time ) {
            $end_time = add_days_to_timestamp( $end_time, 1 );
        }
        $rdw_dispute = [
            ( isset( $request['user_id'] ) && is_valid( $request['user_id'] ) ) ? $request['user_id'] : auth()->user()->id,
            ( isset( $request['date'] ) && is_valid( $request['date'] ) ) ? $request['date'] : null,
            $start_time,
            $end_time,
            ( isset( $request['break_time'] ) && is_valid( $request['break_time'] ) ) ? $request['break_time'] : 0,
            ( isset( $request['employee_note'] ) && is_valid( $request['employee_note'] ) ) ? $request['employee_note'] : null,
            ( isset( $request['approver_note'] ) && is_valid( $request['approver_note'] ) ) ? $request['approver_note'] : null,
            "approved",
            auth()->user()->id,
            auth()->user()->id,
        ];
        // call SP to store request on dispute table
        call_sp('EV_SP_PD_Autoamtion_RestDay', $rdw_dispute);
        return array(
            'user_id' => $rdw_dispute[0],
            'date' => $rdw_dispute[1],
            'start_time' => $request['start_time'],
            'end_time' => $request['end_time'],
            'break_time' => $rdw_dispute[4],
            'employee_note' => $rdw_dispute[5],
        );
    }

}
