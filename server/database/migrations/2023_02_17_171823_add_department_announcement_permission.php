<?php

use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddDepartmentAnnouncementPermission extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        //
        $supervisor_role = Role::where('name', 'supervisor')->first();
        $supervisor_permission = [
            Permission::create(['name' => 'manage_department_announcements', 'label' => 'Manage Department Announcements']),
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
        //
    }
}
