<?php 

namespace App\Modules\Bhr\Repositories;

use App\Modules\Payroll\Models\Biometrics;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;
use Carbon\Carbon;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class BhrRepository implements BhrRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    /**
     *  Responsible for Fetching Holidays
     * @param string $start_date
     * @param string $end_date
     * @return Collection $holiday_collection
     */
    public function sync_holidays( string $start_date, string $end_date )
    {
        DB::beginTransaction();
        try {
            $holiday_collection = new Collection;

            DB::commit();
            log_to_file('info', 'Success', null);
            return null;
        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
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