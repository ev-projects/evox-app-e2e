<?php

namespace App\Modules\Dtr\Http\Controllers;


use App\Http\Controllers\Controller;
use App\Modules\Dtr\Repositories\DtrRepositoryInterface;
use App\Modules\Dtr\Resources\DtrResource;
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
    protected $user;

    public function __construct(DtrRepositoryInterface $dtr, UserRepositoryInterface $user){
        $this->dtr = $dtr;
        $this->user = $user;
    }


    /**
     * Generates the Weekly DTR for all the Employees
     * @return \Illuminate\Http\JsonResponse
     */
    public function generate_weekly_dtr(){
        try {
            # Fetches all the Active Users
            $user_collection = $this->user->getAllActiveUsers();
            
            # Generates the Date Range that would be generated as DTR for each Active Employees
            $date_array = generate_date_array( Carbon::tomorrow(), 7 );
            
            return success_response(
                trans('messages.create_schedule_success'), 
                $this->dtr->generate_dtr( $user_collection, $date_array ),
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Syncs the Biometrics' Data to DTR with specific Number of Minutes (3 minutes as of now.)
     * @param string $user_id
     * @param string $start_date
     * @param string $end_date
     * @return \Illuminate\Http\JsonResponse
     */
    public function sync_realtime_biometrics(){   
        try {
            $start_datetime = Carbon::now()->subMinutes(30)->format('Y-m-d H:i:s');
            $end_datetime = Carbon::now()->format('Y-m-d H:i:s'); 
            // $start_datetime = "2020-02-15 00:00:00";
            // $end_datetime = "2020-02-29 18:20:00"; 
            // $user_collection = User::get();

            return success_response(
                trans('messages.show_dtr'), 
                DtrResource::collection( $this->dtr->sync_biometrics_to_dtr( $start_datetime, $end_datetime ) ) 
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
                trans('messages.show_dtr'), 
                DtrResource::collection( $user->dtr($start_date, $end_date)->get() ) 
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
}
