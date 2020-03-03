<?php 

namespace App\Modules\Schedule\Repositories;

interface ScheduleRepositoryInterface
{
    public function store( array $data );

    public function update( array $data , $id );

    public function destroy( $id );

    public function show( $id );

    public function assign( array $data );
    
    public function get_template_schedules();
}