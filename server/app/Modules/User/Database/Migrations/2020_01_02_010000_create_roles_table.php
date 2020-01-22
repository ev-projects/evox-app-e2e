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

        // Insert Default Values
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
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('roles');
    }
}
