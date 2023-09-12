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
    
    public function list( $id );

    public function assign( array $data );
    
    public function get_template_schedules();

    public function copy_schedule_to_user( Schedule $schedule, User $user );

    public function replicate_schedule_holiday_policy( Schedule $schedule, Schedule $schedule_to_copy );

    public function replicate_schedule_policy( Schedule $schedule, Schedule $schedule_to_copy );

    public function replicate_schedule( Schedule $schedule, Schedule $schedule_to_copy );

    public function apply_drupal_evox_data_to_default_schedule( array $drupal_evox_default_schedule_array );

    public function apply_drupal_evox_data_to_temporary_schedule( array $drupal_evox_temporary_schedule_array );
}