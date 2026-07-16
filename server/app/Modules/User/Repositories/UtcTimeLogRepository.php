<?php 

namespace App\Modules\User\Repositories;

use Exception;

use Carbon\Carbon;

use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\UtcTimelog;



class UtcTimeLogRepository implements UtcTimeLogRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################




    /**
     *  Responsible for Update User Profile

     */
    public function check_adjustment(  ){

        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "UTC");

        DB::beginTransaction();
        $date = Carbon::now();

        $startOfYear = $date->copy()->startOfYear()->format('Y-m-d');
        $endOfYear   = $date->copy()->endOfYear()->format('Y-m-d');
        


        $period = CarbonPeriod::create($startOfYear, $endOfYear);
        try {  
           
            $utc_collection  = UtcTimelog::all();
        
            foreach($utc_collection as $utc){
                $static_offset =  $utc->time_difference;

                $static_offset_seconds = string_offset_to_seconds($static_offset);

                $adjustment_has_checked=  false;
                $adjustment_has_ended = false;
                foreach ($period as $day){
                  if($adjustment_has_ended == false){
                    $check_offset  = $day->copy()->timezone( $utc->timezone )->format('P');
                    $check_offset_seconds = string_offset_to_seconds($check_offset);

                    if($adjustment_has_checked == true){
                        if(string_offset_to_seconds($utc->time_difference_adjusted) !=  $check_offset_seconds){
                            $utc->end_adjustment = $day->copy()->format('Y-m-d');
                            $adjustment_has_ended = true;
                        }
                    }
                    if($check_offset_seconds != $static_offset_seconds && $adjustment_has_checked == false ){
                        $adjustment_has_checked = true;
                        $utc->time_difference_adjusted = $check_offset;
                        $utc->start_adjustment = $day->copy()->subDays(1)->format('Y-m-d');
                    }

                  }
                   
                }

           
                $utc->update();
            }

            DB::commit();

        } catch (Exception $e) {

            DB::rollback();
            log_error($e);

            throw $e;
        }
    }


    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################


    //....



}