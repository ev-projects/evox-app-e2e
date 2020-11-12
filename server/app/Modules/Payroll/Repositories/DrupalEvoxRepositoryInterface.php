<?php 

namespace App\Modules\Payroll\Repositories;

interface DrupalEvoxRepositoryInterface
{
    public function get_dtr( $start_datetime, $end_datetime );
}