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
use App\Modules\Department\Models\EvoxDepartment;
use App\Modules\Department\Models\EvoxSubDepartment;
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
            $me = auth()->user();
            $dtr_sets = call_sp('SP_DTR_By_UserId', [$me->id, $start_date, $end_date]);

            $dtr_records = $dtr_sets[0];
            $dtr_leaves = $dtr_sets[3];
            $dtr_requests = $dtr_sets[4];
            return [$dtr_records, $dtr_leaves, $dtr_requests];

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
                                                'department'=> (isset($user->department_id)) ? EvoxSubDepartment::where("Id", $user->department_id)->first()->Name : "" ,
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
                ->select(DB::raw("CONCAT(IF(users.first_name IS NOT NULL,users.first_name,''),' ',IF(users.middle_name IS NOT NULL,users.middle_name,''),' ',IF(users.last_name IS NOT NULL,users.last_name,'')) AS Employee_Name"),'users.emp_num as Employee_Number', DB::raw("sum(drt_summary_report.unpaid_leave) as UL"), DB::raw("sum(drt_summary_report.on_leave) as Leaves"), 
                DB::raw("round(sum(drt_summary_report.reg_late),2) as Late"), DB::raw("round(sum(drt_summary_report.reg_undertime),2) as Under_Time"), 
                DB::raw("round(sum(drt_summary_report.reg_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.reg_rendered_hours_overlapp,0)) -sum(drt_summary_report.reg_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.reg_night_diff_overlapp,0)),2) as Render_Hr"), 
                DB::raw("round(sum(drt_summary_report.reg_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.reg_night_diff_overlapp,0)),2) as Night_Diff"), 
                DB::raw("round(sum(drt_summary_report.reg_overtime),2) as OverTime"), DB::raw("round(sum(drt_summary_report.reg_overtime_night_diff),2) as OT_ND"), 
                DB::raw("round(sum(drt_summary_report.rd_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.rd_rendered_hours_overlapp,0)) - sum(drt_summary_report.rd_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.rd_night_diff_overlapp,0)),2) as RD_Render_HR"), 
                DB::raw("round(sum(drt_summary_report.rd_night_diff + drt_summary_report.rd_night_diff_overlapp),2) as RD_ND"), 
                DB::raw("round(sum(drt_summary_report.rd_overtime),2) as RD_OT"), DB::raw("round(sum(drt_summary_report.rd_overtime_night_diff),2) as RD_OT_ND"), 
                DB::raw("round(sum(drt_summary_report.lh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.lh_rendered_hours_overlapp,0)) -sum(drt_summary_report.lh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.lh_night_diff_overlapp,0)),2) as LH_Render_HR"), 
                DB::raw("round(sum(drt_summary_report.lh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.lh_night_diff_overlapp,0)),2) as LH_ND"),
                DB::raw("round(sum(drt_summary_report.lh_overtime),2) as LH_OT"), DB::raw("round(sum(drt_summary_report.lh_overtime_night_diff),2) as LH_OT_ND"), 
                DB::raw("round(sum(drt_summary_report.sh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.sh_rendered_hours_overlapp,0)) -sum(drt_summary_report.sh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.sh_night_diff_overlapp,0)),2) as SH_Render_Hr"), 
                DB::raw("round(sum(drt_summary_report.sh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.sh_night_diff_overlapp,0)),2) as SH_ND"), 
                DB::raw("round(sum(drt_summary_report.sh_overtime),2) as SH_OT"), DB::raw("round(sum(drt_summary_report.sh_overtime_night_diff),2) as SH_OT_ND"), 
                DB::raw("round(sum(drt_summary_report.dsh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.dsh_rendered_hours_overlapp,0)) -sum(drt_summary_report.dsh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dsh_night_diff_overlapp,0)),2) as DSH_Render_HR"), 
                DB::raw("round(sum(drt_summary_report.dsh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dsh_night_diff_overlapp,0)),2) as DSH_ND"), DB::raw("round(sum(drt_summary_report.dsh_overtime),2) as DSH_OT"), 
                DB::raw("round(sum(drt_summary_report.dsh_overtime_night_diff),2) as DSH_OT_ND"), 
                DB::raw("round(sum(drt_summary_report.dlh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.dlh_rendered_hours_overlapp,0)) -sum(drt_summary_report.dlh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dlh_night_diff_overlapp,0)),2) as DLH_Render_HR"), 
                DB::raw("round(sum(drt_summary_report.dlh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.dlh_night_diff_overlapp,0)),2) as DLH_ND"),
                DB::raw("round(sum(drt_summary_report.dlh_overtime),2) as DLH_OT"), DB::raw("round(sum(drt_summary_report.dlh_overtime_night_diff),2) as DLH_OT_ND"), 
                DB::raw("round(sum(drt_summary_report.slh_rendered_hours + IF(drt_summary_report.render_status=1,drt_summary_report.slh_rendered_hours_overlapp,0)) -sum(drt_summary_report.slh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.slh_night_diff_overlapp,0)),2) as SLH_Render_HR"), 
                DB::raw("round(sum(drt_summary_report.slh_night_diff + IF(drt_summary_report.nigdiff_stauts=1,drt_summary_report.slh_night_diff_overlapp,0)),2) as SLH_ND"), 
                DB::raw("round(sum(drt_summary_report.slh_overtime),2) as SLH_OT"), DB::raw("round(sum(drt_summary_report.slh_overtime_night_diff),2) as SLH_OT_ND"))
                    ->join('users','users.id','=','drt_summary_report.user_id')
                    ->whereBetween('drt_summary_report.login_date', [$start_date, $end_date])
                    ->where('users.id','=',$user->id)->get();
                    $dtr_collection =  $user->dtr($start_date, $end_date)->get();
                    foreach ( $dtr_collection as $dtr ) {
                        $dtr_type = $dtr->getDtrType(True);
                        $this->dtr_summary->column[ $dtr_type ] =  $dtr_type;
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
                                                'department'=> (isset($user->SubDepartmentID)) ?  EvoxSubDepartment::where("Id", $user->SubDepartmentID)->first()->Name : "" ,
                                                'status'=> $user->employment_status,
                                                'timezone'=> $user->country_zone()->country_time_zone,
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

    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################


    //....
}