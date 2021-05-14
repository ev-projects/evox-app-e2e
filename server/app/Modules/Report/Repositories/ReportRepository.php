<?php 

namespace App\Modules\Report\Repositories;

use App\Modules\Department\Models\Department;
use App\Modules\Payroll\Models\Computation;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\DtrSummary;
use App\Modules\Payroll\Models\PayrollCutoff;
use App\Modules\Payroll\Models\TeamAttendanceSummary;
use App\Modules\Report\Repositories\ReportRepositoryInterface;
use App\Modules\Team\Models\Team;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\UserRepositoryInterface;
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

class ReportRepository implements ReportRepositoryInterface{
    
    protected $user;

    function __construct(UserRepositoryInterface $user){
        $this->user = $user;
        $this->computation = new Computation();
        $this->dtr_summary = new DtrSummary();
        $this->team_attendance_summary = new TeamAttendanceSummary();
    }

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
    public function get_team_attendance_summary(  Collection $user_collection, string $start_date, string $end_date ){
        try {

            $result = $this->team_attendance_summary->get_summary( $user_collection, $start_date, $end_date );

            // log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [$result], "dtr_summary");
            // log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr_summary");
            return $result;
            
        } catch (Exception $e) {
            throw $e;
        }
    }


    
    

    /**
     *  Responsible for Computing the DTR Payroll Items Summary base from the User Collection and the Date Range.
     * @param Collection $user_collection
     * @param string $start_date
     * @param string $end_date
     * @return array
     */
    public function get_dtr_summary( Collection $user_collection, string $start_date, string $end_date ){
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'user_collection' => $user_collection, 'start_date'=> $start_date, 'end_date'=> $end_date], "dtr_summary");
        
        try{
            $user_dtr_summary = [];
            $index = 0;
            foreach( $user_collection as $user ) {

                $user_dtr_summary[$index] = array(
                    'employee_info' => array(   
                                                'employee_id'=> $user->emp_num,
                                                'name'=> $user->first_name .' '. $user->last_name,
                                                'department'=> $user->department()->get()[0]->department_name  
                                            ), 
                    'summary' => $this->dtr_summary->get_summary( $user->dtr($start_date, $end_date)->get() )
                );
                $index++;
            }

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [$user_dtr_summary], "dtr_summary");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr_summary");
            $result = array(
                                'summary' => $user_dtr_summary,
                                'column' =>  $this->dtr_summary->column
            );
            
            return $result;
        } catch (Exception $e) {
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "dtr_summary");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr_summary");
            throw $e;
        }
    }
    


    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################


    //....



}