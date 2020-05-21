<?php 

namespace App\Modules\Request\Repositories;

interface AlterLogRepositoryInterface
{
    public function store( array $data );

    public function update( array $data , $id );

    public function destroy( $id );

    public function find( $id );
    
    public function approve( array $data , $id );

    public function decline( array $data , $id );

    public function pending( $id );

    public function cancel( $id );
}