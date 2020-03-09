<?php 

namespace App\Modules\Bhr\Repositories;

use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface BhrRepositoryInterface
{
    public function sync_holidays( string $start_date, string $end_date );
}