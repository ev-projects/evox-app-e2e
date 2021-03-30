<?php 

namespace App\Modules\Team\Repositories;

interface TeamRepositoryInterface
{
    public function all();

    public function list_via_department( $department_id );

    public function list_via_team_handler( $user_id );

    public function find( $id );

    public function store( array $data );

    public function update( array $data , $id );

    public function destroy( $id );
}