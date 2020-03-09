<?php 

namespace App\Modules\Payroll\Repositories;

use App\Modules\Payroll\Models\PayrollCutoff;
use App\Modules\User\Models\User;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;

class PayrollRepository implements PayrollRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    /**
     *  Gets the Payroll Cutoff. Gets the current date's scope if there's no date parameter.
     * @param string $date
     * @return PayrollCutoff $payroll_cutoff
     */
    public function get_payroll_cutoff( string $date = null )
    {
        try {
            $payroll_cutoff = null;

            // If $date is not initialized, use the Current Date today.
            if( !is_valid( $date ) ) {
                $date = Carbon::now()->format('Y-m-d');
            }
            
            // Fetches the First Payroll Cutoff that scopes the Date given.
            $payroll_cutoff = PayrollCutoff::whereRaw("( start_date <= '".$date."' AND  end_date >= '".$date."')")
                                            ->first();

            // If the recently fetched Payroll Cutoff is Null (Which is non existent), just fetch the Latest Payroll Cutoff via End Date.
            if( !is_valid( $payroll_cutoff ) ) {
                $payroll_cutoff = PayrollCutoff::orderBy('end_date', 'desc')
                                                ->first();
            }

            return $payroll_cutoff;
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