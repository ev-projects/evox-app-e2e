<?php

namespace App\Modules\Payroll\Http\Controllers;


use App\Http\Controllers\Controller;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Resources\DtrResource;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Repositories\BiometricsRepositoryInterface;
use App\Modules\User\Models\User;
use App\Modules\Payroll\Models\Biometrics;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

use App\Exports\UsersExport;
use Maatwebsite\Excel\Facades\Excel;

class DtrController extends Controller
{    
    private $dtr;
    public function __construct(DtrRepositoryInterface $dtr, BiometricsRepositoryInterface $biometrics, UsersExport $export){
        $this->dtr = $dtr;
        $this->biometrics = $biometrics;
        $this->export = $export;
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
                DtrResource::collection( $user->dtr($start_date, $end_date)->get() ) 
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
    public function dtr_summary( $user_id, $start_date, $end_date ){
        try {
            $user_collection = Collection::make();

            $this->validate(new Request([
                'user_id' => $user_id,
                'start_date' => $start_date,
                'end_date' => $end_date,
            ]), [
                'user_id' => 'int',
                'start_date' => 'date_format:Y-m-d',
                'end_date' => 'date_format:Y-m-d',
            ]);
            
            $user_collection->push(  get_authenticated_user( $user_id )  );

            $result = $this->dtr->compute_dtr_summary( $user_collection, $start_date, $end_date);

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $result[ $user_id ]  
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    public function dtr_summary_block( $user_id, $start_date, $end_date ){
        try {
            $user_collection = Collection::make();

            $this->validate(new Request([
                'user_id' => $user_id,
                'start_date' => $start_date,
                'end_date' => $end_date,
            ]), [
                'user_id' => 'int',
                'start_date' => 'date_format:Y-m-d',
                'end_date' => 'date_format:Y-m-d',
            ]);
            
            $user_collection->push(  get_authenticated_user( $user_id )  );

            

            $result = $this->dtr->compute_dtr_summary( $user_collection, $start_date, $end_date);

            # ADD THE SUMMARY COLUMNS NAME
            $result["column_names"] = get_constant('DTR_SUMMARY_COLUMN');

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $result 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function summary_list($filter) {
        $user_collection = Collection::make();
        $under_supervisee =  Auth::user()->supervisee() ; 
        
        if(isset($filter->department_id)){
            $under_supervisee->where('department_id',$filter->department_id );
        }
        
        if(isset($filter->name)){
            $under_supervisee->where('first_name', 'like', '%' . $filter->name. '%');;
        }

        $employees =  $under_supervisee->get();

        foreach( $employees as $user ) {
            $user_collection->push(  $user  );
        }

        $start_date = $filter->valid_from;
        $end_date = $filter->valid_to;
     
        $result = $this->dtr->compute_dtr_summary( $user_collection, $start_date, $end_date);

        return  $result ;
    }

        /**
     * Returns the DTR Summary of the User by the User ID as Parameter with the Date Range.
     * @return \Illuminate\Http\JsonResponse
     */
    public function team_dtr_summary(  Request $request  ){
        try {
            
            $result = $this->summary_list($request);

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $result  
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

        /**
     * Returns the DTR Summary of the User by the User ID as Parameter with the Date Range.
     * @return \Illuminate\Http\JsonResponse
     */
    public function export_team_dtr_summary( Request $request ){

        $result = $this->summary_list($request);

        $this->export->data = $result ;
         return Excel::download( $this->export , 'dtrsummary.csv');
       
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
            
            return success_response(
                trans('messages.quickpunch_'.$request->quickpunch.'_success'), 
                DtrResource::collection( $this->dtr->sync_biometrics_to_dtr( $biometrix_collection ) )
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
}
