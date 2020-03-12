<?php 

namespace App\Modules\Bhr\Repositories;

use App\Modules\Payroll\Models\Biometrics;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\Holiday;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;
use Carbon\Carbon;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BhrRepository implements BhrRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    /**
     *  Responsible for Fetching Holidays from BHr and Syncing it on our Holiday Table. Conducts checking if holiday already exists.
     * @param string $start_date
     * @param string $end_date
     * @return Collection $holiday_collection
     */
    public function sync_holidays( string $start_date, string $end_date )
    {
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'start_date' => $start_date, 'end_date' => $end_date], "bhrlog");
        DB::beginTransaction();
        try {

            $holidays_collection = new Collection;

            foreach( bhr_api_call('GET', 'time_off/whos_out/?start='.$start_date.'&end='.$end_date) as $row ) {

                // If the current Iteration's Type Attribute is a 'holiday', proceed on checking for possible Holiday transaction.
                if( $row->type == 'holiday' ) {

                    // Checks if the current Holiday in the Iteration is already Pre-defined OR already existing and synced.
                    $existing_holiday_query = Holiday::whereRaw("
                                                            ( is_predefined = 1 
                                                              AND DATE_FORMAT(date,'%m-%d') = DATE_FORMAT(?,'%m-%d') )
                                                        OR
                                                            ( is_predefined = 0 
                                                              AND date = ?
                                                              AND name = ?  )
                                                        ", array( 
                                                                $row->start, 
                                                                $row->start, 
                                                                $row->name 
                                                            )
                                                        );

                    // If the Holiday is Not Existing, Proceed on saving the Holiday as new.                                           
                    if( $existing_holiday_query->count() == 0 ) {

                        log_to_file( 'info', 'Holiday NOT Existing!', $row, "bhrlog");

                        $holiday                  = new Holiday();
                        $holiday->name            = $row->name;
                        $holiday->type            = ( Str::contains($row->name, 'Regular Holiday') ? 'lh' : 'sh' );
                        $holiday->date            = $row->start;
                        $holiday->is_predefined   = false;
                        $holiday->save();

                        $holidays_collection->push( $holiday );

                        log_to_file( 'info', 'Inserted!', $holiday->getAttributes(), "bhrlog");

                    } else {
                        log_to_file( 'info', 'Holiday Existing!', $existing_holiday_query->get(), "bhrlog");
                    }
                }
            }

            DB::commit();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            return $holidays_collection;

        } catch (Exception $e) {
            DB::rollback();
            
            log_error($e);
            log_to_file( 'info', get_constant('LOG_ROLLBACK'), [],  "bhrlog");
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            throw $e;
        }
    }

    
    /**
     *  Responsible for Fetching Leaves from BHr.
     * @param string $start_date
     * @param string $end_date
     * @return Collection $holiday_collection
     */
    public function get_leaves( string $start_date, string $end_date )
    {
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'start_date' => $start_date, 'end_date' => $end_date], "bhrlog");
        DB::beginTransaction();
        try {


            DB::commit();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            return null;

        } catch (Exception $e) {
            DB::rollback();
            
            log_error($e);
            log_to_file( 'info', get_constant('LOG_ROLLBACK'), [],  "bhrlog");
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            throw $e;
        }
    }

    ###############################################################################################
    ##################################### Protected functions #####################################
    ###############################################################################################



    /**
     *  Description
     * @return bool
     */
    protected function test()
    {
        DB::beginTransaction();
        try {
            # Sets the Result as null by default.
            $result = null;

            DB::commit();
            log_to_file('info', 'Success', null);
            return $result;
        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }


    //....


    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################


    //....



}