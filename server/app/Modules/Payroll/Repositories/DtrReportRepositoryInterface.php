<?php 

namespace App\Modules\Payroll\Repositories;

use App\Modules\User\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;

interface DtrReportRepositoryInterface
{
    public function get_team_birthday_anniversary();

    public function get_team_attendance( Carbon $current_time );

    public function get_team_attendance_summary( Carbon $current_time );

}