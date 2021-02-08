<?php 

namespace App\Modules\User\Repositories;

use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;

interface UserRepositoryInterface
{
    public function insert_bhr_user_to_evox(object $bhr_user);

    public function update_bhr_user_to_evox(User $user, object $bhr_user);

    public function apply_user_supervisor_pivot( array $user_supervisor_pivot_array );

    public function store( array $data );

    public function update( array $data , $id );

    public function destroy( $id );

    public function show( $id );

    public function show_via_bhr_number( $bhr_user_number );

    public function get_my_team_list( $id );

    public function get_all_active_users();

    public function get_users_under_supervisee( Request $request);

    public function change_password( $id, array $data);

    public function assign_roles_to_user( $id, array $roles_array );

    public function assign_permissions_to_user( $id, array $permissions_array );

    public function assign_employees_to_user( $id, array $employee_id_array );

    public function list_via_role( $role );

    public function list_via_department( $department_id );

}