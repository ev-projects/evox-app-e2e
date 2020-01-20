<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateRolesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('role')->unique();
            $table->string('description');
            $table->timestamps();
        });

        Schema::create('users_roles', function (Blueprint $table) {
            $table->string('emp_num');
            $table->unsignedBigInteger('role_id');

            $table->unique(['emp_num', 'role_id']);

            $table->foreign('emp_num')->references('emp_num')->on('users')->onDelete('cascade');
            $table->foreign('role_id')->references('id')->on('roles')->onDelete('cascade');
        });

        $insert = array(
            array(
                'role' => "Employee",
                'description' => "Employee Role",
                'created_at' =>         date('Y-m-d H:i:s'),
                'updated_at' =>         date('Y-m-d H:i:s')
            ),
            array(
                'role' => "Supervisor",
                'description' => "Supervisor Role",
                'created_at' =>         date('Y-m-d H:i:s'),
                'updated_at' =>         date('Y-m-d H:i:s')
            )
        );
        
        DB::table('roles')->insert($insert);
        
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
        
        // DB::table('roles')->insert(
        //     array('emp_num' => 2065,
        //           'role_id' => 1),
        //     array('emp_num' => 012,
        //           'role_id' => 1),
        //     array('emp_num' => 1479,
        //           'role_id' => 1),

        //     array('emp_num' => 2065,
        //           'role_id' => 2),
        //     array('emp_num' => 012,
        //           'role_id' => 2),
        //     array('emp_num' => 1479,
        //           'role_id' => 2),
        // );
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('users_roles');
        Schema::dropIfExists('roles');
    }
}
