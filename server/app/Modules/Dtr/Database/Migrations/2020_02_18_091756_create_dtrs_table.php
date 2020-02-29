<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateDtrsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('dtrs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedInteger('user_id')->nullable()->index();
            $table->date('date')->index();
            $table->bigInteger('time_in')->nullable();
            $table->bigInteger('time_out')->nullable();
            $table->bigInteger('start_datetime')->nullable();
            $table->bigInteger('end_datetime')->nullable();
            $table->bigInteger('start_flexy_datetime')->nullable();
            $table->bigInteger('end_flexy_datetime')->nullable();
            $table->bigInteger('break_time')->nullable();
            $table->boolean('is_rest_day')->default(false);
            $table->enum('source_type_tagging', array('default', 'temporary', 'change_schedule'))->nullable()->index();
            $table->softDeletes();
            $table->timestamps();
            
            $table->index(['user_id', 'date']);
            $table->unique(['user_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('dtrs');
    }
}
