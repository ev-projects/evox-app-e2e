<?php 

namespace App\Modules\Department\Repositories;

interface DepartmentRepositoryInterface
{
    public function all();

    public function find( $id );

    public function assign_handlers( $id, array $users_array );

    public function destroy_department($id);
}