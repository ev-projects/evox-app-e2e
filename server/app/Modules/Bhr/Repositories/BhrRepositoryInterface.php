<?php 

namespace App\Modules\Bhr\Repositories;

use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface BhrRepositoryInterface
{
    public function get_all_bhr_user_numbers();

    public function get_changed_users( $start_date );

    public function get_user( string $bhr_user_number, $for_sync = false );

    public function get_profile_picture( string $bhr_user_number );

    public function sync_holidays( string $start_date, string $end_date );
    
    public function get_holidays( string $start_date, string $end_date );

    public function get_leaves( string $start_date, string $end_date, User $user = null );
}