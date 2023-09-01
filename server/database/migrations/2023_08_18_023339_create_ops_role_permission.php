<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class CreateOpsRolePermission extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // create new role for ops
        $ops_role = Role::create(['name' => 'ops']);
       
        // create new permissions for ops
        $ops_permission = [
            Permission::create(['name' => 'ops_access', 'label' => 'Operations Access']),
            Permission::create(['name' => 'manage_ops_schedules', 'label' => 'Manage Operations Schedules']),
        ];
        $ops_role->givePermissionTo($ops_permission);
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        //
    }
}
