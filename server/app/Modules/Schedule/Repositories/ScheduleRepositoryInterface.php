<?php 

namespace App\Modules\Schedule\Repositories;

use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;

interface ScheduleRepositoryInterface
{
    public function store( array $data );

    public function update( array $data , $id_or_schedule );

    public function destroy( $id );

    public function show( $id );

    public function assign( array $data );
    
    public function get_template_schedules();

    public function replicate_schedule_to_user( Schedule $schedule, User $user );

    public function apply_drupal_evox_data_to_default_schedule( array $drupal_evox_default_schedule_array );

    public function apply_drupal_evox_data_to_temporary_schedule( array $drupal_evox_temporary_schedule_array );
}