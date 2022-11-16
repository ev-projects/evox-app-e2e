<?php

namespace App\Modules\Payroll\Http\Controllers;


use Exception;
use Illuminate\Http\Request;
use App\Exports\DtrSummaryExport;
use App\Modules\User\Models\User;
use Illuminate\Http\JsonResponse;
use App\Modules\Payroll\Models\Dtr;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;
use App\Modules\Payroll\Models\Biometrics;
use Illuminate\Database\Eloquent\Collection;
use App\Modules\Department\Models\Department;

use App\Modules\Payroll\Resources\DtrResource;
use App\Modules\Schedule\Models\SchedulePolicy;
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
     * Returns the DTR Summary of the User by the User ID as Parameter with the Date Range.
     * @param string $user_id
     * @param string $start_date
     * @param string $end_date
     * @return \Illuminate\Http\JsonResponse
     */
    public function quickpunch(Request $request){    
        try { 
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
}
