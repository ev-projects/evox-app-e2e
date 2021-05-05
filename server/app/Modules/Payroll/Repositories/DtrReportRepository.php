<?php 

namespace App\Modules\Payroll\Repositories;

use App\Modules\Department\Models\Department;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\PayrollCutoff;
use App\Modules\Team\Models\Team;
use App\Modules\User\Models\User;
use Carbon\Carbon;
use DebugBar\DebugBar;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Spatie\Permission\Models\Role;
use Illuminate\Http\Request;

class DtrReportRepository implements DtrReportRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    /**
     *  Responsible for fetching all the currently logged in team member's Birthday and Anniversary.
     * @param $start_date
     * @param $end_date
     * @return Collection $dtr_collection
     */
    public function get_my_dtr_notifications( $start_date, $end_date ){
        try {
            
            $dtr_collection = auth()->user()->dtr( $start_date, $end_date )->get();
            return $dtr_collection;

        } catch (Exception $e) {
            throw $e;
        }
    }


    
    
    /**
     *  Responsible for fetching all the currently logged in team member's Birthday and Anniversary.
     * @return array
     */
    public function get_team_birthday_anniversary(){
        try {

            $user_list = auth()->user()->users_handled();

            if( is_valid( request()->get('department_id') ) ) {
                $user_list->where('department_id', '=', request()->get('department_id'));
            }
    
            $birthdate = User::selectRaw("birthdate as date,first_name,last_name,'birthdate' AS type ")->whereIn('users.id', $user_list->pluck('id')->toArray() )
            ->whereRaw("(DAYOFYEAR(birthdate) - DAYOFYEAR(NOW())) >= ".get_constant("MONTH_SCOPE.day_from")." AND (DAYOFYEAR(birthdate) - DAYOFYEAR(NOW())) <=  ".get_constant("MONTH_SCOPE.one_month")."");
    
            $anniversary = User::selectRaw("date_hired as date,first_name,last_name,'anniversary' AS type")->whereIn('users.id', $user_list->pluck('id')->toArray() )
                    ->whereRaw("(DAYOFYEAR(date_hired) - DAYOFYEAR(NOW())) >=  ".get_constant("MONTH_SCOPE.day_from")." AND (DAYOFYEAR(date_hired) - DAYOFYEAR(NOW())) <=  ".get_constant("MONTH_SCOPE.one_month")."");
    
            $date_from = Carbon::now()->subMonth( get_constant("REGULARIZATION.month_from") );
            $date_to = Carbon::now()->subMonth( get_constant("REGULARIZATION.month_to") );
    
            $regularization = User::selectRaw("DATE_ADD(date_hired, INTERVAL 6 MONTH) as date,first_name,last_name,'regularization' AS type ")->whereIn('users.id', $user_list->pluck('id')->toArray() )
                        ->whereRaw("date_hired >= '".$date_from->format("Y-m-d") ."' AND date_hired <= '".$date_to->format("Y-m-d") ."' ");
    
            $birthdate->union($anniversary)->union($regularization)->orderByRaw('Month(date),Day(date)')->union($regularization);
    
            return $birthdate->get();

        } catch (Exception $e) {
            throw $e;
        }
    }



    /**
     *  Responsible for fetching the Team's attendance
     * @param Carbon $current_time
     * @return array
     */
    public function get_team_attendance( Carbon $current_time ){
        try {
            $time_from = $current_time->subHour( 6 );
            $time_to = $current_time->addHour( 6 );
    
            $user_list = auth()->user()->users_handled();
    
            if( is_valid( request()->get('department_id') ) ) {
                $user_list->where('department_id', '=', request()->get('department_id'));
            }
        
            $team_dtr = Dtr::whereIn('user_id', $user_list->pluck('id')->toArray())
            ->whereRaw("
                    ( 
                        start_datetime BETWEEN  '".  $time_from->timestamp."' AND '".  $time_to->timestamp."'
                    OR 
                        start_flexy_datetime BETWEEN  '".  $time_from->timestamp ."' AND '".  $time_to->timestamp ."'
                    OR  
                        end_datetime BETWEEN  '".  $time_from->timestamp."' AND '".  $time_to->timestamp."'
                    OR 
                        end_flexy_datetime BETWEEN  '".  $time_from->timestamp ."' AND '".  $time_to->timestamp ."'
                    OR 
                        date = '".date("Y-m-d" ,$current_time->timestamp)."' 
                    )
            ")
            ->get();
        
            return  $team_dtr;
        } catch (Exception $e) {
            throw $e;
        }
    }

    /**
     *  Responsible for fetching all the team attendance summary.
     * @param Carbon $current_time
     * @return array
     */
    public function get_team_attendance_summary( Carbon $current_time ){
        try {
            $start_day = $current_time->startOfWeek()->format('Y-m-d');
            $end_day = $current_time->endOfWeek()->format('Y-m-d');
            
            $absent = Dtr::leftJoin('dtr_holidays', function($join) {
                $join->on('dtr_holidays.dtr_id', '=', 'dtrs.id');
                })->leftJoin('leaves', function($join) {
                    $join->on('leaves.dtr_id', '=', 'dtrs.id');
                })->whereIn('user_id', auth()->user()->users_handled()->pluck('id')->toArray() )
                  ->whereRaw("
                date >= '".$start_day."' && date <= '".$current_time->format('Y-m-d')."'
                AND
                (
                    (source_type_tagging = 'rest_day_work' AND is_rest_day = 1 )
                        OR
                    dtr_holidays.dtr_id is NULL
                        OR
                    leaves.status != 'approved'
                        OR
                    start_datetime IS NOT NULL
                )
                AND time_in IS NULL
                AND time_out IS NULL
            ")
            ->get()->count();

            $on_leave =  Dtr::leftJoin('leaves', function($join) {
                    $join->on('leaves.dtr_id', '=', 'dtrs.id');
                })->whereIn('user_id', auth()->user()->users_handled()->pluck('id')->toArray() )
            ->whereRaw("
                date >= '".$start_day."' && date <= '".$end_day."' 
                    AND
                leaves.status = 'approved'
            ")
            ->get()->count();

            $team_attendance_summary = [
                "absent" => $absent,
                "on_leave" => $on_leave
            ];
            
            return  $team_attendance_summary;
        } catch (Exception $e) {
            throw $e;
        }
    }


    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################


    //....



}