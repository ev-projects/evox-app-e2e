<?php 

namespace App\Modules\Payroll\Repositories;

use Illuminate\Database\Eloquent\Collection;

interface BiometricsRepositoryInterface
{
    public function get_biometrics( string $start_datetime, string $end_datetime, Collection $user_collection = null );
}