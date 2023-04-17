<?php 

namespace App\Modules\Department\Repositories;

use App\Modules\User\Models\User;

interface DepartmentRepositoryInterface
{
    public function all();

    public function find( $id );

    public function assign_handlers( $id, array $users_array );

    public function destroy_department($id);
    
    public function dashboard_annoucments(User $user);

    public function all_with_announcements();
}