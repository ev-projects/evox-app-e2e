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

                // $real_offset = $utc->get_country_timezone_to_offset();

                $static_offset =  $utc->time_difference;

                // $real_offset_seconds = string_offset_to_seconds($real_offset);

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
                        // dump($day->copy()->timezone( $utc->timezone ), $check_offset,$check_offset_seconds, $static_offset_seconds, $adjustment_has_checked == false);
                        $adjustment_has_checked = true;
                        $utc->time_difference_adjusted = $check_offset;
                        $utc->start_adjustment = $day->copy()->subDays(1)->format('Y-m-d');
                    }

                  }
                   
                }

           
                $utc->update();
            }
            
           

            
            // log_to_file( 'info', 'User Profile successfully updated', [$utc], 'user_profile');
            // log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $utc, "user_profile");
            // log_to_file( 'info', get_constant('LOG_GAP'), [], "user_profile");

            DB::commit();
            // return $utc;

        } catch (Exception $e) {

            DB::rollback();
            log_error($e);
            // log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "user_profile");
            // log_to_file( 'info', get_constant('LOG_GAP'), [], "user_profile");

            throw $e;
        }
    }


    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################


    //....



}