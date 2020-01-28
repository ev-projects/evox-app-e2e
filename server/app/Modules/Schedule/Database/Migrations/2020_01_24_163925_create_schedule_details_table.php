<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateScheduleDetailsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('schedule_details', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('schedule_id')->index();
            $table->enum('day', array('all', 'mon', 'tue', 'wed', 'thur', 'fri', 'sat', 'sun'))->index();
            $table->integer('start_time')->nullable();
            $table->integer('end_time')->nullable();
            $table->integer('start_flexy_time')->nullable();
            $table->integer('end_flexy_time')->nullable();
            $table->integer('break_time')->nullable();

            $table->index(['schedule_id', 'day']);

            // FK for Schedule Details
            $table->foreign('schedule_id')->references('id')->on('schedules')->onUpdate('cascade')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('schedule_details');
    }
}
