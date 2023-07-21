<?php

use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateMultiLoginPermission extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        //
        $employee_role = Role::where('name', 'employee')->first();
        $employee_permission = [
            Permission::create(['name' => 'user_multi_login', 'label' => 'Use Multi-Login']),
        ];
        $employee_role->givePermissionTo($employee_permission);


        
        $supervisor_role = Role::where('name', 'supervisor')->first();
        $supervisor_permission = [
            Permission::create(['name' => 'edit_permissions', 'label' => 'Edit User Permissions']),
        ];
        $supervisor_role->givePermissionTo($supervisor_permission);

    }
    
    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // Schema::table('users', function (Blueprint $table) {
        //     //
        // });
    }
}
