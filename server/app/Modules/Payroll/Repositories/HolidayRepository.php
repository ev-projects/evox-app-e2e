<?php 

namespace App\Modules\Payroll\Repositories;

use App\Modules\Payroll\Models\Holiday;
use App\Modules\Payroll\Models\PayrollCutoff;
use App\Modules\User\Models\User;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;

class HolidayRepository implements HolidayRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    /**
     *  Gets Holidays within the given date range
     * @param Carbon $date_from
     * @param string $date_to
     * @return Collection $holiday_collection
     */
    public function get_holidays( Carbon $date_from, Carbon $date_to )
    {
        try {
            $holiday_collection = Holiday::whereRaw("(is_predefined = 1 
                                                            AND (DAYOFYEAR(date) - DAYOFYEAR(NOW())) >=  ".get_constant("MONTH_SCOPE.day_from")." 
                                                            AND (DAYOFYEAR(date) - DAYOFYEAR(NOW())) <=  ".get_constant("MONTH_SCOPE.four_months")."
                                                    ) 
                                                    OR 
                                                    (is_predefined = 0 
                                                            AND date >= '".$date_from->format("Y-m-d") ."' 
                                                            AND date <= '".$date_to->format("Y-m-d") ."' ) 
                                                    ")
                                                    ->orderByRaw('Month(date),Day(date)')
                                                    ->get();
            return $holiday_collection;
        } catch (Exception $e) {
            log_error($e);
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