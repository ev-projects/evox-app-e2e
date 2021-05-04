<?php 

namespace App\Modules\Payroll\Repositories;

use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

interface HolidayRepositoryInterface
{   
    public function get_holidays( Carbon $date_from, Carbon $date_to );
}