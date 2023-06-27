<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateCollectivePunch extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('dtr_collective_punch', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('dtr_collective_punch_history_id')->nullable();;
            $table->unsignedInteger('user_id')->nullable();;
            $table->date('date');
            $table->bigInteger('time_in');
            $table->bigInteger('time_out');
            $table->bigInteger('duration');
            $table->timestamps();
            $table->foreign('dtr_collective_punch_history_id')->references('id')->on('dtr_collective_punch_history');
            $table->foreign('user_id')->references('id')->on('users')->onUpdate('cascade')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('dtr_collective_punch');
    }
}
