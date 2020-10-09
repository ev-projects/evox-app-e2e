<?php 

namespace App\Modules\User\Repositories;

use Illuminate\Database\Eloquent\Collection;

interface UserRepositoryInterface
{
    public function insert_bhr_user_to_evox(object $bhr_user);

    public function apply_user_supervisor_pivot( array $user_supervisor_pivot_array );

    public function store( array $data );

    public function update( array $data , $id );

    public function destroy( $id );

    public function show( $id );

    public function get_all_active_users();

    public function assign_roles_to_user( array $roles_array, $user_id );

    public function assign_permissions_to_user( array $permissions_array, $user_id );
}