<?php 

namespace App\Modules\User\Repositories;

use Illuminate\Http\Request;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface UserRepositoryInterface
{

    public function register_user( Request $request );

    public function insert_bhr_user_to_evox(object $bhr_user, object $utc);

    public function update_bhr_user_to_evox(User $user, object $bhr_user, object $utc);

    public function apply_user_supervisor_pivot( array $user_supervisor_pivot_array );

    public function store( array $data );

    public function update( array $data , $id );

    public function destroy( $id );

    public function show( $id );

    public function show_via_bhr_number( $bhr_user_number );

    public function get_my_team_list( $id );
    
    public function new_get_my_team_list( $id );

    public function get_all_active_users();

    public function get_all_supervisors();

    public function get_users_under_supervisee( Request $request, $start_date, $end_date, $hired_strict = false, $country_strict = false);

    public function get_users_under_supervisee_with_inactive( Request $request, $start_date, $end_date );

    public function get_users_under_supervisee_active_with_no_schedule(User $user);

    public function get_dpa_list( Request $request);

    public function apply_temporary_password( $email, $temporary_password );

    public function change_password( $id, array $data);

    public function tick_dpa( $id );

    public function assign_roles_to_user( $id, array $roles_array );

    public function assign_level_features( $id, array $features_array , $level );

    public function assign_permissions_to_user( $id, array $permissions_array, array $roles_array );

    public function assign_employees_to_user( $id, array $employee_id_array );

    public function list_via_role( $role );

    public function list_via_department( $department_id );

    public function adminRoleConditions($user_id, array $request);

    public function update_bhr_user_country_to_evox(User $user, object $bhr_user, object $utc);

    public function get_users_under_supervisee_active_with_requests($start_date, $end_date, $supervisor_id = null, $department_id = null);

    public function get_users_under_supervisee_active_with_invalid_check_ins($supervisor_id = null, $department_id = null);

    public function get_user_department ($id);
}