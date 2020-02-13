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
            $table->string('emp_num')->nullable()->index();
            $table->enum('source_type', array('template', 'default', 'temporary', 'change_schedule'))->index();
            $table->enum('schedule_type', array('standard', 'flexible', 'customize'))->index();
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->json('rest_days')->nullable();
            $table->string('updated_by')->nullable()->index();
            $table->string('created_by')->nullable()->index();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['name', 'emp_num', 'source_type', 'schedule_type']);
            $table->index(['emp_num', 'source_type', 'schedule_type']);
            $table->index(['emp_num', 'schedule_type']);
            $table->index(['emp_num', 'source_type']);

            $table->foreign('emp_num')->references('emp_num')->on('users')->onUpdate('cascade')->onDelete('set null');
            $table->foreign('updated_by')->references('emp_num')->on('users')->onUpdate('cascade')->onDelete('set null');
            $table->foreign('created_by')->references('emp_num')->on('users')->onUpdate('cascade')->onDelete('set null');
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
