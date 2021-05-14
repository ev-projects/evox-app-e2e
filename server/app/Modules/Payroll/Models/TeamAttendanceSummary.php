<?php

namespace App\Modules\Payroll\Models;


use App\Modules\User\Models\User;
use App\Modules\Payroll\Models\Dtr;
use Exception;
use Illuminate\Database\Eloquent\Collection;

class TeamAttendanceSummary
{  
    # Instance of the Summary
    private $result;

    /**
     *  Initialize the Structure of all the Data that would be returned by the Summary.
     */
    function __construct()
    {
       $this->clear_properties();
    }



    ###############################################################################################
    ######################################## Main function ########################################
    ###############################################################################################



    /**
     *  Main function for triggering the Computation of the Summary.
     * @param Collection $user_collection
     * @param string $start_date
     * @param string $end_date
     * @return array
     */
    public function get_summary( Collection $user_collection, string $start_date, string $end_date )
    {
        try {

            $this->clear_properties();

            $this->result['total_headcount'] = $user_collection->count();
            
            return $this->result;

        } catch(Exception $e) {
            dd( $e );
        }
    }



    ###############################################################################################
    #################################### Computation functions ####################################
    ###############################################################################################


    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################



    /**
     *  Reponsible for clearing out the DTR Summary Properties
     */
    private function clear_properties(){

        $this->result = array(
            "total_headcount"  => 0,
            "scheduled_headcount"  => [
                'total_count' => 0,
                'total_percentage' => 0,
                'expected_percentage' => 95,
            ],
            "unplanned_leaves"  => [
                'total_count' => 0,
                'total_percentage' => 0,
                'expected_percentage' => 3,
            ],
            "planned_leaves"  => [
                'total_count' => 0,
                'total_percentage' => 0,
                'expected_percentage' => 7 ,
            ],
        );
    }


}
