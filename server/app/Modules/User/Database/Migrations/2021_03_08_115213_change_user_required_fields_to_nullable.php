<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class ChangeUserRequiredFieldsToNullable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('users', function($table) { 
            $table->string('emp_num')->default(NULL)->nullable()->change();
            $table->string('bhr_num')->default(NULL)->nullable()->change();
            $table->dropUnique('users_emp_num_unique');
            $table->dropUnique('users_bhr_num_unique');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('users', function($table) {
            $table->string('emp_num')->nullable(false)->unique()->change();
            $table->string('bhr_num')->nullable(false)->unique()->change();
        });
    }
}
