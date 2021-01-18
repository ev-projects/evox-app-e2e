<?php 

namespace App\Modules\Email\Repositories;

use App\Modules\Request\Models\Overtime;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface EmailRepositoryInterface
{
    public function sendOvertimeRequestEmail( Overtime $overtime );

    public function sendOvertimeRequestChangeStatusEmail( Overtime $overtime );
}