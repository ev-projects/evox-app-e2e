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



}