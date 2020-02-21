<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateUsersTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('users', function (Blueprint $table) {
            $table->increments('id');
            $table->string('emp_num')->unique();
            $table->string('bhr_num')->unique();
            $table->string('email');
            $table->string('username');
            $table->string('password');
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('employment_status');
            $table->unsignedInteger('department_id')->nullable();
            // $table->unsignedInteger('schedule_id')->nullable();
            $table->boolean('is_active')->default(false);
            $table->boolean('force_change_password')->default(false);
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('users');
    }
}
