<?php

namespace App\Modules\Payroll\Http\Controllers;


use App\Http\Controllers\Controller;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Resources\DtrResource;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepositoryInterface;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DtrController extends Controller
{    
    protected $dtr;

    public function __construct(DtrRepositoryInterface $dtr, UserRepositoryInterface $user){
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
            
            # If the User being requested is the current user being logged in, fetch the current User Instance.
            if( auth()->user()->id == $user_id ) {
                $user = auth()->user();

            # If not, fetch the User Instance from the currently logged in's supervisee list.
            } else {
                $user = auth()->user()->supervisee()->findOrFail( $user_id );
            }
            
            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                DtrResource::collection( $user->dtr($start_date, $end_date)->get() ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
