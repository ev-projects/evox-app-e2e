<?php 

namespace App\Modules\Report\Repositories;

use Exception;
use Carbon\Carbon;
use DebugBar\DebugBar;
use Illuminate\Http\Request;
use App\Modules\Team\Models\Team;
use App\Modules\User\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use App\Modules\Payroll\Models\Dtr;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Database\Eloquent\Model;
use App\Modules\Payroll\Models\DtrSummary;
use App\Modules\Payroll\Models\Computation;
use Illuminate\Database\Eloquent\Collection;
use App\Modules\Department\Models\Department;
use App\Modules\Payroll\Models\PayrollCutoff;
use App\Modules\Payroll\Models\DtrSummaryReport;
use App\Modules\Payroll\Models\TeamAttendanceSummary;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\Report\Repositories\ReportRepositoryInterface;

class ReportRepository implements ReportRepositoryInterface{
    
    protected $user;
    protected $computation;
    protected $dtr_summary;
    protected $team_attendance_summary;

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
                        ->whereRaw("date_hired >= '".$date_from->format("Y-m-d") ."' AND date_hired <= '".$date_to->format("Y-m-d") ."'");
    
            $birthdate->union($anniversary)->union($regularization)->orderByRaw('Month(date),Day(date)')->union($regularization);
    
            return $birthdate->get();

        } catch (Exception $e) {
            throw $e;
        }
    }

    public function get_team_birthday_anniversary_last_twodays(){
        try {

            $user_list = auth()->user()->users_handled();

            if( is_valid( request()->get('department_id') ) ) {
                $user_list->where('department_id', '=', request()->get('department_id'));
            }
    
            $birthdate = User::selectRaw("birthdate as date,first_name,last_name,'birthdate' AS type ")->whereIn('users.id', $user_list->pluck('id')->toArray() )
            ->whereRaw("DATE_FORMAT(birthDate,'%m-%d') BETWEEN DATE_FORMAT(NOW(),'%m-%d') AND DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 6 DAY),'%m-%d')")->whereRaw("is_active = 1");
    
            $anniversary = User::selectRaw("date_hired as date,first_name,last_name,'anniversary' AS type")->whereIn('users.id', $user_list->pluck('id')->toArray() )
                    ->whereRaw("DATE_FORMAT(date_hired,'%m-%d') BETWEEN DATE_FORMAT(NOW(),'%m-%d') AND DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 6 DAY),'%m-%d')")->whereRaw("is_active = 1");;
    
            // $date_from = Carbon::now()->subMonth( get_constant("REGULARIZATION.month_from") );
            // $date_to = Carbon::now()->subMonth( get_constant("REGULARIZATION.month_to") );
    
            // $regularization = User::selectRaw("DATE_ADD(date_hired, INTERVAL 6 MONTH) as date,first_name,last_name,'regularization' AS type ")->whereIn('users.id', $user_list->pluck('id')->toArray() )
            //             ->whereRaw("DATE_FORMAT(date_hired,'%m-%d') BETWEEN DATE_FORMAT(NOW(),'%m-%d') AND DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 6 DAY),'%m-%d')")
            $date_from = Carbon::now()->subMonth( get_constant("REGULARIZATION.month_from") );
            $date_to = Carbon::now()->subMonth( get_constant("REGULARIZATION.month_to") );
            // dump($date_from);
            // dump($date_to);
            $regularization = User::selectRaw("DATE_ADD(date_hired, INTERVAL 6 MONTH) as date,first_name,last_name,'regularization' AS type ")->whereIn('users.id', $user_list->pluck('id')->toArray() )
                        ->whereRaw("date_hired >= '".$date_from->format("Y-m-d") ."' AND date_hired <= '".$date_to->format("Y-m-d") ."' AND DATE_ADD(date_hired, INTERVAL 6 MONTH) <= DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 6 DAY),'%Y-%m-%d')")
                        ->whereRaw("is_active = 1");;
                        // ->whereRaw("DATE_FORMAT(date_hire,'%m-%d') BETWEEN DATE_FORMAT(NOW(),'%m-%d') AND DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 6 DAY),'%m-%d')");
    
            $birthdate->union($anniversary)->union($regularization)->orderByRaw('Month(date),Day(date)');
    
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

            $result = $this->team_attendance_summary->get_summary2( $user_collection, $start_date, $end_date );
            

            // log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [$result], "dtr_summary");
            // log_to_file( 'info', get_constant('LOG_GAP'), [], "dtr_summary");
            return $result;
            
        } catch (Exception $e) {
            throw $e;
        }
    }
     /**
     *  Responsible for fetching all the team attendance summary.
     * @param Carbon $current_time
     * @return array
     */
    public function get_team_attendance_summary_dtr(  Collection $user_collection, string $start_date, string $end_date ){
        try {

            $result = $this->team_attendance_summary->get_summary_dtr( $user_collection, $start_date, $end_date );
            

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
                                                'department'=> (isset($user->department_id)) ? $user->department()->get()[0]->department_name : "" ,
                                                'status'=> $user->employment_status,
                                                'timezone'=> $user->country_zone()->country_time_zone,
                                                
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
    

    public function get_dtr_summary_block( Collection $user_collection, string $start_date, string $end_date ){
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'user_collection' => $user_collection, 'start_date'=> $start_date, 'end_date'=> $end_date], "dtr_summary");
        
        try{
            $user_dtr_summary = [];
            $index = 0;
            foreach( $user_collection as $user ) {
                $result = DB::table('drt_summary_report')
                ->select(DB::raw("CONCAT(IF(users.first_name IS NOT NULL,users.first_name,''),' ',IF(users.middle_name IS NOT NULL,users.middle_name,''),' ',IF(users.last_name IS NOT NULL,users.last_name,'')) AS Employee_Name"),'users.emp_num as Employee_Number', DB::raw("sum(drt_summary_report.unpaid_leave) as UL"), DB::raw("sum(drt_summary_report.on_leave) as Leaves"), DB::raw("sum(drt_summary_report.reg_late) as Late"), DB::raw("sum(drt_summary_report.reg_undertime) as Under_Time"), DB::raw("sum(drt_summary_report.reg_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.reg_rendered_hours_overlapp,0)) -sum(drt_summary_report.reg_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.reg_night_diff_overlapp,0)) as Render_Hr"), DB::raw("sum(drt_summary_report.reg_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.reg_night_diff_overlapp,0)) as Night_Diff"), DB::raw("sum(drt_summary_report.reg_overtime) as OverTime"), DB::raw("sum(drt_summary_report.reg_overtime_night_diff) as OT_ND"), DB::raw("sum(drt_summary_report.rd_rendered_hours + drt_summary_report.rd_rendered_hours_overlapp) as RD_Render_HR"), DB::raw("sum(drt_summary_report.rd_night_diff + drt_summary_report.rd_night_diff_overlapp) as RD_ND"), DB::raw("sum(drt_summary_report.rd_overtime) as RD_OT"), DB::raw("sum(drt_summary_report.rd_overtime_night_diff) as RD_OT_ND"), DB::raw("sum(drt_summary_report.lh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.lh_rendered_hours_overlapp,0)) -sum(drt_summary_report.lh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.lh_night_diff_overlapp,0)) as LH_Render_HR"), DB::raw("sum(drt_summary_report.lh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.lh_night_diff_overlapp,0)) as LH_ND"), DB::raw("sum(drt_summary_report.lh_overtime) as LH_OT"), DB::raw("sum(drt_summary_report.lh_overtime_night_diff) as LH_OT_ND"), DB::raw("sum(drt_summary_report.sh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.sh_rendered_hours_overlapp,0)) -sum(drt_summary_report.sh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.sh_night_diff_overlapp,0)) as SH_Render_Hr"), DB::raw("sum(drt_summary_report.sh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.sh_night_diff_overlapp,0)) as SH_ND"), DB::raw("sum(drt_summary_report.sh_overtime) as SH_OT"), DB::raw("sum(drt_summary_report.sh_overtime_night_diff) as SH_OT_ND"), DB::raw("sum(drt_summary_report.dsh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.dsh_rendered_hours_overlapp,0)) -sum(drt_summary_report.dsh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dsh_night_diff_overlapp,0)) as DSH_Render_HR"), DB::raw("sum(drt_summary_report.dsh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dsh_night_diff_overlapp,0)) as DSH_ND"), DB::raw("sum(drt_summary_report.dsh_overtime) as DSH_OT"), DB::raw("sum(drt_summary_report.dsh_overtime_night_diff) as DSH_OT_ND"), DB::raw("sum(drt_summary_report.dlh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.dlh_rendered_hours_overlapp,0)) -sum(drt_summary_report.dlh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dlh_night_diff_overlapp,0)) as DLH_Render_HR"), DB::raw("sum(drt_summary_report.dlh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dlh_night_diff_overlapp,0)) as DLH_ND"), DB::raw("sum(drt_summary_report.dlh_overtime) as DLH_OT"), DB::raw("sum(drt_summary_report.dlh_overtime_night_diff) as DLH_OT_ND"), DB::raw("sum(drt_summary_report.slh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.slh_rendered_hours_overlapp,0)) -sum(drt_summary_report.slh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.slh_night_diff_overlapp,0)) as SLH_Render_HR"), DB::raw("sum(drt_summary_report.slh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.slh_night_diff_overlapp,0)) as SLH_ND"), DB::raw("sum(drt_summary_report.slh_overtime) as SLH_OT"), DB::raw("sum(drt_summary_report.slh_overtime_night_diff) as SLH_OT_ND"))
                    ->join('users','users.id','=','drt_summary_report.user_id')
                    ->whereBetween('drt_summary_report.login_date', [$start_date, $end_date])
                    ->where('users.id','=',$user->id)->get();
                    $dtr_collection =  $user->dtr($start_date, $end_date)->get();
                    foreach ( $dtr_collection as $dtr ) {
                        $dtr_type = $dtr->getDtrType(True);
                        // dump($dtr_type);
                        $this->dtr_summary->column[ $dtr_type ] =  $dtr_type;
                        // $this->dtr_summary->column[ 'dlh' ] =  'dlh';
                    }
                 
                    $data= [
                        get_constant('DTR_TYPE.regular') =>  [
                            get_constant('PAYROLL_ITEMS.late')                   => $result[0]->Late == null ? '0:00' : $result[0]->Late ,
                            get_constant('PAYROLL_ITEMS.undertime')              => $result[0]->Under_Time == null ? '0:00' : $result[0]->Under_Time,
                            get_constant('PAYROLL_ITEMS.rendered_hours')         => $result[0]->Render_Hr == null ? '0:00' : $result[0]->Render_Hr,
                            get_constant('PAYROLL_ITEMS.night_diff')             => $result[0]->Night_Diff == null ? '0:00' : $result[0]->Night_Diff,
                            get_constant('PAYROLL_ITEMS.overtime')               => $result[0]->OverTime == null ? '0:00' : $result[0]->OverTime ,
                            get_constant('PAYROLL_ITEMS.overtime_night_diff')    => $result[0]->OT_ND == null ? '0:00' : $result[0]->OT_ND,
                            get_constant('PAYROLL_ITEMS.on_leave')               => $result[0]->Leaves == null ? '0:00' : $result[0]->Leaves,
                            get_constant('PAYROLL_ITEMS.unpaid_leave')           => $result[0]->UL == null ? '0:00' : $result[0]->UL,
                        ], 
                        get_constant('DTR_TYPE.rest_day') =>  [
                            get_constant('PAYROLL_ITEMS.rendered_hours')         => $result[0]->RD_Render_HR == null ? '0:00' : $result[0]->RD_Render_HR,
                            get_constant('PAYROLL_ITEMS.night_diff')             => $result[0]->RD_ND == null ? '0:00' : $result[0]->RD_ND,
                            get_constant('PAYROLL_ITEMS.overtime')               => $result[0]->RD_OT == null ? '0:00' : $result[0]->RD_OT,
                            get_constant('PAYROLL_ITEMS.overtime_night_diff')    => $result[0]->RD_OT_ND == null ? '0:00' : $result[0]->RD_OT_ND,
                        ],
                        get_constant('DTR_TYPE.holiday.legal') =>  [
                            get_constant('PAYROLL_ITEMS.rendered_hours')         => $result[0]->LH_Render_HR == null ? '0:00' : $result[0]->LH_Render_HR,
                            get_constant('PAYROLL_ITEMS.night_diff')             => $result[0]->LH_ND == null ? '0:00' : $result[0]->LH_ND,
                            get_constant('PAYROLL_ITEMS.overtime')               => $result[0]->LH_OT == null ? '0:00' : $result[0]->LH_OT,
                            get_constant('PAYROLL_ITEMS.overtime_night_diff')    => $result[0]->LH_OT_ND == null ? '0:00' : $result[0]->LH_OT_ND,
                        ],
                        get_constant('DTR_TYPE.holiday.special') =>  [
                            get_constant('PAYROLL_ITEMS.rendered_hours')         => $result[0]->SH_Render_Hr == null ? '0:00' : $result[0]->SH_Render_Hr,
                            get_constant('PAYROLL_ITEMS.night_diff')             => $result[0]->SH_ND == null ? '0:00' : $result[0]->SH_ND,
                            get_constant('PAYROLL_ITEMS.overtime')               => $result[0]->SH_OT == null ? '0:00' : $result[0]->SH_OT,
                            get_constant('PAYROLL_ITEMS.overtime_night_diff')    => $result[0]->SH_OT_ND == null ? '0:00' : $result[0]->SH_OT_ND,
                        ],
                        get_constant('DTR_TYPE.holiday.double_legal') =>  [
                            get_constant('PAYROLL_ITEMS.rendered_hours')         => $result[0]->DSH_Render_HR == null ? '0:00' : $result[0]->DSH_Render_HR,
                            get_constant('PAYROLL_ITEMS.night_diff')             => $result[0]->DSH_ND == null ? '0:00' : $result[0]->DSH_ND,
                            get_constant('PAYROLL_ITEMS.overtime')               => $result[0]->DSH_OT == null ? '0:00' : $result[0]->DSH_OT,
                            get_constant('PAYROLL_ITEMS.overtime_night_diff')    => $result[0]->DSH_OT_ND == null ? '0:00' : $result[0]->DSH_OT_ND,
                        ],
                        get_constant('DTR_TYPE.holiday.double_special') =>  [
                            get_constant('PAYROLL_ITEMS.rendered_hours')         => $result[0]->DLH_Render_HR == null ? '0:00' : $result[0]->DLH_Render_HR,
                            get_constant('PAYROLL_ITEMS.night_diff')             => $result[0]->DLH_ND == null ? '0:00' : $result[0]->DLH_ND,
                            get_constant('PAYROLL_ITEMS.overtime')               => $result[0]->DLH_OT == null ? '0:00' : $result[0]->DLH_OT,
                            get_constant('PAYROLL_ITEMS.overtime_night_diff')    => $result[0]->DLH_OT_ND == null ? '0:00' : $result[0]->DLH_OT_ND,
                        ],
                        get_constant('DTR_TYPE.holiday.special_legal') =>  [
                            get_constant('PAYROLL_ITEMS.rendered_hours')         => $result[0]->SLH_Render_HR == null ? '0:00' : $result[0]->SLH_Render_HR,
                            get_constant('PAYROLL_ITEMS.night_diff')             => $result[0]->SLH_ND == null ? '0:00' : $result[0]->SLH_ND,
                            get_constant('PAYROLL_ITEMS.overtime')               => $result[0]->SLH_OT == null ? '0:00' : $result[0]->SLH_OT,
                            get_constant('PAYROLL_ITEMS.overtime_night_diff')    => $result[0]->SLH_OT_ND == null ? '0:00' : $result[0]->SLH_OT_ND,
                        ]
                    ];
                    
                $user_dtr_summary[$index] = array(
                    'employee_info' => array(   
                                                'employee_id'=> $user->emp_num,
                                                'name'=> $user->first_name .' '. $user->last_name,
                                                'department'=> (isset($user->department_id)) ? $user->department()->get()[0]->department_name : "" ,
                                                'status'=> $user->employment_status,
                                                
                                            ), 
                    'summary' =>  $data
                );
                $index++;
            }
            unset( $this->dtr_summary->column[  get_constant('DTR_TYPE.regular') ] );
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


    public function getDetailsOfSummary($data){

        $team_attendance_summary = [];

        foreach ( $data as $dtr) {
            $status = '';
            $schedule = array();
            $has_holiday = false;
            $has_leave = false;
            $has_rest_day_work = false;

            // If DTR has holidays, tick the has_holiday flag
            if( $dtr->holidays()->get()->count() > 0 ){
                $status = 'Holiday';
                $has_holiday = true;
            }

            $leave = $dtr->leaves()->first();

            // If DTR has valid leave, tick the has_leave flag
            if( is_valid( $leave ) && $leave->isApproved() && $leave->amount > 0){
                $status = $dtr->leaves()->get()->first()->type;
                $has_leave = true;
            }

            // If DTR is rest day and has rest day work, tick the has_rest_day_Work flag
            if( $dtr->isRestDay() && $dtr->source_type_tagging == get_constant('DTR_SOURCE_TYPE_TAGGING.rest_day_work')){
                $status = 'Rest Day Work';
                $has_rest_day_work = true;
            }

            # If There is No Rest Day, Holiday and Leave, check status
            if( !$has_rest_day_work && !$has_holiday && !$has_leave ){

                # Check if there is a schedule for the DTR
                if( $dtr->hasSchedule() ){

                    // If DTR has Log, set status as Present
                    if( $dtr->hasValidTimelogs() ){
                        $status = 'Present';

                    // else, set status as Absent
                    }else {
                        $status = 'Absent';

                        // if inside sched = absent
                        if($dtr->checkCurrentTime()){
                            $status = 'Absent';
                        }else {
                            $status = 'Not yet started';
                        }
                    }

                // If the DTR is Rest Day, set status as Rest Day
                }elseif($dtr->isRestDay()){
                    $status = 'Rest Day';

                // else, set as No Schedule
                }else{
                    $status = 'No Schedule';
                }

            }

            // Fetch User of the DTR
             $user = $dtr->user()->first();

            // Assemble the array details for the Team Attendance Summary
            array_push( $team_attendance_summary,
            [
                "date" => $dtr->date,
                "user_id" => $user->id,
                "name" => $user->getFullName( 2 ) ,
                "job_title" =>  $user->job_title,
                "department" =>  $user->department->department_name,
                "status" => $status
            ]);

       }

        return $team_attendance_summary;
    }

    public function get_dtr_summary_new(Request $request){
        try {  
            $user_collection_paginated = [];
            $result = DB::table('drt_summary_report')
            ->select(DB::raw("CONCAT(IF(users.first_name IS NOT NULL,users.first_name,''),IF(users.middle_name IS NOT NULL,users.middle_name,''),IF(users.last_name IS NOT NULL,users.last_name,'')) AS EmployeeName"),'users.emp_num','users.email','users.username', DB::raw("sum(drt_summary_report.unpaid_leave) as ul"), DB::raw("sum(drt_summary_report.on_leave) as vl_sl"), DB::raw("sum(drt_summary_report.reg_late) as reg_late"), DB::raw("sum(drt_summary_report.reg_undertime) as reg_under_time"), DB::raw("sum(drt_summary_report.reg_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.reg_rendered_hours_overlapp,0)) -sum(drt_summary_report.reg_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.reg_night_diff_overlapp,0)) as reg_rendered_hr"), DB::raw("sum(drt_summary_report.reg_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.reg_night_diff_overlapp,0)) as reg_night_dif"), DB::raw("sum(drt_summary_report.reg_overtime) as reg_over_time"), DB::raw("sum(drt_summary_report.reg_overtime_night_diff) as reg_over_night_dif"), DB::raw("sum(drt_summary_report.rd_rendered_hours + drt_summary_report.rd_rendered_hours_overlapp) as rd_rendered_hr"), DB::raw("sum(drt_summary_report.rd_night_diff + drt_summary_report.rd_night_diff_overlapp) as rd_night_dif"), DB::raw("sum(drt_summary_report.rd_overtime) as rd_over_time"), DB::raw("sum(drt_summary_report.rd_overtime_night_diff) as rd_over_night_dif"), DB::raw("sum(drt_summary_report.lh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.lh_rendered_hours_overlapp,0)) -sum(drt_summary_report.lh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.lh_night_diff_overlapp,0)) as lh_rendered_hr"), DB::raw("sum(drt_summary_report.lh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.lh_night_diff_overlapp,0)) as lh_night_dif"), DB::raw("sum(drt_summary_report.lh_overtime) as lh_over_time"), DB::raw("sum(drt_summary_report.lh_overtime_night_diff) as lh_over_night_dif"), DB::raw("sum(drt_summary_report.sh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.sh_rendered_hours_overlapp,0)) -sum(drt_summary_report.sh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.sh_night_diff_overlapp,0)) as sh_rendered_hr"), DB::raw("sum(drt_summary_report.sh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.sh_night_diff_overlapp,0)) as sh_night_dif"), DB::raw("sum(drt_summary_report.sh_overtime) as sh_over_time"), DB::raw("sum(drt_summary_report.sh_overtime_night_diff) as sh_over_night_dif"), DB::raw("sum(drt_summary_report.dsh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.dsh_rendered_hours_overlapp,0)) -sum(drt_summary_report.dsh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dsh_night_diff_overlapp,0)) as dsh_rendered_hr"), DB::raw("sum(drt_summary_report.dsh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dsh_night_diff_overlapp,0)) as dsh_night_dif"), DB::raw("sum(drt_summary_report.dsh_overtime) as dsh_over_time"), DB::raw("sum(drt_summary_report.dsh_overtime_night_diff) as dsh_over_night_dif"), DB::raw("sum(drt_summary_report.dlh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.dlh_rendered_hours_overlapp,0)) -sum(drt_summary_report.dlh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dlh_night_diff_overlapp,0)) as dlh_rendered_hr"), DB::raw("sum(drt_summary_report.dlh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dlh_night_diff_overlapp,0)) as dlh_night_dif"), DB::raw("sum(drt_summary_report.dlh_overtime) as dlh_over_time"), DB::raw("sum(drt_summary_report.dlh_overtime_night_diff) as dlh_over_night_dif"), DB::raw("sum(drt_summary_report.slh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.slh_rendered_hours_overlapp,0)) -sum(drt_summary_report.slh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.slh_night_diff_overlapp,0)) as slh_rendered_hr"), DB::raw("sum(drt_summary_report.slh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.slh_night_diff_overlapp,0)) as slh_night_dif"), DB::raw("sum(drt_summary_report.slh_overtime) as slh_over_time"), DB::raw("sum(drt_summary_report.slh_overtime_night_diff) as slh_over_night_dif"))
            ->join('users','users.id','=','drt_summary_report.user_id')
            ->join('users_supervisors','users_supervisors.user_id','=','drt_summary_report.user_id')
            ->join('departments', 'users.department_id', '=', 'departments.id');
            if( is_valid( $request->department_id ) ){
               $result->where('users_supervisors.supervisor_id','=',$request->sup_id);
            }
            $result->whereBetween('drt_summary_report.login_date', [$request->valid_from, $request->valid_to]);
            
             
            
           if( is_valid( $request->department_id ) ){
               $result->where('users.department_id','=' ,$request->department_id );
           } else {
               $result->whereRaw('users.department_id IS NOT NULL');
           }

           if( is_valid( $request->name ) ){
               $result->whereRaw('(first_name like ? OR middle_name like ? OR last_name like ?)', array('%'.trim( $request->name ).'%', '%'.trim( $request->name ).'%', '%'.trim( $request->name ).'%' ));
           }
          $result->whereRaw('(is_active = ' . (is_valid($request->is_active) ? $request->is_active : '1') .' or termination_date BETWEEN "'. $request->valid_from .'" AND "'. $request->valid_to .'")')
           ->groupBy('users.first_name','users.middle_name','users.last_name','users.emp_num','users.email','users.username','users.id');
           if (is_valid($request->page)) {
               $result1= $result->orderBy('departments.department_name')->orderby('users.date_hired', 'DESC')->orderBy('users.last_name', 'asc')->orderBy('users.first_name', 'asc')->paginate(100);
           }else{
               $result1= $result->orderBy('departments.department_name')->orderby('users.date_hired', 'DESC')->orderBy('users.last_name', 'asc')->orderBy('users.first_name', 'asc');
           }


           
           return $result;
        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        }
        
    }

    //reignalds version
    public function get_dtr_summary_new2(Collection $user_collection, string $start_date, string $end_date){
        try {  
            $user_collection_paginated = [];
            $result = 
            // DB::table('drt_summary_report')
            DtrSummaryReport::whereIn('user_id', $user_collection->pluck('id')->toArray())
                ->select(
                    DB::raw("CONCAT(IF(users.first_name IS NOT NULL,users.first_name,''),
                                                IF(users.middle_name IS NOT NULL,users.middle_name,''),
                                                IF(users.last_name IS NOT NULL,users.last_name,'')) 
                                                AS EmployeeName"),
                    'users.emp_num',
                    'users.email',
                    'users.username',
                    DB::raw("sum(drt_summary_report.unpaid_leave) as ul"),
                    DB::raw("sum(drt_summary_report.on_leave) as vl_sl"),
                    DB::raw("sum(drt_summary_report.reg_late) as reg_late"),
                    DB::raw("sum(drt_summary_report.reg_undertime) as reg_under_time"),
                    DB::raw("sum(drt_summary_report.reg_rendered_hours 
                                                            + IF(drt_summary_report.render_status=1,drt_summary_report.reg_rendered_hours_overlapp,0)) 
                                                            -sum(drt_summary_report.reg_night_diff + 
                                                            IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.reg_night_diff_overlapp,0)) as reg_rendered_hr"),
                    DB::raw("sum(drt_summary_report.reg_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.reg_night_diff_overlapp,0)) as reg_night_dif"),
                    DB::raw("sum(drt_summary_report.reg_overtime) as reg_over_time"),
                    DB::raw("sum(drt_summary_report.reg_overtime_night_diff) as reg_over_night_dif"),
                    DB::raw("sum(drt_summary_report.rd_rendered_hours + drt_summary_report.rd_rendered_hours_overlapp) as rd_rendered_hr"),
                    DB::raw("sum(drt_summary_report.rd_night_diff + drt_summary_report.rd_night_diff_overlapp) as rd_night_dif"),
                    DB::raw("sum(drt_summary_report.rd_overtime) as rd_over_time"),
                    DB::raw("sum(drt_summary_report.rd_overtime_night_diff) as rd_over_night_dif"),
                    DB::raw("sum(drt_summary_report.lh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.lh_rendered_hours_overlapp,0)) 
                                                            -sum(drt_summary_report.lh_night_diff 
                                                            + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.lh_night_diff_overlapp,0)) as lh_rendered_hr"),
                    DB::raw("sum(drt_summary_report.lh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.lh_night_diff_overlapp,0)) as lh_night_dif"),
                    DB::raw("sum(drt_summary_report.lh_overtime) as lh_over_time"),
                    DB::raw("sum(drt_summary_report.lh_overtime_night_diff) as lh_over_night_dif"),
                    DB::raw("sum(drt_summary_report.sh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.sh_rendered_hours_overlapp,0)) 
                                                            -sum(drt_summary_report.sh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.sh_night_diff_overlapp,0)) as sh_rendered_hr"),
                    DB::raw("sum(drt_summary_report.sh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.sh_night_diff_overlapp,0)) as sh_night_dif"),
                    DB::raw("sum(drt_summary_report.sh_overtime) as sh_over_time"),
                    DB::raw("sum(drt_summary_report.sh_overtime_night_diff) as sh_over_night_dif"),
                    DB::raw("sum(drt_summary_report.dsh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.dsh_rendered_hours_overlapp,0)) 
                                                            -sum(drt_summary_report.dsh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dsh_night_diff_overlapp,0)) as dsh_rendered_hr"),
                    DB::raw("sum(drt_summary_report.dsh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dsh_night_diff_overlapp,0)) as dsh_night_dif"),
                    DB::raw("sum(drt_summary_report.dsh_overtime) as dsh_over_time"),
                    DB::raw("sum(drt_summary_report.dsh_overtime_night_diff) as dsh_over_night_dif"),
                    DB::raw("sum(drt_summary_report.dlh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.dlh_rendered_hours_overlapp,0)) 
                                                            -sum(drt_summary_report.dlh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dlh_night_diff_overlapp,0)) as dlh_rendered_hr"),
                    DB::raw("sum(drt_summary_report.dlh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dlh_night_diff_overlapp,0)) as dlh_night_dif"),
                    DB::raw("sum(drt_summary_report.dlh_overtime) as dlh_over_time"),
                    DB::raw("sum(drt_summary_report.dlh_overtime_night_diff) as dlh_over_night_dif"),
                    DB::raw("sum(drt_summary_report.slh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.slh_rendered_hours_overlapp,0)) 
                                                            -sum(drt_summary_report.slh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.slh_night_diff_overlapp,0)) as slh_rendered_hr"),
                    DB::raw("sum(drt_summary_report.slh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.slh_night_diff_overlapp,0)) as slh_night_dif"),
                    DB::raw("sum(drt_summary_report.slh_overtime) as slh_over_time"),
                    DB::raw("sum(drt_summary_report.slh_overtime_night_diff) as slh_over_night_dif")
                )

                ->whereIn('user_id', $user_collection->pluck('id')->toArray()) // NEW

                ->join('users', 'users.id', '=', 'drt_summary_report.user_id')
                ->join('users_supervisors', 'users_supervisors.user_id', '=', 'drt_summary_report.user_id')
                ->join('departments', 'users.department_id', '=', 'departments.id');
            // if (is_valid($request->department_id)) {
            //     if (is_valid($request->sup_id)) {
            //         $result->where('users_supervisors.supervisor_id', '=', $request->sup_id);
            //     }
            // }

            //$result->whereBetween('drt_summary_report.login_date', [$request->valid_from, $request->valid_to]);
            $result->whereBetween('drt_summary_report.login_date', [$start_date,  $end_date]); // note to self, is this 00:00 start and 59:59 end? 
        
        
        
            // if (is_valid($request->department_id)) {
            //     $result->where('users.department_id', '=', $request->department_id);
            // } else {
            //     $result->whereRaw('users.department_id IS NOT NULL');
            // }
        
            // if (is_valid($request->name)) {
            //     $result->whereRaw('(first_name like ? OR middle_name like ? OR last_name like ?)', array('%' . trim($request->name) . '%', '%' . trim($request->name) . '%', '%' . trim($request->name) . '%'));
            // }
            $result
            // ->whereRaw('(is_active = ' . (is_valid($request->is_active) ? $request->is_active : '1') . ' or termination_date BETWEEN "' . $request->valid_from . '" AND "' . $request->valid_to . '")')
                ->groupBy('users.first_name', 'users.middle_name', 'users.last_name', 'users.emp_num', 'users.email', 'users.username', 'users.id');
            


            return $result;

        } catch (Exception $e) {
            return error_response(trans('messages.error_default'), $e);
        }
        
    }



    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################


    //....



}