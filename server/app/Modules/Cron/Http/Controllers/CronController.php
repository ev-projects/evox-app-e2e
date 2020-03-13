<?php

namespace App\Modules\Cron\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Payroll\Repositories\BiometricsRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollRepository;
use App\Modules\Payroll\Resources\DtrResource;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepositoryInterface;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;

class CronController extends Controller
{
    protected $bhr;
    protected $payroll;
    protected $user;
    protected $dtr;
    protected $biometrics;
    

    public function __construct(BhrRepositoryInterface $bhr, 
                                PayrollRepository $payroll, 
                                UserRepositoryInterface $user, 
                                DtrRepositoryInterface $dtr, 
                                BiometricsRepositoryInterface $biometrics){
        $this->bhr = $bhr;
        $this->payroll = $payroll;
        $this->user = $user;
        $this->dtr = $dtr;
        $this->biometrics = $biometrics;
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
            
            # Test Data for Debugging
            // $date_array = generate_date_array( "2019-07-01", '2020-06-31' );
            
            $result = $this->dtr->generate_dtr( $user_collection, $date_array );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $result,
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

            # Test Data for Debugging
            // $start_datetime = "2020-02-15 00:00:00";
            // $end_datetime = "2020-02-29 18:20:00"; 
            // $user_collection = User::get();

            $biometrics_collection = $this->biometrics->get_biometrics( $start_datetime, $end_datetime );
            
            $result = DtrResource::collection( $this->dtr->sync_biometrics_to_dtr( $biometrics_collection ) );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $result
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Syncs the BHr's Declared Holidays within the current Payroll Cutoff Date Range into the DTR affected.
     *  1. Fetch BHr Declared Holidays
     *  2. Insert Holidays in EVOX
     *  3. Bind Holidays to DTR
     * @return \Illuminate\Http\JsonResponse
     */
    public function sync_holidays(){
        try {
            // Fetch the Current Cutoff that would be use as Date Range for Syncing of Holidays from BHR and Binding Holidays to DTR.
            $payroll_cutoff = $this->payroll->get_payroll_cutoff();

            $start_date = $payroll_cutoff->start_date;
            $end_date = $payroll_cutoff->end_date;

            # Test Data for Debugging
            // $start_date = "2019-07-01";
            // $end_date = "2020-06-31";

            // Sync the Holidays from BHr to EVOX within the Payroll Cutoff as Date Range.
            $this->bhr->sync_holidays( $start_date, $end_date );

            // Binding of the Holidays within the Date Range to the DTR within the Date Range.
            $result = $this->dtr->bind_holidays_to_dtr( $start_date, $end_date );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                DtrResource::collection($result),
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


    /**
     * Syncs the BHr's Submitted Leave Requests within the current Payroll Cutoff Date Range into the DTR affected.
     *  1. Fetch BHr Submitted Leave Requests
     *  3. Bind Leaves to DTR
     * @return \Illuminate\Http\JsonResponse
     */
    public function sync_leaves(){
        try {
            // Fetch the Current Cutoff that would be use as Date Range for Syncing of Holidays from BHR and Binding Holidays to DTR.
            $payroll_cutoff = $this->payroll->get_payroll_cutoff();

            $start_date = $payroll_cutoff->start_date;
            $end_date = $payroll_cutoff->end_date;

            # Test Data for Debugging
            // $start_date = "2020-03-01";
            // $end_date = "2020-03-31";

            // Fetch the Leaves from BHr within the Payroll Cutoff as Date Range.
            $bhr_leaves_array = $this->bhr->get_leaves( $start_date, $end_date, User::find(8) );
            
            // Binding of the Leaves fetched from BHr within the Date Range to the DTR within the Date Range.
            $result = $this->dtr->bind_leaves_to_dtr( $bhr_leaves_array );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $result,
                JsonResponse::HTTP_CREATED
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }


}
