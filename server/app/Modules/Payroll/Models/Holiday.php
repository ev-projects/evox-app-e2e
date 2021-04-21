<?php

namespace App\Modules\Payroll\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;

class Holiday extends Model
{
    use LogsActivity;

    protected $guarded = [];

    protected static $logAttributes = ['name', 'date', 'type', 'is_predefined'];

    protected $dates = [
        'date',
        'deleted_at',
        'created_at',
        'updated_at'
    ];

    protected $casts = [
        'is_predefined' => 'boolean'  # Casts the is_predefinedto Boolean
    ];

    ########################################################################
    ############################ Custom Helpers ############################
    ########################################################################


    /**
     * 
     *  Fetch the correct date for the Holiday
     *  - Has a $basis_start_date & basis_end_date Parameters where it checks for additional condition (Transition of Year Condition)
     * @param date $basis_start_date (Optional)
     * @param date $basis_end_date (Optional)
     * @return date $date
     */
    public function getProperDate( $basis_start_date = "", $basis_end_date = "")
    {   
        // $basis_start_date   = '2020-12-18';
        // $basis_end_date     = '2021-01-19';
        // $this->date         = '2020-01-20';

        $date = $this->date;

        // If the Holiday is Pre-defined and the Start and End Date has values, proceed on the conditions below.
        if( $this->is_predefined && is_valid( $basis_start_date ) && is_valid( $basis_end_date ) ) {

            // Instantiate the Basis Start, Basis End, and Date into Carbon
            $basis_start_date               = Carbon::parse($basis_start_date);
            $basis_end_date                 = Carbon::parse($basis_end_date);
            $basis_start_date_end_of_year   = Carbon::parse($basis_start_date)->endOfYear();
            $basis_end_date_start_of_year   = Carbon::parse($basis_end_date)->startOfYear();
            $date                           = Carbon::parse($date);

            // If the Basis Start and End Year are the SAME, Combine the Same Year and the Month and Day of the Pre-defined Holiday.
            if( $basis_start_date->format('Y') == $basis_end_date->format('Y') ) {
                $date = Carbon::parse($basis_start_date)->format('Y').Carbon::parse($date)->format('-m-d');

            // If the Basis Start Year is LESS than End Year, it means the Start and End Date conducts a Transition into a New Year.
            } elseif( $basis_start_date->format('Y') < $basis_end_date->format('Y') ) {

                // If the Current Pre-defined Holiday's month is between the Start Date's Month AND Start Date's Last Month (10-27 -> 12-31), use the Start Year as the Year for the Final Date.
                if(    (int) $date->month >= (int) $basis_start_date->month 
                    && (int) $date->month <= (int) $basis_start_date_end_of_year->month ) {
                    $date = Carbon::parse($basis_start_date)->format('Y').Carbon::parse($date)->format('-m-d');

                // If the Current Pre-defined Holiday's month is between the End Date's First Month and End Date's Month (01-01 -> 03-12), use the Start Year as the Year for the Final Date.
                } elseif(  (int) $date->month >= (int) $basis_end_date_start_of_year->month 
                        && (int) $date->month <= (int) $basis_end_date->month ) {
                    $date = Carbon::parse($basis_end_date)->format('Y').Carbon::parse($date)->format('-m-d');
                }
            }
        }

        return $date;
    }



    public function get_holiday_within_date(){
        $holiday = $this->whereRaw("(DAYOFYEAR(date) - DAYOFYEAR(NOW())) >=  ".get_constant("MONTH_SCOPE.day_from")." AND (DAYOFYEAR(date) - DAYOFYEAR(NOW())) <=  ".get_constant("MONTH_SCOPE.day_to")."");
        return  $holiday->get();
    }


}
