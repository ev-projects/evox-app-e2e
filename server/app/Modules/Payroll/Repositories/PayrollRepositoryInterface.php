<?php 

namespace App\Modules\Payroll\Repositories;

use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface PayrollRepositoryInterface
{   
    public function get_payroll_cutoff( string $date );
}