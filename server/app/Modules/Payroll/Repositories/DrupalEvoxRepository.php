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
            $result = DB::connection('drupal_payroll')->select("    
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
                        ORDER BY date.field_date_value ASC, A.title ASC;
            ", [1]);
            

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
                    FROM_UNIXTIME( alter_log_date.field_date_to_alter_value ) as 'date',
                    FROM_UNIXTIME( new_timein.field_time_in_value ) as 'new_time_in',
                    FROM_UNIXTIME( new_timeout.field_time_out_value ) as 'new_time_out',
                    FROM_UNIXTIME( old_time_in.field_old_time_in_value ) as 'old_time_in',
                    FROM_UNIXTIME( old_time_out.field_old_time_out_value ) as 'old_time_out',
                    employee_note.field_employee_note_value   as 'employee_note',
                    supervisor_note.field_supervisor_note_value as 'supervisor_note',
                    request_status.field_status_value as 'status',
                    FROM_UNIXTIME( A.created ) as 'date_created',
                    FROM_UNIXTIME( A.changed ) as 'date_updated'
                    
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
                    (FROM_UNIXTIME( alter_log_date.field_date_to_alter_value ) >=  '".$start_datetime."'  AND FROM_UNIXTIME( alter_log_date.field_date_to_alter_value ) <=  '".$end_datetime."')
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
            $result = DB::connection('drupal_payroll')->select("
            SELECT 
            A.nid,
            employee_num.field_empnum_value as 'employee_number',
            FROM_UNIXTIME( rest_day_work_date.field_date_to_alter_value ) as 'date',
            FROM_UNIXTIME( on_duty.field_rdw_on_duty_schedule_value ) as 'on_duty',
            FROM_UNIXTIME( off_duty.field_rdw_off_duty_schedule_value ) as 'off_duty',
            employee_note.field_employee_note_value   as 'employee_note',
            supervisor_note.field_supervisor_note_value as 'supervisor_note',
            request_status.field_status_value as 'status',
            FROM_UNIXTIME( A.created ) as 'date_created',
            FROM_UNIXTIME( A.changed ) as 'date_updated'
            
        FROM
            node AS A
            LEFT JOIN field_data_field_date_to_alter as rest_day_work_date	ON A.nid = alter_log_date.entity_id
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
            (FROM_UNIXTIME( alter_log_date.field_date_to_alter_value ) >=  '".$start_datetime."'  AND FROM_UNIXTIME( alter_log_date.field_date_to_alter_value ) <=  '".$end_datetime."')
            ". ((count($emp_num_array) > 0)? "AND A.title IN (".implode( ',', $emp_num_array) .")" : "") ."
            ", [1]);
            log_to_file('info', 'Success', [$result]);
            return $result;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }
}