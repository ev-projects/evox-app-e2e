<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class CreateHrPermissions extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        $hr_role = Role::where('name', 'hr')->first();
  

        // // hr Permissions
        $hr_permission = [
            Permission::create(['name' => 'hr_access', 'label' => 'View HR Attendance Records']),
        ];
       

        //
        $hr_role->syncPermissions($hr_permission);
     


        
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
