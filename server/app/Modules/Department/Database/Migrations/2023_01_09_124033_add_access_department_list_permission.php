<?php

use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddAccessDepartmentListPermission extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        //
        $admin_role = Role::where('name', 'admin')->first();
        $admin_permission = [
            Permission::create(['name' => 'access_department_list', 'label' => 'Access Department List']),
        ];
        $admin_role->givePermissionTo($admin_permission);

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
