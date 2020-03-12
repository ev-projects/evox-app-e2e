<?php 

namespace App\Modules\Payroll\Repositories;

use App\Modules\Payroll\Models\Biometrics;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\Holiday;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;
use Carbon\Carbon;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class BiometricsRepository implements BiometricsRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    /**
     *  Responsible for Fetching Biometrics from the MsSQL Database
     * @param string $start_datetime
     * @param string $end_datetime
     * @param Collection $user_collection (Optional)
     * @return bool
     */
    public function get_biometrics( string $start_datetime, string $end_datetime, Collection $user_collection = null )
    {
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'start_date' => $start_datetime, 'end_date' => $end_datetime, 'user_collection' => $user_collection ], "biometrics");

        try {

            $result = null;

            # Creates the Query on fetching the Biometrics data between the Start and End Date time.
            $biometrics_collection_query = Biometrics::select('CheckTime','CheckType','Userid')
                                                        ->whereIn('CheckType', ['I','O'])
                                                        ->whereBetween('CheckTime', [$start_datetime, $end_datetime])
                                                        ->orderBy('CheckTime', 'asc');

            # If User Collection is valid, Adds the Users in the condition on fetching the Biometrics
            if( is_valid( $user_collection ) ){

                # Plucks the 'emp_num' field from the Collection and appends the "20" on the emp_num to match the data on Biometrics. 
                $user_emp_num_collection = $user_collection->pluck('emp_num')
                                                            ->map(function ($emp_num) {
                                                                return parse_emp_num_for_biometrics( $emp_num );
                                                            });

                # Appends the condition of User Emp_num on the Biometrics Query
                $biometrics_collection_query->whereIn('Userid',  $user_emp_num_collection );
            }

            # Fetchs the Biometrics Collection.
            $result = $biometrics_collection_query->get();
            
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $result, "biometrics");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "biometrics");
            return $result;

        } catch (Exception $e) {
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "biometrics");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "biometrics");
            throw $e;
        }
    }

    ###############################################################################################
    ##################################### Protected functions #####################################
    ###############################################################################################

    //....


    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################


    //....



}