<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateDtrHolidaysTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('dtr_holidays', function (Blueprint $table) {
            $table->unsignedBigInteger('dtr_id')->index();
            $table->unsignedInteger('holiday_id')->index();

            $table->unique(['dtr_id', 'holiday_id']);

            $table->index(['dtr_id', 'holiday_id']);
            
            // $table->bigIncrements('id');
            // $table->unsignedBigInteger('dtr_id')->nullable()->index();
            // $table->string('name')->index();
            // $table->enum('type', array('sh', 'lh'))->index();
            
            // $table->index(['dtr_id', 'name', 'type']);
            // $table->index(['dtr_id', 'name']);
            // $table->index(['dtr_id', 'type']);
            // $table->index(['name', 'type']);

            // $table->unique(['dtr_id', 'name', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('dtr_holidays');
    }
}
