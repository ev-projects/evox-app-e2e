<?php

use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddManageAnnouncementPermission extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        
        $supervisor_role = Role::where('name', 'supervisor')->first();
        $supervisor_permission = [
            Permission::create(['name' => 'manage_all_announcements', 'label' => 'Manage All Announcements']),
        ];
        $supervisor_role->givePermissionTo($supervisor_permission);

        $admin_role = Role::where('name', 'admin')->first();
        $admin_permission = [
            Permission::create(['name' => 'admin_manage_all_announcements', 'label' => 'Admin Manage All Announcements']),
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
