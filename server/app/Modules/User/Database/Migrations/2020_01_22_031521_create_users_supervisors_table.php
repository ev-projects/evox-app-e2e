<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateUsersSupervisorsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {

        Schema::create('users_supervisors', function (Blueprint $table) {
            $table->string('emp_num');
            $table->string('supervisor_emp_num');

            $table->unique(['emp_num', 'supervisor_emp_num']);

            $table->foreign('emp_num')->references('emp_num')->on('users')->onDelete('cascade');
            $table->foreign('supervisor_emp_num')->references('emp_num')->on('users')->onDelete('cascade');
            
        });

        // Insert Default Values
        $insert = array(
            array(
                'emp_num' => '2065',
                'supervisor_emp_num' => '012'
            ),
            array(
                'emp_num' => '1479',
                'supervisor_emp_num' => '012'
            ),
        );
        DB::table('users_supervisors')->insert($insert);
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('users_supervisors');
    }
}
