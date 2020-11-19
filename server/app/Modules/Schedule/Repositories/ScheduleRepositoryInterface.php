<?php 

namespace App\Modules\Schedule\Repositories;

interface ScheduleRepositoryInterface
{
    public function store( array $data );

    public function update( array $data , $id_or_schedule );

    public function destroy( $id );

    public function show( $id );

    public function assign( array $data );
    
    public function get_template_schedules();

    public function apply_drupal_evox_data_to_default_schedule( array $drupal_evox_default_schedule_array );
}