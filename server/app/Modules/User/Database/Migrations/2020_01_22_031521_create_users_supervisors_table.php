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
            $table->string('emp_num')->index();
            $table->string('supervisor_emp_num')->index();

            $table->unique(['emp_num', 'supervisor_emp_num']);

            $table->index(['emp_num', 'supervisor_emp_num']);

            $table->foreign('emp_num')->references('emp_num')->on('users')->onUpdate('cascade')->onDelete('cascade');
            $table->foreign('supervisor_emp_num')->references('emp_num')->on('users')->onUpdate('cascade')->onDelete('cascade');
        });
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
