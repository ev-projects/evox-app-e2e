<?php 

namespace App\Modules\Payroll\Repositories;

use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface DtrRepositoryInterface
{
    public function generate_dtr( Collection $user_collection, array $date_array );

    public function apply_schedule_to_dtr( $user_or_user_id,  Schedule $schedule );

    // public function apply_dtr_schedule_to_department( $department, $start_date, $end_date = null );
    

    public function sync_biometrics_to_dtr( string $start_datetime, string $end_datetime, Collection $user_collection = null );
}