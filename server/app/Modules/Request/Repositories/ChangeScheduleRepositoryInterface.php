<?php 

namespace App\Modules\Request\Repositories;

interface ChangeScheduleRepositoryInterface
{
    public function store( array $data );

    public function update( array $data , $id );

    public function destroy( $id );

    public function find( $id );

    public function where( array $parameter );
    
    public function approve( $id );

    public function decline( $id );

    public function pending( $id );

    public function cancel( $id );
}