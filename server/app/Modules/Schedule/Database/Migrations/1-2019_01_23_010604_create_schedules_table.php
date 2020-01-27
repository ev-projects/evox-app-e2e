<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateSchedulesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('schedules', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name')->index();
            $table->enum('source_type', array('template', 'default', 'temporary', 'change_schedule'))->index();
            $table->enum('schedule_type', array('standard', 'flexible', 'customize'))->index();
            $table->dateTime('valid_from')->nullable();
            $table->dateTime('valid_to')->nullable();
            $table->json('rest_days');
            $table->softDeletes();
            $table->timestamps();

            $table->index(['name', 'source_type', 'schedule_type']);
            $table->index(['source_type', 'schedule_type']);

            // FK for Schedule Details
            // FK for Schedule Payroll Items
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('schedules');
    }
}
