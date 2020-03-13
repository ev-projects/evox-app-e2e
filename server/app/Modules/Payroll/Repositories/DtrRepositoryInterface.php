<?php 

namespace App\Modules\Payroll\Repositories;

use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface DtrRepositoryInterface
{
    public function generate_dtr( Collection $user_collection, array $date_array );

    public function apply_schedule_to_dtr( $user_or_user_id,  Schedule $schedule );

    public function bind_holidays_to_dtr( string $start_date, string $end_date );

    public function bind_leaves_to_dtr( array $bhr_leaves_array );

    public function sync_biometrics_to_dtr( Collection $biometrics_collection );
}