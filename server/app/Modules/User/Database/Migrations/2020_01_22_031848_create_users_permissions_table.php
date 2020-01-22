<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateUsersPermissionsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {


        Schema::create('users_permissions', function (Blueprint $table) {
            $table->string('emp_num');
            $table->string('permission_code');

            $table->unique(['emp_num', 'permission_code']);

            $table->foreign('emp_num')->references('emp_num')->on('users')->onDelete('cascade');
            $table->foreign('permission_code')->references('permission_code')->on('permissions')->onDelete('cascade');
        });

        // Insert Default Values
        $insert = array();
        foreach(DB::table('users')->get() as $users => $user){
            foreach(DB::table('permissions')->get() as $permissions => $permission){
                $insert[] = array(
                    'emp_num' => $user->emp_num,
                    'permission_code' => $permission->permission_code
                );
            }
        }
        DB::table('users_permissions')->insert($insert);
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('users_permissions');
    }
}
