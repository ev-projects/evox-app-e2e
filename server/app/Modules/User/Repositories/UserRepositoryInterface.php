<?php 

namespace App\Modules\User\Repositories;

interface UserRepositoryInterface
{
    public function store( array $data );

    public function update( array $data , $id );

    public function destroy( $id );

    public function show( $id );

    public function getAllActiveUsers();
}