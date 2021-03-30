<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class CreateTlRole extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Roles
        $team_leader_role = Role::create(['name' => 'team_leader']);
        
        // Team Leader Permissions
        $team_leader_permission = [
            Permission::create(['name' => 'team_leader_access', 'label' => 'Team Leader Access'])
        ];

        // Add Permission for their distinct role
        $team_leader_role->syncPermissions($team_leader_permission);
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
