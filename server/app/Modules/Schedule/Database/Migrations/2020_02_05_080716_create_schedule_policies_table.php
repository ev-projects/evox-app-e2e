<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateSchedulePoliciesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('schedule_policies', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedInteger('schedule_id')->index();
            $table->string('policy')->index();
            $table->string('value')->nullable();

            $table->index(['schedule_id', 'policy']);

            // FK for Schedule Policies
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
        Schema::dropIfExists('schedule_policies');
    }
}
