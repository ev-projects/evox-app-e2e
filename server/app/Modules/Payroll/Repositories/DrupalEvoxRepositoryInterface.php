<?php 

namespace App\Modules\Payroll\Repositories;

interface DrupalEvoxRepositoryInterface
{
    public function get_dtr( $start_datetime, $end_datetime );

    public function get_alter_log( $start_datetime, $end_datetime , $emp_num_array = [] );

    public function get_rest_day_work( $start_datetime, $end_datetime ,  $emp_num_array = [] );
}