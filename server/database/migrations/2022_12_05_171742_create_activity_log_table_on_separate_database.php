<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateActivityLogTableOnSeparateDatabase extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::connection('evox_logs')->create('activity_log', function (Blueprint $table) {
            $table->increments('id');
            $table->string('log_name')->nullable();
            $table->string('description');
            $table->integer('subject_id')->nullable();
            $table->string('subject_type')->nullable();
            $table->string('causer_id')->nullable();
            $table->string('causer_type')->nullable();
            $table->text('properties')->nullable();
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
        Schema::connection('evox_logs')->dropIfExists('activity_log');
    }
}
