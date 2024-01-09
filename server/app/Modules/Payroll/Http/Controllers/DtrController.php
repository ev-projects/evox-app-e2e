<?php

namespace App\Modules\Payroll\Http\Controllers;


use Exception;
use Carbon\Carbon;
use Illuminate\Http\Request;
use App\Exports\DtrSummaryExport;
use App\Modules\User\Models\User;
use Illuminate\Http\JsonResponse;
use App\Modules\Payroll\Models\Dtr;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;
use App\Modules\Payroll\Models\Leave;
use App\Modules\Payroll\Models\Holiday;
use App\Modules\Payroll\Models\Biometrics;
use Illuminate\Database\Eloquent\Collection;
use App\Modules\Department\Models\Department;
use App\Modules\Payroll\Models\PayrollCutoff;
use App\Modules\Payroll\Resources\DtrPunchHistoryLogResources;
use App\Modules\Payroll\Resources\DtrResource;
use App\Modules\Schedule\Models\SchedulePolicy;
use App\Modules\Payroll\Resources\DtrPunchResource;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\Payroll\Resources\DtrLogResourceCollection;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Repositories\BiometricsRepositoryInterface;
use Illuminate\Support\Facades\DB;

class DtrController extends Controller
{    
    private $dtr;
    private $biometrics;
    private $dtr_summary_export;
    private $user;

    public function __construct(DtrRepositoryInterface $dtr, 
                                BiometricsRepositoryInterface $biometrics, 
                                DtrSummaryExport $dtr_summary_export,
                                UserRepositoryInterface $user){
        $this->dtr = $dtr;
        $this->biometrics = $biometrics;
        $this->dtr_summary_export = $dtr_summary_export;
        $this->user = $user;
    }

    /**
     * Returns the Daily Time Record of the User by the User ID as Parameter
     * @param string $user_id
     * @param string $start_date
     * @param string $end_date
     * @return \Illuminate\Http\JsonResponse
     */
    public function daily_time_record( $user_id, $start_date, $end_date ){   
        try {
            $this->validate(new Request([
                'user_id' => $user_id,
                'start_date' => $start_date,
                'end_date' => $end_date,
            ]), [
                'user_id' => 'int',
                'start_date' => 'date_format:Y-m-d',
                'end_date' => 'date_format:Y-m-d',
            ]);
            
            $user = get_authenticated_user( $user_id );
            $owner = User::findOrFail($user_id);

            /* 
                Start update here
            */
            $result = [];
            $dtr_sets = call_sp('SP_DTR_By_UserId', [(int)$user_id, $start_date, $end_date]);

            $dtr_records = $dtr_sets[0];
            $dtr_summary = $dtr_sets[1];
            $dtr_holidays = $dtr_sets[2];
            $dtr_leaves = $dtr_sets[3];
            $dtr_requests = $dtr_sets[4];

            /*foreach ($dtr_records as $dtr_record) {
                $result[] = [$dtr_record->date, $dtr_record->undertime];
            }
            return success_response(
                trans('messages.'.__FUNCTION__.'_success'),
                $dtr_records
            );*/

            foreach ($dtr_records as $dtr_record) {

                # Create Resource for Payroll Items
                $payroll_items = [];

                /*$result = DB::table('drt_summary_report')
                ->select(DB::raw("reg_late as late,reg_undertime as undertime,
                (reg_night_diff + rd_night_diff + sh_night_diff + lh_night_diff + dlh_night_diff + dsh_night_diff + slh_night_diff) + IF(nigdiff_stauts=1,reg_night_diff_overlapp
                + rd_night_diff_overlapp + lh_night_diff_overlapp + sh_night_diff_overlapp + dlh_night_diff_overlapp + dsh_night_diff_overlapp + slh_night_diff_overlapp,0) as night_diff,
                (reg_overtime + rd_overtime + sh_overtime + lh_overtime + dlh_overtime + dsh_overtime + slh_overtime)  as overtime,
                (reg_overtime_night_diff + rd_overtime_night_diff + sh_overtime_night_diff + lh_overtime_night_diff + dlh_overtime_night_diff + dsh_overtime_night_diff + slh_overtime_night_diff)  as overtime_night_diff"))
                    ->where('login_date', '=' , $this->resource->date )
                    ->where('user_id','=',$this->resource->user_id)->get();*/

                $payroll_items["late"] = $dtr_record->late > 0 ? seconds_to_time(round($dtr_record->late * 3600),true):"";
                $payroll_items["undertime"] = $dtr_record->undertime > 0 ? seconds_to_time(round($dtr_record->undertime * 3600),true):"";
                $payroll_items["overtime"] = $dtr_record->overtime > 0 ? seconds_to_time(round($dtr_record->overtime * 3600),true):"";
                $payroll_items["overtime_night_diff"] = $dtr_record->overtime_night_diff > 0 ? seconds_to_time(round($dtr_record->overtime_night_diff * 3600),true):"";
                $payroll_items["night_diff"] = $dtr_record->night_diff > 0 ? seconds_to_time(round($dtr_record->night_diff * 3600),true):"";
                
                # Create Resource for Policies
                $policies = [];
                /*foreach( $this->policies()->get() as $policy){
                    $policies[ $policy->policy ] = $policy->value;
                }*/
                
                # Flag for catching Approved Leaves that would be use later for Attendance Status.
                $approved_leave_type = null;

                # Create Resource for Leaves
                $leaves = [];
                foreach( $dtr_leaves as $leave){
                    if ($dtr_record->dtr_id == $leave->dtr_id) {
                        $leaves[] = [
                            'type'  => $leave->type,
                            'status'  => $leave->status,
                            'amount'  => (float) $leave->amount,
                            'note'=> [
                                'employee_note'  => $leave->employee_note,
                                'manager_note'  => $leave->manager_note
                            ]
                        ];
                    }

                    /*# If the Leave is Approved, a Paid Leave, and has a Valid amount, Sets the Approved Leave Name to get the Slug format of the Leave Type.
                    if( $leave->status == "approved" && $leave->isPaidLeave() && $leave->amount > 0 ){
                        $approved_leave_type =  $leave->type; 
                    }

                    # If the Leave is Approved, an Unpaid Leave, and has a Valid amount, Sets the Approved Leave Name to get the Slug format of the Leave Type.
                    if( $leave == "approved" && $leave->isUnPaidLeave() && $leave->amount > 0 ){
                        $approved_leave_type =  $leave->type; 
                    }*/
                }


                $attendance_status = 'Absent';
                if ($dtr_record->attendance_status) $attendance_status = $dtr_record->attendance_status;

                # Check if absent
                /*if( $this->isAbsent() ){
                    $attendance_status = get_constant("ATTENDANCE_STATUS.absent");
                    if ($this->onUnpaidLeave()->get()->count() > 0 ) {//override ABSENT with approved UNPAID LEAVE; DTR display only
                        $attendance_status = $approved_leave_type;
                    }

                }elseif( $this->onLeave()->get()->count() > 0 ) {
                    $attendance_status = $approved_leave_type;

                } elseif( $this->is_rest_day == 1 ) {
                    $attendance_status = get_constant("ATTENDANCE_STATUS.rest_day");

                }   elseif( $this->hasCompleteTimelogs() ) {
                    $attendance_status = get_constant("ATTENDANCE_STATUS.present");

                }*/

                # Create Resource for Holidays
                $holidays = [];
                foreach( $dtr_holidays as $holiday){
                    if ($dtr_record->dtr_id == $holiday->dtr_id) {
                        $holidays[] = [
                            'name'  => $holiday->name,
                            'type'  => $holiday->type
                        ];
                    }
                }

                # Create Resource for Requests
                $requests = [];
                foreach ($dtr_requests as $dtr_request) {
                    if ($dtr_record->dtr_id == $dtr_request->dtr_id) {
                        $requests[] = [
                            'request_type'  => $dtr_request->type,
                            'status'  => $dtr_request->status
                        ];
                    }
                }

                // foreach( $this->work_from_home()->get() as $work_from_home){
                //     $requests[] = new WorkFromHomeResource( $work_from_home );
                // }

                $now = Carbon::now()->timestamp;

                
                $user_half_time = 0;
                $is_within_time = false;
                $after_time_half = false;
                $is_within_time_extended = false;
                $checked_end_time =  $dtr_record->end_datetime;
            
                
                if($dtr_record->is_rest_day == 0){
                    $is_within_time = Carbon::now()->timestamp > ($dtr_record->start_datetime - 7200) && Carbon::now()->timestamp < ($checked_end_time +  10800) && $dtr_record->is_rest_day == 0 ;
                    $is_within_time_extended = Carbon::now()->timestamp > ($dtr_record->start_datetime - 7200) && Carbon::now()->timestamp < ($checked_end_time +  21600) && $dtr_record->is_rest_day == 0 ;

                    if($dtr_record->is_rest_day == 0 && $dtr_record->time_in && !$dtr_record->time_out){
                        $user_half_time = 12600 + $dtr_record->time_in; 
                        $after_time_half = Carbon::now()->timestamp < $user_half_time ;
                    }
                }

                $result[] =  array_merge( 
                    array(
                        'id' => $dtr_record->dtr_id,
                        'user_id' => $dtr_record->user_id,
                        'date' => $dtr_record->date,
                        'time_in' => timestamp_to_datetime( $dtr_record->time_in ),
                        'time_out' => timestamp_to_datetime( $dtr_record->time_out ),
                        'start_datetime' => timestamp_to_datetime( $dtr_record->start_datetime ),
                        'end_datetime' => timestamp_to_datetime( $dtr_record->end_datetime ),
                        'start_flexy_datetime' => timestamp_to_datetime( $dtr_record->start_flexy_datetime ),
                        'end_flexy_datetime' => timestamp_to_datetime( $dtr_record->end_flexy_datetime ),
                        'break_time' => seconds_to_time( $dtr_record->break_time ),
                        'is_rest_day' => $dtr_record->is_rest_day,
                        'source_type_tagging' => $dtr_record->source_type_tagging,
                        'attendance_status' => [
                            'name' => $attendance_status,
                            'slug' => text_to_slug( $attendance_status )
                        ],

                        'with_in_time' => $is_within_time,
                        'with_in_time_extended' => $is_within_time_extended,
                        'before_time_in_half' =>  $after_time_half ,
                        // 'on_multiple_login' => $on_multiple_log,
                        // 'dtr_history' => $dtr_history,
                        // 'timezone' =>  $owner->country_zone()->country_time_zone,
                    ), 
                    array('payroll_items' => $payroll_items),
                    array('policies' => $policies),
                    array('holidays' => $holidays),
                    array('leaves' => $leaves),
                    array('requests' => $requests),
                    array('owner_POV' => [

                        'time_in' => timestamp_to_datetime( $dtr_record->time_in , true ,  $owner),
                        'time_out' => timestamp_to_datetime( $dtr_record->time_out , true ,  $owner),
                        'start_datetime' => timestamp_to_datetime( $dtr_record->start_datetime , true ,  $owner),
                        'end_datetime' => timestamp_to_datetime( $dtr_record->end_datetime , true ,  $owner),
                        'end_datetime' => timestamp_to_datetime( $dtr_record->end_datetime , true ,  $owner),
                        'start_flexy_datetime' => timestamp_to_datetime( $dtr_record->start_flexy_datetime , true ,  $owner),
                        'end_flexy_datetime' => timestamp_to_datetime( $dtr_record->end_flexy_datetime , true ,  $owner),
                    ]),

                    array('raw_time' => [
                        'start_datetime' =>  $dtr_record->start_datetime , true ,
                        'end_datetime' =>  $dtr_record->end_datetime , true ,
                        // 'start_flexy_datetime' => timestamp_to_datetime( $this->start_flexy_datetime , true ,  $owner),
                        // 'end_flexy_datetime' => timestamp_to_datetime( $this->end_flexy_datetime , true ,  $owner),
                    ])
                );
            }

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'),
                //DtrResource::collection( $result ) 
                $result
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

        /**
     * Returns the Punches of the User by the User ID as Parameter
     * @param string $user_id
     * @param string $start_date
     * @param string $end_date
     * @return \Illuminate\Http\JsonResponse
     */
    public function punches( $user_id, $start_date, $end_date ){   
        try {
            $this->validate(new Request([
                'user_id' => $user_id,
                'start_date' => $start_date,
                'end_date' => $end_date,
            ]), [
                'user_id' => 'int',
                'start_date' => 'date_format:Y-m-d',
                'end_date' => 'date_format:Y-m-d',
            ]);
            
           $user = get_authenticated_user( $user_id );
            
            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                DtrPunchResource::collection( $user->punch($start_date, $end_date)->orderBy('date', 'asc')->get() ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

        /**
     * Returns the Punches of the User by the User ID as Parameter
     * @param string $user_id
     * @param string $start_date
     * @param string $end_date
     * @return \Illuminate\Http\JsonResponse
     */
    public function Dtr_punches( $user_id, $start_date, $end_date ){   
        try {
            $this->validate(new Request([
                'user_id' => $user_id,
                'start_date' => $start_date,
                'end_date' => $end_date,
            ]), [
                'user_id' => 'int',
                'start_date' => 'date_format:Y-m-d',
                'end_date' => 'date_format:Y-m-d',
            ]);
            
           $user = get_authenticated_user( $user_id );

           
           return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                DtrPunchHistoryLogResources::collection( $user->punchlogs($start_date, $end_date)->where("is_active", 1)->orderBy('date', 'asc')->get() )
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

        /**
     * Returns a single punch based on date
     * @param string $user_id
     * @param string $start_date
     * @param string $end_date
     * @return \Illuminate\Http\JsonResponse
     */
    public function dtr_single_punch( $user_id, $call_date ){   
        
        try {
            $this->validate(new Request([
                'user_id' => $user_id,
                'call_date' => $call_date,
              
            ]), [
                'user_id' => 'int',
                'call_date' => 'date_format:Y-m-d',
              
            ]);
            
           $user = get_authenticated_user( $user_id );

           
           return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                DtrPunchHistoryLogResources::collection( $user->target_punch($call_date)->orderBy('date', 'asc')->get() )
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Returns the DTR Summary of the User by the User ID as Parameter with the Date Range.
     * @param string $user_id
     * @param string $start_date
     * @param string $end_date
     * @return \Illuminate\Http\JsonResponse
     */
    public function quickpunch(Request $request){    
        try { 

        //    dd( $request->all(), Auth::user()->department_schedule_active());
            $biometrix_collection = Collection::make();
            $biometrics = new Biometrics();
    
            if($request->quickpunch=='in'){
                $biometrics->CheckType = 'I';
            }elseif($request->quickpunch=='out'){
                $biometrics->CheckType = 'O';
            }else{
                return error_response( trans('messages.error_default'), $e );
            }

            $biometrics->Userid          = '20'.Auth::user()->emp_num;
            $biometrics->CheckTime       = date("Y-m-d H:i:s");
            $biometrix_collection->push( $biometrics );

            $dtr_id = null;
            if ($request->dtr_id) {
                $dtr_id = $request->dtr_id;
            }
            
            return success_response(
                trans('messages.quickpunch_'.$request->quickpunch.'_success'), 
                DtrResource::collection( $this->dtr->sync_biometrics_to_dtr( $biometrix_collection, $dtr_id ) )
            );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
        
    }

        /**
     * Returns the DTR Summary of the User by the User ID as Parameter with the Date Range.
     * @param string $user_id
     * @param string $start_date
     * @param string $end_date
     * @return \Illuminate\Http\JsonResponse
     */
    public function quickpunch_multi(Request $request){    
        try { 

        //    dd( $request->all(), Auth::user()->department_schedule_active());
            $biometrix_collection = Collection::make();
            $biometrics = new Biometrics();
    
            if($request->quickpunch=='in'){
                $biometrics->CheckType = 'I';
            }elseif($request->quickpunch=='out'){
                $biometrics->CheckType = 'O';
            }elseif($request->quickpunch=='pause'){
                $biometrics->CheckType = 'P';
            }elseif($request->quickpunch=='continue'){
                $biometrics->CheckType = 'C';
            }else{
                return error_response( trans('messages.error_default'), $e );
            }

            $biometrics->Userid          = '20'.Auth::user()->emp_num;
            $biometrics->CheckTime       = date("Y-m-d H:i:s");
            $biometrix_collection->push( $biometrics );


            $date_check =   Carbon::now()
                            ->addSecond(string_offset_to_seconds(Auth::user()->country_timezone_to_offset()))
                            ->startOfDay();

                            // dd($request->all(), $request->on_date == true);
            if($request->date == "yesterday" && $request->on_date == true){

                $date_check =   Carbon::now()
                ->addSecond(string_offset_to_seconds(Auth::user()->country_timezone_to_offset()))
                ->startOfDay()
                ->subDay(1);
            }
                // dump(256,Auth::user()->department_schedule_active());
                $date_check_formatted = $date_check->format("Y-m-d");
            if(Auth::user()->department_schedule_active()){
                
                $result = $this->dtr->apply_punch_to_history($date_check_formatted,Auth::user()->id, $biometrix_collection);
                // dd( $result );
                if(!$result){ 
                    return error_response( trans(' you need to clock in '),  );
                }
            }
            // // dd($biometrix_collection);
            // $dtr_id = null;
            // if ($request->dtr_id) {
            //     $dtr_id = $request->dtr_id;
            // }
            
            return success_response(
                trans('messages.quickpunch_'.$request->quickpunch.'_success'), 
                // DtrResource::collection( $this->dtr->sync_biometrics_to_dtr( $biometrix_collection, $dtr_id ) )
            );

        } catch(Exception $e){

            // dd($e->getMessage());
            if(str_contains($e->getMessage(), 'This date was already approved')){
                return error_response( "This date was already approved as a rest day.", $e );
            }
            return error_response( trans('messages.error_default'), $e );
        }
        
    }






    /**
     * Returns the Daily Time Record of the User by the User ID as Parameter
     * @param string $user_id
     * @param string $start_date
     * @param string $end_date
     * @return \Illuminate\Http\JsonResponse
     */
    public function insert_time_in_and_out( $dtr_id, $time_in, $time_out, $is_rest_day=false ){   
        try {

            $this->validate(new Request([
                'dtr_id' => $dtr_id,
                'time_in' => $time_in,
                'time_out' => $time_out,
                'is_rest_day' => $is_rest_day,
            ]), [
                'dtr_id' => 'int',
                'time_in' => 'date_format:Y-m-d H:i:s',
                'is_rest_day' => 'boolean',
            ]);
            
            $dtr = Dtr::find( $dtr_id );
            $dtr->time_in = datetime_to_timestamp($time_in);
            $dtr->time_out = datetime_to_timestamp($time_out);
            
            if( $is_rest_day ) {
                $dtr->is_rest_day = 1;
                $dtr->source_type_tagging = get_constant('DTR_SOURCE_TYPE_TAGGING.rest_day_work');
            } else {
                $dtr->is_rest_day = 0;
                $dtr->source_type_tagging = get_constant('DTR_SOURCE_TYPE_TAGGING.default');
            }
            $dtr->update();

            $this->dtr->compute_payroll_items($dtr);
            
            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                new DtrResource( $dtr )
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }





    public function simcorp(){    
        try { 

            $deparment = Department::with("users")->find(112);

            // dump($deparment->users);
            // dd($deparment->users->where('id',1767));
            // $user_collection = $deparment->users->where('id',1767);
            // $user_collection = $deparment->users->where('id',1658);
            // $user_collection = $deparment->users->where('id',1691);
            $user_collection = $deparment->users;
            $sched_policy = SchedulePolicy::where("schedule_id", 10012)->get();
            foreach(   $user_collection as $user ){
                $this->dtr->apply_dtr_to_simcorp_dtr( $user, $bypass = true ,  "2022-10-19", "2022-11-15", $sched_policy );
            }
            
            

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
        
    }

    public function get_incomplete_logs() {
        // get the date today
        $today = Carbon::now()->format('Y-m-d');
        $yesterday = Carbon::yesterday()->format('Y-m-d');

        // get the cutoff that scopes the date today
        $payroll_cutoff = PayrollCutoff::where('start_date', '<=', $today)->where('end_date', '>=', $today)->first();
        if (!$payroll_cutoff) {
            return [];
        } else {
            // get incomplete dtr for the current cutoff
            $inc_dtr = Dtr::whereBetween('date', [$payroll_cutoff->start_date, $yesterday])
                            ->where('user_id', Auth::user()->id)
                            ->where('is_rest_day', 0)
                            ->where(function($query) {
                                $query->whereNull('time_in')->orWhereNull('time_out');
                            })
                            ->get()
                            ->toArray();

            if ($inc_dtr) {
                $keys_to_del = [];
                foreach ($inc_dtr as $key => $dtr) {
                    // check if the dtr is on holiday
                    $holiday = Holiday::whereRaw("DATE_FORMAT(date, '%m-%d') = DATE_FORMAT('" . $dtr['date'] . "', '%m-%d')")->get();
                    if (count($holiday) !== 0) {
                        $keys_to_del[$key] = $dtr['id'];
                        continue;
                    }

                    // check if the dtr is on leave
                    $leave = Leave::where('dtr_id', $dtr['id'])->where('amount', '1.0')->get();
                    if (count($leave) !== 0) {
                        $keys_to_del[$key] = $dtr['id'];
                        continue;
                    }
                }

                if ($keys_to_del) {
                    $inc_dtr = array_diff_key($inc_dtr, $keys_to_del);
                }
            }

            return $inc_dtr;
        }
    }
}
