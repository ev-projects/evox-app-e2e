<?php

namespace App\Modules\Payroll\Http\Controllers;


use App\Http\Controllers\Controller;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Resources\DtrResource;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\User\Models\User;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DtrController extends Controller
{    
    private $dtr;
    public function __construct(DtrRepositoryInterface $dtr){
        $this->dtr = $dtr;
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
