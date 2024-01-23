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
            
            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                DtrResource::collection( $user->dtr($start_date, $end_date)->orderBy('date', 'asc')->get() ) 
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
                $action = 'Clockin';
                $description = 'has clocked in';
            }elseif($request->quickpunch=='out'){
                $biometrics->CheckType = 'O';
                $action = 'Clockout';
                $description = 'has clocked out';
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

            log_to_audit_trail(['action' => $action, 'description' => $description, 'user_id' => auth()->user()->id, 'session_id' => $request->session_id, 'type' => 1]);

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
