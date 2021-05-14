<?php 

namespace App\Modules\Report\Repositories;

use App\Modules\User\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;

interface ReportRepositoryInterface
{
    public function get_my_dtr_notifications( $start_date, $end_date );

    public function get_team_birthday_anniversary();

    public function get_team_attendance( Carbon $current_time );

    public function get_team_attendance_summary( Collection $user_collection, string $start_date, string $end_date );

    public function get_dtr_summary( Collection $user_collection, string $start_date, string $end_date );
    

}