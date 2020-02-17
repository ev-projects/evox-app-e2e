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
            $table->string('bind_to')->nullable()->index();
            $table->integer('bind_id')->nullable()->index();
            $table->enum('source_type', array('template', 'default', 'temporary', 'change_schedule'))->index();
            $table->enum('schedule_type', array('standard', 'flexible', 'customize'))->index();
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->json('rest_days')->nullable();
            $table->integer('updated_by')->unsigned()->nullable()->index();
            $table->integer('created_by')->unsigned()->nullable()->index();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['name', 'source_type', 'schedule_type']);
            $table->index(['source_type', 'schedule_type']);

            $table->index(['name', 'bind_to', 'bind_id', 'source_type', 'schedule_type']);
            $table->index(['bind_to', 'bind_id','source_type', 'schedule_type']);
            $table->index(['bind_to', 'bind_id','schedule_type']);
            $table->index(['bind_to', 'bind_id','source_type']);
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
