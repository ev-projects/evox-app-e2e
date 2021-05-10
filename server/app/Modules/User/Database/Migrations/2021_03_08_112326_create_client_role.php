<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;


use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class CreateClientRole extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Roles
        $client_role = Role::create(['name' => 'client']);

        
        // Client Permissions
        $client_permission = [
            Permission::create(['name' => 'client_access', 'label' => 'Client Access'])
        ];
        

        // Add Permission for their distinct role
        $client_role->syncPermissions($client_permission);
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
