<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateUsersRolesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {


        Schema::create('users_roles', function (Blueprint $table) {
            $table->string('emp_num');
            $table->unsignedBigInteger('role_id');

            $table->unique(['emp_num', 'role_id']);

            $table->foreign('emp_num')->references('emp_num')->on('users')->onDelete('cascade');
            $table->foreign('role_id')->references('id')->on('roles')->onDelete('cascade');
        });

        // Insert Default Values
        $insert = array();
        foreach(DB::table('users')->get() as $users => $user){
            foreach(DB::table('roles')->get() as $roles => $role){
                $insert[] = array(
                    'emp_num' => $user->emp_num,
                    'role_id' => $role->id
                );
            }
        }
        DB::table('users_roles')->insert($insert);
        
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('users_roles');
    }
}
