<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class CreateNewPermissions extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        $admin_role = Role::where('name', 'admin')->first();
        $supervisor_role = Role::where('name', 'supervisor')->first();

        // // Admin Permissions
        $admin_permission = [
            Permission::create(['name' => 'manage_payroll_cutoff', 'label' => 'Manage Payroll Cutoff']),
            Permission::create(['name' => 'sync_biometrics', 'label' => 'Sync Biometrics']),
            Permission::create(['name' => 'sync_bhr_user_updates', 'label' => 'Sync BHR User Updates']),
            Permission::create(['name' => 'sync_bhr_leaves', 'label' => 'Sync BHR Leaves']),
            Permission::create(['name' => 'assign_role_permission', 'label' => 'Assign Role/Permission']),
            Permission::create(['name' => 'assign_department_handlers', 'label' => 'Assign Department Handlers']),
            Permission::create(['name' => 'assign_employees_client', 'label' => 'Assign Client Handlers']),
            Permission::create(['name' => 'assign_employee_supervisors', 'label' => 'Assign Employee Supervisors']),
            Permission::create(['name' => 'allow_register_user', 'label' => 'Allow Register User']),
        ];
       

        // // Supervisor Permissions
        $supervisor_permission = [
            Permission::create(['name' => 'view_employee_personal_info', 'label' => 'View Employee Personal Information']),
            Permission::create(['name' => 'view_employee_job_info', 'label' => 'View Employee Job Information']),
            Permission::create(['name' => 'view_employee_time_off', 'label' => 'View Employee Time Off']),
            Permission::create(['name' => 'view_employee_dtr', 'label' => 'View Employee DTR']),
            Permission::create(['name' => 'view_dpa_list', 'label' => 'View DPA List']),
            Permission::create(['name' => 'view_dtr_summary', 'label' => 'View DTR Summary']),
            Permission::create(['name' => 'allow_dtr_summary_export', 'label' => 'Allow DTR Summary Export']),
            Permission::create(['name' => 'view_dtr_logs', 'label' => 'View DTR Logs']),
            Permission::create(['name' => 'allow_dtr_logs_export', 'label' => 'Allow DTR Logs Export']),
            Permission::create(['name' => 'manage_teams', 'label' => 'Manage Teams']),
            Permission::create(['name' => 'manage_schedule', 'label' => 'Manage Schedules']),
            Permission::create(['name' => 'view_employee_requests', 'label' => 'View Employee Requests']),
            Permission::create(['name' => 'manage_employee_request', 'label' => 'Manage Employee Request']),
        ];

        // // Add Permission for their distinct role
        $admin_role->syncPermissions($admin_permission);
        $supervisor_role->syncPermissions($supervisor_permission);

        foreach( Role::where('name', 'supervisor')->first()->users()->get() as $supervisor ){
            $permissions_to_sync = [];

            // Iterate and filter out all the Permissions that are already existing for the Supervisor.
            foreach( $supervisor_role->permissions()->get() as $permission ){
                if( ! $supervisor->hasDirectPermission( $permission ) ) {
                    $permissions_to_sync[] = $permission;
                }
            }
            
            // Assign the Supervisor's Permissions
            $supervisor->givePermissionTo( $permissions_to_sync );
        }

        foreach( Role::where('name', 'admin')->first()->users()->get() as $admin ){
            $permissions_to_sync = [];

            // Iterate and filter out all the Permissions that are already existing for the Admin.
            foreach( $admin_role->permissions()->get() as $permission ){
                if( ! $admin->hasDirectPermission( $permission ) ) {
                    $permissions_to_sync[] = $permission;
                }
            }
            
            // Assign the Supervisor's Permissions
            $admin->givePermissionTo( $permissions_to_sync );
        }

        
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
    }
}
