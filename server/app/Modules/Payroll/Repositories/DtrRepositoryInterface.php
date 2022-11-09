<?php 

namespace App\Modules\Payroll\Repositories;

use App\Modules\Payroll\Models\Dtr;
use App\Modules\Request\Models\AlterLog;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface DtrRepositoryInterface
{
    public function generate_dtr( Collection $user_collection, array $date_array );

    public function apply_drupal_evox_data_to_dtr( array $drupal_evox_dtr_array );

    
    public function apply_schedule_to_dtr( $user_or_user_id,  Schedule $schedule, $bypass = false );

    public function remove_schedule_to_dtr( $user_or_user_id,  Schedule $schedule );


    public function apply_alter_log_to_dtr( AlterLog $alter_log );

    public function remove_alter_log_from_dtr( AlterLog $alter_log );
    

    public function apply_rest_day_work_to_dtr( RestDayWork $rest_day_work );

    public function remove_rest_day_from_dtr( RestDayWork $rest_day_work );


    public function bind_holidays_to_dtr( string $start_date, string $end_date );

    public function bind_leaves_to_dtr( array $bhr_leaves_array );
 
    public function sync_biometrics_to_dtr( Collection $biometrics_collection, $dtr_id = null );

    public function get_dtr_logs(Collection $user_collection, string $start_date, string $end_date );
    
    public function compute_payroll_items(Dtr $dtr);

    public function generate_dtr_on_new_hire($user );

    public function get_leaves_from_dtr( Collection $dtr_collection );
    
}