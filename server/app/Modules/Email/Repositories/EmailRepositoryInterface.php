<?php 

namespace App\Modules\Email\Repositories;

use App\Modules\Request\Models\Overtime;
use App\Modules\Request\Models\RestDayWork;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface EmailRepositoryInterface
{
    public function sendOvertimeRequestEmail( Overtime $overtime );

    public function sendOvertimeRequestChangeStatusEmail( Overtime $overtime );

    public function sendRestDayWorkRequestEmail( RestDayWork $rest_day_work );

    public function sendRestDayWorkRequestChangeStatusEmail( RestDayWork $rest_day_work );
}