<?php 

namespace App\Modules\Client\Repositories;

interface ClientRepositoryInterface
{
    public function all();

    public function find( $client_id, $department_id );

    public function assign_clients( $client_id, $department_id , array $user_id_array );
}