<?php

use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddHrPermission extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        //
        $hr_role = Role::create(['name' => 'hr']);
       
        $hr_permission = [
            Permission::create(['name' => 'hr_access', 'label' => 'HR Access']),
            Permission::create(['name' => 'manage_hr_announcements', 'label' => 'Manage HR Announcements']),
        ];
        $hr_role->givePermissionTo($hr_permission);

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
