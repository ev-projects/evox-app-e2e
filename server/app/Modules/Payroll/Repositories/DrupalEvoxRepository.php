<?php 

namespace App\Modules\Payroll\Repositories;

use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\PayrollCutoff;
use App\Modules\Request\Resources\AlterLogResource;

use App\Modules\User\Models\User;
use Exception;

use Illuminate\Database\Eloquent\Model;

use App\Modules\Payroll\Repositories\DtrRepository;
use App\Modules\Payroll\Resources\PayrollCutoffResource;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DrupalEvoxRepository implements DrupalEvoxRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    public function __construct(){

    }


    
    /**
     *  Responsible for fetching the DTR data from the Drupal Evox
     * 
     * @param $start_datetime;
     * @param $end_datetime;
     * @param $emp_num_array (Optional);
     * 
     * @return array $result;
     */
    public function get_dtr( $start_datetime, $end_datetime, $emp_num_array = [] )
    {
        try {
            $query = "
                SELECT 
                    A.nid,
                    A.title as 'emp_num',
                    DATE_FORMAT(FROM_UNIXTIME( date.field_date_value ), \"%Y-%m-%d\") as 'date',
                    on_duty.field_on_duty_value as 'start_datetime',
                    flexy_start.field_flexy_start_value as 'start_flexy_datetime',
                    off_duty.field_off_duty_value as 'end_datetime',
                    flexy_end.field_flexy_end_value as 'end_flexy_datetime',

                    COALESCE(break_time.field_break_time_value, 0) as 'break_time',
                    clock_in.field_clock_in_value  as 'time_in',
                    clock_out.field_clock_out_value  as 'time_out',

                    COALESCE(rest_day.field_rest_day_value, 0) as 'is_rest_day',

                    COALESCE(allow_late.field_allow_late_value, 1) as 'allow_late',
                    COALESCE(allow_nd.field_allow_nd_value, 1) as 'allow_night_diff',
                    COALESCE(allow_undertime.field_allow_undertime_value, 1) as 'allow_undertime'
                FROM
                    node AS A
                    LEFT JOIN field_data_field_date as date ON A.nid = date.entity_id
                    LEFT JOIN field_data_field_on_duty as on_duty ON A.nid = on_duty.entity_id
                    LEFT JOIN field_data_field_flexy_start as flexy_start ON A.nid = flexy_start.entity_id
                    LEFT JOIN field_data_field_off_duty as off_duty ON A.nid = off_duty.entity_id
                    LEFT JOIN field_data_field_flexy_end as flexy_end ON A.nid = flexy_end.entity_id
                    
                    LEFT JOIN field_data_field_break_time as break_time ON A.nid = break_time.entity_id
                    
                    LEFT JOIN field_data_field_clock_in as clock_in ON A.nid = clock_in.entity_id
                    LEFT JOIN field_data_field_clock_out as clock_out ON A.nid = clock_out.entity_id
                    
                    LEFT JOIN field_data_field_rest_day as rest_day ON A.nid = rest_day.entity_id
                    
                    LEFT JOIN field_data_field_allow_late as allow_late ON A.nid = allow_late.entity_id
                    LEFT JOIN field_data_field_allow_nd as allow_nd ON A.nid = allow_nd.entity_id
                    LEFT JOIN field_data_field_allow_undertime as allow_undertime ON A.nid = allow_undertime.entity_id
                WHERE
                    A.type = 'daily_time_record'
                    AND (FROM_UNIXTIME( date.field_date_value ) >= '".$start_datetime."'  AND FROM_UNIXTIME( date.field_date_value ) <= '".$end_datetime."')
                    ". ((count($emp_num_array) > 0)? "AND A.title IN (".implode( ',', $emp_num_array) .")" : "") ."
                GROUP BY A.nid
                ORDER BY date.field_date_value ASC, A.title ASC;";
            
            $result = DB::connection('drupal_payroll')->select($query, [1]);
            

            log_to_file('info', 'Success', [$result]);
            return $result;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for fetching the Alter Log data from the Drupal Evox
     * 
     * @param $start_datetime;
     * @param $end_datetime;
     * @param $emp_num_array (Optional);
     * 
     * @return array $result;
     */
    public function get_alter_log( $start_datetime, $end_datetime, $emp_num_array = [] )
    {
        try {
            $result = DB::connection('drupal_portal')->select("
                SELECT 
                    A.nid,
                    employee_num.field_empnum_value as 'employee_number',
                    DATE_FORMAT(FROM_UNIXTIME( alter_log_date.field_date_to_alter_value), '%Y-%m-%d')  as 'date',
                    new_timein.field_time_in_value as 'new_time_in',
                    new_timeout.field_time_out_value as 'new_time_out',
                    old_time_in.field_old_time_in_value as 'old_time_in',
                    old_time_out.field_old_time_out_value as 'old_time_out',
                    employee_note.field_employee_note_value   as 'employee_note',
                    supervisor_note.field_supervisor_note_value as 'supervisor_note',
                    CASE 
                        WHEN request_status.field_status_value = 'approved' THEN 'approved'
                        WHEN request_status.field_status_value = 'denied' THEN 'declined'
                        WHEN request_status.field_status_value = 'cancel' THEN 'canceled'
                        WHEN request_status.field_status_value = 'pending' THEN 'pending'
                    END as status,
                    DATE_FORMAT(FROM_UNIXTIME( A.created ), '%Y-%m-%d %H:%i:%s')as 'date_created',
                    DATE_FORMAT(FROM_UNIXTIME( A.changed ), '%Y-%m-%d %H:%i:%s') as 'date_updated'
                    
                FROM
                    node AS A
                    LEFT JOIN field_data_field_date_to_alter as alter_log_date					ON A.nid = alter_log_date.entity_id
                    LEFT JOIN field_data_field_empnum as employee_num					        ON A.nid = employee_num.entity_id
                    LEFT JOIN field_data_field_request_type as request_type                     ON A.nid = request_type.entity_id
                    LEFT JOIN field_data_field_time_in as new_timein                            ON A.nid = new_timein.entity_id
                    LEFT JOIN field_data_field_time_out as new_timeout                          ON A.nid = new_timeout.entity_id
                    LEFT JOIN field_data_field_employee_note as employee_note                   ON A.nid = employee_note.entity_id
                    LEFT JOIN field_data_field_supervisor_note as supervisor_note   			ON A.nid = supervisor_note.entity_id
                    LEFT JOIN field_data_field_old_time_in as old_time_in   					ON A.nid = old_time_in.entity_id
                    LEFT JOIN field_data_field_old_time_out as old_time_out   					ON A.nid = old_time_out.entity_id
                    LEFT JOIN field_data_field_status as request_status   						ON A.nid = request_status.entity_id
                WHERE
                    request_type.field_request_type_tid = 509 AND
                    employee_num.field_empnum_value IS NOT NULL AND 
                    (FROM_UNIXTIME( A.changed ) >=  '".$start_datetime."'  AND FROM_UNIXTIME( A.changed ) <=  '".$end_datetime."')
                    ". ((count($emp_num_array) > 0)? "AND A.title IN (".implode( ',', $emp_num_array) .")" : "") ."
            ", [1]);

            log_to_file('info', 'Success', [$result]);
            return $result;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for fetching the Rest Day Work from the Drupal Evox
     * 
     * @param $start_datetime;
     * @param $end_datetime;
     * @param $emp_num_array (Optional);
     * 
     * @return array $result;
     */
    public function get_rest_day_work( $start_datetime, $end_datetime, $emp_num_array = [] )
    {
 
        try {
            $result = DB::connection('drupal_portal')->select("
            SELECT 
            A.nid,
            employee_num.field_empnum_value as 'employee_number',
            DATE_FORMAT(FROM_UNIXTIME( rest_day_work_date.field_date_to_alter_value), '%Y-%m-%d')as 'date',
            on_duty.field_rdw_on_duty_schedule_value as 'on_duty',
            off_duty.field_rdw_off_duty_schedule_value as 'off_duty',
            employee_note.field_employee_note_value   as 'employee_note',
            supervisor_note.field_supervisor_note_value as 'supervisor_note',
            CASE 
                WHEN request_status.field_status_value = 'approved' THEN 'approved'
                WHEN request_status.field_status_value = 'denied' THEN 'declined'
                WHEN request_status.field_status_value = 'cancel' THEN 'canceled'
                WHEN request_status.field_status_value = 'pending' THEN 'pending'
            END as status,
            DATE_FORMAT(FROM_UNIXTIME( A.created ), '%Y-%m-%d %H:%i:%s')as 'date_created',
            DATE_FORMAT(FROM_UNIXTIME( A.changed ), '%Y-%m-%d %H:%i:%s') as 'date_updated'
            
        FROM
            node AS A
            LEFT JOIN field_data_field_date_to_alter as rest_day_work_date	ON A.nid = rest_day_work_date.entity_id
            LEFT JOIN field_data_field_empnum as employee_num				ON A.nid = employee_num.entity_id
            LEFT JOIN field_data_field_request_type as request_type         ON A.nid = request_type.entity_id
            LEFT JOIN field_data_field_rdw_on_duty_schedule as on_duty      ON A.nid = on_duty.entity_id
            LEFT JOIN field_data_field_rdw_off_duty_schedule as off_duty    ON A.nid = off_duty.entity_id
            LEFT JOIN field_data_field_employee_note as employee_note       ON A.nid = employee_note.entity_id
            LEFT JOIN field_data_field_supervisor_note as supervisor_note   ON A.nid = supervisor_note.entity_id
            LEFT JOIN field_data_field_status as request_status   			ON A.nid = request_status.entity_id
        WHERE
            request_type.field_request_type_tid = 598 AND
            employee_num.field_empnum_value IS NOT NULL AND 
            (FROM_UNIXTIME( A.changed ) >=  '".$start_datetime."'   AND FROM_UNIXTIME( A.changed ) <=  '".$end_datetime."')
            ". ((count($emp_num_array) > 0)? "AND A.title IN (".implode( ',', $emp_num_array) .")" : "") ."
            ", [1]);
            log_to_file('info', 'Success', [$result]);
            return $result;
        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for fetching the Change Scbedule from the Drupal Evox
     * 
     * @param $start_datetime;
     * @param $end_datetime;
     * @param $emp_num_array (Optional);
     * 
     * @return array $result;
     */
    public function get_change_schedule( $start_datetime, $end_datetime, $emp_num_array = [] )
    {
        # Get the week days
        $days = get_constant('DAYS');

        $query_tables = Array(); 
        $query_column = Array(); 
        foreach($days as $value) {
            array_push($query_column, "DATE_FORMAT(FROM_UNIXTIME(" . $value . "_on_duty.field_c_".$value."_on_duty_value),'%H:%i') as " . $value . "_on_duty" );
            array_push($query_column, "DATE_FORMAT(FROM_UNIXTIME(" . $value . "_off_duty.field_c_".$value."_off_duty_value),'%H:%i') as " . $value . "_off_duty");
            array_push($query_column, "DATE_FORMAT(FROM_UNIXTIME(" . $value . "_break_time.field_c_".$value."_break_time_value),'%H:%i') as " . $value . "_break_time");
            array_push($query_column, "DATE_FORMAT(FROM_UNIXTIME(" . $value . "_flexy_start.field_c_".$value."_flexy_start_value),'%H:%i') as " . $value . "_flexy_start");
            array_push($query_column, "DATE_FORMAT(FROM_UNIXTIME(" . $value . "_flexy_end.field_c_".$value."_flexy_end_value),'%H:%i') as " . $value . "_flexy_end");

            array_push($query_tables, "LEFT JOIN field_data_field_c_" .$value . "_on_duty  as "  .$value . "_on_duty  ON A.nid = " .$value . "_on_duty.entity_id " );
            array_push($query_tables, "LEFT JOIN field_data_field_c_" .$value . "_off_duty as "  .$value . "_off_duty  ON A.nid = " .$value . "_off_duty.entity_id" );
            array_push($query_tables, "LEFT JOIN field_data_field_c_" .$value . "_break_time as " .$value . "_break_time  ON A.nid = " .$value . "_break_time.entity_id");
            array_push($query_tables, "LEFT JOIN field_data_field_c_" .$value . "_flexy_start as "  .$value . "_flexy_start  ON A.nid = " .$value . "_flexy_start.entity_id" );
            array_push($query_tables, "LEFT JOIN field_data_field_c_" .$value . "_flexy_end as " .$value . "_flexy_end ON A.nid  = " .$value . "_flexy_end.entity_id");
        }
   
        try {
            $result = DB::connection('drupal_portal')->select(
                "SELECT 
                    A.nid,
                    late_item.field_payroll_items_value as late,
                    undertime_item.field_payroll_items_value as undertime,
                    nightdiff_item.field_payroll_items_value as nightdiff,
                    GROUP_CONCAT(DISTINCT(work_days.field_work_days_value)) as work_days,
                    DATE_FORMAT(FROM_UNIXTIME(valid_from.field_sched_valid_from_value),'%Y-%m-%d') as valid_from,
                    DATE_FORMAT(FROM_UNIXTIME(valid_to.field_sched_valid_to_value),'%Y-%m-%d') as valid_to,
                    emp_number.field_employee_number_value as employee_number,
                    CASE 
                        WHEN status.field_status_value = 'approved' THEN 'approved'
                        WHEN status.field_status_value = 'denied' THEN 'declined'
                        WHEN status.field_status_value = 'cancel' THEN 'canceled'
                        WHEN status.field_status_value = 'pending' THEN 'pending'
                    END as status,
                    DATE_FORMAT(FROM_UNIXTIME( A.created ), '%Y-%m-%d %H:%i:%s')as 'date_created',
                    DATE_FORMAT(FROM_UNIXTIME( A.changed ), '%Y-%m-%d %H:%i:%s') as 'date_updated',
                    note.field_note_value as 'note',
                    ".implode(",\n",$query_column)."
                FROM
                    node AS A
                    LEFT JOIN field_data_field_request_type as request_type ON A.nid = request_type.entity_id
                    LEFT JOIN field_data_field_payroll_items as payroll_items ON A.nid = payroll_items.entity_id
                    LEFT JOIN field_data_field_sched_valid_from as valid_from ON A.nid = valid_from.entity_id
                    LEFT JOIN field_data_field_sched_valid_to as valid_to ON A.nid = valid_to.entity_id
                    LEFT JOIN field_data_field_note as note ON A.nid = note.entity_id
                    LEFT JOIN field_data_field_status as status ON A.nid = status.entity_id
                    LEFT JOIN profile ON A.uid = profile.uid
                    LEFT JOIN field_data_field_employee_number as emp_number ON profile.pid = emp_number.entity_id
                    LEFT JOIN field_data_field_payroll_items as late_item ON A.nid = late_item.entity_id AND late_item.field_payroll_items_value = 'late'
                    LEFT JOIN field_data_field_payroll_items as undertime_item ON A.nid = undertime_item.entity_id AND undertime_item.field_payroll_items_value = 'undertime'
                    LEFT JOIN field_data_field_payroll_items as nightdiff_item ON A.nid = nightdiff_item.entity_id AND nightdiff_item.field_payroll_items_value = 'nightdiff'
                    LEFT JOIN field_data_field_work_days AS work_days ON work_days.entity_id = A.nid AND work_days.field_work_days_value <>'0'
                    ".implode("\n",$query_tables)."
                WHERE
                    request_type.field_request_type_tid = 597 AND
                    (FROM_UNIXTIME( A.changed ) >=  '".$start_datetime."'   AND FROM_UNIXTIME( A.changed ) <=  '".$end_datetime."')
                    GROUP BY A.nid"
        , [1]);
            log_to_file('info', 'Success', [$result]);
            return $result;
        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }


    /**
     *  Responsible for fetching the Overtime data from the Drupal Evox
     * 
     * @param $start_datetime;
     * @param $end_datetime;
     * @param $emp_num_array (Optional);
     * 
     * @return array $result;
     */
    public function get_overtime( $start_datetime, $end_datetime, $emp_num_array = [] )
    {
        try {
            $request_where_query = [];
            if( count($emp_num_array) > 0 ){
                $request_where_query[] = "U_D.field_employee_number_value IN (".implode( ',', $emp_num_array) .")";
            }

            $request_where_query[] = " FROM_UNIXTIME(A.created) BETWEEN '". $start_datetime ."' AND '". $end_datetime ."' ";
            $request_where_query[] = "C.name = 'Overtime'";
            $request_where_query[] = "U_D.field_employee_number_value IS NOT NULL";

            $query = "SELECT 
                        A.nid,
                        U_D.field_employee_number_value as emp_num,
                        DATE_FORMAT(FROM_UNIXTIME(E.field_date_to_alter_value), '%Y-%m-%d') as date,
                        TIME_TO_SEC(DATE_FORMAT(FROM_UNIXTIME(F.field_ot_request_time_value), '%H:%i:%s')) as amount,

                        CASE 
                            WHEN G_TYPE.name = 'Post Overtime' THEN 'post_overtime'
                            WHEN G_TYPE.name = 'Pre Overtime' THEN 'pre_overtime'
                            WHEN G_TYPE.name IS NULL THEN 'post_overtime'
                        END as type,

                        CASE 
                            WHEN H.field_employee_note_value = '' THEN NULL
                            ELSE H.field_employee_note_value
                        END as note,
                        
                        CASE 
                            WHEN D.field_status_value = 'approved' THEN 'approved'
                            WHEN D.field_status_value = 'denied' THEN 'declined'
                            WHEN D.field_status_value = 'cancel' THEN 'canceled'
                            WHEN D.field_status_value = 'pending' THEN 'pending'
                        END as status,

                        DATE_FORMAT(FROM_UNIXTIME(A.created), '%Y-%m-%d %H:%i:%s') as created_at
                    FROM
                        node AS A
                        LEFT JOIN field_data_field_request_type as B ON A.nid = B.entity_id
                        LEFT JOIN taxonomy_term_data as C ON C.tid = B.field_request_type_tid
                        LEFT JOIN field_data_field_status as D ON A.nid = D.entity_id

                        LEFT JOIN field_data_field_date_to_alter as E ON A.nid = E.entity_id 

                        LEFT JOIN field_data_field_ot_request_time as  F ON A.nid = F.entity_id
                         
                        LEFT JOIN field_data_field_ot_type as  G ON A.nid = G.entity_id 
                        LEFT JOIN taxonomy_term_data as G_TYPE ON G_TYPE.tid = G.field_ot_type_tid
                        
                        LEFT JOIN field_data_field_employee_note as H on A.nid = H.entity_id

                        LEFT JOIN profile AS U_C ON U_C.uid = A.uid AND U_C.type = 'personal'
                        LEFT JOIN field_data_field_employee_number AS U_D ON U_D.entity_id = U_C.pid 
                    WHERE
                        1 = 1
                        AND ". implode(' AND ', $request_where_query) . "
                    GROUP BY A.nid
                    ORDER BY A.created ASC, U_D.field_employee_number_value ASC";

            $result = DB::connection('drupal_portal')->select($query, [1]);
            
            log_to_file('info', 'Success', [$result]);
            return $result;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }





    
    /**
     *  Responsible for fetching the Default Schedule data from the Drupal Evox
     * 
     * @param $is_initial_sync
     * @param $emp_num_array (Optional);
     * 
     * @return array $result;
     */
    public function get_default_schedule( $is_initial_sync, $emp_num_array = [] )
    {
        try {

            $schedule_where_query = [];

            if( count($emp_num_array) > 0 ){
                $schedule_where_query[] = "C.field_employee_number_value IN (".implode( ',', $emp_num_array) .")";
            }

            // If not initial sync, gets the date span of yesterday and adds the checking for the changed Date from Yesterday
            if( !$is_initial_sync ){
                $start_datetime = Carbon::yesterday()->format('Y-m-d H:i:s');
                $end_datetime = Carbon::yesterday()->endOfDay()->format('Y-m-d H:i:s');
                $schedule_where_query[] = "DATE_FORMAT(FROM_UNIXTIME( B_S.changed), '%Y-%m-%d %H:%i:%s') BETWEEN '". $start_datetime ."' AND '". $end_datetime ."'";
            }

            $schedule_where_query[] = "A.status = 1";
            $schedule_where_query[] = "C.field_employee_number_value IS NOT NULL";

            $query = "SELECT 
                        A.uid,
                        C.field_employee_number_value as emp_num,

                        CASE
                            WHEN D.field_standard_schedule_value = 1 THEN 'standard'
                            WHEN E.field_flexy_sched_value = 1 THEN 'flexible'
                            WHEN F.field_customize_value = 1 THEN 'customize'
                        END as 'schedule_type',

                        DATE_FORMAT(FROM_UNIXTIME( B_S.changed), '%Y-%m-%d %H:%i:%s') as last_changed,
                        DATE_FORMAT(FROM_UNIXTIME( V_F.field_sched_valid_from_value), '%Y-%m-%d') as valid_from,
                        
                        # Standard
                        (DATE_FORMAT(FROM_UNIXTIME(STD_ON.field_schedule_on_duty_value), '%H:%i')) as standard_start_time,
                        (DATE_FORMAT(FROM_UNIXTIME(STD_OFF.field_schedule_off_duty_value), '%H:%i'))  as standard_end_time,
                        (DATE_FORMAT(FROM_UNIXTIME(STD_BT.field_break_time_value), '%H:%i')) as standard_break_time,
                        
                        # Flexible
                        (DATE_FORMAT(FROM_UNIXTIME(FLX_ON.field_flexy_on_duty_value), '%H:%i')) as flexy_start_time,
                        (DATE_FORMAT(FROM_UNIXTIME(FLX_OFF.field_flexy_off_duty_value), '%H:%i'))  as flexy_end_time,
                        (DATE_FORMAT(FROM_UNIXTIME(FLX_S.field_flexy_start_value), '%H:%i'))  as flexy_start_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(FLX_E.field_flexy_end_value), '%H:%i'))  as flexy_end_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(FLX_BT.field_flexy_break_time_value), '%H:%i')) as flexy_break_time,
                        
                        # Monday
                        (DATE_FORMAT(FROM_UNIXTIME(CMON_ON.field_c_mon_on_duty_value ), '%H:%i')) as mon_start_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CMON_OFF.field_c_mon_off_duty_value), '%H:%i'))  as mon_end_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CMON_FLX_S.field_c_mon_flexy_start_value), '%H:%i'))  as mon_start_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CMON_FLX_E.field_c_mon_flexy_end_value), '%H:%i'))  as mon_end_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CMON_BT.field_c_mon_break_time_value), '%H:%i')) as mon_break_time,
                        
                        # Tuesday
                        (DATE_FORMAT(FROM_UNIXTIME(CTUE_ON.field_c_tue_on_duty_value ), '%H:%i')) as tue_start_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CTUE_OFF.field_c_tue_off_duty_value), '%H:%i'))  as tue_end_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CTUE_FLX_S.field_c_tue_flexy_start_value), '%H:%i'))  as tue_start_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CTUE_FLX_E.field_c_tue_flexy_end_value), '%H:%i'))  as tue_end_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CTUE_BT.field_c_tue_break_time_value), '%H:%i')) as tue_break_time,
                        
                        # Wednesday
                        (DATE_FORMAT(FROM_UNIXTIME(CWED_ON.field_c_wed_on_duty_value ), '%H:%i')) as wed_start_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CWED_OFF.field_c_wed_off_duty_value), '%H:%i'))  as wed_end_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CWED_FLX_S.field_c_wed_flexy_start_value), '%H:%i'))  as wed_start_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CWED_FLX_E.field_c_wed_flexy_end_value), '%H:%i'))  as wed_end_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CWED_BT.field_c_wed_break_time_value), '%H:%i')) as wed_break_time,
                        
                        # Thursday
                        (DATE_FORMAT(FROM_UNIXTIME(CTHU_ON.field_c_thu_on_duty_value ), '%H:%i')) as thu_start_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CTHU_OFF.field_c_thu_off_duty_value), '%H:%i'))  as thu_end_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CTHU_FLX_S.field_c_thu_flexy_start_value), '%H:%i'))  as thu_start_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CTHU_FLX_E.field_c_thu_flexy_end_value), '%H:%i'))  as thu_end_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CTHU_BT.field_c_thu_break_time_value), '%H:%i')) as thu_break_time,
                        
                        # Friday
                        (DATE_FORMAT(FROM_UNIXTIME(CFRI_ON.field_c_fri_on_duty_value ), '%H:%i')) as fri_start_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CFRI_OFF.field_c_fri_off_duty_value), '%H:%i'))  as fri_end_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CFRI_FLX_S.field_c_fri_flexy_start_value), '%H:%i'))  as fri_start_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CFRI_FLX_E.field_c_fri_flexy_end_value), '%H:%i'))  as fri_end_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CFRI_BT.field_c_fri_break_time_value), '%H:%i')) as fri_break_time,
                        
                        # Saturday
                        (DATE_FORMAT(FROM_UNIXTIME(CSAT_ON.field_c_sat_on_duty_value ), '%H:%i')) as sat_start_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CSAT_OFF.field_c_sat_off_duty_value), '%H:%i'))  as sat_end_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CSAT_FLX_S.field_c_sat_flexy_start_value), '%H:%i'))  as sat_start_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CSAT_FLX_E.field_c_sat_flexy_end_value), '%H:%i'))  as sat_end_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CSAT_BT.field_c_sat_break_time_value), '%H:%i')) as sat_break_time,
                        
                        # Sunday
                        (DATE_FORMAT(FROM_UNIXTIME(CSUN_ON.field_c_sun_on_duty_value ), '%H:%i')) as sun_start_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CSUN_OFF.field_c_sun_off_duty_value), '%H:%i'))  as sun_end_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CSUN_FLX_S.field_c_sun_flexy_start_value), '%H:%i'))  as sun_start_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CSUN_FLX_E.field_c_sun_flexy_end_value), '%H:%i'))  as sun_end_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CSUN_BT.field_c_sun_break_time_value), '%H:%i')) as sun_break_time,
                    
                        # Policies
                        A_U.field_allow_undertime_value as allow_undertime,
                        A_L.field_allow_late_value as allow_late,
                        A_ND.field_allow_nd_value as allow_night_diff,
                    
                        # Work Days
                        GROUP_CONCAT(WD.field_work_days_value) as work_days
                        
                    FROM
                        users AS A
                        LEFT JOIN profile AS B_P ON B_P.uid = A.uid AND B_P.type = 'personal'
                        LEFT JOIN profile AS B_S ON B_S.uid = A.uid AND B_S.type = 'schedule'
                        LEFT JOIN field_data_field_employee_number AS C ON C.entity_id = B_P.pid
                        LEFT JOIN field_data_field_standard_schedule AS D ON D.entity_id = B_S.pid
                        LEFT JOIN field_data_field_flexy_sched AS E ON E.entity_id = B_S.pid
                        LEFT JOIN field_data_field_customize AS F ON F.entity_id = B_S.pid
                        
                        # Valid From
                        LEFT JOIN field_data_field_sched_valid_from AS V_F ON V_F.entity_id = B_S.pid
                        
                        # Standard
                        LEFT JOIN field_data_field_schedule_on_duty AS STD_ON ON STD_ON.entity_id = B_S.pid AND D.field_standard_schedule_value = 1
                        LEFT JOIN field_data_field_schedule_off_duty AS STD_OFF ON STD_OFF.entity_id = B_S.pid AND D.field_standard_schedule_value = 1
                        LEFT JOIN field_data_field_break_time AS STD_BT ON STD_BT.entity_id = B_S.pid AND D.field_standard_schedule_value = 1
                        
                        # Flexible
                        LEFT JOIN field_data_field_flexy_on_duty AS FLX_ON ON FLX_ON.entity_id = B_S.pid AND E.field_flexy_sched_value = 1
                        LEFT JOIN field_data_field_flexy_off_duty AS FLX_OFF ON FLX_OFF.entity_id = B_S.pid AND E.field_flexy_sched_value = 1
                        LEFT JOIN field_data_field_flexy_start AS FLX_S ON FLX_S.entity_id = B_S.pid AND E.field_flexy_sched_value = 1
                        LEFT JOIN field_data_field_flexy_end AS FLX_E ON FLX_E.entity_id = B_S.pid AND E.field_flexy_sched_value = 1
                        LEFT JOIN field_data_field_flexy_break_time AS FLX_BT ON FLX_BT.entity_id = B_S.pid AND E.field_flexy_sched_value = 1
                        
                        # Monday
                        LEFT JOIN field_data_field_c_mon_on_duty AS CMON_ON ON CMON_ON.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_mon_off_duty AS CMON_OFF ON CMON_OFF.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_mon_flexy_start AS CMON_FLX_S ON CMON_FLX_S.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_mon_flexy_end AS CMON_FLX_E ON CMON_FLX_E.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_mon_break_time AS CMON_BT ON CMON_BT.entity_id = B_S.pid AND F.field_customize_value = 1
                        
                        # Tuesday
                        LEFT JOIN field_data_field_c_tue_on_duty AS CTUE_ON ON CTUE_ON.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_tue_off_duty AS CTUE_OFF ON CTUE_OFF.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_tue_flexy_start AS CTUE_FLX_S ON CTUE_FLX_S.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_tue_flexy_end AS CTUE_FLX_E ON CTUE_FLX_E.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_tue_break_time AS CTUE_BT ON CTUE_BT.entity_id = B_S.pid AND F.field_customize_value = 1
                        
                        # Wednesday
                        LEFT JOIN field_data_field_c_wed_on_duty AS CWED_ON ON CWED_ON.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_wed_off_duty AS CWED_OFF ON CWED_OFF.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_wed_flexy_start AS CWED_FLX_S ON CWED_FLX_S.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_wed_flexy_end AS CWED_FLX_E ON CWED_FLX_E.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_wed_break_time AS CWED_BT ON CWED_BT.entity_id = B_S.pid AND F.field_customize_value = 1
                        
                        # Thursday
                        LEFT JOIN field_data_field_c_thu_on_duty AS CTHU_ON ON CTHU_ON.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_thu_off_duty AS CTHU_OFF ON CTHU_OFF.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_thu_flexy_start AS CTHU_FLX_S ON CTHU_FLX_S.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_thu_flexy_end AS CTHU_FLX_E ON CTHU_FLX_E.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_thu_break_time AS CTHU_BT ON CTHU_BT.entity_id = B_S.pid AND F.field_customize_value = 1
                        
                        # Friday
                        LEFT JOIN field_data_field_c_fri_on_duty AS CFRI_ON ON CFRI_ON.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_fri_off_duty AS CFRI_OFF ON CFRI_OFF.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_fri_flexy_start AS CFRI_FLX_S ON CFRI_FLX_S.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_fri_flexy_end AS CFRI_FLX_E ON CFRI_FLX_E.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_fri_break_time AS CFRI_BT ON CFRI_BT.entity_id = B_S.pid AND F.field_customize_value = 1
                        
                        # Saturday
                        LEFT JOIN field_data_field_c_sat_on_duty AS CSAT_ON ON CSAT_ON.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_sat_off_duty AS CSAT_OFF ON CSAT_OFF.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_sat_flexy_start AS CSAT_FLX_S ON CSAT_FLX_S.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_sat_flexy_end AS CSAT_FLX_E ON CSAT_FLX_E.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_sat_break_time AS CSAT_BT ON CSAT_BT.entity_id = B_S.pid AND F.field_customize_value = 1
                        
                        # Sunday
                        LEFT JOIN field_data_field_c_sun_on_duty AS CSUN_ON ON CSUN_ON.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_sun_off_duty AS CSUN_OFF ON CSUN_OFF.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_sun_flexy_start AS CSUN_FLX_S ON CSUN_FLX_S.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_sun_flexy_end AS CSUN_FLX_E ON CSUN_FLX_E.entity_id = B_S.pid AND F.field_customize_value = 1
                        LEFT JOIN field_data_field_c_sun_break_time AS CSUN_BT ON CSUN_BT.entity_id = B_S.pid AND F.field_customize_value = 1
                        
                        # Policies
                        LEFT JOIN field_data_field_allow_undertime AS A_U ON A_U.entity_id = B_S.pid 
                        LEFT JOIN field_data_field_allow_late AS A_L ON A_L.entity_id = B_S.pid 
                        LEFT JOIN field_data_field_allow_nd AS A_ND ON A_ND.entity_id = B_S.pid 

                        # Work Days
                        LEFT JOIN field_data_field_work_days AS WD ON WD.entity_id = B_S.pid AND WD.field_work_days_value <> '0'
                    
                    WHERE 
                        1 = 1
                        AND ". implode(' AND ', $schedule_where_query) . "
                    GROUP BY A.uid, B_S.pid
                HAVING schedule_type IS NOT NULL";
                    
            $result = DB::connection('drupal_portal')->select($query, [1]);
            
            log_to_file('info', 'Success', [$result]);
            return $result;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }





    
    /**
     *  Responsible for fetching the Temporary Schedule data from the Drupal Evox
     * 
     * @param $is_initial_sync
     * @param $emp_num_array (Optional);
     * 
     * @return array $result;
     */
    public function get_temporary_schedule( $is_initial_sync, $emp_num_array = [] )
    {
        try {

            $schedule_where_query = [];

            if( count($emp_num_array) > 0 ){
                $schedule_where_query[] = "C.field_t_employee_number_value IN (".implode( ',', $emp_num_array) .")";
            }

            // If not initial sync, gets the date span of yesterday and adds the checking for the changed Date from Yesterday
            if( !$is_initial_sync ){
                $start_datetime = Carbon::yesterday()->format('Y-m-d H:i:s');
                $end_datetime = Carbon::yesterday()->endOfDay()->format('Y-m-d H:i:s');
                $schedule_where_query[] = "DATE_FORMAT(FROM_UNIXTIME( A.changed ), '%Y-%m-%d %H:%i:%s') BETWEEN '". $start_datetime ."' AND '". $end_datetime ."'";
            }

            $schedule_where_query[] = "A.type = 'temporary_schedule'";
            $schedule_where_query[] = "A.status = 1";
            $schedule_where_query[] = "C.field_t_employee_number_value IS NOT NULL";

            $query = "SELECT 
                        A.uid,
                        C.field_t_employee_number_value as emp_num,
                        CASE
                            WHEN D.field_t_standard_schedule_value = 1 THEN 'standard'
                            WHEN E.field_t_flexy_schedule_value = 1 THEN 'flexible'
                            WHEN F.field_t_customize_schedule_value = 1 THEN 'customize'
                        END as 'schedule_type',
                    
                        DATE_FORMAT(FROM_UNIXTIME( A.changed), '%Y-%m-%d %H:%i:%s') as last_changed,
                        DATE_FORMAT(FROM_UNIXTIME( V_F.field_t_valid_from_value), '%Y-%m-%d') as valid_from,
                        DATE_FORMAT(FROM_UNIXTIME( V_T.field_t_valid_to_value), '%Y-%m-%d') as valid_to,
                        
                        # Standard
                        (DATE_FORMAT(FROM_UNIXTIME(STD_ON.field_t_std_off_duty_value), '%H:%i')) as standard_start_time,
                        (DATE_FORMAT(FROM_UNIXTIME(STD_OFF.field_t_std_on_duty_value), '%H:%i'))  as standard_end_time,
                        (DATE_FORMAT(FROM_UNIXTIME(STD_BT.field_t_std_breaktime_value), '%H:%i')) as standard_break_time,
                        
                        # Flexible
                        (DATE_FORMAT(FROM_UNIXTIME(FLX_ON.field_t_flx_l_start_time_value), '%H:%i')) as flexy_start_time,
                        (DATE_FORMAT(FROM_UNIXTIME(FLX_OFF.field_t_flx_e_end_time_value), '%H:%i'))  as flexy_end_time,
                        (DATE_FORMAT(FROM_UNIXTIME(FLX_S.field_t_flx_l_start_time_value), '%H:%i'))  as flexy_start_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(FLX_E.field_t_flx_l_end_time_value), '%H:%i'))  as flexy_end_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(FLX_BT.field_t_flx_breaktime_value), '%H:%i')) as flexy_break_time,
                        
                        # Monday
                        (DATE_FORMAT(FROM_UNIXTIME(CMON_ON.field_t_cst_mon_on_duty_value ), '%H:%i')) as mon_start_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CMON_OFF.field_t_cst_mon_off_duty_value), '%H:%i'))  as mon_end_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CMON_FLX_S.field_t_cst_mon_flexy_start_value), '%H:%i'))  as mon_start_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CMON_FLX_E.field_t_cst_mon_flexy_end_value), '%H:%i'))  as mon_end_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CMON_BT.field_t_cst_mon_breaktime_value), '%H:%i')) as mon_break_time,
                        
                        # Tuesday
                        (DATE_FORMAT(FROM_UNIXTIME(CTUE_ON.field_t_cst_tue_on_duty_value ), '%H:%i')) as tue_start_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CTUE_OFF.field_t_cst_tue_off_duty_value), '%H:%i'))  as tue_end_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CTUE_FLX_S.field_t_cst_tue_flexy_start_value), '%H:%i'))  as tue_start_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CTUE_FLX_E.field_t_cst_tue_flexy_end_value), '%H:%i'))  as tue_end_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CTUE_BT.field_t_cst_tue_breaktime_value), '%H:%i')) as tue_break_time,
                        
                        # Wednesday
                        (DATE_FORMAT(FROM_UNIXTIME(CWED_ON.field_t_cst_wed_on_duty_value ), '%H:%i')) as wed_start_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CWED_OFF.field_t_cst_wed_off_duty_value), '%H:%i'))  as wed_end_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CWED_FLX_S.field_t_cst_wed_flexy_start_value), '%H:%i'))  as wed_start_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CWED_FLX_E.field_t_cst_wed_flexy_end_value), '%H:%i'))  as wed_end_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CWED_BT.field_t_cst_wed_breaktime_value), '%H:%i')) as wed_break_time,
                        
                        # Thursday
                        (DATE_FORMAT(FROM_UNIXTIME(CTHU_ON.field_t_cst_thu_on_duty_value ), '%H:%i')) as thu_start_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CTHU_OFF.field_t_cst_thu_off_duty_value), '%H:%i'))  as thu_end_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CTHU_FLX_S.field_t_cst_thu_flexy_start_value), '%H:%i'))  as thu_start_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CTHU_FLX_E.field_t_cst_thu_flexy_end_value), '%H:%i'))  as thu_end_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CTHU_BT.field_t_cst_thu_breaktime_value), '%H:%i')) as thu_break_time,
                        
                        # Friday
                        (DATE_FORMAT(FROM_UNIXTIME(CFRI_ON.field_t_cst_fri_on_duty_value ), '%H:%i')) as fri_start_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CFRI_OFF.field_t_cst_fri_off_duty_value), '%H:%i'))  as fri_end_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CFRI_FLX_S.field_t_cst_fri_flexy_start_value), '%H:%i'))  as fri_start_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CFRI_FLX_E.field_t_cst_fri_flexy_end_value), '%H:%i'))  as fri_end_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CFRI_BT.field_t_cst_fri_breaktime_value), '%H:%i')) as fri_break_time,
                        
                        # Saturday
                        (DATE_FORMAT(FROM_UNIXTIME(CSAT_ON.field_t_cst_sat_on_duty_value ), '%H:%i')) as sat_start_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CSAT_OFF.field_t_cst_sat_off_duty_value), '%H:%i'))  as sat_end_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CSAT_FLX_S.field_t_cst_sat_flexy_start_value), '%H:%i'))  as sat_start_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CSAT_FLX_E.field_t_cst_sat_flexy_end_value), '%H:%i'))  as sat_end_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CSAT_BT.field_t_cst_sat_breaktime_value), '%H:%i')) as sat_break_time,
                        
                        # Sunday
                        (DATE_FORMAT(FROM_UNIXTIME(CSUN_ON.field_t_cst_sun_on_duty_value ), '%H:%i')) as sun_start_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CSUN_OFF.field_t_cst_sun_off_duty_value), '%H:%i'))  as sun_end_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CSUN_FLX_S.field_t_cst_sun_flexy_start_value), '%H:%i'))  as sun_start_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CSUN_FLX_E.field_t_cst_sun_flexy_end_value), '%H:%i'))  as sun_end_flexy_time,
                        (DATE_FORMAT(FROM_UNIXTIME(CSUN_BT.field_t_cst_sun_breaktime_value), '%H:%i')) as sun_break_time,
                    
                        # Policies
                        A_U.field_t_allow_undertime_value as allow_undertime,
                        A_L.field_t_allow_late_value as allow_late,
                        A_ND.field_t_allow_nd_value as allow_night_diff,
                    
                        # Work Days
                        GROUP_CONCAT(WD.field_t_work_days_value) as work_days
                        
                    FROM
                        node AS A
                        LEFT JOIN field_data_field_t_employee_number AS C ON C.entity_id = A.nid
                        LEFT JOIN field_data_field_t_standard_schedule AS D ON D.entity_id = A.nid
                        LEFT JOIN field_data_field_t_flexy_schedule AS E ON E.entity_id = A.nid
                        LEFT JOIN field_data_field_t_customize_schedule AS F ON F.entity_id = A.nid
                        
                        # Valid Date
                        LEFT JOIN field_data_field_t_valid_from AS V_F ON V_F.entity_id = A.nid
                        LEFT JOIN field_data_field_t_valid_to AS V_T ON V_T.entity_id = A.nid
                        
                        # Standard
                        LEFT JOIN field_data_field_t_std_off_duty AS STD_ON ON STD_ON.entity_id = A.nid AND D.field_t_standard_schedule_value = 1
                        LEFT JOIN field_data_field_t_std_on_duty AS STD_OFF ON STD_OFF.entity_id = A.nid AND D.field_t_standard_schedule_value = 1
                        LEFT JOIN field_data_field_t_std_breaktime AS STD_BT ON STD_BT.entity_id = A.nid AND D.field_t_standard_schedule_value = 1
                        
                        # Flexible
                        LEFT JOIN field_data_field_t_flx_l_start_time AS FLX_ON ON FLX_ON.entity_id = A.nid AND E.field_t_flexy_schedule_value = 1
                        LEFT JOIN field_data_field_t_flx_e_end_time AS FLX_OFF ON FLX_OFF.entity_id = A.nid AND E.field_t_flexy_schedule_value = 1
                        LEFT JOIN field_data_field_t_flx_l_start_time AS FLX_S ON FLX_S.entity_id = A.nid AND E.field_t_flexy_schedule_value = 1
                        LEFT JOIN field_data_field_t_flx_l_end_time AS FLX_E ON FLX_E.entity_id = A.nid AND E.field_t_flexy_schedule_value = 1
                        LEFT JOIN field_data_field_t_flx_breaktime AS FLX_BT ON FLX_BT.entity_id = A.nid AND E.field_t_flexy_schedule_value = 1
                        
                        # Monday
                        LEFT JOIN field_data_field_t_cst_mon_on_duty AS CMON_ON ON CMON_ON.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_mon_off_duty AS CMON_OFF ON CMON_OFF.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_mon_flexy_start AS CMON_FLX_S ON CMON_FLX_S.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_mon_flexy_end AS CMON_FLX_E ON CMON_FLX_E.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_mon_breaktime AS CMON_BT ON CMON_BT.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        
                        # Tuesday
                        LEFT JOIN field_data_field_t_cst_tue_on_duty AS CTUE_ON ON CTUE_ON.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_tue_off_duty AS CTUE_OFF ON CTUE_OFF.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_tue_flexy_start AS CTUE_FLX_S ON CTUE_FLX_S.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_tue_flexy_end AS CTUE_FLX_E ON CTUE_FLX_E.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_tue_breaktime AS CTUE_BT ON CTUE_BT.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        
                        # Wednesday
                        LEFT JOIN field_data_field_t_cst_wed_on_duty AS CWED_ON ON CWED_ON.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_wed_off_duty AS CWED_OFF ON CWED_OFF.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_wed_flexy_start AS CWED_FLX_S ON CWED_FLX_S.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_wed_flexy_end AS CWED_FLX_E ON CWED_FLX_E.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_wed_breaktime AS CWED_BT ON CWED_BT.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        
                        # Thursday
                        LEFT JOIN field_data_field_t_cst_thu_on_duty AS CTHU_ON ON CTHU_ON.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_thu_off_duty AS CTHU_OFF ON CTHU_OFF.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_thu_flexy_start AS CTHU_FLX_S ON CTHU_FLX_S.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_thu_flexy_end AS CTHU_FLX_E ON CTHU_FLX_E.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_thu_breaktime AS CTHU_BT ON CTHU_BT.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        
                        # Friday
                        LEFT JOIN field_data_field_t_cst_fri_on_duty AS CFRI_ON ON CFRI_ON.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_fri_off_duty AS CFRI_OFF ON CFRI_OFF.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_fri_flexy_start AS CFRI_FLX_S ON CFRI_FLX_S.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_fri_flexy_end AS CFRI_FLX_E ON CFRI_FLX_E.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_fri_breaktime AS CFRI_BT ON CFRI_BT.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        
                        # Saturday
                        LEFT JOIN field_data_field_t_cst_sat_on_duty AS CSAT_ON ON CSAT_ON.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_sat_off_duty AS CSAT_OFF ON CSAT_OFF.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_sat_flexy_start AS CSAT_FLX_S ON CSAT_FLX_S.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_sat_flexy_end AS CSAT_FLX_E ON CSAT_FLX_E.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_sat_breaktime AS CSAT_BT ON CSAT_BT.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        
                        # Sunday
                        LEFT JOIN field_data_field_t_cst_sun_on_duty AS CSUN_ON ON CSUN_ON.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_sun_off_duty AS CSUN_OFF ON CSUN_OFF.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_sun_flexy_start AS CSUN_FLX_S ON CSUN_FLX_S.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_sun_flexy_end AS CSUN_FLX_E ON CSUN_FLX_E.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        LEFT JOIN field_data_field_t_cst_sun_breaktime AS CSUN_BT ON CSUN_BT.entity_id = A.nid AND F.field_t_customize_schedule_value = 1
                        
                        # Policies
                        LEFT JOIN field_data_field_t_allow_undertime AS A_U ON A_U.entity_id = A.nid 
                        LEFT JOIN field_data_field_t_allow_late AS A_L ON A_L.entity_id = A.nid 
                        LEFT JOIN field_data_field_t_allow_nd AS A_ND ON A_ND.entity_id = A.nid 

                        # Work Days
                        LEFT JOIN field_data_field_t_work_days AS WD ON WD.entity_id = A.nid AND WD.field_t_work_days_value <> '0'
                    
                    WHERE 
                        1 = 1
                        AND ". implode(' AND ', $schedule_where_query) . "
                    GROUP BY A.uid, A.nid
                HAVING schedule_type IS NOT NULL";
                    
            $result = DB::connection('drupal_portal')->select($query, [1]);
            
            log_to_file('info', 'Success', [$result]);
            return $result;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

}