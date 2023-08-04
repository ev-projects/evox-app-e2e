<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class AddPayrollPermission extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        $payroll_role = Role::create(['name' => 'payroll']);
       
        $payroll_permission = [
            Permission::create(['name' => 'payroll_access', 'label' => 'Payroll Access']),
        ];
        $payroll_role->syncPermissions($payroll_permission);
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
